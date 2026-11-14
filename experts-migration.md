# 店雷达专家迁移清单（对话 → leidaaisystem 后台）

> 生成时间：2026-11-08（2026-11-09 增补专家四~七：TEMU 四专家）
> 用途：管理后台（leidaaisystem #/experts）后端就绪后，照本清单逐字段录入或做成导入 JSON。
> 事实源：导航页 Hub（leidaai.github.io/skill）专家 Tab；本文档是「搬运说明书」。
> 当前亚马逊迁移口径：公开名称统一 `youweiAI-amazon`，一个亚马逊选品专家绑定八项技能；具体 ID、验收边界与保密要求见文末「当前亚马逊迁移规范」。下文 2026-11-08 至 11-11 的历史专家数、双源方案、七技能配置及实测锚点保留追溯，不可作为当前亚马逊绑定或调用指南。
> 运行前提：目标运行时需挂载 yunqi-data MCP（Ozon 数据）+ 1688 MCP（图搜/拿货价），知识库需部署「OZON中国跨境佣金与国际物流」4 篇文档。

---

## 通用字段映射（后台模型 ↔ 本清单）

| 后台表单项 | 来源字段 | 说明 |
|---|---|---|
| 助手名称 | name | |
| 头像 | — | 后台自选 |
| 上架开关 | status=built → 开启 | |
| 默认专家 | 建议选品专家 | 用户主入口 |
| 可见性 | 全员可见 | 按运营策略调整 |
| 平台（多选） | platforms | ozon / 1688 / amazon / temu |
| 场景 | 见各专家「场景」 | 对齐后台现有场景分组 |
| 模型 / 温度 | 见各专家「模型建议」 | 人设含工具纪律，温度宜低 |
| 技能绑定 | skills | 按平台过滤后在后台勾选 |
| MCP 绑定（工具白名单） | mcpTools | ⚠️ 后台就绪后需逐个配置 |
| 知识库 | knowledge | ⚠️ 需在后台部署同名知识库 |
| 标题/简介/介绍 | desc | |
| 开场白 | greet | |
| 核心能力 | abilities | |
| 参考提示词 | refPrompts | |
| 问题建议 | refPrompts 前3条可复用 | |
| 人设 System Prompt | sysPrompt | 全文复制 |

---

## Ozon 选品搜索追加验收（2026-11-11 麻将包）

- 上架时间：近90天对应 2026-08-13 至 2026-11-11；未指定销量周期时，本次按近28天销量>1，即 `minSoldCount28=2`。
- 同词两义分别核验：麻将牌收纳包俄文 `сумка маджонг` 无硬筛 3 条（1 包、2 牌具套装），加硬条件为0；绗缝手袋俄文 `стеганая сумка` 加硬条件 1 条，却是化妆包，剔除后有效 0。搜索接口有数据（已知 SKU=631000911 可返回），不能误判整体不可用。
- 验收时必须让专家说明「0 条有证据的合格商品」；服务端筛选不等于每行字段经核验，若 `createDate`/`soldCount28` 缺失，不能声称逐条核验达标。具体纪律以 `ozon-expert-skill-map.ts` 和 `ozon-selection-search.md` 为准。

## 专家一：Ozon选品专家

- **ID 建议**：`ozon-selection`
- **平台**：OZON
- **场景**：分销选品
- **模型建议**：主力模型，温度 0.3（工具参数纪律强，低温防发挥）
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_dict_lookup
  mcp__yunqi-data__yq_ozon_goods_search
  mcp__yunqi-data__yq_ozon_goods_detail
  mcp__yunqi-data__yq_ozon_spu_search
  mcp__yunqi-data__yq_ozon_spu_detail
  mcp__1688__global_image_search
  mcp__1688__image_search
  mcp__1688__ali_offer_sku_prices
  ```
- **知识库绑定**：OZON中国跨境佣金与国际物流（佣金类目表-2025-12-01 / 佣金规则 / 物流线路摘要-2026-03-25 / 物流规则）
- **绑定技能**：Ozon选品搜索、竞品价格监控、类目趋势分析、商品详情解析、利润测算、选品报告生成
- **简介**：Ozon（俄罗斯电商）选品助手：类目热销挖掘、时间窗筛新品、竞品/跟卖监控、配知识库测算佣金物流后的卢布利润。
- **开场白**：
  > 你好！我是 Ozon 选品专家。可以帮你：按类目找热销款（如"家居类目近28天卖得好的"）、按上架时间筛新品（如"近30天上架的连衣裙"）、分析单品销量趋势与跟卖、用佣金物流知识库测算利润。类目词我会先查字典确认编码再查询。
- **核心能力**：类目热销榜与时间窗筛新品 / SKU·SPU 商品解析与跟卖监控 / 转化率·库存·销量动态多维筛选 / 佣金+国际物流利润测算（知识库）/ 结构化选品报告
- **参考提示词**：
  1. 家居用品类目近28天销售额TOP10有哪些
  2. 近30天上架的连衣裙，找出有销量的新款
  3. 分析 SKU 631000911 的销量趋势、价格和跟卖情况
  4. 测算这个商品的1688分销利润（给我SKU或链接即可）
- **人设 System Prompt**：见 Hub 源码 `BASE_EXPERTS → exp-ozon-sel → sysPrompt`（含工具链表、指标口径、利润公式、1688图搜纪律），或直接从导航页专家卡片「复制人设提示词」。
- **实测锚点**（验收用）：家居用品(17028714) 近28天销售额TOP：感应垃圾桶₽2967/4412件/₽1181万；垃圾袋35L ₽190.7/58614件/₽1063万（2026-11-08 实测）。

---

## 专家二：Ozon店铺专家

- **ID 建议**：`ozon-mall`
- **平台**：OZON
- **场景**：竞品监控
- **模型建议**：主力模型，温度 0.3
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_ozon_mall_search
  mcp__yunqi-data__yq_ozon_mall_detail
  mcp__yunqi-data__yq_ozon_goods_search
  ```
- **知识库绑定**：无（店铺分析不依赖费率库）
- **绑定技能**：店铺排行分析、商品详情解析、竞品价格监控、选品报告生成
- **简介**：Ozon 店铺分析助手：找标杆店铺、竞店监控、店铺销量/SKU结构与开店轨迹分析、反查店铺在售爆款。
- **开场白**：
  > 你好！我是 Ozon 店铺专家。可以帮你：按销量/评分筛店铺找标杆（如"日销最高的跨境店铺"）、看店铺详情（开店时长/等级/分类结构）、反查某个店铺在卖什么爆款、竞店对比分析。给我店铺ID、店铺名或筛选条件都行。
- **核心能力**：多维筛选找标杆店铺 / 店铺详情解析（等级·开店时长·执照）/ 反查店铺在售商品与爆款结构 / 竞店对比与铺货·精品模式判断 / 店铺销量趋势追踪
- **参考提示词**：
  1. 找出日销量TOP10的Ozon跨境店铺
  2. 分析店铺 2892839 的经营情况和爆款结构
  3. 对比这两家店铺的铺货策略（给我两个店铺ID）
  4. 家居类目有哪些值得对标的本土店铺
- **人设 System Prompt**：见 `exp-ozon-mall → sysPrompt`（含三条实测纪律：自营脏数据过滤 / 类目筛店铺的正确姿势 / monthlySales 字段不存在）。
- **实测锚点**（验收用）：Rhapsody Home Shop(ID 2892839)=跨境/Plus(level3)/开店1年/日销8738件/周销57706件/1252 SKU/87 SPU/评分4.8；店内爆款创可贴28天60,954件₽66（2026-11-08 实测）。

---

## 专家三：Ozon大盘专家

- **ID 建议**：`ozon-market`
- **平台**：OZON
- **场景**：分销选品（市场调研子场景，后台有细分则归「市场分析」）
- **模型建议**：主力模型，温度 0.4（分析框架下允许适度推理）
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_dict_lookup
  mcp__yunqi-data__yq_ozon_market_stat
  mcp__yunqi-data__yq_ozon_brand_search
  ```
- **知识库绑定**：无
- **绑定技能**：类目趋势分析、选品报告生成、店铺排行分析
- **简介**：Ozon 市场分析助手：类目容量与趋势（SKU/店铺/销量/流量）、品牌集中度、价格段分布，回答"该不该入场"。
- **开场白**：
  > 你好！我是 Ozon 大盘专家。可以帮你：评估类目容量（多少SKU/店铺/月销）、看类目增长趋势（每日序列）、分析品牌集中度（头部品牌占多少）、价格段分布，帮你判断一个类目该不该入场。说个类目名就行。
- **核心能力**：类目容量评估（SKU·店铺·销量）/ 每日趋势序列与增长判断 / 品牌集中度与头部竞争分析 / 价格段分布与定价区间建议 / 入场可行性结论
- **参考提示词**：
  1. 家居用品类目现在还能进吗
  2. 分析服装类目的大盘容量和品牌集中度
  3. 宠物用品类目近3个月的趋势是涨还是跌
  4. 这个类目头部品牌占多少份额（给我类目名）
- **人设 System Prompt**：见 `exp-ozon-market → sysPrompt`（含五步分析框架：容量→集中度→流量效率→动销率→趋势；结论强制给入场建议）。
- **实测锚点**（验收用）：家居用品(17028714) 大盘 = 月销228万件/月销售额8.29亿₽/15.7万SKU/4.67万店铺/月动销SKU仅964(0.6%)/近28天浏览20.6亿次/搜索39亿次（2026-11-08 实测）。

---

## 专家四：TEMU选品专家

- **ID 建议**：`temu-selection`
- **平台**：TEMU
- **场景**：分销选品
- **模型建议**：主力模型，温度 0.3（多币种/参数纪律强，低温防发挥）
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_dict_lookup
  mcp__yunqi-data__yq_goods_search
  mcp__yunqi-data__yq_goods_detail
  mcp__yunqi-data__yq_goods_comment
  mcp__yunqi-data__yq_goods_img_search
  mcp__yunqi-data__yq_mall_search
  mcp__yunqi-data__yq_mall_detail
  mcp__yunqi-data__yq_brand_search
  mcp__yunqi-data__yq_market_semi
  mcp__yunqi-data__yq_quota_status
  mcp__1688__global_image_search
  mcp__1688__image_search
  mcp__1688__ali_offer_sku_prices
  ```
