# Sorftime 亚马逊选品工作流

仅使用 `sorftime-amazon` 数据。单一专家 `exp-amazon-sel-v2` 路由至 `amazon-expert-skill-map.ts` 的七个技能；入口按用户意图选主技能，选品报告按类目→候选→竞品→利润串联。每条路由的 `instructions` 即对话调用提示词，本文提供可执行参数和异常分诊。2026-11-11 单轮已实测选品搜索、竞品、关键词三路各三触发，类目仅验证节点检索；其余待下一轮验证。

## 共用纪律

- 只引用本次返回字段和采集日期；历史 demo 是历史快照。抽样≠全量，缺失≠0，无完整趋势序列不下涨跌结论。
- `-1`、`1970-01-01` 和空字符串视字段语义标缺失；`0` 也需甄别业务真零与采集未覆盖。对 `product_detail` 先核对请求/返回 ASIN、标题、品牌；矛盾时拒绝分析该条。
- 页数从 `page=1` 起，每页 20 条；未取完全部页时展示“已检索 N 页的样本”。仅按返回 `parent_asin` 去重，不能把多条子体销量相加宣称父体销量。需要父体总量时必须确认完整子体与销量口径；展开子体会额外消耗积分，应先询问。
- 表格：主图悬停 320×320 白底大图；标题链接为对应站点 `/dp/{asin}`。商品搜索返回 `buybox_seller` 名称但无 `seller_id`；店铺跳转仅在 `product_detail.seller_id` 实得时建立 `/sp?seller={seller_id}`，否则纯文本。`seller_country` 仅详情有，不能从名称推定跨境。
- 空结果 SOP：先查工具 schema 参数名、站点和日期格式；核对当前硬门槛与基准词/示例的可用性；仍空则 `common_usage_query` 查剩余额度；整体异常可用已知节点的 `category_report` 做数据源对照。四类结论分别记录“参数错已修正 / 当前接口无数据 / 额度限制 / 数据源异常”；不得放松用户时间、售价、月销、站点等硬条件去凑数量。未发生额度/整体故障时不虚称已排除。

## 路由与参数

| 路由 | 典型触发 | 关键接口和参数 | 异常处理 |
|---|---|---|---|
| `skill-amazon-selection-search` | 找品、近60天上架、价格/销量下限 | `product_search(amz_site="US", keyword="mahjong bag", attribute_name="mahjong", online_date_range_min="2026-09-12", online_date_range_max="2026-11-11", price_range_min=10, price_range_max=40, month_sale_volume_range_min=50, page=1)`；类目词先 `category_name_search(category_name=...,amz_site="US")` 找精确 `node_id` | `keyword` 是 ABA 词宽召回；`attribute_name` 匹配标题或属性，仍须逐条核对标题/类目，过滤非麻将包配件；窄条件空不得推市场总量为0 |
| `skill-amazon-competitor` | 分析 ASIN、竞品对比 | 单品 `product_detail(asin="B0BZYBSRNF",amz_site="US")`；`product_search(asin=...)` **仅相似商品**；需要流量才 `product_traffic_terms` | ASIN 身份矛盾停止；`platform_fee=0/-1` 不作为实付佣金，毛利待核，不能默认15%重算 |
| `skill-amazon-keyword` | 种子词扩词、关键词竞争 | 有种子词 `keyword_extends(keyword="water bottle",keyword_support_site="US",page=1)`；单词 `keyword_detail(keyword="mahjong bag",keyword_support_site="US")`；无种子词才 `keyword_list` | 推荐 CPC 空串标缺失；只用标注的90d转化字段；点击量0但转化率非零不自行重算；未知词空不编造 |
| `skill-amazon-category-trend` | 类目体检、趋势 | `category_name_search(category_name="Sports Water Bottles",amz_site="US")` 得 `3395091`，再传 `node_id="3395091"` 给 `category_report/category_trend/category_keywords`；`category_report` 历史窗使用 `query_start/query_date` 且有效跨度 3–40 天 | 名称检索给多个节点，逐项核对；`category_trend` 当前月未完月剔除；后续链路本轮待验 |
| `skill-amazon-product-parse` | 解析商品、评论洞察 | `product_detail` → 按需 `product_reviews` / `product_customers_say` / `product_variations` | 新品无评论标无评论；本轮待验 |
| `skill-amazon-profit-calc` | 毛利、费用 | `product_detail` 返回 `fba_fee/platform_fee/profit/profit_rate`，按需用户自填采购与运价 | 佣金0/-1 不下实际利润结论；本轮该独立路由待验 |
| `skill-amazon-report-gen` | 出选品报告 | 复用已取的类目→选品→竞品→利润结果 | 缺任一路数据时报告标缺口，不补值；本轮待验 |

## 已实测返回与边界（2026-11-11）

- 宽搜 `keyword="mahjong bag"`：`page_count=89`，首页含化妆包、搬家袋、牌架等无关条目；不能直接称为麻将包商品数。
- 近60天 + $10–40 + 月销≥50：返回 `page_count=1`，包含麻将包，也夹麻将套装、垫、牌架；代表候选 `B0HC3WMVZ2` 售价 $21.99、估计月销 436。极窄条件（仅当日上架、$300 起、月销≥50000）返回 `No data available`。
- Owala `B0BZYBSRNF` 本次返回 $34.99、FBA $5.93、佣金 $6、估计毛利 $23.06 / 65.90%，与历史 demo 数值不同；STANLEY `B0D2ZBCYLL` $45、佣金0、接口毛利率85.27% 不可直接信任。请求测试 ASIN `B000000000` 返回自相矛盾的零食品名及纺织品品牌，须身份校验。
- `keyword_extends("water bottle")` 返回 20 词；`waterbottle` 的推荐 CPC 为 `""`。`keyword_detail("mahjong bag")` 月搜索 88,710、90天转化 2.98%、CPC $0.66，但 `click_90d=0`，两字段不能直接推算。未知词返回 `No data available`。
- `category_name_search("Sports Water Bottles")` 返回 5 个候选（含 Water Bottles、Thermoses），准确节点是 `3395091`，后续大盘接口尚未在本轮复验。
