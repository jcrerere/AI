# LNSJ-back

这里存放的是原始快照和历史备份，不作为日常编辑主源。

当前用途：

- `raw/live_worldinfo.json`：从酒馆当前世界书导出的原始快照
- `raw/tmp_worldinfo_6234.json`：旧快照对照样本
- `raw/灵能世界-5-legacy.json`：旧的历史导出样本
- `legacy-root/`：这次重构前散落在根目录的旧文件和旧结构

建议：

- 不直接在这里改内容
- 新快照也统一放进 `raw/`
- 需要重建本地主源时，用 `raw/live_worldinfo.json` 跑 `npm run lnsj:rebuild`
