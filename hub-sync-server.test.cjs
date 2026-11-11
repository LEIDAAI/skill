'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const { PassThrough, Readable } = require('node:stream');
const {
  createServer, createSyncService, createGithubClient, validateSkills, mergeSkills,
  safeRepoFile, cacheLocally, SyncError
} = require('./hub-sync-server.cjs');

const H = n => n.toString(16).padStart(40, '0');
const skill = (id = 'test-1', fields = {}) => ({
  id, name: '测试技能', prompt: '完整提示词', platforms: ['1688'], scenario: 'product-selection', ...fields
});
const clone = value => JSON.parse(JSON.stringify(value));

async function fixture(t, skills = []) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hub-sync-test-'));
  const repoDir = path.join(dir, 'skill');
  await fs.mkdir(repoDir);
  await fs.writeFile(path.join(dir, 'ozon-skill-hub.html'), '<!doctype html><title>测试入口</title>');
  await fs.writeFile(path.join(repoDir, 'imported-skills.json'), JSON.stringify(skills));
  await fs.writeFile(path.join(repoDir, 'versions.json'), '{"entries":[]}');
  await fs.writeFile(path.join(repoDir, 'README.md'), '# 测试文档');
  await fs.writeFile(path.join(repoDir, 'logo.png'), Buffer.from([137, 80, 78, 71]));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return repoDir;
}

function gitMock(repoDir, statuses = ['']) {
  let checks = 0;
  return (file, args, options, callback) => {
    assert.equal(file, 'git');
    assert.equal(options.shell, false);
    assert.deepEqual(args.slice(0, 2), ['-C', repoDir]);
    if (args.includes('rev-parse')) queueMicrotask(() => callback(null, `${repoDir}\n`));
    else {
      assert.ok(args.includes('--porcelain=v1'));
      assert.deepEqual(args.slice(-2), ['imported-skills.json', 'versions.json']);
      const status = statuses[Math.min(checks++, statuses.length - 1)];
      queueMicrotask(() => callback(null, status));
    }
    return { stdin: new PassThrough() };
  };
}

function remoteMock(repoDir, options = {}) {
  const state = {
    head: H(1), skills: clone(options.skills || []), versions: { note: '保留元信息', entries: [{ target: 'system', action: 'init' }] },
    calls: [], trees: [], commits: [], patches: 0, conflicts: options.conflicts || 0
  };
  const localGit = gitMock(repoDir, options.statuses || [' M versions.json\0']);
  const execFileImpl = (file, args, settings, callback) => {
    if (file === 'git') return localGit(file, args, settings, callback);
    assert.equal(file, 'gh');
    assert.equal(settings.shell, false);
    assert.equal(settings.timeout, 90000);
    assert.equal(settings.env.GH_TOKEN, undefined);
    assert.equal(settings.env.GH_DEBUG, undefined);
    const input = new PassThrough();
    let text = '';
    input.on('data', chunk => { text += chunk; });
    input.on('finish', () => {
      const method = args[args.indexOf('-X') + 1];
      const endpoint = args[args.indexOf('-X') + 2];
      const body = text ? JSON.parse(text) : undefined;
      state.calls.push({ method, endpoint, body, args });
      const reply = value => callback(null, JSON.stringify(value), '');
      const fail = code => callback(new Error('命令内部敏感信息不得外泄'), '', `gh: API failure (HTTP ${code}) secret-token`);
      if (method !== 'GET') assert.deepEqual(args.slice(-2), ['--input', '-']);
      if (endpoint.endsWith('/git/ref/heads/main')) return reply({ object: { sha: state.head } });
      if (method === 'GET' && endpoint.includes('/git/commits/')) return reply({ tree: { sha: H(2) } });
      if (endpoint.includes('/contents/')) {
        assert.ok(endpoint.endsWith(`?ref=${state.head}`));
        assert.ok(args.includes('Accept: application/vnd.github.raw+json'));
        if (options.readError) return fail(options.readError);
        if (options.missing) return fail(404);
        if (options.invalidJson) return callback(null, '{broken', '');
        if (options.invalidVersions && endpoint.includes('versions.json')) return reply({ entries: '损坏的版本数据' });
        return reply(endpoint.includes('imported-skills') ? state.skills : state.versions);
      }
      if (endpoint.endsWith('/git/trees')) {
        state.trees.push(body);
        return reply({ sha: H(3) });
      }
      if (endpoint.endsWith('/git/commits')) {
        state.commits.push(body);
        return reply({ sha: H(100 + state.commits.length) });
      }
      if (endpoint.endsWith('/git/refs/heads/main')) {
        state.patches++;
        assert.equal(body.force, false);
        if (state.conflicts-- > 0) {
          state.head = H(10 + state.patches);
          if (state.patches === 1) {
            state.skills.push(skill('parallel'));
            state.versions.entries.push({ target: 'skill:parallel', action: 'create' });
          }
          return fail(options.conflictCode || 409);
        }
        const entries = state.trees.at(-1).tree;
        state.skills = JSON.parse(entries.find(entry => entry.path === 'imported-skills.json').content);
        state.versions = JSON.parse(entries.find(entry => entry.path === 'versions.json').content);
        state.head = body.sha;
        return reply({ object: { sha: body.sha } });
      }
      assert.fail(`未预期的模拟 API：${method} ${endpoint}`);
    });
    return { stdin: input };
  };
  return { state, execFileImpl };
}

