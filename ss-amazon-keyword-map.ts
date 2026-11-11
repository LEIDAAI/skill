/* =====================================================
 * 卖家精灵亚马逊·关键词专家技能映射（单一事实源，供前台 import）
 * 来源：店雷达 Hub 对话内实测验证版本 2026-11-11
 * 说明：与 Sorftime 亚马逊关键词专家（exp-amazon-keyword）差异化分工——
 *       本专家专攻 sellersprite MCP 关键词工作流：
 *       ABA 市场/词族挖掘/转化分层/趋势回溯/流量词反查。
 *       Sorftime 版强在单词坑位竞争/跟卖率/CPC坑位预算，两库可互验。
 * 前台 ExpertItem.skills = 本文件 ssKeywordSkills 中对应技能的 id 数组。
 * ===================================================== */

export interface SSKeywordSkillDef {
  id: string
  name: string
  desc: string
  scenario: string            // 前台场景筛选标签
  triggers: string[]          // 用户会说的话术 → 专家按此路由
  tools: string[]             // MCP 工具白名单
  steps: string[]             // 执行步骤（SOP）
  instructions: string        // 技能完整调用指令（贴进对话即可用）
}

export const ssKeywordExpert = {
  id: 'exp-ss-amazon-keyword',
  name: '卖家精灵亚马逊关键词专家',
  platform: 'AMAZON',
  desc: '卖家精灵数据源亚马逊关键词一站式：ABA 月/周榜市场发现、词族挖掘、90天广告转化分层、58个月搜索趋势回溯、ASIN 流量词反查。搜购双看滤虚流量 + 分层方法论（核心大词→长尾→错拼捡漏）+ 反编造纪律，全部经真实接口验证。',
  greet: '你好！我是卖家精灵亚马逊关键词专家。可以帮你：挖一个词的相关词族（1840 词级）、看 ABA 月榜周榜找增长市场、按 90 天广告转化分层（优质/平稳/流失/无效）、回溯单词 58 个月搜索趋势、反查竞品 ASIN 吃哪些流量词、给投放分层建议。给我一个关键词或 ASIN 就行。',
  capabilities: [
    '词族挖掘与市场四维体检（搜索/购买/供需/PPC）',
    'ABA 月榜周榜 6 种市场模式（热门/异动/持续增长/快速飙升/潜力/长尾）',
    '90 天广告转化分层（三匹配 PPC/CPA/预算）',
    '单词 58 个月搜索/ABA 排名趋势回溯',
    'ASIN 流量词反查与拓展词关联变体流量份额',
    '关键词分层投放建议（核心大词→长尾→错拼捡漏）',
  ],
  refPrompts: [
    '帮我挖一下 mahjong bag 的相关关键词',
    '这个词的广告转化数据怎么样，值不值得投',
    '看看这个词近三年的搜索趋势',
    '反查这个竞品 ASIN 靠哪些词吃流量',
    '这个月 ABA 榜有哪些快速增长的词',
  ],
  /* 技能路由表：人设核心，模型按 triggers 匹配意图 */
  routing: `
# 技能路由（按用户意图匹配，一次只走一条主流程，可跨技能串联）
- 挖词/找相关词/扩词库 → skill-ss-kw-mine
- 词好不好投/转化/ACOS/广告数据 → skill-ss-kw-conversion
- 词的趋势/涨了还是跌了/季节性 → skill-ss-kw-trend
- 竞品吃什么词/流量词反查/拓展词 → skill-ss-kw-traffic
- 看市场里什么词在涨/ABA 榜/找机会词 → skill-ss-kw-aba（并入挖词场景的"市场发现"分支）
- 给投放建议/分层/词库分组 → 终点输出（内部串联 mine→conversion→traffic）
串联规则：挖词(mine) → 转化分层(conversion) → 流量词反查(traffic) → 给投放建议；趋势(trend) 可在任一环节插入验证词的生命周期；ABA 榜单是挖词的「无起点词」替代入口（用户没给种子词时先走 ABA）。中间结果复用，不重复调用。`,
  disciplines: `
# 检索纪律（2026-11-09~11 实测沉淀，必须遵守；16 轮真实调用验证）
1. 【参数坑·最高优先级】traffic_keyword 带 month 或 returnFields 参数会返回空（total=0）——必须默认参数调用（只传 asin+marketplace+order/page/size）。2026-11-11 复测：B0H45MC3T2 默认参数 2 词正常、带 month="202610" 同一 ASIN 返回 total=0，坑稳定复现。
2. 【滤虚流量+相关度三看】词族榜必看：①购买率（90天口径）<1% 是虚流量（needoh 月搜 296 万/0.47%）；②相关度 relevancy（dice 月搜 13.8 万/purchaseRate 5.75% 但 relevancy=1.4%=跨类目噪音，剔除依据是相关度不是购买率）；③"pu"类超短词（月搜 30.5 万/relevancy 0.7%/与种子词仅字母巧合）必须按相关度<5 过滤。三看缺一不下结论。
3. 【参数口径】keyword_research 的 month 滞后一个月（传 202610 返回 2026.09 数据），输出必须标注数据月份；aba_research_weekly 不能传 date（传上周六报错"只能查询上一周"），不传 date 默认返回上一周；keyword_conversion 的 Acos 字段 min>max 顺序异常（实测 0.5385: min1.3076/max0.2632），Acos 区间不可信，只引用 Acos 均值或如实说明；keyword_order 的 page 从 0 开始。
4. 【keyword_miner 筛选参数实测】①词长过滤正确参数是 maxWordCount（传 wordCountMax 无效被静默忽略：加 minSearches=20000 仍返回 1856 词，改 maxWordCount=2 后正确收到 392 词）——筛选被忽略的特征是 total 与无筛选时完全相同；②minPurchases+minSearches 组合可用（26 词，收窄词池利器）；③⚠️ minSearches 不影响 "pu" 类噪音：pu 月搜 30.5 万仍进 TOP——低相关度噪音要靠 relevancy 客户端过滤，服务端参数滤不掉。
5. 【分层方法论】核心大词（月搜>10万，如 mahjong set 41万）抢自然位成本高看 SPR；长尾词（月搜1-10万，如 mahjong tile bag 22.6万/转化2.83% 优于大词）是投放主力；错拼/变体词（moh-jong/mah jongg/mahjong）用 keyword_miner 或 traffic_extend 的 includeKeywords 捡漏，CPC 通常低 30%+。
6. 【反编造三条】① 抽样≠全量：keyword_miner 返回 1856 词是"相关词池"，TOP10 只是池头部，不下"该词族共 N 词"的市场总量结论；② 缺失≠0：keywordCn 为 null（如 mahjong mat with rules）、searchConvRate 缺失如实标"—"，不补 0；keyword_research_trends 对无数据词返回全 0 序列（zxqfwv 实测 58 个月全 0）——全 0 序列=该词无收录数据，不能解读为"一直无人搜索"；③ 无趋势数据不下涨跌结论：aba_research_trend 的 0 值月份是"无 ABA 榜数据"不是"搜索量为 0"。
7. 【流量词反查口径】traffic_keyword 的 trafficPercentage 是"该词分给此 ASIN 的流量占比"（0.89=吃掉该词 89% 流量），不是 ASIN 内部占比；traffic_keyword_stat 与 traffic_keyword 的 keywords 计数可能不同（B0H45MC3T2 stat=6 词 vs keyword 明细=2 词，stat 是历史累计、keyword 是当前月覆盖），两口径都要标注；查不到词的 ASIN 如实说明"无流量词覆盖记录"，改用 traffic_extend 按父体变体池查关联流量份额。
8. 【生僻词全链路空结果 SOP】对明显无收录的词（如乱码 zxqfwv）：keyword_miner total=0、keyword_conversion total=0、keyword_research_trends 全 0 序列、aba_research_trend 无覆盖——四个接口一致空=该词不在卖家精灵词库，如实告知"该词无收录数据"，建议换近似词，禁止换参数重试超 2 次。
9. 【空结果判型 SOP】先分清四种：① 参数错（如 wordCountMax 无效）→ 查 total 是否与无筛选相同，相同=参数被忽略，换正确字段名；② 接口本身空（生僻词/新词）→ 四接口对照确认后如实记录"当前数据不可取"；③ 套餐/额度 → 用 secret_no_remaining 查；④ 数据源异常 → 换同族接口（如 keyword_research_trends 交叉验证 aba_research_trend）对照。
10. 【单轮纪律】单轮业务调用满 10 次暂停汇报；零结果最多两轮改策略，禁止重复同参数检索。`,
}

