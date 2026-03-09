# LN Branch Workflow

## 固定角色

- 更新分支：`ln-front`
- 备份分支：`ln-front-backup-20260309`
- 酒馆正则/CDN 生产引用：只允许 `ln-front`

## 你可以直接对 AI 这样说

- `同步 LN 备份`
- `本次 LN 修改满意，覆盖备份分支`

以上两句话都表示：
把 `origin/ln-front` 覆盖到 `origin/ln-front-backup-20260309`，然后校验两者 SHA 一致。

## 一键命令（本地）

```powershell
powershell -ExecutionPolicy Bypass -File util/sync-ln-backup.ps1
```

## 日常流程

1. 所有开发改动都在 `ln-front` 进行（或临时本地分支，最后合并回 `ln-front`）。
2. 酒馆正则始终使用：
   - `https://cdn.jsdelivr.net/gh/jcrerere/AI@ln-front/dist/LN/index.html`
3. 当你确认“当前版本满意”后，再执行备份同步脚本。
4. 备份分支只用于兜底回滚，不作为酒馆日常引用分支。