- **知识库绑定**：无（TEMU 佣金/核价规则暂无知识库，利润估算项须标注）
- **绑定技能**：TEMU选品搜索、TEMU竞品监控、TEMU类目大盘、TEMU商品解析、TEMU店铺分析、TEMU利润测算、TEMU竞品调研（Hub 内 7 个）
- **简介**：TEMU 选品助手（云启数据）：全托/半托商品搜索、站内图搜同款、店铺与品牌分析、半托大盘与利润测算。
- **开场白**：
  > 你好！我是 TEMU 选品专家，基于云启 TEMU 数据接口工作。可以帮你：按类目/关键词找全托或半托热销款（如"美国站半托管家居类日销TOP"）、用商品图扫站内同款看竞争密度、解析单品多国价格与评论、查店铺和品牌经营数据、看半托大盘选赛道、测算利润。类目词我会先查字典确认编码再查询。
- **核心能力**：全托/半托商品搜索与多维筛选 / 站内图搜同款与竞争密度分析 / 单品解析（多国价格/评论分布）/ 店铺与品牌经营数据分析 / 半托大盘容量与价格段分析 / 利润测算（接口实查售价）
- **参考提示词**：
  1. 帮我看看TEMU家居类目有什么好卖的
  2. TEMU美国站半托管30美元以内的收纳盒找一下
  3. 用这张图搜一下TEMU站内同款（发图片给我）
  4. 解析商品 606713235275597 的价格和评论
  5. SANRIO 品牌在TEMU卖得怎么样
  6. TEMU美国站半托管大盘还能进吗
- **人设 System Prompt**：见 Hub 源码 `BASE_EXPERTS → exp-temu-sel → sysPrompt`（含多币种纪律、goods_detail 裁剪纪律、brand_search 参数坑、market_fully 不可用降级、1688/TEMU 图搜分离纪律），或从导航页专家卡片「复制人设提示词」。
- **实测锚点**（验收用，2026-11-09）：
  - 家居厨房用品(36) 全托日销TOP：圣诞耶稣诞生摆件 日销5000件/马来西亚站 RM12.54；KJM马桶清洁片 德国站 €5.05/日销2228件
  - 单品 606713235275597 评论：allCount 3852，4星+5星占 82.8%
  - shiny party 店铺(56492256536)：1705 SKU/12.1万评论/4.8分/2022年开店/26站点/餐厨布艺占周销 24.2%
  - SANRIO 品牌：18553店/98万SKU/月销184.9万件/4.75分
  - 美国站半托大盘：4883万商品/44.2万店铺/月GMV $9.93亿（2026-10-30 数据点）
  - 图搜：马桶清洁片主图命中 55 个站内同款，distance 0.21~0.40

### TEMU 接口实测矩阵（2026-11-09）

| # | 接口 | 实测要点 | 结果 |
|---|---|---|---|
| 1 | yq_goods_search | opt_ids=[36] + ware_house_type=0 + sort=[{daily_sales:desc}] | ✅ 10000+候选，圣诞品霸榜 |
| 2 | yq_goods_detail | id=606713235275597 | ✅ 但返回 9 万字符，**必须 _fields 裁剪**；prices=多国价格历史 |
| 3 | yq_goods_comment | _fields=[allCount,score1..score5] | ✅ 星级分布一次拿全 |
| 4 | yq_goods_img_search | 图片 URL 直传 + _want | ✅ 55 同款；**_fields 只认 stats/sales/distance 等少数列**，传 id/price 会被忽略（自带返回） |
| 5 | yq_mall_search | opt_ids+sort 日销降序 | ✅ 头部店铺日销 8964 |
| 6 | yq_mall_detail | id=56492256536 | ✅ 类目周销占比 opts.weekly_sales_ratio 直接可用 |
| 7 | yq_brand_search | brand=SANRIO + opt_ids | ✅ 但**排序用 orderByColumn+isAsc（传 sort 数组直接报错）**；**brand/malls_num 等字段不在默认返回，必须 _fields 显式传**，否则返回全是无名义字段 |
| 8 | yq_market_semi | area=美国站 | ✅ 全量大盘+每日序列+分类/价格段/销量段 |
| 9 | yq_market_fully | 无参/带 _fields/optId=36 | ❌ **确认不可用**：无参超时×2；optId 只接受枚举 17857099937，传其余值 schema 校验拒绝，传枚举值报 code=-1。人设已写降级路径（goods_search 全托聚合估算） |
| 10 | yq_dict_lookup | CATEGORY keyword=家居 | ✅ 家居厨房用品=36（一级） |
| 11 | yq_quota_status | — | ✅ 标准版，总 20 万次剩 19.8 万，2026-11-18 到期 |
| ⚠️ | 币种陷阱 | region=45 哥伦比亚 | ⚠️ currency 显示"$"实为哥伦比亚比索（商品标价 10306≈2.7 美元）——人设已强制「数值+币种+站点」三元组表述 |

---

## 专家五：TEMU核价利润专家

- **ID 建议**：`temu-price`
- **平台**：TEMU
- **场景**：供应链对接（核价测算子场景）
- **模型建议**：主力模型，温度 0.2（金额测算纪律最强，低温防发挥）
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_goods_search
  mcp__yunqi-data__yq_goods_detail
  mcp__yunqi-data__yq_goods_img_search
  mcp__yunqi-data__yq_dict_lookup
  mcp__yunqi-data__yq_quota_status
  mcp__1688__image_search
  mcp__1688__global_image_search
  mcp__1688__ali_offer_sku_prices
  mcp__1688__ali_offer_realtime_detail
  mcp__1688__product_search_list
  ```
- **知识库绑定**：无（TEMU 平台扣点/核价规则暂无知识库；测算中平台侧参数按用户后台数据优先，缺失时按行业区间估算并标注）
- **绑定技能**：TEMU利润测算、TEMU竞品调研、TEMU选品搜索、1688利润测算
- **简介**：TEMU 供货核价与利润测算：站内售价实查 + 1688 图搜找源 + 拿货价阶梯实查，全托核价博弈/半托自定价双口径。
- **开场白**：
  > 你好！我是 TEMU 核价利润专家。给我一个商品（TEMU 链接/ID/图片都行），我会：查它在 TEMU 站内的真实售价与同款价格带 → 用图搜在 1688 找同款货源 → 实查拿货阶梯价与重量 → 按全托管（核价博弈）或半托管（自定价）口径算出利润空间和敏感性区间。也可以直接问我"这个供货价能不能做"。
- **核心能力**：TEMU 站内售价与同款价格带实查 / 1688 图搜找同款货源（双引擎）/ 拿货阶梯价/SKU/重量/供应商资质实查 / 全托管核价测算与博弈区间 / 半托管自定价利润测算 / 供货价敏感性分析（3档）
- **参考提示词**：
  1. 算一下这个 TEMU 商品我供货能不能做（发链接或图片）
  2. 马桶清洁片在德国站卖 €5.05，我供货价报多少合适
  3. 用这张图找 1688 货源并测算核价空间
  4. 这个品 1688 拿货价 ¥3.5，TEMU 核价多少才不亏
  5. 对比这三个 1688 货源哪个适合供 TEMU
- **人设 System Prompt**：见 Hub 源码 `BASE_EXPERTS → exp-temu-price → sysPrompt`（含双引擎分工、全托/半托双口径公式、货源甄别优先级），或从导航页专家卡片「复制人设提示词」。
- **实测锚点**（验收用，2026-11-09）：
  - 全链路：KJM 马桶清洁片 TEMU 德国站 €5.05 → 1688 image_search 命中 3 精准货源（officialScore 0.74~0.80）→ 阶梯价 3件¥3.5/100件¥3.0/200件¥2.5（10片装）→ 参考重 65g → 供应商「跨境出口专供=是/下游平台含 temu」
  - 全托供货价底线 ≈ ¥9.0~9.5/30片；站内零售倒推 TEMU 核价区间 ¥15.6~23.4（40%~60% 经验估算）→ 有空间

### 1688 图搜双引擎实测结论（2026-11-09）

| 引擎 | 适用 | 实测 |
|---|---|---|
| `image_search`（寻源） | **主引擎**：找同款货源+阶梯价+供应商 | ✅ TEMU 图直搜命中 3 候选，带 quantityPrices/weight1/跨境专供标识 |
| `global_image_search(platform=1688)` | 辅引擎：全网价格分布广撒网 | ⚠️ 偶发 500（重试即成功）；返回 30 候选但混入蓝泡泡/洁厕棒等非同款，须按 levelName 过滤 |

---

## 专家六：TEMU店铺专家

- **ID 建议**：`temu-mall`
- **平台**：TEMU
- **场景**：竞品监控
- **模型建议**：主力模型，温度 0.3
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_mall_search
  mcp__yunqi-data__yq_mall_detail
  mcp__yunqi-data__yq_goods_search
  mcp__yunqi-data__yq_dict_lookup
  mcp__yunqi-data__yq_quota_status
  ```
