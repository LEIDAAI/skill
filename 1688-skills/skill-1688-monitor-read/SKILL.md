---
name: skill-1688-monitor-read
description: 此技能用于读取用户的 1688 商品与店铺监控池，保留分页、缺失值和原始指标口径；当用户要看已监控商品或店铺时使用。
agent_created: true
---

# 1688 监控池读取

**2026-11-11 新轮已实测商品监控池的精准空筛选与店铺监控池的关键词匹配；分页边界、额度/接口异常仍待验。旧快照另列。**

## 执行 SOP

1. 按请求分别调用 `mcp__1688__monitor_offer_list({request:{page:1,pageSize:5}})` 和 `mcp__1688__monitor_shop_list({request:{page:1,pageSize:5}})`；`request` 为嵌套键、分页字段为 `page` 和 `pageSize`。只需要一种池时只读对应列表。
2. 分别输出各池的 `total`、分页、实际请求与调用日期；只展示真实返回的条目。价格、销量、更新时间 `null` 或缺失时保留原值，不补0；商品笔数/件数分列；店铺 `monthSalesVolume` 未核实单位时只写字段名及原值。一次快照不能报告涨跌，需有可比历史快照才分析变化。
3. `code 200,total 0` 且列表空时标记为**该池当前条件正常空**，核对池类型和分页；非200、超时记**接口失败**。额度明确报错或单轮满10次则停调；返回结构异常记**数据源待核**，不把池内 `total` 当平台商品数。不要编造并未读取过的条目。

## 已有证据（2026-11-10）

- `monitor_offer_list({request:{page:1,pageSize:5}})` → `code 200,total 5`；首条 `734800252457` 的部分价格/销量/更新时间字段缺失，不表示所有字段都为 null；第三条 `1026078393346` 价格¥1，日4笔/7件、近7天42笔/58件、近30天86笔/114件。
- `monitor_shop_list({request:{page:1,pageSize:5}})` → `code 200,total 10`；首条辰雨皮鞋厂 `offerCount=33,monthSalesCount=819,monthSalesVolume=67457.39`，最后一项单位未核。
- 两个旧快照的 `total` 是各自监控池大小；本轮新请求另列，不直接据两时点差额推涨跌。

## 新轮组合补测（2026-11-11）

- “监控商品里找三件套1097674918061”→ `monitor_offer_list({request:{offerId:'1097674918061',page:1,pageSize:5}})`，`code 200,total 0,list=[]`。这是当前主账号监控池内这个货号筛选为空，**不代表1688商品下架、库存0或检索不存在**。
- “监控店铺里找辰雨”→ `monitor_shop_list({request:{shopUrl:'辰雨',page:1,pageSize:5}})`，`code 200,total 1`。店铺辰雨皮鞋加工厂：近7天119笔/128件、月554笔/812件、`monthSalesVolume:67010.06`（单位未单独核）。2026-11-10旧快照月件数819属于另一更新时点，不能仅凭差额声称下滑。`shopUrl` 参数本次传的是名称关键词，报告中应如实写出。未验证分页边界及接口异常。
