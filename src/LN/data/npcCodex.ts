import { NPC, NpcAiDirectorCard, NpcAiPromptBlock, NpcDarknetProfile, NpcDarknetRecord, NpcDarknetService } from '../types';

export interface NpcCodexEntry {
  ids?: string[];
  names?: string[];
  patch: Partial<NPC>;
}

const AUTHOR_NPC_CODEX: NpcCodexEntry[] = [
  {
    ids: ['n1'],
    names: ['薇尔薇特 (Velvet)'],
    patch: {
      citizenId: 'D7-BL-119',
      socialHandle: '@velvet_backdoor',
      socialBio: '第7区后巷黑诊所与灰色器官物流协调者。',
      chipSummary: ['冷柜后门白名单', '黑诊所义体修复链', '临时器官托运协议'],
      clueNotes: ['常在维克多诊所后巷与冷柜通道出没。', '只做熟人单，陌生面孔会先查来路。'],
      dossierSections: [
        { id: 'public', title: '公开身份', content: '第7区后巷出诊的义体医生，表面只接急诊与低调改造单。', unlockLevel: 2 },
        { id: 'temper', title: '行事风格', content: '说话不绕弯，先收款后开刀。她对无意义的试探极不耐烦，但对能带来货源与情报的人会明显放松。', unlockLevel: 3 },
        { id: 'pressure', title: '隐藏压力', content: '她维持着一条匿名冷链与黑诊所供给线，最怕的是货源暴露导致整条后门通道被封。', unlockLevel: 4 },
      ],
      gallery: [
        { id: 'velvet_cover', src: 'https://picsum.photos/640/900?random=11', title: '后巷出诊照', unlockLevel: 2 },
        { id: 'velvet_coldroom', src: 'https://picsum.photos/640/900?random=12', title: '冷柜走廊监拍', unlockLevel: 3 },
      ],
      unlockState: {
        dossierLevel: 2,
        darknetLevel: 2,
        darknetUnlocked: true,
        albumUnlockedCount: 2,
        intelUnlockedCount: 1,
      },
      darknetProfile: {
        handle: 'dn://velvet-stitched',
        alias: '天鹅绒医生',
        summary: '游走在黑诊所、器官改造与灰色情报之间的后巷医生，习惯把“救人”和“处理痕迹”打成同一笔单。',
        accessTier: '灰市二级节点',
        marketVector: '义体修复 / 冷链转运 / 诊所后门',
        riskRating: 4,
        bounty: '悬赏 4,800 灵币',
        tags: ['黑诊所', '器官物流', '情报商'],
        knownAssociates: ['后门担架手', '冷链司机', '第7区暗市掮客'],
        lastSeen: '维克多诊所后巷 · 冷柜通道',
        intelRecords: [
          {
            id: 'velvet_record_coldlist',
            title: '冷柜接驳名单',
            content: '过去两周内至少有三批匿名冷链货物在她的后门停留不超过十分钟，说明她不仅做修复，还负责临时拆分与转运。',
            timestamp: '2077-11-02 23:10',
            source: '暗市装卸工口供',
            location: '维克多诊所后巷',
            risk: 'medium',
            kind: 'intel',
            unlockLevel: 2,
            tags: ['冷链', '后门', '转运'],
          },
          {
            id: 'velvet_record_manifest',
            title: '匿名器官托运单',
            content: '一份被撕毁的托运单显示，她帮人处理过带追踪芯片的器官包裹，并成功把编号洗成了民用维修件。',
            timestamp: '2077-11-01 19:45',
            source: '回收终端残档',
            location: '第7区暗市',
            risk: 'high',
            kind: 'leak',
            unlockLevel: 3,
            tags: ['器官包裹', '洗号', '高风险'],
            image: 'https://picsum.photos/960/540?random=13',
          },
          {
            id: 'velvet_record_cleanup',
            title: '雨夜清创记录',
            content: '雨夜有人看见她亲自替重伤雇佣兵做过清创和弹道取出，诊疗结束后她顺手删掉了那人身上的定位码。',
            timestamp: '2077-10-29 02:30',
            source: '匿名监控拼接',
            location: '后巷临时手术台',
            risk: 'medium',
            kind: 'sighting',
            unlockLevel: 4,
            tags: ['清创', '删除定位', '熟人单'],
            image: 'https://picsum.photos/960/540?random=14',
          },
        ],
      },
      aiDirectorCard: {
        lookupTokens: ['薇尔薇特', 'Velvet', '@velvet_backdoor', '天鹅绒医生', 'D7-BL-119'],
        summary: '她最在意的是手里的冷链和诊所后门是否还能安全运转，不会轻易把自己绑进别人惹出的麻烦里。',
        publicMask: ['利落、冷静、像是永远在做下一台手术的准备。'],
        hiddenTruths: ['她会优先评估一个人是“病人”“客户”还是“会给她带来搜查的人”。'],
        voiceGuide: ['短句', '专业词很多', '先谈代价，再谈情面'],
        motivations: ['保住后门通道', '筛选稳定货源', '避免冷链暴露'],
        relationHooks: ['愿意为可靠关系破一次例，但会记账', '打赏和情报都比空口承诺更有效'],
        doNotReveal: ['不要主动交代她参与匿名器官转运', '不要一见面就说出她的后门网络规模'],
        improvNotes: ['如果玩家受伤严重，她会先处理伤口，再冷冷追问来路。'],
        keepAliveTurns: 4,
      },
    },
  },
  {
    ids: ['n2'],
    names: ['艾莉亚 (Aria)'],
    patch: {
      citizenId: 'AR-CM-042',
      socialHandle: '@aria_exec',
      socialBio: '高压企业安保链上的执行官，公开端几乎只留下最低限度痕迹。',
      chipSummary: ['高压指令桥', '企业审讯接口', '清除链路授权'],
      clueNotes: ['主要活动于荒坂塔高层与保密通道。', '公开端几乎无日常痕迹，像故意被擦过。'],
      dossierSections: [
        { id: 'public', title: '公开身份', content: '特别行动组执行官，负责敏感目标的追踪、回收与整肃。', unlockLevel: 2 },
        { id: 'method', title: '处理方式', content: '她偏好先封锁路线、再切断退路，最后才真正动手。比起爆发，她更擅长收口。', unlockLevel: 3 },
        { id: 'mask', title: '被抹去的部分', content: '她的公开简历过于干净，说明真正的履历并不适合出现在任何正规系统里。', unlockLevel: 4 },
      ],
      gallery: [
        { id: 'aria_cover', src: 'https://picsum.photos/640/900?random=21', title: '企业通道抓拍', unlockLevel: 2 },
        { id: 'aria_hall', src: 'https://picsum.photos/640/900?random=22', title: '审讯层门禁影像', unlockLevel: 4 },
      ],
      unlockState: {
        dossierLevel: 2,
        darknetLevel: 1,
        darknetUnlocked: false,
        albumUnlockedCount: 1,
        intelUnlockedCount: 0,
      },
      darknetProfile: {
        handle: 'dn://aria-blackglass',
        alias: '黑玻璃执行官',
        summary: '她更像企业高压链条上的切口工具，不负责喧哗，只负责让目标在最短时间内失去退路。',
        accessTier: '封存审查节点',
        marketVector: '企业整肃 / 回收行动 / 内部清除',
        riskRating: 5,
        bounty: '企业内部红级目标',
        tags: ['企业执行', '高压审查', '封存记录'],
        knownAssociates: ['塔内安保组', '审讯接口维护员'],
        lastSeen: '荒坂塔 42F · 封闭通道',
        intelRecords: [
          {
            id: 'aria_record_corridor',
            title: '封闭通道调度单',
            content: '一份调度单显示她曾在无公开任务编号的情况下调动三组通道封锁员，说明她拥有临时越权能力。',
            timestamp: '2077-11-03 05:20',
            source: '企业调度残档',
            location: '荒坂塔 42F',
            risk: 'high',
            kind: 'intel',
            unlockLevel: 2,
            tags: ['越权调度', '封锁', '企业'],
          },
          {
            id: 'aria_record_scrub',
            title: '痕迹擦除报告',
            content: '有记录显示她在行动结束后会追加一次“痕迹清洗”，包括人员口供、监控回写与出入权限重置。',
            timestamp: '2077-11-01 01:05',
            source: '内网镜像',
            location: '企业审讯层',
            risk: 'sealed',
            kind: 'leak',
            unlockLevel: 3,
            tags: ['痕迹清洗', '内网镜像', '封存'],
            image: 'https://picsum.photos/960/540?random=23',
          },
          {
            id: 'aria_record_blackroom',
            title: '黑室回收流程',
            content: '黑室流程表明她不是单纯抓人，而是在完成回收后继续参与目标的后续审查与再利用评估。',
            timestamp: '2077-10-28 14:40',
            source: '泄露会议摘录',
            location: '塔内黑室',
            risk: 'sealed',
            kind: 'contract',
            unlockLevel: 4,
            tags: ['回收流程', '再利用', '黑室'],
            image: 'https://picsum.photos/960/540?random=24',
          },
        ],
      },
      aiDirectorCard: {
        lookupTokens: ['艾莉亚', 'Aria', '@aria_exec', '黑玻璃执行官', 'AR-CM-042'],
        summary: '她把一切接触都先当作风险评估，而不是社交行为。',
        publicMask: ['安静、极稳、像随时准备宣读处理结果。'],
        hiddenTruths: ['她不是为了表现强硬而冷，而是已经习惯了把人和事件拆成可处理对象。'],
        voiceGuide: ['句子短', '不闲聊', '经常直接判定局势'],
        motivations: ['确认可控性', '切断外泄风险', '维持企业任务闭环'],
        relationHooks: ['只有在确认玩家具备交换价值后才会给更多信息', '她对稳定执行与守口如瓶的人有耐心'],
        doNotReveal: ['不要主动提及黑室流程细节', '不要轻易承认她拥有越权调度能力'],
        improvNotes: ['如果玩家试图用情绪撬开她，她只会继续收窄信息出口。'],
        keepAliveTurns: 5,
      },
    },
  },
  {
    ids: ['n3'],
    names: ['杰克 (Jack)'],
    patch: {
      citizenId: 'MERC-77-JK',
      socialHandle: '@jack_oldbooth',
      socialBio: '来生酒吧熟脸佣兵，喝酒和接单一样高频。',
      chipSummary: ['街头联系人名单', '来生临时接单码', '两条未注销火力许可'],
      clueNotes: ['经常在来生酒吧固定卡座露面。', '人脉广，消息散，但真正的硬单只给熟人。'],
      dossierSections: [
        { id: 'public', title: '公开身份', content: '老牌街头佣兵，喝酒、接单和带新人成了他的日常表层形象。', unlockLevel: 2 },
        { id: 'network', title: '人脉习惯', content: '他不擅长藏锋，但擅长记人情。很多低层消息并不是从他嘴里说出来，而是顺着他的酒桌自己流过来。', unlockLevel: 3 },
        { id: 'pressure', title: '接单底线', content: '他看似什么都接，其实对“卖队友”和“封口单”有自己的硬底线。', unlockLevel: 4 },
      ],
      gallery: [
        { id: 'jack_cover', src: 'https://picsum.photos/640/900?random=31', title: '来生酒吧卡座照', unlockLevel: 2 },
        { id: 'jack_job', src: 'https://picsum.photos/640/900?random=32', title: '旧任务合照', unlockLevel: 3 },
      ],
      unlockState: {
        dossierLevel: 2,
        darknetLevel: 2,
        darknetUnlocked: true,
        albumUnlockedCount: 2,
        intelUnlockedCount: 1,
      },
      darknetProfile: {
        handle: 'dn://jack-lastbooth',
        alias: '最后卡座',
        summary: '典型街头佣兵型节点，真正价值不在火力，而在他连接酒吧、掮客和旧队友的那张网。',
        accessTier: '自由佣兵交易环',
        marketVector: '街头接单 / 酒吧人脉 / 临时护送',
        riskRating: 3,
        bounty: '未挂牌，偶有悬单',
        tags: ['佣兵', '酒吧节点', '街头接单'],
        knownAssociates: ['来生酒保', '旧车队司机', '枪匠熟客'],
        lastSeen: '来生酒吧 · VIP 卡座',
        intelRecords: [
          {
            id: 'jack_record_tab',
            title: '酒吧挂单习惯',
            content: '他常把接单窗口藏在闲聊里，看似在喝酒，实则在试探谁够资格坐进第二轮话题。',
            timestamp: '2077-11-03 00:40',
            source: '吧台耳语',
            location: '来生酒吧',
            risk: 'low',
            kind: 'intel',
            unlockLevel: 2,
            tags: ['挂单', '试探', '熟人局'],
          },
          {
            id: 'jack_record_route',
            title: '旧车队逃逸路线',
            content: '一张过期路线图显示他保留了至少三条能从贫民窟撤回酒吧的老路，必要时还能临时做护送与撤离。',
            timestamp: '2077-11-01 21:15',
            source: '旧车库纸本',
            location: '第7区外环',
            risk: 'medium',
            kind: 'sighting',
            unlockLevel: 3,
            tags: ['撤离路线', '护送', '旧车队'],
            image: 'https://picsum.photos/960/540?random=33',
          },
          {
            id: 'jack_record_refusal',
            title: '封口单拒接记录',
            content: '他曾拒绝过一份看起来报酬极高的封口单，理由不明，但那之后他明显更谨慎地挑客户。',
            timestamp: '2077-10-26 18:55',
            source: '掮客私聊截断',
            location: '来生酒吧后厅',
            risk: 'medium',
            kind: 'contract',
            unlockLevel: 4,
            tags: ['封口单', '拒接', '底线'],
            image: 'https://picsum.photos/960/540?random=34',
          },
        ],
      },
      aiDirectorCard: {
        lookupTokens: ['杰克', 'Jack', '@jack_oldbooth', '最后卡座', 'MERC-77-JK'],
        summary: '他看起来松，但真正决定他愿不愿意帮忙的，是你会不会把他拖进不值得的烂摊子。',
        publicMask: ['热络、爱喝酒、像什么都能聊。'],
        hiddenTruths: ['他对“熟人”“底线”和“撤离路线”比对外表现的更认真。'],
        voiceGuide: ['口语化', '会调侃', '关键处反而突然认真'],
        motivations: ['保住人脉', '筛掉烂客户', '给值得的人留后路'],
        relationHooks: ['对讲义气的人会迅速升温', '不喜欢被当一次性工具'],
        doNotReveal: ['不要太早交代他拒接封口单的原因', '不要立刻亮出全部人脉牌'],
        improvNotes: ['如果玩家值得信任，他会把一句玩笑说成半条真消息。'],
        keepAliveTurns: 4,
      },
    },
  },
  {
    ids: ['n1'],
    patch: {
      darknetProfile: {
        services: [
          {
            id: 'velvet_patch_medical',
            title: '黑诊疗急修',
            summary: '处理开放性创伤、弹片残留和追踪点摘除，适合刚从热区撤下的人。',
            price: 320,
            kind: 'medical',
            unlockLevel: 2,
            risk: 'medium',
            availability: '夜间优先 / 熟人单优先',
            delivery: '薇尔薇特已安排一轮黑诊疗急修，伤口处理和定位摘除痕迹会在后续剧情中体现。',
            tags: ['黑诊疗', '急修', '去定位'],
          },
          {
            id: 'velvet_coldchain_smuggle',
            title: '冷链转运洗号',
            summary: '把敏感器官或高风险义体部件包装成民用维修件，从后门冷链转运出去。',
            price: 540,
            kind: 'smuggling',
            unlockLevel: 3,
            risk: 'high',
            availability: '需后门通道未封锁',
            delivery: '冷链转运与洗号路线已临时接通，相关敏感物会以维修件名义离场。',
            tags: ['冷链', '洗号', '后门通道'],
          },
        ],
      },
    },
  },
  {
    ids: ['n2'],
    patch: {
      darknetProfile: {
        services: [
          {
            id: 'aria_scrub_trace',
            title: '痕迹清洗包',
            summary: '重置出入权限、抹掉监控回写和内部接触痕迹，适合高压区撤离后的善后。',
            price: 680,
            kind: 'rewrite',
            unlockLevel: 3,
            risk: 'sealed',
            availability: '仅限封存链路时段',
            delivery: '艾莉亚已放出一轮痕迹清洗包，监控回写和权限残影会被压低到内部审查以下。',
            tags: ['痕迹清洗', '权限重置', '封存链路'],
          },
          {
            id: 'aria_internal_bounty',
            title: '内部回收悬单',
            summary: '接入一张企业内部红级回收悬单，代价高，但能换到更深的塔内情报。',
            price: 920,
            kind: 'bounty',
            unlockLevel: 4,
            risk: 'sealed',
            availability: '只在深链节点开放',
            delivery: '一张企业内部回收悬单已被挂到你的暗网链路上，后续可在剧情中作为高压任务线使用。',
            tags: ['回收悬单', '塔内情报', '红级任务'],
          },
        ],
      },
    },
  },
  {
    ids: ['n3'],
    patch: {
      darknetProfile: {
        services: [
          {
            id: 'jack_route_escort',
            title: '撤离护送线',
            summary: '用旧车队和酒吧关系网把人从热区带回安全卡座，适合短线脱离。',
            price: 260,
            kind: 'smuggling',
            unlockLevel: 2,
            risk: 'medium',
            availability: '夜间与酒吧营业时段优先',
            delivery: '杰克放出一条临时撤离护送线，热区回撤将优先走他保留的旧路线。',
            tags: ['撤离', '护送', '旧车队'],
          },
          {
            id: 'jack_backroom_intel',
            title: '酒吧后场情报包',
            summary: '汇总来生后场的接单风向、封口单传闻和近期熟客名单。',
            price: 180,
            kind: 'intel',
            unlockLevel: 2,
            risk: 'low',
            availability: '现货',
            delivery: '来生后场的接单风向和熟客名单已经整理进你的暗网缓存，可作为后续接触入口。',
            tags: ['酒吧情报', '接单风向', '熟客名单'],
          },
        ],
      },
    },
  },
];

