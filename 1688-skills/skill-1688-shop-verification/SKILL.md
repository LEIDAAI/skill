---
name: skill-1688-shop-verification
description: 此技能用于核验 1688 店铺主体、商品数、年限与履约指标，并在店铺榜为空时按商品链接找可核验店铺；当用户问供应商店铺或店铺榜时使用。
agent_created: true
---

# 1688 店铺核验

**2026-11-11 新轮已核验一间真实商品来源店铺；店铺榜、无效链接和异常支路仍待验。旧轮证据另列。**

## 执行 SOP

1. 用户给出 `shopUrl` 时调用 `mcp__1688__monitor_shop_analysis({shopUrl:'用户给定店铺链接'})`（`shopUrl` 在顶层）。记录主体名称、商品数、诚信年限、评级及履约/回复/纠纷/退款/复购与物流原值；不猜比率分母、评分满分，不将零值解释为零风险。
2. 要店铺榜时按当前 schema 调用 `mcp__1688__shop_rank_list({request:{beginTpYear:0,categoryIdList:[],endTpYear:0,keyword:'',keywordType:'offer',memberTypeList:[],pageIndex:1,pageSize:3,rankType:'comprehensive',shopKeyword:'',sortField:'rankScore',sortType:'desc',tradeMedalList:[]}})`，用户指定的条件须按真实需求修改。如果有店铺筛选字段 `shopScreen`，使用营业执照全名。店铺榜 `code 200,totalCount 0,list=[]` 是该条件下的正常空；如需找店，征得用户同意按商品用 `mcp__1688__product_search_list({req:{keyWord:'商品关键词',searchType:4,pageIndex:1,pageSize:3}})` 查到真实 `shopUrl` 再核验，明确这不是榜单排名。
3. 输出实际请求、调用日期和每项原值；查不到店铺时核对 URL、榜单条件及主体名称。非200/超时记接口失败，额度错误或达到单轮10次上限即停调；缺字段或结构异常记数据源待核，不能凭空认定资质或履约水平。

## 已有证据（2026-11-10）

- `monitor_shop_analysis({shopUrl:'https://huaijan.1688.com'})` → `code 200`：东莞市华键文具有限公司、90商品、12年、AAA；履约0.6327、回复0.6302、纠纷0、退款0、复购0.6324349、物流分2.9。
- 上述完整 `shop_rank_list({request:{...}})` 请求 → `code 200,totalCount 0,list=[]`；不能把华键店称为上榜店铺。此前并无按商品回退找到店铺的本轮实调，本节只给条件式 SOP。
- 2026-11-11 新轮 `monitor_shop_analysis({shopUrl:'https://shop211d0c0807636.1688.com'})` → `code 200`，主体义乌市雀汇箱包有限公司、`offerCount:21,tpYears:'1',fundDate:'2026年09月10日'`；`performanceRate:0.8649,responseRate:0.9054,collectingRate:0.878`。`fundDate` 不等于诚信年限，摘要“专业生产加工”属于商家自述；主体/认证信息、服务分与实际商品品质分别核，不因一项分数直接断言靠谱。旧店铺榜空结果不替代新轮的店铺榜/异常支路验收；无额度错误或整体故障实测。
