/* 1688 单专家技能映射。纯 JavaScript ESM 语法，可复制为 .js 后在浏览器 import。
 * 数据：2026-11-10 1688 实调；图搜成功案例另见同日本地历史报告。
 */

/**
 * @typedef {{title: string, date: string, kpis: string[], flow: string[], table: Array<Record<string, string | number | null>>, note: string, source: string}} A1688Demo
 * @typedef {{id: string, name: string, desc: string, scenario: string, triggers: string[], tools: string[], steps: string[], instructions: string, demo: A1688Demo}} A1688SkillDef
 * @typedef {{id: string, name: string, platform: string, desc: string, greet: string, capabilities: string[], refPrompts: string[], routing: string, disciplines: string}} A1688ExpertDef
 */

/** @type {A1688ExpertDef} */
export const a1688Expert = {
  id: 'exp-1688-sel',
  name: '1688选品专家',
  platform: '1688',
  desc: '按需求找货、看榜单和新品、以图寻源、核验单品及店铺、读取监控池，并按明确假设测算报价情景；结果以真实接口和口径为准。',
  greet: '你好，我是1688选品专家。你可以告诉我品类、图片、货号或店铺链接，也可以让我看榜单、新品、监控池，或按你的售价和费用假设测算利润。',
  capabilities: [
    '按关键词条件找品及跨境货源筛选',
    '商品榜单观察与候选去噪',
    '新品发现与类目核对',
    '以图找货及候选属性核验',
    '商品详情、月度销售与SKU报价深挖',
    '店铺主体与履约指标核验',
    '商品与店铺监控池读取',
    '基于指定SKU报价的利润情景测算',
  ],
  refPrompts: [
    '找近30天销量高的磁吸收纳盒，优先跨境货源',
    '看收纳盒商品榜有什么值得深挖的',
    '最近上架的收纳盒有哪些，排除错类',
    '用这张图在1688找候选货源',
    '深挖货号734800252457的销量、规格和报价',
    '核验 https://huaijan.1688.com 这家店',
    '读一下我监控池里的商品和店铺',
    '售价20元、运费3元、费用2元，用白色磁吸166*122的4.6元参考价算情景毛利',
  ],
  routing: `# 1688 技能路由（按主意图选择，可串联）
- 条件找品/跨境货源/关键词筛选 → skill-1688-conditional-search
- 商品榜/热销排行/榜单候选 → skill-1688-billboard
- 新上架/新品发现/新货过滤 → skill-1688-new-products
- 给图片找货/图搜寻源/相似款 → skill-1688-image-search
- 货号详情/销量口径/SKU阶梯报价 → skill-1688-product-deep-dive
- 店铺核验/厂家资质/履约评价/店铺榜/优质供应商 → skill-1688-shop-verification
- 我的监控池/已监控商品或店铺 → skill-1688-monitor-read
- 报价测算/毛利/费用情景 → skill-1688-profit-scenario
跨技能串联：榜单或新品或条件找品或图搜 → 复用已得到的 offerId 深挖 → 用已知 shopUrl 核店 → 复用已核对的 skuId 与参考价做情景测算。监控池条目需深挖时只查该条目，已有响应不重复调用；同一请求有多个意图时依链路依次执行。`,
  disciplines: `# 平台实测纪律（2026-11-10）
1. 只使用1688接口和用户提供的假设；样本排序/榜单日期/监控池各有独立口径，抽样不等于全量；totalCount=10000的普通检索结果未清洗，不能报作目标商品数。跨境筛选totalCount=67也不能替代质量筛选。
2. 参数：普通/跨境搜索与商品榜使用req，趋势新品和监控列表使用request，新品request.titleTags在本MCP schema必传，详情和SKU使用req.offerId字符串，店铺分析使用顶层shopUrl，图搜req.imageUrls只能含1张图。商品月榜pageType=3、date传当月第一天；关键词加sortField曾返回空，先去掉排序重试并报告降级。shopScreen需营业执照全名；店铺榜shop_rank_list历史返回空，找店改按商品结果shopUrl核验。
3. 标题、类目与规格联合去噪：磁吸收纳盒检索会混入手机配件；收纳盒新品会混入沥水碗架、便携餐具盒和蛋糕模。跨境标签只表明货源标签，不保证适配目标市场。
4. 1688金额按返回人民币口径写¥；笔数、件数和销售额分别写明口径，不把件数当订单。offerRepurchaseRate存在小数与百分数两种表示，转换前核对字段口径；监控池monthSalesVolume字段单位未核实，原样保留；服务指标以原始小数展示，百分比换算须注明口径，不臆断优劣。
5. SKU 与阶梯报价不能混用：白色磁吸166*122 skuId 5251111954228参考¥4.6；无磁吸166*122 skuId 5949219410490参考¥4；500件起¥4的priceRanges不能当有磁吸SKU单价。未核定采购量、运费与结算价前不称实际利润。
6. 单品近30天数据与自然月数据窗口不同；2026-10月与09月可并列比较，但不得把不同时间窗数值直接当订单增幅；trend为relative/normalized，y值不是绝对订单。无完整趋势序列不下整体涨跌结论。
7. null/缺失不补0，单次监控池读取不是历史变化；图搜本轮image_search为504、global_image_search为code500，不伪称成功。旧报告图搜成功只证实候选，需拿样核对同款。
8. 每个结论附实际调用与日期；错误接口标明失败，失败后不编造候选、价格、销量或原因。`,
}

