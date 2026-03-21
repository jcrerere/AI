import {
  Chip,
  ForgeAffixRecord,
  ForgeProfile,
  ForgeQualityTier,
  ForgeRecord,
  ForgeWorkshopState,
  ForgeWorkshopTab,
  Item,
  Rank,
} from '../types';

export interface ForgeRequirement {
  id: string;
  label: string;
  mode: 'any_material' | 'data_core' | 'frame_component';
  count: number;
  fallbackFee: number;
}

export interface ForgeBlueprint {
  id: string;
  kind: ForgeWorkshopTab;
  label: string;
  summary: string;
  note: string;
  baseFee: number;
  outputType?: Chip['type'];
  targetPartKey?: string;
  requirements: ForgeRequirement[];
}

export interface ForgeMaterialUsage {
  requirementId: string;
  requirementLabel: string;
  itemId: string | null;
  itemLabel: string;
  count: number;
  source: 'inventory' | 'bench';
  surcharge: number;
}

export interface ForgeResolution {
  quality: ForgeQualityTier;
  affixes: ForgeAffixRecord[];
  totalCost: number;
  usages: ForgeMaterialUsage[];
}

type ForgeAffixTemplate = {
  family: string;
  label: string;
  valuePool: string[];
  summaryPool: string[];
  tiers?: Rank[];
};

const QUALITY_ORDER: ForgeQualityTier[] = ['粗胚', '标准', '精制', '名匠', '原型'];

const CHIP_BLUEPRINTS: ForgeBlueprint[] = [
  {
    id: 'chip_neural_lattice',
    kind: 'chip',
    label: '神经格栅芯片',
    summary: '偏向反应、缓存和稳定的通用主动芯片坯体。',
    note: '适合做第一批基础锻造，不追求极端词条。',
    baseFee: 260,
    outputType: 'active',
    requirements: [
      { id: 'chip_any_core', label: '通用基材', mode: 'any_material', count: 1, fallbackFee: 120 },
      { id: 'chip_data_core', label: '写入基板', mode: 'data_core', count: 1, fallbackFee: 220 },
    ],
  },
  {
    id: 'chip_silent_process',
    kind: 'chip',
    label: '静默流程芯片',
    summary: '偏向协议、交易和匿名处理的流程芯片坯体。',
    note: '更容易出经济、潜入和后台处理相关词条。',
    baseFee: 320,
    outputType: 'process',
    requirements: [
      { id: 'chip_any_core', label: '通用基材', mode: 'any_material', count: 1, fallbackFee: 120 },
      { id: 'chip_data_core', label: '写入基板', mode: 'data_core', count: 1, fallbackFee: 220 },
    ],
  },
  {
    id: 'chip_guard_matrix',
    kind: 'chip',
    label: '守御矩阵芯片',
    summary: '偏向缓冲、防压和恢复的被动芯片坯体。',
    note: '更适合追求稳定发挥和缓冲边际的构筑。',
    baseFee: 300,
    outputType: 'passive',
    requirements: [
      { id: 'chip_any_core', label: '通用基材', mode: 'any_material', count: 1, fallbackFee: 120 },
      { id: 'chip_data_core', label: '写入基板', mode: 'data_core', count: 1, fallbackFee: 220 },
    ],
  },
];

const CYBERWARE_BLUEPRINTS: ForgeBlueprint[] = [
  {
    id: 'cyberware_ocular_loop',
    kind: 'cyberware',
    label: '观测环视模组',
    summary: '偏向视野、锁定和感知辅助的义体模组。',
    note: '作为灵枢兼容外设，可直接进入现有装配链。',
    baseFee: 360,
    targetPartKey: 'eyes',
    requirements: [
      { id: 'cyber_any_frame', label: '通用构件', mode: 'any_material', count: 1, fallbackFee: 140 },
      { id: 'cyber_frame_core', label: '骨架件', mode: 'frame_component', count: 1, fallbackFee: 260 },
    ],
  },
  {
    id: 'cyberware_muscle_weave',
    kind: 'cyberware',
    label: '肌束牵引模组',
    summary: '偏向动作、承压和推进的义体模组。',
    note: '适合作为行动和追击场景下的通用坯体。',
    baseFee: 380,
    targetPartKey: 'l_arm',
    requirements: [
      { id: 'cyber_any_frame', label: '通用构件', mode: 'any_material', count: 1, fallbackFee: 140 },
      { id: 'cyber_frame_core', label: '骨架件', mode: 'frame_component', count: 1, fallbackFee: 260 },
    ],
  },
  {
    id: 'cyberware_pressure_spine',
    kind: 'cyberware',
    label: '灵压稳幅脊夹',
    summary: '偏向稳压、抗冲击和长程负载的脊柱义体模组。',
    note: '更容易出稳幅和缓冲类词条。',
    baseFee: 420,
    targetPartKey: 'body',
    requirements: [
      { id: 'cyber_any_frame', label: '通用构件', mode: 'any_material', count: 1, fallbackFee: 140 },
      { id: 'cyber_frame_core', label: '骨架件', mode: 'frame_component', count: 1, fallbackFee: 260 },
    ],
  },
];

