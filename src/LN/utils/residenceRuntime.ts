import {
  Item,
  PlayerStats,
  Rank,
  ResidenceBurglaryRecord,
  ResidenceBurglaryTarget,
  ResidenceProfile,
  ResidenceShapeKey,
  ResidenceStashRecord,
} from '../types';
import { resolveDistrictProfileFromLocation } from './cityRuntime';

type ResidencePreset = {
  shapeKey: ResidenceShapeKey;
  storageSlots: number;
  assetTier: ResidenceProfile['assetTier'];
};

export type ResidenceBurglaryOutcome = ResidenceBurglaryRecord['outcome'];

export interface ResidenceBurglaryAttemptResult {
  target: ResidenceBurglaryTarget;
  outcome: ResidenceBurglaryOutcome;
  creditsDelta: number;
  lootItems: Item[];
  experienceGain: number;
  nextLevel: number;
  nextExperience: number;
  minutesSpent: number;
  staminaPenalty: number;
  satietyPenalty: number;
  sanityPenalty: number;
  summary: string;
}

export const RESIDENCE_SHAPE_LABELS: Record<ResidenceShapeKey, string> = {
  registry_capsule: '登记舱塔',
  civic_studio: '标准单间',
  market_suite: '灰幕套间',
  harbor_hostel: '港务旅宿',
  parish_cell: '教区单室',
  container_safehouse: '加固箱屋',
  tower_flat: '高层平层',
  workshop_dorm: '轮班宿屋',
  transit_pod: '中转舱位',
};

const DISTRICT_TARGET_POOLS: Record<
  string,
  Array<{
    prefix: string;
    suffix: string;
    shapeKey: ResidenceShapeKey;
    wealthTier: ResidenceBurglaryTarget['wealthTier'];
    security: ResidenceBurglaryTarget['security'];
    occupancyLabel: ResidenceBurglaryTarget['occupancyLabel'];
    note: string;
  }>