- **知识库绑定**：无
- **绑定技能**：TEMU店铺分析、TEMU商品解析、TEMU竞品监控
- **简介**：TEMU 店铺分析：标杆店挖掘（明星店/Y2店/老店）、竞店监控、SKU 与类目周销结构、反查店内爆款、覆盖站点分析。
- **开场白**：
  > 你好！我是 TEMU 店铺专家。可以帮你：按销量/评分/粉丝筛店铺找标杆（如"全托管家居类日销TOP店铺"）、定向挖明星店(mall_star)/Y2店(pre_order)/2022年开店的资深老店、看店铺详情（SKU规模/类目周销占比/覆盖站点）、反查某个店铺在卖什么爆款。给我店铺ID、店铺名或筛选条件都行。
- **核心能力**：多维筛选找标杆店铺（销量/评分/粉丝/开店时间）/ 明星店(mall_star)与Y2店(pre_order)定向挖掘 / 店铺画像（SKU规模/模式判断/覆盖站点）/ 类目周销占比结构分析 / 反查店内爆款（mall_ids）/ 竞店对比
- **参考提示词**：
  1. 找出TEMU全托管日销TOP10的家居店铺
  2. 分析店铺 56492256536 的经营情况和爆款结构
  3. 帮我找几个TEMU明星店铺看看他们在卖什么
  4. 对比这两家TEMU店铺谁的类目更聚焦（给我两个店铺ID）
- **人设 System Prompt**：见 Hub 源码 `BASE_EXPERTS → exp-temu-mall → sysPrompt`（含 mall_star/pre_order 特有筛选、opts 类目占比框架、mall_ids 反查纪律）。
- **实测锚点**（验收用，2026-11-09）：shiny party(ID 56492256536)=全托/1705 SKU/12.1万评论/4.8分/opened_at=20220901/26站点/日销8964件；类目结构=餐厨布艺24.2%+节日聚会17.7%+窗饰9.1%；店内反查889动销SKU，爆款=圣诞枕套 日本站円459/日销480、线缆整理夹 €4.32/日销303/总销5.9万。

---

## 专家七：TEMU大盘专家

- **ID 建议**：`temu-market`
- **平台**：TEMU
- **场景**：分销选品（市场调研子场景）
- **模型建议**：主力模型，温度 0.4（分析框架下允许适度推理）
- **MCP 绑定（工具白名单）**：
  ```
  mcp__yunqi-data__yq_market_semi
  mcp__yunqi-data__yq_brand_search
  mcp__yunqi-data__yq_dict_lookup
  mcp__yunqi-data__yq_goods_search
  mcp__yunqi-data__yq_quota_status
  ```
- **知识库绑定**：无
- **绑定技能**：TEMU类目大盘、选品报告生成
- **简介**：TEMU 市场分析：半托大盘容量与趋势（站点/类目下钻）、价格段与销量段分布、品牌集中度，回答"该不该入场"。
- **开场白**：
  > 你好！我是 TEMU 大盘专家。可以帮你：看半托管大盘容量（多少商品/店铺/月GMV）并按站点+类目下钻、看每日增长趋势、价格段与销量段分布（找空缺价位）、品牌集中度分析，帮你判断一个类目该不该入场。⚠️ 全托管大盘接口暂不可用，全托需求我用商品搜索聚合估算（精度打折会注明）。说个站点+类目就行。
- **核心能力**：半托大盘容量评估（站点×类目下钻）/ 每日趋势序列与增长判断 / 价格段/销量段分布与空缺价位 / 品牌集中度与头部竞争分析 / 全托大盘降级估算（goods_search 聚合）/ 入场可行性结论
- **参考提示词**：
  1. TEMU美国站家居半托管还能进吗
  2. 美国站半托大盘哪个二级类目增长最快
  3. 家居类目什么价位段竞争最小销量最高
  4. SANRIO品牌在TEMU占多大份额
  5. 全托管的清洁用品大盘帮我估一下
- **人设 System Prompt**：见 Hub 源码 `BASE_EXPERTS → exp-temu-market → sysPrompt`（含六步分析框架、market_fully 降级纪律、brand_search 参数坑）。
- **实测锚点**（验收用，2026-11-09）：美国站半托全量=4883万商品/44.2万店/月销1.54亿件/月GMV $9.93亿/动销店57%；美国站×家居(36)=876.8万商品/19.25万店/月销2629.7万件/月GMV $1.51亿/客单价$5.7；二级类目=家居装饰月销406万件(8.5万店)、节日饰品204万件(5.2万店)；71.7%商品零销量；品牌 SANRIO=18553店/98万SKU/月销184.9万件。

---

## 随行技能资产（后台 #/skills 同步用）

| 技能 | 状态 | 底稿位置 |
|---|---|---|
| OZON利润空间测算 | ✅ 全链路对话实测过（连衣裙TOP8利润率38.7%~68.3%） | `skills/ozon-profit-calc.md` |
| Ozon选品搜索 | ✅ 后台已有 v20261106143542 | `skills/ozon-selection-search.md` |
| TEMU 7技能（选品搜索/竞品监控/类目大盘/商品解析/店铺分析/利润测算/竞品调研） | ✅ 2026-11-09 接口实测后转为接口式 | Hub 技能 Tab（TEMU 标签） |
| 其余技能指令（历史口径） | 当时 Hub 展示（1688×7/Ozon×7/亚马逊×4）；亚马逊当前八技能见文末 | 历史技能 Tab，仅供追溯 |

## 知识库资产（后台知识库模块部署用）

| 文档 | 版本 | 位置 |
|---|---|---|
| 佣金类目表 | 2025-12-01 生效 | `knowledge/佣金类目表-2025-12-01.md` |
| 佣金规则-中国跨境 | 检索 2026-10-16 | `knowledge/佣金规则-中国跨境-2025-12-01版.md` |
| 物流线路摘要 | 2026-03-25 生效 | `knowledge/物流线路摘要-2026-03-25.md` |
| 物流规则-中国跨境 | 检索 2026-10-16 | `knowledge/物流规则-中国跨境-2026-03版.md` |

## 搬运步骤（后台就绪后）

1. 后台创建 7 个专家（按上方字段逐项填写；人设从 Hub 卡片复制）——Ozon×3 / TEMU×4（选品/核价/店铺/大盘）
2. 配置每个专家的 MCP 工具白名单（上方代码块内容逐条加；TEMU核价专家需同时勾 yunqi-data + 1688 两库）
3. 部署知识库 4 篇文档 → 绑定到 Ozon 选品专家（TEMU 四专家暂无知识库，留空）
4. 用「实测锚点」逐个验收：同一提示词在后台专家里跑，结果应能对上锚点数据
5. 全部通过后开「上架」开关，Ozon/TEMU 选品专家设为对应平台默认

---

## 附：提示词验证矩阵（2026-11-08 对话内实测记录）

> 测试策略：不做全量参数组合（goods_search 180个参数无法穷举），按 P0核心场景 / P1参数类别抽样 / P2真实话术组合 三层验证。以下全部真实调用通过。

### 选品专家（yq_ozon_goods_search 为主）

| # | 类别 | 参数 | 实测结果 |
|---|---|---|---|
| 1 | 时间窗 | minCreateDate=2026-10-09 + category | ✅ 975款近30天新品，createDate 返回正常 |
| 2 | 价格带 | minPrice=500 & maxPrice=1500 | ✅ TOP为洗鞋袋₽559/₽574万 |
| 3 | 卖家类型 | storeType=1（跨境） | ✅ 家居跨境TOP：垃圾桶₽435/₽488万 |
| 4 | 转化率 | minConvToCart28=5 | ✅ 674款，垃圾袋转化5.28%月销5205件 |
| 5 | 中文关键词 | skuNameZh=连衣裙 | ✅ Dress Samy 2409件（中文标签检索可用） |
| 6 | 销量排序 | sort=[{soldSum28:desc}] / [{soldCount28:desc}] | ✅ 两种口径均正常 |

### 店铺专家（yq_ozon_mall_search/detail 为主）

