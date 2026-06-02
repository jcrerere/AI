# LN 云端 / 酒馆同步 / 续工清单

更新时间：2026-03-30

这份清单只解决三件事：

1. 前端改完后，怎么上传到云端
2. 世界书改完后，怎么同步进酒馆
3. 下次新开页面时，先看哪些路径，不会卡断点

---

## 1. 先分清两条链

LN 现在始终有两条完全不同的链：

### 前端链

- 本地源码：`src/LN/**`
- 打包产物：`dist/LN/index.html`
- 云端正式引用规则：`AI@ln-front/dist/LN/index.html`

含义：

- 你改前端，最终是让酒馆去加载 `ln-front` 分支里的 `dist/LN/index.html`
- 所以“上传云端”对前端来说，本质是：
  1. 本地改代码
  2. 本地构建
  3. 提交并推送到对应云端分支

### 世界书链

- 本地主源：`LNSJ/LNSJ-real/index.yaml`
- 本地正文：`LNSJ/LNSJ-real/entries/**`
- 导入成品：`LNSJ/LNSJ-real/LNSJ-real.json`
- 酒馆内绑定名称：`灵能世界`

含义：

- 角色卡绑定的是酒馆里的世界书，不是本地文件
- 所以“同步酒馆”对世界书来说，本质是：
  1. 本地改 `LNSJ-real`
  2. 打包出 `LNSJ-real.json`
  3. 手动导入酒馆里的 `灵能世界`

---

## 2. 前端上传云端

### 最小步骤

1. 改前端源码  
   路径：`src/LN/**`

2. 本地构建  
   命令：

```powershell
npm run build
```

3. 提交并推送到你用于酒馆加载的云端分支  
   当前约定正式分支是：

- `ln-front`

也就是说，真正给酒馆加载的前端页面是：

- `AI@ln-front/dist/LN/index.html`

### 这里真正要上传的是什么

不是单独上传某个 html。

而是把包含以下内容的仓库状态推到云端：

- `src/LN/**`
- `dist/LN/**`

说明：

- `dist/` 冲突不重要，仓库会重新打包
- 但你本地切页调试时，最好先保证 `npm run build` 是通过的

---

## 3. 世界书同步进酒馆

### 最小步骤

1. 改世界书主源  
   路径：

- `LNSJ/LNSJ-real/index.yaml`
- `LNSJ/LNSJ-real/entries/**`

2. 打包世界书  
   命令：

```powershell
npm run lnsj:bundle
```

3. 把生成物手动导入酒馆  
   文件：

- `LNSJ/LNSJ-real/LNSJ-real.json`

4. 在酒馆里替换/更新当前世界书：

- 名称：`灵能世界`

### 当前不推荐依赖的路径

虽然项目里有：

```powershell
npm run lnsj:pull
npm run lnsj:push
npm run lnsj:watch
```

但这几条仍依赖 `tavern_sync` 握手链路，属于可选高级路径。  
当前最稳的是：

- 本地改
- 本地 bundle
- 手动导入酒馆

---

## 4. 新开页面续工时先看哪里

如果下次新开一页，先看这几处：

### 世界书角色条目

- `LNSJ/LNSJ-real/entries/characters/200_角色_雨雨.txt`
- `LNSJ/LNSJ-real/entries/characters/202_角色_玥樾.txt`
- `LNSJ/LNSJ-real/entries/characters/203_角色_黛安娜.txt`
- `LNSJ/LNSJ-real/entries/characters/204_角色_岚汐.txt`

### 世界书索引

- `LNSJ/LNSJ-real/index.yaml`

### 灵弦池

- `src/LN/data/spiritSkillPool.ts`
- `src/LN/data/spiritSkillPool.guide.md`

### 灵弦规则与机制

- `LNSJ/LNSJ-real/entries/mechanics/095_机制_灵弦卡池等级检索_前端对齐.yaml`
- `LNSJ/LNSJ-real/entries/mechanics/096_机制_灵能屏障_统一.txt`

---

## 5. 当前角色进度断点

### 已落盘角色

- 雨雨
- 玥樾
- 黛安娜
- 岚汐

### 当前最容易继续的点

- 岚汐的灵弦还没正式定

注意：

- 岚汐灵弦不能从剧情倒推
- 必须从她的人物本体、战斗方式、武器、美感和近战爆发类型来定

---

## 6. 当前续工推荐提问

下次新开页，直接带上这段最省事：

```text
继续做 LN。
先看：
- docs/LN_SYNC_AND_RESUME_CHECKLIST.md
- LNSJ/LNSJ-real/entries/characters/204_角色_岚汐.txt
- src/LN/data/spiritSkillPool.ts

当前重点：
- 岚汐灵弦还没定
- 不能从剧情倒推灵弦
- 只从人物本体、近战爆发、镰刀、气质来定
```

---

## 7. 一句话记忆版

- 前端：`改 src/LN -> npm run build -> 推 ln-front -> 酒馆加载 AI@ln-front/dist/LN/index.html`
- 世界书：`改 LNSJ-real -> npm run lnsj:bundle -> 导入 LNSJ-real.json -> 更新酒馆里的 灵能世界`
