---
name: skill-1688-conditional-search
description: 此技能用于按关键词、周期、价格和成交门槛查找 1688 普通或跨境商品，并逐条筛掉错类结果；当用户要求条件找品或优先跨境货源时使用。
agent_created: true
---

# 1688 条件找品（含跨境）

**验收状态：2026-11-11 已完成典型、边界、正常空结果三类触发；本技能不代表已验证额度错误或整体数据源故障。**

## 执行

1. 从需求提取关键词、必须具备的属性、普通/跨境范围、周期、价格和成交门槛。普通检索调用 `mcp__1688__product_search_list({req:{...}})`；明确要跨境时调用 `mcp__1688__cross_border_product_search_list({req:{...}})`。若两路同时查，分别记录请求并按 `offerId` 去重，不以两个 `totalCount` 的差计算跨境比例。
2. 使用 `keyWord`、`searchType`、`cycle`、`pageIndex`、`pageSize` 等实际需要的字段。`cycle` 用字符串 `'7'` 或 `'30'`；日期字段 `beginOfferCreateTime`、`endOfferCreateTime` 用 `yyyy-MM-dd`；价格区间用 `beginPrice`、`endPrice`；周期订单**笔数**门槛用 `beginOrderCount`，周期销量**件数**门槛用 `beginSaleCount`，不要误用累计口径 `beginOrdersCount` / `beginSalesCount`。7天件数排序用 `sortField:'saleCount7d',sortType:'desc'`；30天件数排序按实测 `saleVolume30d`。只传符合目标的硬门槛。
3. 保存每路的日期、完整实际请求、`code`、原始 `totalCount` 和可见样本；逐条核对标题、`levelName` 类目、规格与用户用途，输出保留/排除/待核及理由。件数、订单笔数、预估销售额分别展示；跨境标签仅代表货源标签。列表 `price`、`quantityPrices` 阶梯及具体 SKU 报价分开写明，不将展示价当采购结算价。

## 三类触发的实测锚点（均为 2026-11-11，仅知日期）

- 典型：`product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'30',pageIndex:1,pageSize:3,sortField:'saleVolume30d',sortType:'desc'}})` → `code 200,totalCount 7250`。`734800252457` 153361件/49笔/¥613444，展示¥4、起批500；第三行厨房置物架为噪音。列表价不可当磁吸 SKU 结算价。
- 边界：`cross_border_product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'7',beginOfferCreateTime:'2026-10-01',endOfferCreateTime:'2026-11-11',beginPrice:4,endPrice:30,beginOrderCount:1,pageIndex:1,pageSize:3,sortField:'saleCount7d',sortType:'desc'}})` → `code 200,totalCount 4`。`1094593493154` 路由器盒30件/1笔、展示¥22而200—299件¥23；`1089752534193` 鞋盒5件/1笔；`1099157688469` 药盒4件/1笔、展示¥14对应≥10000件；对目标磁吸收纳盒逐一排除或待核。与典型请求窗口及门槛不同。
- 正常空：`product_search_list({req:{keyWord:'磁吸收纳盒不存在型号ZXQ999999',searchType:3}})`（只记录已知显式字段）→ `code 200,totalCount 0,list=[]`。解释为精确词在当前条件下无命中。

## 分类与降级

- `code 200` 且 `totalCount=0,list=[]`：记为**正常条件空**，核对精确词和硬门槛；扩大范围须先获用户同意，另记新条件。非空但错类记为**结果不相关**，不冒充候选；原始总量不算有效货源数。
- 非200、超时或错误体：记为**接口失败**，保留状态/错误和请求；无可靠候选则停止该路，复用注明日期的旧结果时标明历史口径。结构异常、关键字段缺失时记**待查数据源异常**，不凭不同时点差异断言整体故障。
- 已达到单轮接口10次上限或收到明确额度错误：停止新增调用，分别记录**本轮调用额度约束**与**接口返回额度错误**，不把 `code 200` 空列表归为额度问题。本轮未实测接口额度错误或整体数据源故障。
