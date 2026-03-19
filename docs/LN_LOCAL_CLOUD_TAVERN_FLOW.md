# LN 本地 / 云端 / 酒馆链路梳理

更新时间：2026-03-19

## 1. 先分清两条线

LN 现在要分成两条完全不同的链路：

1. 前端链
2. 世界书链

前端链：

- 正式分支：`ln-front`
- 备份分支：`ln-front-backup-20260309`
- 酒馆云端正则：只允许引用 `AI@ln-front/dist/LN/index.html`

世界书链：

- 本地可编辑主源：`LNSJ/LNSJ-real`
- 本地原始快照与历史备份：`LNSJ/LNSJ-back`
- 酒馆内实际绑定名称：`灵能世界`

不要再把“前端正式版/小前端备份”这种命名混到世界书里。

## 2. 角色卡和世界书的真实关系

角色卡绑定的是酒馆里的世界书。

这意味着：

- 你在本地改 `LNSJ/LNSJ-real`，角色卡不会自动生效
- 本地改完后，必须先打包成 json
- 然后由你手动导入酒馆里的 `灵能世界`

也就是说，世界书现在的正确链路是：

`LNSJ-real`
-> 打包出 `LNSJ-real.json`
-> 你手动导入酒馆
-> 角色卡继续绑定酒馆中的 `灵能世界`

## 3. 当前目录约定

### `LNSJ/LNSJ-real`

这是本地可编辑主源。

- `index.yaml`：条目元数据、开关、关键字、位置、文件路径
- `entries/**`：正文内容，已经按模块拆开
- `LNSJ-real.json`：给酒馆导入的成品

### `LNSJ/LNSJ-back`

这是原始快照和历史样本区。

- `raw/live_worldinfo.json`：从酒馆当前世界书导出的原始快照
- `raw/tmp_worldinfo_6234.json`：旧对照快照
- `raw/灵能世界-5-legacy.json`：旧历史导出
- `legacy-root/**`：重构前遗留的根目录旧文件与旧目录

这里不作为日常编辑主源。

## 4. 现在最推荐的动作顺序

### 日常改世界书

1. 改 `LNSJ/LNSJ-real/index.yaml`
2. 改 `LNSJ/LNSJ-real/entries/**`
3. 执行 `npm run lnsj:bundle`
4. 手动把 `LNSJ/LNSJ-real/LNSJ-real.json` 导入酒馆

### 需要从酒馆当前内容重建本地主源

1. 拿到酒馆当前世界书原始快照
2. 放进 `LNSJ/LNSJ-back/raw/live_worldinfo.json`
3. 执行 `npm run lnsj:rebuild`

## 5. 当前命令入口

- `npm run lnsj:rebuild`
- `npm run lnsj:bundle`
- `npm run lnsj:pull`
- `npm run lnsj:push`
- `npm run lnsj:watch`

其中：

- `lnsj:rebuild` 和 `lnsj:bundle` 是你现在最该用的
- `lnsj:pull/push/watch` 仍依赖 `tavern_sync` 握手链路，属于可选高级路径

## 6. 当前结论

现在 LN 的命名和职责已经收敛成：

- 前端：`ln-front`
- 世界书主源：`LNSJ-real`
- 世界书备份：`LNSJ-back`
- 酒馆内实际使用的世界书名称：`灵能世界`

以后排查时，只需要先问四件事：

1. 你改的是前端，还是世界书
2. 你改的是 `LNSJ-real`，还是只是看了 `LNSJ-back`
3. 你有没有重新打包出 `LNSJ-real.json`
4. 你有没有把新 json 手动导入酒馆
