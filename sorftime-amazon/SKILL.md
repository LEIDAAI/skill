# Sorftime 亚马逊选品工作流

仅使用 `sorftime-amazon` 数据。单一专家 `exp-amazon-sel-v2` 路由至 `amazon-expert-skill-map.ts` 的七个技能；入口按用户意图选主技能，选品报告按类目→候选→竞品→利润串联。每条路由的 `instructions` 即对话调用提示词，本文提供可执行参数和异常分诊。2026-11-11 两轮已覆盖七技能的正向、边界、异常触发；详见验收矩阵。

## 共用纪律

- 只引用本次返回字段和采集日期；历史 demo 是历史快照。抽样≠全量，缺失≠0，无完整趋势序列不下涨跌结论。
- `-1`、`1970-01-01` 和空字符串视字段语义标缺失；`0` 也需甄别业务真零与采集未覆盖。对 `product_detail` 先核对请求/返回 ASIN、标题、品牌；矛盾时拒绝分析该条。
- 页数从 `page=1` 起，每页 20 条；未取完全部页时展示“已检索 N 页的样本”。多检索入口按 ASIN 合并再做相关性筛选，剔除原因要可复核；仅按返回 `parent_asin` 去重，不能把多条子体销量相加宣称父体销量。需要父体总量时必须确认完整子体与销量口径；展开子体会额外消耗积分，应先询问。
- 表格：主图悬停 320×320 白底大图；标题链接为对应站点 `/dp/{asin}`。商品搜索返回 `buybox_seller` 名称但无 `seller_id`；店铺跳转仅在 `product_detail.seller_id` 实得时建立 `/sp?seller={seller_id}`，否则纯文本。`seller_country` 仅详情有，不能从名称推定跨境。
- 空结果 SOP：先查工具 schema 参数名、站点和日期格式；核对当前硬门槛与基准词/示例的可用性；仍空则 `common_usage_query` 查剩余额度；整体异常可用已知节点的 `category_report` 做数据源对照。四类结论分别记录“参数错已修正 / 当前接口无数据 / 额度限制 / 数据源异常”；不得放松用户时间、售价、月销、站点等硬条件去凑数量。未发生额度/整体故障时不虚称已排除。

## 路由与参数

| 路由 | 典型触发 | 关键接口和参数 | 异常处理 |
|---|---|---|---|
| `skill-amazon-selection-search` | 找品、近 N 天上架、价格/销量下限 | 先按运行日计算起止日（格式 `yyyy-MM-dd`），如 2026-11-11 的近90天为 `2026-08-13` 至 `2026-11-11`；销量严格大于1传 `month_sale_volume_range_min=2`。`product_search(amz_site="US",keyword="mahjong bag",attribute_name="mahjong",online_date_range_min="2026-08-13",online_date_range_max="2026-11-11",month_sale_volume_range_min=2,page=1)` 宽召回；可并行试 `attribute_name="mahjong bag"` 补精准包候选，按 ASIN 去重 | 两路互补：精准短语仍混套装/挂件，也漏宽搜真正的包；逐条按主商品判断，麻将牌/牌架/垫子/垫筒/卡片/挂件及附送收纳袋的整套均剔除。包主商品但侧重时尚手袋且容量不明的列待核。上架窗口是 `online_date` 预筛；严格“亚马逊上架日”须对入表 ASIN 调 `product_detail` 核 `listing_date`，与 `online_date` 不同则以明确声明的口径复核，不把超窗记录入表；详情销量可能变化，以本次详情快照为准 |
| `skill-amazon-competitor` | 分析 ASIN、竞品对比 | 单品 `product_detail(asin="B0BZYBSRNF",amz_site="US")`；`product_search(asin=...)` **仅相似商品**；需要流量才 `product_traffic_terms` | ASIN 身份矛盾停止；`platform_fee=0/-1` 不作为实付佣金，毛利待核，不能默认15%重算 |
| `skill-amazon-keyword` | 种子词扩词、关键词竞争 | 有种子词 `keyword_extends(keyword="water bottle",keyword_support_site="US",page=1)`；单词 `keyword_detail(keyword="mahjong bag",keyword_support_site="US")`；无种子词才 `keyword_list` | 推荐 CPC 空串标缺失；只用标注的90d转化字段；点击量0但转化率非零不自行重算；未知词空不编造 |
| `skill-amazon-category-trend` | 类目体检、趋势 | `category_name_search(category_name="Sports Water Bottles",amz_site="US")` 得 `3395091`；`category_report(node_id="3395091",amz_site="US")`、`category_trend(node_id="3395091",trend_index="SalesCount",amz_site="US")`、`category_keywords(node_id="3395091",page=1,amz_site="US")` | 历史窗跨度3–40天且需有数据；TopN份额非单调禁用；转化率0口径待核；当前未完月剔除，关键词语义过滤 |
| `skill-amazon-product-parse` | 解析商品、评论洞察 | `product_detail(asin=...,amz_site="US")` → 按需 `product_reviews(asin=...,review_type="Negative",amz_site="US")` / `product_customers_say(asin=...,site="US")` / `product_variations(asin=...,page=1,amz_site="US")` | 评论跨变体，变体实返大写键；无评论标未取到；`similar_product_feature` 混类要弃用 |
| `skill-amazon-profit-calc` | 毛利、费用 | `product_detail` 返回 `fba_fee/platform_fee/profit/profit_rate`；采购价与运价需用户提供 | 接口毛利未扣采购/头程/广告；佣金0/-1、售价0与销量冲突时不下实际利润结论 |
| `skill-amazon-report-gen` | 出选品报告 | 复用已取类目→候选→竞品→利润结果，每段标参数/页数/日期 | 类目不匹配则报告该维缺失；零候选不产伪档位，TopN冲突不打总分 |

