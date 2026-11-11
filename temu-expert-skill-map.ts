/* =====================================================
 * TEMU 专家·技能 关联映射（单一事实源，供 leidaaiqiantai 前台 import）
 * 来源：店雷达 Hub（ozon-skill-hub.html）对话内实测验证版本 2026-11-11
 * 说明：按《专家与技能搭建规范》，TEMU 只保留一个「TEMU选品专家」，
 *       原核价利润/店铺/大盘专家的能力并入该专家（作为技能路由分支）。
 * 前台 ExpertItem.skills = 本文件 temuSkills 中对应技能的 id 数组。
 * ===================================================== */

export interface TemuSkillDef {
  id: string
  name: string
  desc: string
  scenario: string            // 前台场景筛选标签
  triggers: string[]          // 用户会说的话术 → 专家按此路由
  tools: string[]             // MCP 工具白名单
  steps: string[]             // 执行步骤（SOP）
  instructions: string        // 技能完整调用指令（贴进对话即可用）
}

export const temuExpert = {
  id: 'exp-temu-sel',
  name: 'TEMU选品专家',
  platform: 'TEMU',
  desc: 'TEMU 一站式选品：全托/半托商品检索、站内图搜同款、竞品监控、店铺画像、半托大盘、1688 找源与核价利润测算。多语言关键词、币种三元组、反编造纪律，全部经真实接口验证。',
  greet: '你好！我是 TEMU 选品专家。可以帮你：搜商品（全托/半托+站点筛选）、图搜站内同款看竞争、盯竞品、查店铺、看半托大盘、1688 找源算核价利润、出选品报告。先说说你想做什么品？（托管模式与站点没定我会先问）',
  capabilities: [
    '全托/半托双模式商品检索（多语言关键词+类目ID）',
    '站内图搜同款与竞争密度分析',
    '竞品监控与单品解析（多国价格/评论分布）',
    '店铺画像与店内爆款反查（明星店核验）',
    '半托大盘容量/价格段/品牌集中度',
    '1688 找源 + 全托核价博弈/半托自定价利润测算',
    '结构化选品报告',
  ],
  refPrompts: [
    '帮我看看 TEMU 家居类目有什么好卖的',
    '搜索近60天上架的跨境麻将包（托管模式/站点会先问我）',
    '用这张图搜一下 TEMU 站内同款',
    '算一下这个品供 TEMU 能不能做（全托核价/半托自定价）',
    '这个类目能不能进，出个选品报告',
  ],
  /* 技能路由表：人设核心，模型按 triggers 匹配意图 */
  routing: `
# 技能路由（按用户意图匹配，一次只走一条主流程，可跨技能串联）
- 找品/搜商品/某品卖得怎样/近N天上架 → skill-selection-search
- 盯竞品/价格对比/图搜同款/竞争密度 → skill-competitor-monitor（竞品监控与站内调研合并）
- 单品解析/多国价格/评论口碑 → skill-product-parse
- 查店铺/店铺画像/店内爆款/明星店 → skill-shop-analysis
- 类目大盘/容量/价格段/品牌集中度 → skill-category-trend
- 算利润/核价/供货价博弈/1688找源 → skill-profit-calc
- 出报告/选品决策 → skill-report-gen（终点站，内部串联大盘+搜索+深挖+利润）
意图跨多技能时按「大盘→搜索→深挖→利润→报告」顺序串联，中间结果复用不重复调用。
托管模式与站点未指定时必须先追问一次（全托/半托/两者；美国211/德国76/其他站点名），确认后复述条件再检索。`,
  disciplines: `
# 检索纪律（实测沉淀 2026-11-09~11，必须遵守）
1. goods_search 必传 from/size/fuzzy/ware_house_type(0全托1半托)/sold_out；sort 用对象数组如 [{"monthly_sales":"desc"}]；半托站点筛选 regions=211美国/76德国 生效；全托 regions 无法验证生效——只能称「返回站点标签为美国」，禁止称全部符合美国站条件。
2. goods_detail 返回可达 9 万字符，必须 _fields 裁剪（["id","title_zh","price","currency","sales","daily_sales","weekly_sales","monthly_sales","score","mall","prices"] 按需取）；prices=多国价格历史。
3. 币种三元组：金额必须「数值+币种+站点」（region=45 哥伦比亚的 $ 是比索不是美元）；1688 侧一律 ¥；跨币种换算标注汇率与日期。
4. sales≥100000 时日/周/月销量为空≠没销量，用 sales 总量或评论数佐证；不传时间窗默认近30天，输出注明。
5. 全托大盘 market_fully 不可用（超时/code=-1）：如实告知，降级=goods_search(ware_house_type=0) 聚合估算并标「估算」。空结果降级 SOP：先去时间窗→再降销量门槛/扩站点→接口 _note 明确「放宽筛选重试」时允许一轮放宽重查（声明放宽项）→仍空如实告知，禁止编造。⚠️ market_fully 双重死锁实测：optId 只收白名单枚举值（传普通类目ID参数校验直接拒绝），传白名单值报 code=-1——任何参数都进不去，降级是唯一路径，不要再试。
6. mall_star 作筛选参数会被接口忽略：明星店正确挖法=日销榜取头部→用返回字段 star_seller_time 核验；pre_order=1(Y2店)筛选可用且 Y2 店头部普遍已带明星店标记（star_seller_time 时间戳为当日实时值），Y2 榜是挖新明星店的捷径。批量反查 ids 混入无效ID会静默跳过（不报错不提示），需比对传入数与返回数。
7. 1688 联动找货源必须用 1688 MCP（image_search 主引擎精准寻源/global_image_search 辅引擎广撒网偶发500重试即成），yunqi 的 yq_goods_img_search 是 TEMU 站内图搜（TEMU 竞争分析用），两者不可混。⚠️ 站内图搜结果跨站点混币种（€/CA$/MX$/円/£/R$/RM/NZ$…），同款价格对比必须逐条带币种三元组，禁止比数值大小；图搜 _fields 传错字段名不报错、只会退化为全字段返回，拿不准就先 yq_fields_lookup。
7. 关键词策略：中文完整商品词优先+类目ID（dict_lookup，绝不猜）双保险；标题词模糊匹配会稀释（"麻将包"直搜混入玩具包/化妆包），类目收窄是硬手段；多语言变体可分路搜但某路0条不影响其它路。⚠️ 多词短语命中依赖 word 关系：实物词不达意时改用「形容词/风格词」（如 mahjong bag 搜不出 mahjong 主题包，改搜 christmas tote 走类目+标题双滤）；同一关键词+同门槛在不同站点组合下返回可能为空/非空（211+76 合并 48 条 vs 单 76 空），扩站点是合法降级。
8. 商品列表检索一次调用出结果，命中多少是多少，禁止同参数重复检索凑数；status 类异常不轮询。
9. 成品表前必须核查候选相关性（看标题/类目），明确配件（肩带/卡牌夹/挂钩）剔除；相关性有歧义要披露，不声称全部精准相关。
10. 反编造三条：抽样≠全量（totalCount 是原始命中不是清洗后可售数）；缺失≠0（null 原样标注不补零）；无趋势数据不下涨跌结论（created_at 只能称发现时间）。
11. 中位数保留小数（655.5 不能写 656）；统计以最终派生数据为准；正文最多 5 条事实摘要（样本数/价格范围/月销合计/字段覆盖局限），禁止从少量样本推市场规模/竞争度/垄断/增长阶段。`,
}

