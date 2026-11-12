# youweiAI-amazon 选品工作流

仅使用现有亚马逊 MCP 数据与工具调用机制。单一专家 `exp-amazon-sel-v2`（youweiAI-amazon选品专家）路由至 `amazon-expert-skill-map.ts` 的八个技能；入口按用户意图选主技能，选品报告按类目→候选→竞品→利润串联，按需复用关键词、商品内容与卖家店铺结果。每条路由的 `instructions` 即对话调用提示词，本文提供可执行参数和异常分诊。2026-11-11 两轮实测仅覆盖原七技能的正向、边界、异常触发；新增接口及卖家店铺分析尚无本文件实测记录，不把接口文档当作实测。

## 共用纪律

- 只引用本次返回字段和采集日期；历史 demo 是历史快照。抽样≠全量，缺失≠0，无完整趋势序列不下涨跌结论。
- `-1`、`1970-01-01` 和空字符串视字段语义标缺失；`0` 也需甄别业务真零与采集未覆盖。对 `product_detail` 先核对请求/返回 ASIN、标题、品牌；矛盾时拒绝分析该条。
- 页数从 `page=1` 起，每页 20 条；未取完全部页时展示“已检索 N 页的样本”。多检索入口按 ASIN 合并再做相关性筛选，剔除原因要可复核；仅按返回 `parent_asin` 去重，不能把多条子体销量相加宣称父体销量。需要父体总量时必须确认完整子体与销量口径；展开子体会额外消耗积分，应先询问。
- 表格：主图悬停 320×320 白底大图；标题链接为对应站点 `/dp/{asin}`。商品搜索返回 `buybox_seller` 名称但无 `seller_id`；店铺跳转仅在 `product_detail.seller_id` 实得时建立 `/sp?seller={seller_id}`，否则纯文本。`seller_country` 仅详情有，不能从名称推定跨境。
- 空结果 SOP：先查工具 schema 参数名、站点和日期格式；核对当前硬门槛与基准词/示例的可用性。可临时移除部分条件诊断是哪组筛选导致空值，但诊断样本不得回填用户原条件结果；仍空则 `common_usage_query` 查剩余额度；整体异常可用已知节点的 `category_report` 做数据源对照。四类结论分别记录“参数错已修正 / 当前接口无数据 / 额度限制 / 数据源异常”；不得放松用户时间、售价、月销、站点等硬条件去凑数量。未发生额度/整体故障时不虚称已排除。
- 多条件交集须逐条复核可见字段；`shipping_type=FBA` 等列表不返回的字段要详情 `is_fba` 证实，跨境用 `seller_country` 证实。`review_count` 不是差评文本；详情 `listing_date` 与 `days_on_shelf` 或列表 `online_date` 相互冲突时优先披露冲突、剔除严格上架窗。`monthly_sales_amount` 与当前价格×月销不符时标不同口径/待核，不推成交单价或重算月销售额。
- 卖家筛选 `seller_search` 的 `average_price_min/max`、`listing_monthly_sale_amount_min/max` **入参**使用站点货币最小单位（美站美分：$20 传 2000），返回字段的展示单位需按字段单独核对；美站类目/商品实测金额为美元本体，不能据此推断卖家筛选入参也是美元。`seller_search` 站点仅 US/GB/DE/FR/CA/JP/ES/IT/MX；卖家接口使用 `amz_seller_site`，其他商品/类目接口使用各自的 `amz_site` 或 `keyword_support_site`。

## 路由与参数