const CHIP_AFFIX_POOL: Record<string, ForgeAffixTemplate[]> = {
  chip_neural_lattice: [
    { family: 'reaction', label: '反应格栅', valuePool: ['+6%', '+8%', '+11%'], summaryPool: ['缩短反应迟滞', '提高先手响应', '减少动作拖延'] },
    { family: 'focus', label: '聚焦缓存', valuePool: ['+10', '+14', '+18'], summaryPool: ['提高短时专注缓存', '减缓注意力飘移', '让临场判断更稳定'] },
    { family: 'surge', label: '过载回闪', valuePool: ['+4%', '+6%', '+9%'], summaryPool: ['在高压瞬间抬升输出', '更容易顶住短时冲击', '危险时会更敢压榨性能'] },
    { family: 'stability', label: '稳流钳制', valuePool: ['+5%', '+7%', '+9%'], summaryPool: ['减少波动和失真', '让链路更平稳', '降低短时失控感'] },
    { family: 'mask', label: '静噪掩膜', valuePool: ['+3%', '+5%', '+7%'], summaryPool: ['削弱链路噪点', '降低被动暴露感', '让后台轨迹更难抓取'] },
  ],
  chip_silent_process: [
    { family: 'market', label: '交易折冲', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['改善交易议价结果', '让后台报价更灵活', '更容易吃到细小价差'] },
    { family: 'ghost', label: '匿名指纹', valuePool: ['+5%', '+7%', '+10%'], summaryPool: ['削弱流程痕迹', '让后台标签更模糊', '短时抹平可疑特征'] },
    { family: 'archive', label: '灰档缓存', valuePool: ['+1层', '+2层', '+3层'], summaryPool: ['增加临时缓存层', '流程中断时保留更多痕迹', '更适合多步操作'] },
    { family: 'route', label: '旁路调度', valuePool: ['+4%', '+6%', '+9%'], summaryPool: ['缩短流程调度耗时', '提高多线程稳定度', '更适合连贯处理'] },
    { family: 'broker', label: '盘口嗅探', valuePool: ['+3%', '+5%', '+7%'], summaryPool: ['更容易抓到盘口波动', '提高灰市信号敏感度', '让价格异动更醒目'] },
  ],
  chip_guard_matrix: [
    { family: 'buffer', label: '缓冲阈值', valuePool: ['+10', '+14', '+18'], summaryPool: ['提高容错缓冲', '更能扛住连续施压', '降低突然崩线的概率'] },
    { family: 'recovery', label: '回稳指令', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['缩短回稳时间', '疲劳后的恢复更平顺', '更快脱离危险边缘'] },
    { family: 'shield', label: '噪波护罩', valuePool: ['+5%', '+7%', '+9%'], summaryPool: ['钳制外部噪波', '缓和突发干扰', '提高被动抗压感'] },
    { family: 'sanity', label: '情绪节律', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['让情绪节律更平缓', '降低高压场景下的乱流', '减少精神抖动'] },
    { family: 'cooldown', label: '热阈均衡', valuePool: ['-4%', '-6%', '-8%'], summaryPool: ['压低热累积', '缩短过载残留', '提高连续运转舒适度'] },
  ],
};

