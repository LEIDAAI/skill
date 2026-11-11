# Sorftime 亚马逊技能触发实调验收（2026-11-11，两轮）

两轮仅实调 Sorftime；第二轮用户取消调用次数上限。以下均为实际传参与当次返回；复用结果会注明，不冒充新调用。金额 USD，销量为接口估计。完整执行规则见 `sorftime-amazon/SKILL.md` 与 `amazon-expert-skill-map.ts`。

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

## 第二轮实调记录（取消次数上限）

| 触发条件 | 实际参数（未列字段未传） | 返回结果 | 问题及处理 |
|---|---|---|---|
| 类目/正向：运动水杯大盘 | `category_report({node_id:"3395091",amz_site:"US"})` → `category_trend({node_id:"3395091",trend_index:"SalesCount",amz_site:"US"})` → `category_keywords({node_id:"3395091",page:1,amz_site:"US"})` | Top100 月销1,401,725件/$42,426,849.79；Top3商品61.24%，自营73.21%；2026-10完整月1,001,757，2026-11未完月240,687；关键词首页20条 | `top_n_sales_volume_share` Top5商品48.11%<Top3 61.24% 不单调，禁用冲突字段；`conversion_rate=0`、`order_rate=null` 口径待核；词表有 `bottled water` 等错类 |
| 类目/边界：历史时间窗 | `category_report({node_id:"3395091",query_start:"2026-11-01",query_date:"2026-11-10",amz_site:"US"})`；对照 `query_start:"2026-10-01",query_date:"2026-10-31"` | 前者 `No data available`，后者 Top100 月销3,602,818件/$113,602,476.23；自营87.49% | 近期合法跨度窗口不保证有数据；对照仅说明该节点历史月有数据，不能把前者说成全库故障；两种窗口不可混作同一时点 |
| 类目/异常：不存在节点及额度分诊 | `category_report({node_id:"999999999999999",amz_site:"US"})`；`common_usage_query({})` | 节点无数据；余额27,818 | 参数节点无效/当前接口无数据，非已证额度不足；基准节点可返回，未见整体数据源故障证据 |
| 商品评论/正向：成熟款差评 | `product_detail({asin:"B0BZYBSRNF",amz_site:"US"})` → `product_customers_say({asin:"B0BZYBSRNF",site:"US"})` → `product_reviews({asin:"B0BZYBSRNF",review_type:"Negative",amz_site:"US"})` | Owala 32oz Denim，评论145,352；durability 负面2,611；差评原文跨16/24/32/40oz，出现盖子断裂、吸管松脱和配送磕碰 | 话题计数是评论池摘要，不等于本子体负评数；区别部件问题与运输问题；规格以详情为准 |
| 商品评论/边界：新品评论空 | `product_detail({asin:"B0HPB52XGN",amz_site:"US"})` → `product_customers_say({asin:"B0HPB52XGN",site:"US"})` → `product_reviews({asin:"B0HPB52XGN",review_type:"Negative",amz_site:"US"})` | 详情评论0，后两接口分别 `No relevant data` / `No reviews found`；售价0但估计月销2,586、年销-9999 | 标当前未取得评论；价格与销量冲突，不能推零售价/利润，-9999 视缺失 |
| 商品评论/异常：变体与错类特征 | `product_variations({asin:"B0BZYBSRNF",page:1,amz_site:"US"})`；`similar_product_feature({product_name:"water bottle",amz_site:"US"})` | 变体126条中首页20条，实返 `Asin/Property/SalesAmount/ItemIndex/ItemTotal`；特征混入 Electrolytes、Purified Water、Alkaline Water | 数据键名与文档不符，SalesAmount 不能视美元销售额或父体估计月销；宽词样本错类，弃用特征份额 |
| 利润/正向：费用齐全 | `product_detail({asin:"B0DGHBV6XS",amz_site:"US"})` | HydroJug $27.99，FBA$6.17，佣金$4.20，接口估算 profit$17.62/62.95%，卖家 US | 估算利润未计采购、头程、广告、退货；不给最终利润 |
| 利润/边界：佣金为0 | `product_detail({asin:"B0D2ZBCYLL",amz_site:"US"})` | STANLEY $45，FBA$6.63，佣金0，接口利润$38.37/85.27% | 佣金缺口导致利润不可信；不默认15%重算（本轮重调验证） |
| 利润/异常：身份与售价冲突 | `product_detail({asin:"B000000000",amz_site:"US"})`；复用新品 `B0HPB52XGN` 详情 | 前者零食品名/纺织品牌，后者售价0/月销2,586/年销-9999 | 身份矛盾直接终止；价格销量冲突不输出利润，源数据问题不补值 |
| 报告/正向：运动水杯 | 复用类目正向链路；`product_search({amz_site:"US",node_id:"3395091",price_range_min:15,price_range_max:40,month_sale_volume_range_min:1000,page:1})` → 复用 HydroJug `product_detail` | 7页、首页20条；代表款 HydroJug B0DGHBV6XS $27.99/月销29,035/接口估算利润$17.62 | 搜索结果夹 shaker bottle 等错类，逐条筛；父体去重仅是样本系列，报告标采购与头程缺口、TopN冲突；不强制总评分 |
| 报告/边界：模糊类目麻将包 | `category_name_search({category_name:"mahjong bag",amz_site:"US"})`；复用首轮麻将包检索；`product_detail({asin:"B0HC3WMVZ2",amz_site:"US"})` | 类目返回 Tile Games/Bags & Cases 等，无精确包类目；候选为麻将牌包/手提包，$21.99/月销436/卖家CN | 不能拿 Tile Games 总盘冒充麻将包市场；报告只列已核实候选与类目规模缺口，跨境逐款实证 |
| 报告/异常：极窄条件零候选 | `product_search({amz_site:"US",node_id:"3395091",online_date_range_min:"2026-11-11",online_date_range_max:"2026-11-11",price_range_min:300,month_sale_volume_range_min:50000,page:1})` | `No data available`；复用已证基准节点与余额查询 | 属当前条件空候选，保持门槛；不产伪商品、机会档位或市场结论 |