> = {
  airela: [
    { prefix: '绶纹公寓', suffix: '高层', shapeKey: 'tower_flat', wealthTier: 'high', security: 'High', occupancyLabel: 'Medium', note: '安保稳定，住户习惯按时归家。' },
    { prefix: '住册塔', suffix: '登记层', shapeKey: 'registry_capsule', wealthTier: 'medium', security: 'High', occupancyLabel: 'High', note: '官方住册体系下的标准住所。' },
    { prefix: '瑰序邸舍', suffix: '观礼翼', shapeKey: 'tower_flat', wealthTier: 'elite', security: 'High', occupancyLabel: 'Low', note: '值钱，但失手后留下的痕迹最重。' },
  ],
  north: [
    { prefix: '灰幕廊居', suffix: '转角层', shapeKey: 'market_suite', wealthTier: 'medium', security: 'Medium', occupancyLabel: 'Low', note: '短租与会面混用，值钱货随机性大。' },
    { prefix: '霓巷套房', suffix: '夜场面', shapeKey: 'market_suite', wealthTier: 'high', security: 'Medium', occupancyLabel: 'Medium', note: '夜里空置概率更高，但隔壁眼线更多。' },
    { prefix: '路演塔居', suffix: '展示层', shapeKey: 'tower_flat', wealthTier: 'elite', security: 'High', occupancyLabel: 'Low', note: '富但不稳，一旦得手回报明显。' },
  ],
  xiyu: [
    { prefix: '潮镜旅寓', suffix: '海景翼', shapeKey: 'harbor_hostel', wealthTier: 'high', security: 'Medium', occupancyLabel: 'Low', note: '游客多，行李价值高，换房也快。' },
    { prefix: '泊潮邸', suffix: '礼宾层', shapeKey: 'tower_flat', wealthTier: 'elite', security: 'High', occupancyLabel: 'Medium', note: '高价值，但门禁层层叠加。' },
    { prefix: '港潮居', suffix: '泊位栋', shapeKey: 'harbor_hostel', wealthTier: 'medium', security: 'Medium', occupancyLabel: 'Medium', note: '适合小偷摸一把就走。' },
  ],
  holy: [
    { prefix: '誓律宿室', suffix: '单祷层', shapeKey: 'parish_cell', wealthTier: 'low', security: 'High', occupancyLabel: 'High', note: '值钱货不多，但巡查密。' },
    { prefix: '教规寓舍', suffix: '侍奉翼', shapeKey: 'parish_cell', wealthTier: 'medium', security: 'High', occupancyLabel: 'Medium', note: '配给痕迹重，现金少。' },
    { prefix: '圣序邸', suffix: '戒律层', shapeKey: 'tower_flat', wealthTier: 'high', security: 'High', occupancyLabel: 'Low', note: '偶尔能摸到稀罕配给品。' },
  ],
  cuiling: [
    { prefix: '轮班宿屋', suffix: '工序层', shapeKey: 'workshop_dorm', wealthTier: 'low', security: 'Medium', occupancyLabel: 'Medium', note: '杂物多，现金少，工具和券票更常见。' },
    { prefix: '灰炉居栈', suffix: '交接层', shapeKey: 'workshop_dorm', wealthTier: 'medium', security: 'Medium', occupancyLabel: 'Low', note: '倒班时段最适合下手。' },
    { prefix: '铁桥宿舍', suffix: '重工翼', shapeKey: 'workshop_dorm', wealthTier: 'medium', security: 'Low', occupancyLabel: 'High', note: '环境差，但能摸到工业零件。' },
  ],
  borderland: [
    { prefix: '桥口板屋', suffix: '外缘带', shapeKey: 'container_safehouse', wealthTier: 'medium', security: 'Low', occupancyLabel: 'Low', note: '看似破，真值钱的都在暗格里。' },
    { prefix: '营地箱舍', suffix: '补给侧', shapeKey: 'container_safehouse', wealthTier: 'low', security: 'Low', occupancyLabel: 'Medium', note: '物资波动很大。' },
    { prefix: '荒边窝居', suffix: '桥洞层', shapeKey: 'container_safehouse', wealthTier: 'high', security: 'Medium', occupancyLabel: 'Low', note: '赌一把就可能拿到走私货。' },
  ],
  dogtown: [
    { prefix: '狗镇斜楼', suffix: '钉板层', shapeKey: 'container_safehouse', wealthTier: 'medium', security: 'Low', occupancyLabel: 'Low', note: '真正值钱的是赃物流转单。' },
    { prefix: '黑铆居', suffix: '夹层室', shapeKey: 'market_suite', wealthTier: 'high', security: 'Medium', occupancyLabel: 'Medium', note: '小地区，高回报，高翻车率。' },
    { prefix: '烬港住箱', suffix: '拐角房', shapeKey: 'container_safehouse', wealthTier: 'medium', security: 'Medium', occupancyLabel: 'Low', note: '一旦有人在，往往就不是住户。' },
  ],
  qiling: [
    { prefix: '栖雾邸', suffix: '封闭层', shapeKey: 'tower_flat', wealthTier: 'elite', security: 'High', occupancyLabel: 'Low', note: '稀缺、高值、难进。' },
    { prefix: '寂岭居馆', suffix: '藏风室', shapeKey: 'tower_flat', wealthTier: 'high', security: 'High', occupancyLabel: 'Medium', note: '更像收藏室而不是住家。' },
    { prefix: '闭港宿楼', suffix: '封检层', shapeKey: 'harbor_hostel', wealthTier: 'medium', security: 'High', occupancyLabel: 'Low', note: '货少但单件价值高。' },
  ],
  default: [
    { prefix: '中转住箱', suffix: '过渡层', shapeKey: 'transit_pod', wealthTier: 'low', security: 'Medium', occupancyLabel: 'Medium', note: '应急住点，油水不多。' },
    { prefix: '临时租寓', suffix: '角室', shapeKey: 'civic_studio', wealthTier: 'medium', security: 'Medium', occupancyLabel: 'Low', note: '有时会藏一点通勤票和临时现金。' },
    { prefix: '泊位小楼', suffix: '边厅', shapeKey: 'transit_pod', wealthTier: 'medium', security: 'Low', occupancyLabel: 'Medium', note: '适合练手。' },
  ],
};

const CLAMP = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const hashText = (text: string): number => {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
};

const seededUnit = (seed: string): number => (hashText(seed) % 10_000) / 10_000;

const seededPick = <T,>(seed: string, list: T[]): T => list[hashText(seed) % list.length];

const buildRankFromValue = (value: number): Rank => {
  if (value >= 240) return Rank.Lv4;
  if (value >= 180) return Rank.Lv3;
  if (value >= 120) return Rank.Lv2;
  return Rank.Lv1;
};