const CYBERWARE_AFFIX_POOL: Record<string, ForgeAffixTemplate[]> = {
  cyberware_ocular_loop: [
    { family: 'clarity', label: '清晰对焦', valuePool: ['+5%', '+7%', '+10%'], summaryPool: ['强化锁定与辨识', '提升视野的稳定度', '让目标边缘更清楚'] },
    { family: 'track', label: '追迹补帧', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['减少动态模糊', '让移动目标更好跟上', '更适合高速场景'] },
    { family: 'scan', label: '细节采样', valuePool: ['+1层', '+2层', '+3层'], summaryPool: ['提升细节读数', '看清更多表面信息', '适合观察和识别'] },
    { family: 'shade', label: '眩光抑制', valuePool: ['+5%', '+7%', '+9%'], summaryPool: ['降低强光干扰', '减轻舞台和霓虹压制', '让夜景更舒服'] },
    { family: 'veil', label: '静视滤层', valuePool: ['+3%', '+5%', '+7%'], summaryPool: ['减少无关噪点', '更适合持续盯视', '让视觉负担更低'] },
  ],
  cyberware_muscle_weave: [
    { family: 'torque', label: '扭矩增幅', valuePool: ['+5%', '+7%', '+10%'], summaryPool: ['提高发力瞬间的爆发', '动作更干脆', '适合近身压制'] },
    { family: 'stride', label: '步幅协调', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['提高位移平顺度', '减少急停失衡', '更适合追逐和闪身'] },
    { family: 'grip', label: '握持补偿', valuePool: ['+5%', '+7%', '+9%'], summaryPool: ['提高稳定持握', '减少器件脱手', '操作更加稳准'] },
    { family: 'shock', label: '反震卸载', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['降低反冲负担', '减轻连续动作的累积伤害', '更适合高频输出'] },
    { family: 'servo', label: '伺服节律', valuePool: ['+3%', '+5%', '+7%'], summaryPool: ['动作节奏更顺', '发力和回收更连贯', '不容易出现顿挫'] },
  ],
  cyberware_pressure_spine: [
    { family: 'stabilizer', label: '稳幅背架', valuePool: ['+5%', '+7%', '+10%'], summaryPool: ['提高长时间负载稳定度', '更抗压', '减少姿态崩散'] },
    { family: 'anchor', label: '支点锁骨', valuePool: ['+4%', '+6%', '+8%'], summaryPool: ['让身体支点更牢', '提高承压时的控制感', '不易在冲撞中走样'] },
    { family: 'vent', label: '热量泄放', valuePool: ['-4%', '-6%', '-8%'], summaryPool: ['降低热堆积', '让高压状态更持久', '过载后恢复更快'] },
    { family: 'cushion', label: '缓冲椎夹', valuePool: ['+10', '+14', '+18'], summaryPool: ['扩大承伤缓冲带', '减轻连续负荷不适', '更适合长线推进'] },
    { family: 'pulse', label: '脉压校平', valuePool: ['+3%', '+5%', '+7%'], summaryPool: ['让灵压脉动更匀整', '减少尖峰冲击', '提高整体舒适度'] },
  ],
};

export const FORGE_BLUEPRINTS: ForgeBlueprint[] = [...CHIP_BLUEPRINTS, ...CYBERWARE_BLUEPRINTS];

export const createEmptyForgeWorkshopState = (): ForgeWorkshopState => ({
  level: 1,
  xp: 0,
  nextXp: 3,
  lastDigest: '',
  records: [],
});

export const normalizeForgeWorkshopState = (raw?: Partial<ForgeWorkshopState> | null): ForgeWorkshopState => ({
  level: Math.max(1, Number(raw?.level) || 1),
  xp: Math.max(0, Number(raw?.xp) || 0),
  nextXp: Math.max(3, Number(raw?.nextXp) || 3),
  lastDigest: `${raw?.lastDigest || ''}`.trim(),
  records: Array.isArray(raw?.records) ? raw!.records!.slice(0, 24) : [],
});

export const resolveForgeLockSlots = (level: number): number => {
  if (level >= 6) return 3;
  if (level >= 4) return 2;
  if (level >= 2) return 1;
  return 0;
};

export const buildForgeDigest = (state: ForgeWorkshopState): string => {
  const latest = state.records[0];
  if (!latest) return `工坊Lv${state.level}，当前尚无锻造记录。`;
  const affixPreview = latest.affixes.slice(0, 2).map(affix => affix.label).join(' / ') || '无词条';
  return `工坊Lv${state.level}，最近完成${latest.blueprintLabel}，结果为${latest.quality}${latest.resultLabel}，词条：${affixPreview}。`;
};

export const getForgeBlueprints = (kind: ForgeWorkshopTab): ForgeBlueprint[] =>
  FORGE_BLUEPRINTS.filter(blueprint => blueprint.kind === kind);

const matchesRequirement = (item: Item, mode: ForgeRequirement['mode']) => {
  if (item.category !== 'material' || item.quantity <= 0) return false;
  const text = `${item.name || ''} ${item.description || ''}`;
  if (mode === 'any_material') return true;
  if (mode === 'data_core') return /(盘|芯片|接口|数据|驱动|存储|模块|写入|板|片|钥匙|零位|灵构)/.test(text);
  return /(骨架|合金|框架|器件|义体|钛|骨|关节|驱动|支架|模组|线材)/.test(text);
};