| 路由 | 典型触发 | 关键接口和参数 | 异常处理 |
|---|---|---|---|
| `skill-amazon-selection-search` | 找品、近 N 天上架、价格/销量下限 | 先按运行日计算起止日（格式 `yyyy-MM-dd`），如 2026-11-11 的近90天为 `2026-08-13` 至 `2026-11-11`；销量严格大于1传 `month_sale_volume_range_min=2`。`product_search(amz_site="US",keyword="mahjong bag",attribute_name="mahjong",online_date_range_min="2026-08-13",online_date_range_max="2026-11-11",month_sale_volume_range_min=2,page=1)` 宽召回；可并行试 `attribute_name="mahjong bag"` 补精准包候选，按 ASIN 去重 | 两路互补：精准短语仍混套装/挂件，也漏宽搜真正的包；逐条按主商品判断，麻将牌/牌架/垫子/垫筒/卡片/挂件及附送收纳袋的整套均剔除。包主商品但侧重时尚手袋且容量不明的列待核。上架窗口是 `online_date` 预筛；严格“亚马逊上架日”须对入表 ASIN 调 `product_detail` 核 `listing_date`，与 `online_date` 不同则以明确声明的口径复核，不把超窗记录入表；详情销量可能变化，以本次详情快照为准 |
| `skill-amazon-competitor` | 分析 ASIN、竞品对比、历史走势 | 单品 `product_detail(asin="B0BZYBSRNF",amz_site="US")`；需要历史变化时 `product_trend(asin=...,type="SalesVolume",amz_site="US")`（按需求选维度），需要单品综合信息才 `product_report(asin=...,amz_site="US")`；`product_search(asin=...)` **仅相似商品**；需要流量才 `product_traffic_terms` | ASIN 身份矛盾停止；未完月不与完整月同比，报告与详情冲突标待核；`platform_fee=0/-1` 不作为实付佣金，毛利待核，不能默认15%重算 |
| `skill-amazon-keyword` | 种子词扩词、关键词竞争、ASIN 反查 | 有种子词 `keyword_extends(keyword="water bottle",keyword_support_site="US",page=1)`；单词 `keyword_detail(keyword="mahjong bag",keyword_support_site="US")`；看自然/广告搜索结果 `keyword_search_results(keyword=...,keyword_support_site="US",page=1,position_type=1/2)`；给定 ASIN 反查核心词的自然曝光位置 `competitor_product_keywords(asin=...,keyword_support_site="US",page=1)`；无种子词且无 ASIN 才 `keyword_list` | 搜索结果每页20条，标页数；自然曝光不代表广告；推荐 CPC 空串标缺失；只用标注的90d转化字段；点击量0但转化率非零不自行重算；未知词空不编造 |
| `skill-amazon-category-trend` | 类目体检、趋势、Top100 商品 | `category_name_search(category_name="Sports Water Bottles",amz_site="US")` 得 `3395091`；`category_report(node_id="3395091",amz_site="US")`、`category_trend(node_id="3395091",trend_index="SalesCount",amz_site="US")`、`category_keywords(node_id="3395091",page=1,amz_site="US")`；需要榜单明细时 `category_products(node_id="3395091",amz_site="US")` 一次取类目 Top100，不分页 | 历史窗跨度3–40天且需有数据；TopN份额非单调禁用；转化率0口径待核；当前未完月剔除，关键词语义过滤；榜单不当全类目 |
| `skill-amazon-product-parse` | 解析商品、评论洞察、Listing 内容 | `product_detail(asin=...,amz_site="US")` → 需要图文资产时 `product_content(asin=...,amz_site="US")`（主图、五点、属性、A+；基础价格销量仍读详情）；按需 `product_reviews(asin=...,review_type="Negative",amz_site="US")` / `product_customers_say(asin=...,site="US")` / `product_variations(asin=...,page=1,amz_site="US")` | 评论跨变体，变体实返大写键；无评论标未取到；`similar_product_feature` 混类要弃用 |
| `skill-amazon-seller-analysis` | 店铺分析、按 ASIN/品牌找卖家、筛中国卖家 | `seller_search_from_name(name=...,query_type=1/2/3,amz_seller_site="US",page=1)` 分别按店铺全名/ASIN/品牌找候选；`seller_detail(name=店铺全名或seller_id,query_type=1或2,amz_seller_site="US")` 核背景；需要店铺商品时用核实的 seller_id 调 `product_search(seller_id=...,amz_site="US",page=1)`；按类目或经营条件筛选才 `seller_search(node_id=...,is_chinese_seller=1,amz_seller_site="US",page=1,...)`，只有要求中国卖家时传 1 | 三接口均使用 `amz_seller_site`；`seller_search` 仅 US/GB/DE/FR/CA/JP/ES/IT/MX；金额筛选入参按当地最小货币单位，返回字段单位另核；名称不等于国别，空值不补猜 |
| `skill-amazon-profit-calc` | 毛利、费用 | `product_detail` 返回 `fba_fee/platform_fee/profit/profit_rate`；采购价与运价需用户提供 | 接口毛利未扣采购/头程/广告；佣金0/-1、售价0与销量冲突时不下实际利润结论 |
| `skill-amazon-report-gen` | 出选品报告 | 复用已取类目→候选→竞品→利润结果；按需复用 `category_products`、`product_trend`/`product_report`、`keyword_search_results`/`competitor_product_keywords`、`product_content`、三种 `seller_*` 接口的已有响应；只在问题确实需要且参数/站点适用时补取，每段标参数/页数/日期 | 类目不匹配则报告该维缺失；零候选不产伪档位，TopN冲突不打总分；新增接口无实测值时只标取数结果，不引历史记录冒充 |

