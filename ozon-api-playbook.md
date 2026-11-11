# OZON 接口实测速查（2026-11-11 实调）

> 用途：OZON 全部技能执行前必读。本文件沉淀接口可用性、字段命名差异与空结果降级 SOP，防止凭印象拼字段、反复重试空结果。
> 更新原则：每次真实调用发现新坑，追加到这里并更新日期。

## 一、接口可用性地图（本轮实测）

| 接口 | 状态 | 实测结论 |
|---|---|---|
| yq_dict_lookup | ✅ 正常 | 前台类目查 CATEGORY，后台类目查 CATEGORY_BACKEND，platform 必传 ozon |
| yq_ozon_market_stat | ✅ 正常 | key=all 返回全站；key=后台分类ID 返回该类目 |
| yq_ozon_brand_search | ✅ 正常 | 必填 pageSize/pageNum；total=10000 上限 |
| yq_ozon_mall_search | ✅ 正常 | ⚠️ 前几条是 name="Ozon" 自营聚合脏数据，必须过滤 |
| yq_ozon_mall_detail | ✅ 正常 | openTime/level/storeType 字段有效 |
| yq_ozon_goods_detail | ✅ 正常 | 字段名驼峰（soldCount/soldSum/symbol）；⚠️ yq_fields_lookup 的 defaultFields 是误导性旧名 |
| yq_ozon_goods_search | ✅ 本次可返回（2026-11-11 晚） | 已知 SKU 631000911 返回 1 条；`skuName="сумка"`+近90天上架+近28天销量≥2 返回 1087 条；早间曾空，按当次调用判断 |
| yq_ozon_spu_search | ❌ 返回空 | 官方示例参数 `category:["17028922"]` 也空 |

> 接口状态以当次实调为准。`goods_search` 早间出现整体空结果、晚间已能返回商品；`spu_search` 尚未复测，保留早间状态，勿将早间故障写成永久不可用。

## 二、字段命名（两个接口都是驼峰，但"日周月销量"名不同）

**同一批"销量"字段，两个接口的命名对照（2026-11-11 实测钉死）：**

| 含义 | goods_search（搜索） | goods_detail（详情） |
|---|---|---|
| 日销量 | dailySales | soldCount |
| 周销量 | weeklySales | —（无此字段，用 soldCount7 近似） |
| 月销量 | monthSales | —（无此字段） |
| 近7天销量 | soldCount7 | soldCount7 |
| 近28天销量 | soldCount28 | soldCount28 |
| 销售额(近1天) | soldSum | soldSum |
| 近7天销售额 | soldSum7 | soldSum7 |
| 近28天销售额 | soldSum28 | soldSum28 |
| 币种 | symbol | symbol |

- ⚠️ **核心陷阱**：`yq_fields_lookup(tool="yq_ozon_goods_detail")` 返回的 `defaultFields` 里写的 `daily_sales`/`weekly_sales`/`monthly_sales`/`currency` 是**误导性旧展示名，与实际返回字段不符**。实际返回和 `_fields` 参数用的是驼峰名（`soldCount`/`soldSum`/`symbol`）。传下划线名会被静默忽略。
- 详情接口 `_fields` 传字段名先看真实返回或本表，不要照抄 `defaultFields` 列表。
- 详情接口常用字段：`sku`/`spu`/`skuName`/`name`/`skuNameZh`/`price`/`score`/`weight`/`symbol`/`soldCount`/`soldCount7`/`soldCount28`/`soldSum28`/`otherCount`(跟卖数)/`others`(跟卖列表)/`storeType`/`brand`/`category`/`createDate`(上架)/`dailySalesList`(每日销量)/`dailyPriceList`/`dailyCommentList`/`segments`。

## 三、空结果降级 SOP（连续空结果时执行，禁止盲目重试）

按顺序判断，定位是哪一种：

1. **参数错**：换字段/格式能出数 → 修正提示词里的字段说明（对照本文件第二节）。
2. **接口本身空**：连官方示例参数都空 → 如实记录「当前数据不可取」，写进技能降级路径，不硬凑、不反复同义重查。
3. **套餐/额度**：先 `yq_quota_status` 查（不消耗次数）。
4. **数据源整体异常**：用 `yq_ozon_market_stat(key="all")` 对照验证大盘是否正常。

## 四、关键字段口径备忘