export const resolveForgeMaterialPlan = (inventory: Item[], blueprint: ForgeBlueprint): ForgeMaterialUsage[] => {
  const remaining = new Map<string, number>();
  inventory.forEach(item => {
    remaining.set(item.id, item.quantity);
  });
  const usages: ForgeMaterialUsage[] = [];
  blueprint.requirements.forEach(requirement => {
    for (let index = 0; index < requirement.count; index += 1) {
      const picked = inventory.find(item => {
        const left = remaining.get(item.id) || 0;
        return left > 0 && matchesRequirement(item, requirement.mode);
      });
      if (picked) {
        remaining.set(picked.id, (remaining.get(picked.id) || 0) - 1);
        usages.push({
          requirementId: requirement.id,
          requirementLabel: requirement.label,
          itemId: picked.id,
          itemLabel: picked.name,
          count: 1,
          source: 'inventory',
          surcharge: 0,
        });
      } else {
        usages.push({
          requirementId: requirement.id,
          requirementLabel: requirement.label,
          itemId: null,
          itemLabel: `${requirement.label}·台面补齐`,
          count: 1,
          source: 'bench',
          surcharge: requirement.fallbackFee,
        });
      }
    }
  });
  return usages;
};

const createRng = (seedText: string) => {
  let state = 2166136261;
  for (let index = 0; index < seedText.length; index += 1) {
    state ^= seedText.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const pickWeightedQuality = (rng: () => number, level: number): ForgeQualityTier => {
  const highShift = Math.min(0.18, Math.max(0, level - 1) * 0.02);
  const weights = [
    { quality: '粗胚' as ForgeQualityTier, weight: Math.max(0.08, 0.22 - highShift) },
    { quality: '标准' as ForgeQualityTier, weight: Math.max(0.20, 0.38 - highShift * 0.4) },
    { quality: '精制' as ForgeQualityTier, weight: 0.24 + highShift * 0.35 },
    { quality: '名匠' as ForgeQualityTier, weight: 0.12 + highShift * 0.45 },
    { quality: '原型' as ForgeQualityTier, weight: 0.04 + highShift * 0.6 },
  ];
  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let cursor = rng() * total;
  for (const entry of weights) {
    cursor -= entry.weight;
    if (cursor <= 0) return entry.quality;
  }
  return '标准';
};

const qualityTierToRank = (quality: ForgeQualityTier): Rank => {
  switch (quality) {
    case '粗胚':
      return Rank.Lv1;
    case '标准':
      return Rank.Lv2;
    case '精制':
      return Rank.Lv3;
    case '名匠':
      return Rank.Lv4;
    case '原型':
      return Rank.Lv5;
    default:
      return Rank.Lv2;
  }
};

const pickFrom = <T>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length)];

const shuffle = <T>(items: T[], rng: () => number): T[] => {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const picked = Math.floor(rng() * (index + 1));
    [next[index], next[picked]] = [next[picked], next[index]];
  }
  return next;
};

const buildAffixFromTemplate = (template: ForgeAffixTemplate, quality: ForgeQualityTier, rng: () => number): ForgeAffixRecord => ({
  id: `${template.family}_${Math.random().toString(36).slice(2, 7)}`,
  family: template.family,
  label: template.label,
  valueLabel: pickFrom(template.valuePool, rng),
  summary: pickFrom(template.summaryPool, rng),
  tier: template.tiers?.[Math.min(template.tiers.length - 1, QUALITY_ORDER.indexOf(quality))] || qualityTierToRank(quality),
});

export const resolveForgeAffixes = (
  blueprint: ForgeBlueprint,
  quality: ForgeQualityTier,
  seedText: string,
  lockedAffixes: ForgeAffixRecord[] = [],
): ForgeAffixRecord[] => {
  const rng = createRng(`${seedText}|${quality}|${blueprint.id}`);
  const pool = shuffle(
    (blueprint.kind === 'chip' ? CHIP_AFFIX_POOL[blueprint.id] : CYBERWARE_AFFIX_POOL[blueprint.id]) || [],
    rng,
  );
  const picked: ForgeAffixRecord[] = lockedAffixes.map(affix => ({ ...affix, id: affix.id || `${affix.family}_${Math.random().toString(36).slice(2, 7)}` }));
  for (const template of pool) {
    if (picked.some(entry => entry.family === template.family)) continue;
    picked.push(buildAffixFromTemplate(template, quality, rng));
    if (picked.length >= 3) break;
  }
  return picked.slice(0, 3);
};

export const resolveForgeCreditsCost = (blueprint: ForgeBlueprint, usages: ForgeMaterialUsage[], lockedCount: number): number =>
  blueprint.baseFee + usages.reduce((sum, usage) => sum + usage.surcharge, 0) + lockedCount * 160;

