# LN 世界书主源说明

从 2026-03-19 起，这个目录是 LN 世界书的唯一主源目录。

当前约定：

- 编辑主文件：`index.yaml`
- 打包命令：`node tavern_sync.mjs bundle 灵能世界_大前端`
- 打包产物：`灵能世界.json`
- 酒馆同步配置：`tavern_sync.yaml` 中的 `灵能世界_大前端`

不再作为主源的文件：

- `../灵能世界 (5).json`
- `../../tmp_worldinfo_6234.json`

推荐流程：

1. 先改 `index.yaml`
2. 再执行 `node tavern_sync.mjs bundle 灵能世界_大前端`
3. 需要同步酒馆时再执行 `push` 或 `watch`
4. 需要走云端前端发布时，单独按 `ln-front` 分支流程提交并推送
