'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { isDeepStrictEqual } = require('node:util');

const HOST = '127.0.0.1';
const PORT = 17643;
const REPO = 'LEIDAAI/skill';
const BRANCH = 'main';
const ROOT = __dirname;
const MAX_BODY = 8 * 1024 * 1024;
const MAX_SKILLS = 50;
const TOKEN = randomBytes(32).toString('hex');
const ORIGINS = new Set(['https://leidaai.github.io', `http://${HOST}:${PORT}`]);
const FILES = ['imported-skills.json', 'versions.json'];
const SCENARIOS = new Set(['product-selection', 'competitor', 'category', 'product', 'shop', 'profit', 'report']);
const PLATFORMS = new Set(['1688', 'ozon', 'amazon', 'temu']);
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const SKILL_FIELDS = [
  'id', 'name', 'slug', 'platforms', 'scenario', 'status', 'version', 'desc',
  'triggers', 'prompt', 'tools', 'demo', 'author', 'isZip', 'zipFiles', 'zipData', 'skillMd', 'archiveBase64', 'archiveName'
];

class SyncError extends Error {
  constructor(message, status = 400, remoteStatus) {
    super(message);
    this.status = status;
    this.remoteStatus = remoteStatus;
  }
}

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    [Object.prototype, null].includes(Object.getPrototypeOf(value));
}

function cloneJson(value, depth = 0) {
  if (depth > 64) throw new SyncError('技能数据嵌套超过 64 层');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.map(item => cloneJson(item, depth + 1));
  if (!record(value)) throw new SyncError('技能字段必须是合法 JSON 数据');
  const copy = {};
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) throw new SyncError('技能数据包含不允许的原型字段');
    copy[key] = cloneJson(item, depth + 1);
  }
  return copy;
}

function sanitizeSkill(input) {
  if (!record(input)) throw new SyncError('每个技能必须是普通对象');
  const skill = {};
  for (const field of SKILL_FIELDS) {
    if (Object.hasOwn(input, field) && input[field] !== undefined) skill[field] = cloneJson(input[field]);
  }
  if (typeof skill.id !== 'string' || !/^[A-Za-z0-9_.-]{1,128}$/.test(skill.id)) throw new SyncError('技能 id 只能包含安全字母、数字、连字符、下划线和点，长度 1–128');
  if (typeof skill.name !== 'string' || !skill.name.trim()) throw new SyncError(`技能 ${skill.id} 的 name 必须是非空文本`);
  if (typeof skill.prompt !== 'string') throw new SyncError(`技能 ${skill.id} 的 prompt 必须是文本`);
  if (!Array.isArray(skill.platforms) || !skill.platforms.length || skill.platforms.some(value => !PLATFORMS.has(value))) throw new SyncError(`技能 ${skill.id} 的 platforms 必须是已知平台数组`);
  if (typeof skill.scenario !== 'string' || !SCENARIOS.has(skill.scenario)) throw new SyncError(`技能 ${skill.id} 的 scenario 不合法`);
  for (const key of ['slug', 'status', 'version', 'desc', 'author', 'skillMd']) {
    if (Object.hasOwn(skill, key) && typeof skill[key] !== 'string') throw new SyncError(`技能 ${skill.id} 的 ${key} 必须是文本`);
  }
  if (skill.status !== undefined && !['built', 'plan'].includes(skill.status)) throw new SyncError('技能 status 必须是 built 或 plan');
  for (const key of ['triggers', 'tools']) {
    if (skill[key] !== undefined && (!Array.isArray(skill[key]) || skill[key].some(value => typeof value !== 'string'))) throw new SyncError(`技能 ${key} 必须是文本数组`);
  }
  if (skill.isZip !== undefined && typeof skill.isZip !== 'boolean') throw new SyncError('技能 isZip 必须是布尔值');
  if (skill.demo !== undefined && !record(skill.demo) && !Array.isArray(skill.demo)) throw new SyncError('技能 demo 必须是对象或数组');
  if (skill.zipFiles !== undefined) {
    if (!Array.isArray(skill.zipFiles)) throw new SyncError('技能 zipFiles 必须是数组');
    skill.zipFiles = skill.zipFiles.map(file => {
      if (!record(file) || typeof file.name !== 'string' || !file.name ||
          (file.size !== undefined && (!Number.isSafeInteger(file.size) || file.size < 0)) ||
          (file.truncated !== undefined && typeof file.truncated !== 'boolean')) throw new SyncError('技能 zipFiles 文件元数据不合法');
      const clean = { name: file.name };
      if (file.size !== undefined) clean.size = file.size;
      if (file.truncated !== undefined) clean.truncated = file.truncated;
      return clean;
    });
  }
  if (skill.zipData !== undefined && (!record(skill.zipData) || Object.values(skill.zipData).some(value => typeof value !== 'string'))) throw new SyncError('技能 zipData 只能包含完整文件文本');
  if (skill.archiveBase64 !== undefined && (typeof skill.archiveBase64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(skill.archiveBase64) || Buffer.from(skill.archiveBase64, 'base64').length > 5 * 1024 * 1024)) throw new SyncError('原始技能包格式不合法或超过 5MB');
  if (skill.archiveName !== undefined && (typeof skill.archiveName !== 'string' || skill.archiveName.length > 255 || /[\\/\x00-\x1f]/.test(skill.archiveName) || !skill.archiveName.toLowerCase().endsWith('.zip'))) throw new SyncError('原始技能包名称不合法');
  return skill;
}

