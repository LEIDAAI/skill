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
| yq_ozon_goods_detail | ✅ 正常 | ⚠️ 字段名是下划线风格（daily_sales），非驼峰 |
| yq_ozon_goods_search | ❌ 返回空 | 连官方示例参数 `types:["10502"]` 都空 |
| yq_ozon_spu_search | ❌ 返回空 | 官方示例参数 `category:["17028922"]` 也空 |

> ⚠️ 结论：**商品搜索类接口（goods_search/spu_search）当前取不到数据，但大盘/品牌/店铺/详情接口正常**。依赖搜索接口的技能（选品搜索、竞品监控、利润测算）当前无法拿真实商品，只能做参数与降级验证；等搜索数据恢复再补真实结果。

## 二、字段命名差异（最容易踩的坑）

**同一批"销量"字段，搜索接口和详情接口命名规范完全不同：**

| 含义 | goods_search（驼峰） | goods_detail（下划线） |
|---|---|---|
| 日销量 | dailySales | daily_sales |
| 周销量 | weeklySales | weekly_sales |
| 月销量 | monthSales | monthly_sales |
| 近7天销量 | soldCount7 | soldCount7 |
| 近28天销量 | soldCount28 | soldCount28 |
| 币种 | symbol | currency |

- 详情接口默认字段已含 `sales`、`daily_sales`、`weekly_sales`、`monthly_sales`、`price`、`currency`、`score`、`photo`、`title` 等，通常不用再传 `_fields`。
- 传 `_fields` 前先 `yq_fields_lookup(tool="yq_ozon_goods_detail", keyword=...)` 确认字段名；**拼错不报错，静默忽略**，全错退化成返回全部字段。

## 三、空结果降级 SOP（连续空结果时执行，禁止盲目重试）

按顺序判断，定位是哪一种：

1. **参数错**：换字段/格式能出数 → 修正提示词里的字段说明（对照本文件第二节）。
2. **接口本身空**：连官方示例参数都空 → 如实记录「当前数据不可取」，写进技能降级路径，不硬凑、不反复同义重查。
3. **套餐/额度**：先 `yq_quota_status` 查（不消耗次数）。
4. **数据源整体异常**：用 `yq_ozon_market_stat(key="all")` 对照验证大盘是否正常。

## 四、关键字段口径备忘

- 时间口径：字段名带 7/28 后缀 = 近 7 天/近 28 天；空字段 = 平台未提供，不等于 0。
- 金额以返回 `symbol`（搜索接口）/ `currency`（详情接口）为准，默认卢布 ₽。
- 上架时间：goods_search 用 `minCreateDate`（商品上架）；`minCreateTime` 是「数据发现时间」，两者不同，别混。
- 类目参数：查前台 CATEGORY → 传 `types`；查后台 CATEGORY_BACKEND → 传 `category`。
- mall_search 脏数据过滤：`name="Ozon"` 或 `skuNum<100` 或日销虚高（如 2.5 亿）的聚合行剔除后再看真实店铺。

## 五、已验证锚点（可复用的对账数据）

- 全站大盘：allSkuNum=68549951 / allMallNum=294362 / monthSkuNum=221529（2026-11-11）。
- 店铺：Rhapsody Home Shop（ID 2892839）= 跨境(storeType=1)/Plus(level=3)/开店1年/日销8738/1252 SKU。
- 品牌：Synergetic（33319604）= 77店/3830 SKU/月销197.8万件/评分4.89。
- 连衣裙类目：前台 types=7502，后台 category=93182。
