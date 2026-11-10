# Sorftime亚马逊选品专家 · 路由验收报告

> 验收日期：2026-11-09 ~ 2026-11-10 ｜ 环境：对话内真实 MCP 调用（sorftime-amazon 主库 + sellersprite 辅库）｜ 站点 US
> 结论：**7 条技能路由全部真实接口跑通**，主链路（选品报告）串联验证通过，实测发现的数据坑已全部写入专家纪律。

## 一、验收矩阵总览

| # | 技能路由 | 验收场景 | 接口链 | 结果 | 证据 |
|---|---|---|---|---|---|
| 1 | skill-amazon-selection-search | 近60天上架麻将包出表格 | product_search ×3页 | ✅ 通过 | 60 款原始命中 → 父体归组 60 父体，表格页 amazon-mahjongbag-60d.html |
| 2 | skill-amazon-competitor | STANLEY 竞品利润拆解 | product_detail + customers_say + traffic_keyword | ✅ 通过 | 月销 12.7 万件/$585.8 万；发现佣金缺失坑 |
| 3 | skill-amazon-keyword | stanley cup / water bottle 词体检 | keyword_list + keyword_detail + keyword_trend + competitor_product_keywords | ✅ 通过 | 跟卖率 40.63%/26%；CPC 三年 $2.15→$1.05 |
| 4 | skill-amazon-category-trend | water bottle + Thermoses 双类目体检 | category_name_search + category_report + category_trend + category_keywords | ✅ 通过 | Top100 月销 156.5 万件；季节系数 2.0；官方预测 -13.88%/-25.61% |
| 5 | skill-amazon-product-parse | Owala/STANLEY 差评深挖 + 新品零评论场景 | product_reviews(Negative) + customers_say + similar_product_feature + product_detail | ✅ 通过 | 100 条差评归纳五大主题；B0HPB52XGN 零评论如实返回 |
| 6 | skill-amazon-profit-calc | Owala 利润四件套直读 | product_detail | ✅ 通过 | FBA$5.93+佣金$6.00→毛利$20.07(62.72%) 直读 |
| 7 | skill-amazon-report-gen | 主链路串联（体检→候选→深挖→利润→风控） | 串联以上全部 | ✅ 通过 | 五专家实跑全链路 2026-11-09 完成，patch 5fddb1c |

## 二、逐路由调用证据

### 路由1：选品搜索（2026-11-09）
- 调用：`product_search(keyword="mahjong bag", online_date_range_min=2026-09-10, online_date_range_max=2026-11-09, amz_site=US, page=1..3)`
- 关键返回：page_count=5（命中窗口前3页60款）；子体级返回含 parent_asin
- 父体归组验证：60 子体 → 60 父体（本批无跨子体多变体系列）；销冠 Lamdo 整套装 $67,656/月（B0HG9WWMX1，父体 B0HG9YNH1T）
- 沉淀坑：①variation_count 虚报（Lamdo 报 2 实际 product_variations 返回 ItemTotal=1）②product_variations 对部分 ASIN 返回空（KVPIHZM）③新品（14天）price=0/sales_amount=-1 采集未覆盖

### 路由2：竞品分析（2026-11-09）
- 调用：`product_detail(B0D2ZBCYLL)` → STANLEY Quencher H2.0 40oz
- 关键返回：price=$45/月销127,490件/$5,858,165/4.7星207,977评/fba_fee=$6.63/**platform_fee=0**/profit_rate=85.27%
- 坑验证：$45 客单佣金不可能为 0 → 佣金字段缺失导致毛利虚高，按 15% 自估重算 ≈65% —— 已写入纪律第 2 条
- customers_say(B0D2ZBCYLL)：13 话题，头号差评=leakage（负面2143）+durability（负面2051）
- traffic_keyword(B0BZYBSRNF)：1,340 流量词，主词 owala 月搜 380 万/自然位#11/流量占比 24.7%

### 路由3：关键词挖掘（2026-11-09）
- `keyword_list(rank_max=100)`：paper towels 月搜290万/转化90d=20.51%/CPC$1.19；needoh 月搜296万/转化0.47%=虚流量
- `keyword_detail("water bottle")`：首页100坑=自然52+广告13；跟卖率26%；Top3点击 ASIN=B0BZYCJK89(7.94%)；三年搜索量 2024=2453万→2026=1633万
- `keyword_detail("stanley cup")`：跟卖率40.63%（品牌词比大词更凶）；**page_estimate_ad_budget 有值**（第1页日预算$2708/第3页$125）——坑位成本金标准
- `keyword_trend("water bottle")`：CPC 序列 2022-03=$2.15 → 2026-10=$1.05（**文档说 cent 实际返回美元**——已写入纪律第 3 条）
- `competitor_product_keywords(B0BZYBSRNF)`：Owala 品牌词矩阵自然位#1（owala water bottle 32oz）+材质词#19 卡位打法