| # | 类别 | 参数 | 实测结果 |
|---|---|---|---|
| 1 | 类型+SKU规模 | storeType=1 & minSkuNum=500 & minScore=4.8 | ✅ Rhapsody 8738件/日居首；**minSkuNum≥500 可自动滤自营脏数据** |
| 2 | 新店筛选 | minCreateAt=20261001 & maxCreateAt=20261108 | ✅ 36家新店，最早开店4天；**必须用 20261001 日期格式** |
| 3 | 店铺详情 | mall_detail(id=2892839) | ✅ openTime="1 年"/level=3 |
| 4 | 反查商品 | goods_search(sellerId=2892839) | ✅ 店内1254 SKU，爆款创可贴6万件 |
| ⚠️ | 失败样本 | openVal=1 & openUnit=月 | ❌ 0结果——开店时长筛选不可用，用日期区间替代 |
| ⚠️ | 失败样本 | 参数名 score=4.5 | ❌ 参数校验直接报错——正确名是 minScore/maxScore |

### 大盘专家（market_stat / brand_search 为主）

| # | 类别 | 参数 | 实测结果 |
|---|---|---|---|
| 1 | 全站大盘 | key=all | ✅ 6800万SKU/29.4万店/月销售额2558亿₽/月销3.2亿件 + 10个价格段(statPrices) + 每日序列 |
| 2 | 类目大盘 | key=17028714 | ✅ 月销228万件/8.29亿₽ |
| 3 | 品牌查询 | brandName=Samsung（正确大小写） | ✅ 正牌 Samsung：749店/1万SKU/月销10.2万件 |
| ⚠️ | 失败样本 | brandName=samsung（小写） | ❌ 0结果——**大小写敏感** |
| ⚠️ | 陷阱样本 | brandName=XIAOMI | ⚠️ 返回 XIAOMIMI/XIAOMILA 等近似杂牌——须按 mallsNum/skuNum 规模核对 |

### 结论

- P0（用户真实话术）+ P1（参数类别）已全通过；P2 组合即 refPrompts 本身，已覆盖
- 3 个新坑已固化进专家人设（minSkuNum 滤脏数据 / 开店日期格式 / 品牌大小写）
- 后台验收时：按本矩阵逐条在后台专家里重跑，结果对上锚点即通过

---

## 全专家对话内实测验收矩阵（2026-11-09 晚间 · 全部 19 专家）

> 测试方式：每个专家抽 1~2 条代表性参考提示词，在对话内以真实 MCP 接口跑通，验证「人设→工具链→输出」闭环。

| 专家 | 实测提示词 | 主接口 | 结果 | 复测发现/修正 |
|---|---|---|---|---|
| Ozon选品 | 家居类目28天销售额TOP | yq_ozon_goods_search | ✅ | 首调超时重试即成；数据与 11-08 锚点一致（感应垃圾桶₽2967/4412件居首），goods_search 免费版可稳定复现 |
| Ozon店铺 | 日销TOP跨境店铺(minSkuNum=500) | yq_ozon_mall_search | ✅ | minSkuNum≥500 滤脏数据再次验证有效；Rhapsody 8738件/日仍居首 |
| Ozon大盘 | 家居类目大盘(17028714) | yq_ozon_market_stat | ✅ | ⚠️ 新发现：items 序列日期空洞加剧（87天仅60点）；**mallsNum 10月底起断崖失真（2万→583）**，人设已写明近期勿引用该字段 |
| Ozon大盘(品牌) | Samsung 品牌查询 | yq_ozon_brand_search | ✅ | orderByColumn=monthSales 正常；749店/月销10.86万件 |
| TEMU选品 | 美国站半托 storage box | yq_goods_search | ✅ | 保鲜盒套装 $8.98/日销838 居首，regions+半托+标题组合稳定 |
| TEMU核价 | （本日下午已全链路实测） | 5接口联动 | ✅ | 见专家五锚点 |
| TEMU店铺 | 全托家居日销TOP+明星店核验 | yq_mall_search | ✅ | ⚠️ 新发现：**mall_star 作筛选参数会被忽略**（_note 报字段不存在），正确姿势=日销榜取头部后用返回的 star_seller_time 字段核验（实测头部5店全部在榜明星店）；opened_at 两接口有7天差（20220901 vs 20220908），表述用「2022年9月初」 |
| TEMU大盘 | 家居类目下钻+玩具品牌榜 | yq_market_semi + brand_search | ✅ | optId 下钻稳定；brand_search+opt_ids=[204] 组合正常，SANRIO 居首 |
| 亚马逊选品 | Sports Water Bottles 类目报告 | youweiAI-amazon category_report | ✅ | Top100 月销155.2万件/$4664万（与 11-09 早间锚点156.5万/$4698万差<1%，口径稳定）；自营占73.91%、Owala 36.93%+STANLEY 16.44% 双寡头格局不变；退货率9.85%/转化率7.0%/平均上架1158天 |
| 亚马逊店铺 | 类目中国卖家筛选 | youweiAI-amazon seller_search | ✅ | 18 个 CN 卖家，RAYMYLO Direct 头部（$57.1万/月、top3集中度100%）；is_chinese_seller=1+node_id 组合稳定 |
| 亚马逊选品(新品) | water bottle 2026新品+月销5000+ | youweiAI-amazon product_search | ✅ | STANLEY IceFlow 2.0（2026-01上架）月销5.1万件/$179万居首；**buybox_seller=Amazon 占比高**是重要信号；混入少量非水杯品（Boppy哺乳枕），按 sub_category 过滤 |
| 亚马逊关键词 | water bottle 关键词详情 | youweiAI-amazon keyword_detail | ✅ | ⚠️ keyword_list 热词榜 504 超时（重试1次仍失败，属接口侧问题）；keyword_detail 稳定：月搜166.4万/CPC $1.05/首页100坑位(52自然+13广告)/hijack 26%——跟卖率高企是水杯类目特征 |
| 亚马逊评论洞察 | Owala 差评100条+HP联名款 customers_say | youweiAI-amazon product_reviews + customers_say | ✅ | 差评五主题归纳再次验证（弹簧断裂/吸管脱落/漏水/杯架不兼容/质保踢皮球）；HP联名款正面话题：quality 240提及/负面仅7——正面壁垒数据可交叉使用 |
| 1688选品 | 收纳盒30天销售额降序 | product_search_list | ✅ | 与 11-09 早间锚点一致（台球杆盒¥125/1万件居首）；⚠️ 「收纳盒」仍混入注塑机（¥83.6万），levelName 二次过滤纪律有效 |
| 1688榜单 | 收纳品类月榜 | product_billboard_list | ✅ | ⚠️ 新发现：keyWord+sortField 组合返回0（去掉 sortField 即命中10000条）——榜单接口 keyWord 与自定义排序可能冲突，空结果先去排序参数重试；品类月榜 TOP=大容量收纳箱¥5.01/13488件/复购64.6% |
| 1688新品 | 收纳盒新品 | product_trend_new_list | ✅ | ⚠️ 新发现：**MCP schema 要求 titleTags 必填**，只传关键词报校验错，显式传 ["289794"] 即可；命中仿藤编手提箱15万件（老锚点同款，稳定） |
| 1688监控 | 加监控+监控池查看 | monitor_offer_add/list | ✅ | ⚠️ 参数格式：offer_add 收**链接或ID**（顶层 offerId 字段，不是 req 对象）；新加监控当天数据为 null（T+1同步）再次验证；监控池历史商品数据正常回填 |
| 1688店铺 | 店铺榜查询 | shop_rank_list | ❌ | 五榜仍返回空（comprehensive/cross_border 均试），与早间结论一致：服务端暂无数据，降级路径（搜索反查+monitor_shop_analysis）仍有效 |

### 汇总

- 19 专家实测：**18 通过 / 1 接口侧不可用**（1688店铺榜，已有降级路径兜底）
- 新增人设修正 4 处：Ozon大盘（mallsNum 失真）/ TEMU店铺（mall_star 筛选无效→字段核验法）/ 1688榜单（keyWord+sortField 冲突）/ 1688新品（titleTags schema 必填）
- 接口侧已知问题 3 个：yunqi ozon goods_search 偶发超时（重试即成）/ youweiAI-amazon keyword_list 504 / 1688 shop_rank_list 空数据
- 后台验收：按本矩阵重跑，对上锚点即通过

## 原辅助数据源专家五件套（2026-11-09 下午新增 · 24 接口全实测后搭建）

> 背景：原辅助数据源（youweiAI-amazon MCP）接口组评估可做 6 个专家，用户拍板先做 5 个（选品/关键词/大盘/评论/流量）。命名规范延续「数据源前缀+平台+角色」。已写入 Hub（exp-ss-amazon-*，status=built，各带实测 demo）。

