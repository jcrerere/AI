# NPC Codex

LN 的人物写在这里：

- 作者入口: `src/LN/data/npcCodex.ts`
- 玩家可见层: `patch`
- AI 隐藏扮演层: `patch.aiDirectorCard`

## 你该怎么写

一个 NPC 建议拆两层：

1. `patch`

- 放玩家会逐步解锁的人物志
- 放头像、相册、灵网账号、线索、公开身份
- 放 `darknetProfile` 里的暗网句柄、节点画像、黑市记录
- 这些内容会进入前端人物页

2. `aiDirectorCard`

- 放只给模型看的隐藏扮演档案
- 放真实底色、说话手感、动机、禁忌、哪些信息不能主动说
- 这些内容不会直接显示给玩家

## 最小模板

```ts
{
  names: ['岚纱'],
  patch: {
    citizenId: 'AY-NT-0041',
    socialHandle: '@lansha',
    clueNotes: ['常在北门税务分区出现'],
    darknetProfile: {
      handle: 'dn://lansha-tax',
      alias: '税网裁纸刀',
      summary: '她在暗网侧留下的是风险评估与税务交叉检查痕迹。',
      accessTier: '审查灰节点',
      intelRecords: [
        {
          id: 'lansha_record_1',
          title: '税务夜巡名单',
          content: '她会优先排查异常现金流与临时身份路线。',
          timestamp: '2077-11-03 21:10',
          source: '税务镜像',
          risk: 'medium',
          unlockLevel: 2,
        },
      ],
    },
    dossierSections: [
      { id: 'public', title: '公开身份', content: '北门税务分区审核官。', unlockLevel: 2 },
    ],
    gallery: [
      { id: 'cover_1', src: 'https://...', title: '值勤照', unlockLevel: 2 },
    ],
    aiDirectorCard: {
      lookupTokens: ['岚纱', '@lansha', '北门税务官', 'AY-NT-0041'],
      summary: '她真正关心的是秩序和可控性，不会被廉价讨好打动。',
      publicMask: ['外表冷硬守序，像标准执法模板。'],
      hiddenTruths: ['她会主动筛选可利用对象，并为其建立风险档案。'],
      voiceGuide: ['短句', '不解释废话', '偶尔像审讯一样反问'],
      motivations: ['先确认玩家是否可控，再决定靠近还是施压'],
      doNotReveal: ['不要一见面就讲出完整真实立场'],
      keepAliveTurns: 4,
    },
  },
}
```

## 现在的注入逻辑

- 世界书负责轻量触发，不背完整人物档案
- 前端会在发送请求前，按 `selected NPC / 输入文本命中 / 最近对戏缓存` 检索人物
- 命中后，把 `aiDirectorCard` 注入本轮 prompt
- 默认会保留几轮，`keepAliveTurns` 可调

## 建议

- `summary` 写一句真正的人物核心
- `voiceGuide` 写说话手感，不要写成履历
- `doNotReveal` 很重要，用来防止模型见面自曝
- `lookupTokens` 放名字、职位、ID、灵网账号、暗网句柄
- 不要把整个人物生平塞进一个字段，拆成短句更稳