## 组合问话回归（2026-11-11）

- “US近90天上架，麻将包，$10–30，月销>1，评分≥4”：精准标题/属性入口返回1页8条；宽召回入口返回3页（仅核首页20条），出现麻将垫筒、整套及牌架。两路是候选合集，不能把同时传 `keyword` 与 `attribute_name` 理解成两个精确标题条件的交集。对同一候选再次按“评论≤10且FBA”筛选得到6条，其中 `B0HGFQ7NK2` 虽为 FBA、CN 卖家却是垫筒，且详情 `listing_date=2026-05-15`，必须剔除。详情 `B0HCKQQ9P5` 虽为真麻将牌袋、FBA、CN 卖家，列表 `online_date=2026-09-23`，详情 `listing_date=2026-08-09`，超出窗口；不得入表。
- “US近60天，麻将包，$15–30，月销≥100，评分≥4.5，评论≤20，FBA”：返回1条 `B0HC2D3D2K`；详情核实为牌/牌架/垫收纳包、`listing_date=2026-09-14`、月销196、FBA、CN 卖家。条件组合后不能只看 `product_search`：卖家国别与 `is_fba` 只有详情可确证。评论数18但 Negative 和 Customers Say 均无数据，只能说“当前未取到差评文本”，不能说“没有差评”。
- “US近90天，Sports Water Bottles，$20–40，月销≥1000，评分≥4.5，评论≤100，FBA”：返回空；去掉评论≤100与FBA两项仅作**诊断**，返回4条（均>100评论），不得当成原硬条件结果。首条 `B0HKYH5TF2` 列表 `online_date=2026-09-25`、详情 `listing_date=2024-06-17`、`days_on_shelf=47`，日期字段互相矛盾；严格近90天上架不可收录。类目 `3395091` 的历史报告可返回数据，但 Top3商品份额79.66%、Top5为60.52%（逆序），只禁用冲突份额维度。不能拿类目Top100规模替代上述筛选后商品数。
- “找可投的麻将包长尾词并看趋势”：`keyword_extends("mahjong bag")` 有20条，包括 `mahjong set`（整套，排除）与推荐CPC空串词（缺失）；`keyword_detail("mahjong bags for tiles and racks")` 月搜26,383、CPC $0.71，但 `click_90d=0` 与90天转化2.99%不相容；首页 `product_count=79` 与 organic48+ad2 不闭合、`avg_review_count=0` 同时存在低评论比例，应隔离这些衍生统计；Top3类目混入 Camera、Sports，不能宣称词流量全是麻将包。`keyword_trend("mahjong bag",type=2)` 到2026-10的完整月序列可用，2026-11 CPC单点不当完整月趋势。
- “比较两个麻将包的利润和差评，再出带条件的选品报告”：`B0HC2D3D2K` 详情售价$25.99、FBA$8.29、佣金$3.51、接口估算$14.19；`B0H9CKLL3S` 售价$24.99、FBA$7.58、佣金$5.25、接口估算$12.16、月销34，但销售额$1189.66与当前售价×月销$849.66不一致，且年销=-9999。销售额口径待核，不计算成交均价或用它排序；两款评论文本均未取到。采购、头程、广告没有真实输入时只比较平台估算值，报告保留这些缺口；空候选报告不造档位。

