import { LingshuPart, NpcSkillPool, NpcTier, Rank, Skill } from '../types';

export const PLAYER_RACE_OPTIONS = [
  { value: '人类', label: '人类', note: '默认开局种族，灵弦更多依赖通用池与人类性别池。' },
  { value: '汐屿族', label: '汐屿族', note: '巨体母系、体型支配与血肉嫁接文化鲜明的人类亚种。' },
  { value: '月光精灵', label: '月光精灵', note: '森眷狩猎、追索与灵魂塑形专精。' },
  { value: '魅魔', label: '魅魔', note: '凝视、费洛蒙与汲灵体系更完整。' },
  { value: '狐魅', label: '狐魅', note: '诱导、戏弄与狐火式误判强化。' },
  { value: '戈尔贡', label: '戈尔贡', note: '凝视、毒性代谢与石化压制。' },
  { value: '塞壬', label: '塞壬', note: '歌喉共振与远距诱导。' },
  { value: '花妖', label: '花妖', note: '孢粉、寄生与荆棘操控。' },
  { value: '蚁女', label: '蚁女', note: '工体协同、酸蚀与巢体代谢。' },
  { value: '蜘蛛新娘', label: '蜘蛛新娘', note: '牵丝、织网与毒纺塑形。' },
  { value: '史莱姆', label: '史莱姆', note: '溶核渗透与凝胶再构。' },
] as const;

export const DEFAULT_PLAYER_RACE = '人类';

const MALE_PLAYER_RACE_SET = new Set(['人类', '汐屿族']);

const DEFAULT_NPC_SKILL_POOL: NpcSkillPool = 'common_pool';

const EXCLUSIVE_SPIRIT_SKILL_FAMILIES = new Set([
  'linghun_diaosuzhe',
  'shenxiang_meiti',
  'nvshen_ningshi',
  'shenqu_tunyan',
  'xuerou_shenghua',
  'nuli_laoyin',
  'yueshi_wangquan',
  'wanyou_yinli',
  'yushuishu',
  'nvshen_zhici',
  'sishen',
  'sixian_guance',
  'xuwu_huilang',
  'sishen_zhilian',
  'sishen_zhichu',
  'meiqi_tongyu',
  'rongying',
  'xuelang_liexi',
  'yingdao_jiangshen',
  'xuerou_fengsuo',
  'sansuo_jinyu',
  'jingchi_yizhi',
  'rouliu_chijie',
]);

const RARE_SHARED_SPIRIT_SKILL_FAMILIES = new Set(['jiqu', 'meiyin', 'asmr', 'huoti_zhaiqi']);

const EXPLICIT_MIN_NPC_RANK_BY_FAMILY: Partial<Record<string, Rank>> = {
  jiqu: Rank.Lv3,
  meiyin: Rank.Lv4,
  asmr: Rank.Lv4,
  huoti_zhaiqi: Rank.Lv5,
};

const rankOrder = (rank?: Rank): number => {
  switch (rank) {
    case Rank.Lv5:
      return 5;
    case Rank.Lv4:
      return 4;
    case Rank.Lv3:
      return 3;
    case Rank.Lv2:
      return 2;
    case Rank.Lv1:
    default:
      return 1;
  }
};

const resolveDefaultNpcPool = (skill: Pick<Skill, 'familyId' | 'npcPool'>): NpcSkillPool => {
  if (skill.npcPool) return skill.npcPool;
  const familyId = `${skill.familyId || ''}`.trim();
  if (EXCLUSIVE_SPIRIT_SKILL_FAMILIES.has(familyId)) return 'exclusive';
  if (RARE_SHARED_SPIRIT_SKILL_FAMILIES.has(familyId)) return 'rare_pool';
  return DEFAULT_NPC_SKILL_POOL;
};

const resolveDefaultMinNpcRank = (
  skill: Pick<Skill, 'familyId' | 'displayLevelLabel' | 'npcPool' | 'minNpcRank'>,
): Rank | undefined => {
  if (skill.minNpcRank) return skill.minNpcRank;
  const familyId = `${skill.familyId || ''}`.trim();
  if (EXPLICIT_MIN_NPC_RANK_BY_FAMILY[familyId]) return EXPLICIT_MIN_NPC_RANK_BY_FAMILY[familyId];
  const npcPool = resolveDefaultNpcPool(skill);
  if (npcPool !== 'rare_pool') return undefined;
  const displayLevelLabel = `${skill.displayLevelLabel || ''}`.trim();
  if (displayLevelLabel === '灵核') return Rank.Lv5;
  if (displayLevelLabel === '传说') return Rank.Lv4;
  return Rank.Lv3;
};

export const getSpiritSkillNpcPool = (skill: Pick<Skill, 'familyId' | 'npcPool'>): NpcSkillPool =>
  resolveDefaultNpcPool(skill);

export const getSpiritSkillMinNpcRank = (
  skill: Pick<Skill, 'familyId' | 'displayLevelLabel' | 'npcPool' | 'minNpcRank'>,
): Rank | undefined => resolveDefaultMinNpcRank(skill);

export type SpiritSkillNpcAccessResult = {
  available: boolean;
  npcPool: NpcSkillPool;
  minNpcRank?: Rank;
  note?: string;
};

export const resolveSpiritSkillNpcAccess = (
  skill: Pick<Skill, 'familyId' | 'displayLevelLabel' | 'npcPool' | 'minNpcRank'>,
  npcTier: NpcTier,
  npcRank: Rank,
): SpiritSkillNpcAccessResult => {
  const npcPool = getSpiritSkillNpcPool(skill);
  const minNpcRank = getSpiritSkillMinNpcRank(skill);
  if (npcTier === 'authored') {
    return { available: true, npcPool, minNpcRank };
  }
  if (npcTier === 'runtime_common' && npcPool !== 'common_pool') {
    return {
      available: false,
      npcPool,
      minNpcRank,
      note: '运行时路人 NPC 仅可自动使用普通池灵弦。',
    };
  }
  if (npcTier === 'runtime_rare' && npcPool === 'exclusive') {
    return {
      available: false,
      npcPool,
      minNpcRank,
      note: '运行时稀有 NPC 不可自动获得作者专属灵弦。',
    };
  }
  if (minNpcRank && rankOrder(npcRank) < rankOrder(minNpcRank)) {
    return {
      available: false,
      npcPool,
      minNpcRank,
      note: `至少需要 ${minNpcRank} 才能稳定驾驭这类灵弦。`,
    };
  }
  return { available: true, npcPool, minNpcRank };
};

const SLOT_LABELS: Record<string, string> = {
  brain: '脑部',
  eyes: '眼部',
  face: '面部',
  mouth: '口部',
  body: '躯干',
  chest: '胸部',
  genital: '阴部',
  hip: '臀胯',
  l_arm: '左臂',
  r_arm: '右臂',
  l_hand: '左手',
  r_hand: '右手',
  l_leg: '左腿',
  r_leg: '右腿',
  l_foot: '左脚',
  r_foot: '右脚',
  axilla: '腋下',
};

const SPIRIT_SKILL_ROLE_SUMMARY: Record<string, string> = {
  lingmin_xiujue: '气味侦查',
  gongzhen_kangya: '抗压防护',
  lingbao: '灵能爆破',
  shiling_wu: '噬灵削弱',
  fuling_suo: '拘束锁缚',
  xiangwei_bu: '突进换位',
  meiqi: '魅惑侵蚀',
  fenli_er_eye: '动态观察 / 未来视',
  zhuisuo_yin: '寄生追踪',
  linghun_diaosuzhe: '灵魂塑形',
  qiyu_huantong: '对视幻境',
  shenxiang_meiti: '香气幻躯',
  meiyin: '魅惑音波',
  asmr: '感官转映',
  nvshen_ningshi: '高压凝视',
  shenqu_tunyan: '吞噬增殖',
  xuerou_shenghua: '环境肉化',
  nuli_laoyin: '奴役烙印',
  yueshi_wangquan: '月蚀领域',
  wanyou_yinli: '重力压制',
  yushuishu: '控水塑形',
  nvshen_zhici: '肉体改写',
  sishen: '生命征收',
  sixian_guance: '死线观测',
  xuwu_huilang: '虚化换位',
  sishen_zhilian: '死镰处刑',
  sishen_zhichu: '生命引爆',
  jiqu: '近身夺息',
  senjuan_gongzhen: '自然共振',
  meimo_eye: '魅惑凝视',
  lunxian_feiluomeng: '费洛蒙诱导',
  meidu: '魅性毒素',
  rongying: '影化潜行',
  meiqi_tongyu: '魅气统御',
  xuelang_liexi: '嗅痕追猎',
  yingdao_jiangshen: '影灵附体',
  huoti_zhaiqi: '活体摘取',
  xuerou_fengsuo: '血肉封锁',
  sansuo_jinyu: '近身禁域',
  jingchi_yizhi: '质量支配',
  rouliu_chijie: '导流迟滞',
  huowei_meiyan: '狐火诱导',
  weirong_mizong: '步态迷踪',
  shihua_ningshi: '石化凝视',
  youchao_gehou: '潮声诱导',
  jingji_shengzhi: '荆棘寄生',
  baofen_shouyi: '孢粉授意',
  suanshi_zhenezhen: '酸蚀穿刺',
  jianwang_qiansi: '蛛丝束缚',
  dufang_huilu: '毒纺控制',
  ronghe_shentou: '液态渗透',
  ningjiao_zaigou: '凝胶再构',
  wendu_shiying: '环境适应',
  shenjing_guozai: '神经强化',
};

const REMOVED_LEGACY_SPIRIT_SKILL_NAMES = new Set([
  '斥灵波',
  '蛇巢感知',
  '深潮回音',
  '群巢号令',
  '欲界编梦',
  '欲界蜃宫',
  '回声锁定',
  '脉冲净化',
  '静默屏障',
  '相位切换',
  '潮汐复位',
  '震荡折返',
  '镜像偏折',
]);

const REMOVED_LEGACY_SPIRIT_SKILL_FAMILIES = new Set([
  'chiling_bo',
  'shechao_ganzhi',
  'shenchao_huixiang',
  'qunchao_haoling',
  'yujie_bianmeng',
  'yujie_shengong',
]);

export interface SkillAccessResult {
  available: boolean;
  breakUnlocked: boolean;
  sourceLabel: string;
  accessLabel: string;
  note?: string;
}

const LEVEL_TITLE: Record<number, string> = {
  1: '初醒',
  2: '熟化',
  3: '稳态',
  4: '高阶',
  5: '满载',
};

const normalizeName = (name: string) => {
  const normalized = `${name || ''}`.trim().replace(/^灵弦[:：]\s*/, '');
  if (
    normalized === '汲取' ||
    normalized === '皮肤汲取' ||
    normalized === '呼吸剥夺' ||
    normalized === '夺息回路' ||
    normalized === '夺息'
  )
    return '夺息';
  if (normalized === '追索印' || normalized === '灵孢寄生') return '灵孢寄生';
  if (normalized === '神像凝视' || normalized === '女神凝视') return '女神凝视';
  if (`${normalized}`.toUpperCase() === 'ASMR' || normalized === '感官转移' || normalized === '感官转映')
    return 'ASMR';
  if (normalized === '三锁' || normalized === '三锁归域' || normalized === '三锁禁域')
    return '三锁禁域';
  if (normalized === '静持' || normalized === '定势易质' || normalized === '静持易质')
    return '静持易质';
  if (normalized === '柔流' || normalized === '柔界转矩' || normalized === '柔流迟界')
    return '柔流迟界';
  return normalized;
};

export const isPlayerRaceAllowedForGender = (race: string, gender: 'male' | 'female') => {
  if (gender === 'female') return true;
  return MALE_PLAYER_RACE_SET.has(`${race || ''}`.trim());
};

export const getAllowedPlayerRaceOptions = (gender: 'male' | 'female') =>
  PLAYER_RACE_OPTIONS.filter(option => isPlayerRaceAllowedForGender(option.value, gender));

export const getSpiritSkillFamilyKey = (skill: Skill): string => {
  if (skill.isCustom) return `custom:${skill.id}`.toLowerCase();
  return `${skill.familyId || normalizeName(skill.name) || skill.id}`.trim().toLowerCase();
};

export const formatSpiritSkillSlotLabel = (slotKey: string) => SLOT_LABELS[slotKey] || slotKey;

export const isSpiritSkillCompatibleWithPart = (skill: Skill, partKey?: string) => {
  if (!skill.slotHints || skill.slotHints.length === 0 || !partKey) return true;
  return skill.slotHints.includes(partKey);
};

export const buildSpiritSkillSlotSummary = (skill: Skill) => {
  if (!skill.slotHints || skill.slotHints.length === 0) return '全身通用';
  const labels = [...new Set(skill.slotHints.map(formatSpiritSkillSlotLabel).filter(Boolean))];
  if (labels.length <= 3) return labels.join(' / ');
  return `${labels.slice(0, 3).join(' / ')} 等${labels.length}处`;
};