const buildLootItem = (
  seed: string,
  label: string,
  icon: string,
  description: string,
  category: Item['category'],
  rank: Rank,
): Item => ({
  id: `loot_${hashText(`${seed}|${label}`)}`,
  name: label,
  quantity: 1,
  icon,
  description,
  category,
  rank,
});

const buildBurglaryLoot = (
  target: ResidenceBurglaryTarget,
  regionKey: string,
  attemptSeed: string,
): { creditsDelta: number; items: Item[]; empty: boolean } => {
  const wealthFactor = target.wealthTier === 'elite' ? 1.5 : target.wealthTier === 'high' ? 1.2 : target.wealthTier === 'medium' ? 0.95 : 0.72;
  const cashRoll = seededUnit(`${attemptSeed}|cash`);
  const baseCredits = Math.round(target.valueScore * wealthFactor * (0.28 + cashRoll * 0.44));
  const empty = seededUnit(`${attemptSeed}|empty`) < 0.16;
  if (empty) {
    return { creditsDelta: Math.round(baseCredits * 0.18), items: [], empty: true };
  }

  const generalPool = [
    buildLootItem(attemptSeed, '封条礼盒', '🎁', '包装精致的高价消费品。', 'material', buildRankFromValue(target.valueScore)),
    buildLootItem(attemptSeed, '私账凭证', '📓', '记录了住户近期消费和往来。', 'material', buildRankFromValue(target.valueScore - 20)),
    buildLootItem(attemptSeed, '室内备用卡', '🪪', '一张可以转卖的备用识别卡。', 'material', buildRankFromValue(target.valueScore - 40)),
  ];
  const airelaPool = [
    buildLootItem(attemptSeed, '礼制服样衣', '👗', '不能公开流通的礼制服样衣。', 'equipment', buildRankFromValue(target.valueScore + 10)),
    buildLootItem(attemptSeed, '住册芯片壳', '💽', '登记住册外壳，更多用于伪装。', 'material', buildRankFromValue(target.valueScore)),
  ];
  const northPool = [
    buildLootItem(attemptSeed, '夜场定制外套', '🧥', '昂贵但不适合所有场合的外套。', 'equipment', buildRankFromValue(target.valueScore + 10)),
    buildLootItem(attemptSeed, '样机邀请函', '📨', '能卖给中间人的邀请函。', 'material', buildRankFromValue(target.valueScore)),
  ];
  const frontierPool = [
    buildLootItem(attemptSeed, '走私缆包', '📦', '包装粗糙但值钱。', 'material', buildRankFromValue(target.valueScore)),
    buildLootItem(attemptSeed, '荒地医药盒', '🧰', '黑市认可的便携急救盒。', 'consumable', buildRankFromValue(target.valueScore - 10)),
  ];
  const regionPool =
    regionKey === 'airela'
      ? airelaPool
      : regionKey === 'north'
        ? northPool
        : regionKey === 'borderland' || regionKey === 'dogtown'
          ? frontierPool
          : generalPool;
  const firstItem = seededPick(`${attemptSeed}|first`, regionPool);
  const fallbackItem = seededPick(`${attemptSeed}|fallback`, generalPool);
  const items = [firstItem];
  if (target.wealthTier === 'high' || target.wealthTier === 'elite' || seededUnit(`${attemptSeed}|second`) > 0.58) {
    items.push(fallbackItem);
  }
  return {
    creditsDelta: baseCredits,
    items,
    empty: false,
  };
};

export const withResidencePreset = (
  profile: Omit<ResidenceProfile, 'shapeKey' | 'shapeLabel' | 'storageSlots' | 'assetTier'>,
  preset: ResidencePreset,
): ResidenceProfile => ({
  ...profile,
  shapeKey: preset.shapeKey,
  shapeLabel: RESIDENCE_SHAPE_LABELS[preset.shapeKey],
  storageSlots: preset.storageSlots,
  assetTier: preset.assetTier,
});

export const buildResidencePreset = (key: ResidenceShapeKey, storageSlots: number, assetTier: ResidenceProfile['assetTier']): ResidencePreset => ({
  shapeKey: key,
  storageSlots,
  assetTier,
});