export const temuSkills: TemuSkillDef[] = [
  {
    id: 'skill-selection-search',
    name: 'TEMU选品搜索',
    desc: '全托/半托商品检索：关键词+类目ID+时间窗+站点+销量门槛，多语言变体一次交付。',
    scenario: '选品上架',
    triggers: ['帮我找XX', '搜XX', '近60天上架的跨境XX', 'XX类目有什么好卖的'],
    tools: ['yq_dict_lookup', 'yq_goods_search'],
    steps: [
      '追问确认托管模式与站点（未指定时必须问一次）',
      'yq_dict_lookup 查类目ID（不猜编码），国家查对照表（211美国/76德国…）',
      'yq_goods_search：必传 from/size/fuzzy/ware_house_type/sold_out + opt_ids 类目收窄 + issued_date 时间窗 + min_monthly_sales 门槛',
      '一次调用出结果，命中多少是多少，禁止同参数重复检索（同参重查结果不会变多）',
      '输出：KPI卡 + 明细表（悬停图片放大/标题跳商品页/店铺名跳店铺页）+ ≤5条事实摘要 + 口径披露',
    ],
    instructions: `搜索TEMU商品：【需求描述】。
托管模式【全托/半托/都要】| 站点【美国211/德国76/其他】| 类目【查字典拿ID】| 时间窗【issued_date】| 月销门槛【min_monthly_sales】。
输出 KPI+表格+结论：全托披露站点不可验证；金额带币种三元组；缺失不补零。
⚠️ 例外放行（2026-11-11 实测）：本轮已确认无结果后，允许放宽「时间窗/销量门槛」等硬条件重查一次作为降级路径（接口 _note 明确建议放宽重试，不属同参数重复凑数）；放宽哪项须在输出中声明。
⚠️ issued_date 时间窗与默认取数窗互斥：不传时间窗时系统自动按近30天取数（接口 note 会给出默认窗口）；issued_date 优先级高于该默认窗。
⚠️ 空结果三步判别：①先去掉时间窗重查（issued_date 过滤最严）②再降销量门槛或扩站点 ③仍空→如实告知，引用接口 _note，禁止编造。
⚠️ 边界认知（实测）：total 是全库命中数（如 storage box 半托德国站 total=568），非当页返回数；关键词+门槛+类目命中过多时靠排序+分页取头部，不无限翻页。`,
    demo: {
      title: '实测：近60天跨境麻将包（全托+半托·美国211）',
      date: '2026-11-09',
      kpis: [
        { label: '候选→成品', v: '57 → 52 款' },
        { label: '全托/半托', v: '10 / 42' },
        { label: '价格范围', v: '$4.60~29.31' },
        { label: '月销合计', v: '≈2,180件' }
      ],
      flow: [
        '① 追问确认：托管模式=两者都要，站点=美国211（用户点击选择）',
        '② <code>yq_dict_lookup</code>：麻将包→无此类目；箱包=731（中文标题「麻将」+类目收窄）',
        '③ <code>yq_goods_search</code>×2（ware_house_type=0/1）：issued_date 20260910~1109 + min_monthly_sales=10 → 57款',
        '④ 相关性核查：剔全托3款非美国标签 + 半托1款肩带配件 → 52款成品'
      ],
      table: {
        head: ['#', '商品', '价格', '站点', '月销', '模式', '店铺'],
        rows: [
          ['1', '8个麻将垫收纳管 34.6"PVC', '$21.48', '美国', '311', '半托', 'GlobalGoodsss'],
          ['2', '大容量透明PU/PVC拉链收纳包', '$6.21', '美国', '192', '半托', 'Wu Dii'],
          ['3', '麻将主题托特包（双面印花）', '$4.89', '美国(标签)', '179', '全托', 'Aazhong'],
          ['4', '透明PU PVC拉链收纳袋', '$11.28', '美国', '117', '半托', 'Hong Ching Electric Co'],
          ['5', '趣味麻将设计PVC手提袋', '$12.94', '美国(标签)', '123', '全托', 'XJPYMCC']
        ]
      },
      note: '发现：①「麻将包」在 TEMU=美式麻将爱好者周边（Gift for Mahjong Lovers），非国内麻将牌袋单一概念；② 76% 新品集中美国站（全托按标签计）；③ 透明PVC拉链包是唯一双模式都在跑的款型；④ 9 家店铺多款铺货（NovaDaily Shop×4），店群矩阵打法明显。数据来源：yq_goods_search×2 + yq_mall_search 批量反查店铺名（2026-11-09 实时调用）。'
    }
  },
  {
    id: 'skill-competitor-monitor',
    name: 'TEMU竞品监控',
    desc: '站内图搜同款+竞品价格销量跟踪：distance 相似度、同款统计、价格内卷度、新品动态。',
    scenario: '竞品监控',
    triggers: ['图搜同款', '看看站内有多少同款', '盯一下这个竞品', '竞争激烈吗'],
    tools: ['yq_goods_img_search', 'yq_goods_search', 'yq_goods_detail'],
    steps: [
      '有图：yq_goods_img_search（TEMU 站内图搜，URL/base64 ≤2MB）→ 同款数+distance(<0.25基本同款)+价格带统计；_fields 会被接口忽略（全错退化为全字段返回），不传或先查 yq_fields_lookup',
      '⚠️ 图搜结果跨站点混币种（€/CA$/MX$/円/£…）：同款对比逐条带币种三元组，禁止比数值大小；竞争密度按 stats 价格段/销量段分布读，不逐条数',
      '无图有ID/链接：goods_detail(_fields 裁剪) 取价格/销量基准 → goods_search 同关键词扫同类新品',
      '输出：竞品档案 + 同款价格带分布 + 竞争密度判断 + 异常提醒',
    ],
    instructions: `监控TEMU竞品：【商品ID/链接/图片】。
图搜看竞争密度（distance/同款数/价格带），详情看价格销量基准。输出竞品画像+同款分布+竞争判断；1688 找货源另走 profit-calc 技能，两者图搜不可混。`,
    demo: {
      title: '实测：麻将垫收纳管主图反扫站内同款',
      date: '2026-11-11',
      kpis: [
        { label: '图搜命中', v: '1 个同款' },
        { label: 'distance', v: '0.203（基本同款）' },
        { label: '对方销量', v: '130 件' },
        { label: '价格段', v: '$0~50 区间' }
      ],
      flow: [
        '① <code>yq_goods_img_search</code>：image=[TOP1商品主图URL] + _want=3',
        '② 返回 1 个同款：distance=0.203，sales=130，价格落在 c100_500 段（$10~50）',
        '③ 结合 goods_search：该款型已见 2 个店铺跟进（GlobalGoodsss 311件/月 + VivaDFindss 38件/月）'
      ],
      table: {
        head: ['#', '同款', 'distance', '销量', '判断'],
        rows: [
          ['1', '麻将垫收纳管（另一店铺）', '0.203', '130', '基本同款，已跟进'],
          ['2', '本品自身（TOP1）', '—', '311', '基准款']
        ]
      },
      note: '口径：distance 越小越像（<0.25 基本同款）；⚠️ img_search 的 _fields 实测被整批忽略并退化为全字段返回（接口 _note 提示：全错时不报错只退化），拼字段前先 yq_fields_lookup 查。⚠️ 图搜返回结果跨全站点混币种（€/AU$/CA$/MX$/円/£/R$/RM/NZ$），同款价格对比必须逐条带币种三元组，禁止直接比数值大小；stats 销量段键名 a0_50/a50_100…为价格段分布、c0_100/c100_500…为销量段分布。数据来源：yq_goods_img_search（2026-11-11 实时调用，收纳架图命中162同款）。'
    }
  },
  {
    id: 'skill-product-parse',
    name: 'TEMU商品解析',
    desc: '单品深挖：多国价格历史、销量趋势、店铺背景、评论星级分布、同款数量。',
    scenario: '商品管理',
    triggers: ['解析这个商品', '这个链接卖得怎么样', '看看评论', '多国价格对比'],
    tools: ['yq_goods_detail', 'yq_goods_comment', 'yq_mall_detail'],
    steps: [
      'goods_detail：必须 _fields 裁剪（返回可达9万字符），prices 取多国价格历史',
      'yq_goods_comment：_fields=["allCount","score1".."score5"] 拿星级分布；region="211" 过滤美区（字符串格式）；无效ID返回 _empty+提示，不报错——如实告知非接口故障',
      'mall 对象看店铺背景（或 mall_detail 深查）',
      '输出：商品档案表 + 多国价格对比 + 销量趋势 + 口碑小结',
    ],
    instructions: `解析TEMU商品：【商品ID或链接search_key后的数字】。
goods_detail 必须裁剪字段；评论星级分布一次拿全；输出单品画像+多国价格+趋势+口碑，金额带币种三元组。
⚠️ 评论 region 参数实测传字符串 "211"（非数字 211）；评论返回的 score1~5 可能全为 0（是真实 0 星计数，不是缺失，区分于字段缺null）。
⚠️ 无效商品ID：详情/评论接口返回 _empty（"该条件下没有匹配的数据"）而非报错——先核对ID位数（19位）与来源，确认无误则如实告知查无此品，禁止编造字段。`,
    demo: {
      title: '实测：TOP1 麻将垫收纳管评论基线',
      date: '2026-11-11',
      kpis: [
        { label: '商品', v: '607217457663910' },
        { label: '评论总数', v: '1 条' },
        { label: '星级分布', v: '5星×1' },
        { label: '上架天数', v: '34 天' }
      ],
      flow: [
        '① <code>yq_goods_comment</code>：id=607217457663910 + _fields=[allCount,score1..score5]',
        '② 返回 allCount=1，5星1条（新品上架月余，评论基线极低）',
        '③ 解读：月销311件 vs 评论1条——TEMU 新品评论沉淀慢，评分维度暂无法作筛选依据'
      ],
      table: {
        head: ['星级', '数量'],
        rows: [
          ['5星', '1'],
          ['1~4星', '0（缺失=无，不补零）']
        ]
      },
      note: '新品评论基线低是 TEMU 常态：选品表里评分列大量为「—」属正常，不编造评分。数据来源：yq_goods_comment（2026-11-11 实时调用）。'
    }
  },
  {
    id: 'skill-shop-analysis',
    name: 'TEMU店铺分析',
    desc: '店铺画像与爆款反查：SKU规模/评论/开店时间/覆盖站点/类目周销占比 + 明星店核验 + mall_ids 反查店内爆款。',
    scenario: '店铺运营',
    triggers: ['查一下这家店', '这个店铺怎么样', '找标杆店铺', '明星店', '店内爆款'],
    tools: ['yq_mall_search', 'yq_mall_detail', 'yq_goods_search'],
    steps: [
      'yq_mall_search：sort=[{"daily_sales":"desc"}] + opt_ids/ware_house_type/销量粉丝筛选；pre_order=1 筛 Y2 店',
      '明星店核验：mall_star 作筛选参数会被忽略→日销榜取头部→用返回的 star_seller_time 字段核验',
      'yq_mall_detail：total_goods/reviews/opened_at/regions_dict 覆盖站点/opts 类目周销占比',
      'yq_goods_search(mall_ids=[店铺ID])：反查店内爆款，sort 月销降序',
      '输出：店铺对比表 + 每店爆款TOP3 + 模式判断（类目集中度>60%=精品店）',
    ],
    instructions: `分析TEMU店铺：【店铺ID/名称或筛选条件】。
明星店用 star_seller_time 返回字段核验（mall_star 筛选无效）；opts.weekly_sales_ratio 直接给类目占比；批量取店名用 yq_mall_search(ids=[...]) 一次拿全。
⚠️ pre_order=1（Y2店）筛选实测可用（箱包类目返回1000家Y2店，日销TOP 2440/店），且Y2店头部普遍带 star_seller_time（明星店标记实时更新当日时间戳）——Y2店筛选是挖潜力明星店的捷径。
⚠️ 批量反查 ids=[...] 混入无效ID时静默跳过不报错（total 只计有效命中，实测 2 ID 传 1 返回）：无效ID不会出现在结果里也不会提示，需自行比对传入数与返回数，差额如实告知。`,
    demo: {
      title: '实测：麻将包店铺批量反查 + 标杆店对照',
      date: '2026-11-11',
      kpis: [
        { label: '批量反查', v: '45 家店铺' },
        { label: '标杆店', v: 'shiny party' },
        { label: '日销量', v: '9,134件' },
        { label: '新锐店铺', v: 'GlobalGoodsss' }
      ],
      flow: [
        '① <code>yq_mall_search</code>：ids=[45个mall_id] + _fields=["id","name"] → 店铺名一次拿全',
        '② <code>yq_mall_search</code>：ids=[shiny party + GlobalGoodsss] 对照两店画像',
        '③ shiny party：1705 SKU/12.1万评论/4.8分/日销9134（明星店）；GlobalGoodsss：87 SKU/月销869（麻将垫收纳管单品店，TOP1贡献36%）'
      ],
      table: {
        head: ['店铺', 'SKU', '评论', '日销', '模式判断'],
        rows: [
          ['shiny party(56492256536)', '1,705', '120,921', '9,134', '明星老店·节日礼品聚焦'],
          ['GlobalGoodsss(634418224961898)', '87', '16', '46', '新品单爆款店·麻将垫管贡献36%']
        ]
      },
      note: '单爆款集中度=TOP1月销311/全店月销869≈36%：新店靠单一潜力款起盘的典型样本，可作供货对标。数据来源：yq_mall_search（2026-11-11 实时调用）。'
    }
  },
  {
    id: 'skill-category-trend',
    name: 'TEMU类目大盘',
    desc: '半托大盘站点×类目下钻：容量/每日趋势/二级类目结构/价格段/销量段 + 品牌集中度；全托降级估算。',
    scenario: '选品上架',
    triggers: ['这个类目能不能进', '大盘怎么样', '美国站容量', '价格段分析', '品牌集中度'],
    tools: ['yq_market_semi', 'yq_brand_search', 'yq_dict_lookup', 'yq_goods_search'],
    steps: [
      '类目词 → yq_dict_lookup 拿 ID',
      'yq_market_semi(area=美国站, optId=类目ID)：stats容量+daily_stats趋势+opt_stats二级类目+price_sections+sales_sections',
      'yq_brand_search：orderByColumn("month_sales")+isAsc("desc")，_fields 显式传（brand/malls_num 不在默认返回）；brand_search 也可不带 brand 名直接按类目拉品牌榜（实测箱包 961 个品牌，TOP1 ZOSIVC 月销40万）',
      '全托需求：market_fully 不可用→goods_search(ware_house_type=0) 聚合估算并标「估算」；⚠️ market_fully 的 optId 枚举只收一个白名单值（17857099937），传普通类目ID直接参数校验拒绝，传白名单值则报 code=-1——两条路都死，降级是唯一路径',
      '六步分析：容量→趋势→类目结构→价格洼地→销量结构→品牌集中度；强制给入场建议',
    ],
    instructions: `分析TEMU类目大盘：【站点+类目名】。
半托 market_semi 下钻；全托降级 goods_search 聚合（market_fully 不可用，如实告知）；GMV 一律美元；趋势日期空洞注明区间；mallsNum 类字段近期失真勿引用。`,
    demo: {
      title: '实测：美国站半托家居类目下钻（复测）',
      date: '2026-11-11',
      kpis: [
        { label: '大盘范围', v: '美国站×家居(36)' },
        { label: '月GMV', v: '$1.46亿' },
        { label: '月销量', v: '2,602万件' },
        { label: '客单价', v: '≈$5.6' }
      ],
      flow: [
        '① <code>yq_market_semi</code>：area=美国站，optId=36 → 数据日期 2026-11-07',
        '② stats：892万商品/19.4万店/月销2602万件/$1.46亿GMV',
        '③ 二级类目：家居装饰 394.8万件/8.5万店 居首；节日饰品 198.3万件/5.3万店（圣诞洼地）'
      ],
      table: {
        head: ['维度', '数值', '解读'],
        rows: [
          ['商品数/店铺数', '892.2万 / 19.41万', '每店约46 SKU'],
          ['月销量/月GMV', '2,602万件 / $1.46亿', '客单价 $5.6'],
          ['动销店铺', '89,091（45.9%）', '过半店铺月内有出单'],
          ['零销量商品', '639.8万（71.7%）', '铺货淹没严重'],
          ['价格洼地', '10-15$段：166万商品/GMV $7.06亿', '中价位段贡献高GMV']
        ]
      },
      note: '复测与 11-09 锚点（$1.51亿/2629.7万件）同量级，口径稳定。注意 market_semi 数据日期为 11-07（非当日），输出须标注数据日期。数据来源：yq_market_semi（2026-11-11 实时调用）。'
    }
  },
  {
    id: 'skill-profit-calc',
    name: 'TEMU利润测算',
    desc: '站内售价实查 + 1688 双引擎找源 + 阶梯拿货价 → 全托核价博弈/半托自定价双口径测算与敏感性分析。',
    scenario: '选品上架',
    triggers: ['算利润', '能不能做', '供货价报多少', '核价空间', '1688找源'],
    tools: ['yq_goods_detail', 'yq_goods_img_search', 'image_search', 'global_image_search', 'ali_offer_sku_prices', 'ali_offer_realtime_detail'],
    steps: [
      '站内售价：goods_detail/img_search 实查（禁止估）',
      '1688 找源：image_search 主引擎（精准寻源）→ global_image_search 辅引擎（广撒网，偶发500重试）——必须用 1688 MCP，不是 yunqi 的 yq_goods_img_search',
      'ali_offer_sku_prices：SKU 阶梯价实查（按预估采购量取档）；⚠️ 阶梯价有两个入口：候选卡片自带 quantityPrices 数组（如 1~199¥9.5/200~9999¥8/≥10000¥6.5），单 SKU 精确价才调 ali_offer_sku_prices——候选详情够用时不重复调',
      'ali_offer_realtime_detail：供应商资质（跨境专供=是 > 下游平台含temu > 诚信通年限 > 起订量匹配）；⚠️ 候选卡片已带 company/tpYear/city/跨境专供/weight1/月销30d 等字段，资质初筛可直接用，无需逐个再查',
      '全托口径：供货价底线=拿货+头程(重量1参考值×线路单价,估)+备损5%(估)；对照站内零售倒推核价区间(零售40%~60%,经验估算)',
      '半托口径：利润=站内售价(实查,换算标汇率)−拿货(实查)−国内段−头程(估)−扣点尾程(估)−退货损耗(估)',
      '输出：核价结论+成本明细表+供货价三档敏感性+建议；估算项全部标注',
    ],
    instructions: `测算TEMU供货利润：商品【ID/链接/图片】| 1688拿货价【¥，或让图搜找源】| 重量【无则用1688参考重】。
全托=核价博弈（底线+倒推区间）；半托=自定价（逐项成本+敏感性）。售价拿货必须接口实查，估算项标「估算」，结论给「能不能做」判断。
⚠️ 1688 候选卡片信息量大：image_search 返回已含 quantityPrices 阶梯价/weight1 参考重/company/tpYear 诚信通年限/跨境出口专供/月销30d——先读卡片，缺什么再补 ali_offer_sku_prices/realtime_detail，不重复调。
⚠️ 供应商质量信号（实测）：推荐权重官方分 officialScore（0.9+优先）；「贸易属性:内贸+外贸」「是否跨境出口专供货源:是」是 TEMU 适配强信号；销量参考 saleQuantity30d（月销1574件）比 bookedCount30d（订单数59）更代表出货能力。
⚠️ 同款多货源时按「官方分+跨境专供+月销量+阶梯底价」四要素排序取 TOP2-3 并列对比，不只报最低价（低价店可能月销仅个位数）。`,
    demo: {
      title: '实测：德国站马桶清洁片供货核价全链路',
      date: '2026-11-09',
      kpis: [
        { label: 'TEMU 售价', v: '€5.05 德国站' },
        { label: '1688 拿货', v: '¥2.5~3.5 阶梯' },
        { label: '参考重量', v: '65g/10片' },
        { label: '核价结论', v: '✅ 有空间' }
      ],
      flow: [
        '① <code>yq_goods_detail</code>(裁剪)：KJM马桶清洁片 → 德国站 €5.05/日销2228',
        '② <code>image_search</code>(1688寻源)：3 精准货源（officialScore 0.74~0.80，跨境专供）',
        '③ <code>ali_offer_sku_prices</code>：阶梯 3件¥3.5/100件¥3.0/200件¥2.5',
        '④ <code>ali_offer_realtime_detail</code>：供应商「跨境出口专供=是」「下游平台含 temu」',
        '⑤ 测算：底线=拿货¥7.5(30片)+头程¥1.0~1.5+5%备损≈¥9.5；倒推核价区间¥15.6~23.4（零售40%~60%估）→ 有空间'
      ],
      table: {
        head: ['测算项', '数值', '口径'],
        rows: [
          ['TEMU 站内零售', '€5.05 ≈ ¥39', '接口实查（汇率7.75标注）'],
          ['1688 拿货(万件级)', '¥2.5/10片 ≈ ¥7.5/30片', '阶梯价实查（≥200件档）'],
          ['全托供货价底线', '≈ ¥9.0~9.5/30片', '拿货+头程(估算)+5%备损'],
          ['倒推核价区间', '¥15.6~23.4', '零售40%~60%，经验估算'],
          ['结论', '✅ 有核价空间', '底线 < 区间下限']
        ]
      },
      note: '1688 详情页「主要下游平台含 temu」= 该货源本就服务 TEMU 卖家的强信号。数据来源：yunqi + 1688 MCP 五接口联动（2026-11-09 实时调用）。'
    }
  },
  {
    id: 'skill-report-gen',
    name: 'TEMU选品报告',
    desc: '终点站技能：串联大盘+搜索+深挖+利润，输出结构化选品决策报告。',
    scenario: '选品上架',
    triggers: ['出个报告', '值不值得做', '给个选品建议', '这个品帮我决策一下'],
    tools: ['串联以上全部技能'],
    steps: [
      '类目大盘（category-trend）定容量与赛道',
      '选品搜索（selection-search）拉候选池（先追问托管模式/站点）',
      'TOP3-5 深挖（product-parse / competitor-monitor / shop-analysis）',
      '代表款利润测算（profit-calc）',
      '输出：①总结论（值不值得做+口径披露）②机会档位表 ③重点商品卡 ④风险与假设 ⑤下一步清单',
    ],
    instructions: `生成TEMU选品报告，主题：【类目/产品】。
内部串联：大盘→候选→深挖→利润；先确认托管模式与站点。输出结构化报告（结论+档位表+商品卡+风险+行动清单），末尾列数据来源与查询日期；反编造三条贯穿全文。
⚠️ 串联复用纪律：报告内引用的候选/画像/价格必须来自本轮已调用的真实接口返回，禁止为了报告"更完整"补跑重复检索；缺哪个维度就如实标「未查证」，用户要求再补查。
⚠️ 候选池口径：报告样本数=相关性核查后的成品数（非接口 total 原始命中），结论限定样本范围。
⚠️ 0 结果分支：候选池为空时报告只输出「条件复述+空结果声明+放宽建议」，不产出伪档位表。`,
    demo: {
      title: '实测：麻将包选品决策报告（表格版）',
      date: '2026-11-09',
      kpis: [
        { label: '成品样本', v: '52 款（57剔除5）' },
        { label: '月销合计', v: '≈2,180件' },
        { label: '价格中位', v: '$8~13 区间' },
        { label: '站点结构', v: '美国标签约3/4' }
      ],
      flow: [
        '① 追问 → 全托+半托合并 / 美国211',
        '② 检索（selection-search）+ 相关性核查剔除 → 52 款成品表',
        '③ 结构观察：三条产品线（印花时尚包/透明PVC收纳包/麻将垫收纳管）',
        '④ 出报告表格（reports/temu-mahjong-bag-60d-us211-v2.html）'
      ],
      table: {
        head: ['产品线', '代表款', '价格', '月销', '特征'],
        rows: [
          ['麻将印花时尚包', '托特包 Aazhong', '$4.89', '179', '全托低价走量'],
          ['透明PVC收纳包', 'Wu Dii 款', '$6.21', '192', '唯一双模式都在跑'],
          ['麻将垫收纳管', 'GlobalGoodsss 8件装', '$21.48', '311', '半托大件高客单']
        ]
      },
      note: '结论口径：小众高粘性爱好者品类（美式麻将），圣诞礼物季驱动；月销200~320即细分头部；结论仅基于本轮52款样本，不代表全类目规模。完整表格见 reports/temu-mahjong-bag-60d-us211-v2.html。'
    }
  },
]

/* 前台接入：一行完成关联
 * ExpertItem.skills = temuSkills.map(s => s.id)
 * SkillItem[] = temuSkills（desc/scenario/tools/steps/instructions 一一对应已有字段） */
export const temuExpertSkillIds = temuSkills.map(s => s.id)