## 已实测返回与边界（2026-11-11）

- 宽搜 `keyword="mahjong bag"`：`page_count=89`（未加时间与销量条件的历史查询），首页含化妆包、搬家袋、牌架等无关条目；不能直接称为麻将包商品数。2026-11-11 近90天 + 月销≥2 的复核：宽召回 `keyword="mahjong bag",attribute_name="mahjong"` 共8页，已读首页2页；精准入口 `attribute_name="mahjong bag"` 共2页28条，已读完，仍混整套及挂件，且漏掉宽搜的真实包。详情证实 B0H337RR4S 的 `online_date=2026-08-15` 而 `listing_date=2026-08-06`、B0H82QYQ2G 的两日期为 2026-08-22/2026-07-20，均不能作为亚马逊上架近90天的已核候选。详情销量与搜索快照可能不同，逐款标注取值来源。
- 近60天 + $10–40 + 月销≥50：返回 `page_count=1`，包含麻将包，也夹麻将套装、垫、牌架；代表候选 `B0HC3WMVZ2` 售价 $21.99、估计月销 436。极窄条件（仅当日上架、$300 起、月销≥50000）返回 `No data available`。
- Owala `B0BZYBSRNF` 本次返回 $34.99、FBA $5.93、佣金 $6、估计毛利 $23.06 / 65.90%，与历史 demo 数值不同；STANLEY `B0D2ZBCYLL` $45、佣金0、接口毛利率85.27% 不可直接信任。请求测试 ASIN `B000000000` 返回自相矛盾的零食品名及纺织品品牌，须身份校验。
- `keyword_extends("water bottle")` 返回 20 词；`waterbottle` 的推荐 CPC 为 `""`。`keyword_detail("mahjong bag")` 月搜索 88,710、90天转化 2.98%、CPC $0.66，但 `click_90d=0`，两字段不能直接推算。未知词返回 `No data available`。
- `category_name_search("Sports Water Bottles")` 返回 5 个候选，准确节点 `3395091`。本轮报告 Top100 月销 1,401,725 件/$42,426,849.79，Top3 商品份额 61.24%，自营 73.21%；但 top_n 商品 Top5 份额 48.11% 小于 Top3，禁用该分组。2026-11 趋势 240,687 是未完月；2026-10 完整月 1,001,757。报告 `query_start=2026-11-01,query_date=2026-11-10` 返回空，2026-10-01~31 有数据；不存在节点空且余额 27,818，不能把前者断言为额度耗尽。
- `product_reviews` 近一年最多 100 条且覆盖不同颜色/尺寸；Owala `B0BZYBSRNF` 话题 durability 负面 2,611（摘要计数）并有盖子/吸管原文。新品 `B0HPB52XGN` 评论数 0，两个评论接口都无数据，同时售价 0、月销 2,586、年销 -9999，利润不可推。`product_variations` 实返 `Asin/Property/SalesAmount/ItemIndex/ItemTotal`，页面近期销量与详情估算月销量不能相加或互换。`similar_product_feature("water bottle")` 混入电解质与瓶装水特征，语义过滤失败则弃用。
- HydroJug `B0DGHBV6XS` 详情 $27.99，FBA $6.17，佣金 $4.20，接口估算利润 $17.62/62.95%；采购/头程/广告/退货未计，不能说真实可赚。报告链路 `product_search(node_id="3395091",price_range_min=15,price_range_max=40,month_sale_volume_range_min=1000,page=1)` 返回 7 页，首页 20 条含摇摇杯错类。`mahjong bag` 类目词未返回精确包类目，不能借 Tile Games 总盘代替；极窄候选空不生成机会档位。