export const buildSpiritSkillPlainLabel = (skill: Skill) =>
  SPIRIT_SKILL_ROLE_SUMMARY[skill.familyId || ''] || normalizeName(skill.name) || '效果未标注';

export const normalizeLegacySpiritSkillCard = (skill: Skill): Skill | null => {
  const normalized = normalizeName(skill.name);
  const normalizedFamily = `${skill.familyId || ''}`.trim();
  if (
    REMOVED_LEGACY_SPIRIT_SKILL_NAMES.has(normalized) ||
    REMOVED_LEGACY_SPIRIT_SKILL_FAMILIES.has(normalizedFamily)
  )
    return null;

  if (normalized === '温域适配') {
    return {
      ...skill,
      name: '温域适配',
      familyId: 'wendu_shiying',
      level: 1,
      displayLevelLabel: '无级',
      description: '适应高温、低温与温差突变环境，减轻环境变化对行动和感知的干扰。',
      effectLines: undefined,
      aiSummary: undefined,
      slotHints: ['body'],
      poolOrigin: skill.poolOrigin || 'common',
      raceLocks: skill.raceLocks,
      genderLocks: skill.genderLocks,
      breakUnlocks: skill.breakUnlocks,
    };
  }

  if (normalized === '神经超载') {
    return {
      ...skill,
      name: '神经超载',
      familyId: 'shenjing_guozai',
      level: 1,
      displayLevelLabel: '无级',
      description: '短时间强提神经反应与动作输出，具体负荷、后劲和失稳表现交由对戏过程决定。',
      effectLines: undefined,
      aiSummary: undefined,
      slotHints: ['brain'],
      poolOrigin: skill.poolOrigin || 'common',
      raceLocks: skill.raceLocks,
      genderLocks: skill.genderLocks,
      breakUnlocks: skill.breakUnlocks,
    };
  }

  if (`${skill.name || ''}`.trim().startsWith('灵弦：') && normalized === '痛觉迟钝') {
    return {
      ...skill,
      name: '痛觉迟钝',
      slotHints: ['brain'],
    };
  }

  if (`${skill.name || ''}`.trim().startsWith('灵弦：') && normalized) {
    return {
      ...skill,
      name: normalized,
    };
  }

  return skill;
};

const cloneSkill = (skill: Skill): Skill => ({
  ...skill,
  effectLines: skill.effectLines ? [...skill.effectLines] : undefined,
  slotHints: skill.slotHints ? [...skill.slotHints] : undefined,
  raceLocks: skill.raceLocks ? [...skill.raceLocks] : undefined,
  genderLocks: skill.genderLocks ? [...skill.genderLocks] : undefined,
  breakUnlocks: skill.breakUnlocks
    ? skill.breakUnlocks.map(rule => ({
        ...rule,
        raceLocks: rule.raceLocks ? [...rule.raceLocks] : undefined,
        genderLocks: rule.genderLocks ? [...rule.genderLocks] : undefined,
      }))
    : undefined,
  sixDimBonuses: skill.sixDimBonuses ? { ...skill.sixDimBonuses } : undefined,
});

const matchAccess = (
  raceLocks: string[] | undefined,
  genderLocks: Array<'male' | 'female'> | undefined,
  race: string,
  gender: 'male' | 'female',
) => {
  const raceOkay = !raceLocks || raceLocks.length === 0 || raceLocks.includes(race);
  const genderOkay = !genderLocks || genderLocks.length === 0 || genderLocks.includes(gender);
  return raceOkay && genderOkay;
};

const formatPrimaryLabel = (skill: Skill): string => {
  if (skill.isCustom) {
    if (`${skill.displayLevelLabel || ''}`.trim() === '传说') return '剧情传说';
    if (`${skill.displayLevelLabel || ''}`.trim() === '灵核') return '剧情灵核';
    return '剧情获得';
  }
  const raceLocks = skill.raceLocks || [];
  const genderLocks = skill.genderLocks || [];
  if (skill.poolOrigin === 'rare') {
    if (raceLocks.length === 0 && genderLocks.length === 0) return '稀有池';
    if (raceLocks.length === 0 && genderLocks.length === 1)
      return `稀有·${genderLocks[0] === 'female' ? '女性' : '男性'}`;
    if (raceLocks.length === 1 && genderLocks.length === 0) return `稀有·${raceLocks[0]}专属`;
    if (raceLocks.length > 0 && genderLocks.length === 1) {
      return `稀有·${raceLocks.join(' / ')}·${genderLocks[0] === 'female' ? '女性' : '男性'}`;
    }
    return '稀有池';
  }
  if (raceLocks.length === 0 && genderLocks.length === 0) return '通用池';
  if (raceLocks.length === 0 && genderLocks.length === 1) return genderLocks[0] === 'female' ? '女性通用' : '男性通用';
  if (raceLocks.length === 1 && raceLocks[0] === '人类' && genderLocks.length === 1) {
    return genderLocks[0] === 'female' ? '人类女性特有' : '人类男性特有';
  }
  if (raceLocks.length === 1 && genderLocks.length === 0) return `${raceLocks[0]}专属`;
  if (raceLocks.length > 0 && genderLocks.length === 1) {
    return `${raceLocks.join(' / ')}·${genderLocks[0] === 'female' ? '女性' : '男性'}专属`;
  }
  return '锁定池';
};

export const buildSpiritSkillSourceLabel = (skill: Skill) => formatPrimaryLabel(skill);

const NPC_POOL_LABELS: Record<NpcSkillPool, string> = {
  common_pool: '普通池',
  rare_pool: '稀有共享',
  exclusive: '专属',
};

export const buildSpiritSkillNpcPoolLabel = (skill: Pick<Skill, 'familyId' | 'npcPool'>): string =>
  NPC_POOL_LABELS[getSpiritSkillNpcPool(skill)];

export const buildSpiritSkillNpcPolicyLabel = (
  skill: Pick<Skill, 'familyId' | 'displayLevelLabel' | 'npcPool' | 'minNpcRank'>,
): string => {
  const poolLabel = buildSpiritSkillNpcPoolLabel(skill);
  const minNpcRank = getSpiritSkillMinNpcRank(skill);
  return minNpcRank ? `${poolLabel} · ${minNpcRank}起` : poolLabel;
};

const buildSkillCard = (config: {
  id: string;
  familyId: string;
  name: string;
  level: number;
  description: string;
  effectLines: string[];
  aiSummary: string;
  slotHints: string[];
  poolOrigin: Skill['poolOrigin'];
  raceLocks?: string[];
  genderLocks?: Array<'male' | 'female'>;
  breakUnlocks?: Skill['breakUnlocks'];
  sixDimBonuses?: Skill['sixDimBonuses'];
  displayLevelLabel?: string;
  mountType?: Skill['mountType'];
  npcPool?: Skill['npcPool'];
  minNpcRank?: Skill['minNpcRank'];
}): Skill => ({
  id: config.id,
  familyId: config.familyId,
  name: config.name,
  level: config.level,
  displayLevelLabel: config.displayLevelLabel,
  description: config.description,
  effectLines: config.effectLines,
  aiSummary: config.aiSummary,
  slotHints: config.slotHints,
  poolOrigin: config.poolOrigin,
  raceLocks: config.raceLocks,
  genderLocks: config.genderLocks,
  breakUnlocks: config.breakUnlocks,
  sixDimBonuses: config.sixDimBonuses,
  mountType: config.mountType,
  npcPool: resolveDefaultNpcPool(config),
  minNpcRank: resolveDefaultMinNpcRank(config),
  rankColor: config.level >= 5 ? 'gold' : config.level >= 4 ? 'purple' : config.level >= 3 ? 'blue' : 'white',
});

type SpiritSkillLevelPayload = Pick<
  Parameters<typeof buildSkillCard>[0],
  'description' | 'effectLines' | 'aiSummary' | 'sixDimBonuses'
>;

const buildFamily = (
  base: Omit<Parameters<typeof buildSkillCard>[0], 'id' | 'level' | 'description' | 'effectLines' | 'aiSummary'>,
  factory: (level: number) => SpiritSkillLevelPayload,
  levelsOrOptions: number[] | { levels?: number[]; idPrefix?: string } = [1, 2, 3, 4, 5],
): Skill[] => {
  const options = Array.isArray(levelsOrOptions) ? { levels: levelsOrOptions } : levelsOrOptions;
  const levels = options.levels || [1, 2, 3, 4, 5];
  const idPrefix = options.idPrefix || base.familyId;
  return levels.map(level =>
    buildSkillCard({
      ...base,
      id: `${idPrefix}_lv${level}`,
      level,
      ...factory(level),
    }),
  );
};

const buildJiquVariantFamily = (config: {
  idPrefix: string;
  slotHints: string[];
  routeLabel: string;
  shortLabel: string;
  tagLabel: string;
  openingAction: string;
  sustainAction: string;
  controlAction: string;
  attackAction: string;
  finisherAction: string;
}) =>
  buildFamily(
    {
      familyId: 'jiqu',
      name: '夺息',
      slotHints: config.slotHints,
      poolOrigin: 'rare',
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description: `夺息的${config.routeLabel}先以${config.openingAction}显现，通过直接接触抽走少量体力与灵能，建立最基础的近身吸取回路。`,
          effectLines: [
            `Lv1：只有在${config.openingAction}真正成立时才会生效，重点是先让目标发软、失力、恢复变慢。`,
            `汲取量有限，重点是建立${config.shortLabel}的压制回路，而不是立刻抽空。`,
          ],
          aiSummary: `夺息 Lv1（${config.tagLabel}），可在${config.openingAction}时抽走少量体力与灵能，让目标先发软和失力。`,
          sixDimBonuses: { 体质: 1 },
        },
        2: {
          description: `夺息沿着${config.routeLabel}扩展成持续生效，只要${config.sustainAction}还在维持，就能不断抽走目标的体力与灵能。`,
          effectLines: [
            `Lv2：不再必须是瞬时接触，${config.sustainAction}期间会持续抽取。`,
            `适合近身压制、封走位和把目标钉在自己的${config.shortLabel}节奏里。`,
          ],
          aiSummary: `夺息 Lv2（${config.tagLabel}），只要${config.sustainAction}还在维持，就能持续抽走体力与灵能。`,
          sixDimBonuses: { 体质: 1, 力量: 1 },
        },
        3: {
          description: `夺息进入稳态后，${config.controlAction}越久，抽取效率越高，目标的挣扎会反过来被榨成你的燃料。`,
          effectLines: [
            `Lv3：越是长时间${config.controlAction}，越容易把目标拖进失力、缺氧和动作失序。`,
            `这一阶段的重点是把${config.shortLabel}从控人动作变成稳定的吸取方式。`,
          ],
          aiSummary: `夺息 Lv3（${config.tagLabel}），${config.controlAction}越久抽得越狠，可把控制动作稳定转成吸取。`,
          sixDimBonuses: { 体质: 1, 力量: 1, 敏捷: 1 },
        },
        4: {
          description: `高阶夺息会把吸取附着到${config.attackAction}本身，只要命中或压稳，就能直接带走体力与灵能。`,
          effectLines: [
            `Lv4：${config.attackAction}都会直接带出抽取效果。`,
            `这一级开始，每一次${config.shortLabel}压制都兼具削弱、断节奏与持续折磨。`,
          ],
          aiSummary: `夺息 Lv4（${config.tagLabel}），可把抽取附着到${config.attackAction}上，让每次压制都兼具削弱作用。`,
          sixDimBonuses: { 体质: 1, 力量: 1, 敏捷: 1, 意志: 1 },
        },
        5: {
          description: `满载后，夺息会把${config.routeLabel}外化成真正的呼吸权限接管，只要${config.finisherAction}，就会被你直接夺走喘息空间。`,
          effectLines: [
            `Lv5：在自身${config.shortLabel}范围内，可直接控制他人的呼吸，决定其何时吸气、何时断气、能喘多少。`,
            `它不再只是近身抽取，而是把${config.routeLabel}升格成真正的窒息支配。`,
          ],
          aiSummary: `夺息 Lv5（${config.tagLabel}），会把${config.routeLabel}外化成呼吸权限接管，只要${config.finisherAction}就能直接夺息。`,
          sixDimBonuses: { 体质: 1, 力量: 1, 敏捷: 1, 意志: 1, 感知: 1 },
        },
      };
      return tierMap[level];
    },
    { idPrefix: config.idPrefix },
  );