## 已实测返回与边界（2026-11-11）

- 宽搜 `keyword="mahjong bag"`：`page_count=89`（未加时间与销量条件的历史查询），首页含化妆包、搬家袋、牌架等无关条目；不能直接称为麻将包商品数。2026-11-11 近90天 + 月销≥2 的复核：宽召回 `keyword="mahjong bag",attribute_name="mahjong"` 共8页，已读首页2页；精准入口 `attribute_name="mahjong bag"` 共2页28条，已读完，仍混整套及挂件，且漏掉宽搜的真实包。详情证实 B0H337RR4S 的 `online_date=2026-08-15` 而 `listing_date=2026-08-06`、B0H82QYQ2G 的两日期为 2026-08-22/2026-07-20，均不能作为亚马逊上架近90天的已核候选。详情销量与搜索快照可能不同，逐款标注取值来源。
- 近60天 + $10–40 + 月销≥50：返回 `page_count=1`，包含麻将包，也夹麻将套装、垫、牌架；代表候选 `B0HC3WMVZ2` 售价 $21.99、估计月销 436。极窄条件（仅当日上架、$300 起、月销≥50000）返回 `No data available`。
- Owala `B0BZYBSRNF` 本次返回 $34.99、FBA $5.93、佣金 $6、估计毛利 $23.06 / 65.90%，与历史 demo 数值不同；STANLEY `B0D2ZBCYLL` $45、佣金0、接口毛利率85.27% 不可直接信任。请求测试 ASIN `B000000000` 返回自相矛盾的零食品名及纺织品品牌，须身份校验。
- `keyword_extends("water bottle")` 返回 20 词；`waterbottle` 的推荐 CPC 为 `""`。`keyword_detail("mahjong bag")` 月搜索 88,710、90天转化 2.98%、CPC $0.66，但 `click_90d=0`，两字段不能直接推算。未知词返回 `No data available`。
- `category_name_search("Sports Water Bottles")` 返回 5 个候选，准确节点 `3395091`。本轮报告 Top100 月销 1,401,725 件/$42,426,849.79，Top3 商品份额 61.24%，自营 73.21%；但 top_n 商品 Top5 份额 48.11% 小于 Top3，禁用该分组。2026-11 趋势 240,687 是未完月；2026-10 完整月 1,001,757。报告 `query_start=2026-11-01,query_date=2026-11-10` 返回空，2026-10-01~31 有数据；不存在节点空且余额 27,818，不能把前者断言为额度耗尽。
- `product_reviews` 近一年最多 100 条且覆盖不同颜色/尺寸；Owala `B0BZYBSRNF` 话题 durability 负面 2,611（摘要计数）并有盖子/吸管原文。新品 `B0HPB52XGN` 评论数 0，两个评论接口都无数据，同时售价 0、月销 2,586、年销 -9999，利润不可推。`product_variations` 实返 `Asin/Property/SalesAmount/ItemIndex/ItemTotal`，页面近期销量与详情估算月销量不能相加或互换。`similar_product_feature("water bottle")` 混入电解质与瓶装水特征，语义过滤失败则弃用。
- HydroJug `B0DGHBV6XS` 详情 $27.99，FBA $6.17，佣金 $4.20，接口估算利润 $17.62/62.95%；采购/头程/广告/退货未计，不能说真实可赚。报告链路 `product_search(node_id="3395091",price_range_min=15,price_range_max=40,month_sale_volume_range_min=1000,page=1)` 返回 7 页，首页 20 条含摇摇杯错类。`mahjong bag` 类目词未返回精确包类目，不能借 Tile Games 总盘代替；极窄候选空不生成机会档位。