function validateSkills(value, collection = false) {
  const limit = collection ? 5000 : MAX_SKILLS;
  if (!Array.isArray(value) || value.length > limit) throw new SyncError(`skills 必须是最多 ${limit} 项的数组`);
  const skills = value.map(sanitizeSkill);
  const ids = new Set();
  for (const skill of skills) {
    if (ids.has(skill.id)) throw new SyncError(`技能 id 重复：${skill.id}`);
    ids.add(skill.id);
  }
  if (!collection && Buffer.byteLength(JSON.stringify(skills)) > MAX_BODY) throw new SyncError('技能数据总量超过 8MB', 413);
  return skills;
}

function mergeSkills(current, incoming) {
  const byId = new Map(validateSkills(current, true).map(skill => [skill.id, skill]));
  for (const skill of validateSkills(incoming)) byId.set(skill.id, skill);
  return validateSkills([...byId.values()], true);
}

function createGithubClient({ execFileImpl = execFile, repoDir = ROOT } = {}) {
  return function api(method, endpoint, input) {
    const args = ['api', '--hostname', 'github.com', '-X', method, endpoint];
    args.push('-H', endpoint.includes('/contents/') ? 'Accept: application/vnd.github.raw+json' : 'Accept: application/vnd.github+json');
    if (input !== undefined) args.push('--input', '-');
    const env = { ...process.env, GH_PROMPT_DISABLED: '1', GIT_TERMINAL_PROMPT: '0' };
    // 使用 gh 已保存的凭证，禁止环境变量令牌或调试输出介入。
    for (const key of Object.keys(env)) {
      if (['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN', 'GITHUB_ENTERPRISE_TOKEN', 'GH_DEBUG', 'DEBUG'].includes(key.toUpperCase())) delete env[key];
    }
    return new Promise((resolve, reject) => {
      const child = execFileImpl('gh', args, {
        cwd: repoDir, env, shell: false, windowsHide: true, timeout: 90000,
        maxBuffer: 32 * 1024 * 1024, encoding: 'utf8'
      }, (error, stdout, stderr) => {
        if (error) {
          const remoteStatus = Number(String(stderr || '').match(/\bHTTP\s+(\d{3})\b/i)?.[1]) || undefined;
          if (error.killed || error.code === 'ETIMEDOUT') return reject(new SyncError('GitHub 操作超时（90 秒），请检查网络后重试', 504));
          if (error.code === 'ENOENT') return reject(new SyncError('未找到 gh，请安装 GitHub CLI 并执行 gh auth login', 502));
          return reject(new SyncError(`GitHub API 操作失败${remoteStatus ? `（HTTP ${remoteStatus}）` : '，请检查 gh 登录状态和仓库权限'}`, 502, remoteStatus));
        }
        try { resolve(JSON.parse(stdout)); }
        catch { reject(new SyncError('GitHub API 返回了无法解析的 JSON，未继续同步', 502)); }
      });
      child.stdin.on('error', () => {});
      child.stdin.end(input === undefined ? undefined : JSON.stringify(input));
    });
  };
}

