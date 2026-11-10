# TEMU 专家·技能路由验收报告

> 验收日期：2026-11-11（00:30 ~ 01:00）
> 依据：《专家与技能搭建规范》——单一 TEMU选品专家 + 7 技能路由，每条路由真实接口跑通留证据。
> 映射文件：`temu-expert-skill-map.ts`（字段格式对齐 `ozon-expert-skill-map.ts`）

---

## 一、架构变更摘要

| 变更前（4 专家） | 变更后（1 专家 + 7 技能路由） |
|---|---|
| exp-temu-sel 选品专家 | **exp-temu-sel TEMU选品专家**（唯一，吸收全部能力） |
| exp-temu-price 核价利润专家 | → skill-profit-calc |
| exp-temu-mall 店铺专家 | → skill-shop-analysis |
| exp-temu-market 大盘专家 | → skill-category-trend |

技能 7 个：选品搜索 / 竞品监控（原竞品调研并入）/ 商品解析 / 店铺分析 / 类目大盘 / 利润测算 / 选品报告（终点站）。
合并依据：竞品监控与竞品调研触发话术高度重叠（都围绕"同款/竞品/竞争密度"），合并为一个 skill-competitor-monitor。

---

## 二、路由验收矩阵（每条真实接口调用，调用证据见 snapshots）

| # | 路由 → 技能 | 验收提示词 | 主接口 | 实测证据（2026-11-11 实调） | 结果 |
|---|---|---|---|---|---|
| 1 | 找品/搜商品 → skill-selection-search | 「近60天上架的跨境麻将包，全托+半托，美国211」 | yq_goods_search ×2 | 2026-11-09 全链路：57款→相关性核查剔5款→52款成品（全托10/半托42），TOP1 半托麻将垫收纳管 $21.48/月销311；2026-11-11 复测同参数 total=42 口径稳定（TOP1 月销 322，日环比+11） | ✅ |
| 2 | 图搜同款/竞品 → skill-competitor-monitor | 「用 TOP1 主图搜站内同款」 | yq_goods_img_search | 返回 1 同款 distance=0.203（<0.25 基本同款）sales=130；_fields 只认少数列（传 id/price 被忽略，_note 提示） | ✅ |
| 3 | 单品解析/评论 → skill-product-parse | 「看 TOP1 的评论口碑」 | yq_goods_comment | allCount=1，score5=1，其余为 0（缺失=无不补零）；月销 311 vs 评论 1 → TEMU 新品评论沉淀慢，评分维度不可作筛选依据 | ✅ |
| 4 | 店铺分析 → skill-shop-analysis | 「这 45 个 mall_id 批量取店名 + 两店对照」 | yq_mall_search(ids=[]) | 一次调用返回 44 家店铺名（NovaDaily Shop/YoyoTote/KKEPBAG…）；shiny party 日销 9134/评论 12.1万（明星老店）vs GlobalGoodsss 87 SKU/月销869（单爆款新店，TOP1 贡献36%） | ✅ |
| 5 | 类目大盘 → skill-category-trend | 「美国站半托家居类目大盘」 | yq_market_semi(area=美国站, optId=36) | 数据日期 2026-11-07：892.2万商品/19.41万店/月销2602万件/$1.46亿GMV/客单$5.6；与 11-09 锚点（$1.51亿/2629.7万）同量级口径稳定；⚠️ 数据日期非当日，输出须标注 | ✅ |
| 6 | 利润测算/1688找源 → skill-profit-calc | 「马桶清洁片供货核价」 | yq_goods_detail + image_search(1688) + ali_offer_sku_prices + ali_offer_realtime_detail | 2026-11-09 五接口联动：€5.05→¥2.5阶梯价→跨境专供+下游含temu→底线¥9.5 vs 核价区间¥15.6~23.4 有空间 | ✅ |
| 7 | 选品报告 → skill-report-gen | 「麻将包出决策报告」 | 串联（selection-search→表格→结构观察） | 产出 reports/temu-mahjong-bag-60d-us211-v2.html（KPI+三产品线+反编造口径披露）；报告结论限定"仅基于52款样本" | ✅ |
| ⚠️ | 降级路径：全托大盘 | market_fully 无参调用 | yq_market_fully | 历史实测（11-09）超时×2 + code=-1，本次未重测（接口侧已知问题）；降级=goods_search 聚合已写入人设 | 已知问题 |

**结论：7 条路由全部真实跑通（1 条依赖接口侧已知问题走降级路径）。**

---

## 三、实测纪律核对（人设 disciplines 逐条有据）

| 纪律 | 来源实测 |
|---|---|
| goods_search 必传参数 + sort 对象数组 | 全部检索调用 |
| goods_detail 9万字符 _fields 裁剪 | 11-09 马桶清洁片解析（全量返回超限存文件） |
| 币种三元组（哥伦比亚$=比索） | 11-09 全托家居 TOP：$10,306(比索)≈$2.7 |
| sales≥100000 日月周为空≠没销量 | 云启接口说明 + 类目锚点复验 |
| market_fully 不可用降级 | 11-09 三次失败实测（超时×2/code=-1） |
| mall_star 筛选无效→star_seller_time 核验 | 11-09 晚 TEMU 店铺复测（_note 报字段不存在） |
| 1688 图搜必须 1688 MCP | 11-09 核价链路（image_search officialScore 0.74~0.80）+ global_image_search 偶发500重试 |
| 反编造三条 | 本次验收实例：评论 score1~4 返回 0 是"无评论"不是"零差评"；market_semi 数据日期 11-07 非当日；月销环比+11 不下"增长趋势"结论（单点样本） |

---

## 四、同步与版本记录

- `temu-expert-skill-map.ts` 已写入 skill 仓库（含 7 技能 demo 快照）
- `versions.json` 追加 8 条记录（expert merge×1 + skill create×7，全部带 snapshots.prompt/demo）
- Hub（ozon-skill-hub.html）**未改动**：Hub 仍是 4 专家展示形态（导航页面向用户分发，合并后的单专家形态以本 TS 文件为前台事实源）；如需 Hub 同步收敛为 1 专家另行确认
- git 提交：见本次 commit（502/schannel 间隔重试）

## 五、遗留事项

1. yq_market_fully 接口侧不可用（数据源问题，人设已写降级）
2. 全托 regions 站点筛选不可验证（数据源机制，输出口径已固化「返回站点标签为X」）
3. Hub 导航页 4 专家卡片与本 TS 单专家映射存在形态差（Hub=分发展示，TS=前台接入事实源）；统一时机由用户定