async function request(server, { method = 'GET', url = '/health', headers = {}, body, chunks } = {}) {
  const input = chunks || (body === undefined ? [] : [typeof body === 'string' ? body : JSON.stringify(body)]);
  const req = Readable.from(input.map(chunk => Buffer.from(chunk)));
  req.method = method;
  req.url = url;
  req.headers = { host: '127.0.0.1:17643', ...headers };
  return new Promise((resolve, reject) => {
    const res = new EventEmitter();
    res.writableEnded = false;
    res.writeHead = (status, responseHeaders) => { res.status = status; res.headers = responseHeaders; };
    res.end = data => {
      res.writableEnded = true;
      const text = data === undefined ? '' : String(data);
      resolve({ status: res.status, headers: res.headers, text, json: () => JSON.parse(text) });
    };
    server.emit('request', req, res);
    req.on('error', reject);
  });
}

async function authHeaders(server) {
  const health = (await request(server)).json();
  return { origin: 'https://leidaai.github.io', 'content-type': 'application/json', 'x-hub-sync-token': health.token };
}

test('技能字段白名单保留完整 ZIP 文本并丢弃本机状态', () => {
  const text = '# 内容\n' + '完整文本'.repeat(60000);
  const original = skill('zip.test_1', {
    custom: true, syncStatus: 'pending', synced: false, script: '不得执行',
    skillMd: text, zipData: { 'scripts/example.py': text },
    zipFiles: [{ name: 'scripts/example.py', size: text.length, localState: true }],
    isZip: true, demo: { title: '示例', table: { rows: [[1, null, true]] } }
  });
  const [clean] = validateSkills([original]);
  assert.equal(clean.skillMd, text);
  assert.equal(clean.zipData['scripts/example.py'], text);
  assert.deepEqual(clean.zipFiles, [{ name: 'scripts/example.py', size: text.length }]);
  for (const key of ['custom', 'syncStatus', 'synced', 'script']) assert.equal(Object.hasOwn(clean, key), false);
  clean.zipData['scripts/example.py'] = '改变';
  assert.equal(original.zipData['scripts/example.py'], text);
});

test('必填字段、重复 ID、原型污染、大小和数量限制', () => {
  for (const fields of [
    { id: '../bad' }, { id: '' }, { name: {} }, { prompt: [] }, { platforms: '1688' },
    { platforms: ['unknown'] }, { scenario: {} }, { scenario: 'unknown' },
    { zipData: { a: 7 } }, { zipFiles: [{ name: 'a', size: -1 }] }
  ]) assert.throws(() => validateSkills([skill('a', fields)]), SyncError);
  assert.throws(() => validateSkills([skill('a'), skill('a')]), /重复/);
  assert.throws(() => validateSkills(Array.from({ length: 51 }, (_, i) => skill(`id-${i}`))), /50/);
  const poison = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => validateSkills([skill('a', { demo: poison })]), /原型/);
  const top = JSON.parse(JSON.stringify(skill('a')).replace(/}$/, ',"__proto__":{"polluted":true}}'));
  assert.equal(Object.hasOwn(validateSkills([top])[0], '__proto__'), false);
  assert.equal({}.polluted, undefined);
  assert.throws(() => validateSkills([skill('big', { prompt: 'a'.repeat(8 * 1024 * 1024) })]), /8MB/);
});