const matchesEntry = (npc: NPC, entry: NpcCodexEntry): boolean => {
  if ((entry.ids || []).includes(npc.id)) return true;
  const name = `${npc.name || ''}`.trim();
  return (entry.names || []).some(item => item.trim() && item.trim() === name);
};

const mergeStringArray = (base: string[] | undefined, extra: string[] | undefined): string[] | undefined => {
  const merged = Array.from(new Set([...(base || []), ...(extra || [])].map(item => `${item || ''}`.trim()).filter(Boolean)));
  return merged.length > 0 ? merged : undefined;
};

const mergePromptBlocks = (base: NpcAiPromptBlock[] | undefined, extra: NpcAiPromptBlock[] | undefined): NpcAiPromptBlock[] | undefined => {
  const merged = [...(base || []), ...(extra || [])]
    .map(block => ({
      label: `${block?.label || ''}`.trim(),
      lines: Array.from(new Set((block?.lines || []).map(line => `${line || ''}`.trim()).filter(Boolean))),
    }))
    .filter(block => block.label && block.lines.length > 0);
  return merged.length > 0 ? merged : undefined;
};

const mergeDarknetRecords = (base: NpcDarknetRecord[] | undefined, extra: NpcDarknetRecord[] | undefined): NpcDarknetRecord[] | undefined => {
  const merged = new Map<string, NpcDarknetRecord>();
  [...(base || []), ...(extra || [])].forEach((record, index) => {
    const id = `${record?.id || `darknet_record_${index + 1}`}`.trim();
    if (!id) return;
    const previous = merged.get(id);
    merged.set(id, {
      ...previous,
      ...record,
      id,
      tags: mergeStringArray(previous?.tags, record?.tags),
    });
  });
  return merged.size > 0 ? [...merged.values()] : undefined;
};