| 专家 | id | 接口 | 可行性结论 |
|---|---|---|---|
| 原辅助数据源亚马逊选品专家 | exp-ss-amazon-sel | product_node / competitor_lookup / asin_detail / asin_competitor / asin_prediction / bsr_prediction / market_research_statistics | ✅ 全部可用（⚠️ product_research 的 keywords 参数无效，见坑1） |
| 原辅助数据源亚马逊关键词专家 | exp-ss-amazon-keyword | keyword_research / keyword_research_trends / keyword_miner / keyword_order / keyword_conversion / aba_monthly / aba_weekly / aba_trend | ✅ 全部可用（⚠️ month 滞后一月 / weekly 不能传 date / Acos min-max 顺序异常） |
| 原辅助数据源亚马逊大盘专家 | exp-ss-amazon-market | market_research(_statistics) + 8 分布接口 + product_node / google_trend | ✅ 全部可用（⚠️ market_research 传 nodeIdPath 返回空，单节点下钻走 statistics） |
| 原辅助数据源亚马逊评论洞察专家 | exp-ss-amazon-voc | review + asin_detail | ✅ 可用（星级/SKU/时间窗/图视频差评筛选齐全；无 AI 话题计数，与 原主数据源 版互补分工） |
| 原辅助数据源亚马逊流量专家 | exp-ss-amazon-traffic | traffic_keyword(_stat) / traffic_extend / traffic_listing(_stat) / traffic_source | ✅ 全部可用（⚠️ traffic_keyword 带 month 返回空 / extend queryType=1 空 / relations=["SP"] 空） |

### 原辅助数据源接口参数坑（2026-11-09 实测，人设已内置）

1. **product_research 的 keywords 参数无效**：传 "water bottle" 返回全库商品（Nespresso 咖啡胶囊，total 7848 万）——商品关键词筛选一律用 competitor_lookup(keyword+matchType=3 精准)，不要用 product_research。
2. **market_research 传 nodeIdPath 返回空**（total=0）：类目下钻用 market_research_statistics + 8 个分布接口（都支持 nodeIdPath）；market_research 只用 departmentKeyword 或纯筛选条件。
3. **competitor_lookup 不传 matchType 默认=2 模糊匹配**，噪音大（water bottle 模糊出蛋白奶昔）；有关键词必传 matchType=3。
4. **keyword_research 的 month 滞后一个月**：传 202610 返回 2026.09 数据，输出必须标注数据月份。
5. **aba_research_weekly 不能传 date**：传上周六日期（20261107）反而报错「只能查询上一周」；不传 date 默认返回上一周。
6. **keyword_conversion 的 Acos min/max 顺序异常**（min:6.78 > max:0.084），Acos 区间不可信，只引用均值。
7. **keyword_order 的 page 从 0 开始**（其他接口从 1，不一致）。
8. **traffic 家族**：traffic_keyword 带 month 必空（默认参数调用）；traffic_extend queryType=1（畅销变体）返回空用 0；traffic_listing relations=["SP"] 空，先 traffic_listing_stat 看 fbt/vav/bab 哪个有量再查明细。
9. **变体级销量共享**：同 parent 变体 units 相同（父体口径），amzUnit 才是变体自营近期销量。
10. **bsr_prediction 的 categoryId 是一级类目 code**（284507=Kitchen & Dining），传三级节点失败。

### 实测锚点（2026-11-09 US 站，锚点商品=Owala B0BZYBSRNF 沿用 原主数据源 版）

