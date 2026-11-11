---
name: skill-1688-conditional-search
description: 此技能用于按关键词、周期、价格和成交门槛查找 1688 普通或跨境商品，并逐条筛掉错类结果；当用户要求条件找品或优先跨境货源时使用。
agent_created: true
---

# 1688 条件找品（含跨境）

**验收状态：2026-11-11 已完成典型、边界、正常空结果三类触发；本技能不代表已验证额度错误或整体数据源故障。**

## 执行

1. 从需求提取**完整商品关键词**、必须具备的属性、普通/跨境范围、周期、价格和成交门槛。去掉「近90天上架」「销量大于1」等筛选描述，保留商品短语中用户明确说出的修饰词；例如用户说「跨境麻将包」，传 `keyWord:'跨境麻将包'`，不得擅自缩成「麻将包」或换成「麻将牌收纳包」。普通检索调用 `mcp__1688__product_search_list({req:{...}})`；明确要求跨境货源时调用 `mcp__1688__cross_border_product_search_list({req:{...}})`，同时保留原词 `keyWord:'跨境麻将包'`。若用户说「麻将包，优先跨境货源」，商品词是「麻将包」，通过跨境接口筛选，不擅自将商品词改写为「跨境麻将包」。若两路同时查，分别记录请求并按 `offerId` 去重，不以两个 `totalCount` 的差计算跨境比例。
2. 使用 `keyWord`、`searchType`、`cycle`、`pageIndex`、`pageSize` 等实际需要的字段。`cycle` 用字符串 `'7'` 或 `'30'`；日期字段 `beginOfferCreateTime`、`endOfferCreateTime` 用 `yyyy-MM-dd`；价格区间用 `beginPrice`、`endPrice`；周期订单**笔数**门槛用 `beginOrderCount`，周期销量**件数**门槛用 `beginSaleCount`，不要误用累计口径 `beginOrdersCount` / `beginSalesCount`。7天件数排序用 `sortField:'saleCount7d',sortType:'desc'`；30天件数排序按实测 `saleVolume30d`。只传符合目标的硬门槛。
3. 保存每路的日期、完整实际请求、`code`、原始 `totalCount` 和可见样本；逐条核对标题、`levelName` 类目、规格与用户用途，输出保留/排除/待核及理由。件数、订单笔数、预估销售额分别展示；跨境标签仅代表货源标签。列表 `price`、`quantityPrices` 阶梯及具体 SKU 报价分开写明，不将展示价当采购结算价。
4. 「销量大于1」若未指定周期，按**累计件数至少2件**传 `beginSalesCount:2`；明确近7/30天销量才传 `cycle:'7'/'30',beginSaleCount:2`。筛选字段 `beginSalesCount` 对应选品库累计 `saleCount`，列表 `saleQuantity` 是返回件数，未指定 `cycle` 时不要擅称累计或近30天件数，且接口未返回累计 `saleCount` 时注明只能凭筛选条件、无法逐条独立复核累计值。近90天上架按调用日计算起止日期，使用 `beginOfferCreateTime/endOfferCreateTime`，列表还要逐条核 `offerCreateTime`；区分上架日期与发现日期。可用 `sortField:'offerCreateTime',sortType:'desc'` 按上架时间看样本，明确已查页数。

## 三类触发的实测锚点（均为 2026-11-11，仅知日期）

- 典型：`product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'30',pageIndex:1,pageSize:3,sortField:'saleVolume30d',sortType:'desc'}})` → `code 200,totalCount 7250`。`734800252457` 153361件/49笔/¥613444，展示¥4、起批500；第三行厨房置物架为噪音。列表价不可当磁吸 SKU 结算价。
- 边界：`cross_border_product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'7',beginOfferCreateTime:'2026-10-01',endOfferCreateTime:'2026-11-11',beginPrice:4,endPrice:30,beginOrderCount:1,pageIndex:1,pageSize:3,sortField:'saleCount7d',sortType:'desc'}})` → `code 200,totalCount 4`。`1094593493154` 路由器盒30件/1笔、展示¥22而200—299件¥23；`1089752534193` 鞋盒5件/1笔；`1099157688469` 药盒4件/1笔、展示¥14对应≥10000件；对目标磁吸收纳盒逐一排除或待核。与典型请求窗口及门槛不同。
- 正常空：`product_search_list({req:{keyWord:'磁吸收纳盒不存在型号ZXQ999999',searchType:3}})`（只记录已知显式字段）→ `code 200,totalCount 0,list=[]`。解释为精确词在当前条件下无命中。

