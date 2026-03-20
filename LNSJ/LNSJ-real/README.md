# LNSJ-real

这是 LN 世界书的本地可编辑主源。

目录说明：

- `index.yaml`：条目元数据、开关、插入位置、外链文件路径
- `entries/`：按模块拆开的正文文件
- `entries/facilities/README.md`：设施/地点条目的拆分与触发规则
- `LNSJ-real.json`：打包后给酒馆手动导入的成品
- `entries/README.md`：模块分类与命名规则说明

建议只改两类东西：

- 条目开关、关键字、位置：改 `index.yaml`
- 世界书正文：改 `entries/**`

补充：

- 如果条目在酒馆里重名，结构化文件名会自动带上 `_uid数字`
- 这个 `uid` 只用于本地文件去歧义，不会改变你导入酒馆后的条目显示名

打包命令：

```powershell
npm run lnsj:bundle
```

重新从原始快照生成本结构：

```powershell
npm run lnsj:rebuild
```