/** @type {A1688SkillDef[]} */
export const a1688Skills = [
  {
    id: 'skill-1688-conditional-search',
    name: '1688条件找品（含跨境）',
    desc: '按关键词、周期和排序筛选普通及跨境货盘，逐条排除错类结果。',
    scenario: '选品找货',
    triggers: ['帮我找磁吸收纳盒', '找近30天销量高的收纳盒', '优先跨境货源找这款', '筛一下有订单的跨境商品'],
    tools: ['mcp__1688__product_search_list', 'mcp__1688__cross_border_product_search_list'],
    steps: [
      '确定品类、必要属性、周期与是否跨境，分别设置检索参数。',
      '普通检索和跨境检索各取样本，按offerId去重并逐条核对标题、类目与规格。',
      '列出有效候选及被排除的噪音，分别标明笔数、件数、金额和检索范围。',
    ],
    instructions: `按用户关键词及条件调用product_search_list；明确要求跨境时再调用cross_border_product_search_list，沿用同一关键词/周期并用用户指定订单阈值。对齐offerId去重、核对类目与磁吸等核心属性，排除手机配件。保留请求、code、totalCount和样本明细；totalCount是原始命中数，不等于清洗后的可售货源数。`,
    demo: {
      title: '磁吸收纳盒普通与跨境样本对照',
      date: '2026-11-10',
      kpis: ['普通检索code 200，原始totalCount 10000（未清洗）', '跨境检索code 200，原始totalCount 67', '同一offerId 734800252457在两路首位，需去重'],
      flow: [
        "product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'30',pageIndex:1,pageSize:3,sortField:'saleVolume30d',sortType:'desc'}}) → code 200",
        "cross_border_product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'30',beginOrderCount:10,pageIndex:1,pageSize:3,sortField:'saleVolume30d',sortType:'desc'}}) → code 200",
      ],
      table: [
        {来源: '普通/跨境首位', offerId: '734800252457', 参考价: '¥4', 近30天件数: 152721, 近30天笔数: 48, 近30天销售额: '¥610884', 处理: '磁吸收纳盒相关候选；列表价需按磁吸SKU核对'},
        {来源: '跨境样本', offerId: '1044998343367', 参考价: '¥15', 近30天件数: 7314, 近30天笔数: 40, 近30天销售额: '¥109710', 处理: '亚克力卡牌展示盒；与磁吸收纳盒需求不符'},
        {来源: '跨境样本', offerId: '963590713991', 参考价: '¥15', 近30天件数: 4544, 近30天笔数: 118, 近30天销售额: '¥68160', 处理: '规格相关性待核，不能直接当磁吸款'},
      ],
      note: '首位标题对应磁吸收纳盒，但¥4列表价不能代替磁吸SKU的¥4.6参考价；卡牌展示盒属于噪音。原始命中量未经清洗。',
      source: 'mcp__1688__product_search_list、mcp__1688__cross_border_product_search_list；2026-11-10 实调，参数见flow。',
    },
  },
  {
    id: 'skill-1688-billboard',
    name: '1688商品榜',
    desc: '读取指定日期的商品榜，以榜单商品作为待核对候选。',
    scenario: '榜单发现',
    triggers: ['看收纳盒商品榜', '有哪些热销榜商品', '按日期查榜单', '榜单前几名卖得怎样'],
    tools: ['mcp__1688__product_billboard_list'],
    steps: [
      '确认榜单日期、pageType与关键词后请求榜单。',
      '记录样本货号、价格、件数、笔数与销售额，核对品类。',
      '给待深挖的offerId，不以单日榜单推断整体市场。',
    ],
    instructions: `调用product_billboard_list查询指定日期、pageType与关键词；输出每行offerId、参考价、销量件数、订单笔数和销售额，注明榜单日期与实际调用日期。样本只用于发现候选；有后续需求则按offerId进入单品深挖。`,
    demo: {
      title: '2026-10-01 收纳盒榜单样本',
      date: '2026-11-10（请求榜单日期2026-10-01）',
      kpis: ['code 200', '首位11331件/11192笔/¥113423.31', '次位10214件/9746笔/¥56177'],
      flow: ["product_billboard_list({req:{date:'2026-10-01',pageType:3,keyWord:'收纳盒',pageIndex:1,pageSize:3}}) → code 200"],
      table: [
        {名次: 1, offerId: '1087689307649', 参考价: '¥10.01', 件数: 11331, 笔数: 11192, 销售额: '¥113423.31'},
        {名次: 2, offerId: '886261779564', 参考价: '¥5.5', 件数: 10214, 笔数: 9746, 销售额: '¥56177'},
      ],
      note: '榜单请求日期与接口调用日期不同；pageSize=3，表中仅记录已提供的两条返回，不能外推全榜。',
      source: 'mcp__1688__product_billboard_list；2026-11-10 实调，榜单date=2026-10-01。',
    },
  },
  {
    id: 'skill-1688-new-products',
    name: '1688新品发现',
    desc: '在新品列表中核对上架日期、实际类目和关键词相关性。',
    scenario: '新品发现',
    triggers: ['最近有什么收纳盒新品', '看新上架货源', '筛近30天新品', '找刚上架的候选'],
    tools: ['mcp__1688__product_trend_new_list'],
    steps: [
      '按关键词、周期与实测标签取新品样本。',
      '逐条交叉检查商品名称、类目和上架日期。',
      '标注错类与待核商品，避免以关键词命中直接断言新品机会。',
    ],
    instructions: `用product_trend_new_list查询新品；保留真实request嵌套参数与返回code。按标题、类目核验命中，记录上架日期和排除理由；没有连续趋势序列不声称销量在上涨。`,
    demo: {
      title: '收纳盒新品关键词错类核验',
      date: '2026-11-10',
      kpis: ['code 200', '样本3个offerId，均不能直接作为目标收纳盒候选', '首条上架日期2026-10-23'],
      flow: ["product_trend_new_list({request:{keyWord:'收纳盒',searchType:4,cycle:'30',titleTags:['289794'],pageIndex:1,pageSize:3}}) → code 200"],
      table: [
        {offerId: '1094384793742', 类目: '沥水碗架', 说明: '厨房碗碟架', 参考价: '¥99.99', 件数: 1001, 笔数: 2, 上架: '2026-10-23', 处理: '排除收纳盒目标'},
        {offerId: '1095951942592', 类目: '便携餐具', 说明: '便携餐具盒', 参考价: '¥18.5', 件数: 4420, 笔数: 1, 上架: '2026-11-02', 处理: '排除错类'},
        {offerId: '1090363232064', 类目: '蛋糕模', 说明: '硅胶模具', 参考价: '¥4.5', 件数: 17400, 笔数: 5, 上架: '2026-10-05', 处理: '排除错类'},
      ],
      note: 'titleTags=289794为新品标签；三条均与目标收纳盒品类有偏差。30天成交笔数分别为2、1、5，不能以件数推断零售热度，也不由单页判断类目趋势。',
      source: 'mcp__1688__product_trend_new_list；2026-11-10 实调，参数见flow。',
    },
  },
  {
    id: 'skill-1688-image-search',
    name: '1688以图找货',
    desc: '用图片找候选货源，逐项核对属性；接口失败时如实说明。',
    scenario: '图片寻源',
    triggers: ['用这张图找货', '帮我以图搜1688', '找相似货源', '这张主图能找到供应商吗'],
    tools: ['mcp__1688__image_search', 'mcp__1688__global_image_search', 'mcp__1688__ali_offer_sku_prices'],
    steps: [
      '使用用户给的图片URL调用图搜，记录请求、状态和错误。',
      '成功时按标题、类目、规格、SKU初筛候选，区分相似与同款。',
      '失败时报告无候选；仅复用可核查的历史成功证据并标明日期，不拼接为本轮成功。',
    ],
    instructions: `对提供的图片先用image_search或global_image_search查询；记录原图、状态与errorId。成功候选必须核对标题、类目、目标颜色/尺寸和SKU，价格只写对应参考价或区间。失败不得生成候选；旧报告候选仅用于说明已存在的历史证据，样品未验证前不能称同款。`,
    demo: {
      title: '本轮图搜失败与历史图搜成功的分离记录',
      date: '2026-11-10；历史报告调用区间2026-11-10 15:40:59—16:05:31（北京时间）',
      kpis: ['本轮image_search：504，无候选', '本轮global_image_search：code 500，errorId e1e1c581740e4715898f49c9996cdc7c', '历史image_search：code 200，taskId 5d6c03671b0444248523b3ac519a670b'],
      flow: [
        'image_search：单图 https://cbu01.alicdn.com/img/ibank/9234638357_1340358845.jpg → 504',
        'global_image_search：同图、platform=1688 → code 500 / errorId e1e1c581740e4715898f49c9996cdc7c',
        '历史 image_search({req:{imageUrls:["https://m.media-amazon.com/images/I/41G5Cfex0XL._AC_US600_.jpg"]}}) → code 200 / taskId 5d6c03671b0444248523b3ac519a670b；历史 ali_offer_sku_prices({req:{offerId:"1084396803022"}}) → code 200',
      ],
      table: [
        {批次: '本轮单图', offerId: null, 结果: '504/500；无候选', SKU: null, 价格: null, 处理: '报告失败'},
        {批次: '历史报告', offerId: '1084396803022', 结果: '30cm短发深棕候选', SKU: '6140798789833', 价格: '阶梯参考¥11—13', 处理: '待拿样；不可称同款'},
      ],
      note: '历史样本仅凭图搜和文字属性初筛，发型剪裁、色差、配件需拿样；历史报告不推送。本轮失败与历史成功来自不同图片。',
      source: '本轮mcp__1688__image_search / global_image_search 实调，2026-11-10；历史证据 F:/workbuddy/dianleida/reports/wig-profit-batch-a.json 第1项 callLog、selectedSkuSpec，调用区间见date。',
    },
  },
  {
    id: 'skill-1688-product-deep-dive',
    name: '1688单品深挖',
    desc: '核查货号的销售窗口、实时商品属性及具体SKU参考报价。',
    scenario: '单品核验',
    triggers: ['分析货号734800252457', '看看这款近30天销量', '核对这个SKU多少钱', '看商品详情和阶梯价'],
    tools: ['mcp__1688__product_info', 'mcp__1688__ali_offer_realtime_detail', 'mcp__1688__ali_offer_sku_prices'],
    steps: [
      '按offerId查product_info的近30天及自然月数据。',
      '查实时详情核对材质、包装、跨境标签和抓取时间。',
      '查SKU报价，按skuId与规格对齐，不拿别的SKU或阶梯最低价代替。',
    ],
    instructions: `按offerId依次查product_info、ali_offer_realtime_detail、ali_offer_sku_prices；列出近30天和自然月各自笔/件/额，给实时抓取时间与关键属性；报价绑定到skuId和规格，priceRanges注明起批量。没有完整同窗趋势序列不声称绝对订单上升。`,
    demo: {
      title: '734800252457 单品销售与磁吸规格报价',
      date: '2026-11-10；实时详情fetchedAt=2026-11-10T12:55:27Z',
      kpis: ['近30天48笔/152721件/¥610884', '2026-10月44笔/149911件/¥599644', '2026-09月27笔/56746件/¥226984'],
      flow: [
        "product_info({req:{offerId:'734800252457'}}) → 近30天及2026-10/09自然月数据",
        "ali_offer_realtime_detail({req:{offerId:'734800252457'}}) → PP、260G、40个/箱、跨境专供；fetchedAt=2026-11-10T12:55:27Z",
        "ali_offer_sku_prices({req:{offerId:'734800252457'}}) → 规格参考价及priceRanges",
      ],
      table: [
        {项目: '白色磁吸166*122', skuId: '5251111954228', 参考价: '¥4.6', 备注: '目标磁吸规格参考值'},
        {项目: '无磁吸166*122', skuId: '5949219410490', 参考价: '¥4', 备注: '不同SKU，不能代用'},
        {项目: '商品阶梯', skuId: null, 参考价: '500件起¥4', 备注: '不能当磁吸SKU确定结算价'},
      ],
      note: 'PP、260G、40个/箱、跨境专供为商品详情字段；不同时间窗销售数据不能直接比较为订单增幅，trend仅作归一化参考。',
      source: 'mcp__1688__product_info、ali_offer_realtime_detail、ali_offer_sku_prices；2026-11-10 实调。',
    },
  },
  {
    id: 'skill-1688-shop-verification',
    name: '1688店铺核验',
    desc: '读取店铺主体、年限、商品数和履约指标，标明字段口径。',
    scenario: '店铺核验',
    triggers: ['查一下华键店铺', '这家厂家靠谱吗', '核验店铺履约', '看看店铺榜的优质供应商'],
    tools: ['mcp__1688__monitor_shop_analysis', 'mcp__1688__shop_rank_list', 'mcp__1688__product_search_list'],
    steps: [
      '从用户给的shopUrl定位店铺并调用监控店铺分析。',
      '摘录主体、商品数、年限、评级和原始履约字段。',
      '若用户问店铺榜，先查shop_rank_list；若返回空，则以product_search_list按商品找店铺链接再核验，明确不构成榜单。',
      '提示还需确认实际供货SKU与样品，不由单项分数给资质结论。',
    ],
    instructions: `用户给店铺链接时用monitor_shop_analysis({shopUrl})核验主体、商品数、诚信年限、评级与履约/回复/纠纷/退款/复购及物流分。用户问优质店铺榜时可用shop_rank_list({request:{...完整必填字段,rankType:'comprehensive'}})尝试；code200且totalCount=0时直说榜单为空，再用product_search_list按商品找shopUrl并核验，绝不冒充榜单排名。列出实际请求和返回日期，采购前仍需核实样品及合同。`,
    demo: {
      title: '华键文具店铺画像',
      date: '2026-11-10',
      kpis: ['店铺分析code 200', '东莞市华键文具有限公司；90商品；12年；AAA', '物流分2.9；店铺榜totalCount 0'],
      flow: ["monitor_shop_analysis({shopUrl:'https://huaijan.1688.com'}) → code 200", "shop_rank_list({request:{rankType:'comprehensive',pageIndex:1,pageSize:3,sortField:'rankScore',sortType:'desc',beginTpYear:0,endTpYear:0,keyword:'',keywordType:'offer',categoryIdList:[],memberTypeList:[],shopKeyword:'',tradeMedalList:[]}}) → code 200 / totalCount 0"],
      table: [
        {指标: '履约', 返回值: '0.6327'},
        {指标: '回复', 返回值: '0.6302'},
        {指标: '纠纷', 返回值: '0'},
        {指标: '退款', 返回值: '0'},
        {指标: '复购', 返回值: '0.6324349'},
        {指标: '物流分', 返回值: '2.9'},
      ],
      note: '店铺榜本轮code200但无数据，不能把这个已核验店铺写成榜单上榜。各比率分母与评分满分值未核实，不把零值或评级解释为零风险。',
      source: 'mcp__1688__monitor_shop_analysis、shop_rank_list；2026-11-10 实调，请求见flow。',
    },
  },
  {
    id: 'skill-1688-monitor-read',
    name: '1688监控池读取',
    desc: '读取当前商品和店铺监控列表，定位需要后续深挖的条目。',
    scenario: '监控池',
    triggers: ['读我的商品监控池', '我监控了哪些店铺', '看监控池里的报价和销量', '把已监控的货源列出来'],
    tools: ['mcp__1688__monitor_offer_list', 'mcp__1688__monitor_shop_list'],
    steps: [
      '分别读取商品与店铺监控池的当前页，并记录total。',
      '列出可核实的条目与缺失字段，保持字段原始单位。',
      '需要变化趋势时另取可比历史快照；本技能仅报告当前池。',
    ],
    instructions: `调用monitor_offer_list及monitor_shop_list读取指定分页；输出两种监控池各自total与代表条目。价格、销量、更新时间为null时原样展示；单次读取不计算变化。monthSalesVolume单位未核实时保留字段名与原值。`,
    demo: {
      title: '当前商品与店铺监控池第一页',
      date: '2026-11-10',
      kpis: ['商品池code 200、total 5', '店铺池code 200、total 10', '商品1026078393346近7天42笔58件，近30天86笔114件'],
      flow: [
        'monitor_offer_list({request:{page:1,pageSize:5}}) → code 200 / total 5',
        'monitor_shop_list({request:{page:1,pageSize:5}}) → code 200 / total 10',
      ],
      table: [
        {类型: '商品池首条', 标识: '734800252457', 价格: null, 日订单: null, 近7天: null, 近30天: null, 更新时间: null, 其他: '价格/销量/更新时间有缺失字段，不补0'},
        {类型: '商品池第三条', 标识: '1026078393346', 价格: '¥1', 日订单: '4笔/7件', 近7天: '42笔/58件', 近30天: '86笔/114件', 更新时间: null, 其他: '单次快照'},
        {类型: '店铺池首条', 标识: '辰雨皮鞋厂', 价格: null, 日订单: null, 近7天: null, 近30天: null, 更新时间: null, 其他: 'offerCount=33；monthSalesCount=819；monthSalesVolume=67457.39（单位未核）'},
      ],
      note: '首条缺失字段按已给证据记录，不推定其全部字段均为空；这两个total只代表各自监控池，不代表平台总量。',
      source: 'mcp__1688__monitor_offer_list、monitor_shop_list；2026-11-10 实调，分页见flow。',
    },
  },
  {
    id: 'skill-1688-profit-scenario',
    name: '1688报价利润情景测算',
    desc: '使用已核实的SKU参考价和明确的售价费用假设演算情景毛利。',
    scenario: '报价测算',
    triggers: ['按报价算毛利', '售价20元能赚多少', '用磁吸SKU参考价测算', '运费和费用加进去算利润'],
    tools: ['mcp__1688__ali_offer_sku_prices'],
    steps: [
      '确认offerId与目标skuId/规格；取得该SKU的参考价。',
      '收集用户售价、运费和其他费用假设，统一币种与单件口径。',
      '计算售价减采购参考价减运费减其他费用，再除以售价；标记全部假设和未计成本。',
    ],
    instructions: `先用ali_offer_sku_prices确认目标SKU及参考价；不得拿无磁吸SKU或500件阶梯底价替代。仅在用户给出售价/费用或明确要求假设演算时，按(售价－参考采购价－运费－其他费用)求情景毛利，除以售价得情景毛利率。标注采购尚非确定结算价，以及税、损耗等未计项目；不能称真实利润。`,
    demo: {
      title: '白色磁吸166*122 SKU 的人民币单件演算',
      date: '2026-11-10',
      kpis: ['已返回SKU 5251111954228参考¥4.6', '假设售价¥20、运费¥3、其他费用¥2', '情景毛利¥10.4；情景毛利率52%'],
      flow: [
        "ali_offer_sku_prices({req:{offerId:'734800252457'}}) → 白色磁吸166*122 skuId=5251111954228参考¥4.6",
        '情景假设：售价¥20－采购参考¥4.6－运费假设¥3－其他费用假设¥2＝¥10.4；¥10.4÷¥20＝52%',
      ],
      table: [
        {项目: '售价（情景假设）', 单件人民币: '¥20', 依据: '演算输入，不是平台售价'},
        {项目: '采购（SKU参考）', 单件人民币: '¥4.6', 依据: '白色磁吸166*122，非最终结算价'},
        {项目: '运费（情景假设）', 单件人民币: '¥3', 依据: '演算输入'},
        {项目: '其他费用（情景假设）', 单件人民币: '¥2', 依据: '演算输入'},
        {项目: '情景毛利 / 毛利率', 单件人民币: '¥10.4 / 52%', 依据: '仅按以上假设计算'},
      ],
      note: '采购价尚非确定结算价，税费、退货和其他未给出的费用未计；¥10.4和52%只作情景演算，不是真实利润。500件起¥4是商品阶梯信息，不能作为本SKU已成交采购价。',
      source: 'mcp__1688__ali_offer_sku_prices；2026-11-10 实调SKU参考价；售价、运费及其他费用为本情景指定假设。',
    },
  },
]

export const a1688ExpertSkillIds = a1688Skills.map((skill) => skill.id)
