# 卖家精灵亚马逊关键词专家 · 路由验收报告

> 验收时间：2026-11-10（深夜）~ 2026-11-11 凌晨 · 站点：US · 数据源：sellersprite MCP
> 种子词锚点：`mahjong bag`（衔接 2026-11-09 亚马逊麻将包 90 天选品表，TOP1 父体 Majolicia / B0HFJPW8PL）
> 映射文件：`ss-amazon-keyword-map.ts`（字段格式对齐 `ozon-expert-skill-map.ts`）

## 一、架构结论：单一专家 + 4 技能路由

按关键词工作流判定为 **4 技能**（候选 6 个合并 2 个）：

| 技能 | id | 合并说明 |
|---|---|---|
| 关键词挖掘 | skill-ss-kw-mine | keyword_miner（词族）与 ABA 月/周榜（市场发现）触发话术高度重叠（都是"找词/机会词"），**并入同一技能**作为「有种子词/无种子词」两个分支 |
| 转化分层 | skill-ss-kw-conversion | keyword_conversion 独立（90 天广告转化是唯一入口） |
| 趋势回溯 | skill-ss-kw-trend | aba_research_trend + keyword_research_trends（趋势双源互验） |
| 流量词反查 | skill-ss-kw-traffic | traffic 三件套（stat/keyword/extend）串联 |

## 二、四条主链路验收矩阵（全部真实调用）

| # | 链路 | 接口 | 实际调用参数 | 返回证据 | 结果 |
|---|---|---|---|---|---|
| 1 | 挖词 | `keyword_miner` | keyword=mahjong bag, US, order=searches desc, size=10 | total=1840 词；TOP: mahjong set 41.0万搜/购买率1.31%/PPC$0.69、mahjong mat 21.8万/3.13%/$0.95、mahjong tiles 17.6万/1.04%/$0.53；噪音词 dice 13.8万搜但相关度1.4%（跨类目） | ✅ |
| 2 | 转化分层 | `keyword_conversion` | keyword=mahjong bag, US, timeType=90D | total=106 词；mahjong tile bag 搜转2.83%/点转4.47%/exact PPC$0.66/CPA$14.77/转化率25.6%；mahjong bag CPA$24.66 偏高；Acos min=3.33>max=0.13 顺序异常复现 | ✅ |
| 3 | CPC/搜索趋势 | `aba_research_trend` | keyword=mahjong bag, US, M（月粒度） | 58 个月序列：2022-01~03 rank=0（无ABA数据）；2022-04 首入榜528；2024-12 2,530 → 2025-12 23,069 → 2026-09 峰值 58,322（两年23倍） | ✅ |
| 4 | 流量词反查 | `traffic_keyword` + `traffic_extend`（降级） | ①B0HFJPW8PL 带 month（复现坑）②B0HFJPW8PL 默认参数 ③B0H45MC3T2 默认参数 ④traffic_extend(queryType=0, includeKeywords=[mahjong]) | ①total=0（坑复现✓）②仍total=0（该ASIN无流量词覆盖记录）③2词：mahjong racks 吃89.1%流量/自然位#27 + american mahjong 10.9% ④539词：mahjong set 变体池吃40.6%（B0H113JGS6 单变体吃86.3%） | ✅ |

### 链路串联验证（mine → conversion → trend → traffic）

以 `mahjong bag` 一词贯穿：挖词发现词族 1840 → 对 106 个词族词做转化分层（mahjong tile bag 最优）→ 趋势回溯确认主词两年 23 倍强成长期（值得投）→ 反查头部竞品流量词（Majolicia 系变体垄断 mahjong set 40.6% 流量）→ 产出投放建议：**主力投 mahjong tile bag / mahjong mat（低CPA高转化），mahjong set 大词被 Majolicia 变体矩阵垄断暂避开，错拼变体（moh-jong/mah jongg）捡漏**。

## 三、实测纪律验证（写入人设的坑，全部本轮复现）

| 纪律 | 本轮验证 |
|---|---|
| traffic_keyword 带 month/returnFields 返回空 | ✅ 复现（B0HFJPW8PL 带 month → total=0） |
| 默认参数正确姿势 | ✅ B0H45MC3T2 默认参数正常返回 2 词 |
| 滤虚流量（搜购双看） | ✅ dice 月搜 13.8 万但相关度 1.4% 剔除；needoh 案例（296万/0.47%）保留在人设 |
| keyword_research month 滞后一月 | ✅ 昨日实测（传 202610 返回 2026.09） |
| aba_research_weekly 不能传 date | ✅ 昨日实测（传 20261107 报错"只能查询上一周"） |
| Acos min/max 顺序异常 | ✅ 复现（phraseAcos min:3.3329 / max:0.0985） |
| rank=0 ≠ 搜索量为 0 | ✅ mahjong bag 2022-01~03 无 ABA 数据，不能说"零搜索" |
| trafficPercentage 口径 | ✅ B0H45MC3T2 吃 mahjong racks 89.1% 流量（该词分给此ASIN的占比） |
| 反编造三条 | ✅ 抽样1840≠词族全量 / keywordCn=null 标"—" / 无趋势月份不下涨跌结论 |

## 四、与 Sorftime 关键词专家（exp-amazon-keyword）差异化分工

| 维度 | 卖家精灵版（本专家） | Sorftime 版 |
|---|---|---|
| 市场发现 | ABA 月/周榜 6 种市场模式 + 词族挖掘（keyword_miner 1840 词级） | 热词榜 keyword_list（周搜排序+90天转化） |
| 单词深挖 | 90 天广告转化（三匹配 PPC/CPA/预算/Top3 点击 ASIN） | 首页坑位竞争/跟卖率/坑位预算估算 |
| 趋势 | 58 个月搜索量+ABA 排名（aba_research_trend） | 三年搜索量+CPC 走势（keyword_trend） |
| 流量词 | ASIN→词反查（traffic_keyword）+ 拓展词变体流量份额（traffic_extend） | 竞品词自然曝光位对比（competitor_product_keywords） |
| 互验点 | 搜索量双库差异<1%（water bottle 案例）可交叉引用 | 同左 |

## 五、遗留与边界

- `keyword_research`（四维筛选）在本轮作为 mine 的体检工具未单独跑四条链路，但其参数坑（month 滞后）已于 2026-11-09 实测（搜索量 185.9 万/购买率 2.09% 那次），已写入纪律第 3 条。
- `keyword_order`（ASIN 转化词反查）与 traffic_keyword 功能重叠（都是 ASIN→词），归入 traffic 技能备用工具，本轮未重复验收。
- 商标查询（trademark_*）、google_trend 不属于关键词工作流，未纳入本专家。

## 六、同步记录

- 推送文件：`ss-amazon-keyword-map.ts`（本报告）+ `versions.json` 追加 2 条
- 提交：见 git log（feat: 卖家精灵亚马逊关键词专家 4 技能映射 + 路由验收报告）