- 时间口径：字段名带 7/28 后缀 = 近 7 天/近 28 天；空字段 = 平台未提供，不等于 0。
- 金额以返回 `symbol` 字段为准，默认卢布 ₽（搜索和详情接口都是 symbol，无 currency 字段）。
- 上架时间：goods_search 用 `minCreateDate`（商品上架）；`minCreateTime` 是「数据发现时间」，两者不同，别混。详情接口的上架日期字段是 `createDate`。
- 类目参数：查前台 CATEGORY → 传 `types`；查后台 CATEGORY_BACKEND → 传 `category`。
- mall_search 脏数据过滤：`name="Ozon"` 或 `skuNum<100` 或日销虚高（如 2.5 亿）的聚合行剔除后再看真实店铺。
- goods_detail 跟卖：`otherCount`=跟卖数，`others`=跟卖卖家列表（含 sellerName/goodsPrice/goodsUrl）；`storeType` 1=跨境 2=本土 3=自营。
- 「麻将包」90天上架/近28天销量>1 实测：`skuName="сумка маджонг"` 无硬筛有 3 条（1 收纳包、2 牌具套装），加日期后 0，加销量后 0；`skuName="стеганая сумка"` 加双硬筛 1 条却是化妆包，须排除；`skuName="сумка"` 同硬筛 1087 条仅说明接口可用，不是麻将包的有效命中。SKU 5129545150 定向查询未返回 createDate/soldCount28，但字段能否返回因商品而异，须逐条核验。
- 2026-11-11 晚 Ozon 买家页实测：全站搜 `сумка для маджонга` 前排混有牌具和垫子；搜 `чехол для хранения маджонга` 后进入「爱好和创作→棋盘和纸牌游戏→多米诺骨牌和麻将」仍有整套麻将和收纳盒并列。前台类目经字典确认为 `types=["13512"]`，与俄文词 `футляр маджонг` 或 `маджонг` 及近90天上架+近28天销量≥2联筛均为 0。官网收纳盒 SKU 1935924145 在数据接口按 SKU 查询返回 `createDate=2025-03-13`、`soldCount28=2`、`types` 含 13512，因此商品类型匹配但不符合上架时间；官网另一收纳盒 SKU 4343412787 在数据接口按 SKU 查询无记录。买家搜索结果与云启数据库覆盖范围不同，不能据官网可见商品推定数据接口必有相同记录或满足销量条件。

## 五、已验证锚点（可复用的对账数据）

- 全站大盘：allSkuNum=68549951 / allMallNum=294362 / monthSkuNum=221529（2026-11-11）。
- 店铺：Rhapsody Home Shop（ID 2892839）= 跨境(storeType=1)/Plus(level=3)/开店1年/日销8738/1252 SKU。
- 品牌：Synergetic（33319604）= 77店/3830 SKU/月销197.8万件/评分4.89。
- 连衣裙类目：前台 types=7502，后台 category=93182。
- 家居用品类目（后台 17028714）：allSkuNum=157841 / allMallNum=46774 / 月销 205 万件 / 月销售额 7.62 亿₽ / 近28天浏览 20.6 亿次（2026-11-11）。
- 商品：垃圾袋 SKU 631000911（SPU 3946631770）= 本土店 Big City Life/₽186/近28天销71379件/跟卖273家/weight 388g/尺寸132×80×76mm。

## 六、market_stat 类目级返回结构（类目趋势技能必读）

- 返回 `stats`（最新快照）+ `items`（每日趋势序列）。
- 关键字段：`allSkuNum`=类目SKU总数、`allMallNum`=类目店铺总数、`monthlySalesNum`=月销量、`monthlyPrice`=月销售额、`monthSkuNum`=月动销SKU数、`monthMallNum`=月动销店铺数、`skuViewNum28`=近28天浏览、`daySalesNum`/`weeklySalesNum`=日/周销量。
- ⚠️ `allSalesNum`/`allCommentsNum`/`allBrandsNum` 在类目级返回 0（疑似仅全站统计才有值），勿引用。
- ⚠️ `mallsNum`（当日动销店铺数）10月底起断崖失真（实测该类目从 8 月的 1.6万+ 骤降到 10 月底的 ~580），`monthMallNum` 同步失真（43），入场结论勿引用近期这两个字段，改用 `monthSkuNum`+`skuViewNum28` 佐证。
- ⚠️ `items` 每日序列日期空洞严重（约 1/3 日期缺失），趋势判断按可得点标注区间。