## 完成度与限制

七技能均覆盖正向、边界、异常触发；报告为对真实接口结果的串联复用验收，未把报告本身当成一个 MCP 接口。`category_report` 历史近实时窗口空值原因尚不能精确区分上游更新时间与统计规则；已排除显见的 schema 错、额度耗尽及全库不可用，保留“该窗口当前无数据”。类目 TopN 非单调与评论跨变体口径均已写入提示词。前一轮表格中的“待验”是当时状态，以本节第二轮记录为准。

## 第三轮：近90天麻将包精度复核（2026-11-11）

口径：US，2026-08-13 至 2026-11-11，`month_sale_volume_range_min=2`（月估计销量严格大于1），不限定跨境。`product_search({amz_site:"US",keyword:"mahjong bag",attribute_name:"mahjong",online_date_range_min:"2026-08-13",online_date_range_max:"2026-11-11",month_sale_volume_range_min:2,page:1/2})` 返回总8页，**只看首页2页40条**；`product_search({amz_site:"US",attribute_name:"mahjong bag",online_date_range_min:"2026-08-13",online_date_range_max:"2026-11-11",month_sale_volume_range_min:2,page:1/2})` 返回2页共28条且读完。两路有重复，不把68条相加为独立商品数；宽搜余6页未核，不能称完整结果。

