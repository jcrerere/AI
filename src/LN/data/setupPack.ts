import { CareerTrack, Chip, EquippedItem, Item, LingshuPart, Rank, Skill } from '../types';
import {
  canonicalizeSpiritSkillCard,
  createPartSkillPools as createSpiritSkillPoolsByPart,
} from './spiritSkillPool';

export interface LnSetupPackData {
  version: 2;
  boardOptions: Chip[];
  availableChips: Chip[];
  availableItems: Item[];
  selectedStarterItemIds: string[];
  zoneOptions: string[];
  lingshuParts: LingshuPart[];
  selectedCoreSkills: Skill[];
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
  {
    id: 'chip_trace_sampling',
    name: '灵痕采样',
    type: 'passive',
    rank: Rank.Lv1,
    description: '可识别现场是否存在灵能残留，不再两眼一抹黑。',
    effectLines: ['可发现灵能残留与异常痕迹', '感知+1'],
    aiSummary: '调查起步芯片，让使用者至少能看见“这里发生过什么”。',
    sixDimBonuses: { 感知: 1 },
  },
  {
    id: 'chip_trace_layering',
    name: '灵痕分层',
    type: 'process',
    rank: Rank.Lv2,
    description: '区分残留的新旧、强弱和大致人数，调查不再只靠猜。',
    effectLines: ['可判断痕迹新旧、强弱与人数规模', '感知+1', '意志+1'],
    aiSummary: '在案发现场、追踪和搜查中获得更可靠的第一轮判断。',
    sixDimBonuses: { 感知: 1, 意志: 1 },
  },
  {
    id: 'chip_trace_replay',
    name: '灵痕复盘',
    type: 'process',
    rank: Rank.Lv3,
    description: '从残留中复原最近一段动作顺序，看出追逐、拖拽、交手或逃离。',
    effectLines: ['可复原短时行动轨迹', '感知+2', '意志+1'],
    aiSummary: '调查正式进入“还原过程”阶段，不只知道有事发生，还能看出怎么发生。',
    sixDimBonuses: { 感知: 2, 意志: 1 },
  },
  {
    id: 'chip_trace_analysis',
    name: '灵痕析术',
    type: 'active',
    rank: Rank.Lv4,
    description: '可从残留中判断术式类别、施压方向、是否负伤与是否带诅咒。',
    effectLines: ['可分析术式类型与异常状态', '感知+2', '意志+2'],
    aiSummary: '高危调查芯片，能把“看见痕迹”推进到“读懂对手”。',
    sixDimBonuses: { 感知: 2, 意志: 2 },
  },
  {
    id: 'chip_trace_lock',
    name: '灵痕追锁',
    type: 'active',
    rank: Rank.Lv5,
    description: '锁定单一目标的灵痕并持续追索一段时间，调查直接跨入追猎阶段。',
    effectLines: ['可锁定单一目标灵痕持续追索', '感知+3', '意志+2'],
    aiSummary: '顶级调查芯片，能把线索直接变成追踪权。',
    sixDimBonuses: { 感知: 3, 意志: 2 },
  },
  {
    id: 'chip_intrusion_protocol',
    name: '入侵协议',
    type: 'active',
    rank: Rank.Lv1,
    description: '可开启低级门禁、读取民用终端与普通监控。',
    effectLines: ['可破解低级门禁与民用终端', '感知+1', '意志+1'],
    aiSummary: '黑客起步芯片，先把最低层的电子阻碍变成可互动对象。',
    sixDimBonuses: { 感知: 1, 意志: 1 },
  },
  {
    id: 'chip_permission_strip',
    name: '权限剥离',
    type: 'process',
    rank: Rank.Lv2,
    description: '可绕过基础权限校验，复制日志、导出记录、删除小段痕迹。',
    effectLines: ['可绕过基础权限并调取日志', '感知+1', '意志+2'],
    aiSummary: '不只是开门，而是开始真正改写和带走信息。',
    sixDimBonuses: { 感知: 1, 意志: 2 },
  },
  {
    id: 'chip_backdoor_seed',
    name: '后门植入',
    type: 'process',
    rank: Rank.Lv3,
    description: '可在设备或小型网络中埋下后门，为后续反复接入留口子。',
    effectLines: ['可植入后门并保留后续入口', '感知+2', '意志+2'],
    aiSummary: '黑客线的真正分水岭，开始具备持续控制价值。',
    sixDimBonuses: { 感知: 2, 意志: 2 },
  },
  {
    id: 'chip_link_hijack',
    name: '链路劫持',
    type: 'active',
    rank: Rank.Lv4,
    description: '短时夺控摄像头、门锁、炮台、安保终端等单体设备。',
    effectLines: ['可短时夺控单体设备', '感知+2', '意志+2', '敏捷+1'],
    aiSummary: '高压场景里能把对方的设施直接掰成自己的工具。',
    sixDimBonuses: { 感知: 2, 意志: 2, 敏捷: 1 },
  },
  {
    id: 'chip_domain_takeover',
    name: '域控接管',
    type: 'process',
    rank: Rank.Lv5,
    description: '短时间接管一个小场景内的电子秩序，但会留下明显的系统反应。',
    effectLines: ['可接管小场景电子秩序', '感知+2', '意志+3', '转化率+5%'],
    aiSummary: '顶级黑客芯片，已经是在改写局部环境规则。',
    sixDimBonuses: { 感知: 2, 意志: 3 },
    conversionRateBonus: 5,
  },
  {
    id: 'chip_burst_step',
    name: '爆步驱动',
    type: 'active',
    rank: Rank.Lv1,
    description: '获得一次短距爆发位移，在追人、抢门、闪身时非常直接。',
    effectLines: ['获得短距爆发位移', '敏捷+1', '体质+1'],
    aiSummary: '动作线起步芯片，先给出明确的位移权。',
    sixDimBonuses: { 敏捷: 1, 体质: 1 },
  },
  {
    id: 'chip_breakline_return',
    name: '变线折返',
    type: 'active',
    rank: Rank.Lv2,
    description: '高速移动中可急停、折返、切线，追逐和脱离都更难被读。',
    effectLines: ['可高速变线、急停与折返', '敏捷+2'],
    aiSummary: '让动作不只是快，而是难以预测。',
    sixDimBonuses: { 敏捷: 2 },
  },
  {
    id: 'chip_reflex_leverage',
    name: '反射借力',
    type: 'passive',
    rank: Rank.Lv3,
    description: '翻越、撞门、坠落缓冲和突发规避的动作代价明显下降。',
    effectLines: ['大幅降低翻越、冲撞与缓冲代价', '敏捷+2', '体质+1'],
    aiSummary: '动作线中段核心，让移动和环境互动一起变强。',
    sixDimBonuses: { 敏捷: 2, 体质: 1 },
  },
  {
    id: 'chip_firststrike_predict',
    name: '先手预测',
    type: 'process',
    rank: Rank.Lv4,
    description: '短时预演交锋首拍，提升抢拍、卡位、先手压制的成功率。',
    effectLines: ['可短时预演交锋首拍', '敏捷+2', '感知+1', '意志+1'],
    aiSummary: '高危冲突里更容易拿到第一轮主动。',
    sixDimBonuses: { 敏捷: 2, 感知: 1, 意志: 1 },
  },
  {
    id: 'chip_combat_overclock',
    name: '临战超频',
    type: 'active',
    rank: Rank.Lv5,
    description: '在短时间内强行拉高动作、出力和抗压，适合抢决胜段。',
    effectLines: ['短时全面拔高动作与出力', '力量+2', '敏捷+2', '体质+1', '意志+1'],
    aiSummary: '动作线顶级爆发芯片，适合强闯、近战和抢斩杀。',
    sixDimBonuses: { 力量: 2, 敏捷: 2, 体质: 1, 意志: 1 },
  },
  {
    id: 'chip_spirit_taste_extract',
    name: '灵味萃取',
    type: 'process',
    rank: Rank.Lv1,
    description: '把料理从“能吃”变成“有功能”，可稳定偏向恢复体力或安抚精神。',
    effectLines: ['料理可稳定提供基础恢复', '感知+1', '魅力+1', '恢复率+3%'],
    aiSummary: '厨艺线起步芯片，让吃饭本身开始有玩法价值。',
    sixDimBonuses: { 感知: 1, 魅力: 1 },
    recoveryRateBonus: 3,
  },
  {
    id: 'chip_recipe_compile',
    name: '配方编译',
    type: 'process',
    rank: Rank.Lv2,
    description: '可根据对象状态调整配方，做出偏提神、安睡、回稳或压惊的料理。',
    effectLines: ['可按对象状态定向出餐', '感知+1', '意志+1', '恢复率+5%'],
    aiSummary: '让厨艺进入“对人下菜”的状态管理玩法。',
    sixDimBonuses: { 感知: 1, 意志: 1 },
    recoveryRateBonus: 5,
  },
  {
    id: 'chip_effective_cooking',
    name: '效能调炊',
    type: 'process',
    rank: Rank.Lv3,
    description: '可处理低阶灵材，让食物附带短时强化或状态修复效果。',
    effectLines: ['可将低阶灵材转成短时增益餐', '感知+2', '魅力+1', '恢复率+6%'],
    aiSummary: '厨艺线真正成型，开始把资源转成队伍状态优势。',
    sixDimBonuses: { 感知: 2, 魅力: 1 },
    recoveryRateBonus: 6,
  },
  {
    id: 'chip_banquet_arrangement',
    name: '宴席编排',
    type: 'passive',
    rank: Rank.Lv4,
    description: '可围绕多人状态和场景目标编排整席料理，适合经营、招待与养成。',
    effectLines: ['一席料理可同时作用多人', '感知+2', '魅力+2', '恢复率+8%'],
    aiSummary: '高阶厨艺芯片，经营线和社交线会很有存在感。',
    sixDimBonuses: { 感知: 2, 魅力: 2 },
    recoveryRateBonus: 8,
  },
  {
    id: 'chip_spirit_banquet_master',
    name: '灵宴主厨',
    type: 'process',
    rank: Rank.Lv5,
    description: '可做战前、恢复、安抚、诱导等高功能料理，已经接近完整后勤体系。',
    effectLines: ['可制作高功能性灵能料理', '感知+2', '魅力+2', '意志+1', '恢复率+10%'],
    aiSummary: '厨艺线顶点，食物本身可以成为战前准备和长期经营的核心环节。',
    sixDimBonuses: { 感知: 2, 魅力: 2, 意志: 1 },
    recoveryRateBonus: 10,
  },
  {
    id: 'chip_heatforge_calc',
    name: '热锻演算',
    type: 'process',
    rank: Rank.Lv1,
    description: '可完成基础修补与保养，让工具和装备不至于轻易报废。',
    effectLines: ['可进行基础修补与保养', '力量+1', '感知+1'],
    aiSummary: '锻造线起步芯片，先解决“能不能修”的问题。',
    sixDimBonuses: { 力量: 1, 感知: 1 },
  },
  {
    id: 'chip_structure_calib',
    name: '结构校模',
    type: 'process',
    rank: Rank.Lv2,
    description: '可校正武器和工具的误差、重心与手感，让现成装备更顺手。',
    effectLines: ['可校正装备手感与结构误差', '力量+1', '感知+1', '意志+1'],
    aiSummary: '锻造线开始真正产生“同一把装备也能更好用”的差异。',
    sixDimBonuses: { 力量: 1, 感知: 1, 意志: 1 },
  },
  {
    id: 'chip_mod_assembly',
    name: '改件拼装',
    type: 'active',
    rank: Rank.Lv3,
    description: '可给装备加装临时改件，出门前快速改出当前最需要的方向。',
    effectLines: ['可加装临时改件', '力量+1', '感知+2', '意志+1'],
    aiSummary: '锻造线中段核心，让准备环节真正变成策略环节。',
    sixDimBonuses: { 力量: 1, 感知: 2, 意志: 1 },
  },
  {
    id: 'chip_reforge_pattern',
    name: '重锻编模',
    type: 'process',
    rank: Rank.Lv4,
    description: '可对现有装备进行重锻，明显改变其性能倾向与使用风格。',
    effectLines: ['可重锻装备并改写性能方向', '力量+1', '感知+2', '意志+2'],
    aiSummary: '高阶锻造芯片，已经不是修补，而是在重新定义装备。',
    sixDimBonuses: { 力量: 1, 感知: 2, 意志: 2 },
  },
  {
    id: 'chip_field_assembly',
    name: '战地拼装',
    type: 'active',
    rank: Rank.Lv5,
    description: '可用素材和旧件快速拼出可用品，在极限条件下维持作战与生存。',
    effectLines: ['可在现场快速拼装可用品', '力量+2', '感知+2', '意志+2'],
    aiSummary: '锻造线顶点，能把废件和素材直接转成继续推进局面的资本。',
    sixDimBonuses: { 力量: 2, 感知: 2, 意志: 2 },
  },
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

// Legacy placeholder spirit skills were intentionally removed.

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

export const cloneChipList = (chips: Chip[]): Chip[] =>
  chips.map(chip => ({
    ...chip,
    effectLines: chip.effectLines ? [...chip.effectLines] : undefined,
    sixDimBonuses: chip.sixDimBonuses ? { ...chip.sixDimBonuses } : undefined,
  }));
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

const sanitizeSkillList = (skills?: Skill[], slotKey?: string): Skill[] =>
  (skills || [])
    .map(skill => canonicalizeSpiritSkillCard({ ...skill }, slotKey))
    .filter(Boolean) as Skill[];

const sanitizeLingshuParts = (parts: LingshuPart[]): LingshuPart[] =>
  cloneLingshuParts(parts).map(part => {
    const spiritSkills = sanitizeSkillList(part.spiritSkills ?? (part.spiritSkill ? [part.spiritSkill] : []), part.key).filter(
      skill => skill.mountType !== 'core',
    );
    return {
      ...part,
      spiritSkill: spiritSkills[0] || null,
      spiritSkills,
    };
  });

const sanitizeSkillPoolMap = (pools: Record<string, Skill[]>, parts: LingshuPart[]): Record<string, Skill[]> => {
  const partKeyById = new Map(parts.map(part => [part.id, part.key]));
  return Object.fromEntries(
    Object.entries(pools).map(([key, skills]) => [
      key,
      sanitizeSkillList(skills, partKeyById.get(key)).filter(skill => skill.mountType !== 'core'),
    ]),
  );
};

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

const buildSkillPoolMergeKey = (skill: Skill): string =>
  `${`${skill.familyId || skill.name || ''}`.trim().toLowerCase()}::${Number.isFinite(skill.level) ? skill.level : 0}`;

const mergeSkillPoolEntries = (base: Skill[], incoming: Skill[]): Skill[] => {
  const next = cloneSkillList(base);
  const seen = new Set(next.map(buildSkillPoolMergeKey));
  for (const skill of incoming || []) {
    const key = buildSkillPoolMergeKey(skill);
    if (!seen.has(key)) {
      next.push({ ...skill });
      seen.add(key);
      continue;
    }
    if (skill.isCustom) {
      const index = next.findIndex(entry => buildSkillPoolMergeKey(entry) === key);
      if (index >= 0) next[index] = { ...skill };
    }
  }
  return next;
};

export const createPartSkillPools = (parts: LingshuPart[]): Record<string, Skill[]> =>
  createSpiritSkillPoolsByPart(parts);

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
    selectedCoreSkills: [],
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
    ? sanitizeLingshuParts(pack.lingshuParts)
    : defaults.lingshuParts;
  const selectedCoreSkills = Array.isArray(pack?.selectedCoreSkills)
    ? sanitizeSkillList(pack.selectedCoreSkills).slice(0, 5)
    : defaults.selectedCoreSkills;
  const sourceSkillPools =
    pack?.partSkillPools && typeof pack.partSkillPools === 'object'
      ? sanitizeSkillPoolMap(cloneSkillPoolMap(pack.partSkillPools as Record<string, Skill[]>), lingshuParts)
      : defaults.partSkillPools;
  const sourceEquipPools =
    pack?.partEquipPools && typeof pack.partEquipPools === 'object'
      ? cloneEquipPoolMap(pack.partEquipPools as Record<string, EquippedItem[]>)
      : defaults.partEquipPools;
  const partSkillPools = Object.fromEntries(
    lingshuParts.map(part => {
      const defaultPool = defaults.partSkillPools[part.id] || [];
      const incomingPool = sourceSkillPools[part.id] || [];
      return [part.id, mergeSkillPoolEntries(defaultPool, incomingPool)];
    }),
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
    selectedCoreSkills,
    partSkillPools,
    partEquipPools,
    careerTracks,
  };
};