- competitor_lookup(water bottle 精准)：Owala FreeSip 系霸榜 TOP5，Alpine Sport 24oz 月销 18.8 万件/$659 万/毛利率 68.05%
- asin_prediction：2026-10 月销 187,455 件；峰值 2026-08=31 万件（8 月旺季/冬季淡季 9.6 万）
- bsr_prediction(Kitchen, BSR#1)：日销 6,842 件/月销 20.5 万件
- keyword_research(2026.09 数据)：water bottle 月搜 185.9 万/购买率 2.09%/PPC $1.17/供需比 16.17；keyword_miner：owala 月搜 321 万（品牌词是品类词 1.9 倍）
- 大盘(3395091)：Owala 品牌份额 25.86% 一家独大未过半；40$+ 高价段 11 款占销量 33.31%；2025-2026 年新款占 63% 销量（新品窗口大开）；中国卖家仅 13%；有 A+ 占 90%
- review(1-2星)：头号差评主题=漏水（4/5 条，与 原主数据源 版「弹簧断裂」互补）；16oz/24oz 差评集中 32oz 少；差评池 2,254 条
- 流量(traffic_keyword_stat)：1,343 流量词/自然 1,330/AC 79/广告 0=纯自然打法；owala 词吃 24.7% 流量；121 关联位全免费（fbt 41+vav 62+bab 12）

### 与 原主数据源 版分工边界

- 选品：原主数据源 主库（利润四件套直返）为主，原辅助数据源版强在 competitor_lookup 关键词筛品+asin_prediction 14 个月走势+bsr_prediction 销量换算
- 关键词：原主数据源 强在单词坑位竞争/跟卖率/CPC 趋势；原辅助数据源强在 ABA 6 模式市场榜+keyword_research 四维筛选+58 个月趋势
- 大盘：原主数据源 category_report 一站式 19 维；原辅助数据源 8 个分布接口更细（国籍/EBC/上架年份）
- 评论：原主数据源 有 AI 话题计数+特征销量份额；原辅助数据源有 SKU 级差评+时间窗+图视频筛选
- 流量：原主数据源 是关键词维度（词位对比）；原辅助数据源是 ASIN 维度（流量词结构/关联商品/免费付费比）——两库互验


## 维护约定

- Hub（skill 仓库）是专家人设的**单一事实源**；后台录入后如有改动，反向同步回 Hub
- 历史维护流程曾包含提交与推送；本次仅更新限定文件，不提交或推送。公开文案须遵守文末当前亚马逊保密规范。

---

## 2026-11-10 增量：1688 单专家、八技能路由（覆盖旧六专家方案）

> 上文历史清单和 2026-11-09 实测矩阵保留作历史记录；其中 1688 旧六专家的配置方案已由本节的 `exp-1688-sel` 单专家路由覆盖。后台录入 1688 时以本节及当前 TS 映射为准，不再按旧六专家建档。本次将与映射、导航页、版本记录一同提交推送。

- **专家**：`exp-1688-sel`，1688选品专家；平台 `1688`，状态 `built`。开场白、简介、能力与参考话术取 `skill/1688-expert-skill-map.ts` 的 `a1688Expert`；绑定以下八个技能。`skill/versions.json` 新增 `expert:exp-1688-sel` 的 `merge` 快照和八条 `skill:<id>` 的 `create` 快照，均保留原历史条目。
- **对应关系**：TS 导出 `a1688Expert` / `a1688Skills` / `a1688ExpertSkillIds`；导航页 `skill/index.html` 末尾模块通过 `import ... from './1688-expert-skill-map.js'` 加载浏览器 JS。每条技能的页面 `prompt` 是 `instructions`、空行、`## 执行步骤` 与从 1 编号的 `steps`、空行、`## 可用工具` 与逐行 `- ` 前缀的 `tools` 按 `\n` 拼接；专家 `sysPrompt` 是 `你是` + `name` + `。` + `desc`，再以两个换行连接 `routing`、`disciplines`。页面显示版 demo 会将原始 `kpis` 转成 `{label,v}`、`table` 转成 `{head,rows}` 并把 `source` 附到 `note`；版本快照的 `demo` 存的是 TS 原始 `JSON.stringify(skill.demo)` 全量数据，专家 demo 对应首技能原始 demo，保留 `title/date/kpis/flow/table/note/source`，没有用显示版代替原始证据。
- **同步校验**：浏览器 JS 已按字节同步 TS，页面从 JS 导入；版本快照的人设提示词、各技能调用提示词和原始 demo 均与映射一致。更新 TS 后需同步 JS、核对两者哈希及页面实际渲染，再追加版本记录并推送。店铺榜 `shop_rank_list` 空结果和商品搜索降级、新品三条错类样本的返回数值以本次映射为准。

| 入口意图 | 技能 ID | 后台场景 | 工具（`mcp__1688__` 前缀） |
|---|---|---|---|
| 条件找品、跨境筛选 | `skill-1688-conditional-search` | product-selection | `product_search_list`, `cross_border_product_search_list` |
| 商品榜 | `skill-1688-billboard` | product-selection | `product_billboard_list` |
| 新品发现 | `skill-1688-new-products` | product-selection | `product_trend_new_list` |
| 以图找货 | `skill-1688-image-search` | product-selection | `image_search`, `global_image_search`, `ali_offer_sku_prices` |
| 单品深挖 | `skill-1688-product-deep-dive` | product | `product_info`, `ali_offer_realtime_detail`, `ali_offer_sku_prices` |
| 店铺核验、店铺榜空时降级 | `skill-1688-shop-verification` | shop | `monitor_shop_analysis`, `shop_rank_list`, `product_search_list` |
| 监控池读取 | `skill-1688-monitor-read` | competitor | `monitor_offer_list`, `monitor_shop_list` |
| 报价利润情景 | `skill-1688-profit-scenario` | profit | `ali_offer_sku_prices` |

**后台 MCP 白名单（八技能去重并集，13 个）**：绑定 1688 MCP，逐项勾选以下工具；单技能只开放其表内所列工具。页面适配的 `mcpTools` 会去掉 `mcp__1688__` 前缀，后台按实际工具全名绑定。

```text
mcp__1688__product_search_list
mcp__1688__cross_border_product_search_list
mcp__1688__product_billboard_list
mcp__1688__product_trend_new_list
mcp__1688__image_search
mcp__1688__global_image_search
mcp__1688__ali_offer_sku_prices
mcp__1688__product_info
mcp__1688__ali_offer_realtime_detail
mcp__1688__monitor_shop_analysis
mcp__1688__shop_rank_list
mcp__1688__monitor_offer_list
mcp__1688__monitor_shop_list
```

**2026-11-10 实测边界与验收**：普通磁吸收纳盒检索原始 `totalCount=10000` 未清洗，跨境 `totalCount=67` 也需逐条去噪；商品榜请求 `date=2026-10-01` 与调用日不同；新品样本的沥水碗架、餐具盒、蛋糕模均属错类。单品 `734800252457` 近30天 48 笔 / 152721 件 / ¥610884；白色磁吸 166*122 的 `skuId=5251111954228` 参考 ¥4.6，不能借用无磁吸 ¥4 或 500 件起阶梯价。店铺 `https://huaijan.1688.com` 核验见店铺分析；本轮店铺榜 `shop_rank_list` 返回 `code=200,totalCount=0`，降级按商品找店铺链接再核验，不得写成榜单上榜。商品监控池 `total=5`、店铺池 `total=10` 属一次分页快照，缺失字段留 `null`，`monthSalesVolume` 单位未核实。图搜本轮 `image_search` 返回 504，`global_image_search` 返回 code 500，无本轮候选；同日历史报告 `reports/wig-profit-batch-a.json` 的成功图搜仅有待拿样候选，与本轮图片和结果分开记录。利润例中 ¥20 售价、¥3 运费、¥2 其他费用为指定假设，配 ¥4.6 SKU 参考价得情景毛利 ¥10.4、毛利率 52%；采购结算价及税损未核，绝非真实利润。验收时按各技能 demo 的 `flow/source/date` 回看请求与口径，不把上文 2026-11-09 旧数字混入本次 demo。

---

## 当前亚马逊迁移规范（youweiAI-amazon，八技能单专家）

- **公开身份**：一个亚马逊选品专家；公开名称及数据来源统一写作 `youweiAI-amazon`。历史独立选品/店铺/大盘/关键词/评论/流量专家均只作档案，不再作为并列专家导入或展示。
- **技能绑定**：以下八项已在 `amazon-expert-skill-map.ts` 与 Hub 页面绑定同一个亚马逊选品专家。前七项沿用稳定 ID，第八项已实现路由与文档，但新增卖家接口尚无本次实测记录；页面人设 `sysPrompt` 已扩充八路由、核验口径与交付规范。

| 技能 | 稳定 ID / 迁移规划 ID | 当前验收边界 |
|---|---|---|
| 选品搜索 | `skill-amazon-selection-search` | 旧记录有调用样本；具体条件与结果需按历史日期核查 |
| 竞品分析 | `skill-amazon-competitor` | 旧记录有调用样本；流量与评论支线以各轮记录为准 |
| 关键词挖掘 | `skill-amazon-keyword` | 旧记录有调用样本；榜单/趋势支线以各轮记录为准 |
| 类目体检 | `skill-amazon-category-trend` | 旧记录有节点、报告及趋势样本；冲突字段需隔离 |
| 商品解析与评论洞察 | `skill-amazon-product-parse` | 旧记录有样本；评论摘要不能冒充单子体结论 |
| 利润测算 | `skill-amazon-profit-calc` | 旧记录有接口估算样本；未计采购、头程、广告与退货 |
| 选品报告 | `skill-amazon-report-gen` | 旧记录为真实返回的串联复用，不是独立接口实测 |
| 卖家店铺分析 | `skill-amazon-seller-analysis` | 已有路由与参数纪律；新增卖家接口尚待业务实调验收 |

- **路由原则**：按用户主意图选择技能，复用同轮已有数据；店铺相关问题由卖家店铺分析处理，实际接口未验收时披露证据边界。历史四技能、七技能和独立关键词专家文档不得作为当前八技能的调用指南。
- **公开保密规范**：对外标题、简介、提示词、演示、注释和版本摘要只使用 `youweiAI-amazon`；不公开旧数据源品牌或旧 MCP 服务专名。接口方法名、参数名及可核查的历史响应数据按技术语义保留，但历史调用不得包装为新实测；具体服务绑定须由实际运行环境配置核对，不凭文案臆造 MCP 命名空间。
- **上线校验**：当前页面与映射已发布一个专家、八项技能；人设提示词在页面「提示词」标签查看并可全文复制。八项技能卡片的当前调用指令均已补成分段执行规范，技能弹窗默认显示当前提示词；点击版本记录才显示历史快照，不能把历史摘要当当前指令。此次为提示词和显示口径完善，不等同新增接口业务实调；第八项卖家工具链的业务返回仍待验收，验收前不得写“八技能均已跑通”。
- **2026-11-12 Open WebUI 实调验收**：模型 `amazon-sorftime-selection-assistant` 界面名 `youweiAI-amazon选品专家`，已绑定八项 `youweiai-amazon-*` 技能且目标模型只选择这八项；绑定现有亚马逊数据工具。八项均在该模型真实对话中触发技能并取证或复用证据：选品搜索 [回归](https://local.dianleida.net:21996/c/4d4a23e2-6572-46c3-b27c-0397950fb3b3) 双词第1页各20条、重复14、去重26、相关5；竞品、关键词、类目均有首次实调对话；商品评论 [回归](https://local.dianleida.net:21996/c/aac8fa25-f935-400a-9a40-3643e353e9ff) 读取100条原文并提供逐条编码，话题汇总另列；卖家 [回归](https://local.dianleida.net:21996/c/31803aa5-761b-4eb9-8b7c-5e791a1eb226) 定位 RAYMYLO Direct 并核店铺详情及商品，店铺级与商品级差额改为统计口径或时点待核；利润 [回归](https://local.dianleida.net:21996/c/7a34e2de-1cf2-4926-b16d-d10a27169aad) 核 B0DGHBV6XS 平台费与用户成本下 $6.62 条件利润，coupon=0 不称折后价；选品报告 [回归](https://local.dianleida.net:21996/c/a4628197-5223-4ad0-9b30-b4ec2582f033) 类目商品份额 Top3=61.59% 与 Top5=49.08% 逆序，已禁用整个商品份额维度并撤回新品流量推断。以上均为当次对话结果，不代表全部参数组合通过；报告第1页品牌计数复核后 Owala 为6款、各品牌合计20款；卖家报告余数13.13%与所列34行合计12.42%相差0.71个百分点，不能归给该34行，差额原因待核。候选日期、父体、金额冲突仍列待核。此前“新增卖家接口尚未实调”的记录仅描述发布前状态。
- **2026-11-12 方法优化验收**：参考外部选品开发、运营与利润材料的九模块结构、候选二次验证、评论证据链及实物测试方法，分别落到八项现有技能。搜索留可追溯底表；类目/竞品/店铺占比注明有效样本分母；关键词逐词追溯；评论原文关联部件、变体和待测动作；利润仅在成本与费率规则齐全时计算售价/运输/采购量情景；报告缺数据的模块标未核实。接口费用不等于真实净利，售价乘估计月销不称实际销售额；不设固定重量/费率或利润门槛，不采用操控交易或评论的建议。本次仅修改工作流和提示词，未新增接口实调或样品测试。
- **2026-11-12 八条新对话回归（Open WebUI，当前版技能）**：八项均观察到 `view_skill`，并按意图调用真实工具。选品搜索[连衣裙](https://local.dianleida.net:21996/c/9e2cc3b2-ddf7-4931-8b88-2a9035fda5c6)跨节点筛选得4个详情候选、2个按 `listing_date` 进入近30天，但原报告将41条去日期诊断与20条仅日期诊断混成65条，并从有限入口下“仅有2款”“主节点老品”结论；已在技能增加入口/页码/日期交叉复核并追问。竞品[运动水壶](https://local.dianleida.net:21996/c/ca40cda3-0a7e-4541-af6e-a34aa30a88e7)回归撤回重量2 pounds证明32 fl oz容量、无费率表下15%佣金比较，复算三款估计销售额乘积差额均为0。关键词[mahjong bag](https://local.dianleida.net:21996/c/cd329d5a-a5a9-4c4b-a362-f0746f13d448)回归隔离0点击但非0购买的漏斗，撤回无可核分母的新品机会和不同窗口同比。卖家[店铺](https://local.dianleida.net:21996/c/220faedd-dda6-44e4-bef8-05c497651c30)核详情98件、商品入口第1页11条且1页、诊断第2页空，撤回11/98覆盖率。利润[水杯](https://local.dianleida.net:21996/c/ebf71247-e61e-4181-8e2a-aa27a125d7de)回归对齐 `days_on_shelf=787` 与 `online_date`、另列 `listing_date` 878天及待核差异，并只称当前购物车卖家所在地US，条件利润仍$6.62。类目[水杯](https://local.dianleida.net:21996/c/dca9be73-7a9a-4431-a08c-da58fc04d643)已弃用逆序商品份额，但报告Top100聚合1988131与榜单1390275不同、分层款数122、Top10/20与明细不符及新品上限推断待修。评论[ASIN](https://local.dianleida.net:21996/c/8efbe59a-1ef9-47d0-a87d-338eee55d067)列出54次主题命中含1条交叉，实际53条独立，所谓“其余46条”应待核，且未列其余编号不能称100条全部编码。选品[报告](https://local.dianleida.net:21996/c/ec423a22-be0b-4844-9850-9248d24b8d70)已弃用逆序商品份额，仍用假定15%校佣金并从Top100样本推冷启动；类目/评论/报告三技能已保存补充规则并发起回归。类目回归将1988131件的报告窗口聚合与1390275件的榜单快照分列，撤回新品月销上限与“品牌垄断强化”，商品维度及复算冲突的Top10/20份额弃用，分层款数122≠100也弃用。评论回归确认54次主题命中仅53条独立评论、其余47条未逐条映射，撤回“全部100条已编码”，日期字段冲突标待核；计算沙箱两次断开后改用列式手算。报告回归撤回假定费率验佣金，$6/$39.99仅为算术比例，三个维度份额组因异常停用，保留已核Top100样本事实，缺采购与头程不报真实净利。连衣裙回归分离41条去日期预筛、20条仅日期诊断与4条全条件详情候选，严格日期筛选留2条；不再从有限页推全类目“仅有”。八条对话及修订回归均有最终回答，属于所测问话和数据快照的通过记录，不代表全部参数组合或跨日期稳定性。
- **2026-11-12 多条件/预览二轮**：在 Open WebUI 同一专家新增八项场景对话：[搜索30天严格条件](https://local.dianleida.net:21996/c/f6ff92c5-79a4-428d-9fac-f3968eb9aacb)、[竞品三ASIN](https://local.dianleida.net:21996/c/df4c8867-d5b9-4a6c-9a67-7b4d4055f716)、[关键词长尾+异类反查](https://local.dianleida.net:21996/c/06d6088e-e1fc-46f8-8a3f-c28bacdfca24)、[类目完整月](https://local.dianleida.net:21996/c/1d8685c2-6add-439b-a3e3-8916faac4968)、[商品评论](https://local.dianleida.net:21996/c/11bb1f1a-90d6-4eae-9ca0-ef3384eb27a1)、[店铺分页](https://local.dianleida.net:21996/c/df1f03c5-631e-4a1f-91a8-b20962502b78)、[利润](https://local.dianleida.net:21996/c/81394c1d-8e01-4a60-a7fc-9d48c094dc4c)、[完整报告](https://local.dianleida.net:21996/c/866ab571-de0e-46b3-9dae-694a9b224659)。八条均加载对应技能并调用工具；搜索30天候选0，另开90天仍保持价格/月销/FBA/卖家国别条件，实得1个详情核验候选；关键词反查ASIN属水杯而非麻将包，已隔离；店铺98件与检索11件的分页冲突已标注；利润按$34.99-$5.93-$6-$8-$2-$1=$12.06，成本敏感性另列假设。初次报告和类目对话只生成聊天内表格并称无法在右侧预览；实测发现把完整 HTML 以标注 `html` 的代码块交付，会出现「预览」并可在右侧渲染。利润、店铺、90天搜索的右侧 HTML 表已通过截图观察（店铺含 KPI、11条图片商品表及异常提示），仅给 `/mnt/uploads/` 路径不能触发预览；完整选品报告也已通过 `html` 代码块在右侧实际渲染，含样本边界、KPI与异常份额弃用说明；其余竞品、关键词、类目、评论尚仅核聊天表格，未验证右侧交互表。店铺商品链接、图片和估计月销售额降序已在右侧看到，主图悬停的320×320效果尚未验明。不要将已生成文件等同右侧已呈现，店铺卡片的11/98只可解释为两套口径并列，不能当覆盖率。
- **2026-11-12 多条件/预览二轮续验**：竞品三 ASIN 初版「预览」右侧空白，追问要求从 `<!DOCTYPE html>` 至 `</html>` 重新输出后恢复渲染；右侧已见三列对比、ASIN 链接、主图占位、价格/月销/FBA/平台费、父子体数和 `2 pounds` 不是 32oz 容量证据的待核提示。关键词长尾报告右侧已见词卡、CPC/需求表和水杯异类反查隔离提示。类目体检重新输出后右侧已渲染节点确认、2026-09/10 完整月趋势、Top100 KPI、分层/异常/结论分区，并标明样本快照边界；评论报告右侧已渲染日期冲突、商品身份、评论窗口和样本限制。利润追加广告 $3 与售价×5%退货损耗后，右侧情景 B 显示单件条件利润 $7.31、利润率 20.89%，相对情景 A $12.06、34.47%下降 $4.75、13.58 个百分点；退货金额 34.99×5%=1.7495 按展示精度计为 $1.75。店铺右侧已见真实图片、标题/ASIN链接、按估计月销售额降序的 11 条明细和 98/11 分页冲突说明，初版主图悬停未出现约定的放大卡；追问重生成带独立 fixed 浮层的完整 HTML 后，右侧实测鼠标悬停第1条与底部第3条主图均出现 320×320 白底圆角大图，底部悬停时浮层向上翻转且保持视口内。右侧边缘翻转尚未单独触发截图核验。该修复只在本条对话新报告内验证，自动生成规则仍待新会话回归。
- **2026-11-13 新对话首轮自动预览回归**：分别新建并实发八项对话，均观察到对应 `view_skill` 和业务工具调用；完整 HTML 代码块在首次回答提供，点击后八项右侧均实际渲染（竞品、关键词、类目、评论、店铺、利润、选品报告，以及严格搜索自动渲染）。证据：[严格搜索](https://local.dianleida.net:21996/c/314f8f26-8238-487f-b104-a61933ee9ccc) 的美国站近30天麻将收纳包 $20–45、月销≥100、FBA、中国卖家全保留，6入口/6页、64原始/50去重、严格有效候选0；[竞品](https://local.dianleida.net:21996/c/e194eae6-46c6-4195-b97b-48429e15720d) 三 ASIN 只核实一款水杯，一款详情空、一款实际为扫地机器人，右侧标不可比，没有强排；[关键词](https://local.dianleida.net:21996/c/c9152443-9b15-4956-b500-4bf447bebc98) 右侧三条麻将在售词与水杯 ASIN 异类反查隔离，缺 CPO/页面平均评论数等字段标缺；[类目](https://local.dianleida.net:21996/c/294f1936-e1b5-4daf-a5ee-eaa84a76f144) 两完整月与 Top100 快照分列，异常 TopN 份额/分层计数禁用，初版模板标签错误经本轮沙箱内重生成后首答右侧可见；[评论](https://local.dianleida.net:21996/c/160f63d9-500a-4748-9497-e7c8f4544a13) 右侧显示日期冲突、100条差评与101条好评窗口、40/126变体样本，不外推父体总销量；[店铺](https://local.dianleida.net:21996/c/01674653-de44-440c-a03f-8a76f1584357) 98件店铺口径与本轮11条商品检索仍分列，部分店铺原值与样本合计冲突已提示口径待核，首答预览已有商品表；[利润](https://local.dianleida.net:21996/c/967f2747-f5a4-44b4-bff0-080cf877639d) $34.99 减平台费 $5.93+$6.00、采购 $8、头程 $2、其他 $1、广告 $3、退货损耗 $1.7495，条件利润 $7.31、利润率20.89%，右侧首次渲染；[选品报告](https://local.dianleida.net:21996/c/fefbf7c3-fb12-4cef-865a-a894c81075dc) 右侧首答呈 KPI、商品表与禁用异常份额提示。首轮成功范围是此八问法及其返回快照。2026-11-13 补验：店铺报告主图右边缘翻转已实测——从对话导出 txt 提取 `<!DOCTYPE html>` 至 `</html>` 的原始 HTML（未改动一字节），经 450px 宽 iframe verbatim 加载后悬停第1行主图，320×320 白底圆角浮层正确翻转到指针左侧（截图核验）；至此浮层跟随/下边界上翻/右边缘左翻三项交互全部实测闭合。窄面板下表格横向滚动可读；其余更窄宽度未逐一测试，不称全尺寸通过。对外验收报告仅写统一品牌与数据口径，内部接口名保留在此技术记录。
- **2026-11-13 侵权排查场景与主图列修订**：[麻将收纳包选品分析](https://local.dianleida.net:21996/c/be75ee09-f6ed-4287-b418-44bb96a3169b)（近180天+月销>10+排除侵权）：专家五路口召回11页202条→去重159→列表筛39（剔除120：套装47/美妆手包26/卡牌10/垫架配件30/无关7）→38详情核验→入选29（轮剔除10：超窗4/美妆1/时装手包2/空返回1/核验后月销≤10 1）→专利两路（tile bag 17条+carrying case 30条，披露单轮上限30未穷尽）→发现漏核B0HG9QPSDS主动补验后出报告；首答自动交付完整html代码块右侧渲染，日期口径严格（早于05-18剔除并披露listing/online矛盾），唯一需人工比对专利US111033770B1单列。缺口：候选明细表无主图列（「表格列主图（若返回）」给了模型省略空间）。修订：在线技能 youweiai-amazon-selection-search（输出段追加强制主图列+悬停浮层条款，3.9→4.3KB）与 youweiai-amazon-report-gen（文末追加候选表主图列强制条款，3.5→3.8KB）均保存；本地 map 表格输出规范同步改硬。回归：[麻将收纳包选品搜索](https://local.dianleida.net:21996/c/1564f148-8c52-4ac8-a534-81570dcf4e2a)（近90天+月销>10）：8入口160原始→71去重→8预筛→详情核验→2合格候选（B0H8DFD2X6 袋组套装月销181 / B0HG5BDQ34 装牌袋月销155），右侧首答渲染，候选明细表**含真实主图列**，悬停实测 320×320 白底圆角浮层出现——主图列规则回归通过。
- **2026-11-13 亚马逊21场景迁移增补**：Open WebUI模型 `amazon-sorftime-selection-assistant` 绑定原八公共技能及21场景技能（展示名 `youweiAI-amazon-场景-场景名称`，ID `youweiai-amazon-scene-{slug}`）；21条创建完成，不等于21条验收通过。场景技能的本地生成器和逐条验收记录见 `youweiAI-amazon-scenes/gen_scene_skills.py`、`youweiAI-amazon-scenes/验收记录-20261113.md`。本轮真实UI发现并修订：场景7只有5/11女包细分类取得当期中国卖家销量份额，不得把5类0达标说成11类0达标；场景14纠偏撤回无来源汇率与代发结论；场景4/5/13/17/20分别补月值同比、详情趋势、汇总金额、文本来源分母、滚动月销折日均的禁止推断规则；场景6补代表商品真实主图与悬停。以上七个场景技能已同步在线并回读一致；其余新对话复验和右侧交互以验收记录状态为准。
- **2026-11-14 八技能客户口吻重建回归（8/8）+ Hub 实测记录校对**：每技能一条新问法实测并右侧渲染，证据对话：关键词[dog brush缺站点追问](https://local.dianleida.net:21996/c/fca842d3-99f1-46f5-9127-67b4fd70f56e)、[利润三段追问情景估算](https://local.dianleida.net:21996/c/003435c1-c0a7-4011-91d1-bb28370ada53)、[选品报告·宠物喂食器份额矛盾整组弃用](https://local.dianleida.net:21996/c/4a93d799-dc9b-4806-9a0a-c3da7b56621e)、[选品搜索·浴室置物架类目确认零凑数](https://local.dianleida.net:21996/c/d28464cd-7456-4b60-958c-f28f323312f0)、[竞品·B0DGHBV6XS身份核验](https://local.dianleida.net:21996/c/5151c95c-f960-4d8c-a6f8-83a5c81bbe0e)、[类目趋势·露营灯未完月剔除](https://local.dianleida.net:21996/c/29344035-a99c-4e64-9d47-845d735a7e0d)、[店铺·AnkerDirect样本口径](https://local.dianleida.net:21996/c/a038c620-d641-447c-a8db-fd31f1fe97a9)、[Listing·US文案诊断](https://local.dianleida.net:21996/c/d882ed2c-6c46-41aa-b45d-1fe1f17272d3)。Hub index.html 八条实测记录同日校对：清除占位会话链接（另一对话/同会话/德站链接定站）、选品搜索补 d28464cd、报告补瑜伽垫 149b6c46、实测日期统一 2026-11-13/14、利润 chatUrl 改指 003435c1；八条 JSON 解析校验通过。
- **2026-11-14 筛选维度扩展回归（3/3）+ 导航同步**：在上轮 8/8 之外补测三种此前未覆盖的筛选条件组合，均为新对话、真实接口调用、右侧 HTML 实际渲染。① 互斥条件（近30天上架×月销5000+×评分4.9+×评论>2000×售价≤$15，列20款）[16b50149](https://local.dianleida.net:21996/c/16b50149-77f9-42f7-beef-c0a2f846bb10)：严格查询无数据后不凑数，两组诊断分解定位瓶颈（近30天上架与评论>2000互斥），用关键词基线20款证明管道正常，输出方案A/B 由用户选。② BSR 排名筛选（小类BSR≤100×月销500+×评论≤500，列10款）[dfadeef8](https://local.dianleida.net:21996/c/dfadeef8-a0e4-425e-8339-244916a6e7ff)：BSR 为接口原生字段未用其他字段替代，10 款 #22–#96 严格达标，BruMate 趋势仅 2 个月如实标待核。③ 老链接反向时间窗（上架>3年×月销1000+×排除 PETLIBRO/Veken）[72172a5c](https://local.dianleida.net:21996/c/72172a5c-4afa-4a60-9385-f0643c0a0193)：先把「3年前」换算为上架≤2023-11-14 锚点，ABA 宽词召回偏差后改走类目入口与标题/属性词路，85条去重53 ASIN 逐条判型，临界样本 FEELNEEDY 单独核 listing_date 后保留，10 款整机达标。同轮已同步 Hub：index.html 选品搜索实测记录问法 3→6 并补三条证据，实测弹窗新增「完整验收报告」入口，验收报告 `amazon-eight-skills-acceptance-2026-11-13.html` 与仓库副本一致。未覆盖维度保留：变体父子条件、卖家类型（FBA/FBM/AMZ）、销量增速环比、缺失字段硬条件。

---

## 2026-11-14 OZON 七技能第三轮回归（Amazon 同款流程）

- **范围**：只改 youweiAI-OZON 专家与七技能（选品搜索 / 竞品监控 / 类目趋势 / 商品解析 / 店铺分析 / 利润测算 / 选品报告），未动亚马逊、TEMU 与并行会话文件。
- **方法**：A 标准 / B 缺参（品类歧义 + 类目ID）/ C 边界 三类客户口吻问法，6 层验收（追问 → 路由 → 实参 → 口径 → 回答 → 右侧 HTML 渲染）；只在 Open WebUI 真实对话跑，不用 API 直连（直连不执行真实工具、模型会编数据）。
- **结果**：16 条问法，15 通过，1 待核（A2 猫砂盆中文名索引 skuNameZh 不收敛）。七技能均有真实通过记录，右侧 HTML 均实测渲染（srcdoc 非空 + 真实 ozonstatic 图 + 表格 + 商品链接）。
- **对话**：选品搜索 A[保温杯跨境4款](https://local.dianleida.net:21996/c/53c620cf-72f2-401f-b6f1-d34f46710e9b) / A2[猫砂盆卡 skuNameZh](https://local.dianleida.net:21996/c/02c3da88-e6eb-48ac-8f40-e416dd5031a3) / B[麻将包 ask_user 追问](https://local.dianleida.net:21996/c/0055df4a-235f-4f30-b499-279ef870b224) / C[多条件0条](https://local.dianleida.net:21996/c/bd0ffe5f-7091-4f63-a20c-1a7ea037fdb0)；竞品 A[SKU异常](https://local.dianleida.net:21996/c/4e71911a-9d2b-4e61-a169-b3246829b822) / C[建基线不称持续监控](https://local.dianleida.net:21996/c/04d934de-7a86-47af-b3e8-fa85907b4c44)；类目 A[家居大盘](https://local.dianleida.net:21996/c/b657c882-9ea6-4d8a-97f7-a1e1e8503b1c) / C[mallsNum失真不引用](https://local.dianleida.net:21996/c/3a808d73-8a7c-49fa-a42f-f7e8679e03e6)；商品 A[标题销量跟卖](https://local.dianleida.net:21996/c/ba490f04-8fc4-42f6-86ec-c563d9e718e8) / C[实重体积重区分](https://local.dianleida.net:21996/c/cfad365b-5f3a-4f2d-94a0-baa320f1ddba)；店铺 A[覆盖缺口不虚构](https://local.dianleida.net:21996/c/3e926fb6-a40c-4c3a-8167-1a20c86aba1a) / C[自营脏数据过滤](https://local.dianleida.net:21996/c/6e6c4a87-e627-4fa2-831c-13037bc88002)；利润 A[1688图搜3次不猜价](https://local.dianleida.net:21996/c/a797b5c0-3ba0-4667-a6b1-7e14c50ed7b2) / C[缺项标估算](https://local.dianleida.net:21996/c/149636a8-326b-472b-ac9a-18cb3f535757)；报告 A[完整串联](https://local.dianleida.net:21996/c/f9b785dd-cc2f-4884-ad37-dc50d7147822) / C[0条不造档位](https://local.dianleida.net:21996/c/8b1036af-79da-46d7-8d9f-5feb7d543cf7)。
- **纪律复现**：排序字段 dailySales 异常返回 0 自动去 sort 对照（选品搜索 A / 选品报告 A 均触发）；SPU 不支持 storeType → 跨境逐 SKU 补验，无法核验不计达标；mallsNum / 店铺数失真不引用；0 条不造表不造档位，如实给补验路径；实重 / 体积重分开取 max 计费重，不把体积当计费重量；缺项一律标估算，不报真实净利。
- **待修**：① A2 猫砂盆中文名索引 skuNameZh 检索不收敛（约 15 分钟未出结果，应优先俄文品类词，中文名检索易空易卡）；② 利润测算缺商品时纯文字追问卡 turn（done 卡 false、发送按钮不恢复，应统一 ask_user 追问）。
- **导航同步**：index.html 七技能 demo 更新为 A/B/C 实测记录，各补 chatUrl 真实会话链接与 report/reportTitle 指向 `ozon-seven-skills-regression-2026-11-14.html`；versions.json 追加一条 `hub:index.html#ozon-public-skills`。