async function readRemote(api) {
  const ref = await api('GET', `repos/${REPO}/git/ref/heads/${BRANCH}`);
  const head = ref?.object?.sha;
  if (typeof head !== 'string' || !/^[a-f0-9]{40}$/i.test(head)) throw new SyncError('远端 main 引用格式不合法', 502);
  const commit = await api('GET', `repos/${REPO}/git/commits/${head}`);
  const baseTree = commit?.tree?.sha;
  if (typeof baseTree !== 'string' || !/^[a-f0-9]{40}$/i.test(baseTree)) throw new SyncError('远端 HEAD tree 格式不合法', 502);
  const readJson = async file => {
    try { return await api('GET', `repos/${REPO}/contents/${file}?ref=${head}`); }
    catch (error) {
      if (error.remoteStatus === 404) return [];
      throw error;
    }
  };
  const [skillsRaw, versionsRaw] = await Promise.all(FILES.map(readJson));
  try {
    const skills = validateSkills(skillsRaw, true);
    const versions = Array.isArray(versionsRaw) ? { entries: cloneJson(versionsRaw) } : cloneJson(versionsRaw);
    if (!record(versions) || !Array.isArray(versions.entries)) throw new Error('versions.entries');
    return { head, baseTree, skills, versions };
  } catch {
    throw new SyncError('远端共享文件格式不合法，未覆盖远端数据', 502);
  }
}

function appendVersions(versions, oldSkills, skills) {
  const oldById = new Map(oldSkills.map(skill => [skill.id, skill]));
  const ts = new Date().toISOString();
  for (const skill of skills) {
    if (isDeepStrictEqual(oldById.get(skill.id), skill)) continue;
    versions.entries.push({
      ts, target: `skill:${skill.id}`, action: oldById.has(skill.id) ? 'update' : 'create',
      summary: `同步技能：${skill.name}`, snapshots: { prompt: skill.prompt }
    });
  }
}

function runGit(execFileImpl, repoDir, args) {
  return new Promise((resolve, reject) => {
    execFileImpl('git', ['-C', repoDir, ...args], {
      shell: false, windowsHide: true, timeout: 10000, maxBuffer: MAX_BODY, encoding: 'utf8'
    }, (error, stdout) => error ? reject(error) : resolve(stdout));
  });
}

async function localSnapshot(repoDir) {
  return Promise.all(FILES.map(async file => {
    const fullPath = path.join(repoDir, file);
    try {
      const info = await fs.promises.lstat(fullPath);
      if (!info.isFile() || info.isSymbolicLink()) throw new Error('缓存目标不是普通文件');
      return await fs.promises.readFile(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') return null;
      throw error;
    }
  }));
}

async function cacheLocally(files, { repoDir = ROOT, execFileImpl = execFile } = {}) {
  const temporary = [];
  const skipped = warning => ({ localCacheSkipped: true, warning });
  try {
    if (!isDeepStrictEqual(Object.keys(files).sort(), [...FILES].sort())) throw new Error('不允许的缓存文件');
    const root = await runGit(execFileImpl, repoDir, ['rev-parse', '--show-toplevel']);
    if (await fs.promises.realpath(root.trim()) !== await fs.promises.realpath(repoDir)) throw new Error('本地目录不是独立仓库根目录');
    const statusArgs = ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignored=matching', '--', ...FILES];
    if ((await runGit(execFileImpl, repoDir, statusArgs)).length) return skipped('远端同步成功；本地共享文件有未提交修改，已跳过两个文件的缓存写入。');
    const before = await localSnapshot(repoDir);
    for (const file of FILES) {
      const temp = path.join(repoDir, `.hub-sync-${randomBytes(12).toString('hex')}.tmp`);
      temporary.push(temp);
      await fs.promises.writeFile(temp, files[file], { encoding: 'utf8', flag: 'wx', mode: 0o600 });
    }
    // 检查暂存区、未跟踪文件和准备缓存期间的编辑，避免覆盖用户工作。
    if ((await runGit(execFileImpl, repoDir, statusArgs)).length || !isDeepStrictEqual(before, await localSnapshot(repoDir))) {
      return skipped('远端同步成功；准备缓存期间本地共享文件发生变化，已跳过缓存写入。');
    }
    for (let i = 0; i < FILES.length; i++) {
      const now = await localSnapshot(repoDir);
      if (!isDeepStrictEqual(now[i], before[i])) return skipped('远端同步成功；本地共享文件发生变化，已停止缓存写入。');
      await fs.promises.rename(temporary[i], path.join(repoDir, FILES[i]));
    }
    return {};
  } catch {
    return skipped('远端同步成功；本地缓存检查或写入未完成，请保留本地修改并手动核对共享文件。');
  } finally {
    await Promise.all(temporary.map(file => fs.promises.unlink(file).catch(() => {})));
  }
}

function createSyncService({ repoDir = ROOT, execFileImpl = execFile } = {}) {
  const api = createGithubClient({ repoDir, execFileImpl });
  let queue = Promise.resolve();
  async function perform(incoming) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const remote = await readRemote(api);
        const existing = new Map(remote.skills.map(skill => [skill.id, skill]));
        for (const skill of incoming) {
          if (existing.has(skill.id) && !isDeepStrictEqual(existing.get(skill.id), skill)) throw new SyncError(`仓库已存在同 ID 的不同技能：${skill.id}。请使用新的技能 ID，避免覆盖已有版本。`, 409);
        }
        const skills = mergeSkills(remote.skills, incoming);
        const unchanged = isDeepStrictEqual(skills, remote.skills);
        if (!unchanged) appendVersions(remote.versions, remote.skills, skills);
        const files = {
          'imported-skills.json': `${JSON.stringify(skills, null, 2)}\n`,
          'versions.json': `${JSON.stringify(remote.versions, null, 2)}\n`
        };
        let sha = remote.head;
        if (!unchanged) {
          const tree = await api('POST', `repos/${REPO}/git/trees`, {
            base_tree: remote.baseTree,
            tree: FILES.map(file => ({ path: file, mode: '100644', type: 'blob', content: files[file] }))
          });
          const commit = await api('POST', `repos/${REPO}/git/commits`, {
            message: `同步工作台技能（${incoming.length} 项）`, tree: tree.sha, parents: [remote.head]
          });
          await api('PATCH', `repos/${REPO}/git/refs/heads/${BRANCH}`, { sha: commit.sha, force: false });
          sha = commit.sha;
        }
        const cache = await cacheLocally(files, { repoDir, execFileImpl });
        return { sha, url: `https://github.com/${REPO}/commit/${sha}`, skills, unchanged, ...cache };
      } catch (error) {
        if (![409, 422].includes(error.remoteStatus)) throw error;
        if (attempt === 2) throw new SyncError('GitHub 并发更新冲突，重新读取合并后重试 2 次仍失败，请重试同步', 409);
      }
    }
  }
  return {
    sync(skills) {
      let incoming;
      try { incoming = validateSkills(skills); } catch (error) { return Promise.reject(error); }
      const operation = queue.then(() => perform(incoming));
      queue = operation.catch(() => {});
      return operation;
    }
  };
}