test('按 ID 合并共享技能，不受对象键顺序影响', () => {
  const merged = mergeSkills([skill('a'), skill('b')], [skill('a'), skill('c')]);
  assert.deepEqual(merged.map(item => item.id), ['a', 'b', 'c']);
  assert.equal(merged[0].prompt, '完整提示词');
  assert.equal(merged[1].prompt, '完整提示词');
});

test('共享技能总量不受单批上传 50 项限制', () => {
  const existing = Array.from({ length: 60 }, (_, i) => skill(`shared-${i}`));
  const merged = mergeSkills(existing, [skill('new')]);
  assert.equal(merged.length, 61);
});

test('静态路径只开放两份共享 JSON、logo 和仓库内 Markdown', () => {
  for (const file of ['versions.json', 'imported-skills.json', 'logo.png', 'README.md', 'docs/说明.md']) assert.ok(safeRepoFile(file));
  for (const file of ['../README.md', '%2e%2e/README.md', '.git/config', '.git/x.md', 'docs/.git/x.md', 'x\\README.md', 'x:secret.md', 'hub-sync-server.cjs', 'run.py', 'x.json', 'index.html', 'logo.png/../README.md', '%ZZ', 'docs/%252e%252e/x.md', 'README.md:secret']) assert.equal(safeRepoFile(file), null, file);
});

test('构造服务不监听；健康检查加载本地共享缓存且不会远端调用', async t => {
  const repoDir = await fixture(t, [skill('cached')]);
  const server = createServer({ repoDir, syncService: { sync() { assert.fail('健康检查不应同步'); } } });
  assert.equal(server.listening, false);
  const health = await request(server);
  assert.equal(health.status, 200);
  assert.equal(health.json().repo, 'LEIDAAI/skill');
  assert.match(health.json().token, /^[a-f0-9]{64}$/);
  assert.equal(health.json().skills[0].id, 'cached');
  assert.equal(health.headers['Access-Control-Allow-Origin'], undefined);
  const list = await request(server, { url: '/api/skills' });
  assert.deepEqual(list.json().skills, health.json().skills);
  assert.equal(list.json().token, undefined);
  assert.equal((await request(createServer({ repoDir }))).json().token, health.json().token);
});

test('Host、Origin、令牌和 CORS/PNA 预检限制', async t => {
  const server = createServer({ repoDir: await fixture(t) });
  for (const host of ['evil.example:17643', 'localhost:17643', '127.0.0.1:0', '127.0.0.1:80']) {
    assert.equal((await request(server, { headers: { host } })).status, 403);
  }
  for (const origin of ['https://evil.example', 'null', 'https://leidaai.github.io.evil.example', '']) {
    const response = await request(server, { headers: { origin } });
    assert.equal(response.status, 403);
    assert.equal(response.headers['Access-Control-Allow-Origin'], undefined);
  }
  for (const origin of ['https://leidaai.github.io', 'http://127.0.0.1:17643']) {
    const response = await request(server, { method: 'OPTIONS', url: '/api/skills', headers: {
      origin, 'access-control-request-method': 'POST', 'access-control-request-headers': 'content-type,x-hub-sync-token'
    } });
    assert.equal(response.status, 204);
    assert.equal(response.headers['Access-Control-Allow-Origin'], origin);
    assert.equal(response.headers['Access-Control-Allow-Private-Network'], 'true');
    assert.equal(response.headers['Access-Control-Allow-Headers'], 'Content-Type,X-Hub-Sync-Token');
    assert.equal(response.headers['Access-Control-Allow-Methods'], 'GET, POST, OPTIONS');
  }
  assert.equal((await request(server, { method: 'OPTIONS' })).status, 403);
  assert.equal((await request(server, { method: 'OPTIONS', headers: { origin: 'https://leidaai.github.io', 'access-control-request-method': 'DELETE' } })).status, 403);
  assert.equal((await request(server, { method: 'POST', url: '/api/skills', body: { skills: [] } })).status, 403);
  assert.equal((await request(server, { method: 'POST', url: '/api/skills', headers: { origin: 'https://leidaai.github.io' }, body: { skills: [] } })).status, 401);
});

