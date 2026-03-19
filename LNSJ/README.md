# LNSJ 工作流

`LNSJ` 目录现在只认两套名字：

- `LNSJ-real`：本地可编辑主源
- `LNSJ-back`：原始快照与历史备份

核心原则：

- 角色卡绑定的是酒馆里的世界书，不是本地文件。
- 你在本地改的是 `LNSJ-real`。
- 本地改完以后，需要先打包出 `LNSJ-real.json`，再由你手动导入酒馆。
- 旧的 `灵能世界 (5).json`、`live_worldinfo.json`、`tmp_worldinfo_6234.json`、`灵能世界/` 目前只视为历史残留，不再作为主入口。

最常用流程：

1. 编辑 `LNSJ/LNSJ-real/index.yaml` 和 `LNSJ/LNSJ-real/entries/**`
2. 执行 `npm run lnsj:bundle`
3. 手动把 `LNSJ/LNSJ-real/LNSJ-real.json` 导入酒馆世界书

如果要从酒馆当前世界书重新生成本地主源：

1. 先把酒馆当前世界书导出为原始快照
2. 放到 `LNSJ/LNSJ-back/raw/live_worldinfo.json`
3. 执行 `npm run lnsj:rebuild`

说明：

- `LNSJ-real` 是编辑区，不是自动同步区。
- `LNSJ-back` 是快照区，不直接编辑。
- 前端正式/备份分支仍然是 `ln-front` / `ln-front-backup-20260309`，不要和世界书目录混用。
