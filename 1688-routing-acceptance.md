# 1688 单专家技能路由验收（2026-11-10）

专家 `exp-1688-sel`，8 个独立技能。以下验收依据用户2026-11-10 对话中的 1688 实调结果；历史图搜成功仅引用本地报告 `F:/workbuddy/dianleida/reports/wig-profit-batch-a.json` 第一项的调用记录。本报告没有重跑接口，也没有调用其他平台接口。除特别列明的 `fetchedAt` 和历史报告调用区间外，本轮实调仅知日期，不能据此补写各接口的精确时分秒。

## 路由矩阵

| 技能 ID | 触发话术 | 实际调用链 | 真实返回与结论 | 缺点 / 验收边界 |
|---|---|---|---|---|
| `skill-1688-conditional-search` | “找近30天销量高的磁吸收纳盒，优先跨境” | `product_search_list` → `cross_border_product_search_list` | 均 code 200；普通原始 totalCount 10000，跨境原始 totalCount 67；首位磁吸收纳盒 `734800252457` 重合；需去重、核对对应SKU报价，并剔除手机配件及卡牌展示盒等噪音。 | 命中量未经清洗；跨境筛选不是目标属性保证。 |
| `skill-1688-billboard` | “看收纳盒商品榜” | `product_billboard_list` | code 200；2026-10-01 榜单首位 `1087689307649` 11331件/11192笔/¥113423.31，次位 `886261779564` 10214件/9746笔/¥56177；作为候选入口。 | 榜单日期不同于查询日期；样本不等于全榜。 |
| `skill-1688-new-products` | “找最近上架的收纳盒” | `product_trend_new_list` | code 200；样本碗碟架/便携餐具盒/蛋糕模均须按类目排除。 | 关键词命中不是相关货源，单条上架日期不是整体趋势。 |
| `skill-1688-image-search` | “用图找1688货源” | 本轮 `image_search` → `global_image_search`；另查历史 `image_search` → `ali_offer_sku_prices` 记录 | 本轮分别 504、code 500，未得到候选；历史报告图搜 code 200 给出短发深棕候选 `1084396803022`。 | 历史和本轮为不同图片，历史候选待拿样，不能称同款或本轮成功。 |
| `skill-1688-product-deep-dive` | “深挖734800252457” | `product_info` → `ali_offer_realtime_detail` → `ali_offer_sku_prices` | 近30天48笔/152721件/¥610884；白色磁吸166*122 `5251111954228` 参考¥4.6。 | 自然月与滚动窗口不同；500件起¥4不能当磁吸SKU结算价。 |
| `skill-1688-shop-verification` | “核验华键这家店”／“看优质店铺榜” | `monitor_shop_analysis` → `shop_rank_list` | 店铺分析code 200：华键90商品/12年/AAA；店铺榜code 200、totalCount 0。 | 比率分母未核；榜单为空时只按商品搜索找到shopUrl做核验，不冒充榜单。 |
| `skill-1688-monitor-read` | “看我的商品和店铺监控池” | `monitor_offer_list` → `monitor_shop_list` | 均 code 200；商品池 total 5、店铺池 total 10，列出第三条商品和首条店铺指标。 | 池内 total 非平台总量；单次快照无法判断变动，null 不补0。 |
| `skill-1688-profit-scenario` | “按售价20元、运费3元、费用2元算利润” | 复用 `ali_offer_sku_prices` 返回的目标SKU参考价 → 四项情景演算 | ¥20－¥4.6－¥3－¥2＝情景毛利¥10.4，情景毛利率52%。 | 采购未确定结算，费用为假设，未计税损等；不是真实利润。 |

## 每条路由的调用与返回证据

### 1. 条件找品（含跨境）