test('HTTP 输入限制、成功响应和内存缓存更新', async t => {
  let calls = 0;
  const server = createServer({ repoDir: await fixture(t), syncService: {
    async sync(skills) { calls++; return { sha: H(8), url: 'https://github.com/LEIDAAI/skill', skills, unchanged: false, localCacheSkipped: true }; }
  } });
  const headers = await authHeaders(server);
  const post = data => request(server, { method: 'POST', url: '/api/skills', headers, ...data });
  assert.equal((await post({ body: '{' })).status, 400);
  assert.equal((await post({ body: {} })).status, 400);
  assert.equal((await post({ body: { skills: [skill('bad', { name: 1 })] } })).status, 400);
  assert.equal((await post({ headers: { ...headers, 'content-type': 'text/plain' }, body: '{}' })).status, 415);
  assert.equal((await post({ headers: { ...headers, 'content-length': '8388609' } })).status, 413);
  assert.equal((await post({ chunks: [Buffer.alloc(8 * 1024 * 1024), Buffer.from('x')] })).status, 413);
  assert.equal(calls, 0);
  const result = await post({ body: { skills: [skill('uploaded')] } });
  assert.equal(result.status, 200);
  assert.equal(result.json().ok, true);
  assert.equal(result.json().localCacheSkipped, true);
  assert.equal((await request(server)).json().skills[0].id, 'uploaded');
  assert.equal(calls, 1);
});

test('静态资源可读，脚本和敏感路径拒绝', async t => {
  const repoDir = await fixture(t);
  const server = createServer({ repoDir });
  for (const url of ['/', '/README.md', '/versions.json', '/imported-skills.json', '/logo.png']) {
    assert.equal((await request(server, { url })).status, 200, url);
  }
  for (const url of ['/../ozon-skill-hub.html', '/%2e%2e/README.md', '/.git/config', '/hub-sync-server.cjs', '/run.py', '//README.md']) {
    assert.ok([400, 404].includes((await request(server, { url })).status), url);
  }
  assert.equal((await request(server, { method: 'DELETE' })).status, 405);
  try {
    await fs.symlink(path.join(repoDir, '..', 'ozon-skill-hub.html'), path.join(repoDir, 'escape.md'));
    assert.equal((await request(server, { url: '/escape.md' })).status, 404);
  } catch (error) {
    if (error.code !== 'EPERM') throw error;
    t.diagnostic('当前 Windows 账户无符号链接权限，跳过符号链接实盘断言');
  }
});

test('损坏缓存不会伪报空共享数组', async t => {
  const repoDir = await fixture(t);
  await fs.writeFile(path.join(repoDir, 'imported-skills.json'), '{');
  assert.equal((await request(createServer({ repoDir }))).status, 500);
});

test('同 ID 不同技能被拒绝，避免覆盖远端已有版本', async t => {
  const repoDir = await fixture(t);
  const { state, execFileImpl } = remoteMock(repoDir, { skills: [skill('same-id', { prompt: '远端正式版' })] });
  await assert.rejects(createSyncService({ repoDir, execFileImpl }).sync([skill('same-id', { prompt: '旧备份' })]), /请使用新的技能 ID/);
  assert.equal(state.trees.length, 0);
  assert.equal(state.patches, 0);
});

test('GitHub 单次原子 tree/commit/ref 提交只写固定两文件并追加提示词快照', async t => {
  const repoDir = await fixture(t);
  const { state, execFileImpl } = remoteMock(repoDir, { skills: [skill('keep')] });
  const result = await createSyncService({ repoDir, execFileImpl }).sync([skill('new')]);
  assert.equal(result.unchanged, false);
  assert.equal(result.localCacheSkipped, true);
  assert.match(result.warning, /未提交修改/);
  assert.deepEqual(result.skills.map(item => item.id), ['keep', 'new']);
  assert.equal(state.trees.length, 1);
  assert.equal(state.trees[0].base_tree, H(2));
  assert.deepEqual(state.trees[0].tree.map(item => item.path), ['imported-skills.json', 'versions.json']);
  assert.deepEqual(state.commits[0].parents, [H(1)]);
  const entry = state.versions.entries.at(-1);
  assert.equal(state.versions.note, '保留元信息');
  assert.equal(entry.snapshots.prompt, '完整提示词');
  assert.ok(Math.abs(Date.now() - Date.parse(entry.ts)) < 10000);
  assert.equal(result.sha, state.head);
  assert.match(result.url, /\/commit\/[a-f0-9]{40}$/);
  assert.equal(await fs.readFile(path.join(repoDir, 'versions.json'), 'utf8'), '{"entries":[]}');
});