export const createForgedChip = (
  blueprint: ForgeBlueprint,
  quality: ForgeQualityTier,
  affixes: ForgeAffixRecord[],
  crafterLevel: number,
  existing?: Chip | null,
): Chip => {
  const forgeProfile: ForgeProfile = {
    kind: 'chip',
    blueprintId: blueprint.id,
    blueprintLabel: blueprint.label,
    quality,
    affixes,
    crafterLevel,
    forgedAt: new Date().toISOString(),
    reforgeCount: (existing?.forgeProfile?.reforgeCount || 0) + (existing ? 1 : 0),
  };
  const prefix = quality === '原型' ? '原型' : quality === '名匠' ? '名匠' : quality === '精制' ? '精制' : quality === '粗胚' ? '粗胚' : '标准';
  const affixSummary = affixes.map(affix => `${affix.label}${affix.valueLabel}`).join(' / ');
  return {
    id: existing?.id || `forged_chip_${blueprint.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${prefix}${blueprint.label}`,
    type: blueprint.outputType || 'process',
    rank: qualityTierToRank(quality),
    description: `${blueprint.summary} 当前词条：${affixSummary}。`,
    forgeProfile,
  };
};

export const createForgedCyberware = (
  blueprint: ForgeBlueprint,
  quality: ForgeQualityTier,
  affixes: ForgeAffixRecord[],
  crafterLevel: number,
  existing?: Item | null,
): Item => {
  const forgeProfile: ForgeProfile = {
    kind: 'cyberware',
    blueprintId: blueprint.id,
    blueprintLabel: blueprint.label,
    quality,
    affixes,
    crafterLevel,
    forgedAt: new Date().toISOString(),
    reforgeCount: (existing?.forgeProfile?.reforgeCount || 0) + (existing ? 1 : 0),
    targetPartKey: blueprint.targetPartKey,
  };
  const affixSummary = affixes.map(affix => `${affix.label}${affix.valueLabel}`).join(' / ');
  return {
    id: existing?.id || `forged_cyber_${blueprint.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: `${quality}${blueprint.label}`,
    quantity: 1,
    icon: '🧩',
    description: `[灵枢可装配] ${blueprint.summary} 当前词条：${affixSummary}。`,
    category: 'equipment',
    rank: qualityTierToRank(quality),
    forgeProfile,
  };
};

export const resolveForgeOutcome = (
  blueprint: ForgeBlueprint,
  level: number,
  inventory: Item[],
  lockedAffixes: ForgeAffixRecord[] = [],
  seedText = `${blueprint.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
): ForgeResolution => {
  const rng = createRng(seedText);
  const quality = pickWeightedQuality(rng, level);
  const usages = resolveForgeMaterialPlan(inventory, blueprint);
  const affixes = resolveForgeAffixes(blueprint, quality, seedText, lockedAffixes);
  const totalCost = resolveForgeCreditsCost(blueprint, usages, lockedAffixes.length);
  return { quality, affixes, totalCost, usages };
};

export const appendForgeRecord = (
  state: ForgeWorkshopState,
  record: ForgeRecord,
): ForgeWorkshopState => {
  let nextLevel = state.level;
  let nextXp = state.xp + (record.quality === '原型' ? 3 : record.quality === '名匠' ? 2 : 1);
  let nextThreshold = state.nextXp;
  while (nextXp >= nextThreshold) {
    nextXp -= nextThreshold;
    nextLevel += 1;
    nextThreshold += nextLevel >= 6 ? 4 : 3;
  }
  const nextState: ForgeWorkshopState = {
    level: nextLevel,
    xp: nextXp,
    nextXp: nextThreshold,
    lastDigest: '',
    records: [record, ...state.records].slice(0, 24),
  };
  return {
    ...nextState,
    lastDigest: buildForgeDigest(nextState),
  };
};

export const buildForgeRecord = (
  blueprint: ForgeBlueprint,
  resultLabel: string,
  quality: ForgeQualityTier,
  affixes: ForgeAffixRecord[],
  creditsSpent: number,
  usages: ForgeMaterialUsage[],
  lockedCount: number,
  resultId: string,
): ForgeRecord => ({
  id: `forge_record_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  kind: blueprint.kind,
  blueprintId: blueprint.id,
  blueprintLabel: blueprint.label,
  resultId,
  resultLabel,
  quality,
  lockedCount,
  creditsSpent,
  materialLabels: usages.map(usage => `${usage.itemLabel}×${usage.count}`),
  resolvedAt: new Date().toISOString(),
  affixes,
});