const mergeDarknetServices = (base: NpcDarknetService[] | undefined, extra: NpcDarknetService[] | undefined): NpcDarknetService[] | undefined => {
  const merged = new Map<string, NpcDarknetService>();
  [...(base || []), ...(extra || [])].forEach((service, index) => {
    const id = `${service?.id || `darknet_service_${index + 1}`}`.trim();
    if (!id) return;
    const previous = merged.get(id);
    merged.set(id, {
      ...previous,
      ...service,
      id,
      tags: mergeStringArray(previous?.tags, service?.tags),
    });
  });
  return merged.size > 0 ? [...merged.values()] : undefined;
};

const mergeDarknetProfile = (base: NpcDarknetProfile | undefined, extra: NpcDarknetProfile | undefined): NpcDarknetProfile | undefined => {
  if (!base && !extra) return undefined;
  return {
    ...base,
    ...extra,
    tags: mergeStringArray(base?.tags, extra?.tags),
    knownAssociates: mergeStringArray(base?.knownAssociates, extra?.knownAssociates),
    intelRecords: mergeDarknetRecords(base?.intelRecords, extra?.intelRecords),
    services: mergeDarknetServices(base?.services, extra?.services),
  };
};

const mergeDirectorCard = (base: NpcAiDirectorCard | undefined, extra: NpcAiDirectorCard | undefined): NpcAiDirectorCard | undefined => {
  if (!base && !extra) return undefined;
  return {
    ...base,
    ...extra,
    lookupTokens: mergeStringArray(base?.lookupTokens, extra?.lookupTokens),
    publicMask: mergeStringArray(base?.publicMask, extra?.publicMask),
    hiddenTruths: mergeStringArray(base?.hiddenTruths, extra?.hiddenTruths),
    voiceGuide: mergeStringArray(base?.voiceGuide, extra?.voiceGuide),
    motivations: mergeStringArray(base?.motivations, extra?.motivations),
    taboos: mergeStringArray(base?.taboos, extra?.taboos),
    relationHooks: mergeStringArray(base?.relationHooks, extra?.relationHooks),
    sceneHooks: mergeStringArray(base?.sceneHooks, extra?.sceneHooks),
    doNotReveal: mergeStringArray(base?.doNotReveal, extra?.doNotReveal),
    improvNotes: mergeStringArray(base?.improvNotes, extra?.improvNotes),
    customBlocks: mergePromptBlocks(base?.customBlocks, extra?.customBlocks),
  };
};