test('相同技能不提交，字段顺序不造成重复版本', async t => {
  const repoDir = await fixture(t);
  const original = skill('a', { demo: { a: 1, b: 2 } });
  const { state, execFileImpl } = remoteMock(repoDir, { skills: [original] });
  const result = await createSyncService({ repoDir, execFileImpl }).sync([skill('a', { demo: { b: 2, a: 1 } })]);
  assert.equal(result.unchanged, true);
  assert.equal(state.trees.length, 0);
  assert.equal(state.commits.length, 0);
});

for (const conflictCode of [409, 422]) test(`HTTP ${conflictCode} 竞争后重新读取合并，保留并行技能和版本`, async t => {
  const repoDir = await fixture(t);
  const { state, execFileImpl } = remoteMock(repoDir, { skills: [skill('existing')], conflicts: 1, conflictCode });
  const result = await createSyncService({ repoDir, execFileImpl }).sync([skill('mine')]);
  assert.deepEqual(result.skills.map(item => item.id), ['existing', 'parallel', 'mine']);
  assert.equal(state.patches, 2);
  assert.deepEqual(state.commits[1].parents, [H(11)]);
  assert.equal(state.versions.entries.filter(entry => entry.target === 'skill:mine').length, 1);
  assert.ok(state.versions.entries.some(entry => entry.target === 'skill:parallel'));
});

test('竞争重试上限为两次，失败不落盘', async t => {
  const repoDir = await fixture(t);
  const { state, execFileImpl } = remoteMock(repoDir, { conflicts: 9 });
  await assert.rejects(createSyncService({ repoDir, execFileImpl }).sync([skill('mine')]), /重试 2 次/);
  assert.equal(state.patches, 3);
  assert.equal(await fs.readFile(path.join(repoDir, 'imported-skills.json'), 'utf8'), '[]');
});

test('同进程队列串行处理并发请求，失败后继续后续同步', async t => {
  const repoDir = await fixture(t);
  const { state, execFileImpl } = remoteMock(repoDir);
  const service = createSyncService({ repoDir, execFileImpl });
  const [first, second] = await Promise.all([service.sync([skill('first')]), service.sync([skill('second')])]);
  assert.deepEqual(first.skills.map(item => item.id), ['first']);
  assert.deepEqual(second.skills.map(item => item.id), ['first', 'second']);
  assert.deepEqual(state.commits[1].parents, [first.sha]);
  await assert.rejects(service.sync([skill('bad', { name: 1 })]), /name/);
  assert.equal((await service.sync([skill('third')])).skills.length, 3);
});

test('仅 404 使用空数组，非 404 读取失败不写远端', async t => {
  const repoDir = await fixture(t);
  const missing = remoteMock(repoDir, { missing: true });
  const result = await createSyncService({ repoDir, execFileImpl: missing.execFileImpl }).sync([skill('new')]);
  assert.equal(result.skills.length, 1);
  assert.equal(missing.state.versions.entries.length, 1);
  const denied = remoteMock(repoDir, { readError: 403 });
  await assert.rejects(createSyncService({ repoDir, execFileImpl: denied.execFileImpl }).sync([skill('new')]), /403/);
  assert.equal(denied.state.trees.length, 0);
});

test('远端损坏 JSON 或版本结构时终止，保留远端和本地文件', async t => {
  const repoDir = await fixture(t);
  for (const options of [{ invalidJson: true }, { invalidVersions: true }]) {
    const mocked = remoteMock(repoDir, options);
    await assert.rejects(createSyncService({ repoDir, execFileImpl: mocked.execFileImpl }).sync([skill('new')]), /无法解析|格式不合法/);
    assert.equal(mocked.state.trees.length, 0);
    assert.equal(await fs.readFile(path.join(repoDir, 'versions.json'), 'utf8'), '{"entries":[]}');
  }
});

