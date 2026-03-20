import { CareerTrack, Chip, EquippedItem, Item, LingshuPart, Rank, Skill } from '../types';

export interface LnSetupPackData {
  version: 2;
  boardOptions: Chip[];
  availableChips: Chip[];
  availableItems: Item[];
  selectedStarterItemIds: string[];
  zoneOptions: string[];
  lingshuParts: LingshuPart[];
  partSkillPools: Record<string, Skill[]>;
  partEquipPools: Record<string, EquippedItem[]>;
  careerTracks: CareerTrack[];
}

export const LN_SETUP_PACK_STORAGE_KEY = 'ln_setup_pack_v2';
export const LN_SETUP_PACK_LEGACY_STORAGE_KEY = 'ln_setup_pack_v1';

const levelToRank = (level: number): Rank => {
  if (level <= 1) return Rank.Lv1;
  if (level === 2) return Rank.Lv2;
  if (level === 3) return Rank.Lv3;
  if (level === 4) return Rank.Lv4;
  return Rank.Lv5;
};

const BODY_PART_DEFS: Array<{ key: string; name: string; level: number; description: string }> = [
  { key: 'brain', name: '大脑', level: 3, description: '认知中枢与灵能感知核心。' },
  { key: 'eyes', name: '双眼', level: 3, description: '视觉神经与深度数据处理单元。' },
  { key: 'face', name: '面部', level: 2, description: '感官伪装与表情模组接口。' },
  { key: 'mouth', name: '嘴部', level: 2, description: '语音输出与能量摄入端口。' },
  { key: 'body', name: '身躯', level: 2, description: '生命维持系统主躯干。' },
  { key: 'chest', name: '胸部', level: 2, description: '循环增强与导压模块区域。' },
  { key: 'genital', name: '阴部', level: 3, description: '高敏回路与外泄控制节点。' },
  { key: 'hip', name: '臀部', level: 3, description: '核心承压与外泄缓冲区域。' },
  { key: 'l_arm', name: '左臂', level: 2, description: '精密操控与传导辅助部位。' },
  { key: 'r_arm', name: '右臂', level: 3, description: '战术强化与武装挂载部位。' },
  { key: 'l_hand', name: '左手', level: 2, description: '细粒度控制与接触感知。' },
  { key: 'r_hand', name: '右手', level: 2, description: '输出稳定与抓握强化。' },
  { key: 'l_leg', name: '左腿', level: 2, description: '位移稳定与压力承载。' },
  { key: 'r_leg', name: '右腿', level: 2, description: '速度与爆发动作支撑。' },
  { key: 'l_foot', name: '左脚', level: 1, description: '静音移动与姿态修正。' },
  { key: 'r_foot', name: '右脚', level: 1, description: '平衡与反冲缓解。' },
  { key: 'axilla', name: '腋下', level: 4, description: '敏感散热与腺体控制区域。' },
];

export const LN_AUTHOR_BOARD_OPTIONS: Chip[] = [
  { id: 'board_lv1', name: '神经主板 I 型', type: 'board', rank: Rank.Lv1, description: '提供一个芯片槽位。' },
  { id: 'board_lv2', name: '神经主板 II 型', type: 'board', rank: Rank.Lv2, description: '民用增强型主板。' },
  { id: 'board_lv3', name: '神经主板 III 型', type: 'board', rank: Rank.Lv3, description: '战术级主板，支持并行回路。' },
  { id: 'board_lv4', name: '神经主板 IV 型', type: 'board', rank: Rank.Lv4, description: '高密度阵列主板。' },
  { id: 'board_lv5', name: '神经主板 V 型', type: 'board', rank: Rank.Lv5, description: '旗舰主板，极限扩展。' },
];

const LN_AUTHOR_STARTER_CHIPS: Chip[] = [
  { id: 'sc1', name: '基础骇入', type: 'active', rank: Rank.Lv1, description: '简单的电子门锁破解协议。' },
  { id: 'sc2', name: '初级义眼光学', type: 'passive', rank: Rank.Lv1, description: '稍微提高视觉缩放倍率。' },
  { id: 'sc3', name: '肾上腺素增强', type: 'process', rank: Rank.Lv1, description: '战斗时略微提高反应速度。' },
];

const LN_AUTHOR_STARTER_ITEMS: Item[] = [
  { id: 'si1', name: '急救包', quantity: 2, icon: '🩹', category: 'consumable', rank: Rank.Lv1, description: '止血并回复少量生命。' },
  { id: 'si2', name: '动能手枪', quantity: 1, icon: '🔫', category: 'equipment', rank: Rank.Lv1, description: '老式但可靠的火药武器。' },
  { id: 'si3', name: '合成食物', quantity: 5, icon: '🍱', category: 'consumable', rank: Rank.Lv1, description: '维持生命所需的最低热量。' },
];