## 关键词原样映射示例（规则说明，未实测）

- 「查近90天上架、销量大于1的跨境麻将包」→ `cross_border_product_search_list({req:{keyWord:'跨境麻将包',searchType:4,beginOfferCreateTime:'2026-08-13',endOfferCreateTime:'2026-11-11',beginSalesCount:2,pageIndex:1,pageSize:20}})`；日期只是2026-11-11运行时的示例，实际运行须重算。这是调用构造示例，不写成已返回结果。
- 「查近90天上架、销量大于1的麻将包」→ `product_search_list`、`keyWord:'麻将包'`；历史实测属于此请求。先按用户原词查询，相关性核查用于剔除错类，不能在未经说明时把另一个商品短语冒充原查询。若确需补查近义词，逐次列出原词与新词、各自结果；不以改词后的结果冒充原词命中。

## 2026-11-11 麻将包相关性回归（本轮真实请求）

- 主查询 `product_search_list({req:{keyWord:'麻将包',searchType:4,beginOfferCreateTime:'2026-08-13',endOfferCreateTime:'2026-11-11',beginSalesCount:2,pageIndex:1,pageSize:20,sortField:'offerCreateTime',sortType:'desc'}})` → `code 200,totalCount 496,totalPages 25`；只看了第1页20条，**496是未筛相关性的原始命中数**。搜索结果混入腋下包/斜挎女包（如 `1096407399245`），标题里出现「麻将包」仍不算麻将牌收纳包；泡泡纱包 `1098102025204` 主图摆化妆品，虽标题带麻将包，按整套麻将牌收纳目标剔除。
- 相关性分层：明确麻将牌袋/牌架袋/桌布筒，且主图和详情能佐证的套装可列「匹配」。`1098084573136` 四件套的主图有长袋、详情写适用于美式麻将牌及牌架；`1097674918061` 三件套主图有长筒，详情写麻将牌袋与桌布筒。`1096686343648` 主图仅小袋与骰子，详情写迷你麻将骰子袋，**不等于整套麻将牌包**；`1093579866480` / `1090727655921` 主图只有印 MAHJ 的拉链袋，容量和牌架适配未核，列「待核」，不能把营销标题当实物功能。若用户只要麻将主题小包，可另列，但不得混入牌具收纳清单。
- 补查 `keyWord:'美式麻将牌收纳包',searchType:3` 在同一日期和累计件数条件下 `code 200,totalCount 0,list=[]`，属精确条件空；`keyWord:'麻将牌包',searchType:4` 同条件 `code 200,totalCount 2`，两条主图只有 MAHJ 拉链袋，均待核。另两次补查关键词「麻将牌收纳包」「美式麻将包」出现 504，记为接口超时，不归零也不冒充相关候选。本轮调用7次（含3次商品详情），符合单轮10次上限。
- 品类可能落在「化妆包」，不能仅凭 `levelName` 排除；反过来标题或类目也不能单独确认匹配。先看标题+类目+主图，歧义再按 `offerId` 查详情属性；缺少可容纳牌具的规格时保留「待核」。本轮主图/详情只能佐证用途，尺寸、实际容量、套装 SKU 与结算价格仍需商家和样品复核。

## 分类与降级

- `code 200` 且 `totalCount=0,list=[]`：记为**正常条件空**，核对精确词和硬门槛；扩大范围须先获用户同意，另记新条件。非空但错类记为**结果不相关**，不冒充候选；原始总量不算有效货源数。
- 非200、超时或错误体：记为**接口失败**，保留状态/错误和请求；无可靠候选则停止该路，复用注明日期的旧结果时标明历史口径。结构异常、关键字段缺失时记**待查数据源异常**，不凭不同时点差异断言整体故障。
- 已达到单轮接口10次上限或收到明确额度错误：停止新增调用，分别记录**本轮调用额度约束**与**接口返回额度错误**，不把 `code 200` 空列表归为额度问题。本轮未实测接口额度错误或整体数据源故障。
