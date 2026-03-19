# LN 性能基线 2026-03-20

本文件用于给 LN 前端后续改造提供一条可回比的性能基线。

## 1. 测试对象

- 本地构建产物：`dist/LN/index.html`
- 构建时间：2026-03-19 22:55
- 当前产物体积：
  - `dist/LN/index.html`: `796,481 B`
  - `dist/LN/index.js.map`: `2,118,245 B`
  - `dist/LN/main.css.map`: `71,171 B`

说明：
- source map 不参与酒馆运行时首屏，但会污染工作区，所以已加入 `.gitignore`。
- LN 正式包当前仍然是单 HTML 大包，后续若继续堆功能，首屏和酒馆 iframe 解析压力会上升。

## 2. 已测到的硬指标

### 2.1 本地构建冷启动

测试方式：
- Chrome DevTools Performance
- `file:///D:/tavern_helper_template-main/dist/LN/index.html`
- 无 CPU 降速
- 无网络降速

结果：
- LCP: `179 ms`
- CLS: `0.00`
- LCP 主要耗时：`render delay 178 ms`
- 第三方脚本影响：
  - JSDelivr 传输体积：`5.1 kB`
  - 主线程执行：`1 ms`

当前判断：
- 冷启动本身不慢。
- 当前首屏瓶颈不是第三方，而是本地包解析与渲染。
- 这组数据偏乐观，因为它没有模拟中低端手机，也不是酒馆 iframe 嵌入态。

## 3. 代码层结构检查

### 3.1 已有的好处

右侧大页签不是全挂载，当前是按激活页签条件渲染：
- 联系人：[`src/LN/App.tsx:7219`](/d:/tavern_helper_template-main/src/LN/App.tsx#L7219)
- 手机：[`src/LN/App.tsx:7239`](/d:/tavern_helper_template-main/src/LN/App.tsx#L7239)
- 系统：[`src/LN/App.tsx:7252`](/d:/tavern_helper_template-main/src/LN/App.tsx#L7252)

这意味着：
- `phone / system / contacts` 不会同时常驻渲染。
- 月结、税务、手机这几块没有在隐藏态一起吃主线程。

手机内部也不是五个页签一起挂：
- `lingnet`：[`src/LN/components/right/LingnetPhonePanel.tsx:1317`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L1317)
- `darknet`：[`src/LN/components/right/LingnetPhonePanel.tsx:1374`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L1374)
- `dm / wallet / import`：同文件后续条件分支

这部分结构是对的，说明当前不会因为“隐藏页签全挂着”而直接卡死。

### 3.2 已经存在的风险

`LingnetPhonePanel` 每次相关状态变化时，会重新从 `npcs` 聚合和排序整套社交数据：
- `socialAccounts`：[`src/LN/components/right/LingnetPhonePanel.tsx:249`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L249)
- `feedEntries`：[`src/LN/components/right/LingnetPhonePanel.tsx:273`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L273)
- `paymentEntries`：[`src/LN/components/right/LingnetPhonePanel.tsx:285`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L285)

当前复杂度问题：
- 灵网动态：`flatMap + sort`
- 钱包流水：`flatMap + sort`
- 发现页：直接映射全部账号

列表渲染现在没有窗口化，也没有条数上限：
- 动态流全量映射：[`src/LN/components/right/LingnetPhonePanel.tsx:1360`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L1360)
- 发现页全量映射：[`src/LN/components/right/LingnetPhonePanel.tsx:1367`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L1367)

如果后面 NPC、动态、私信记录都变多，最先涨成本的会是：
- 页签切换
- 搜索筛选
- 动态流首屏渲染
- 钱包流水和暗网页的长列表

### 3.3 动效层风险

手机壳常驻效果现在包括：
- 扫描线：[`src/LN/index.css:249`](/d:/tavern_helper_template-main/src/LN/index.css#L249)
- HUD 扫光：[`src/LN/index.css:261`](/d:/tavern_helper_template-main/src/LN/index.css#L261)
- 浮动动画：[`src/LN/index.css:159`](/d:/tavern_helper_template-main/src/LN/index.css#L159)
- 顶部反馈卡闪光：[`src/LN/index.css:364`](/d:/tavern_helper_template-main/src/LN/index.css#L364)

这些在桌面端问题不大，但在手机端和酒馆 iframe 中可能叠加出额外成本，尤其是：
- blur
- 大面积渐变
- 无限循环动画

手机壳本身在组件里是常驻叠层：
- 扫描线 / HUD sweep：[`src/LN/components/right/LingnetPhonePanel.tsx:1247`](/d:/tavern_helper_template-main/src/LN/components/right/LingnetPhonePanel.tsx#L1247)

## 4. 酒馆实机检查结论

我在本机打开的酒馆页里看到了 LN iframe 运行态，但它恢复出来的是另一份较旧/不同步的前端状态：
- 可以 `RESUME`
- 右侧结构里没有本地最新的 `手机 / 系统(月结+税务)` 组合页

这说明一件事：
- **当前本地仓库里的最新 LN 前端，不等于你酒馆此刻实际注入的 LN 前端。**

所以第 1 步基线里，真正可信的“最新功能性能”只能先以本地构建产物为准。
等你把这版正式推到 `ln-front` 并让酒馆加载到它之后，还要再补一次“酒馆嵌入态复测”。

## 5. 当前结论

结论分两层：

### 5.1 现在还没出现的风险

- 当前架构没有“所有大模块同时挂载”的明显大雷。
- 冷启动首屏目前是快的。
- 第三方脚本不是主要问题。

### 5.2 接下来很容易出现的风险

- 单 HTML 包继续长大
- 灵网/暗网/钱包列表全量渲染
- 图片和动态条目变多后，页签切换开始掉速
- 手机壳的常驻动画在酒馆 iframe 和手机端叠加变重
- 本地最新构建与酒馆实际运行版本不一致，容易误判“本地不卡，酒馆卡”

## 6. 第 2 步优化红线

下一步进入性能收口时，必须遵守这些红线：

1. 手机端优先，不以桌面端流畅掩盖手机端卡顿。
2. 灵网动态、发现页、钱包流水、暗网记录全部加首屏条数上限。
3. 图片默认延迟加载，非首屏不立刻解码。
4. 给手机壳提供低动效模式，至少能关掉扫描线、扫光、浮动。
5. 不新增隐藏态仍持续计算的大面板。
6. 世界书继续拆小条目，避免大而全条目把酒馆生成拖慢。

## 7. 建议的下一动作

第 2 步建议直接做这四件事：

1. 给 `LingnetPhonePanel` 的动态流、发现页、钱包流水加首屏上限与“加载更多”。
2. 给手机壳加 `reduced motion` / `lite mode`。
3. 把图片渲染改成首屏优先，非首屏延迟。
4. 在 LN 正式推到 `ln-front` 后，再做一次酒馆 iframe 实机复测。