- 宽搜混入规则卡 `B0HDC8F74V`、麻将整套附带包 `B0HFKC2QK2`、麻将垫 `B0H7Q1P6T9`、牌架 `B0H94X3PT1`；精准短语也混入整套 `B0H9K1G9KW`、挂件 `B0HF8T9TBC` 与垫筒 `B0HGFQ7NK2`。商品主件不为收纳麻将牌/牌架的包时剔除；时尚手袋 `B0HJ7KKL13` 详情为 Evening Bags，容量用途不明，列待核而非确证麻将包。
- 精准短语漏掉宽搜真包 `B0HGM83K9X`（详情可放166张美式麻将牌，`listing_date=2026-10-06`、月销194），所以不能单路精准搜后声称齐全。入表样本详情核实：`B0HC2D3D2K` 2026-09-14/196件、`B0HC6LLFRY` 2026-09-01/168件、`B0HF9TXH1M` 2026-09-20/150件、`B0H9RSYP3B` 2026-09-09/52件；均指详情 listing_date / 本次估计月销，不是父体总销。
- 日期口径关键冲突：`B0H337RR4S` 列表 online_date 2026-08-15/月销1270，详情 listing_date 2026-08-06（超窗）；`B0H82QYQ2G` 列表 online_date 2026-08-22/月销101，详情 listing_date 2026-07-20（超窗）。这两款虽是麻将包，也不能在“亚马逊近90天上架”已核表中。`B0HC3WMVZ2` 时尚手袋详情 listing_date 2026-09-09、月销436，但强调 phone & makeup clutch，容量用途不确定，暂不算已核麻将收纳包。详情销量与搜索列表可能变化，用详情快照并标来源。

修订规则：按运行日生成近N天窗口，月销严格大于1传整数2；多路召回按 ASIN 去重，逐条看主商品和用途，不只凭关键词；严格亚马逊上架窗口以详情 `listing_date` 复核，`online_date` 只用于候选预筛；每条入表须同时满足品类、日期和月销；已看页数与未看页数分开披露。

## 第四轮：七路由多条件组合问话回归（2026-11-11）

以下新调用仅用 Sorftime，复用同轮已取响应时明确写“复用”。日期窗按运行日固定为近90天 2026-08-13~11-11、近60天 2026-09-12~11-11。**覆盖的是这些组合问话与调用链，不等于任意条件排列均已穷尽。**