- 普通请求：`product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'30',pageIndex:1,pageSize:3,sortField:'saleVolume30d',sortType:'desc'}})`。返回 `code 200`，`totalCount=10000`（未清洗）；首位 `734800252457` 标价 ¥4、近30天 152721 件、48 笔、销售额 ¥610884。该商品标题为磁吸收纳盒，是相关候选；搜索列表¥4不能代替磁吸SKU参考价。另有手机配件类目噪音，应逐条剔除。两路请求的筛选条件不完全相同（跨境加了10笔门槛），不可将两个totalCount之差解读为跨境占比。
- 跨境请求：`cross_border_product_search_list({req:{keyWord:'磁吸收纳盒',searchType:4,cycle:'30',beginOrderCount:10,pageIndex:1,pageSize:3,sortField:'saleVolume30d',sortType:'desc'}})`。返回 `code 200`，`totalCount=67`；首位仍为 `734800252457`。另有亚克力卡牌展示盒 `1044998343367`（¥15，7314 件、40 笔、预估 ¥109710），与磁吸收纳盒目标不符；`963590713991`（¥15，4544 件、118 笔、预估 ¥68160）规格相关性待核。
- 结论：普通和跨境样本按 offerId 去重，标题、类目、规格三重核对；原始 totalCount 不报作合格货源数。来源：上述两个 `mcp__1688__` 接口，2026-11-10 实调。

### 2. 商品榜

- 请求：`product_billboard_list({req:{date:'2026-10-01',pageType:3,keyWord:'收纳盒',pageIndex:1,pageSize:3}})`；返回 `code 200`。
- 榜单首位 `1087689307649`：¥10.01、11331 件、11192 笔、销售额 ¥113423.31；次位 `886261779564`：¥5.5、10214 件、9746 笔、销售额 ¥56177。
- 结论：两个商品可作为候选 offerId 进一步深挖；只列已有返回，不补第三条，也不由该榜推出全平台热度。来源：`mcp__1688__product_billboard_list`，2026-11-10 实调，榜单日期 2026-10-01。

### 3. 新品发现

- 请求：`product_trend_new_list({request:{keyWord:'收纳盒',searchType:4,cycle:'30',titleTags:['289794'],pageIndex:1,pageSize:3}})`；返回 `code 200`。
- `1094384793742` 为厨房碗碟架（类目沥水碗架），¥99.99、1001 件、2 笔，上架 2026-10-23；`1095951942592` 为便携餐具盒（类目便携餐具），¥18.5、4420件、1笔，上架2026-11-02；`1090363232064` 为硅胶模具（蛋糕模），¥4.5、17400件、5笔，上架2026-10-05。三条都不得直接列为目标收纳盒新品。
- 结论：逐条检查类目并排除错类；`titleTags=['289794']` 为新品标签，本轮指定的只是这一类标签，不能说查了所有新品标签。来源：`mcp__1688__product_trend_new_list`，2026-11-10 实调。

### 4. 以图找货

- 本轮输入图：`https://cbu01.alicdn.com/img/ibank/9234638357_1340358845.jpg`。`image_search` 单图返回 `504`；`global_image_search` 同图、`platform=1688` 返回 `code 500`，`errorId=e1e1c581740e4715898f49c9996cdc7c`。本轮无成功候选，不能写为图搜跑通。
- 独立历史证据：本地报告 `F:/workbuddy/dianleida/reports/wig-profit-batch-a.json` 第一项 `callLog.calls` 中，`image_search({req:{imageUrls:['https://m.media-amazon.com/images/I/41G5Cfex0XL._AC_US600_.jpg']}})` 返回 `code 200`、`taskId=5d6c03671b0444248523b3ac519a670b`；对候选 `1084396803022` 的 `ali_offer_sku_prices({req:{offerId:'1084396803022'}})` 返回 `code 200`。深棕 30cm 短发 SKU `6140798789833` 的商品阶梯参考价为 ¥11—13，未定采购数量时不能当 SKU 确定结算价。
- 结论：历史成功仅表明有一个属性相关候选；剪裁、色差、配件与样品仍待核，不称同款，不把旧报告作为本轮图搜成功，不推送旧报告。来源：本轮两个 `mcp__1688__` 图搜接口，2026-11-10 实调；历史本地报告记录的调用区间为 2026-11-10 15:40:59—16:05:31（北京时间），未逐次记录精确时间。

### 5. 单品深挖