function safeRepoFile(urlPath, repoDir = ROOT) {
  let decoded;
  try { decoded = decodeURIComponent(urlPath); } catch { return null; }
  if (!decoded || /[\x00-\x1f\\:%?#]/.test(decoded) || decoded.split('/').some(part => !part || part.startsWith('.') || /[. ]$/.test(part))) return null;
  if (!FILES.includes(decoded) && decoded !== 'logo.png' && !decoded.toLowerCase().endsWith('.md')) return null;
  const root = path.resolve(repoDir);
  const fullPath = path.resolve(root, decoded);
  const relative = path.relative(root, fullPath);
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative) ? fullPath : null;
}

async function readStatic(urlPath, repoDir) {
  const file = urlPath === '' ? path.resolve(repoDir, '..', 'ozon-skill-hub.html') : safeRepoFile(urlPath, repoDir);
  if (!file) throw new SyncError('文件不存在或不允许访问', 404);
  try {
    const real = await fs.promises.realpath(file);
    const root = await fs.promises.realpath(repoDir);
    if (urlPath === '') {
      if (real !== file || !(await fs.promises.lstat(file)).isFile()) throw new Error('入口文件不是普通文件');
    } else {
      const relative = path.relative(root, real);
      if (safeRepoFile(relative.split(path.sep).join('/'), root) !== real) throw new Error('静态路径越界');
    }
    return { data: await fs.promises.readFile(real), ext: path.extname(file).toLowerCase() };
  } catch { throw new SyncError('文件不存在或不允许访问', 404); }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = [];
    req.on('data', chunk => {
      size += Buffer.byteLength(chunk);
      if (size > MAX_BODY) {
        chunks = [];
        reject(new SyncError('请求体超过 8MB 限制', 413));
      } else chunks.push(Buffer.from(chunk));
    });
    req.on('end', () => {
      if (size > MAX_BODY) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new SyncError('请求体不是合法 JSON')); }
    });
    req.on('error', () => reject(new SyncError('读取请求体失败')));
    req.on('aborted', () => reject(new SyncError('请求已中断')));
  });
}