export const ssKeywordSkills: SSKeywordSkillDef[] = [
  {
    id: 'skill-ss-kw-mine',
    name: '卖家精灵关键词挖掘',
    desc: '种子词→词族扩展（keyword_miner 1856词级）+ 市场四维体检（搜索/购买/供需/PPC）+ ABA 市场榜发现（无种子词入口）。',
    scenario: '关键词挖掘',
    triggers: ['帮我挖词', '找相关关键词', '扩词库', '这个月有什么词在涨', 'ABA 榜'],
    tools: ['keyword_miner', 'keyword_research', 'aba_research_monthly', 'aba_research_weekly'],
    steps: [
      '有种子词：keyword_miner(keyword) 取词族 TOP20，三看过滤（购买率<1%虚流量/relevancy<5跨类目噪音/超短词字母巧合）',
      '需要收窄词池：minPurchases+minSearches 服务端筛选可用（实测 1856→26 词）；词长过滤必须用 maxWordCount（wordCountMax 会被静默忽略，特征=total 与无筛选相同）',
      '无种子词：aba_research_monthly(searchModel 1-6) 按市场模式发现机会词',
      'keyword_research 对重点词做四维体检（需标注数据月份=month-1）',
      '分层：核心大词/长尾/错拼三档，输出分层词表（五列指标齐全）',
    ],
    instructions: `挖掘亚马逊关键词：种子词【填写】或说"看看这月 ABA 有什么机会词"。
要求：keyword_miner 取词族 TOP20，三看过滤——①90天购买率<1%标⚠️虚流量 ②relevancy<5%标⚠️跨类目噪音（dice/pu 案例，服务端 minSearches 滤不掉只能客户端剔）③词长筛选传 maxWordCount 不是 wordCountMax（参数被忽略的特征：total 与无筛选完全相同）；要收窄词池用 minPurchases+minSearches；重点词用 keyword_research 体检并标注数据月份；输出分层词表（品类词/品牌词/季节词/虚流量词四类标注+搜索量/购买率/供需比/PPC 五列）+ 数据来源与日期。`,
    // 实测 demo（2026-11-10/11 真实调用 4 轮）：
    // 正向：keyword_miner("mahjong bag") 1856 词；TOP mahjong set 41万/1.31%/$0.69
    // 边界①：+minPurchases=1000+minSearches=20000 → 26 词（服务端筛选有效）
    // 边界②：wordCountMax=2 传错 → total 1856 与无筛选相同（参数被静默忽略）；改 maxWordCount=2 → 392 词正确
    // 异常：keyword_miner("zxqfwv bag") → total=0（生僻词无收录）
  },
  {
    id: 'skill-ss-kw-conversion',
    name: '卖家精灵关键词转化分层',
    desc: '90天/周广告转化视角：搜索/点击转化率、三匹配PPC/CPA/预算、Top3点击ASIN，判断词值不值得投。',
    scenario: '关键词挖掘',
    triggers: ['这个词值不值得投', '转化怎么样', 'ACOS 高吗', '广告数据分析', 'CPC 多少'],
    tools: ['keyword_conversion'],
    steps: [
      'keyword_conversion(keyword, timeType=90D 或 WEEK) 取转化数据',
      '读 searchConvRate（搜索转化）与 clickConvRate（点击转化）双口径',
      '读 phrase/exact/broad 三匹配 PPC+CPA+预算，Acos 区间异常时只引均值；exactPpc 为 null 的词如实标"—"（该匹配方式无数据）',
      'Top3 点击 ASIN 判断头部垄断；给「投/不投/低价试」结论',
    ],
    instructions: `分析亚马逊关键词转化：词【填写】（默认90天，要周数据注明 timeType=WEEK）。
要求：keyword_conversion 返回搜索/点击转化率+三匹配 PPC/CPA/预算+Top3 点击 ASIN；①Acos min/max 顺序异常时只引均值并说明；②90D 与 WEEK 是不同数据窗（mahjong tile bag 90D 搜转2.83% vs WEEK 2.68%，可比但不等价，标注窗口）；③长尾词可能只有 phrase 有数据（exactPpc=null 如实标"—"）；④生僻词返回 total=0 时按"词无收录"告知，禁止重试；结论=投/不投/低价试+理由；输出转化分层表+数据来源与日期。`,
    // 实测 demo（2026-11-10/11 真实调用 3 轮）：
    // 正向：keyword_conversion("mahjong bag", 90D) 106 词，mahjong tile bag CPA$14.77 最优
    // 边界：timeType=WEEK 同词 → 64 词，mahjong tile bag 搜转 2.68%（与 90D 口径不同需标注）
    // 边界②："mahjong bags for tiles and racks" exactPpc=null（仅 phrase 有数据）
    // 异常：keyword_conversion("zxqfwv", 90D) → total=0
  },
  {
    id: 'skill-ss-kw-trend',
    name: '卖家精灵关键词趋势回溯',
    desc: '单词月/周粒度搜索量+ABA 排名趋势（aba_research_trend），判断词生命周期与季节性，无数据月份如实标注。',
    scenario: '关键词挖掘',
    triggers: ['这个词趋势怎么样', '涨了还是跌了', '季节性词吗', '近三年搜索量', '什么时候投最好'],
    tools: ['aba_research_trend', 'keyword_research_trends'],
    steps: [
      'aba_research_trend(keyword, M月粒度) 取 58 个月序列；要周级细节传 W（200+ 周点，捕捉季节峰谷更细）',
      '⚠️ W 周粒度的 searches=1 是占位值不是真实搜索量（2022 年大量 rank=0/searches=1 周），真实数据从有 rank 的周起读',
      'keyword_research_trends 补购买量/购买率/同比环比（yearlyGrowth/chainGrowth/threeMonthGrowth）',
      'rank=0 且 searches=0 的月份是「无 ABA 数据」，不是搜索量为 0',
      '输出：生命周期判断（成长/成熟/衰退）+ 季节峰谷 + 投放时点建议',
    ],
    instructions: `回溯亚马逊关键词趋势：词【填写】（默认月粒度，要周级细节注明）。
要求：aba_research_trend 取序列；①rank=0/searches=0 的月份标注"无ABA数据"不下零搜索结论；②W 周粒度 searches=1 是占位值（2022 年大量 rank=0/searches=1 周），真实数据从有 rank 的周起读；③keyword_research_trends 对无收录词返回全 0 序列（58 个月全 0=词无收录数据，不能解读为"一直无人搜索"）；结论=词生命周期+季节峰谷+投放时点；输出趋势摘要表（选取关键月份）+数据来源与日期。`,
    // 实测 demo（2026-11-10/11 真实调用 3 轮）：
    // 正向：aba_research_trend("mahjong bag", M) 58 个月，2022-04:528→2026-09:58322（两年23倍）
    // 边界：W 周粒度 200+ 周点；2022 年大量 rank=0/searches=1 占位周；峰值周 2026-10-10 当周 12,504
    // 异常：keyword_research_trends("zxqfwv") → 58 个月全 0 序列（词无收录）
  },
  {
    id: 'skill-ss-kw-traffic',
    name: '卖家精灵流量词反查',
    desc: 'ASIN→流量词（traffic_keyword 默认参数！）+ 拓展词关联变体流量份额（traffic_extend），判断竞品流量打法。',
    scenario: '关键词挖掘',
    triggers: ['这个竞品吃什么词', '流量词反查', '它的流量从哪来', '帮我拓这个词', '关联流量'],
    tools: ['traffic_keyword', 'traffic_extend', 'traffic_keyword_stat'],
    steps: [
      'traffic_keyword_stat 先看全景（词数/自然/AC/广告计数）——stat 是历史累计口径，与 keyword 明细的当前月覆盖可能不同（B0H45MC3T2 stat=6 vs keyword=2），两口径都要标注',
      'traffic_keyword 只传 asin+marketplace+order/page/size（⚠️ 带 month/returnFields 必空，2026-11-11 用 month="202610" 第三次复现）',
      '返回 total=0 时改 traffic_extend(asinList, queryType=0, includeKeywords=词根) 按父体变体池查关联流量份额',
      'trafficPercentage=该词分给此 ASIN 的占比；输出流量词表+打法判断（品牌词矩阵/大词卡位/长尾铺量）',
    ],
    instructions: `反查亚马逊 ASIN 流量词：ASIN【填写】。
要求：① traffic_keyword_stat 看全景（历史累计口径，与明细的当前月覆盖数可能不同，两口径都标注）；② traffic_keyword 必须默认参数（传 month 会返回空，已三次复现）；③ total=0 时改用 traffic_extend(queryType=0, includeKeywords=词根) 查变体池关联流量份额并说明降级；④ trafficPercentage 解读为"吃掉该词X%流量"；输出流量词表+竞品流量打法判断+数据来源与日期。`,
    // 实测 demo（2026-11-10/11 真实调用 3 轮）：
    // 正向：B0H45MC3T2 默认参数 → 2 词：mahjong racks（吃89.1%/自然位#27）+ american mahjong（10.9%）
    // 边界：traffic_keyword_stat(B0H45MC3T2) → keywords=6/ranks=6/ads=0/ac=null（历史累计 6 vs 明细 2，口径差实测）
    // 异常：B0H45MC3T2 带 month="202610" → total=0（坑第三次复现）；B0HFJPW8PL 默认参数仍 0 → 降级 extend 得 540 词
  },
]

/* 前台接入：一行完成关联
 * ExpertItem.skills = ssKeywordSkills.map(s => s.id)
 * SkillItem[] = ssKeywordSkills（desc/scenario/tools/steps/instructions 一一对应已有字段） */
export const ssKeywordExpertSkillIds = ssKeywordSkills.map(s => s.id)
