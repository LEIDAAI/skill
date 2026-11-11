---
name: skill-1688-new-products
description: 此技能用于按关键词、新品标签、周期及上架时间筛选 1688 新品，核对商品用途、类目与报价；当用户要求找新上架货源或看新品时使用。
agent_created: true
---

# 1688 新品发现

**验收状态：2026-11-11 已完成典型、边界、正常空结果三类触发；未验证额度报错或整体数据源故障。**

## 执行

1. 明确目标品类、用途、周期与上架区间，调用 `mcp__1688__product_trend_new_list({request:{keyWord:'桌面收纳盒',searchType:4,titleTags:['289794'],cycle:'30',pageIndex:1,pageSize:3}})`。这里嵌套键是 `request`，`titleTags` 是数组，本次实测使用新品标签 `'289794'`，不等同于所有新品标签。
2. 边界条件使用 `cycle:'7'` 或 `'30'`、`beginOfferCreateTime` / `endOfferCreateTime`（`yyyy-MM-dd`）、`beginPrice` / `endPrice` 和周期订单笔数 `beginOrderCount`；件数门槛 `beginSaleCount` 不等于订单笔数，也不等于累计字段 `beginOrdersCount` / `beginSalesCount`。只传确有需要的硬门槛；精确型号可用 `searchType:3`。
3. 记录调用日期、实际 `request`、返回码、原始总量及样本。按标题、`levelName` 类目、规格和目标用途给保留/排除/待核判断；上架日期只按真实返回记录，没有返回则不补。单条件数不代表订单数；展示价与分数量阶梯价单列，未核采购量不写成结算价；不能从单页推出总体新品增长趋势。

## 2026-11-11 实测锚点

- 典型：`product_trend_new_list({request:{keyWord:'桌面收纳盒',searchType:4,titleTags:['289794'],cycle:'30',pageIndex:1,pageSize:3}})` → `code 200,total 10000`。`1085476982882` 化妆品盒561件/243笔/展示¥86.9（用途待核）；`1095398688885` 笔筒错类；`1088760013417` 折叠盒4900件/3笔（用途待核）。
- 边界：`product_trend_new_list({request:{keyWord:'桌面收纳盒',searchType:4,titleTags:['289794'],cycle:'7',beginOfferCreateTime:'2026-11-04',endOfferCreateTime:'2026-11-11',beginPrice:3,endPrice:30,beginOrderCount:1,pageIndex:1,pageSize:3}})` → `code 200,total 326`。`1098691501379` 纸巾盒错类；`1095996431491` 化妆品盒1186件/3笔、展示¥4.5（用途待核）；`1098194653641` PP盒407件/3笔、展示¥5.5，但1—49件阶梯¥6.9。不同周期样本不直接推断趋势。
- 正常空：`product_trend_new_list({request:{keyWord:'不存在的桌面收纳盒型号ZXQ999999',searchType:3,titleTags:['289794']}})`（仅已知显式参数）→ `code 200,total 0,list=[]`；只说明当前精确词与标签下没有结果。

## 多条件组合补测（2026-11-11）

- “找11月4—11日上架、7天至少1笔、¥10—80的跨境麻将包新品，按上架倒序”→ `product_trend_new_list({request:{keyWord:'跨境麻将包',searchType:4,titleTags:['289794'],cycle:'7',beginOfferCreateTime:'2026-11-04',endOfferCreateTime:'2026-11-11',beginPrice:10,endPrice:80,beginOrderCount:1,pageIndex:1,pageSize:5,sortField:'offerCreateTime',sortType:'desc'}})` → `code 200,total 15`。第一页5条中，`1097674918061` 三件套可结合旧主图详情保留为牌具收纳候选；`1097588418053` 是女士单肩包需排除；`1096744379448`/`1098719433945`/`1097177574983` 牌具容量待核。前述三件套返回 `totalSalesCount:2`、近7天2件/1笔，与搜索接口未返回累计件数字段的局限不同，应逐字段区分。`trend` 在商品上架前仍有归一化非零值，不能按那些点解释为真实销量；此轮未查所有新品标签。

## 分类与降级

- `code 200,total 0,list=[]`：记**正常条件空**，检查精确词、标签、时间窗口和价格/笔数门槛；需要扩大条件时先获用户同意，保留原查询。非空而错类是**过滤问题**，不把 `total` 算作有效新品数。
- 非200、超时或错误体：记**接口失败**并保留请求、日期、状态/错误；不得伪造空列表或上架日期。字段缺失/结构异常记**数据源待核**；不同统计周期数值变化不足以证明整体故障。
- 本轮业务调用已满10次，停止追加请求；若接口明确返回额度错误，单独记**额度报错**，不把成功空结果误判为额度问题。额度报错及整体数据源故障本轮均未实测。