- `product_info({req:{offerId:'734800252457'}})`：近30天 48 笔、152721 件、¥610884；2026-10月 44 笔、149911 件、¥599644；2026-09月 27 笔、56746 件、¥226984。滚动30天与自然月不能直接拼接为绝对订单趋势，`trend` 仅按其归一化口径使用。
- `ali_offer_realtime_detail({req:{offerId:'734800252457'}})`：`fetchedAt=2026-11-10T12:55:27Z`，材质 PP、260G、40个/箱、跨境专供。
- `ali_offer_sku_prices({req:{offerId:'734800252457'}})`：白色磁吸166*122，`skuId=5251111954228`，参考 ¥4.6；无磁吸166*122，`skuId=5949219410490`，参考 ¥4；`priceRanges` 500件起¥4。阶梯信息不等于磁吸 SKU 的成交单价。
- 结论：选 SKU 时对齐磁吸属性、尺寸、数量及实际报价。来源：上述三个 `mcp__1688__` 接口，2026-11-10 实调；仅详情抓取时间有精确时间戳。

### 6. 店铺核验

- 请求：`monitor_shop_analysis({shopUrl:'https://huaijan.1688.com'})`；返回 `code 200`，主体东莞市华键文具有限公司、90商品、12年、AAA。
- 履约 `0.6327`、回复 `0.6302`、纠纷 `0`、退款 `0`、复购 `0.6324349`、物流分 `2.9`。
- 店铺榜请求：`shop_rank_list({request:{beginTpYear:0,categoryIdList:[],endTpYear:0,keyword:'',keywordType:'offer',memberTypeList:[],pageIndex:1,pageSize:3,rankType:'comprehensive',shopKeyword:'',sortField:'rankScore',sortType:'desc',tradeMedalList:[]}})`；返回`code 200`、`totalCount=0`、`list=[]`，本轮没有可用榜单排名。
- 结论：记录店铺画像原值，不猜评分满分、分母、零值对应风险。榜单空时按商品检索的shopUrl寻找可核验店铺，不能写“榜单头部”。来源：`mcp__1688__monitor_shop_analysis`和`shop_rank_list`，2026-11-10 实调。

### 7. 监控池读取

- `monitor_offer_list({request:{page:1,pageSize:5}})`：`code 200`、`total=5`；首条 `734800252457` 的价格/销量与更新时间有 `null` 缺失，不补0；第三条 `1026078393346` 价格 ¥1、日 4 笔/7 件、近7天 42 笔/58 件、近30天 86 笔/114 件。
- `monitor_shop_list({request:{page:1,pageSize:5}})`：`code 200`、`total=10`；首条辰雨皮鞋厂 `offerCount=33`、`monthSalesCount=819`、`monthSalesVolume=67457.39`。`monthSalesVolume` 单位未核实，仅保留字段原值。
- 结论：两个 total 仅属于各自监控池，不是平台货盘大小；单次读取没有可比历史快照，不能说某商品涨跌。来源：上述两个 `mcp__1688__` 监控列表接口，2026-11-10 实调。

### 8. 报价利润情景测算

- 复用已返回的 `ali_offer_sku_prices({req:{offerId:'734800252457'}})`，指定白色磁吸166*122 `skuId=5251111954228` 参考 ¥4.6；无磁吸 ¥4 和 500件起 ¥4 阶梯均不能替换这个参考值。
- 演算输入（均为人民币、按单件）：**假设售价 ¥20、假设运费 ¥3、假设其他费用 ¥2**。`20－4.6－3－2=10.4`，`10.4÷20=52%`。
- 结论：**情景毛利 ¥10.4，情景毛利率 52%**。采购尚非确定结算价；税费、退货及其他未给出的成本没有计入，因此这不是真实利润或可执行报价。来源：`mcp__1688__ali_offer_sku_prices` 的 2026-11-10 实调参考报价；其余数值为本次情景指定假设。

## 串联与口径验收

- 按“榜单/新品/条件找品/图搜发现 → 复用 offerId 深挖 → 用 shopUrl 核店 → 复用目标 skuId 测算”串联；已取得的同一接口响应复用，不为展示链路重复请求。
- 返回的件数、笔数、销售额分列；抽样不外推全量，缺失不补0；无连续可比趋势不下涨跌结论。本轮图片接口失败如实记录，历史成功另列。每条 demo 的日期和来源见 `1688-expert-skill-map.ts`。