const commonFamilies: Skill[] = [
  ...buildFamily(
    {
      familyId: 'lingmin_xiujue',
      name: '灵敏嗅觉',
      slotHints: ['face'],
      poolOrigin: 'male_common',
      genderLocks: ['male'],
    },
    level => ({
      description: `将环境气味解析精度提升到 ${LEVEL_TITLE[level]} 阶段，能更早嗅出危险、伤口、体液与异常残留。`,
      effectLines: [
        `Lv${level}：提高气味分层、残留识别与追踪能力。`,
        level >= 4 ? '对高浓度信息素、魅气与孢粉类效果更敏感。' : '可辅助侦查、追踪与近距判断。',
      ],
      aiSummary: `灵敏嗅觉 Lv${level}，可放大气味追踪、残留识别与诱导类灵弦的感知结果。`,
      sixDimBonuses: { 感知: Math.max(1, Math.ceil(level / 2)) },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'gongzhen_kangya',
      name: '共振抗压',
      slotHints: ['brain'],
      poolOrigin: 'male_common',
      genderLocks: ['male'],
    },
    level => ({
      description: `通过灵核与灵枢的共振缓冲，提高对精神冲击、羞辱压迫与灵压穿透的承受阈值。`,
      effectLines: [
        `Lv${level}：提高理智抗压与意志稳定。`,
        level >= 4 ? '对持续性魅惑、歌喉、凝视压迫有更高抵抗。' : '对短时精神冲击有基础缓冲。',
      ],
      aiSummary: `共振抗压 Lv${level}，更适合承受精神压制、诱导和位阶打击。`,
      sixDimBonuses: { 意志: Math.max(1, Math.ceil(level / 2)), 体质: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'lingbao',
      name: '灵爆',
      slotHints: ['l_arm', 'r_arm', 'l_hand', 'r_hand', 'l_leg', 'r_leg', 'l_foot', 'r_foot'],
      poolOrigin: 'common',
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description: '将灵能短暂压缩成不稳定的爆点后推出，引发一次基础的冲击性爆裂。',
          effectLines: [
            'Lv1：可打出小范围灵爆，主要用于补伤、打断和逼退。',
            '爆裂规模有限，但已经具备明确的灵能术式特征，不再只是近身发力。',
          ],
          aiSummary: '灵爆 Lv1，可将灵能压成小型爆点推出，用于基础伤害、打断和逼退。',
          sixDimBonuses: { 力量: 1 },
        },
        2: {
          description: '灵爆开始具备更稳定的成型速度与飞行轨迹，可作为常规中近距输出术使用。',
          effectLines: [
            'Lv2：爆点更稳，能够在中近距离命中后产生清晰的灵压炸裂。',
            '适合连续施放与压制性抢节奏，已可对普通掩体和低阶防护造成明显冲击。',
          ],
          aiSummary: '灵爆 Lv2，可稳定推出中近距爆点，形成清晰的灵压炸裂和常规术式输出。',
          sixDimBonuses: { 力量: 1, 感知: 1 },
        },
        3: {
          description: '灵爆进入稳态后，可在爆裂瞬间把灵压向内再折一次，让伤害与震荡都更集中。',
          effectLines: [
            'Lv3：命中后会形成更强的穿透性爆裂，对灵能防护与肉体都有更真实的压伤感。',
            '开始具备“点爆”性质，适合打核心部位、破姿态和逼出防御动作。',
          ],
          aiSummary: '灵爆 Lv3，可形成更集中的点爆伤害，兼具破姿态、压伤和中近距点杀能力。',
          sixDimBonuses: { 力量: 1, 感知: 1, 意志: 1 },
        },
        4: {
          description: '高阶灵爆可在一次施术里压入多层爆脉，命中后连续炸开，像把灵压在目标体表和内部同时撕裂。',
          effectLines: [
            'Lv4：可打出连爆或延后一拍的二次炸裂，让防御、护障与硬接变得更危险。',
            '对群体压场和单体破防都已相当成熟，是很多高阶施术者的标准杀伤术。',
          ],
          aiSummary: '灵爆 Lv4，可形成多层连爆或延迟炸裂，兼具破防、压场和成熟的高阶术式输出。',
          sixDimBonuses: { 力量: 2, 感知: 1, 意志: 1 },
        },
        5: {
          description: '满载灵爆能把高密度灵能压到极限后瞬时放出，爆裂会带明显的撕扯感与崩解感，已接近通用杀伤术的顶点。',
          effectLines: [
            'Lv5：可在单点重爆、扇面爆裂和短时连爆之间灵活切换，对高阶目标也具备正面威胁。',
            '它仍是普通成长灵弦，不是传说，但在 Lv5 时已经足以成为强角色的核心输出术之一。',
          ],
          aiSummary: '灵爆 Lv5，是通用高阶杀伤术的顶点之一，可在单点重爆、扇面爆裂和连爆之间切换。',
          sixDimBonuses: { 力量: 2, 感知: 1, 意志: 1, 体质: 1 },
        },
      };
      return tierMap[level];
    },
  ),
  ...buildFamily(
    {
      familyId: 'shiling_wu',
      name: '噬灵雾',
      slotHints: ['mouth'],
      poolOrigin: 'common',
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description: '释放一层带有噬灵性的淡雾，吸入后会让灵能循环出现轻微迟滞。',
          effectLines: [
            'Lv1：主要压低目标的灵能运转流畅度与恢复速度。',
            '雾量较薄，更适合在贴近、狭小空间或逼近前后使用。',
          ],
          aiSummary: '噬灵雾 Lv1，可释放薄雾让目标灵能运转迟滞、恢复变慢，适合贴近压制。',
          sixDimBonuses: { 感知: 1 },
        },
        2: {
          description: '雾体开始更稳定，能短时间停留在场中，并持续侵蚀吸入者的灵能节奏。',
          effectLines: [
            'Lv2：可形成短时滞留雾区，让目标在雾中越待越难顺畅施术。',
            '对低阶护体与基础术式的压制已经很明显。',
          ],
          aiSummary: '噬灵雾 Lv2，可形成短时滞留雾区，持续压低目标的施术流畅度和灵能恢复。',
          sixDimBonuses: { 感知: 1, 意志: 1 },
        },
        3: {
          description: '噬灵雾进入稳态后，会开始主动缠附目标周身，把原本顺畅的灵能流拉成卡顿与断续。',
          effectLines: [
            'Lv3：能明显干扰持续施术、蓄力与高频输出，让目标在战斗中不断掉节奏。',
            '已适合配合队友压场、拖续航或逼迫对方离开某个区域。',
          ],
          aiSummary: '噬灵雾 Lv3，可主动缠附并打乱目标灵能节奏，适合拖续航、断施术和战场压制。',
          sixDimBonuses: { 感知: 1, 意志: 1, 体质: 1 },
        },
        4: {
          description: '高阶噬灵雾会让吸入者灵能像被一点点啃空，越是想强行运转，越容易出现反噬与空转。',
          effectLines: [
            'Lv4：可对高频术式、护障维持和持续强化产生显著的衰减作用。',
            '这一级开始，噬灵雾已不只是削弱，而是会逼迫目标重排自己的战斗方式。',
          ],
          aiSummary: '噬灵雾 Lv4，可明显啃空目标灵能并诱发空转与反噬，迫使其改变施术与续航方式。',
          sixDimBonuses: { 感知: 1, 意志: 2, 体质: 1 },
        },
        5: {
          description: '满载噬灵雾会把一片区域压成近似灵能贫化带，处在雾中的目标会迅速陷入灵能枯竭、施术失准与循环崩坏。',
          effectLines: [
            'Lv5：可在较短时间内把区域内目标逼进灵能干涸边缘，是极强的通用消耗与控场术式。',
            '它不是传说级概念能力，但在普通灵弦里已经属于会显著改写战局节奏的高危术。',
          ],
          aiSummary: '噬灵雾 Lv5，可把区域压成灵能贫化带，快速逼近灵能枯竭，属于高危通用控场术。',
          sixDimBonuses: { 感知: 1, 意志: 2, 体质: 1, 魅力: 1 },
        },
      };
      return tierMap[level];
    },
  ),
  ...buildFamily(
    {
      familyId: 'fuling_suo',
      name: '缚灵锁',
      slotHints: ['l_hand', 'r_hand'],
      poolOrigin: 'common',
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description: '把灵能编成一段短暂成型的锁带或锁环，用于基础拘束与牵制。',
          effectLines: [
            'Lv1：可短时间锁住手腕、脚踝或局部动作，主要用于起手控制。',
            '束缚规模有限，但已经能把灵能显化为清晰可见的拘束术。',
          ],
          aiSummary: '缚灵锁 Lv1，可将灵能编成短暂锁带，执行基础拘束、起手控制和动作牵制。',
          sixDimBonuses: { 意志: 1 },
        },
        2: {
          description: '缚灵锁开始具备更完整的链段与锁扣结构，可对单体形成更稳定的持续拘束。',
          effectLines: [
            'Lv2：能稳定限制目标挣脱、冲刺与起手，适合配合审讯、围捕和近战压制。',
            '这一级开始，束缚不再只是点一下就散，而是会明确留下控制窗口。',
          ],
          aiSummary: '缚灵锁 Lv2，可形成更稳定的持续拘束，适合围捕、压制和近战配合。',
          sixDimBonuses: { 意志: 1, 感知: 1 },
        },
        3: {
          description: '稳态缚灵锁可同时拉出多段锁链，对单体多处位点完成联合束缚，明显提升控制强度。',
          effectLines: [
            'Lv3：可锁动作、锁位移并短时压低目标的挣脱效率与施术节奏。',
            '已经是成熟的标准控制术，足以让多数目标在被命中后非常难受。',
          ],
          aiSummary: '缚灵锁 Lv3，可多位点联合束缚，显著限制动作、位移和施术节奏，是成熟控制术。',
          sixDimBonuses: { 意志: 1, 感知: 1, 力量: 1 },
        },
        4: {
          description: '高阶缚灵锁可将锁链直接钉入周边地面、墙面或施术者自身灵压场中，把拘束从“缠住”升级为“封死”。',
          effectLines: [
            'Lv4：对冲刺、突进、跳脱和硬挣脱有很强压制，可把目标硬定在某个位置或路径上。',
            '配合队友或后续术式时，缚灵锁会变成极强的起手和终结接口。',
          ],
          aiSummary: '缚灵锁 Lv4，可将目标钉定在位置或路径上，对突进和挣脱形成强压，是高阶起手控制术。',
          sixDimBonuses: { 意志: 2, 感知: 1, 力量: 1 },
        },
        5: {
          description: '满载缚灵锁能在短时间内形成完整的灵锁阵列，目标一旦被套入，就像被整片灵压锁场一层层扣住。',
          effectLines: [
            'Lv5：可对高阶目标形成极强限制，也可在小范围内一次性锁住多人，是通用拘束术的顶点之一。',
            '它依旧不是传说级，但在 Lv5 时已足以左右战斗开局、抓捕效率和局部处刑节奏。',
          ],
          aiSummary: '缚灵锁 Lv5，可形成灵锁阵列，对单体高强拘束或小范围多人封锁，是高阶通用控制术。',
          sixDimBonuses: { 意志: 2, 感知: 1, 力量: 1, 体质: 1 },
        },
      };
      return tierMap[level];
    },
  ),
  ...buildFamily(
    {
      familyId: 'xiangwei_bu',
      name: '相位步',
      slotHints: ['l_leg', 'r_leg', 'l_foot', 'r_foot'],
      poolOrigin: 'common',
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description: '将步态调整为更高效的折步形态，起步、刹停和切位都比常人更短更利落。',
          effectLines: [
            'Lv1：显著强化短距起步、撤步和转向，让近战切位不再拖拍。',
            '重点是把步法练到异常干净，还不涉及真正的相位错位。',
          ],
          aiSummary: '相位步 Lv1，可明显强化起步、撤步与基础切位，是高质量近战步法的起点。',
          sixDimBonuses: { 敏捷: 1 },
        },
        2: {
          description: '相位步开始让身位在高速移动里出现轻微偏移。她迈出去的那一步，会比看上去更难被精确卡住。',
          effectLines: [
            'Lv2：可在高速切位中制造轻微错身感，让贴近、绕背和折返更流畅。',
            '这一级开始，对手会觉得她的身位有点“不在原地”。',
          ],
          aiSummary: '相位步 Lv2，可在高速切位里形成轻微错身，明显提高贴近和折返质量。',
          sixDimBonuses: { 敏捷: 1, 感知: 1 },
        },
        3: {
          description: '进入稳态后，相位步可把一步拆成近似断拍的突进。她像是先从原地淡掉一点，再在更近的位置接上动作。',
          effectLines: [
            'Lv3：可显著压缩贴脸时间，让突进和闪入更像突然出现在那里。',
            '适合长柄武器、贴身爆发和追击补位，是成熟近战机动线的核心层级。',
          ],
          aiSummary: '相位步 Lv3，可把突进压成近似断拍的贴脸，显著缩短近战接敌时间。',
          sixDimBonuses: { 敏捷: 2, 感知: 1 },
        },
        4: {
          description: '高阶相位步会让她在交错时强行改写落点。哪怕被盯住，也能从原本最该中招的位置抽出半拍空窗。',
          effectLines: [
            'Lv4：近战交错中可强行抽身换点，让对手明明盯到了，却还是容易砍空。',
            '这一级开始，相位步不只是快，而是能在被注视状态下强行错掉关键身位。',
          ],
          aiSummary: '相位步 Lv4，可在交错瞬间强改落点，即使被盯住也能抽出关键空窗。',
          sixDimBonuses: { 敏捷: 2, 感知: 1, 意志: 1 },
        },
        5: {
          description:
            '满载后，相位步会把中间那段距离本身压到几乎不存在。她不是单纯跑得快，而是像直接把“从这里到那里”的过程折掉了一截。',
          effectLines: [
            'Lv5：可在极短时间内完成顶级切位、贴脸、脱离与反向穿插，是人类近战者也可能抵达的步法顶点之一。',
            '它依然属于普通灵弦，不是传说，但在 Lv5 时已经足以支撑顶级近战处刑者的机动上限。',
          ],
          aiSummary: '相位步 Lv5，会把位移过程本身压到极短，是顶级近战切位灵弦，但仍属于普通成长线。',
          sixDimBonuses: { 敏捷: 3, 感知: 1, 意志: 1 },
        },
      };
      return tierMap[level];
    },
  ),
  ...buildFamily(
    {
      familyId: 'meiqi',
      name: '魅气',
      slotHints: ['mouth', 'body', 'axilla', 'l_foot', 'r_foot'],
      poolOrigin: 'female_common',
      genderLocks: ['female'],
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description:
            '将灵能转化为可附着在特定部位与贴身材质上的轻度魅气。近距离吸入后，目标会开始喜欢这个味道，并在离开后反复回想。',
          effectLines: [
            'Lv1：必须近距离闻到或贴近吸入才会明显生效。',
            '会轻微侵蚀理智值，让目标开始喜欢这个味道，离开后也会不自觉回想。',
          ],
          aiSummary: '魅气 Lv1，近距离吸入后会让目标喜欢这个味道并反复回想，只造成轻度理智侵蚀。',
          sixDimBonuses: { 魅力: 1 },
        },
        2: {
          description: '魅气残留开始更稳定，能附着在衣料、余香与短时接触上，让目标离开后还会想再次闻到、再次靠近。',
          effectLines: [
            'Lv2：会持续侵蚀理智值，让目标更容易主动寻找残留、画面和相关接触。',
            '从“喜欢这个味道”升级为“越来越想再次闻到”，上头感明显增强。',
          ],
          aiSummary: '魅气 Lv2，会让目标越来越想再次闻到和接近该部位，理智值下降速度明显高于 Lv1。',
          sixDimBonuses: { 魅力: 1 },
        },
        3: {
          description: '魅气会把快感、羞耻和特定部位绑定成固定入口，目标会逐渐形成围绕这一部位的稳定性癖回路。',
          effectLines: [
            'Lv3：会明显持续掉理智值，让目标把闻到、看到、靠近这个部位和兴奋感绑定起来。',
            '一旦被勾起就很难靠意志压住，容易形成固定癖好和重复追逐。',
          ],
          aiSummary: '魅气 Lv3，可形成稳定性癖回路，让目标把兴奋和该部位绑定，理智值会持续被拉低。',
          sixDimBonuses: { 魅力: 2 },
        },
        4: {
          description:
            '高阶魅气会把发情、依赖和服从倾向捆在一起。反复暴露后，目标会越来越把靠近她、顺从她当成正确选择。',
          effectLines: [
            'Lv4：理智值会被快速侵蚀，低理智状态下更容易主动为她找理由、主动靠近和服从。',
            '开始具备洗脑边缘效果，但通常仍需要调教、指令或奖惩配合才能稳定固化。',
          ],
          aiSummary: '魅气 Lv4，会把欲望、依赖和服从连成一条线，快速侵蚀理智，进入可被调教固化的洗脑边缘。',
          sixDimBonuses: { 魅力: 2, 感知: 1 },
        },
        5: {
          description:
            '满级魅气是深度驯化接口。只要持续吸入并反复强化，目标的理智值可被压到归零，并被驯化成只剩发情与服从反应的空壳。',
          effectLines: [
            'Lv5：会极快侵蚀理智值；理智归零后，可在持续暴露下把目标推进发情、空白、服从循环。',
            '什么时候发情、什么时候短暂清醒，可以被施加者配合指令、刺激时机和调教节奏控制，但不是闻一下就会立刻变成白痴。',
          ],
          aiSummary: '魅气 Lv5，是深度洗脑级魅气。它会高速清空理智，并把目标驯化成可被控制发情与短暂清醒的服从空壳。',
          sixDimBonuses: { 魅力: 3, 感知: 1 },
        },
      };
      return tierMap[level];
    },
  ),
];