| 技能 / 用户问话 | 实际参数与复用 | 返回、人工核对 | 问题 / 处理 |
|---|---|---|---|
| 搜索①：US近90天麻将包，$10–30，月销>1，评分≥4 | `product_search({amz_site:"US",attribute_name:"mahjong bag",online_date_range_min:"2026-08-13",online_date_range_max:"2026-11-11",month_sale_volume_range_min:2,price_range_min:10,price_range_max:30,star_range_min:4,page:1})`；宽搜同参加 `keyword:"mahjong bag",attribute_name:"mahjong"` | 精准1页8条，宽搜3页仅读首页20条；精准含垫筒，宽搜含整套/牌架/麻将垫 | 多入口按ASIN合并，标题/主商品过滤；不能把宽搜页数当精准合格数 |
| 搜索②：再限评论≤10且FBA并要求跨境 | 在①精准参数加 `comment_count_range_max:10,shipping_type:"FBA"`；`product_detail({asin:"B0HCKQQ9P5",amz_site:"US"})`、`product_detail({asin:"B0HGFQ7NK2",amz_site:"US"})` | 1页6条；B0HCKQQ9P5 是牌袋，CN/FBA、月销75，但列表online_date 09-23、详情listing_date 08-09超窗；B0HGFQ7NK2 是垫筒，CN/FBA且详情listing_date 05-15 | FBA/CN详情才可证实；两条都不得作为近90天麻将牌包合格结果 |
| 搜索③：US近60天麻将包，$15–30、月销≥100、评分≥4.5、评论≤20、FBA、CN卖家 | `product_search({amz_site:"US",attribute_name:"mahjong bag",online_date_range_min:"2026-09-12",online_date_range_max:"2026-11-11",month_sale_volume_range_min:100,price_range_min:15,price_range_max:30,star_range_min:4.5,comment_count_range_max:20,shipping_type:"FBA",page:1})`；`product_detail({asin:"B0HC2D3D2K",amz_site:"US"})` | 1条，MEWTOGO牌/牌架/垫收纳包，listing_date 09-14、月销196、$25.99、4.9星/18评论、CN/FBA | 当前组合下已核实1条；不是全站所有合格包，其他召回入口未跑同组筛选 |
| 搜索异常：US近90天运动水杯，$20–40，月销≥1000，评分≥4.5，评论≤100，FBA | `product_search({amz_site:"US",node_id:"3395091",online_date_range_min:"2026-08-13",online_date_range_max:"2026-11-11",price_range_min:20,price_range_max:40,month_sale_volume_range_min:1000,star_range_min:4.5,comment_count_range_max:100,shipping_type:"FBA",page:1})`；去掉末两条件**仅诊断**；`product_detail({asin:"B0HKYH5TF2",amz_site:"US"})` | 原条件无数据；诊断4条且评论数均>100。首条 online_date 09-25、listing_date 2024-06-17，days_on_shelf 47，字段矛盾 | 诊断样本不能回填原结果；严格90天上架不收录首条 |
| 类目：运动水杯的10月规模可否说明上述空筛选有机会 | `category_name_search({category_name:"Sports Water Bottles",amz_site:"US"})`、`category_report({node_id:"3395091",query_start:"2026-10-01",query_date:"2026-10-31",amz_site:"US"})` | 名称返回5节点；10月Top100销量3,602,938、销售额$113,604,872.63；Top3商品79.66%但Top5商品60.52% | 禁用逆序份额；类目Top100规模不能代替组合筛选的候选数 |
| 关键词：找麻将包长尾、筛错类并看趋势 | `keyword_extends({keyword:"mahjong bag",keyword_support_site:"US",page:1})`、`keyword_detail({keyword:"mahjong bags for tiles and racks",keyword_support_site:"US"})`、`keyword_trend({keyword:"mahjong bag",type:2,keyword_support_site:"US"})` | 扩词20条混入mahjong set；目标长尾月搜26,383/CPC$0.71，但click_90d=0、90d转化2.99%，首页总数79与organic48+ad2不闭合，Top3类目含Camera/Sports；趋势完整月到10月 | 剔除错类词；点击/转化和首页坑位异常字段隔离；11月CPC单点不当完整月 |
| 竞品+商品解析：对比两款牌袋的费用和差评 | 复用 `product_detail`：B0HC2D3D2K、另调 `product_detail({asin:"B0H9CKLL3S",amz_site:"US"})`；两款分别 `product_reviews({asin,review_type:"Negative",amz_site:"US"})`、`product_customers_say({asin,site:"US"})` | 两款详情评论数18与10，两个评论接口均无数据；后者售价$24.99、月销34、月销额$1189.66（售价×月销=$849.66）、年销=-9999 | 不得说无差评；销售额口径待核，不能用于平均售价或作为可靠报告排序依据 |
| 利润：两款包在没有采购与头程的条件下能赚多少 | 复用上述两款 `product_detail` | MEWTOGO $25.99/FBA$8.29/佣金$3.51/接口估算$14.19；Frjjthchy $24.99/FBA$7.58/佣金$5.25/接口估算$12.16 | 只比较接口估算，不说真实净利；没有用户给定采购、物流、广告规则，不补入假设数字 |
| 报告：US近60天、$15–30、月销≥100、4.5星、≤20评论、FBA、CN的麻将包能否做 | 复用搜索③、详情、关键词长尾和评论结果；类目名称未找到精确麻将包节点（见第二轮记录），不借运动水杯大盘 | 仅1条已核候选、评论文本缺失；关键词一词含统计冲突；类目专属规模无数据 | 报告只给样本与缺口，不产总分/市场规模/保证盈利结论 |

回归后的规则：先保留用户硬条件真实返回，再用剥离条件的请求定位空结果来源，诊断结果与正式结果分栏；所有候选按主商品、详情日期和不可在列表验证的条件复核；评论数不推出差评存在或不存在；销售额、关键词坑位、类目TopN出现不闭合时隔离冲突字段。