const LN_AUTHOR_LINGSHU_EQUIPMENT: EquippedItem[] = [
  { id: 'lse_1', name: '共鸣束环', rank: Rank.Lv2, description: '稳定局部灵压，减少回路噪声。' },
  { id: 'lse_2', name: '灵导护片', rank: Rank.Lv3, description: '提升灵力传导效率与耐受。' },
  { id: 'lse_3', name: '折光膜片', rank: Rank.Lv1, description: '降低外界干扰与可见性。' },
  { id: 'lse_4', name: '虚轴锚点', rank: Rank.Lv4, description: '高压状态下保持稳定锚定。' },
  { id: 'lse_5', name: '声纹校准器', rank: Rank.Lv2, description: '修正声纹偏差，降低共振损耗。' },
  { id: 'lse_6', name: '导流压阀', rank: Rank.Lv4, description: '在峰值阶段控制灵压回涌。' },
];

const LN_AUTHOR_LINGXIAN_POOL: Skill[] = [
  { id: 'lss_1', name: '灵弦：回声锁定', level: 1, description: '锁定目标灵压特征。' },
  { id: 'lss_2', name: '灵弦：镜像偏折', level: 2, description: '短时偏折感知，规避干扰。' },
  { id: 'lss_3', name: '灵弦：潮汐复位', level: 3, description: '清除噪讯，快速恢复秩序。' },
  { id: 'lss_4', name: '灵弦：静默屏障', level: 4, description: '形成短时静默域，压制外部侵扰。' },
  { id: 'lss_5', name: '灵弦：神经超载', level: 4, description: '短时间提高反应与输出。' },
  { id: 'lss_6', name: '灵弦：痛觉迟钝', level: 5, description: '抑制痛觉反馈，增强持续作战。' },
  { id: 'lss_7', name: '灵弦：震荡折返', level: 3, description: '回弹冲击并削弱目标稳定。' },
  { id: 'lss_8', name: '灵弦：温域适配', level: 2, description: '减轻高温/低温环境影响。' },
  { id: 'lss_9', name: '灵弦：相位切换', level: 5, description: '短时调整相位降低命中概率。' },
  { id: 'lss_10', name: '灵弦：脉冲净化', level: 1, description: '小幅净化杂质并修复波形。' },
];

export const LN_AUTHOR_ZONE_OPTIONS = ['艾瑞拉区', '淬灵区', '汐屿区', '诺丝区', '栖灵区', '圣教区', '交界地', '南荒'];

export const LN_AUTHOR_CAREER_TRACKS: CareerTrack[] = [
  {
    id: 'career_track_core',
    name: '基础劳服线',
    entryRequirement: '开局完成身份鉴定',
    description: '默认线路，用于搭建事件节点模板。',
    nodes: [
      {
        id: 'career_node_core_root',
        name: '鉴定登记',
        unlockRequirement: '无',
        eventTask: '在登记处完成资质鉴定并领取身份标签。',
        eventReward: '开启职业线路编辑权限。',
        lineType: 'main',
        x: 0,
        y: 0,
        links: {},
      },
    ],
    rootNodeId: 'career_node_core_root',
  },
];

export const cloneChipList = (chips: Chip[]): Chip[] => chips.map(chip => ({ ...chip }));
export const cloneItemList = (items: Item[]): Item[] => items.map(item => ({ ...item }));
export const cloneSkillList = (skills: Skill[]): Skill[] => skills.map(skill => ({ ...skill }));
export const cloneEquipList = (items: EquippedItem[]): EquippedItem[] => items.map(item => ({ ...item }));
export const cloneLingshuParts = (parts: LingshuPart[]): LingshuPart[] =>
  parts.map(part => ({
    ...part,
    equippedItem: part.equippedItem ? { ...part.equippedItem } : null,
    equippedItems: part.equippedItems ? cloneEquipList(part.equippedItems) : [],
    spiritSkill: part.spiritSkill ? { ...part.spiritSkill } : null,
    spiritSkills: part.spiritSkills ? cloneSkillList(part.spiritSkills) : [],
  }));

const cloneCareerNodeLinks = (links?: CareerTrack['nodes'][number]['links']) => ({ ...(links || {}) });
export const cloneCareerTracks = (tracks: CareerTrack[]): CareerTrack[] =>
  tracks.map(track => ({
    ...track,
    nodes: track.nodes.map(node => ({
      ...node,
      links: cloneCareerNodeLinks(node.links),
    })),
  }));

export const cloneSkillPoolMap = (pools: Record<string, Skill[]>): Record<string, Skill[]> =>
  Object.fromEntries(Object.entries(pools).map(([key, skills]) => [key, cloneSkillList(skills || [])]));