const speciesFamilies: Skill[] = [
  ...buildFamily(
    {
      familyId: 'fenli_er_eye',
      name: '芬里尔之眼',
      slotHints: ['eyes'],
      poolOrigin: 'species',
      raceLocks: ['月光精灵'],
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description: '月光精灵猎手系基础灵弦。最初只是在原有视力上提高动态观察力，让使用者更容易看清动作本身。',
          effectLines: [
            'Lv1：可以更清楚地看清起手、步伐、重心变化和基础动作细节。',
            '只做到“看清动作”，还不能稳定判断撒谎、情绪或未来动作。',
          ],
          aiSummary: '芬里尔之眼 Lv1，主要强化动态观察力，让使用者更容易看清动作细节和起手变化。',
          sixDimBonuses: { 感知: 1 },
        },
        2: {
          description: '视线开始能捕捉细微不协调，适合拆出说话、动作和表情之间的错位，用于判断对方是否在撒谎或隐瞒。',
          effectLines: [
            'Lv2：能从眼神、停顿、表情收放和动作错位里判断对方是否在说谎、装镇定或刻意掩饰。',
            '还不能真正读懂复杂情绪，更偏向“识破不对劲”。',
          ],
          aiSummary: '芬里尔之眼 Lv2，可通过细微错位判断撒谎、伪装和明显掩饰，但还不到完整情绪洞察。',
          sixDimBonuses: { 感知: 1, 敏捷: 1 },
        },
        3: {
          description: '眼部开始兼容更完整的微反应观察，能把呼吸、瞳孔、迟疑和细小神态并入判断，用于识别真实情绪。',
          effectLines: [
            'Lv3：除了识破撒谎，也能稳定判断紧张、害怕、犹豫、兴奋、嘴硬等真实情绪。',
            '适合抓心理松动点，但还没有进入子弹时间或未来预判层级。',
          ],
          aiSummary: '芬里尔之眼 Lv3，可稳定判断真实情绪和心理松动点，是完整的情绪洞察层级。',
          sixDimBonuses: { 感知: 2, 敏捷: 1 },
        },
        4: {
          description: '猎手感知进入高阶，感知里会出现短时间近似“子弹时间”的拉慢效果，高速动作会被拆得更清楚。',
          effectLines: [
            'Lv4：在短窗口内可把高速动作看得像被拉慢一样，更容易拆招、闪避、反击和压制。',
            '这是直接与战力挂钩的高阶强化，但仍然不是未来视。',
          ],
          aiSummary: '芬里尔之眼 Lv4，可在短窗口内形成近似子弹时间的观察效果，显著提高高速战斗中的拆招与反应能力。',
          sixDimBonuses: { 感知: 2, 敏捷: 1, 意志: 1 },
        },
        5: {
          description: '满载时会进一步越过单纯的子弹时间，短暂捕捉到对方约一秒后的行动轨迹，形成真正的短时未来视。',
          effectLines: [
            'Lv5：可直接看见对方约一秒后的未来动作，因此不仅能拆招，还能提前布局、截断和反制。',
            '这是极高阶战斗灵弦，会把近战、围猎和压制能力推到非常危险的程度。',
          ],
          aiSummary: '芬里尔之眼 Lv5，可短暂看见对方约一秒后的未来动作，属于真正的未来视层级。',
          sixDimBonuses: { 感知: 3, 敏捷: 1, 意志: 1 },
        },
      };
      return tierMap[level];
    },
  ),
  ...buildFamily(
    {
      familyId: 'zhuisuo_yin',
      name: '灵孢寄生',
      slotHints: ['brain'],
      poolOrigin: 'species',
      raceLocks: ['月光精灵'],
      mountType: 'core',
    },
    level => {
      const tierMap: Record<number, SpiritSkillLevelPayload> = {
        1: {
          description:
            '月光精灵特有的孢子寄生灵弦。最初只能把灵能转成极浅的孢子印，借贴身物、气味、汗液或短时接触送进目标体内。',
          effectLines: [
            'Lv1：重点是“种进去”，而不是追得准；孢子印很浅，容易衰退和消散。',
            '适合做最基础的媒介种印，还做不到稳定追踪、长期潜伏或寄生改造。',
          ],
          aiSummary: '灵孢寄生 Lv1，只能通过媒介把浅层孢子印送进目标体内，重点是成功种印，尚无稳定追踪能力。',
          sixDimBonuses: { 感知: 1 },
        },
        2: {
          description: '孢子印开始能在体内短时存活，并向施术者反馈目标是否重新靠近、是否还活跃等粗略状态。',
          effectLines: [
            'Lv2：孢子已不只是留痕，会开始回传简单反馈，例如目标是否回来过、是否还在活动。',
            '仍然偏粗略，只能知道“有/没有、近/不近、活跃/不活跃”，还做不到精确锁定。',
          ],
          aiSummary: '灵孢寄生 Lv2，种下后能回传粗略状态反馈，适合确认目标是否回来过、是否仍在活动。',
          sixDimBonuses: { 感知: 1, 意志: 1 },
        },
        3: {
          description: '孢子印进入稳态后，可同时在多名目标体内潜伏，并区分不同个体的印记回响。',
          effectLines: [
            'Lv3：可以维持多重孢印，分辨不同目标，不再局限于单体盯梢。',
            '适合布网、筛选和长期观察，但还没有达到强锁定与发芽改造层级。',
          ],
          aiSummary: '灵孢寄生 Lv3，可多目标并行潜伏和区分个体，进入真正的布网阶段。',
          sixDimBonuses: { 感知: 2, 意志: 1 },
        },
        4: {
          description: '高阶灵孢寄生会从“潜伏”升级为“锁定寄生”。孢子能稳定附着于体内或灵核边缘，极难被清除。',
          effectLines: [
            'Lv4：可以稳定锁定目标的大致方位与状态，哪怕对方想摆脱、清洗或远离，也很难彻底脱离寄生。',
            '这是“追索”真正完成的等级，寄生已经足够稳，适合长期控制和失联回收。',
          ],
          aiSummary: '灵孢寄生 Lv4，进入锁定寄生阶段，可长期附着并稳定锁定目标的大致方位与状态。',
          sixDimBonuses: { 感知: 2, 意志: 1, 魅力: 1 },
        },
        5: {
          description: '满载灵孢寄生会让孢子在目标体内发芽，把追踪进一步升级为寄生改造，令目标开始向半植物化转变。',
          effectLines: [
            'Lv5：孢子可在体内生长出灵植结构、孢囊或寄生组织，把目标从“被标记”推进到“被改造”。',
            '这一级不只是追踪，而是能把目标往半植物化方向推进，具体会长成什么样取决于使用者如何催发。',
          ],
          aiSummary: '灵孢寄生 Lv5，可让孢子在体内发芽并推动半植物化改造，属于追踪升级为寄生改造的层级。',
          sixDimBonuses: { 感知: 3, 意志: 1, 魅力: 1 },
        },
      };
      return tierMap[level];
    },
  ),
  buildSkillCard({
    id: 'linghun_diaosuzhe_legend',
    familyId: 'linghun_diaosuzhe',
    name: '灵魂雕塑者',
    level: 5,
    displayLevelLabel: '灵核',
    description: '可将灵魂切面、灵核残响与灵性能量直接重铸成带灵能性质的物质或器物，是月光精灵中的灵核塑灵词条。',
    effectLines: [
      '可切取灵魂的局部切面、价值层、情绪残响与阶段留痕，并将其直接重铸成材料、饰品、武器、容器或其他灵能器物。',
      '灵弦本体决定“能把灵魂变成物”，至于做成什么、拿来干什么，由使用者的技艺、性格与目的决定。',
    ],
    aiSummary: '灵魂雕塑者是无等级成长的灵核灵弦，能把灵魂切面与灵性能量直接重铸成带灵能性质的物质或器物。',
    slotHints: ['brain', 'l_hand', 'r_hand'],
    poolOrigin: 'species',
    raceLocks: ['月光精灵'],
    mountType: 'core',
    sixDimBonuses: { 感知: 2, 魅力: 1, 意志: 1 },
  }),
  buildSkillCard({
    id: 'shenxiang_meiti_legendary',
    familyId: 'shenxiang_meiti',
    name: '蜃香媚体',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以身体、香气、体温与烟气共同构成活体幻术媒介的传说级身躯词条。她的靠近本身就会把视觉、嗅觉与触觉一起拉进失真。',
    effectLines: [
      '近身者更容易把香气、体温、衣料摩擦与烟气残留误判为被接纳、被安抚、被纵容的信号，并因此主动继续贴近。',
      '即使短暂离开，残留在身上的香气与体感也会反复唤回对应幻觉，让目标更难把她从身体记忆里彻底剥离。',
    ],
    aiSummary: '蜃香媚体是无等级成长的传说级身躯词条，可把她的身体、香气与烟气变成持续诱导的活体幻术媒介。',
    slotHints: ['body', 'mouth'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    sixDimBonuses: { 魅力: 2, 体质: 1, 感知: 1 },
  }),
  buildSkillCard({
    id: 'meiyin_legendary',
    familyId: 'meiyin',
    name: '魅音',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '将声音转化为可直接穿透颅骨、侵入大脑与意识体的魅性灵波。它不依赖普通听觉路径，而是直接在脑内回响、污染与改写。 ',
    effectLines: [
      '声音会绕过普通听觉防线，直接把欲望、崇拜、迷醉与服从感压进目标脑内。',
      '更高阶的使用方式可以把命令、赞许、羞辱与神谕缠在同一段音波里，让目标在发情、恍惚与服从之间被反复拉扯。',
    ],
    aiSummary:
      '魅音是无等级成长的传说级声音词条，可让声音直接穿透颅骨进入脑内，污染意识并把欲望、服从与神谕压成同一条通路。',
    slotHints: ['mouth'],
    poolOrigin: 'female_common',
    genderLocks: ['female'],
    sixDimBonuses: { 魅力: 2, 意志: 1, 感知: 1 },
  }),
  buildSkillCard({
    id: 'asmr_legendary',
    familyId: 'asmr',
    name: 'ASMR',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以知觉锚定与感官转映为核心的传说级词条。施加者可锁定目标的某段感官通路，并把触觉、压感、听觉、快感与痛感映射到外部媒介上，让媒介成为目标神经系统的临时替身。',
    effectLines: [
      '可将头部、四肢、敏感部位或更复杂的局部知觉锚到模型、软材、假头、器具等媒介上；器官依然留在原位，反馈却会沿映射真实返回。',
      '当媒介侧遭受揉压、塑形、切削、敲击、摩擦或高密度触发时，目标的对应神经会同步承受真实冲击；若映射落在神经中枢，足以造成知觉崩坏与中枢停摆。',
      '这条词条的个人风格极强。同样是 ASMR，有人会把它做成安抚式知觉梳理，有人会把它做成快感失控接口，也有人会把它做成借媒介完成的精密处刑。',
    ],
    aiSummary:
      'ASMR 是无等级成长的传说级感官转映词条，可将目标的局部知觉锚到外部媒介上，并通过操控媒介把触感、听感与神经反馈直接送回目标体内。',
    slotHints: ['brain', 'mouth', 'l_hand', 'r_hand'],
    poolOrigin: 'rare',
    genderLocks: ['female'],
    sixDimBonuses: { 感知: 2, 魅力: 1, 意志: 1 },
  }),
  buildSkillCard({
    id: 'shenxiang_ningshi_legendary',
    familyId: 'nvshen_ningshi',
    name: '女神凝视',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以女神化高位感为核心的传说级凝视词条。与她对视时，目标会在意识体中被拉进一场“跪下膜拜”的内在审判，理智与肉体会同时失守。',
    effectLines: [
      '凝视会让目标本能地产生跪伏、勃起、喷精与膜拜冲动，像在意识体里被一尊巨大而高贵的女神碾碎。',
      '它不是普通魅惑，而是把“你该跪下去”直接写进对方的意识和肉体反应里。',
    ],
    aiSummary:
      '女神凝视是无等级成长的传说级眼部词条。它会把目标拖进“必须跪下膜拜”的意识审判里，使意识与肉体同时向崇拜和失守倾斜。',
    slotHints: ['eyes'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    sixDimBonuses: { 魅力: 2, 感知: 1, 意志: 1 },
  }),
  buildSkillCard({
    id: 'shenqu_tunyan_legendary',
    familyId: 'shenqu_tunyan',
    name: '神躯吞宴',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '色孽赐下的神性掠食词条。只要真正接触、伤到或盯上目标，施术者的“女神概念”就会在人脑中扎根，并把目标的血肉、痛感、快感与挣扎统统纳入自己的吞宴之中。',
    effectLines: [
      '近身时可直接吞噬目标血肉，把其转化为强化自身肌肉密度、爆发、耐久与恢复力的神躯素材，呈现越杀越强的增殖感。',
      '她施加的攻击会附带灵魂腐蚀；就算目标侥幸逃离，污染与神性扎根仍会在体内和意识里继续发作，直到彻底脱离她的影响或被她重新追上。',
    ],
    aiSummary:
      '神躯吞宴是无等级成长的传说战力词条。它会把玥樾的概念钉进目标脑内，并通过吞噬血肉不断强化自身；她的攻击同时附带持续性的灵魂腐蚀。',
    slotHints: ['body', 'l_arm', 'r_arm', 'l_leg', 'r_leg'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    sixDimBonuses: { 体质: 2, 力量: 1, 敏捷: 1, 意志: 1 },
  }),
  buildSkillCard({
    id: 'xuerou_shenghua_legendary',
    familyId: 'xuerou_shenghua',
    name: '血肉圣化',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '将周围物质强行推向生命化、肉体化与无序增生的灵核词条。它并不遵循正常生长逻辑，而是把周围世界扭成过量、增殖、失控的血肉结构。',
    effectLines: [
      '可使建筑、器具、墙面、地面等非生命物质开始生物化、长出血肉、器官、脉络与可继续蔓延的活体组织。',
      '它体现的不是自然生长，而是被扭曲后的生命极限扩张：无序、过量、压迫、侵占。',
    ],
    aiSummary:
      '血肉圣化是无等级成长的灵核词条，可把周围物质强行生物化、血肉化与无序增生，制造以生命过量扩张为核心的扭曲环境。',
    slotHints: ['brain', 'body'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    mountType: 'core',
    sixDimBonuses: { 意志: 2, 感知: 1, 体质: 1 },
  }),
  buildSkillCard({
    id: 'nuli_laoyin_legendary',
    familyId: 'nuli_laoyin',
    name: '奴隶烙印',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '可在目标精神中植入可远程唤起与压低的奴役性烙印，是一种会同时作用于生理欲望、理智与服从结构的灵核支配词条。',
    effectLines: [
      '烙印潜伏时并不总是发作，但施加者可远程将其唤起，使目标迅速进入发情、理智下滑与以施加者为中心的强制依附状态。',
      '反抗必须以自身灵能与坚定意志强行压制烙印，并切断施加者的远程控制；若只压制而未切断，烙印仍可被再次唤起。',
      '反复硬顶失败会导致烙印灵能反噬，大脑被持续灼伤并滑向无脑发情、思维崩坏，严重者可射精至死。',
      '施加者的魅气既能诱发发情，也可在高阶调教中充当维持“清醒但服从”状态的稳定剂。',
    ],
    aiSummary:
      '奴隶烙印是无等级成长的灵核支配词条，可远程唤起目标的欲望、理智崩坏与服从结构。要脱离它，必须同时用灵能压制烙印并切断施加者的远程控制。',
    slotHints: ['brain'],
    poolOrigin: 'rare',
    genderLocks: ['female'],
    mountType: 'core',
    sixDimBonuses: { 意志: 2, 魅力: 1, 感知: 1 },
  }),
  buildSkillCard({
    id: 'yueshi_wangquan_legendary',
    familyId: 'yueshi_wangquan',
    name: '月蚀王权',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '以月蚀为名的灵核王权词条。施加者可在月光下或主动展开的月蚀领域中切断他人的自然灵能补充，并以自身月蚀灵能反向污染、改写其肉体与灵能循环。',
    effectLines: [
      '在月蚀领域内，目标无法正常从自然界补充灵能，续航、恢复与稳定性会被持续削弱。',
      '领域中的目标会被迫不断吸入施加者带有月蚀性质的灵能，使肉体逐渐失去血色、转白，并向月岩化方向发展。',
      '长时间停留或反复暴露后，目标可被推进为白色人形雕塑般的月岩化终局，成为领域统治与处刑的可见证明。',
    ],
    aiSummary:
      '月蚀王权是无等级成长的灵核王权词条。它能在月光或月蚀领域中切断他人的自然灵能补充，并以月蚀灵能持续污染目标，最终把人推向白化月岩化。',
    slotHints: ['body', 'brain'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    mountType: 'core',
    sixDimBonuses: { 意志: 2, 体质: 1, 感知: 1, 魅力: 1 },
  }),
  buildSkillCard({
    id: 'wanyou_yinli_legendary',
    familyId: 'wanyou_yinli',
    name: '万有引力',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '以灵核为核心驱动的灵核引力词条。使用者可主动消耗灵能，改变局部区域内的引力方向、引力强度与牵引关系。',
    effectLines: [
      '可通过持续消耗灵能来强化、削弱、偏转或重新分配局部引力，使目标失衡、跪伏、贴地、滞空或被强行牵引到指定位置。',
      '这条词条本身决定“能控制引力”，至于用它做近身压制、远程牵引、处刑、塑像陈列还是战场控场，由使用者的战斗风格决定。',
      '引力操控强度与持续时间直接取决于灵能投入；灵能越高，可维持的范围越大、压制越稳、操控越精细。',
    ],
    aiSummary:
      '万有引力是以灵核驱动的灵核引力词条，可消耗灵能主动改变局部引力，完成牵引、压伏、失衡、滞空与重压控制。',
    slotHints: ['brain', 'body'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    mountType: 'core',
    sixDimBonuses: { 感知: 1, 意志: 2, 体质: 1, 敏捷: 1 },
  }),
  buildSkillCard({
    id: 'yushuishu_legendary',
    familyId: 'yushuishu',
    name: '御水术',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '以灵核驱动的灵核御水词条。使用者可消耗灵能，直接操控自然界中的水分流动、聚散、压缩、束缚与冲击，并在目标缺乏灵能屏障时进一步干涉其体内水分。',
    effectLines: [
      '可主动操控自然界中的液态水、潮气、水雾与局部湿度，把环境中的水转成拘束、切割、拖曳、冲击或塑形手段。',
      '若目标的灵能屏障已崩溃、被切断、被压空或本就不存在，则可进一步直接影响其体内水分，引发脱水、失衡、内压错乱、血液与体液流动异常。',
      '这条词条本身决定“能御水”，至于偏向处刑、拘束、玩弄、塑形还是资源调配，由使用者的性格与战斗风格决定。',
    ],
    aiSummary:
      '御水术是无等级成长的灵核御水词条，可消耗灵能操控自然界水分；若目标失去灵能屏障，还可直接干涉其体内水分。',
    slotHints: ['brain', 'body'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    mountType: 'core',
    sixDimBonuses: { 感知: 1, 意志: 2, 敏捷: 1, 魅力: 1 },
  }),
  buildSkillCard({
    id: 'nvshen_zhici_legendary',
    familyId: 'nvshen_zhici',
    name: '女神之赐',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '以肉体改写为核心的灵核词条。使用者可通过直接或间接接触，强行改造目标的肉体、脑部、器官、灵核接口与身份结构。',
    effectLines: [
      '它不是单纯伤害，而是把接触本身变成改造接口；中指赐福、鞋跟穿颅、近身触碰都可以成为具体用法。',
      '更高阶的使用者可把目标改造成更听话、更适合某个被分配位置的存在，并对记忆、身份与肉体用途进行重写。',
    ],
    aiSummary: '女神之赐是无等级成长的灵核词条，核心是通过接触完成肉体、脑部、器官与身份结构的强制改写。',
    slotHints: ['brain', 'body', 'l_hand', 'r_hand', 'l_foot', 'r_foot'],
    poolOrigin: 'rare',
    raceLocks: ['月光精灵'],
    genderLocks: ['female'],
    mountType: 'core',
    sixDimBonuses: { 魅力: 2, 意志: 1, 感知: 1, 体质: 1 },
  }),
  buildSkillCard({
    id: 'sishen_legendary',
    familyId: 'sishen',
    name: '死神',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '以灵核为核心显化的死神灵核词条。使用者可直接征收周围生物的生命与生机，将其储存在灵核中，并驱使尸体、骨骸、残件与其他死物活动、移动、阻挡或参与收割。',
    effectLines: [
      '可主动剥夺周围生物的生命力、生机与存活余量，将其纳入灵核储备；目标越虚弱、越接近死亡，征收越稳。',
      '可操控尸体、骨骸、残肢、枯死材料与其他失去生命的死物活动、偏转、拦截或配合自身收割。',
      '它不走太阳、火焰或黑影路线，而是把死亡显成偏虚无、偏空亡、偏命终感的死神权能。',
    ],
    aiSummary:
      '死神是无等级成长的死神灵核词条，可征收并储存周围生物的生命，再操控尸体、骨骸与其他死物活动；它显化为虚无与命终感，而非太阳或暗影路线。',
    slotHints: ['brain', 'body'],
    poolOrigin: 'rare',
    raceLocks: ['人类'],
    genderLocks: ['female'],
    mountType: 'core',
    sixDimBonuses: { 意志: 2, 体质: 1, 力量: 1, 感知: 1 },
  }),
  buildSkillCard({
    id: 'sixian_guance_legendary',
    familyId: 'sixian_guance',
    name: '死线观测',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以双眼直接观测生命断裂、空亡塌陷与命数终点的传说级眼部词条。她看见的不是未来，而是目标此刻最真实的死线。',
    effectLines: [
      '可直接看见目标当前最脆、最空、最容易被推进死亡的那条死线，不会被表面姿态、假动作或强撑出来的生命感轻易欺骗。',
      '能分辨哪些伤只是伤，哪些位置一旦被切开、抽空或诅咒，就会迅速滑向真正的命终后果。',
      '它不是未来视，而是把“你现在该从哪里死”直接显到她眼前的传说级观测。',
    ],
    aiSummary: '死线观测是无等级成长的传说级眼部词条，可直接看见目标当前最真实的死线、空亡处与命终断点，不属于未来视。',
    slotHints: ['eyes'],
    poolOrigin: 'rare',
    raceLocks: ['人类'],
    genderLocks: ['female'],
    sixDimBonuses: { 感知: 2, 意志: 1, 敏捷: 1 },
  }),
  buildSkillCard({
    id: 'xuwu_huilang_legendary',
    familyId: 'xuwu_huilang',
    name: '虚无回廊',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以身躯为媒介的传说级虚无词条。使用者可将身体局部或整体遁入虚无，并在视野范围内的另一处空间打开短暂通道，从别的位置出手、穿出、贴近或脱离。',
    effectLines: [
      '可将自身局部或整体虚化，规避一部分物理接触、锁拿与正面压制。',
      '可在视野范围内的另一处空间打开虚无通道，让攻击、身位或本体从不同落点突然出现。',
      '它不是纯逃生技能，而是能把贴脸、错位、突袭、回避和处刑路径全压进同一条虚无通路中的传说级身躯词条。',
    ],
    aiSummary:
      '虚无回廊是无等级成长的传说级身躯词条，可让身体遁入虚无，并在视野范围内另一处空间打开通道完成突袭、换位或回避。',
    slotHints: ['body'],
    poolOrigin: 'rare',
    raceLocks: ['人类'],
    genderLocks: ['female'],
    sixDimBonuses: { 敏捷: 2, 感知: 1, 意志: 1, 体质: 1 },
  }),
  buildSkillCard({
    id: 'sishen_zhilian_legendary',
    familyId: 'sishen_zhilian',
    name: '死神之镰',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '可直接召唤死神之镰的传说级双手词条。它不是装备，而是一把会随她意志显现的概念级死器，斩中的伤口会持续携带致死灾厄诅咒。',
    effectLines: [
      '可随时召出死神之镰，显著强化勾、带、钩回、断线与收割类动作，并把整套近战节奏压成真正的死神处刑。',
      '被镰斩开的伤口会附着致死灾厄诅咒，后续会持续向真正的死亡后果滑落，常规修补与治疗难以完整压净。',
      '可释放死气；一旦被目标吸入，灵能循环会迅速干涸、枯竭与失稳，使其更难维持屏障、恢复与反击。',
    ],
    aiSummary:
      '死神之镰是无等级成长的传说级双手词条，可召唤概念级死神之镰；镰伤附带致死灾厄诅咒，还可释放使目标灵能枯竭的死气。',
    slotHints: ['l_hand', 'r_hand', 'l_arm', 'r_arm'],
    poolOrigin: 'rare',
    raceLocks: ['人类'],
    genderLocks: ['female'],
    sixDimBonuses: { 力量: 2, 敏捷: 1, 感知: 1, 意志: 1 },
  }),
  buildSkillCard({
    id: 'sishen_zhichu_legendary',
    familyId: 'sishen_zhichu',
    name: '死神之触',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以双手直接抽离、储存并处决生命的传说级接触词条。她能将掠夺来的生命压入灵核储备，再以触碰、释放或远程引爆的方式重新发落出去。',
    effectLines: [
      '可通过接触、压制或近身命中直接抽出目标生命，并将其储存在灵核中作为随时可调用的死储。',
      '可将抽出的生命当场引爆，也可埋成延迟引爆，让目标在看似尚可行动时突然迎来生命塌缩。',
      '储存下来的生命也可被她远距离释放出去引爆，作为直接输出、补刀或处刑终结手段。',
    ],
    aiSummary: '死神之触是无等级成长的传说级双手词条，可抽离并储存目标生命，再进行即时引爆、延迟引爆或远距离释放引爆。',
    slotHints: ['l_hand', 'r_hand'],
    poolOrigin: 'rare',
    raceLocks: ['人类'],
    genderLocks: ['female'],
    sixDimBonuses: { 力量: 1, 感知: 1, 意志: 2, 体质: 1 },
  }),
  ...buildJiquVariantFamily({
    idPrefix: 'jiqu_genital',
    slotHints: ['genital'],
    routeLabel: '阴夹路线',
    shortLabel: '阴部夹制',
    tagLabel: '阴夹型',
    openingAction: '阴部夹制与贴压',
    sustainAction: '阴部夹制与磨压',
    controlAction: '夹得更紧、贴得更死',
    attackAction: '夹压、磨压与贴身顶压',
    finisherAction: '还在你的阴部夹制范围内',
  }),
  ...buildJiquVariantFamily({
    idPrefix: 'jiqu_hip',
    slotHints: ['hip'],
    routeLabel: '臀压路线',
    shortLabel: '臀胯压坐',
    tagLabel: '臀压型',
    openingAction: '臀胯压坐与磨压',
    sustainAction: '臀压、坐压与臀胯磨控',
    controlAction: '坐得更死、压得更深',
    attackAction: '坐压、臀击与持续压身',
    finisherAction: '还被你的臀胯压坐在身下',
  }),
  ...buildJiquVariantFamily({
    idPrefix: 'jiqu_arm',
    slotHints: ['l_arm', 'r_arm'],
    routeLabel: '臂锁路线',
    shortLabel: '双臂锁身',
    tagLabel: '锁身型',
    openingAction: '双臂锁住与抱死',
    sustainAction: '双臂锁身、抱锁与绞缠',
    controlAction: '锁得越死、绞得越久',
    attackAction: '抱锁、绞缠与勒压',
    finisherAction: '还被你的双臂锁在怀里',
  }),
  ...buildJiquVariantFamily({
    idPrefix: 'jiqu_hand',
    slotHints: ['l_hand', 'r_hand'],
    routeLabel: '手掐路线',
    shortLabel: '双手掐制',
    tagLabel: '掐制型',
    openingAction: '双手掐制、卡喉与按压',
    sustainAction: '双手掐制与按死关键部位',
    controlAction: '掐得越稳、按得越死',
    attackAction: '掐击、掌压与连续窒息控制',
    finisherAction: '还在你的双手掐制范围内',
  }),
  ...buildJiquVariantFamily({
    idPrefix: 'jiqu_leg',
    slotHints: ['l_leg', 'r_leg'],
    routeLabel: '腿夹路线',
    shortLabel: '双腿夹制',
    tagLabel: '夹制型',
    openingAction: '双腿夹住与绞压',
    sustainAction: '双腿夹制、盘锁与腿绞',
    controlAction: '夹得越死、绞得越久',
    attackAction: '腿绞、膝压与持续夹杀',
    finisherAction: '还被你的双腿夹在身前',
  }),
  ...buildJiquVariantFamily({
    idPrefix: 'jiqu_foot',
    slotHints: ['l_foot', 'r_foot'],
    routeLabel: '脚踩路线',
    shortLabel: '脚下踩制',
    tagLabel: '踩制型',
    openingAction: '踩住、踏住与碾压',
    sustainAction: '踩制、压踩与反复踏控',
    controlAction: '踩得越稳、压得越狠',
    attackAction: '踩踏、碾压与反复跺击',
    finisherAction: '还在你的脚下被踩着',
  }),
  ...buildFamily(
    {
      familyId: 'senjuan_gongzhen',
      name: '森眷共振',
      slotHints: ['body', 'l_leg', 'r_leg', 'l_foot', 'r_foot'],
      poolOrigin: 'species',
      raceLocks: ['月光精灵'],
    },
    level => ({
      description: `月光精灵与植被灵场的共振天赋，可在自然环境中显著提高回复、感知与耐久。`,
      effectLines: [
        `Lv${level}：在植被密集或自然环境中获得额外回复与稳定。`,
        level >= 4 ? '高阶时可把周边植被灵场转成围猎与恢复优势。' : '是月光精灵野外狩猎与长期追踪的重要底盘。',
      ],
      aiSummary: `森眷共振 Lv${level}，月光精灵专属，被自然场域放大时更强。`,
      sixDimBonuses: { 体质: Math.max(1, Math.ceil(level / 3)), 感知: Math.max(1, Math.ceil(level / 2)) },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'meimo_eye',
      name: '魅魔之眼',
      slotHints: ['eyes'],
      poolOrigin: 'species',
      raceLocks: ['魅魔'],
      breakUnlocks: [
        {
          label: '人类女性破锁',
          raceLocks: ['人类'],
          genderLocks: ['female'],
          note: '科研与频段注入导致的低概率觉醒。',
        },
      ],
    },
    level => ({
      description: `魅魔祖系灵弦，以特定灵能频段直击目标的欲望、羞耻与服从回路。`,
      effectLines: [
        `Lv${level}：强化直视压制、魅惑触发与羞耻放大。`,
        level >= 4 ? '高阶时极易与魅气、费洛蒙、声音诱导形成叠压。' : '常用于凝视催眠、降格定性与即时魅惑。',
      ],
      aiSummary: `魅魔之眼 Lv${level}，魅魔专属眼部灵弦；现代人类女性存在“人类女性破锁”觉醒路径。`,
      sixDimBonuses: { 魅力: Math.max(1, Math.ceil(level / 2)), 感知: level >= 4 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'lunxian_feiluomeng',
      name: '沦陷费洛蒙',
      slotHints: ['mouth', 'axilla', 'body'],
      poolOrigin: 'species',
      raceLocks: ['魅魔'],
    },
    level => ({
      description: `魅魔体液系灵弦，可将唾液、汗液与呼吸中的灵能信息素稳定外放，诱导沉迷、依附与条件化反应。`,
      effectLines: [
        `Lv${level}：提高费洛蒙附着、成瘾与回味残留。`,
        level >= 4 ? '高阶时能显著放大体液、气味与贴近场景的支配性。' : '多用于接近、诱导、条件反射塑造。',
      ],
      aiSummary: `沦陷费洛蒙 Lv${level}，魅魔专属，可把体液与气味转成高成瘾的信息素压制。`,
      sixDimBonuses: { 魅力: Math.max(1, Math.ceil(level / 2)) },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'meidu',
      name: '魅毒',
      slotHints: ['mouth', 'l_hand', 'r_hand', 'body'],
      poolOrigin: 'species',
      raceLocks: ['魅魔'],
    },
    level => ({
      description: `将魅魔灵能与毒性结构纠缠在一起的异化灵弦，可让接触者在发热、麻痹、判断迟缓与欲望滑坡之间失衡。`,
      effectLines: [
        `Lv${level}：提高魅毒渗入、迟滞残留与快感扰乱。`,
        level >= 4
          ? '高阶时可通过唇、指尖、轻伤口与少量体液快速种入，让目标在发热与麻痹间持续走低。'
          : '多用于贴身接触、唇部诱导、指尖划伤与延迟发作型控制。',
      ],
      aiSummary: `魅毒 Lv${level}，魅魔专属，可把毒性与魅惑捆成同一条侵入回路，让目标又热又迟钝、越拖越难摆脱。`,
      sixDimBonuses: { 魅力: Math.max(1, Math.ceil(level / 2)), 感知: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'rongying',
      name: '融影',
      slotHints: ['body', 'l_leg', 'r_leg', 'l_foot', 'r_foot'],
      poolOrigin: 'rare',
      raceLocks: ['魅魔'],
    },
    level => ({
      description: `将自身气息、轮廓与灵压压进周围阴影中的潜行灵弦，可借暗面收束存在感并沿连续影带贴近目标。`,
      effectLines: [
        `Lv${level}：提高贴影潜行、无声接近与从影缘显形的稳定性。`,
        level >= 4
          ? '高阶时可沿连续阴影快速换位、藏匿热感与灵压，但本质仍是借影潜行，不属于空间系瞬移。'
          : '多用于藏身、贴墙、埋伏与近身前的静默逼近。',
      ],
      aiSummary: `融影 Lv${level}，稀有魅魔系灵弦，可把身体与气息藏进阴影里完成潜行、换位与近身显形，但不等于空间穿越。`,
      sixDimBonuses: { 敏捷: Math.max(1, Math.ceil(level / 2)), 感知: level >= 3 ? 1 : 0 },
    }),
  ),
  buildSkillCard({
    id: 'meiqi_tongyu_legendary',
    familyId: 'meiqi_tongyu',
    name: '魅气统御',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以魅魔之王式统御为核心的脑部传说词条。施加者可像调兵一样调度魅气的压缩、外放、植入与回流，把快感失控者体内的魅气重新卷回自身。',
    effectLines: [
      '可将魅气高度压缩进肌肉、骨架与动作链，显著提高近战压迫、持续作战、肉体硬度与缠斗稳定性。',
      '已进入敌人体内的魅气不会只留在对方体内发作；施加者可在目标快感失控、服从崩塌或理智滑坡时，将这些魅气整股牵回体内，转化为自身的灵能与续航。',
      '它统御的不是死者、伤口或灵魂，而是“仍在发热、仍在发情、仍在失控”的活体快感通路。',
      '欢愉之触、魅气触手与近身侵蚀都只是魅气统御的展开表现，不是独立灵弦本体。',
    ],
    aiSummary:
      '魅气统御是无等级成长的传说级脑部词条，可统辖魅气的压缩、外放、植入与回流，让施加者从快感失控者体内回收魅气并持续作战。',
    slotHints: ['brain'],
    poolOrigin: 'rare',
    raceLocks: ['魅魔'],
    sixDimBonuses: { 意志: 2, 魅力: 1, 体质: 1, 力量: 1 },
  }),
  buildSkillCard({
    id: 'xuelang_liexi_legendary',
    familyId: 'xuelang_liexi',
    name: '血狼猎息',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以嗜血、血味记忆与长线追猎为核心的传说级嘴部词条。施加者可把饮血变成恢复与强化回路，并沿着尝过的血味持续追踪猎物。',
    effectLines: [
      '饮入目标鲜血后，可明显恢复体力、缓解衰竭，并短时强化肌肉爆发、撕咬欲与持续缠斗能力。',
      '只要尝过或牢牢记住某人的血味，就能在较长时间内沿着那股血气持续追踪对方，哪怕目标已经远离现场。',
      '它强化的是嗜血猎手式的追逼与续航，不会把施加者变成靠尸体、伤口或吸命吃饭的亡灵系存在。',
    ],
    aiSummary:
      '血狼猎息是无等级成长的传说级嘴部词条，可把饮血转成恢复与肉体强化，并沿尝过的血味持续追猎目标。',
    slotHints: ['mouth'],
    poolOrigin: 'rare',
    raceLocks: ['魅魔'],
    sixDimBonuses: { 体质: 1, 力量: 1, 感知: 1, 敏捷: 1 },
  }),
  buildSkillCard({
    id: 'yingdao_jiangshen_legendary',
    familyId: 'yingdao_jiangshen',
    name: '影祷降身',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以影子作为祈请接口与显形锚点的传说级词条。若有人对着自己的影子献出灵能并完成呼唤，施加者可选择是否回应，并从那道影子里降身现形。',
    effectLines: [
      '回应建立后，可借祈请者脚下或身边那道影子完成显形、落位与第一波近身压迫，把“委托”直接变成面对面的处理。',
      '她不必永远接受祈请。影祷更像一道可选择开启的门；若她不喜欢祈请者、价码或猎物，这道门也可能先把祈请者本人送进猎物位。',
      '影祷降身依赖阴影、暗面与灵能献祭的成立，不属于空间系穿门或无媒介瞬移。',
    ],
    aiSummary:
      '影祷降身是无等级成长的传说级影祷词条，可回应朝自身影子发起的祈请，并把那道影子当成显形锚点完成降身与近身处置。',
    slotHints: ['brain', 'body'],
    poolOrigin: 'rare',
    raceLocks: ['魅魔'],
    sixDimBonuses: { 感知: 2, 意志: 1, 魅力: 1 },
  }),
  buildSkillCard({
    id: 'huoti_zhaiqi_legendary',
    familyId: 'huoti_zhaiqi',
    name: '活体摘器',
    level: 5,
    displayLevelLabel: '灵核',
    description:
      '从魅魔祖系“脑睾改造”中提炼出来的灵核改造词条。施加者可隔空锁定目标体内器官，将其从原位完整剥离，并维持成与原主持续相连的空间切片。',
    effectLines: [
      '可在不直接开膛破腹的情况下隔空摘出眼球、心脏、睾丸、舌体或其他目标器官，并让切面保持与原主体内持续连通，继续接受供给与回响。',
      '它的恐怖不只在摘除本身，也在于摘下来的东西还能被拿来展示、审问、调换、刺激或继续改造，始终维持器官层面的真实反馈。',
      '这条词条属于魅魔独有的活体器官处理路线，不是通用念力搬运或普通外科手法。',
    ],
    aiSummary:
      '活体摘器是无等级成长的魅魔独有灵核词条，可隔空完整摘出目标器官，并将其维持为与原主连通的空间切片，用于处刑、展示与后续改造。',
    slotHints: ['brain', 'l_hand', 'r_hand'],
    poolOrigin: 'rare',
    raceLocks: ['魅魔'],
    mountType: 'core',
    sixDimBonuses: { 感知: 2, 意志: 1, 力量: 1 },
  }),
  buildSkillCard({
    id: 'xuerou_fengsuo_legendary',
    familyId: 'xuerou_fengsuo',
    name: '血肉丰缩',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以魅魔激素与血肉调制为核心的传说级身躯词条。施加者可远程刺激或压缩目标器官、腺体与局部血肉，让它们异常膨大或快速萎缩。',
    effectLines: [
      '可让特定器官、肌肉团、腺体或局部血肉在短时间内失控放大，制造沉重、胀痛、畸形或被迫承担额外快感负荷的结果。',
      '也可反向令目标部位迅速萎缩、塌陷或失去原有效能，让猎物在肉体羞耻、功能丧失与形态崩坏中一起掉下去。',
      '它走的是魅魔独有的激素与血肉调制路线，不等于普通治疗术、强化术或单纯的体型变化魔法。',
    ],
    aiSummary:
      '血肉丰缩是无等级成长的魅魔独有传说词条，可用魅魔激素远程放大或压缩器官与血肉，直接改写目标的体感、形态与功能。',
    slotHints: ['body', 'mouth', 'brain'],
    poolOrigin: 'rare',
    raceLocks: ['魅魔'],
    sixDimBonuses: { 体质: 2, 感知: 1, 魅力: 1 },
  }),
  ...buildFamily(
    {
      familyId: 'huowei_meiyan',
      name: '狐火媚言',
      slotHints: ['mouth', 'eyes'],
      poolOrigin: 'species',
      raceLocks: ['狐魅'],
    },
    level => ({
      description: `狐魅擅长的戏弄型灵弦，能把语言、笑意、尾音和眼神一起编成诱导钩子。`,
      effectLines: [
        `Lv${level}：更容易让目标误判态度、补全幻想、主动靠近。`,
        level >= 4 ? '高阶时可让对象在被玩弄时误以为自己占到便宜。' : '偏戏弄、勾引、话术与上钩结构。',
      ],
      aiSummary: `狐火媚言 Lv${level}，狐魅专属，偏向言语戏弄、情绪误导与让目标自投罗网。`,
      sixDimBonuses: { 魅力: Math.max(1, Math.ceil(level / 2)), 感知: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'weirong_mizong',
      name: '尾绒迷踪',
      slotHints: ['hip', 'l_leg', 'r_leg'],
      poolOrigin: 'species',
      raceLocks: ['狐魅'],
    },
    level => ({
      description: `利用尾部与下盘姿态制造错判、追逐与轻度迷失的狐魅系灵弦。`,
      effectLines: [
        `Lv${level}：强化追逐感、失焦感与“差一点抓到”的错觉。`,
        level >= 4 ? '高阶时可明显拉长目标的追逐与自我欺骗链。' : '偏姿态诱导与追逐玩弄。',
      ],
      aiSummary: `尾绒迷踪 Lv${level}，狐魅专属，擅长制造追逐错觉和不断差一步的诱导。`,
      sixDimBonuses: { 敏捷: Math.max(1, Math.ceil(level / 2)), 魅力: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'shihua_ningshi',
      name: '石化凝视',
      slotHints: ['eyes'],
      poolOrigin: 'species',
      raceLocks: ['戈尔贡'],
    },
    level => ({
      description: `戈尔贡核心灵弦，能让目标在直视与压迫中产生明显迟滞、僵硬与动作冻结倾向。`,
      effectLines: [
        `Lv${level}：提高直视冻结、迟滞与石化倾向。`,
        level >= 4 ? '高阶时对近距离对视与正面冲锋的压制尤其明显。' : '偏正面压制、迟滞与目光锁定。',
      ],
      aiSummary: `石化凝视 Lv${level}，戈尔贡专属，偏向目光锁定、迟滞和石化倾向。`,
      sixDimBonuses: { 感知: Math.max(1, Math.ceil(level / 2)), 意志: level >= 4 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'youchao_gehou',
      name: '诱潮歌喉',
      slotHints: ['mouth', 'chest'],
      poolOrigin: 'species',
      raceLocks: ['塞壬'],
    },
    level => ({
      description: `塞壬歌喉系灵弦，可把歌声、低语与呼吸频率编入潮汐式的精神诱导。`,
      effectLines: [
        `Lv${level}：提高歌声诱导、共鸣安抚与拉扯式魅惑。`,
        level >= 4 ? '高阶时极易让目标在明知危险时仍继续靠近。' : '偏远距诱导、声波钩引与心理拖拽。',
      ],
      aiSummary: `诱潮歌喉 Lv${level}，塞壬专属，以歌喉与声波共振进行远距诱导。`,
      sixDimBonuses: { 魅力: Math.max(1, Math.ceil(level / 2)), 感知: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'jingji_shengzhi',
      name: '荆棘寄生',
      slotHints: ['body', 'l_arm', 'r_arm'],
      poolOrigin: 'species',
      raceLocks: ['花妖'],
    },
    level => ({
      description: `花妖核心寄生灵弦，以荆棘、根系或藤蔓形态侵入并接管目标局部。`,
      effectLines: [
        `Lv${level}：提高寄生、缠缚与接管强度。`,
        level >= 4 ? '高阶时可把控制与营养抽取同步进行。' : '偏缠缚、吸养与局部侵占。',
      ],
      aiSummary: `荆棘寄生 Lv${level}，花妖专属，适合缠缚、接管与吸养。`,
      sixDimBonuses: { 体质: Math.max(1, Math.ceil(level / 3)), 感知: Math.max(1, Math.ceil(level / 2)) },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'baofen_shouyi',
      name: '孢粉授意',
      slotHints: ['mouth', 'axilla', 'body'],
      poolOrigin: 'species',
      raceLocks: ['花妖'],
    },
    level => ({
      description: `释放高黏附孢粉并在目标体内留下受意图驱动的萌发线索。`,
      effectLines: [
        `Lv${level}：提高孢粉附着、潜伏与后续触发性。`,
        level >= 4 ? '高阶时可与气味、魅气或荆棘寄生形成复合诱导。' : '偏潜伏、气味与延时诱导。',
      ],
      aiSummary: `孢粉授意 Lv${level}，花妖专属，擅长潜伏、附着与延迟触发。`,
      sixDimBonuses: { 感知: Math.max(1, Math.ceil(level / 2)), 魅力: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'suanshi_zhenezhen',
      name: '酸蚀颚针',
      slotHints: ['mouth', 'l_hand', 'r_hand'],
      poolOrigin: 'species',
      raceLocks: ['蚁女'],
    },
    level => ({
      description: `将颚、针与酸蚀灵压结合，用于快速穿孔、破甲或持续腐蚀。`,
      effectLines: [
        `Lv${level}：提高穿刺与持续腐蚀能力。`,
        level >= 4 ? '高阶时可把小伤口扩成极难处理的腐蚀灼口。' : '偏战斗破坏与持续侵蚀。',
      ],
      aiSummary: `酸蚀颚针 Lv${level}，蚁女专属，适合破甲、穿刺和持续腐蚀。`,
      sixDimBonuses: { 力量: level >= 3 ? 1 : 0, 敏捷: Math.max(1, Math.ceil(level / 2)) },
    }),
  ),
  buildSkillCard({
    id: 'sansuo_jinyu_legendary',
    familyId: 'sansuo_jinyu',
    name: '三锁禁域',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以根锁、腹锁、喉锁扩展成全身封闭场域的传说级词条。施加者周身会形成一片会回卷灵能的近身禁域，一旦靠近，目标的灵能外放、运转与调用都会被锁回体内。',
    effectLines: [
      '进入身体半径后，可明显压低灵能外放效率，让蓄力、术式展开与灵弦调用变得粘滞、迟缓、失衡。',
      '它真正擅长的是把灵能锁回敌人体内，使其越贴身越像背着一座过压反应炉行动。',
      '姿态、贴压、地形闭合与身体接触都会放大这片禁域，所以它尤其适合狭道、锁姿与近身统治。',
    ],
    aiSummary:
      '三锁禁域是无等级成长的传说级禁域词条，可在身体半径内锁回他人灵能，显著压低外放效率与近身反抗能力。',
    slotHints: ['brain', 'body'],
    poolOrigin: 'rare',
    raceLocks: ['蚁女'],
    sixDimBonuses: { 意志: 2, 感知: 1, 体质: 1 },
  }),
  buildSkillCard({
    id: 'jingchi_yizhi_legendary',
    familyId: 'jingchi_yizhi',
    name: '静持易质',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以静持、核心闭锁与全身姿态控制改写自身质量的传说级身躯词条。施加者可在灵能支撑下提高或削减自身质量，并把质量变化直接转成重压、速度与释能差。',
    effectLines: [
      '增质时可显著抬高重压、压坐稳定性与贴身处刑强度，让下盘与核心像一整块正在下沉的活体重锤。',
      '减质时会释放出大量动能、热压与灵能余量，可瞬间灌进突进、换位与爆发加速。',
      '更高阶的危险在于质量耗散存在永久代价，所以施加者通常把高阈值释能留给决定战局的瞬间。',
    ],
    aiSummary:
      '静持易质是无等级成长的传说级身躯词条，可通过静持改写自身质量，在重压统治与爆发位移之间切换。',
    slotHints: ['body', 'hip', 'l_leg', 'r_leg'],
    poolOrigin: 'rare',
    raceLocks: ['蚁女'],
    sixDimBonuses: { 体质: 2, 力量: 1, 敏捷: 1 },
  }),
  buildSkillCard({
    id: 'rouliu_chijie_legendary',
    familyId: 'rouliu_chijie',
    name: '柔流迟界',
    level: 5,
    displayLevelLabel: '传说',
    description:
      '以柔韧圆弧、导力与流变控制为核心的传说级场域词条。施加者可把接近自身的动能与灵能拖入一层柔性迟界，同时在贴身时改写敌人体内灵能的流向。',
    effectLines: [
      '远程攻击越快、越重、灵压越强，越容易在迟界里被拖慢、偏折或提前耗散，使中远距离命中率大幅下滑。',
      '一旦进入贴身范围，可继续引导对手体内灵能的回路与发力线路，让敌人的劲、气与重心自己朝错误位置流过去。',
      '它会天然把战局朝近战收束，而近战正是施加者最擅长把姿态、体重与禁域合成一体的半径。',
    ],
    aiSummary:
      '柔流迟界是无等级成长的传说级场域词条，可迟滞接近自身的高能攻击，并在贴身时导偏敌人体内灵能与发力线路。',
    slotHints: ['body', 'l_hand', 'r_hand', 'l_leg', 'r_leg'],
    poolOrigin: 'rare',
    raceLocks: ['蚁女'],
    sixDimBonuses: { 感知: 2, 敏捷: 1, 意志: 1 },
  }),
  ...buildFamily(
    {
      familyId: 'jianwang_qiansi',
      name: '茧网牵丝',
      slotHints: ['l_hand', 'r_hand', 'body', 'l_leg', 'r_leg'],
      poolOrigin: 'species',
      raceLocks: ['蜘蛛新娘'],
    },
    level => ({
      description: `蜘蛛新娘专属牵丝灵弦，可在行动、接触与环境中布置极细而强韧的灵丝。`,
      effectLines: [
        `Lv${level}：提高布网、牵制与路径封锁能力。`,
        level >= 4 ? '高阶时可在无声状态下完成多点缠束与吊悬。' : '偏布置、限制行动与环境接管。',
      ],
      aiSummary: `茧网牵丝 Lv${level}，蜘蛛新娘专属，擅长布丝、封路与无声缠束。`,
      sixDimBonuses: { 敏捷: Math.max(1, Math.ceil(level / 2)), 感知: level >= 3 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'dufang_huilu',
      name: '毒纺回路',
      slotHints: ['l_hand', 'r_hand'],
      poolOrigin: 'species',
      raceLocks: ['蜘蛛新娘'],
    },
    level => ({
      description: `在灵丝、尖刺与体液中纺入神经毒与迟缓素，令目标在不知不觉间变慢、变软、变迟。`,
      effectLines: [
        `Lv${level}：提高毒性纺入与迟缓效果。`,
        level >= 4 ? '高阶时可让目标在被束缚前就先丢掉节奏。' : '偏慢性压制、织网配毒与节奏剥夺。',
      ],
      aiSummary: `毒纺回路 Lv${level}，蜘蛛新娘专属，适合给灵丝与接触物纺入神经毒。`,
      sixDimBonuses: { 感知: Math.max(1, Math.ceil(level / 2)), 意志: level >= 4 ? 1 : 0 },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'ronghe_shentou',
      name: '溶核渗透',
      slotHints: ['body', 'hip', 'l_hand', 'r_hand'],
      poolOrigin: 'species',
      raceLocks: ['史莱姆'],
    },
    level => ({
      description: `史莱姆系渗透灵弦，可让自身灵质更快渗入缝隙、器官或结构死角。`,
      effectLines: [
        `Lv${level}：提高渗透、包覆与内部侵入能力。`,
        level >= 4 ? '高阶时可把细微裂口扩成整个结构的崩坏起点。' : '偏渗透、包覆与结构入侵。',
      ],
      aiSummary: `溶核渗透 Lv${level}，史莱姆专属，擅长液态渗透、包覆与内部侵入。`,
      sixDimBonuses: { 体质: Math.max(1, Math.ceil(level / 2)) },
    }),
  ),
  ...buildFamily(
    {
      familyId: 'ningjiao_zaigou',
      name: '凝胶再构',
      slotHints: ['body', 'l_leg', 'r_leg'],
      poolOrigin: 'species',
      raceLocks: ['史莱姆'],
    },
    level => ({
      description: `让史莱姆躯体在受损、散开或被切割后快速重组，并把周边物质重新纳入自身结构。`,
      effectLines: [
        `Lv${level}：提高再构速度与形态保持。`,
        level >= 4 ? '高阶时可在受创后迅速重塑轮廓并修补外壳。' : '偏自愈、再塑与形态修整。',
      ],
      aiSummary: `凝胶再构 Lv${level}，史莱姆专属，适合再构、自愈与形态修补。`,
      sixDimBonuses: { 体质: Math.max(1, Math.ceil(level / 2)), 敏捷: level >= 3 ? 1 : 0 },
    }),
  ),
];

export const SPIRIT_SKILL_LIBRARY: Skill[] = [...commonFamilies, ...speciesFamilies];

export const getSpiritSkillLibrary = (): Skill[] => SPIRIT_SKILL_LIBRARY.map(cloneSkill);

export const resolveSpiritSkillAccess = (skill: Skill, race: string, gender: 'male' | 'female'): SkillAccessResult => {
  const sourceLabel = formatPrimaryLabel(skill);
  if (matchAccess(skill.raceLocks, skill.genderLocks, race, gender)) {
    return { available: true, breakUnlocked: false, sourceLabel, accessLabel: sourceLabel };
  }
  const rule = (skill.breakUnlocks || []).find(entry => matchAccess(entry.raceLocks, entry.genderLocks, race, gender));
  if (rule) {
    return {
      available: true,
      breakUnlocked: true,
      sourceLabel,
      accessLabel: rule.label,
      note: rule.note,
    };
  }
  return {
    available: false,
    breakUnlocked: false,
    sourceLabel,
    accessLabel: sourceLabel,
    note: (skill.breakUnlocks || []).length
      ? `存在破锁路径：${(skill.breakUnlocks || []).map(entry => entry.label).join(' / ')}`
      : undefined,
  };
};

export const isSpiritSkillAvailable = (skill: Skill, race: string, gender: 'male' | 'female') =>
  resolveSpiritSkillAccess(skill, race, gender).available;

export const findSpiritSkillCard = (skillOrName: Skill | string, level?: number, slotKey?: string): Skill | null => {
  const sourceSkill = typeof skillOrName === 'string' ? null : skillOrName;
  const normalized = normalizeName(typeof skillOrName === 'string' ? skillOrName : skillOrName.name);
  const expectedLevel =
    typeof level === 'number'
      ? level
      : sourceSkill && Number.isFinite(sourceSkill.level)
        ? sourceSkill.level
        : undefined;
  const familyId = `${sourceSkill?.familyId || ''}`.trim();
  const byFamily = familyId
    ? SPIRIT_SKILL_LIBRARY.filter(
        skill => skill.familyId === familyId && (expectedLevel === undefined || skill.level === expectedLevel),
      )
    : [];
  const candidates =
    byFamily.length > 0
      ? byFamily
      : SPIRIT_SKILL_LIBRARY.filter(
          skill =>
            normalizeName(skill.name) === normalized && (expectedLevel === undefined || skill.level === expectedLevel),
        );
  if (candidates.length === 0) return null;
  if (slotKey) {
    const matched = candidates.find(skill => (skill.slotHints || []).includes(slotKey));
    if (matched) return cloneSkill(matched);
  }
  return cloneSkill(candidates[0]);
};

export const enrichMountedSkillFromLibrary = (skill: Skill, slotKey?: string): Skill => {
  const card = findSpiritSkillCard(skill, Number.isFinite(skill.level) ? skill.level : undefined, slotKey);
  if (!card) return { ...skill };
  return {
    ...card,
    ...skill,
    name: skill.name || card.name,
    level: Number.isFinite(skill.level) ? skill.level : card.level,
    description: `${skill.description || ''}`.trim() || card.description,
    effectLines: (skill.effectLines && skill.effectLines.length ? skill.effectLines : card.effectLines) || [],
    aiSummary: `${skill.aiSummary || ''}`.trim() || card.aiSummary,
    slotHints: skill.slotHints && skill.slotHints.length ? skill.slotHints : card.slotHints,
    familyId: skill.familyId || card.familyId,
    poolOrigin: skill.poolOrigin || card.poolOrigin,
    npcPool: skill.npcPool || card.npcPool,
    minNpcRank: skill.minNpcRank || card.minNpcRank,
    raceLocks: skill.raceLocks || card.raceLocks,
    genderLocks: skill.genderLocks || card.genderLocks,
    breakUnlocks: skill.breakUnlocks || card.breakUnlocks,
  };
};

export const canonicalizeSpiritSkillCard = (skill: Skill, slotKey?: string): Skill | null => {
  const normalized = normalizeLegacySpiritSkillCard({ ...skill });
  if (!normalized) return null;
  if (normalized.isCustom) {
    return {
      ...normalized,
      slotHints:
        normalized.slotHints && normalized.slotHints.length
          ? [...normalized.slotHints]
          : slotKey
            ? [slotKey]
            : undefined,
    };
  }

  const expectedLevel = Number.isFinite(normalized.level) ? normalized.level : undefined;
  const card = findSpiritSkillCard(normalized, expectedLevel, slotKey);
  if (!card) return cloneSkill(normalized);

  return {
    ...normalized,
    name: card.name,
    level: `${card.displayLevelLabel || ''}`.trim() === '无级' ? card.level : expectedLevel ?? card.level,
    displayLevelLabel: card.displayLevelLabel,
    description: card.description,
    effectLines: card.effectLines ? [...card.effectLines] : undefined,
    aiSummary: card.aiSummary,
    familyId: card.familyId,
    slotHints: card.slotHints ? [...card.slotHints] : undefined,
    poolOrigin: card.poolOrigin,
    npcPool: card.npcPool,
    minNpcRank: card.minNpcRank,
    raceLocks: card.raceLocks ? [...card.raceLocks] : undefined,
    genderLocks: card.genderLocks ? [...card.genderLocks] : undefined,
    breakUnlocks: card.breakUnlocks
      ? card.breakUnlocks.map(rule => ({
          ...rule,
          raceLocks: rule.raceLocks ? [...rule.raceLocks] : undefined,
          genderLocks: rule.genderLocks ? [...rule.genderLocks] : undefined,
        }))
      : undefined,
    sixDimBonuses: card.sixDimBonuses ? { ...card.sixDimBonuses } : undefined,
    rankColor: card.rankColor,
  };
};

export const createPartSkillPools = (parts: LingshuPart[]): Record<string, Skill[]> => {
  const library = getSpiritSkillLibrary();
  return Object.fromEntries(
    parts.map(part => {
      const key = part.key || '';
      const pool = library
        .filter(
          skill =>
            skill.mountType !== 'core' &&
            (!skill.slotHints || skill.slotHints.length === 0 || skill.slotHints.includes(key)),
        )
        .map(cloneSkill);
      return [part.id, pool];
    }),
  );
};

export const createCoreSkillPool = (): Skill[] =>
  getSpiritSkillLibrary()
    .filter(skill => skill.mountType === 'core')
    .map(cloneSkill);

export const buildSpiritSkillAccessLabel = (skill: Skill, race: string, gender: 'male' | 'female') => {
  const access = resolveSpiritSkillAccess(skill, race, gender);
  if (access.breakUnlocked) return `${access.accessLabel} · 原始来源：${access.sourceLabel}`;
  return access.accessLabel;
};