### 路由4：类目体检（2026-11-09）
- `category_name_search("water bottle")` → Sports Water Bottles(3395091) 等 5 候选
- `category_report(3395091)`：Top100 月销 1,565,444 件/$46,983,654；Top3 商品 62.47%/品牌 62.47%（Owala 37.25%+STANLEY 16.3%）/卖家 86.69%；自营 73.92%；退货率 9.85%；转化率 7.00%；forecast=[1月 -13.88%, 2月 -6.99%]
- `category_trend(3395091)`：25 个月序列，2024-12 峰 167.4 万 → 2025-01 谷 84.3 万（季节系数 2.0）；**2026-11 只统计到当天=29,857 件（未完月）——已写入纪律第 5 条**
- `category_report(13880501)`（Thermoses）：Top100 月销 112.9 万/$2797.6 万；Owala 单品牌 44.57%；预测 1月 -25.61%
- `category_keywords(3395091)`：owala 月搜 270.8 万/CPC$2.02；water bottle 自营销售占比 68.24%=红海

### 路由5：商品解析与评论洞察（2026-11-09 / 11-10）
- `product_reviews(B0BZYBSRNF, Negative)`：100 条差评 → 五大主题：盖子弹簧断裂（近半）/吸管脱落/O型圈漏水/24oz放不进杯架/质保踢皮球；流失去向 Hydro Flask/Stanley/Contigo
- `product_customers_say(B0BZYBSRNF)`：13 话题计数，durability 4070提及/负面2611
- `similar_product_feature("water bottle")`：保温特征 35% 商品有但占 62.4% 销量=超配卖点
- **跨变体漂移坑**：STANLEY customers_say summary 描述"30oz"实际变体 40oz——AI 在全变体池提炼，已写入纪律第 10 条
- **新品零评论场景**（2026-11-10）：`product_detail(B0HPB52XGN)` 返回正常但 review_count=0；`customers_say` 与 `reviews` 均"No data"——上架 14 天零评论属正常，非接口缺陷

### 路由6：利润测算（2026-11-09）
- `product_detail(B0BZYBSRNF)`：Owala FreeSip 32oz = 售价$32.00/月销365,193件/$11,686,176/fba_fee=$5.93/platform_fee=$6.00/profit=$20.07/**profit_rate=62.72%**——四件套一次直读，验证「不手拼费用」
- weight_g=431 / package_size_cm=29.26×10.80×9.50 —— 头程估算数据同接口直读

### 路由7：选品报告主链路（2026-11-09 五专家实跑）
串联顺序：类目体检（water bottle+Thermoses 双类目）→ 候选搜索（product_search TOP20）→ 深挖（STANLEY/Owala/HydroJug 逐款）→ 利润（四件套直读）→ 风控（patent_search_from_keyword("water bottle")=30条，发现深圳厂水壶盖专利 US12150541B2）
- 额度验证：common_usage_query 初始 29,670cr，整轮消耗约 100cr
- 产出：纪律补丁 commit 5fddb1c（2026-11-09 推送成功）

## 三、写入专家人设的实测纪律（13 条）

1. 利润四件套直读（不手拼费用） 2. platform_fee=0 毛利率陷阱（15% 自估兜底） 3. keyword_trend 单位美元本体（文档误标 cent） 4. 1970/-1 缺失占位 5. category_trend 未完月剔除 6. 转化率以 90d 为准（360d 失真） 7. 热词榜滤虚流量（<1%） 8. parent 归组去重（子体重复计销量） 9. 新品零评论常态 10. customers_say 跨变体漂移 11. 检索坑三件（traffic_keyword 默认参数/seller_search 从宽/quora 不可用） 12. 额度纪律（专利 60cr/图搜 450cr） 13. 反编造三条（抽样≠全量/缺失≠0/无趋势不下结论）

## 四、遗留事项

- 五专家旧版（exp-amazon-sel/shop/market/keyword/voc）在导航页仍为独立卡片，本映射文件生效后前台只挂 exp-amazon-sel 单专家+7技能；导航页 HTML 的收敛待下一轮 UI 同步
- 卖家精灵版专家（「卖家精灵亚马逊XX专家」）命名空间已预留，后续写入时按 amazon-expert-skill-map.ts 同结构产出 sellersprite-expert-skill-map.ts