export const cloneEquipPoolMap = (pools: Record<string, EquippedItem[]>): Record<string, EquippedItem[]> =>
  Object.fromEntries(Object.entries(pools).map(([key, items]) => [key, cloneEquipList(items || [])]));

const buildDefaultLingshuParts = (): LingshuPart[] =>
  BODY_PART_DEFS.map((part, index) => ({
    id: `ls_${part.key}_${index + 1}`,
    key: part.key,
    name: part.name,
    level: part.level,
    rank: levelToRank(part.level),
    description: part.description,
    equippedItem: null,
    spiritSkills: [],
  }));

export const createPartSkillPools = (parts: LingshuPart[]): Record<string, Skill[]> =>
  Object.fromEntries(parts.map(part => [part.id, LN_AUTHOR_LINGXIAN_POOL.map(skill => ({ ...skill }))]));

export const createPartEquipPools = (parts: LingshuPart[]): Record<string, EquippedItem[]> =>
  Object.fromEntries(parts.map(part => [part.id, LN_AUTHOR_LINGSHU_EQUIPMENT.map(item => ({ ...item }))]));

export const buildDefaultSetupPack = (): LnSetupPackData => {
  const lingshuParts = buildDefaultLingshuParts();
  return {
    version: 2,
    boardOptions: cloneChipList(LN_AUTHOR_BOARD_OPTIONS),
    availableChips: cloneChipList(LN_AUTHOR_STARTER_CHIPS),
    availableItems: cloneItemList(LN_AUTHOR_STARTER_ITEMS),
    selectedStarterItemIds: LN_AUTHOR_STARTER_ITEMS.map(item => item.id),
    zoneOptions: [...LN_AUTHOR_ZONE_OPTIONS],
    lingshuParts,
    partSkillPools: cloneSkillPoolMap(createPartSkillPools(lingshuParts)),
    partEquipPools: cloneEquipPoolMap(createPartEquipPools(lingshuParts)),
    careerTracks: cloneCareerTracks(LN_AUTHOR_CAREER_TRACKS),
  };
};

const normalizeStringArray = (value: unknown): string[] | null => {
  if (!Array.isArray(value)) return null;
  const list = value.map(item => `${item}`.trim()).filter(Boolean);
  return list.length ? list : null;
};

export const normalizeSetupPack = (pack?: Partial<LnSetupPackData> | null): LnSetupPackData => {
  const defaults = buildDefaultSetupPack();
  const boardOptions = Array.isArray(pack?.boardOptions) && pack.boardOptions.length
    ? cloneChipList(pack.boardOptions)
    : defaults.boardOptions;
  const availableChips = Array.isArray(pack?.availableChips) && pack.availableChips.length
    ? cloneChipList(pack.availableChips)
    : defaults.availableChips;
  const availableItems = Array.isArray(pack?.availableItems) && pack.availableItems.length
    ? cloneItemList(pack.availableItems)
    : defaults.availableItems;
  const selectedStarterItemIds = Array.isArray(pack?.selectedStarterItemIds)
    ? pack.selectedStarterItemIds.map(id => `${id}`).filter(id => availableItems.some(item => item.id === id))
    : defaults.selectedStarterItemIds;
  const zoneOptions = normalizeStringArray(pack?.zoneOptions) || defaults.zoneOptions;
  const lingshuParts = Array.isArray(pack?.lingshuParts) && pack.lingshuParts.length
    ? cloneLingshuParts(pack.lingshuParts)
    : defaults.lingshuParts;
  const sourceSkillPools =
    pack?.partSkillPools && typeof pack.partSkillPools === 'object'
      ? cloneSkillPoolMap(pack.partSkillPools as Record<string, Skill[]>)
      : defaults.partSkillPools;
  const sourceEquipPools =
    pack?.partEquipPools && typeof pack.partEquipPools === 'object'
      ? cloneEquipPoolMap(pack.partEquipPools as Record<string, EquippedItem[]>)
      : defaults.partEquipPools;
  const partSkillPools = Object.fromEntries(
    lingshuParts.map(part => [part.id, cloneSkillList(sourceSkillPools[part.id] || defaults.partSkillPools[part.id] || [])]),
  );
  const partEquipPools = Object.fromEntries(
    lingshuParts.map(part => [part.id, cloneEquipList(sourceEquipPools[part.id] || defaults.partEquipPools[part.id] || [])]),
  );
  const careerTracks = Array.isArray(pack?.careerTracks) && pack.careerTracks.length
    ? cloneCareerTracks(pack.careerTracks)
    : defaults.careerTracks;

  return {
    version: 2,
    boardOptions,
    availableChips,
    availableItems,
    selectedStarterItemIds,
    zoneOptions,
    lingshuParts,
    partSkillPools,
    partEquipPools,
    careerTracks,
  };
};