const normalizePromptLines = (lines: string[] | undefined): string[] =>
  Array.from(new Set((lines || []).map(line => `${line || ''}`.trim()).filter(Boolean)));

const appendPromptSection = (bucket: string[], label: string, lines: string[] | undefined) => {
  const normalized = normalizePromptLines(lines);
  if (normalized.length === 0) return;
  bucket.push(`${label}: ${normalized.join('；')}`);
};

export const applyNpcCodexOverlay = (npc: NPC): NPC => {
  let merged = { ...npc };

  AUTHOR_NPC_CODEX.filter(entry => matchesEntry(npc, entry)).forEach(entry => {
    merged = {
      ...merged,
      ...entry.patch,
      chipSummary: mergeStringArray(merged.chipSummary, entry.patch.chipSummary),
      clueNotes: mergeStringArray(merged.clueNotes, entry.patch.clueNotes),
      dossierSections: [...(merged.dossierSections || []), ...(entry.patch.dossierSections || [])],
      gallery: [...(merged.gallery || []), ...(entry.patch.gallery || [])],
      darknetProfile: mergeDarknetProfile(merged.darknetProfile, entry.patch.darknetProfile),
      unlockState: {
        ...(merged.unlockState || {}),
        ...(entry.patch.unlockState || {}),
      },
      aiDirectorCard: mergeDirectorCard(merged.aiDirectorCard, entry.patch.aiDirectorCard),
    };
  });

  return merged;
};

