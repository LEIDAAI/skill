# Sorftime 亚马逊技能触发实调验收（2026-11-11，第一轮）

本轮仅实调 Sorftime，累计 10 次业务调用后按要求停止。以下均为实际传参与当次返回；未覆盖的技能不计通过。金额 USD，销量为接口估计。完整执行规则见 `sorftime-amazon/SKILL.md` 与 `amazon-expert-skill-map.ts`。

| # | 技能/触发 | 实际参数（省略未传字段） | 返回要点 | 暴露问题与修正 |
|---|---|---|---|---|
| 1 | 选品搜索/普通正向：搜 mahjong bag | `product_search({amz_site:"US",keyword:"mahjong bag",page:1})` | `page_count=89`，第1页20条，混入化妆包、搬家袋、牌架 | `keyword` 为 ABA 词宽召回，不能把结果当精准麻将包 |
| 2 | 选品搜索/边界：近60天、$10–40、月销≥50 | `product_search({amz_site:"US",keyword:"mahjong bag",attribute_name:"mahjong",online_date_range_min:"2026-09-12",online_date_range_max:"2026-11-11",price_range_min:10,price_range_max:40,month_sale_volume_range_min:50,page:1})` | 1页；麻将包 `B0HC3WMVZ2` 售价$21.99、估计月销436；也含麻将牌架/套装 | 时间格式 `yyyy-MM-dd`，销量参数是 `month_sale_volume_range_min`；逐条标题相关性校验 |
| 3 | 选品搜索/异常：当日上架且高价高销 | `product_search({amz_site:"US",attribute_name:"mahjong bag",online_date_range_min:"2026-11-11",online_date_range_max:"2026-11-11",price_range_min:300,month_sale_volume_range_min:50000,page:1})` | `No data available` | 属极窄组合无数据；未放宽硬门槛，不能推整个市场为0 |
| 4 | 竞品/正向：Owala 单 ASIN | `product_detail({amz_site:"US",asin:"B0BZYBSRNF"})` | 返回同 ASIN；售价$34.99、月销327,048、FBA$5.93、佣金$6、估计毛利$23.06 / 65.90% | 历史 demo 的利润数字已变化，报告用本次快照 |
| 5 | 竞品/边界：STANLEY 佣金为0 | `product_detail({amz_site:"US",asin:"B0D2ZBCYLL"})` | 售价$45、FBA$6.63、佣金0、接口毛利率85.27% | 佣金口径待核实；不得默认15%重算，也不得直接宣称85.27%为真实毛利率 |
| 6 | 竞品/异常：身份矛盾样本 | `product_detail({amz_site:"US",asin:"B000000000"})` | 返回同 ASIN 但零食商品名、纺织品牌、售价0、月销-1 | 仅 ASIN 一致仍不足以确证身份；商品名/品牌/类目互相矛盾则停止分析 |
| 7 | 关键词/正向：water bottle 长尾 | `keyword_extends({keyword:"water bottle",keyword_support_site:"US",page:1})` | 20词；主词月搜1,537,190，`waterbottle` 推荐CPC为空串 | 空字符串不补0；扩词结果不是转化趋势 |
| 8 | 关键词/边界：mahjong bag 单词 | `keyword_detail({keyword:"mahjong bag",keyword_support_site:"US"})` | 月搜88,710，90d转化率2.98%，CPC$0.66，`click_90d=0` | 90d点击量与转化字段不相容，不自行反算或断言购买率；对源数据冲突披露 |
| 9 | 关键词/异常：不存在的词 | `keyword_detail({keyword:"zzzxq impossible invented phrase",keyword_support_site:"US"})` | `No data available` | 先核查词/站点与已知可用词，未知词无数据如实说明 |
| 10 | 类目体检/入口：类目词定位 | `category_name_search({amz_site:"US",category_name:"Sports Water Bottles"})` | 返回5节点，目标 Sports Water Bottles=`3395091` | 多候选不能取第一条；后续 `category_report/category_trend` 本轮未调，不算全链路通过 |

## 本轮完成度

| 技能 | 正向 | 边界 | 异常 | 状态 |
|---|---|---|---|---|
| 选品搜索 | 已实调 | 已实调 | 已实调 | 三触发已覆盖，跨境国别链路待验 |
| 竞品分析 | 已实调 | 已实调 | 已实调 | 三触发已覆盖，流量与评论支线待验 |
| 关键词挖掘 | 已实调 | 已实调 | 已实调 | 三触发已覆盖，榜单/趋势支线待验 |
| 类目体检 | 节点入口已实调 | 待验 | 待验 | 未完成 |
| 商品解析与评论洞察 | 待验 | 待验 | 待验 | 未开始 |
| 利润测算 | 复用竞品商品详情，只验证接口字段 | 待验 | 待验 | 未完成 |
| 选品报告 | 待验 | 待验 | 待验 | 未开始 |

`common_usage_query` 和 `category_report` 是空结果进一步分诊步骤；本轮普通空结果未呈额度异常或全库故障证据，不能声称已完成这两项排障。下一轮从类目体检剩余触发继续，每轮仍最多10次业务调用。
