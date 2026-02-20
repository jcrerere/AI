
import { Rank, NPC, Message, Item, Chip, Quest, Zone, BodyPart, PlayerCivilianStatus, Skill, PlayerStats, FormStatus, PlayerFaction, FactionTask, FactionIndustry, FactionMember, FactionGroup, FactionRelation, FactionEconomy } from './types';

// Rank Color Mapping - Updated: White -> Blue -> Purple -> Gold -> Red
export const getRankColor = (rank: Rank): string => {
  switch (rank) {
    case Rank.Lv1: return 'text-slate-200 border-slate-400 bg-slate-900/50'; // White/Silver
    case Rank.Lv2: return 'text-blue-400 border-blue-500 bg-blue-950/30';   // Blue
    case Rank.Lv3: return 'text-purple-400 border-purple-500 bg-purple-950/30'; // Purple
    case Rank.Lv4: return 'text-amber-400 border-amber-500 bg-amber-950/30';     // Gold
    case Rank.Lv5: return 'text-red-500 border-red-600 bg-red-950/30';       // Red
    default: return 'text-slate-500 border-slate-600';
  }
};

export const getRankBg = (rank: Rank): string => {
    switch (rank) {
      case Rank.Lv1: return 'bg-slate-400';
      case Rank.Lv2: return 'bg-blue-500';
      case Rank.Lv3: return 'bg-purple-500';
      case Rank.Lv4: return 'bg-amber-500';
      case Rank.Lv5: return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

// --- GAME BALANCE CONFIG ---
export const RANK_CONFIG: Record<Rank, { maxMp: number, maxXp: number }> = {
    [Rank.Lv1]: { maxMp: 200, maxXp: 500 },
    [Rank.Lv2]: { maxMp: 800, maxXp: 2000 },
    [Rank.Lv3]: { maxMp: 2500, maxXp: 8000 },
    [Rank.Lv4]: { maxMp: 10000, maxXp: 30000 },
    [Rank.Lv5]: { maxMp: 50000, maxXp: 100000 }
};

// Mock Player Data
export const MOCK_PLAYER_STATUS: PlayerCivilianStatus = {
  citizenId: 'NC-2077-74092-BETA',
  creditScore: 65, // Scaled to 100
  deductionHistory: [
      { id: 'd1', reason: '在公共区域通过义眼非法扫描', amount: -2, timestamp: '2077-11-02', type: 'fine' },
      { id: 'd2', reason: '逾期缴纳呼吸税', amount: -5, timestamp: '2077-10-30', type: 'fine' },
      { id: 'd3', reason: '言语辱骂公司安保人员', amount: -2, timestamp: '2077-10-25', type: 'fine' },
  ],
  warnings: [
      '检测到非正常生理反应：发情 (ESTRUS)',
      '非法接入未经授权的军用级义体',
      '精神状态不稳定，建议前往最近的矫正中心'
  ],
  taxDeadline: '2077-11-10',
  taxAmount: 15000
};

export const MOCK_PLAYER_STATS: PlayerStats = {
    hp: { current: 340, max: 500 },
    mp: { current: 120, max: 200 }, // Will be overridden by GameSetup logic based on Rank
    formStability: 68,
    formStatus: FormStatus.Warning,
    psionic: { 
        level: Rank.Lv1, 
        xp: 0, 
        maxXp: RANK_CONFIG[Rank.Lv1].maxXp,
        conversionRate: 15, // Male default (low)
        recoveryRate: 120, // Male default (high)
    },
    sixDim: {
        力量: 8,
        敏捷: 8,
        体质: 8,
        感知: 8,
        意志: 8,
        魅力: 8,
        freePoints: 0,
        cap: 99,
    },
    sanity: { current: 42, max: 100 },
    charisma: { current: 35, max: 100 },
    credits: 12450,
    gasMask: { current: 85, max: 100 }
};

const generateSkills = (count: number): Skill[] => {
    return Array.from({length: count}).map((_, i) => ({
        id: `skill_${Math.random()}`,
        name: i === 0 ? '灵弦：神经超载' : '灵弦：痛觉迟钝',
        level: Math.floor(Math.random() * 5) + 1,
        description: '消耗大量灵能，在短时间内大幅提升神经传导速度，副作用是理智值下降。'
    }));
}

// Pool for Resonance (Gacha)
export const MOCK_SKILL_POOL: Record<Rank, Skill[]> = {
    [Rank.Lv1]: [
        { id: 'rp_1', name: '灵弦：微光视觉', level: 1, description: '在完全黑暗中也能看清轮廓。' },
        { id: 'rp_2', name: '灵弦：静电触碰', level: 1, description: '指尖可以产生微弱的麻痹电流。' },
        { id: 'rp_3', name: '灵弦：心跳感知', level: 1, description: '感知近距离生物的心跳频率。' }
    ],
    [Rank.Lv2]: [
        { id: 'rp_4', name: '灵弦：情绪共鸣', level: 2, description: '能够模糊感知对方的情绪波动。' },
        { id: 'rp_5', name: '灵弦：痛觉反馈', level: 2, description: '将自身受到的伤害以痛觉形式返还给攻击者。' }
    ],
    [Rank.Lv3]: [
        { id: 'rp_6', name: '灵弦：思维窃取', level: 3, description: '读取目标当前最强烈的表层念头。' },
        { id: 'rp_7', name: '灵弦：灵能护盾', level: 3, description: '在体表凝聚一层高密度的灵子护盾。' }
    ],
    [Rank.Lv4]: [
        { id: 'rp_8', name: '灵弦：记忆篡改', level: 4, description: '强制修改目标最近5分钟的记忆。' },
        { id: 'rp_9', name: '灵弦：空间折叠', level: 4, description: '短距离瞬间移动。' }
    ],
    [Rank.Lv5]: [
        { id: 'rp_10', name: '灵弦：神威', level: 5, description: '释放巨大的灵压，使周围低等级生物强制昏迷。' },
        { id: 'rp_11', name: '灵弦：灵魂吞噬', level: 5, description: '直接将目标的灵魂扯出体外并作为养料。' }
    ]
};

// Helper to generate full body parts
const generateBodyParts = (baseRank: Rank): BodyPart[] => [
  { id: 'bp_eyes', key: 'eyes', name: '双眼', rank: Rank.Lv3, description: '视觉神经与其连接的深度数据处理单元。', skills: generateSkills(2), equippedItems: [] },
  { id: 'bp_face', key: 'face', name: '面部', rank: baseRank, description: '承载表情模组与感官伪装系统的基础面板。', skills: [], equippedItems: [] },
  { 
      id: 'bp_mouth', key: 'mouth', name: '嘴部', rank: Rank.Lv2, description: '语言输出模块与物质/能量摄入端口。', skills: generateSkills(1), 
      equippedItems: [
          { id: 'eq_mouth_1', name: '声带调制器', description: '可以模拟多种音色，甚至发出超出人类听觉范围的次声波。', rank: Rank.Lv3 }
      ] 
  },
  { 
      id: 'bp_core', key: 'core', name: '灵核 (奇点)', rank: Rank.Lv5, description: '呈坍缩态的奇点型灵核，具备极高的灵能密度与吞噬特性。', skills: generateSkills(3), 
      equippedItems: [
          { id: 'eq_core_1', name: '荒坂Mk.IV 抑制器', description: '防止灵压过载的军用级限制阀。' }
      ] 
  },
  { id: 'bp_body', key: 'body', name: '躯干', rank: baseRank, description: '主要的生命维持系统所在。', skills: [], equippedItems: [] },
  { id: 'bp_chest', key: 'chest', name: '胸部', rank: baseRank, description: '强化合成皮肤与心肺循环辅助系统。', skills: [], equippedItems: [] },
  { id: 'bp_larm', key: 'l_arm', name: '左臂', rank: Rank.Lv2, description: '标准工业义肢接口。', skills: generateSkills(1), equippedItems: [] },
  { 
      id: 'bp_rarm', key: 'r_arm', name: '右臂', rank: Rank.Lv4, description: '战斗改装型义肢，具备武器挂载点。', skills: generateSkills(2), 
      equippedItems: [
          { id: 'eq_rarm_1', name: '螳螂刀 (热能)', description: '隐藏式近战利刃，在弹出时会产生极高的热量。', rank: Rank.Lv4 },
          { id: 'eq_rarm_2', name: '感官增强纹身', description: '植入皮下的灵能回路，增强对周围灵子流动的感知。', rank: Rank.Lv3 }
      ] 
  },
  { id: 'bp_lhand', key: 'l_hand', name: '左手', rank: Rank.Lv2, description: '精密作业型手指模组。', skills: [], equippedItems: [] },
  { id: 'bp_rhand', key: 'r_hand', name: '右手', rank: Rank.Lv3, description: '握力强化模组。', skills: [], equippedItems: [] },
  { id: 'bp_lleg', key: 'l_leg', name: '左腿', rank: baseRank, description: '强化液压肌束。', skills: [], equippedItems: [] },
  { 
      id: 'bp_rleg', key: 'r_leg', name: '右腿', rank: baseRank, description: '强化液压肌束。', skills: [], 
      equippedItems: [
          { id: 'eq_rleg_1', name: '战术丝袜 (防弹)', description: '看起来像普通丝袜，但采用了纳米凯夫拉纤维编织。', rank: Rank.Lv2 }
      ]
  },
  { id: 'bp_lfoot', key: 'l_foot', name: '左脚', rank: Rank.Lv1, description: '静音行动吸附垫。', skills: [], equippedItems: [] },
  { id: 'bp_rfoot', key: 'r_foot', name: '右脚', rank: Rank.Lv1, description: '静音行动吸附垫。', skills: [], equippedItems: [] },
  { id: 'bp_axilla', key: 'axilla', name: '腋下', rank: Rank.Lv4, description: '高敏感度散热阀门与费洛蒙合成腺体。', skills: generateSkills(1), equippedItems: [] },
];

const ariaBodyParts = generateBodyParts(Rank.Lv5);
// Init Reserve MP for high rank NPC
if(ariaBodyParts[0].key === 'core') {
    ariaBodyParts[0].reserveMp = { current: 3500, max: 5000 };
}

export const MOCK_CHIPS: Chip[] = [
  { id: 'chip_beta_civilian', name: 'Beta: 公民协议', type: 'beta', rank: Rank.Lv5, description: '接入夜之城公民管理系统的核心凭证。包含信誉分与税务接口。' }, // BETA CHIP
  { id: 'chip_board_1', name: '军用级神经主板', type: 'board', rank: Rank.Lv3, description: '荒坂公司标准配发的神经接口扩展板，可承载中等负荷。' }, // MOTHERBOARD
  { id: 'c1', name: '神经加速 I', type: 'active', rank: Rank.Lv2, description: '提升 15% 反应速度，增加 SAN 值消耗。' },
  { id: 'c2', name: '疼痛阻断', type: 'passive', rank: Rank.Lv3, description: '忽略轻度伤势惩罚，但在重伤时直接昏迷。' },
  { id: 'c3', name: '黑客协议: 幽灵', type: 'process', rank: Rank.Lv4, description: '短时间内隐匿自身数字签名。' },
  { id: 'c4', name: '语言模块: 街头', type: 'passive', rank: Rank.Lv1, description: '理解帮派黑话与暗号。' },
  { id: 'c5', name: '视觉增强', type: 'active', rank: Rank.Lv2, description: '提供微光夜视与热成像功能。' },
  { id: 'c6', name: '交易算法', type: 'process', rank: Rank.Lv2, description: '在黑市交易时自动优化报价。' },
  { id: 'c7', name: '运动辅助', type: 'passive', rank: Rank.Lv1, description: '修正跑步姿态。' },
  { id: 'c8', name: '记忆扩展', type: 'passive', rank: Rank.Lv2, description: '增加短期记忆缓存。' },
];

export const MOCK_NPCS: NPC[] = [
  {
    id: 'n1',
    name: '薇尔薇特 (Velvet)',
    gender: 'female',
    group: '特别关注',
    position: '网络行者 / 义体医生',
    affiliation: '第7区暗市',
    location: '维克多诊所后巷',
    isContact: true,
    affection: 65,
    avatarUrl: 'https://picsum.photos/200/200?random=1',
    status: 'online',
    stats: {
        hp: { current: 180, max: 200 },
        mp: { current: 300, max: 300 },
        formStability: 85,
        formStatus: FormStatus.Stable,
        psionic: { 
            level: Rank.Lv3, xp: 800, maxXp: 1500,
            conversionRate: 85, // Female range (65-200)
            recoveryRate: 45 // Female range (35-100)
        },
        sixDim: {
            力量: 11,
            敏捷: 14,
            体质: 10,
            感知: 16,
            意志: 12,
            魅力: 18,
            freePoints: 0,
            cap: 99,
        },
        sanity: { current: 60, max: 100 },
        charisma: { current: 72, max: 100 },
        credits: 5400,
        gasMask: { current: 100, max: 100 }
    },
    bodyParts: generateBodyParts(Rank.Lv3),
    inventory: [
        { id: 'ni1', name: '手术刀', quantity: 1, icon: '🔪', description: '沾有纳米凝胶的精密手术器械。', category: 'equipment', rank: Rank.Lv2 },
        { id: 'ni2', name: '止痛剂', quantity: 5, icon: '💊', description: '街头常见的强效麻醉药。', category: 'consumable', rank: Rank.Lv1 },
    ],
    socialFeed: [
      { 
          id: 'sf1', 
          content: '由于最近的电磁风暴，第7区诊所暂停营业。急诊请走后门通道。', 
          timestamp: '2077-11-02 09:42',
          comments: [
              { id: 'c1', sender: 'Player', content: '收到，今晚过去。', timestamp: '2077-11-02 10:00' }
          ]
      },
      { 
          id: 'sf2', 
          content: '收到了一些有趣的新货...', 
          timestamp: '2077-11-01 22:15', 
          image: 'https://picsum.photos/400/200?random=2',
          comments: []
      }
    ]
  },
  {
    id: 'n2',
    name: '艾莉亚 (Aria)',
    gender: 'female',
    group: '荒坂公司',
    position: '特别行动组执行官',
    affiliation: '荒坂塔',
    location: '荒坂塔 42F 办公室',
    isContact: true,
    affection: 20,
    avatarUrl: 'https://picsum.photos/200/200?random=3',
    status: 'busy',
    stats: {
        hp: { current: 500, max: 500 },
        mp: { current: 40, max: 100 },
        formStability: 99,
        formStatus: FormStatus.Stable,
        psionic: { 
            level: Rank.Lv5, xp: 9000, maxXp: 10000,
            conversionRate: 180, // High Female
            recoveryRate: 60 
        },
        sixDim: {
            力量: 16,
            敏捷: 18,
            体质: 14,
            感知: 20,
            意志: 17,
            魅力: 22,
            freePoints: 0,
            cap: 99,
        },
        sanity: { current: 20, max: 100 },
        charisma: { current: 88, max: 100 },
        credits: 999999,
        gasMask: { current: 100, max: 100 }
    },
    bodyParts: ariaBodyParts, // Modified body parts with captured souls
    inventory: [
        { id: 'ni3', name: '加密数据芯片', quantity: 1, icon: '💾', description: '包含最高机密。', category: 'quest', rank: Rank.Lv5 }
    ],
    socialFeed: []
  },
  {
    id: 'n3',
    name: '杰克 (Jack)',
    gender: 'male',
    group: '第7区',
    position: '雇佣兵',
    affiliation: '来生酒吧',
    location: '来生酒吧 VIP卡座',
    isContact: true,
    trust: 85,
    avatarUrl: 'https://picsum.photos/200/200?random=4',
    status: 'offline',
    stats: {
        hp: { current: 450, max: 450 },
        mp: { current: 50, max: 100 },
        formStability: 70,
        formStatus: FormStatus.Stable,
        psionic: { 
            level: Rank.Lv2, xp: 200, maxXp: 800,
            conversionRate: 5, // Male range (0-30)
            recoveryRate: 150 // Male range (70-200)
        },
        sixDim: {
            力量: 15,
            敏捷: 12,
            体质: 14,
            感知: 10,
            意志: 11,
            魅力: 9,
            freePoints: 0,
            cap: 99,
        },
        sanity: { current: 55, max: 100 },
        charisma: { current: 50, max: 100 },
        credits: 120,
        gasMask: { current: 100, max: 100 }
    },
    spiritSkills: [
        { id: 'j_sk1', name: '灵弦：重火器精通', level: 2, description: '使用重型武器时后坐力减少，命中率提升。' },
        { id: 'j_sk2', name: '灵弦：钢铁意志', level: 3, description: '免疫恐惧状态，在濒死时战斗力不减反增。' }
    ],
    chips: [
        MOCK_CHIPS[2], // Active
        MOCK_CHIPS[3], // Passive
        MOCK_CHIPS[5], // Process
    ],
    inventory: [
        { id: 'ni4', name: '动能左轮', quantity: 1, icon: '🔫', description: '大口径，停止作用力极强。', category: 'equipment', rank: Rank.Lv3 }
    ],
    socialFeed: [
        { id: 'sf3', content: '今晚的酒不错，想喝一杯的来老地方找我。', timestamp: '2077-11-03 01:00', comments: [] }
    ]
  },
  // "Nearby" Strangers
  {
    id: 'n4_nearby',
    name: '可疑的路人',
    gender: 'male',
    group: '', 
    position: '流浪汉',
    affiliation: '无',
    location: '第7区 - 下层贫民窟',
    isContact: false, // Not a contact
    avatarUrl: 'https://picsum.photos/200/200?random=5',
    status: 'online',
    stats: MOCK_PLAYER_STATS,
    inventory: [],
    socialFeed: []
  },
  {
    id: 'n5_nearby',
    name: '巡逻警卫',
    gender: 'male',
    group: '', 
    position: 'NCPD 协警',
    affiliation: 'NCPD',
    location: '第7区 - 下层贫民窟',
    isContact: false, // Not a contact
    avatarUrl: 'https://picsum.photos/200/200?random=6',
    status: 'busy',
    stats: MOCK_PLAYER_STATS,
    inventory: [],
    socialFeed: []
  }
];

// Chips in storage (not equipped)
export const MOCK_STORAGE_CHIPS: Chip[] = [
    { id: 'c_store_1', name: '防火墙 V1', type: 'passive', rank: Rank.Lv1, description: '基础的网络防御协议。' },
    { id: 'c_store_2', name: '瞄准辅助', type: 'active', rank: Rank.Lv2, description: '与智能武器连接，提高命中率。' },
    { id: 'c_store_3', name: '情感抑制', type: 'process', rank: Rank.Lv3, description: '在极端压力下保持冷静。' },
];

export const MOCK_INVENTORY: Item[] = [
  { id: 'i1', name: '高能营养液', quantity: 3, icon: '💊', description: '快速回复少量生命值。', category: 'consumable', rank: Rank.Lv1 },
  { id: 'i2', name: '老式存储盘', quantity: 1, icon: '💾', description: '旧时代的数据存储介质。', category: 'material', rank: Rank.Lv2 },
  { id: 'i3', name: '未知的密钥', quantity: 1, icon: '🔑', description: '不知道能打开哪扇门。', category: 'quest', rank: Rank.Lv4 },
  { id: 'i4', name: '合成烟草', quantity: 12, icon: '🚬', description: '缓解精神压力的消耗品。', category: 'consumable', rank: Rank.Lv1 },
  { id: 'i5', name: '单分子线', quantity: 1, icon: '🎗️', description: '极度锋利的暗杀武器。', category: 'equipment', rank: Rank.Lv3 },
  { id: 'i6', name: '钛金骨架', quantity: 2, icon: '🦴', description: '用于升级义体的基础材料。', category: 'material', rank: Rank.Lv3 },
];

export const MOCK_MESSAGES: Message[] = [
    { id: '1', sender: 'System', content: '欢迎来到夜之城。神经连接已建立。', timestamp: '2077-11-01 08:00', type: 'narrative' },
    { id: '2', sender: 'NPC', name: '薇尔薇特', content: '听说你最近遇到点麻烦？', timestamp: '2077-11-01 08:05', type: 'dialogue' },
    { id: '3', sender: 'Player', content: '没什么大碍，只是义体有点过热。', timestamp: '2077-11-01 08:06', type: 'dialogue' }
];

export const MOCK_ZONES: Zone[] = [
    {
        id: 'z1',
        name: '第7区 - 下层贫民窟',
        controller: '第7区帮派',
        developmentLevel: 20,
        combatPower: 500,
        leader: '杰克',
        members: ['n3'],
        dangerLevel: 3,
        description: '混乱、肮脏，但也充满机遇。黑市交易的中心。',
        imageUrl: 'https://picsum.photos/400/200?random=10',
        svgPath: 'M20,20 L150,20 L150,150 L20,150 Z', 
        landmarks: [
            {
                id: 'l1',
                name: '维克多诊所',
                type: 'Clinic',
                description: '地下义体诊所，虽然简陋但手艺精湛。',
                coordinates: { x: 80, y: 80 },
                services: [
                    { id: 's1', name: '基础治疗', type: 'clinic', description: '回复生命值', quality: Rank.Lv2, isAvailable: true }
                ],
                dangerLevel: 1
            }
        ],
        color: '#ef4444' 
    },
    {
        id: 'z2',
        name: '荒坂塔 - 商业区',
        controller: '荒坂公司',
        developmentLevel: 95,
        combatPower: 9000,
        leader: '三郎',
        members: ['n2'],
        dangerLevel: 5,
        description: '夜之城的心脏，绝对的秩序与极度的压抑。',
        imageUrl: 'https://picsum.photos/400/200?random=11',
        svgPath: 'M160,20 L280,20 L280,180 L160,180 Z',
        landmarks: [],
        color: '#3b82f6'
    }
];

export const MOCK_QUESTS: Quest[] = [
    {
        id: 'q1',
        title: '回收废弃义体',
        description: '帮我从第7区废品站找回一个型号为Mk.II的义眼。',
        objectives: ['前往废品站', '找到义眼', '交还给薇尔薇特'],
        issuer: '薇尔薇特',
        reward: '¥ 500',
        difficulty: Rank.Lv1,
        status: 'active',
        deadline: '24h'
    },
    {
        id: 'q2',
        title: '暗杀公司特工',
        description: '一个荒坂特工正在调查我们的据点，让他消失。',
        objectives: ['定位特工', '消灭目标'],
        issuer: '第7区帮派',
        reward: '¥ 2000',
        difficulty: Rank.Lv3,
        status: 'active'
    }
];

export const MOCK_PLAYER_FACTION: PlayerFaction = {
    name: '暗夜行者',
    level: 2,
    headquarters: '废弃地铁站',
    economy: {
        monthlyIncome: 5000,
        monthlyUpkeep: 2000,
        treasury: 12000,
        sources: [{ name: '黑市保护费', amount: 5000 }]
    },
    members: [
        { id: 'fm1', name: '老乔', role: '突击手', status: 'idle', loyalty: 80, groupId: 'fg1' },
        { id: 'fm2', name: '莎拉', role: '黑客', status: 'task', loyalty: 90, groupId: 'fg1' }
    ],
    groups: [
        { id: 'fg1', name: '阿尔法小队', memberIds: ['fm1', 'fm2'] }
    ],
    relations: [
        { zoneId: 'z1', standing: 50, status: 'Friendly' },
        { zoneId: 'z2', standing: -80, status: 'Hostile' }
    ],
    industries: [
        { id: 'fi1', name: '地下赌场', type: '娱乐', level: 1, output: 2000, upkeep: 500, status: 'active' }
    ],
    postedTasks: [
        { id: 'ft1', title: '招募新人', description: '我们需要更多人手。', reward: 500, status: 'open', targetAudience: 'external' }
    ],
    logs: [
        { id: 'fl1', content: '成功占领了地下赌场。', timestamp: '2077-10-01', type: 'success' }
    ]
};

export const MOCK_AVAILABLE_FACTIONS = [
    { id: 'f_corpo', name: '公司狗 (Corpo)', desc: '曾在荒坂塔顶端俯瞰众生，如今跌落尘埃。拥有极高的商业头脑与黑客技术。', location: '荒坂塔下层' },
    { id: 'f_street', name: '街头小子 (Street Kid)', desc: '在第7区的阴沟里长大，熟知每一条暗巷与每一个帮派。', location: '第7区' },
    { id: 'f_nomad', name: '流浪者 (Nomad)', desc: '来自城外的废土，重视家族与自由。擅长机械维修与载具驾驶。', location: '恶土边缘' }
];

export const MOCK_STARTER_CHIPS: Chip[] = [
    { id: 'sc1', name: '基础骇入', type: 'active', rank: Rank.Lv1, description: '简单的电子门锁破解协议。' },
    { id: 'sc2', name: '初级义眼光学', type: 'passive', rank: Rank.Lv1, description: '稍微提高视觉缩放倍率。' },
    { id: 'sc3', name: '肾上腺素增强', type: 'process', rank: Rank.Lv1, description: '战斗时略微提高反应速度。' }
];

export const MOCK_STARTER_ITEMS: Item[] = [
    { id: 'si1', name: '急救包', quantity: 2, icon: '🩹', category: 'consumable', rank: Rank.Lv1, description: '止血并回复少量生命。' },
    { id: 'si2', name: '动能手枪', quantity: 1, icon: '🔫', category: 'equipment', rank: Rank.Lv1, description: '老式但可靠的火药武器。' },
    { id: 'si3', name: '合成食物', quantity: 5, icon: '🍱', category: 'consumable', rank: Rank.Lv1, description: '维持生命所需的最低热量。' }
];

export const MOCK_STARTER_BOARDS: Chip[] = [
    { id: 'sb1', name: '军用科技平民版', type: 'board', rank: Rank.Lv1, description: '标准平民配置，只有4个插槽。' },
    { id: 'sb2', name: '荒坂试作型', type: 'board', rank: Rank.Lv2, description: '略微不稳定的原型机，拥有8个插槽。' }
];