const defaultSyncService = createSyncService();

function createServer({ repoDir = ROOT, syncService = defaultSyncService } = {}) {
  let cachedSkills = [];
  const ready = fs.promises.readFile(path.join(repoDir, FILES[0]), 'utf8').then(text => {
    cachedSkills = validateSkills(JSON.parse(text), true);
  }).catch(error => {
    if (error.code !== 'ENOENT') throw new SyncError('本地共享技能缓存格式不合法，请核对 imported-skills.json', 500);
  });
  // 即使调用方仅构造服务器也不会产生未处理的 Promise 拒绝。
  ready.catch(() => {});
  const server = http.createServer(async (req, res) => {
    const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', Vary: 'Origin' };
    const send = (status, body) => {
      if (res.writableEnded || res.destroyed) return;
      res.writeHead(status, { ...headers, 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.headers.host !== `${HOST}:${PORT}`) throw new SyncError('不允许的 Host', 403);
      const origin = req.headers.origin;
      if (origin !== undefined && !ORIGINS.has(origin)) throw new SyncError('不允许的 Origin', 403);
      if (ORIGINS.has(origin)) Object.assign(headers, {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,X-Hub-Sync-Token',
        'Access-Control-Allow-Private-Network': 'true'
      });
      if (!req.url || !req.url.startsWith('/') || req.url.startsWith('//')) throw new SyncError('请求路径不合法');
      const pathname = req.url.split('?')[0];
      if (req.method === 'OPTIONS') {
        if (!ORIGINS.has(origin)) throw new SyncError('预检必须来自允许的 Origin', 403);
        const method = req.headers['access-control-request-method'];
        const requestedHeaders = String(req.headers['access-control-request-headers'] || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
        if ((method && !['GET', 'POST', 'OPTIONS'].includes(method)) || requestedHeaders.some(value => !['content-type', 'x-hub-sync-token'].includes(value))) throw new SyncError('预检方法或请求头不允许', 403);
        res.writeHead(204, headers);
        res.end();
        return;
      }
      if (req.method === 'GET' && (pathname === '/health' || pathname === '/api/skills')) {
        await ready;
        send(200, pathname === '/health' ? { ok: true, repo: REPO, token: TOKEN, skills: cachedSkills } : { ok: true, skills: cachedSkills });
        return;
      }
      if (req.method === 'POST' && pathname === '/api/skills') {
        if (!ORIGINS.has(origin)) throw new SyncError('POST 必须来自允许的 Origin', 403);
        const supplied = Buffer.from(String(req.headers['x-hub-sync-token'] || ''));
        const expected = Buffer.from(TOKEN);
        if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new SyncError('同步令牌无效', 401);
        if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '') ||
            (req.headers['content-encoding'] && req.headers['content-encoding'] !== 'identity')) throw new SyncError('请求必须使用未压缩的 application/json', 415);
        if (Number(req.headers['content-length']) > MAX_BODY) throw new SyncError('请求体超过 8MB 限制', 413);
        const body = await readBody(req);
        if (!record(body) || !Object.hasOwn(body, 'skills')) throw new SyncError('请求必须包含 skills 数组');
        const skills = validateSkills(body.skills);
        await ready;
        const result = await syncService.sync(skills);
        cachedSkills = result.skills;
        send(200, { ok: true, ...result });
        return;
      }
      if (req.method === 'GET') {
        const { data, ext } = await readStatic(pathname.slice(1), repoDir);
        const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.md': 'text/markdown; charset=utf-8' };
        res.writeHead(200, { ...headers, 'Content-Type': types[ext] });
        res.end(data);
        return;
      }
      throw new SyncError('方法不允许', 405);
    } catch (error) {
      if (!req.readableEnded) req.resume();
      send(error instanceof SyncError ? error.status : 502, { ok: false, error: error instanceof SyncError ? error.message : '同步服务处理失败，请检查本机 gh 登录状态和仓库权限' });
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  return server;
}

module.exports = {
  createServer, createSyncService, createGithubClient, validateSkills, sanitizeSkill,
  mergeSkills, safeRepoFile, cacheLocally, readRemote, SyncError
};

if (require.main === module) {
  const server = createServer();
  server.on('error', error => {
    process.stderr.write(error.code === 'EADDRINUSE' ? '本机 17643 端口已被占用\n' : '本机同步服务监听失败\n');
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => process.stdout.write(`本机同步服务已监听 http://${HOST}:${PORT}\n`));
}