export const ensureResidenceStashRecord = (
  records: ResidenceStashRecord[],
  residenceId: string,
  residenceLabel: string,
  storageSlots: number,
): ResidenceStashRecord => {
  const existing = records.find(record => record.residenceId === residenceId);
  if (existing) {
    return {
      ...existing,
      residenceLabel: existing.residenceLabel || residenceLabel,
      storageSlots: Math.max(existing.storageSlots || 0, storageSlots),
      items: Array.isArray(existing.items) ? existing.items : [],
    };
  }
  return {
    residenceId,
    residenceLabel,
    storageSlots,
    items: [],
  };
};

export const getResidenceStorageUsage = (record: ResidenceStashRecord | null | undefined): number =>
  (record?.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);

const buildRegionTarget = (
  locationLabel: string,
  slot: number,
  existingHeat = 0,
  existingHits = 0,
): ResidenceBurglaryTarget => {
  const profile = resolveDistrictProfileFromLocation(locationLabel);
  const pool = DISTRICT_TARGET_POOLS[profile.regionKey] || DISTRICT_TARGET_POOLS.default;
  const template = pool[slot % pool.length];
  const seed = `${profile.id}|${slot}|${locationLabel}`;
  const suffixNumber = 7 + (hashText(`${seed}|suffix`) % 29);
  const label = `${template.prefix}${suffixNumber}号${template.suffix}`;
  const valueBase =
    template.wealthTier === 'elite' ? 260 : template.wealthTier === 'high' ? 190 : template.wealthTier === 'medium' ? 130 : 82;
  const valueScore = Math.round(valueBase + seededUnit(`${seed}|value`) * 55);
  const difficultyBase = template.security === 'High' ? 76 : template.security === 'Medium' ? 58 : 40;
  const occupancyBase = template.occupancyLabel === 'High' ? 0.72 : template.occupancyLabel === 'Medium' ? 0.52 : 0.3;
  return {
    id: `res_target_${profile.id}_${slot + 1}`,
    districtId: profile.id,
    districtLabel: profile.districtLabel,
    label,
    areaLabel: profile.districtLabel,
    shapeKey: template.shapeKey,
    shapeLabel: RESIDENCE_SHAPE_LABELS[template.shapeKey],
    wealthTier: template.wealthTier,
    security: template.security,
    occupancyLabel: template.occupancyLabel,
    occupancyRisk: CLAMP(occupancyBase + seededUnit(`${seed}|occ`) * 0.14 - 0.07, 0.08, 0.92),
    entryDifficulty: CLAMP(difficultyBase + Math.round(seededUnit(`${seed}|lock`) * 18) + existingHeat * 3, 20, 98),
    valueScore,
    note: template.note,
    status: 'active',
    heat: existingHeat,
    hitCount: existingHits,
  };
};

export const syncDistrictBurglaryTargets = (
  existingTargets: ResidenceBurglaryTarget[],
  locationLabel: string,
  elapsedMinutes: number,
): ResidenceBurglaryTarget[] => {
  const profile = resolveDistrictProfileFromLocation(locationLabel);
  const current = existingTargets
    .filter(target => target.districtId === profile.id)
    .map(target =>
      target.status === 'cooldown' && (target.nextAvailableAtMinutes || 0) <= elapsedMinutes
        ? { ...target, status: 'active' as const, nextAvailableAtMinutes: undefined }
        : target,
    );
  if (current.length >= 3) {
    return [
      ...existingTargets.filter(target => target.districtId !== profile.id),
      ...current,
    ];
  }

  const generated: ResidenceBurglaryTarget[] = [...current];
  for (let slot = 0; slot < 3; slot += 1) {
    const targetId = `res_target_${profile.id}_${slot + 1}`;
    if (generated.some(target => target.id === targetId)) continue;
    generated.push(buildRegionTarget(locationLabel, slot));
  }
  return [
    ...existingTargets.filter(target => target.districtId !== profile.id),
    ...generated,
  ];
};