test('真实异步同步失败不会阻塞队列中的下一请求', async t => {
  const repoDir = await fixture(t);
  const mocked = remoteMock(repoDir);
  let failOnce = true;
  const execFileImpl = (file, args, options, callback) => {
    if (file === 'gh' && args.some(value => value.endsWith('/git/ref/heads/main')) && failOnce) {
      failOnce = false;
      const stdin = new PassThrough();
      stdin.on('finish', () => callback(new Error('失败'), '', 'gh: forbidden (HTTP 403)'));
      return { stdin };
    }
    return mocked.execFileImpl(file, args, options, callback);
  };
  const service = createSyncService({ repoDir, execFileImpl });
  const results = await Promise.allSettled([service.sync([skill('failed')]), service.sync([skill('successful')])]);
  assert.equal(results[0].status, 'rejected');
  assert.equal(results[1].status, 'fulfilled');
  assert.deepEqual(results[1].value.skills.map(item => item.id), ['successful']);
});

test('gh 超时和执行错误不暴露凭证，输入仅走 stdin JSON', async () => {
  for (const [error, stderr, expected] of [
    [Object.assign(new Error('secret'), { killed: true }), 'token-secret', /90 秒/],
    [Object.assign(new Error('secret'), { code: 'ENOENT' }), 'token-secret', /未找到 gh/],
    [new Error('secret'), 'gh: forbidden (HTTP 403) token-secret', /403/]
  ]) {
    const api = createGithubClient({ execFileImpl(file, args, settings, callback) {
      const stdin = new PassThrough();
      let text = '';
      stdin.on('data', chunk => { text += chunk; });
      stdin.on('finish', () => {
        assert.equal(text, '{"test":"完整输入"}');
        assert.equal(settings.shell, false);
        callback(error, '', stderr);
      });
      return { stdin };
    } });
    await assert.rejects(api('POST', 'repos/LEIDAAI/skill/git/trees', { test: '完整输入' }), failure => {
      assert.match(failure.message, expected);
      assert.doesNotMatch(failure.message, /secret|token-secret/);
      return true;
    });
  }
});

test('干净缓存安全替换两个文件，不改变其他文件并清理临时文件', async t => {
  const repoDir = await fixture(t);
  const files = { 'imported-skills.json': '["缓存测试"]', 'versions.json': '{"entries":[1]}' };
  assert.deepEqual(await cacheLocally(files, { repoDir, execFileImpl: gitMock(repoDir) }), {});
  for (const [file, text] of Object.entries(files)) assert.equal(await fs.readFile(path.join(repoDir, file), 'utf8'), text);
  assert.equal(await fs.readFile(path.join(repoDir, 'README.md'), 'utf8'), '# 测试文档');
  assert.equal((await fs.readdir(repoDir)).some(file => file.startsWith('.hub-sync-')), false);
});

test('本地暂存/未暂存/未跟踪变动均跳过两个文件', async t => {
  const repoDir = await fixture(t);
  for (const status of [' M versions.json\0', 'M  imported-skills.json\0', '?? imported-skills.json\0']) {
    const result = await cacheLocally({ 'imported-skills.json': '[]', 'versions.json': '{"entries":[1]}' }, { repoDir, execFileImpl: gitMock(repoDir, [status]) });
    assert.equal(result.localCacheSkipped, true);
    assert.equal(await fs.readFile(path.join(repoDir, 'versions.json'), 'utf8'), '{"entries":[]}');
  }
});

test('缓存准备期间发生本地变动时停止落盘', async t => {
  const repoDir = await fixture(t);
  const result = await cacheLocally({ 'imported-skills.json': '[1]', 'versions.json': '[2]' }, { repoDir, execFileImpl: gitMock(repoDir, ['', ' M versions.json\0']) });
  assert.equal(result.localCacheSkipped, true);
  assert.equal(await fs.readFile(path.join(repoDir, 'imported-skills.json'), 'utf8'), '[]');
  assert.equal((await fs.readdir(repoDir)).some(file => file.startsWith('.hub-sync-')), false);
});