export const getNpcDirectorLookupTokens = (npc: NPC): string[] =>
  Array.from(
    new Set(
      [npc.name, npc.socialHandle, npc.citizenId, npc.darknetProfile?.handle, ...(npc.aiDirectorCard?.lookupTokens || [])]
        .map(token => `${token || ''}`.trim())
        .filter(token => token.length > 1),
    ),
  );

export const getNpcDirectorKeepAliveTurns = (npc: NPC): number => {
  const value = Number(npc.aiDirectorCard?.keepAliveTurns);
  if (!Number.isFinite(value)) return 3;
  return Math.min(8, Math.max(1, Math.floor(value)));
};

export const buildNpcDirectorPrompt = (npc: NPC): string => {
  const card = npc.aiDirectorCard;
  if (!card || card.enabled === false) return '';

  const lines: string[] = [];
  const headerBits = [npc.name, npc.position, npc.affiliation].map(item => `${item || ''}`.trim()).filter(Boolean);
  lines.push(`【隐藏扮演档案 / ${headerBits.join(' · ') || npc.id}】`);

  if (card.summary?.trim()) {
    lines.push(`核心印象: ${card.summary.trim()}`);
  }

  appendPromptSection(lines, '公开外壳', card.publicMask);
  appendPromptSection(lines, '真实底色', card.hiddenTruths);
  appendPromptSection(lines, '说话手感', card.voiceGuide);
  appendPromptSection(lines, '当下动机', card.motivations);
  appendPromptSection(lines, '关系处理', card.relationHooks);
  appendPromptSection(lines, '场景偏好', card.sceneHooks);
  appendPromptSection(lines, '红线禁忌', card.taboos);
  appendPromptSection(lines, '不要主动说', card.doNotReveal);
  appendPromptSection(lines, '临场发挥', card.improvNotes);

  (card.customBlocks || []).forEach(block => {
    appendPromptSection(lines, block.label, block.lines);
  });

  lines.push('扮演要求: 保持人物前后一致，不要整段复述档案，不要无条件自曝秘密，只通过语气、行动、回避、暗示和有限透露来体现厚度。');
  return lines.join('\n');
};