export const resolveBurglaryAttempt = (params: {
  target: ResidenceBurglaryTarget;
  stats: PlayerStats;
  burglaryLevel: number;
  burglaryExperience: number;
  elapsedMinutes: number;
  locationLabel: string;
}): ResidenceBurglaryAttemptResult => {
  const target = params.target;
  const sixDim = params.stats.sixDim || ({} as PlayerStats['sixDim']);
  const agility = Number(sixDim.敏捷 || 8);
  const perception = Number(sixDim.感知 || 8);
  const willpower = Number(sixDim.意志 || 8);
  const staminaRatio = params.stats.stamina.max > 0 ? params.stats.stamina.current / params.stats.stamina.max : 0.5;
  const satietyRatio = params.stats.satiety.max > 0 ? params.stats.satiety.current / params.stats.satiety.max : 0.5;
  const hour = Math.floor((params.elapsedMinutes % 1440) / 60);
  const nightBonus = hour >= 22 || hour <= 5 ? 0.16 : hour >= 6 && hour <= 9 ? -0.08 : 0;
  const occupied =
    seededUnit(`${target.id}|occupied|${Math.floor(params.elapsedMinutes / 60)}|${target.hitCount}`) <
    CLAMP(target.occupancyRisk + nightBonus, 0.05, 0.96);
  const infiltrationScore =
    agility * 3.8 +
    perception * 2.6 +
    willpower * 1.6 +
    params.burglaryLevel * 7 +
    staminaRatio * 18 +
    satietyRatio * 7 +
    seededUnit(`${target.id}|entry|${params.elapsedMinutes}|${params.burglaryExperience}`) * 26;

  const pressure = target.entryDifficulty + (occupied ? 14 : 0) + target.heat * 5;
  const regionKey = resolveDistrictProfileFromLocation(params.locationLabel).regionKey;
  const loot = buildBurglaryLoot(target, regionKey, `${target.id}|${params.elapsedMinutes}|${params.burglaryExperience}`);
  const experienceGainBase = occupied ? 9 : 6;
  let outcome: ResidenceBurglaryOutcome = 'failed';
  let creditsDelta = 0;
  let lootItems: Item[] = [];
  let nextTarget: ResidenceBurglaryTarget = target;
  let staminaPenalty = occupied ? 14 : 10;
  let satietyPenalty = 4;
  let sanityPenalty = 0;
  let summary = '';
  let minutesSpent = occupied ? 82 : 64;

  if (infiltrationScore >= pressure + 8) {
    if (loot.empty) {
      outcome = 'empty';
      creditsDelta = loot.creditsDelta;
      summary = `你摸进了${target.label}，但真正值钱的东西已经被转走，只顺手带出一点零散现金。`;
    } else {
      outcome = 'success';
      creditsDelta = loot.creditsDelta;
      lootItems = loot.items;
      summary = `你在${target.label}顺利得手，带出了${lootItems.map(item => item.name).join('、')}和现金。`;
    }
    nextTarget = {
      ...target,
      status: 'cooldown',
      hitCount: target.hitCount + 1,
      heat: Math.min(5, target.heat + 1),
      nextAvailableAtMinutes: params.elapsedMinutes + 720 + target.hitCount * 90,
      lastOutcome: outcome,
    };
  } else if (occupied && infiltrationScore < pressure - 8) {
    outcome = 'spotted';
    minutesSpent = 48;
    staminaPenalty = 18;
    satietyPenalty = 6;
    sanityPenalty = 6;
    summary = `你在${target.label}失手并被发现，只能仓促撤离。`;
    nextTarget = {
      ...target,
      status: 'cooldown',
      heat: Math.min(6, target.heat + 2),
      hitCount: target.hitCount + 1,
      nextAvailableAtMinutes: params.elapsedMinutes + 1440,
      lastOutcome: 'spotted',
    };
  } else {
    outcome = 'failed';
    minutesSpent = 36;
    staminaPenalty = 12;
    satietyPenalty = 5;
    sanityPenalty = 2;
    summary = `你尝试撬开${target.label}的门锁，但判断风险后撤了出来。`;
    nextTarget = {
      ...target,
      status: 'cooldown',
      heat: Math.min(6, target.heat + 1),
      hitCount: target.hitCount + 1,
      nextAvailableAtMinutes: params.elapsedMinutes + 480,
      lastOutcome: 'failed',
    };
  }

  const experienceGain = experienceGainBase + (outcome === 'success' ? 8 : outcome === 'spotted' ? 5 : 3);
  const totalExperience = Math.max(0, params.burglaryExperience + experienceGain);
  const nextLevel = Math.min(5, 1 + Math.floor(totalExperience / 36));

  return {
    target: nextTarget,
    outcome,
    creditsDelta,
    lootItems,
    experienceGain,
    nextLevel,
    nextExperience: totalExperience,
    minutesSpent,
    staminaPenalty,
    satietyPenalty,
    sanityPenalty,
    summary,
  };
};
