import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CyberPanel from './components/ui/CyberPanel';
import PlayerStatePanel from './components/left/PlayerStatePanel';
import ChipPanel from './components/left/ChipPanel';
import SpiritNexus from './components/right/SpiritNexus';
import NPCProfile from './components/right/NPCProfile';
import ContactList from './components/right/ContactList';
import NarrativeFeed from './components/center/NarrativeFeed';
import ItemDetailView from './components/ui/ItemDetailView';
import InventoryModal from './components/ui/InventoryModal';
import PlayerSpiritCoreModal from './components/ui/PlayerSpiritCoreModal';
import CareerLineEditorModal from './components/ui/CareerLineEditorModal';
import ActionMenu from './components/center/ActionMenu';
import StartScreen from './components/flow/StartScreen';
import SplashScreen from './components/flow/SplashScreen';
import GameSetup from './components/flow/GameSetup';
import { Message, NPC, Item, GameConfig, PlayerStats, Chip, PlayerFaction, Rank, Skill, PlayerCivilianStatus, BetaTask, CareerTrack, WorldNodeMapData, MapRuntimeData, LingshuPart, RuntimeAffix, BodyPart } from './types';
import { buildPseudoLayer, hasPseudoLayer, parsePseudoLayer, replaceMaintext } from './utils/pseudoLayer';
import {
  MOCK_MESSAGES,
  MOCK_CHIPS,
  MOCK_INVENTORY,
  MOCK_NPCS,
  MOCK_PLAYER_STATS,
  MOCK_PLAYER_STATUS,
  MOCK_PLAYER_FACTION,
  MOCK_STORAGE_CHIPS,
  RANK_CONFIG,
} from './constants';
import { mergeWorldNodeMap, normalizeWorldNodeMap, tryParseMapFromText, tryParseMapPatchFromText } from './utils/mapData';
import { createEmptyWorldMap, isWorldMapEmpty, loadDefaultQilingMap } from './utils/mapLoader';
import { Users, Map as MapIcon, Send, Square, Package, X, Menu, Maximize, Minimize, ChevronLeft, ChevronRight, Settings, Save, Trash2, FolderOpen } from 'lucide-react';

type GameStage = 'start' | 'splash' | 'setup' | 'game';
const LN_ARCHIVES_KEY = 'ln_archives_v1';
const LN_LAST_ARCHIVE_ID_KEY = 'ln_last_archive_id_v1';
const LN_API_CONFIG_KEY = 'ln_api_config_v1';
const LN_AUTO_ARCHIVE_ID = 'archive_auto_latest_v1';
const MAX_ARCHIVE_SLOTS = 20;

const getBetaTierTitle = (level: number) => {
  if (level >= 5) return '秩序代行体';
  if (level === 4) return '监管协从体';
  if (level === 3) return '执行劳服体';
  if (level === 2) return '陈列顺从体';
  return '清除候验体';
};

interface BetaTaskTemplate {
  title: string;
  detail: string;
  scoreReward: number;
  creditReward: number;
}

interface BetaProfession {
  id: string;
  name: string;
  description: string;
  minLevel: number;
  maxLevel: number;
  taskTemplates: BetaTaskTemplate[];
}

const BETA_PROFESSIONS: BetaProfession[] = [
  {
    id: 'clearance_test',
    name: '清除候验员',
    description: '执行高风险底层勤务，接受严格行为评估。',
    minLevel: 1,
    maxLevel: 1,
    taskTemplates: [
      { title: '夜间危险区清扫', detail: '完成一轮危险区清扫并上传轨迹。', scoreReward: 8, creditReward: 420 },
      { title: '违规物回收', detail: '按清单回收违规物资并登记封存。', scoreReward: 9, creditReward: 460 },
    ],
  },
  {
    id: 'display_order',
    name: '秩序陈列员',
    description: '负责公共秩序示范岗位，维持区域规范表现。',
    minLevel: 2,
    maxLevel: 2,
    taskTemplates: [
      { title: '秩序示范巡站', detail: '在指定站点完成示范巡站并打卡。', scoreReward: 10, creditReward: 520 },
      { title: '公共引导勤务', detail: '协助完成人流引导与秩序维持。', scoreReward: 11, creditReward: 560 },
    ],
  },
  {
    id: 'labor_exec',
    name: '执行劳服员',
    description: '承担标准化劳动任务，完成配额与效率考核。',
    minLevel: 3,
    maxLevel: 3,
    taskTemplates: [
      { title: '配额搬运工单', detail: '完成当日货运配额，不得延误。', scoreReward: 12, creditReward: 620 },
      { title: '物资分拣流程', detail: '完成指定物资分拣与封签流程。', scoreReward: 12, creditReward: 600 },
    ],
  },
  {
    id: 'oversight_aide',
    name: '监管协从官',
    description: '辅助维护区域管理秩序，执行监督与报告任务。',
    minLevel: 4,
    maxLevel: 4,
    taskTemplates: [
      { title: '区域监管巡检', detail: '完成一次区域监管巡检并提交异常报告。', scoreReward: 14, creditReward: 720 },
      { title: '税务窗口协从', detail: '协助税务窗口完成票据核验与归档。', scoreReward: 13, creditReward: 680 },
    ],
  },
  {
    id: 'order_proxy',
    name: '秩序代行官',
    description: '执行高等级指令，负责跨模块协调与审查。',
    minLevel: 5,
    maxLevel: 5,
    taskTemplates: [
      { title: '跨区秩序审查', detail: '完成跨区秩序审查并提交总览报告。', scoreReward: 16, creditReward: 860 },
      { title: '高压规则执行', detail: '执行高压规则整顿并记录处理结果。', scoreReward: 15, creditReward: 820 },
    ],
  },
];

const DEFAULT_CAREER_TRACKS: CareerTrack[] = [
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

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface LnSaveData {
  version: 1;
  messages: Message[];
  playerStats: PlayerStats;
  playerGender: 'male' | 'female';
  playerSkills: Skill[];
  npcs: NPC[];
  contactGroups: string[];
  playerChips: Chip[];
  storageChips: Chip[];
  playerInventory: Item[];
  playerLingshu: GameConfig['selectedLingshu'];
  playerFaction: PlayerFaction;
  leftModuleTab: 'chips' | 'lingshu' | 'inventory';
  playerNeuralProtocol: 'none' | 'beta';
  careerTracks: CareerTrack[];
  betaStatus: PlayerCivilianStatus;
  betaTasks: BetaTask[];
  acceptedBetaTaskIds: string[];
  claimableBetaTaskIds: string[];
  taskDeadlines: Record<string, number>;
  pendingUpgradeEvaluation: boolean;
  selectedBetaProfessionId: string | null;
  focusedLayerId: string | null;
  worldNodeMap?: WorldNodeMapData;
  mapRuntime?: MapRuntimeData;
  playerSoulLedger?: Partial<Record<Rank, number>>;
  coinVault?: Partial<Record<Rank, number>>;
  playerCoreAffixes?: RuntimeAffix[];
  stateLock?: StateLockConfig;
}

interface ArchiveSlot {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  data: LnSaveData;
}

interface LnApiConfig {
  enabled: boolean;
  useTavernApi: boolean;
  endpoint: string;
  apiKey: string;
  model: string;
}

interface StateLockConfig {
  lockTime: boolean;
  lockLocation: boolean;
  lockIdentity: boolean;
  lockedElapsedMinutes?: number;
  lockedLocation?: string;
  lockedIdentity?: string;
}

interface TaxOfficerCandidate {
  id: string;
  name: string;
  affiliation: string;
  location: string;
  group: string;
}

interface AirelaTaxDistrict {
  id: string;
  name: string;
  officeAddress: string;
  officerName: string;
  officerAffiliation: string;
}

const AIRELA_TAX_DISTRICTS: AirelaTaxDistrict[] = [
  {
    id: 'north_gate',
    name: '艾瑞拉·北门分区',
    officeAddress: '艾瑞拉·北门分区税务局',
    officerName: '夜莺税务官·岚绯',
    officerAffiliation: '夜莺驻艾瑞拉税务署',
  },
  {
    id: 'central_ring',
    name: '艾瑞拉·中环分区',
    officeAddress: '艾瑞拉·中环税务局',
    officerName: '夜莺税务官·绫织',
    officerAffiliation: '夜莺驻艾瑞拉税务署',
  },
  {
    id: 'south_dock',
    name: '艾瑞拉·南港分区',
    officeAddress: '艾瑞拉·南港税务局',
    officerName: '夜莺税务官·璃棠',
    officerAffiliation: '夜莺驻艾瑞拉税务署',
  },
];

const hashText = (text: string): number => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const pickAirelaTaxDistrict = (citizenId: string): AirelaTaxDistrict => {
  const list = AIRELA_TAX_DISTRICTS;
  if (list.length === 0) {
    return {
      id: 'fallback',
      name: '艾瑞拉·临时分区',
      officeAddress: '艾瑞拉·临时税务局',
      officerName: '夜莺税务官·临时代理',
      officerAffiliation: '夜莺驻艾瑞拉税务署',
    };
  }
  const index = hashText(citizenId || 'NO_ID') % list.length;
  return list[index];
};

const ensurePseudoLayerOnLoad = (
  loadedMessages: Message[],
  context: {
    location: string;
    credits: number;
    reputation: number;
    elapsedMinutes: number;
  },
): Message[] => {
  if (!Array.isArray(loadedMessages) || loadedMessages.length === 0) return loadedMessages || [];
  const hasAnyPseudo = loadedMessages.some(msg => msg.sender === 'System' && hasPseudoLayer(msg.content || ''));
  if (hasAnyPseudo) return loadedMessages;

  const latestPlayer = [...loadedMessages].reverse().find(msg => msg.sender === 'Player');
  const latestSystem = [...loadedMessages].reverse().find(msg => msg.sender === 'System' && typeof msg.content === 'string');
  const gameTime = formatGameTime(context.elapsedMinutes || 0);
  const dayPhase = getDayPhase(context.elapsedMinutes || 0);
  const sceneHint = getSceneHintByPhase(dayPhase);
  let pseudoContent = buildPseudoLayer({
    playerInput: latestPlayer?.content || '继续推进当前局势',
    location: context.location || '未知区域',
    credits: Number.isFinite(context.credits) ? context.credits : 0,
    reputation: Number.isFinite(context.reputation) ? context.reputation : 60,
    gameTime,
    dayPhase,
    sceneHint,
  });

  if (latestSystem?.content) {
    const cleaned = sanitizeAiMaintext(latestSystem.content) || latestSystem.content;
    pseudoContent = replaceMaintext(pseudoContent, cleaned);
  }

  const pseudoMsg: Message = {
    id: `layer_bootstrap_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    sender: 'System',
    content: pseudoContent,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    type: 'narrative',
  };
  return [...loadedMessages, pseudoMsg];
};

const rankToLevel = (rank: Rank) => {
  const value = parseInt(rank.replace('Lv.', ''), 10);
  return Number.isFinite(value) ? Math.min(5, Math.max(1, value)) : 1;
};

const levelToRank = (level: number): Rank => {
  const lv = Math.min(5, Math.max(1, Math.floor(level)));
  if (lv === 1) return Rank.Lv1;
  if (lv === 2) return Rank.Lv2;
  if (lv === 3) return Rank.Lv3;
  if (lv === 4) return Rank.Lv4;
  return Rank.Lv5;
};

const LINGSHU_BODY_PART_TEMPLATE: Array<{ key: string; name: string; level: number; description: string; aliases?: string[] }> = [
  { key: 'brain', name: '大脑', level: 3, description: '认知中枢与灵能感知核心。', aliases: ['core'] },
  { key: 'eyes', name: '双眼', level: 3, description: '视觉神经与深度数据处理单元。' },
  { key: 'face', name: '面部', level: 2, description: '感官伪装与表情模组接口。' },
  { key: 'mouth', name: '嘴部', level: 2, description: '语音输出与能量摄入端口。' },
  { key: 'body', name: '身躯', level: 2, description: '生命维持系统主躯干。' },
  { key: 'chest', name: '胸部', level: 2, description: '循环增强与导压模块区域。' },
  { key: 'genital', name: '阴部', level: 3, description: '高敏回路与外泄控制节点。', aliases: ['groin'] },
  { key: 'hip', name: '臀部', level: 3, description: '核心承压与外泄缓冲区域。' },
  { key: 'l_arm', name: '左臂', level: 2, description: '精密操控与传导辅助部位。', aliases: ['larm', 'left_arm'] },
  { key: 'r_arm', name: '右臂', level: 3, description: '战术强化与武装挂载部位。', aliases: ['rarm', 'right_arm'] },
  { key: 'l_hand', name: '左手', level: 2, description: '细粒度控制与接触感知。', aliases: ['lhand', 'left_hand'] },
  { key: 'r_hand', name: '右手', level: 2, description: '输出稳定与抓握强化。', aliases: ['rhand', 'right_hand'] },
  { key: 'l_leg', name: '左腿', level: 2, description: '位移稳定与压力承载。', aliases: ['lleg', 'left_leg'] },
  { key: 'r_leg', name: '右腿', level: 2, description: '速度与爆发动作支撑。', aliases: ['rleg', 'right_leg'] },
  { key: 'l_foot', name: '左脚', level: 1, description: '静音移动与姿态修正。', aliases: ['lfoot', 'left_foot'] },
  { key: 'r_foot', name: '右脚', level: 1, description: '平衡与反冲缓解。', aliases: ['rfoot', 'right_foot'] },
  { key: 'axilla', name: '腋下', level: 4, description: '敏感散热与腺体控制区域。' },
];

const nextRank = (rank: Rank): Rank | null => {
  if (rank === Rank.Lv1) return Rank.Lv2;
  if (rank === Rank.Lv2) return Rank.Lv3;
  if (rank === Rank.Lv3) return Rank.Lv4;
  if (rank === Rank.Lv4) return Rank.Lv5;
  return null;
};

const MALE_MAX_MP_BY_RANK: Record<Rank, number> = {
  [Rank.Lv1]: 200,
  [Rank.Lv2]: 700,
  [Rank.Lv3]: 2000,
  [Rank.Lv4]: 6000,
  [Rank.Lv5]: 18000,
};

const getMaxMpByGenderAndRank = (gender: 'male' | 'female', rank: Rank): number => {
  const maleBase = MALE_MAX_MP_BY_RANK[rank] || MALE_MAX_MP_BY_RANK[Rank.Lv1];
  return gender === 'female' ? maleBase * 3 : maleBase;
};

const getExchangeRegionFactor = (location: string, gender: 'male' | 'female'): number | null => {
  const text = (location || '').toLowerCase();
  if (text.includes('圣教')) return null;
  if (text.includes('诺丝')) return 0.45;
  if (text.includes('汐屿')) return 0.55;
  if (text.includes('淬灵') || text.includes('艾瑞拉')) {
    return gender === 'female' ? 1.0 : 0.55;
  }
  return 1.0;
};

const GAME_CLOCK_BASE = new Date('2077-11-03T20:30:00');

const formatGameTime = (elapsedMinutes: number): string => {
  const d = new Date(GAME_CLOCK_BASE.getTime() + elapsedMinutes * 60_000);
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  const hh = `${d.getHours()}`.padStart(2, '0');
  const mm = `${d.getMinutes()}`.padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const getDayPhase = (elapsedMinutes: number): '深夜' | '夜晚' | '清晨' | '白天' | '黄昏' => {
  const d = new Date(GAME_CLOCK_BASE.getTime() + elapsedMinutes * 60_000);
  const h = d.getHours();
  if (h >= 0 && h < 4) return '深夜';
  if (h >= 4 && h < 7) return '清晨';
  if (h >= 7 && h < 18) return '白天';
  if (h >= 18 && h < 21) return '黄昏';
  return '夜晚';
};

const getSceneHintByPhase = (phase: string): string => {
  if (phase === '深夜') return '街区人流极低，巡逻密度上升，隐蔽行动更有利。';
  if (phase === '夜晚') return '霓虹活跃，地下交易频繁，社交与黑市事件更常见。';
  if (phase === '清晨') return '秩序逐步恢复，清扫与通勤队伍开始出现。';
  if (phase === '黄昏') return '换班时段，警戒存在短时空隙。';
  return '公共区开放，常规交易与任务发放活跃。';
};

const OUT_OF_WORLD_TERMS = ['荒坂', '夜之城', 'NCPD', '赛博朋克', '荒坂塔', '军用义体公司'];
const LOCAL_LOCATION_POOL = [
  '艾瑞拉中环',
  '艾瑞拉旧港',
  '艾瑞拉北门',
  '淬灵区内环',
  '汐屿区灰堤',
  '诺丝工业带',
  '圣教区边境站',
];

const hashTextToIndex = (text: string, mod: number) => {
  if (mod <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return hash % mod;
};

const softNormalizeOutOfWorldText = (text: string, fallbackLocation: string) => {
  if (!text) return '';
  const hit = OUT_OF_WORLD_TERMS.some(term => text.includes(term));
  if (!hit) return text;
  const safeLocation =
    fallbackLocation && fallbackLocation.trim()
      ? fallbackLocation.trim()
      : LOCAL_LOCATION_POOL[hashTextToIndex(text, LOCAL_LOCATION_POOL.length)] || '艾瑞拉中环';
  let next = text;
  OUT_OF_WORLD_TERMS.forEach(term => {
    next = next.split(term).join(safeLocation);
  });
  return next;
};

const estimateActionMinutes = (text: string): number => {
  if (/(战斗|击杀|斩杀|处决|追击|逃跑)/i.test(text)) return 25;
  if (/(移动|前往|赶往|导航|巡逻|探索)/i.test(text)) return 15;
  if (/(调查|搜索|侦查|研究|解析)/i.test(text)) return 20;
  if (/(交涉|谈判|聊天|说服|魅惑)/i.test(text)) return 10;
  if (/(休整|恢复|冥想|治疗)/i.test(text)) return 30;
  return 8;
};

const DEFAULT_SIX_DIM = {
  力量: 8,
  敏捷: 8,
  体质: 8,
  感知: 8,
  意志: 8,
  魅力: 8,
  freePoints: 0,
  cap: 99,
};
const DEFAULT_LINGSHU_EQUIP_SLOTS = 8;

const ensurePlayerStatsSixDim = (stats: PlayerStats): PlayerStats => ({
  ...stats,
  sixDim: {
    ...DEFAULT_SIX_DIM,
    ...(stats as any).sixDim,
  },
});

const sanitizeAiMaintext = (raw: string): string => {
  if (!raw) return '';
  return raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
};

const isLingshuEquipableItem = (item: Item): boolean => {
  if (!item || item.quantity <= 0) return false;
  if (item.category === 'equipment') return true;
  const text = `${item.name || ''} ${item.description || ''}`.toLowerCase();
  if (/\[(?:灵枢可装配|可装配|equipable|lingshu_equip)\]/i.test(text)) return true;
  if (/(纹身|手套|护具|衣|饰品|挂件|玩具|武器|模块|插件|tattoo|glove|armor|gear|wearable|implant|toy|weapon)/i.test(text)) {
    return true;
  }
  return false;
};

const normalizeNpcForUi = (npc: NPC): NPC => {
  const fallbackBoard = MOCK_CHIPS.find(chip => chip.type === 'board');
  const fallbackNormals = MOCK_CHIPS.filter(chip => chip.type === 'active' || chip.type === 'passive' || chip.type === 'process');
  const sourceChips = Array.isArray(npc.chips) ? npc.chips : [];
  const normalizedChips =
    sourceChips.length > 0
      ? sourceChips
      : [
          ...(fallbackBoard ? [{ ...fallbackBoard }] : []),
          ...(fallbackNormals.length > 0
            ? [
                { ...fallbackNormals[hashTextToIndex(`${npc.id}_c1`, fallbackNormals.length)] },
                { ...fallbackNormals[hashTextToIndex(`${npc.id}_c2`, fallbackNormals.length)] },
              ]
            : []),
        ];
  const source = npc.bodyParts || [];
  const used = new Set<number>();
  const findPartIndex = (tpl: (typeof LINGSHU_BODY_PART_TEMPLATE)[number]) => {
    const aliasSet = new Set([tpl.key, ...(tpl.aliases || [])].map(v => v.toLowerCase()));
    for (let i = 0; i < source.length; i += 1) {
      if (used.has(i)) continue;
      const part = source[i];
      const key = `${part.key || ''}`.toLowerCase();
      if (aliasSet.has(key)) return i;
    }
    for (let i = 0; i < source.length; i += 1) {
      if (used.has(i)) continue;
      const part = source[i];
      const text = `${part.name || ''} ${part.key || ''}`.toLowerCase();
      if (tpl.key === 'brain' && (text.includes('脑') || text.includes('core'))) return i;
      if (tpl.key === 'genital' && (text.includes('阴') || text.includes('裆') || text.includes('groin') || text.includes('genital'))) return i;
      if (tpl.key === 'hip' && (text.includes('臀') || text.includes('hip'))) return i;
      if (tpl.key === 'axilla' && (text.includes('腋') || text.includes('axilla'))) return i;
    }
    return -1;
  };

  const normalized = LINGSHU_BODY_PART_TEMPLATE.map((tpl, idx) => {
    const matchIndex = findPartIndex(tpl);
    const from = matchIndex >= 0 ? source[matchIndex] : null;
    if (matchIndex >= 0) used.add(matchIndex);
    return {
      id: from?.id || `npc_${npc.id}_${tpl.key}_${idx + 1}`,
      key: tpl.key,
      name: tpl.name,
      rank: from?.rank || levelToRank(tpl.level),
      description: from?.description || tpl.description,
      skills: from?.skills || [],
      equippedItems: from?.equippedItems || [],
      statusAffixes: from?.statusAffixes || [],
      capturedSouls: from?.capturedSouls,
      maxSkillSlots: from?.maxSkillSlots || 3,
      maxEquipSlots: from?.maxEquipSlots || DEFAULT_LINGSHU_EQUIP_SLOTS,
      reserveMp: from?.reserveMp,
    } as BodyPart;
  });

  const extras = source
    .filter((_, idx) => !used.has(idx))
    .map((part, idx) => ({
      ...part,
      id: part.id || `npc_${npc.id}_extra_${idx + 1}`,
      equippedItems: part.equippedItems || [],
      skills: part.skills || [],
      maxSkillSlots: part.maxSkillSlots || 3,
      maxEquipSlots: part.maxEquipSlots || DEFAULT_LINGSHU_EQUIP_SLOTS,
    }));

  return { ...npc, bodyParts: [...normalized, ...extras], chips: normalizedChips };
};

const normalizeNpcListForUi = (list: NPC[]): NPC[] => list.map(normalizeNpcForUi);

type ParsedRuntimeBonus = {
  conversion: number;
  recovery: number;
  charisma: number;
  sixDim: Partial<Record<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力', number>>;
  canFly: boolean;
};

type RuntimeEffectCommand = {
  op: 'add' | 'set' | 'flag';
  target: string;
  value: number | string | boolean;
  source?: string;
};

const EMPTY_RUNTIME_BONUS: ParsedRuntimeBonus = {
  conversion: 0,
  recovery: 0,
  charisma: 0,
  sixDim: {},
  canFly: false,
};

const parseRuntimeEffectCommands = (text: string): RuntimeEffectCommand[] => {
  const commands: RuntimeEffectCommand[] = [];
  if (!text) return commands;

  const kvBlocks = [...text.matchAll(/\[EFFECT\|([^\]]+)\]/gi)];
  kvBlocks.forEach(match => {
    const body = match[1] || '';
    const record: Record<string, string> = {};
    body.split('|').forEach(seg => {
      const [k, ...rest] = seg.split('=');
      if (!k || rest.length === 0) return;
      record[k.trim().toLowerCase()] = rest.join('=').trim();
    });
    const opRaw = (record.op || 'add').toLowerCase();
    const target = record.target || '';
    if (!target) return;
    const valueRaw = record.value ?? '0';
    const asNum = Number(valueRaw);
    const value = Number.isFinite(asNum) ? asNum : valueRaw;
    const op: RuntimeEffectCommand['op'] = opRaw === 'set' ? 'set' : opRaw === 'flag' ? 'flag' : 'add';
    commands.push({ op, target, value, source: record.source || '' });
  });

  const jsonBlocks = [...text.matchAll(/<EFFECT>([\s\S]*?)<\/EFFECT>/gi)];
  jsonBlocks.forEach(match => {
    const raw = match[1]?.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      list.forEach((it: any) => {
        const opRaw = `${it?.op || 'add'}`.toLowerCase();
        const target = `${it?.target || ''}`.trim();
        if (!target) return;
        const op: RuntimeEffectCommand['op'] = opRaw === 'set' ? 'set' : opRaw === 'flag' ? 'flag' : 'add';
        commands.push({ op, target, value: it?.value, source: `${it?.source || ''}`.trim() });
      });
    } catch {
      // ignore invalid EFFECT json block
    }
  });
  return commands;
};

const applyEffectCommandsToBonus = (base: ParsedRuntimeBonus, commands: RuntimeEffectCommand[]): ParsedRuntimeBonus => {
  const next: ParsedRuntimeBonus = {
    conversion: base.conversion,
    recovery: base.recovery,
    charisma: base.charisma,
    sixDim: { ...(base.sixDim || {}) },
    canFly: base.canFly,
  };
  commands.forEach(cmd => {
    const value = typeof cmd.value === 'number' ? cmd.value : Number(cmd.value);
    const num = Number.isFinite(value) ? value : 0;
    const target = cmd.target.trim();
    const setOrAdd = (current: number) => (cmd.op === 'set' ? num : current + num);

    if (/^player\.psionic\.conversion(rate)?$/i.test(target)) {
      next.conversion = setOrAdd(next.conversion);
      return;
    }
    if (/^player\.psionic\.recovery(rate)?$/i.test(target)) {
      next.recovery = setOrAdd(next.recovery);
      return;
    }
    if (/^player\.charisma(\.current)?$/i.test(target)) {
      next.charisma = setOrAdd(next.charisma);
      return;
    }
    const dimMatch = target.match(/^player\.sixdim\.(力量|敏捷|体质|感知|意志|魅力)$/i);
    if (dimMatch?.[1]) {
      const key = dimMatch[1] as '力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力';
      const old = next.sixDim[key] || 0;
      next.sixDim[key] = setOrAdd(old);
      return;
    }
    if (/^player\.flags\.flight$/i.test(target)) {
      next.canFly = cmd.op === 'flag' ? !!cmd.value : num > 0;
    }
  });
  return next;
};

const parseRuntimeBonusFromText = (text: string): ParsedRuntimeBonus => {
  if (!text) return { ...EMPTY_RUNTIME_BONUS, sixDim: {} };
  const raw = text.replace(/\s+/g, '');
  const next: ParsedRuntimeBonus = { ...EMPTY_RUNTIME_BONUS, sixDim: {} };
  const dims: Array<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力'> = ['力量', '敏捷', '体质', '感知', '意志', '魅力'];

  const readBonus = (name: string) => {
    const m1 = raw.match(new RegExp(`${name}[+＋](\\d{1,3})`, 'i'));
    const m2 = raw.match(new RegExp(`[+＋](\\d{1,3})${name}`, 'i'));
    const n = Number(m1?.[1] ?? m2?.[1]);
    return Number.isFinite(n) ? n : 0;
  };

  dims.forEach(dim => {
    const bonus = readBonus(dim);
    if (bonus > 0) next.sixDim[dim] = bonus;
  });
  next.charisma = readBonus('魅力');

  const conversion = raw.match(/(?:转化率|conversionrate)[+＋](\d{1,3}(?:\.\d+)?)/i)
    || raw.match(/[+＋](\d{1,3}(?:\.\d+)?)%?(?:转化率|conversionrate)/i);
  const recovery = raw.match(/(?:回复率|恢复率|recoveryrate)[+＋](\d{1,3}(?:\.\d+)?)/i)
    || raw.match(/[+＋](\d{1,3}(?:\.\d+)?)%?(?:回复率|恢复率|recoveryrate)/i);
  const conversionValue = Number(conversion?.[1]);
  const recoveryValue = Number(recovery?.[1]);
  if (Number.isFinite(conversionValue)) next.conversion = conversionValue;
  if (Number.isFinite(recoveryValue)) next.recovery = recoveryValue;
  next.canFly = /(飞行|悬浮|腾空|滑翔|浮空|喷射推进)/i.test(raw);
  const commands = parseRuntimeEffectCommands(text);
  if (!commands.length) return next;
  return applyEffectCommandsToBonus(next, commands);
};

const extractMaintextFromApiOutput = (raw: string): string => {
  const text = sanitizeAiMaintext(raw);
  if (!text) return '';
  const tagMatch = text.match(/<maintext>([\s\S]*?)<\/maintext>/i);
  if (tagMatch?.[1]?.trim()) return sanitizeAiMaintext(tagMatch[1]);

  const fencedBlocks = [...text.matchAll(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g)].map(m => m[1]?.trim() || '');
  const preferred = fencedBlocks.find(block => /<maintext>[\s\S]*?<\/maintext>/i.test(block));
  if (preferred) {
    const inner = preferred.match(/<maintext>([\s\S]*?)<\/maintext>/i);
    if (inner?.[1]?.trim()) return sanitizeAiMaintext(inner[1]);
  }

  // Strict fallback:
  // If model mixed modules in one response and forgot <maintext>,
  // only keep the prefix before <option>/<sum>/<UpdateVariable>.
  const splitIndex = text.search(/<(?:option|sum|UpdateVariable)\b/i);
  if (splitIndex > 0) {
    const prefix = sanitizeAiMaintext(text.slice(0, splitIndex));
    if (prefix) return prefix;
  }

  return '';
};

const App: React.FC = () => {
  type LeftModuleTab = 'chips' | 'lingshu' | 'inventory';
  const [gameStage, setGameStage] = useState<GameStage>('start');
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [activeTab, setActiveTab] = useState<'contacts' | 'settings'>('contacts');
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [worldNodeMap, setWorldNodeMap] = useState<WorldNodeMapData>(() => createEmptyWorldMap());
  const [mapRuntime, setMapRuntime] = useState<MapRuntimeData>({
    viewed: null,
    playerPosition: null,
    elapsedMinutes: 0,
    logs: [],
  });
  const gameTimeText = useMemo(() => formatGameTime(mapRuntime.elapsedMinutes || 0), [mapRuntime.elapsedMinutes]);
  const gameDayPhase = useMemo(() => getDayPhase(mapRuntime.elapsedMinutes || 0), [mapRuntime.elapsedMinutes]);
  const gameSceneHint = useMemo(() => getSceneHintByPhase(gameDayPhase), [gameDayPhase]);

  const [playerStats, setPlayerStats] = useState<PlayerStats>(MOCK_PLAYER_STATS);
  const [playerGender, setPlayerGender] = useState<'male' | 'female'>('male');
  const [playerSkills, setPlayerSkills] = useState<Skill[]>([
    { id: 'ps1', name: '灵弦：野性直觉', level: 1, description: '被动增强感知能力。' },
  ]);
  const [isSpiritCoreModalOpen, setIsSpiritCoreModalOpen] = useState(false);

  const [npcs, setNpcs] = useState<NPC[]>(() => normalizeNpcListForUi(MOCK_NPCS));
  const [contactGroups, setContactGroups] = useState<string[]>(() => Array.from(new Set(normalizeNpcListForUi(MOCK_NPCS).filter(n => n.group).map(n => n.group))));

  const [playerChips, setPlayerChips] = useState<Chip[]>(MOCK_CHIPS);
  const [storageChips, setStorageChips] = useState<Chip[]>(MOCK_STORAGE_CHIPS);

  const [playerInventory, setPlayerInventory] = useState<Item[]>(MOCK_INVENTORY);
  const [playerLingshu, setPlayerLingshu] = useState<GameConfig['selectedLingshu']>([]);
  const [playerSoulLedger, setPlayerSoulLedger] = useState<Partial<Record<Rank, number>>>({
    [Rank.Lv1]: 1,
    [Rank.Lv2]: 1,
    [Rank.Lv3]: 0,
    [Rank.Lv4]: 0,
    [Rank.Lv5]: 0,
  });
  const [coinVault, setCoinVault] = useState<Partial<Record<Rank, number>>>({
    [Rank.Lv1]: 0,
    [Rank.Lv2]: 0,
    [Rank.Lv3]: 0,
    [Rank.Lv4]: 0,
    [Rank.Lv5]: 0,
  });
  const [playerCoreAffixes, setPlayerCoreAffixes] = useState<RuntimeAffix[]>([
    { id: 'core_affix_0', name: '状态：回路自检', description: '维持核心回路稳定，减少异常波动。', type: 'neutral', source: '初始' },
  ]);
  const [playerFaction, setPlayerFaction] = useState<PlayerFaction>(MOCK_PLAYER_FACTION);
  const [leftModuleTab, setLeftModuleTab] = useState<LeftModuleTab>('chips');
  const [playerNeuralProtocol, setPlayerNeuralProtocol] = useState<'none' | 'beta'>('none');
  const [careerTracks, setCareerTracks] = useState<CareerTrack[]>(DEFAULT_CAREER_TRACKS);
  const [isCareerEditorOpen, setIsCareerEditorOpen] = useState(false);
  const [focusedLayerId, setFocusedLayerId] = useState<string | null>(null);
  const [isEditLayerOpen, setIsEditLayerOpen] = useState(false);
  const [editMaintextDraft, setEditMaintextDraft] = useState('');
  const [isEditPlayerMessageOpen, setIsEditPlayerMessageOpen] = useState(false);
  const [editPlayerMessageId, setEditPlayerMessageId] = useState<string | null>(null);
  const [editPlayerMessageDraft, setEditPlayerMessageDraft] = useState('');
  const [layerMenu, setLayerMenu] = useState<{ x: number; y: number; messageId: string; sender: 'Player' | 'System' } | null>(null);
  const [isLayerPickerOpen, setIsLayerPickerOpen] = useState(false);
  const [archiveSlots, setArchiveSlots] = useState<ArchiveSlot[]>([]);
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>('');
  const [archiveNameInput, setArchiveNameInput] = useState('');
  const [apiConfig, setApiConfig] = useState<LnApiConfig>({
    enabled: false,
    useTavernApi: true,
    endpoint: '',
    apiKey: '',
    model: 'gpt-4o-mini',
  });
  const [isApiSending, setIsApiSending] = useState(false);
  const [apiError, setApiError] = useState('');
  const apiAbortControllerRef = useRef<AbortController | null>(null);
  const apiRequestSeqRef = useRef(0);

  const [betaStatus, setBetaStatus] = useState<PlayerCivilianStatus>({
    ...MOCK_PLAYER_STATUS,
    betaLevel: 1,
    betaTierName: getBetaTierTitle(1),
    taxOfficerUnlocked: false,
    taxOfficerBoundId: null,
    taxOfficerName: '',
    taxOfficeAddress: '',
  });
  const [betaTasks, setBetaTasks] = useState<BetaTask[]>([]);
  const [acceptedBetaTaskIds, setAcceptedBetaTaskIds] = useState<string[]>([]);
  const [claimableBetaTaskIds, setClaimableBetaTaskIds] = useState<string[]>([]);
  const [taskDeadlines, setTaskDeadlines] = useState<Record<string, number>>({});
  const [pendingUpgradeEvaluation, setPendingUpgradeEvaluation] = useState(false);
  const [selectedBetaProfessionId, setSelectedBetaProfessionId] = useState<string | null>(null);
  const [isTaxOfficerPickerOpen, setIsTaxOfficerPickerOpen] = useState(false);
  const [stateLock, setStateLock] = useState<StateLockConfig>({
    lockTime: false,
    lockLocation: false,
    lockIdentity: false,
  });

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatIdCounter = useRef(0);
  const hasTriedLoadDefaultMapRef = useRef(false);
  const lastAutoMapSyncMessageIdRef = useRef('');
  const prevMobileRef = useRef<boolean | null>(null);
  const [autoMapSyncEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastProtocolRef = useRef<'none' | 'beta' | null>(null);
  const lastPulledSyncSignatureRef = useRef('');
  const lastPushedSyncSignatureRef = useRef('');

  const taxOfficerCandidates = useMemo<TaxOfficerCandidate[]>(() => {
    const list = npcs
      .filter(npc => !npc.temporaryStatus)
      .map(npc => ({
        id: npc.id,
        name: npc.name,
        affiliation: npc.affiliation || '未知组织',
        location: npc.location || '未知区域',
        group: npc.group || '未分组',
        score:
          (npc.isContact ? 100 : 0) +
          (/夜莺/i.test(`${npc.affiliation}${npc.group}${npc.name}`) ? 80 : 0) +
          (npc.gender === 'female' ? 10 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...rest }) => rest);
    return list;
  }, [npcs]);

  useEffect(() => {
    const syncFullscreen = () => {
      setIsFullscreen(!!document.fullscreenElement || !!(document as any).webkitFullscreenElement);
    };
    syncFullscreen();
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen as EventListener);
    return () => {
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen as EventListener);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const update = (matches: boolean) => setIsMobileViewport(matches);
    update(media.matches);

    const onChange = (event: MediaQueryListEvent) => update(event.matches);
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    }
    media.addListener(onChange);
    return () => media.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (prevMobileRef.current === null) {
      prevMobileRef.current = isMobileViewport;
      if (isMobileViewport) {
        setLeftOpen(false);
        setRightOpen(false);
      }
      return;
    }

    if (prevMobileRef.current !== isMobileViewport) {
      if (isMobileViewport) {
        setLeftOpen(false);
        setRightOpen(false);
      } else {
        setLeftOpen(true);
        setRightOpen(true);
      }
      prevMobileRef.current = isMobileViewport;
    }
  }, [isMobileViewport]);

  useEffect(() => {
    setLeftModuleTab(prev => (prev === 'chips' || prev === 'lingshu' || prev === 'inventory' ? prev : 'chips'));
  }, [playerGender]);

  useEffect(() => {
    if (!selectedNPC) return;
    const next = npcs.find(n => n.id === selectedNPC.id);
    if (!next) {
      setSelectedNPC(null);
      return;
    }
    if (next !== selectedNPC) {
      setSelectedNPC(next);
    }
  }, [npcs, selectedNPC]);

  useEffect(() => {
    if (!playerLingshu || playerLingshu.length === 0) return;
    const requiredParts: Array<{ key: string; name: string; rank: Rank; level: number; description: string }> = [
      { key: 'brain', name: '大脑', rank: Rank.Lv3, level: 3, description: '认知中枢与灵能感知核心。' },
      { key: 'genital', name: '阴部', rank: Rank.Lv3, level: 3, description: '高敏回路与外泄控制节点。' },
      { key: 'hip', name: '臀部', rank: Rank.Lv3, level: 3, description: '核心承压与外泄缓冲区域。' },
    ];
    const missing = requiredParts.filter(req => {
      return !playerLingshu.some(part => {
        const text = `${part.name || ''} ${part.key || ''}`.toLowerCase();
        if (req.key === 'brain') return text.includes('脑') || text.includes('brain');
        if (req.key === 'genital') return text.includes('阴') || text.includes('裆') || text.includes('genital') || text.includes('groin');
        if (req.key === 'hip') return text.includes('臀') || text.includes('hip');
        return false;
      });
    });
    if (missing.length === 0) return;

    setPlayerLingshu(prev => [
      ...missing.map(req => ({
        id: `ls_${req.key}_auto`,
        key: req.key,
        name: req.name,
        rank: req.rank,
        level: req.level,
        strengthProgress: 0,
        description: req.description,
        equippedItem: null,
        equippedItems: [],
        spiritSkill: null,
        spiritSkills: [],
        maxSkillSlots: 3,
        maxEquipSlots: DEFAULT_LINGSHU_EQUIP_SLOTS,
      })),
      ...prev,
    ]);
  }, [playerLingshu]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LN_ARCHIVES_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ArchiveSlot[];
      if (!Array.isArray(parsed)) return;
      const valid = parsed.filter(slot => slot?.id && slot?.name && slot?.data?.version === 1);
      setArchiveSlots(valid);
      const lastId = window.localStorage.getItem(LN_LAST_ARCHIVE_ID_KEY);
      if (lastId && valid.some(slot => slot.id === lastId)) {
        setSelectedArchiveId(lastId);
      } else if (valid[0]) {
        setSelectedArchiveId(valid[0].id);
      }
    } catch (error) {
      console.warn('读取档案列表失败:', error);
    }
  }, []);

  useEffect(() => {
    if (hasTriedLoadDefaultMapRef.current) return;
    if (!isWorldMapEmpty(worldNodeMap)) return;
    hasTriedLoadDefaultMapRef.current = true;
    let cancelled = false;
    loadDefaultQilingMap().then(map => {
      if (cancelled) return;
      setWorldNodeMap(prev => (isWorldMapEmpty(prev) ? map : prev));
    });
    return () => {
      cancelled = true;
    };
  }, [worldNodeMap]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LN_API_CONFIG_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<LnApiConfig>;
      setApiConfig(prev => ({
        ...prev,
        ...parsed,
        enabled: !!parsed.enabled,
      }));
    } catch (error) {
      console.warn('读取 API 配置失败:', error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LN_API_CONFIG_KEY, JSON.stringify(apiConfig));
    } catch (error) {
      console.warn('保存 API 配置失败:', error);
    }
  }, [apiConfig]);

  const syncStateFromTavernVariables = useCallback(() => {
    if (typeof getVariables !== 'function') return;

    let variables: Record<string, any>;
    try {
      variables = getVariables({ type: 'chat' });
    } catch {
      return;
    }

    const stat = variables?.stat_data;
    if (!stat || typeof stat !== 'object') return;

    const toNumber = (value: unknown): number | undefined => {
      const next = Number(value);
      return Number.isFinite(next) ? next : undefined;
    };

    const coreStatus = stat?.player?.core_status || {};
    const psionic = stat?.player?.psionic || {};
    const assets = stat?.player?.assets || {};
    const lcoin = assets?.lcoin || {};
    const lcoinTotal =
      (toNumber(lcoin?.total) ?? 0) ||
      ['lv1', 'lv2', 'lv3', 'lv4', 'lv5'].reduce((sum, key) => sum + (toNumber(lcoin?.[key]) ?? 0), 0);

    const repCurrent =
      toNumber(coreStatus?.reputation?.current) ??
      toNumber(stat?.player?.reputation) ??
      toNumber(stat?.player?.core_status?.credit_score);
    const creditsFromStat = toNumber(assets?.credits) ?? toNumber(stat?.player?.credits) ?? lcoinTotal;
    const syncSignature = JSON.stringify({
      hpCurrent: toNumber(coreStatus?.hp?.current) ?? null,
      hpMax: toNumber(coreStatus?.hp?.max) ?? null,
      mpCurrent: toNumber(coreStatus?.mp?.current) ?? null,
      mpMax: toNumber(coreStatus?.mp?.max) ?? null,
      sanityCurrent: toNumber(coreStatus?.sanity?.current) ?? null,
      sanityMax: toNumber(coreStatus?.sanity?.max) ?? null,
      credits: creditsFromStat ?? null,
      reputation: repCurrent ?? null,
      conversionRate: toNumber(psionic?.conversion_rate?.current) ?? toNumber(psionic?.conversion_rate) ?? null,
      recoveryRate: toNumber(psionic?.recovery_rate?.current) ?? toNumber(psionic?.recovery_rate) ?? null,
      rank: `${stat?.player?.psionic_rank ?? psionic?.rank ?? ''}`.trim() || null,
    });
    lastPulledSyncSignatureRef.current = syncSignature;

    setPlayerStats(prev => {
      const next: PlayerStats = {
        ...prev,
        hp: { ...prev.hp },
        mp: { ...prev.mp },
        sanity: { ...prev.sanity },
        psionic: { ...prev.psionic },
      };
      let changed = false;

      const hpCurrent = toNumber(coreStatus?.hp?.current);
      const hpMax = toNumber(coreStatus?.hp?.max);
      const mpCurrent = toNumber(coreStatus?.mp?.current);
      const mpMax = toNumber(coreStatus?.mp?.max);
      const sanityCurrent = toNumber(coreStatus?.sanity?.current);
      const sanityMax = toNumber(coreStatus?.sanity?.max);
      const conversionRate = toNumber(psionic?.conversion_rate?.current) ?? toNumber(psionic?.conversion_rate);
      const recoveryRate = toNumber(psionic?.recovery_rate?.current) ?? toNumber(psionic?.recovery_rate);

      const rankRaw = `${stat?.player?.psionic_rank ?? psionic?.rank ?? ''}`.trim();
      const rankMatch = rankRaw.match(/Lv\.?\s*(\d+)/i);
      const rankValue = rankMatch?.[1] ? levelToRank(Number(rankMatch[1])) : undefined;

      if (hpCurrent !== undefined && hpCurrent !== prev.hp.current) {
        next.hp.current = Math.max(0, hpCurrent);
        changed = true;
      }
      if (hpMax !== undefined && hpMax !== prev.hp.max) {
        next.hp.max = Math.max(1, hpMax);
        changed = true;
      }
      if (mpCurrent !== undefined && mpCurrent !== prev.mp.current) {
        next.mp.current = Math.max(0, mpCurrent);
        changed = true;
      }
      if (mpMax !== undefined && mpMax !== prev.mp.max) {
        next.mp.max = Math.max(1, mpMax);
        changed = true;
      }
      if (sanityCurrent !== undefined && sanityCurrent !== prev.sanity.current) {
        next.sanity.current = Math.max(0, sanityCurrent);
        changed = true;
      }
      if (sanityMax !== undefined && sanityMax !== prev.sanity.max) {
        next.sanity.max = Math.max(1, sanityMax);
        changed = true;
      }
      if (creditsFromStat !== undefined && creditsFromStat !== prev.credits) {
        next.credits = Math.max(0, creditsFromStat);
        changed = true;
      }
      if (conversionRate !== undefined && conversionRate !== prev.psionic.conversionRate) {
        next.psionic.conversionRate = conversionRate;
        changed = true;
      }
      if (recoveryRate !== undefined && recoveryRate !== prev.psionic.recoveryRate) {
        next.psionic.recoveryRate = recoveryRate;
        changed = true;
      }
      if (rankValue && rankValue !== prev.psionic.level) {
        next.psionic.level = rankValue;
        changed = true;
      }

      return changed ? ensurePlayerStatsSixDim(next) : prev;
    });

    if (repCurrent !== undefined) {
      setBetaStatus(prev =>
        repCurrent === prev.creditScore ? prev : { ...prev, creditScore: Math.max(0, Math.min(120, repCurrent)) },
      );
    }
  }, []);

  useEffect(() => {
    if (gameStage !== 'game') return;
    syncStateFromTavernVariables();
    const timer = window.setInterval(syncStateFromTavernVariables, 1200);
    return () => window.clearInterval(timer);
  }, [gameStage, syncStateFromTavernVariables]);

  useEffect(() => {
    const currentRank = playerStats.psionic.level;
    setCoinVault(prev => ({
      ...prev,
      [currentRank]: playerStats.credits,
    }));
  }, [playerStats.credits, playerStats.psionic.level]);

  const hasBetaChip = playerChips.some(c => c.type === 'beta');
  const betaLevelNow = betaStatus.betaLevel || 1;
  const availableBetaProfessions = useMemo(
    () => BETA_PROFESSIONS.filter(p => betaLevelNow >= p.minLevel && betaLevelNow <= p.maxLevel),
    [betaLevelNow],
  );
  const selectedBetaProfession = useMemo(
    () => BETA_PROFESSIONS.find(p => p.id === selectedBetaProfessionId) || null,
    [selectedBetaProfessionId],
  );
  const layerMessages = useMemo(() => messages.filter(msg => msg.sender === 'System' && hasPseudoLayer(msg.content)), [messages]);
  const activeLayerMessage = useMemo(
    () => (focusedLayerId ? layerMessages.find(layer => layer.id === focusedLayerId) : undefined) || layerMessages[layerMessages.length - 1],
    [focusedLayerId, layerMessages],
  );
  const currentNarrativeLocation = useMemo(() => {
    if (!activeLayerMessage?.content) return playerFaction.headquarters || '未知区域';
    const parsed = parsePseudoLayer(activeLayerMessage.content);
    const sumText = parsed.sum || '';
    const sumMatch = sumText.match(/地点[:：]\s*([^|｜\n]+)/);
    if (sumMatch?.[1]?.trim()) return sumMatch[1].trim();
    const maintext = parsed.maintext || activeLayerMessage.content;
    const mainMatch = maintext.match(/你在(.+?)继续行动/);
    if (mainMatch?.[1]?.trim()) return mainMatch[1].trim();
    const locationLine = maintext.match(/当前地点[:：]\s*([^\n]+)/);
    if (locationLine?.[1]?.trim()) return locationLine[1].trim();
    return playerFaction.headquarters || '未知区域';
  }, [activeLayerMessage, playerFaction.headquarters]);
  const identityLabel = useMemo(
    () => `${betaStatus.citizenId} · ${playerNeuralProtocol.toUpperCase()} · ${playerFaction.name}`,
    [betaStatus.citizenId, playerNeuralProtocol, playerFaction.name],
  );
  const effectiveNarrativeLocation = useMemo(
    () => (stateLock.lockLocation ? stateLock.lockedLocation || currentNarrativeLocation : currentNarrativeLocation),
    [stateLock.lockLocation, stateLock.lockedLocation, currentNarrativeLocation],
  );
  const effectiveElapsedMinutes = useMemo(
    () => (stateLock.lockTime ? stateLock.lockedElapsedMinutes ?? mapRuntime.elapsedMinutes : mapRuntime.elapsedMinutes),
    [stateLock.lockTime, stateLock.lockedElapsedMinutes, mapRuntime.elapsedMinutes],
  );
  const effectiveGameTimeText = useMemo(() => formatGameTime(effectiveElapsedMinutes || 0), [effectiveElapsedMinutes]);
  const effectiveGameDayPhase = useMemo(() => getDayPhase(effectiveElapsedMinutes || 0), [effectiveElapsedMinutes]);
  const effectiveGameSceneHint = useMemo(() => getSceneHintByPhase(effectiveGameDayPhase), [effectiveGameDayPhase]);
  const effectiveIdentityLabel = useMemo(
    () => (stateLock.lockIdentity ? stateLock.lockedIdentity || identityLabel : identityLabel),
    [stateLock.lockIdentity, stateLock.lockedIdentity, identityLabel],
  );

  useEffect(() => {
    if (gameStage !== 'game') return;
    if (typeof getVariables !== 'function' || typeof replaceVariables !== 'function') return;

    const nextSignature = JSON.stringify({
      hpCurrent: playerStats.hp.current,
      hpMax: playerStats.hp.max,
      mpCurrent: playerStats.mp.current,
      mpMax: playerStats.mp.max,
      sanityCurrent: playerStats.sanity.current,
      sanityMax: playerStats.sanity.max,
      credits: playerStats.credits,
      reputation: betaStatus.creditScore,
      conversionRate: playerStats.psionic.conversionRate,
      recoveryRate: playerStats.psionic.recoveryRate,
      rank: playerStats.psionic.level,
    });
    if (nextSignature === lastPulledSyncSignatureRef.current) return;
    if (nextSignature === lastPushedSyncSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      try {
        const vars = getVariables({ type: 'chat' }) || {};
        const root = vars.stat_data && typeof vars.stat_data === 'object' ? vars.stat_data : {};
        const world = root.world && typeof root.world === 'object' ? root.world : {};
        const player = root.player && typeof root.player === 'object' ? root.player : {};
        const coreStatus = player.core_status && typeof player.core_status === 'object' ? player.core_status : {};
        const psionic = player.psionic && typeof player.psionic === 'object' ? player.psionic : {};
        const assets = player.assets && typeof player.assets === 'object' ? player.assets : {};
        const lcoin = assets.lcoin && typeof assets.lcoin === 'object' ? assets.lcoin : {};

        const nextVars = { ...vars };
        nextVars.stat_data = {
          ...root,
          world: {
            ...world,
            current_time: effectiveGameTimeText,
            current_location: currentNarrativeLocation || world.current_location || '未知区域',
          },
          player: {
            ...player,
            psionic_rank: playerStats.psionic.level,
            core_status: {
              ...coreStatus,
              hp: { ...(coreStatus.hp || {}), current: playerStats.hp.current, max: playerStats.hp.max },
              mp: { ...(coreStatus.mp || {}), current: playerStats.mp.current, max: playerStats.mp.max },
              sanity: { ...(coreStatus.sanity || {}), current: playerStats.sanity.current, max: playerStats.sanity.max },
              reputation: { ...(coreStatus.reputation || {}), current: betaStatus.creditScore, max: 120 },
            },
            psionic: {
              ...psionic,
              conversion_rate: {
                ...(typeof psionic.conversion_rate === 'object' ? psionic.conversion_rate : {}),
                current: playerStats.psionic.conversionRate,
              },
              recovery_rate: {
                ...(typeof psionic.recovery_rate === 'object' ? psionic.recovery_rate : {}),
                current: playerStats.psionic.recoveryRate,
              },
            },
            assets: {
              ...assets,
              credits: playerStats.credits,
              lcoin: {
                ...lcoin,
                total: playerStats.credits,
              },
            },
          },
        };

        replaceVariables(nextVars, { type: 'chat' });
        lastPushedSyncSignatureRef.current = nextSignature;
      } catch (error) {
        console.warn('写回酒馆变量失败:', error);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    gameStage,
    playerStats.hp.current,
    playerStats.hp.max,
    playerStats.mp.current,
    playerStats.mp.max,
    playerStats.sanity.current,
    playerStats.sanity.max,
    playerStats.credits,
    playerStats.psionic.level,
    playerStats.psionic.conversionRate,
    playerStats.psionic.recoveryRate,
    betaStatus.creditScore,
    effectiveGameTimeText,
    currentNarrativeLocation,
  ]);
  const visibleMessages = messages;
  const visibleLayerMessages = useMemo(
    () => visibleMessages.filter(msg => msg.sender === 'System' && hasPseudoLayer(msg.content)),
    [visibleMessages],
  );

  const spawnFloatingText = (text: string, color: string = 'text-white') => {
    const id = floatIdCounter.current++;
    const x = 50 + (Math.random() * 10 - 5);
    const y = 50 + (Math.random() * 10 - 5);
    setFloatingTexts(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setFloatingTexts(prev => prev.filter(ft => ft.id !== id)), 1000);
  };

  const persistArchives = (slots: ArchiveSlot[]) => {
    try {
      window.localStorage.setItem(LN_ARCHIVES_KEY, JSON.stringify(slots));
    } catch (error) {
      console.warn('写入档案列表失败:', error);
    }
  };

  const buildSavePayload = (): LnSaveData => ({
    version: 1,
    messages,
    playerStats,
    playerGender,
    playerSkills,
    npcs,
    contactGroups,
    playerChips,
    storageChips,
    playerInventory,
    playerLingshu,
    playerFaction,
    leftModuleTab,
    playerNeuralProtocol,
    careerTracks,
    betaStatus,
    betaTasks,
    acceptedBetaTaskIds,
    claimableBetaTaskIds,
    taskDeadlines,
    pendingUpgradeEvaluation,
    selectedBetaProfessionId,
    focusedLayerId,
    worldNodeMap,
    mapRuntime,
    playerSoulLedger,
    coinVault,
    playerCoreAffixes,
  });

  const applySavePayload = (payload: LnSaveData) => {
    const normalizedMessages = ensurePseudoLayerOnLoad(payload.messages || MOCK_MESSAGES, {
      location: payload.playerFaction?.headquarters || '未知区域',
      credits: payload.playerStats?.credits || 0,
      reputation: payload.betaStatus?.creditScore || 60,
      elapsedMinutes: payload.mapRuntime?.elapsedMinutes || 0,
    });
    setMessages(normalizedMessages);
    setPlayerStats(ensurePlayerStatsSixDim(payload.playerStats || MOCK_PLAYER_STATS));
    setPlayerGender(payload.playerGender || 'male');
    setPlayerSkills(payload.playerSkills || []);
    setNpcs(normalizeNpcListForUi(payload.npcs || MOCK_NPCS));
    setContactGroups(payload.contactGroups || []);
    setPlayerChips(payload.playerChips || MOCK_CHIPS);
    setStorageChips(payload.storageChips || MOCK_STORAGE_CHIPS);
    setPlayerInventory(payload.playerInventory || MOCK_INVENTORY);
    setPlayerLingshu(payload.playerLingshu || []);
    setPlayerSoulLedger(payload.playerSoulLedger || { [Rank.Lv1]: 0, [Rank.Lv2]: 0, [Rank.Lv3]: 0, [Rank.Lv4]: 0, [Rank.Lv5]: 0 });
    setCoinVault(payload.coinVault || { [Rank.Lv1]: 0, [Rank.Lv2]: 0, [Rank.Lv3]: 0, [Rank.Lv4]: 0, [Rank.Lv5]: 0 });
    setPlayerCoreAffixes(
      payload.playerCoreAffixes ||
        (payload.playerGender === 'male'
          ? [{ id: 'core_affix_m_1', name: '状态：压制残响', description: '承压后短时抑制外泄。', type: 'debuff', source: '初始' }]
          : [{ id: 'core_affix_f_1', name: '状态：奇点凝附', description: '提升灵海稳定与吸附能力。', type: 'buff', source: '初始' }]),
    );
    setPlayerFaction(payload.playerFaction || MOCK_PLAYER_FACTION);
    setLeftModuleTab(payload.leftModuleTab || 'chips');
    setPlayerNeuralProtocol(payload.playerNeuralProtocol === 'beta' ? 'beta' : 'none');
    setCareerTracks(payload.careerTracks?.length ? payload.careerTracks : DEFAULT_CAREER_TRACKS);
    const loadedStatus = payload.betaStatus || MOCK_PLAYER_STATUS;
    setBetaStatus({
      ...loadedStatus,
      taxOfficerUnlocked: loadedStatus.taxOfficerUnlocked ?? payload.playerNeuralProtocol === 'beta',
      taxOfficerBoundId: loadedStatus.taxOfficerBoundId ?? null,
      taxOfficerName: loadedStatus.taxOfficerName || '',
      taxOfficeAddress: loadedStatus.taxOfficeAddress || '',
    });
    setBetaTasks(payload.betaTasks || []);
    setAcceptedBetaTaskIds(payload.acceptedBetaTaskIds || []);
    setClaimableBetaTaskIds(payload.claimableBetaTaskIds || []);
    setTaskDeadlines(payload.taskDeadlines || {});
    setPendingUpgradeEvaluation(!!payload.pendingUpgradeEvaluation);
    setSelectedBetaProfessionId(payload.selectedBetaProfessionId || null);
    const fallbackFocus =
      [...normalizedMessages]
        .reverse()
        .find(msg => msg.sender === 'System' && hasPseudoLayer(msg.content || ''))?.id || null;
    setFocusedLayerId(payload.focusedLayerId || fallbackFocus);
    setWorldNodeMap(normalizeWorldNodeMap(payload.worldNodeMap) || createEmptyWorldMap());
    setMapRuntime(
      payload.mapRuntime || {
        viewed: null,
        playerPosition: null,
        elapsedMinutes: 0,
        logs: [],
      },
    );
    setSelectedNPC(null);
    setGameStage('game');
  };

  const saveCurrentArchive = () => {
    if (gameStage !== 'game') return;
    const payload = buildSavePayload();
    const now = Date.now();
    const trimmedName = archiveNameInput.trim();
    const fallbackName = new Date(now).toLocaleString('zh-CN');
    const targetId = selectedArchiveId || `archive_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const nextName = trimmedName || archiveSlots.find(slot => slot.id === targetId)?.name || `档案 ${fallbackName}`;
    const existing = archiveSlots.find(slot => slot.id === targetId);
    const nextSlot: ArchiveSlot = {
      id: targetId,
      name: nextName,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      data: payload,
    };
    const merged = [nextSlot, ...archiveSlots.filter(slot => slot.id !== targetId)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ARCHIVE_SLOTS);
    setArchiveSlots(merged);
    setSelectedArchiveId(targetId);
    setArchiveNameInput(nextName);
    window.localStorage.setItem(LN_LAST_ARCHIVE_ID_KEY, targetId);
    persistArchives(merged);
    setMessages(prev => [
      ...prev,
      {
        id: `sys_archive_saved_${now}`,
        sender: 'System',
        content: `档案已保存：${nextName}`,
        timestamp: new Date(now).toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
  };

  const saveAutoArchiveSilently = () => {
    if (gameStage !== 'game') return;
    const payload = buildSavePayload();
    const now = Date.now();
    const existing = archiveSlots.find(slot => slot.id === LN_AUTO_ARCHIVE_ID);
    const nextSlot: ArchiveSlot = {
      id: LN_AUTO_ARCHIVE_ID,
      name: '自动存档',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      data: payload,
    };
    const merged = [nextSlot, ...archiveSlots.filter(slot => slot.id !== LN_AUTO_ARCHIVE_ID)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ARCHIVE_SLOTS);
    setArchiveSlots(merged);
    setSelectedArchiveId(LN_AUTO_ARCHIVE_ID);
    window.localStorage.setItem(LN_LAST_ARCHIVE_ID_KEY, LN_AUTO_ARCHIVE_ID);
    persistArchives(merged);
  };

  const loadArchiveById = (archiveId: string) => {
    const slot = archiveSlots.find(item => item.id === archiveId);
    if (!slot) return;
    applySavePayload(slot.data);
    setSelectedArchiveId(slot.id);
    setArchiveNameInput(slot.name);
    window.localStorage.setItem(LN_LAST_ARCHIVE_ID_KEY, slot.id);
    setMessages(prev => [
      ...prev,
      {
        id: `sys_archive_loaded_${Date.now()}`,
        sender: 'System',
        content: `已读取档案：${slot.name}`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
  };

  const deleteSelectedArchive = () => {
    if (!selectedArchiveId) return;
    const target = archiveSlots.find(slot => slot.id === selectedArchiveId);
    const next = archiveSlots.filter(slot => slot.id !== selectedArchiveId);
    setArchiveSlots(next);
    persistArchives(next);
    const nextSelected = next[0]?.id || '';
    setSelectedArchiveId(nextSelected);
    if (nextSelected) {
      const selected = next.find(slot => slot.id === nextSelected);
      setArchiveNameInput(selected?.name || '');
      window.localStorage.setItem(LN_LAST_ARCHIVE_ID_KEY, nextSelected);
    } else {
      setArchiveNameInput('');
      window.localStorage.removeItem(LN_LAST_ARCHIVE_ID_KEY);
    }
    if (gameStage === 'game') {
      setMessages(prev => [
        ...prev,
        {
          id: `sys_archive_deleted_${Date.now()}`,
          sender: 'System',
          content: `档案已删除：${target?.name || '未命名档案'}`,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          type: 'narrative',
        },
      ]);
    }
  };

  const resolveApiEndpoint = (raw: string) => {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (!trimmed) return '';
    if (trimmed.endsWith('/chat/completions')) return trimmed;
    if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
    return `${trimmed}/v1/chat/completions`;
  };

  const requestApiMaintext = async (
    input: string,
    context?: { gameTime?: string; dayPhase?: string; location?: string; sceneHint?: string },
    signal?: AbortSignal,
  ): Promise<string | null> => {
    if (!apiConfig.enabled) return null;
    if (apiConfig.useTavernApi) {
      const tavernGenerate = (globalThis as { generate?: (args: { user_input: string; should_silence?: boolean }) => Promise<string> }).generate;
      if (typeof tavernGenerate !== 'function') return null;
      const contextPrefix = context
        ? `【时间】${context.gameTime || ''}（${context.dayPhase || ''}）\n【地点】${context.location || ''}\n【场景】${context.sceneHint || ''}\n`
        : '';
      const genPromise = tavernGenerate({
        user_input: `${contextPrefix}${input}`.trim(),
        should_silence: true,
      });
      const text = signal
        ? await Promise.race<string>([
            genPromise,
            new Promise<string>((_, reject) => {
              if (signal.aborted) {
                reject(new DOMException('Aborted', 'AbortError'));
                return;
              }
              const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
              signal.addEventListener('abort', onAbort, { once: true });
            }),
          ])
        : await genPromise;
      const clean = typeof text === 'string' ? sanitizeAiMaintext(text) : '';
      const extracted = extractMaintextFromApiOutput(clean);
      const finalText = sanitizeAiMaintext(extracted);
      if (/<\/?(?:html|body|script)\b/i.test(finalText)) return extracted || null;
      return finalText || extracted || null;
    }

    const endpoint = resolveApiEndpoint(apiConfig.endpoint);
    if (!endpoint || !apiConfig.model.trim()) return null;

    const requestMessages = context
      ? [
          { role: 'system', content: `当前时间：${context.gameTime || ''}（${context.dayPhase || ''}）\n当前地点：${context.location || ''}\n场景提示：${context.sceneHint || ''}` },
          { role: 'user', content: input },
        ]
      : [{ role: 'user', content: input }];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiConfig.apiKey.trim()) {
      headers.Authorization = `Bearer ${apiConfig.apiKey.trim()}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify({
        model: apiConfig.model.trim(),
        messages: requestMessages,
        temperature: 0.85,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await response.json();
    const text = json?.choices?.[0]?.message?.content;
    const clean = typeof text === 'string' ? sanitizeAiMaintext(text) : '';
    const extracted = extractMaintextFromApiOutput(clean);
    const finalText = sanitizeAiMaintext(extracted);
    if (/<\/?(?:html|body|script)\b/i.test(finalText)) return extracted || null;
    return finalText || extracted || null;
  };

  const handleUpdateNpc = (npcId: string, updates: Partial<NPC>) => {
    setNpcs(prev => prev.map(n => (n.id === npcId ? normalizeNpcForUi({ ...n, ...updates }) : n)));
  };

  const handleRemoveGroup = (groupName: string) => {
    setContactGroups(prev => prev.filter(g => g !== groupName));
    setNpcs(prev =>
      prev.map(npc => {
        if (npc.group === groupName && npc.isContact) {
          return normalizeNpcForUi({ ...npc, isContact: false, group: '', temporaryStatus: '近期删除' });
        }
        return npc;
      }),
    );
  };

  const handleAddPlayerSkill = () => {
    const material = consumeResonanceMaterial();
    if (!material) {
      window.alert('共鸣失败：背包中没有可消耗素材（人体部位/灵核/灵魂）。');
      return;
    }
    const newSkill: Skill = {
      id: `ps_${Date.now()}`,
      name: `灵弦：随机突变${Math.floor(Math.random() * 100)}`,
      level: 1,
      description: `通过灵弦共鸣形成的新回路（消耗：${material.name}）。`,
    };
    setPlayerSkills(prev => [...prev, newSkill]);
    spawnFloatingText(`共鸣成功 -1 ${material.name}`, 'text-fuchsia-300');
  };

  const handleRemovePlayerSkill = (id: string) => {
    setPlayerSkills(prev => prev.filter(s => s.id !== id));
  };

  const handleForgetLingshuSkill = (partId: string, skillId: string) => {
    setPlayerLingshu(prev =>
      prev.map(part => {
        if (part.id !== partId) return part;
        const baseSkills = part.spiritSkills ?? (part.spiritSkill ? [part.spiritSkill] : []);
        const nextSkills = baseSkills.filter(skill => skill.id !== skillId);
        return {
          ...part,
          spiritSkills: nextSkills,
          spiritSkill: nextSkills[0] || null,
        };
      }),
    );
  };

  const findResonanceMaterial = () =>
    playerInventory.find(
      item =>
        item.quantity > 0 &&
        item.category === 'material' &&
        (item.name.includes('人体部位') || item.name.includes('灵核') || item.name.includes('灵魂')),
    ) || null;

  const consumeResonanceMaterial = (): Item | null => {
    const picked = findResonanceMaterial();
    if (!picked) return null;
    setPlayerInventory(prev =>
      prev
        .map(item => (item.id === picked.id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter(item => item.quantity > 0),
    );
    return picked;
  };

  const addInventoryItem = (nextItem: Item) => {
    setPlayerInventory(prev => {
      const existing = prev.find(item => item.id === nextItem.id);
      if (existing) {
        return prev.map(item => (item.id === nextItem.id ? { ...item, quantity: item.quantity + nextItem.quantity } : item));
      }
      return [...prev, nextItem];
    });
  };

  const handleLearnLingshuSkill = (partId: string, materialId: string) => {
    const targetPart = playerLingshu.find(part => part.id === partId);
    if (!targetPart) return;
    const targetSkills = targetPart.spiritSkills ?? (targetPart.spiritSkill ? [targetPart.spiritSkill] : []);
    const targetMax = targetPart.maxSkillSlots || 3;
    if (targetSkills.length >= targetMax) {
      window.alert('该部位灵弦槽位已满。');
      return;
    }

    const material = playerInventory.find(item => item.id === materialId && item.quantity > 0);
    if (!material) {
      window.alert('共鸣失败：未找到选定素材。');
      return;
    }
    setPlayerInventory(prev =>
      prev
        .map(item => (item.id === material.id ? { ...item, quantity: item.quantity - 1 } : item))
        .filter(item => item.quantity > 0),
    );
    const lv = rankToLevel(material.rank);
    const skillNamePool = ['潮汐回响', '静默针刺', '压缩共振', '裂解回环', '奇点导向'];
    const pickedName = skillNamePool[Math.floor(Math.random() * skillNamePool.length)];
    const skillName = `灵弦：${pickedName}`;
    const newSkill: Skill = {
      id: `ls_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: skillName,
      level: lv,
      description: `由 ${material.name} 共鸣生成的回路，强化部位输出与稳定。`,
    };

    setPlayerLingshu(prev =>
      prev.map(part => {
        if (part.id !== partId) return part;
        const baseSkills = part.spiritSkills ?? (part.spiritSkill ? [part.spiritSkill] : []);
        const maxSkillSlots = part.maxSkillSlots || 3;
        if (baseSkills.length >= maxSkillSlots) return part;
        const nextSkills = [...baseSkills, newSkill];
        return {
          ...part,
          spiritSkills: nextSkills,
          spiritSkill: nextSkills[0] || null,
        };
      }),
    );
    spawnFloatingText(`共鸣成功 -1 ${material.name}`, 'text-fuchsia-300');
  };

  const handleRemoveLingshuAffix = (partId: string, affixId: string) => {
    setPlayerLingshu(prev =>
      prev.map(part => {
        if (part.id !== partId) return part;
        return { ...part, statusAffixes: (part.statusAffixes || []).filter(affix => affix.id !== affixId) };
      }),
    );
  };

  const handleUnequipLingshuItem = (partId: string, itemId: string) => {
    let removedItem: any = null;
    setPlayerLingshu(prev =>
      prev.map(part => {
        if (part.id !== partId) return part;
        const currentItems = part.equippedItems ?? (part.equippedItem ? [part.equippedItem] : []);
        removedItem = currentItems.find(item => item.id === itemId) || null;
        const nextItems = currentItems.filter(item => item.id !== itemId);
        return {
          ...part,
          equippedItems: nextItems,
          equippedItem: nextItems[0] || null,
        };
      }),
    );
    if (!removedItem) return;
    setPlayerInventory(prev => {
      const sourceId = removedItem.sourceItemId || removedItem.id;
      const existing = prev.find(item => item.id === sourceId);
      if (existing) {
        return prev.map(item => (item.id === sourceId ? { ...item, quantity: item.quantity + 1 } : item));
      }
      const restored: Item = {
        id: sourceId,
        name: removedItem.name,
        quantity: 1,
        icon: '⚙️',
        description: removedItem.description || '灵枢可装配装备',
        category: removedItem.sourceCategory || 'equipment',
        rank: removedItem.rank || Rank.Lv1,
      };
      return [...prev, restored];
    });
  };

  const handleEquipLingshuItem = (partId: string, itemId: string) => {
    const fromInventory = playerInventory.find(item => item.id === itemId && isLingshuEquipableItem(item));
    if (!fromInventory) return;
    let equipped = false;
    const equippedItem = {
      id: `${itemId}_eq_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      sourceItemId: fromInventory.id,
      sourceCategory: fromInventory.category,
      name: fromInventory.name,
      description: fromInventory.description || '灵枢装备',
      rank: fromInventory.rank,
    };

    setPlayerLingshu(prev =>
      prev.map(part => {
        if (part.id !== partId) return part;
        const currentItems = part.equippedItems ?? (part.equippedItem ? [part.equippedItem] : []);
        const maxEquipSlots = part.maxEquipSlots || DEFAULT_LINGSHU_EQUIP_SLOTS;
        if (currentItems.length >= maxEquipSlots) return part;
        equipped = true;
        const nextItems = [...currentItems, equippedItem];
        return {
          ...part,
          equippedItems: nextItems,
          equippedItem: nextItems[0] || null,
        };
      }),
    );
    if (!equipped) return;
    setPlayerInventory(prev =>
      prev
        .map(item => (item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item))
        .filter(item => item.quantity > 0),
    );
  };

  const handleInjectLingshuEnergy = (partId: string, spendRaw: number) => {
    const spend = Math.max(1, Math.floor(spendRaw || 0));
    if (spend <= 0 || playerStats.mp.current < spend) return;

    const growthFactor = Math.max(0.1, playerStats.psionic.conversionRate / 100);
    const growthTotal = Math.max(1, Math.floor(spend * growthFactor));
    let upgraded = false;

    setPlayerLingshu(prev =>
      prev.map(part => {
        if (part.id !== partId) return part;
        let level = part.level || rankToLevel(part.rank);
        let progress = Math.max(0, Math.min(100, Math.floor(part.strengthProgress ?? 0)));
        let growthLeft = growthTotal;

        while (growthLeft > 0 && level < 5) {
          const need = 100 - progress;
          const gain = Math.min(need, growthLeft);
          progress += gain;
          growthLeft -= gain;
          if (progress >= 100 && level < 5) {
            level += 1;
            progress = 0;
          }
        }

        if (level >= 5) {
          level = 5;
          progress = 100;
        }

        upgraded = true;
        return {
          ...part,
          level,
          rank: levelToRank(level),
          strengthProgress: progress,
        };
      }),
    );

    if (!upgraded) return;
    setPlayerStats(prev => ({
      ...prev,
      mp: { ...prev.mp, current: Math.max(0, prev.mp.current - spend) },
    }));
  };

  const handleEquipChip = (chip: Chip) => {
    if (chip.type === 'board') {
      setPlayerChips(prev => {
        const nonBoard = prev.filter(c => c.type !== 'board');
        return [...nonBoard, chip];
      });
      setStorageChips(prev => {
        const oldBoard = playerChips.find(c => c.type === 'board');
        const withoutNew = prev.filter(c => c.id !== chip.id);
        return oldBoard ? [...withoutNew, oldBoard] : withoutNew;
      });
      return;
    }
    setPlayerChips(prev => [...prev, chip]);
    setStorageChips(prev => prev.filter(c => c.id !== chip.id));
  };

  const handleUnequipChip = (chip: Chip) => {
    setPlayerChips(prev => prev.filter(c => c.id !== chip.id));
    setStorageChips(prev => [...prev, chip]);
  };

  const rateBonus = useMemo(() => {
    let conversion = 0;
    let recovery = 0;
    let charisma = 0;
    let canFly = false;
    const sixDim: Partial<Record<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力', number>> = {};
    const mergeParsed = (parsed: ParsedRuntimeBonus) => {
      conversion += parsed.conversion || 0;
      recovery += parsed.recovery || 0;
      charisma += parsed.charisma || 0;
      canFly = canFly || !!parsed.canFly;
      (Object.entries(parsed.sixDim || {}) as Array<['力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力', number]>).forEach(([k, v]) => {
        sixDim[k] = (sixDim[k] || 0) + (v || 0);
      });
    };
    playerSkills.forEach(skill => {
      conversion += skill.conversionRateBonus || 0;
      recovery += skill.recoveryRateBonus || 0;
      mergeParsed(parseRuntimeBonusFromText(`${skill.name || ''} ${skill.description || ''} ${(skill.effectLines || []).join(' ')}`));
    });
    playerLingshu.forEach(part => {
      const skills = part.spiritSkills ?? (part.spiritSkill ? [part.spiritSkill] : []);
      skills.forEach(skill => {
        conversion += skill.conversionRateBonus || 0;
        recovery += skill.recoveryRateBonus || 0;
        mergeParsed(parseRuntimeBonusFromText(`${skill.name || ''} ${skill.description || ''} ${(skill.effectLines || []).join(' ')}`));
      });
      const equips = part.equippedItems ?? (part.equippedItem ? [part.equippedItem] : []);
      equips.forEach(item => {
        conversion += item.conversionRateBonus || 0;
        recovery += item.recoveryRateBonus || 0;
        mergeParsed(parseRuntimeBonusFromText(`${item.name || ''} ${item.description || ''}`));
      });
    });
    playerChips.forEach(chip => {
      mergeParsed(parseRuntimeBonusFromText(`${chip.name || ''} ${chip.description || ''}`));
    });
    return { conversion, recovery, charisma, sixDim, canFly };
  }, [playerSkills, playerLingshu, playerChips]);

  const effectiveConversionRate = Math.max(0, playerStats.psionic.conversionRate + rateBonus.conversion);
  const effectiveRecoveryRate = Math.max(0, playerStats.psionic.recoveryRate + rateBonus.recovery);
  const effectivePlayerStats = useMemo<PlayerStats>(() => {
    const six = playerStats.sixDim || DEFAULT_SIX_DIM;
    const sixDimBonus = rateBonus.sixDim || {};
    const cap = six.cap || 99;
    const nextSix = {
      ...six,
      力量: Math.min(cap, Math.max(1, (six.力量 || 8) + (sixDimBonus.力量 || 0))),
      敏捷: Math.min(cap, Math.max(1, (six.敏捷 || 8) + (sixDimBonus.敏捷 || 0))),
      体质: Math.min(cap, Math.max(1, (six.体质 || 8) + (sixDimBonus.体质 || 0))),
      感知: Math.min(cap, Math.max(1, (six.感知 || 8) + (sixDimBonus.感知 || 0))),
      意志: Math.min(cap, Math.max(1, (six.意志 || 8) + (sixDimBonus.意志 || 0))),
      魅力: Math.min(cap, Math.max(1, (six.魅力 || 8) + (sixDimBonus.魅力 || 0))),
    };
    const nextCharismaCurrent = Math.min(playerStats.charisma.max, Math.max(0, playerStats.charisma.current + rateBonus.charisma));
    return {
      ...playerStats,
      sixDim: nextSix,
      charisma: {
        ...playerStats.charisma,
        current: nextCharismaCurrent,
      },
      psionic: {
        ...playerStats.psionic,
        conversionRate: effectiveConversionRate,
        recoveryRate: effectiveRecoveryRate,
      },
    };
  }, [playerStats, rateBonus, effectiveConversionRate, effectiveRecoveryRate]);
  const activeEffectHint = useMemo(() => {
    const lines: string[] = [];
    if (rateBonus.canFly) lines.push('可短距飞行');
    if (rateBonus.charisma) lines.push(`魅力+${rateBonus.charisma}`);
    if (rateBonus.conversion) lines.push(`转化率+${rateBonus.conversion}`);
    if (rateBonus.recovery) lines.push(`回复率+${rateBonus.recovery}`);
    return lines.join('，');
  }, [rateBonus.canFly, rateBonus.charisma, rateBonus.conversion, rateBonus.recovery]);

  const handleCrossLevelExchange = (direction: 'up' | 'down', amountRaw: number) => {
    const amount = Math.max(1, Math.floor(amountRaw || 0));
    const currentRank = playerStats.psionic.level;
    const currentLevel = rankToLevel(currentRank);

    if (direction === 'up') {
      if (currentLevel >= 5) return;
      if (playerStats.credits < amount) return;
      const target = levelToRank(currentLevel + 1);
      const gain = Math.floor(amount * 0.2);
      if (gain <= 0) return;
      setPlayerStats(prev => ({ ...prev, credits: prev.credits - amount }));
      setCoinVault(prev => ({ ...prev, [target]: (prev[target] || 0) + gain }));
      spawnFloatingText(`跨级压缩 +${gain} ${target}灵能币`, 'text-amber-300');
      return;
    }

    if (currentLevel >= 5) return;
    const source = levelToRank(currentLevel + 1);
    const sourceAmount = coinVault[source] || 0;
    if (sourceAmount < amount) return;
    const gain = Math.floor(amount * 0.2);
    if (gain <= 0) return;
    setCoinVault(prev => ({ ...prev, [source]: Math.max(0, (prev[source] || 0) - amount) }));
    setPlayerStats(prev => ({ ...prev, credits: prev.credits + gain }));
    spawnFloatingText(`跨级分解 +${gain} ${currentRank}灵能币`, 'text-cyan-300');
  };

  const rankFromText = (text: string): Rank | null => {
    const lv = text.match(/Lv\.?\s*([1-5])/i);
    if (lv?.[1]) return levelToRank(Number(lv[1]));
    const zh = text.match(/([1-5])级/);
    if (zh?.[1]) return levelToRank(Number(zh[1]));
    return null;
  };

  const settleKillFromText = (text: string): string[] => {
    if (/(未击杀|没有击杀|没杀|未杀)/i.test(text)) return [];
    const killMatches = text.match(/击杀|杀死|斩杀|处决|击毙|kill|slay|execute/gi);
    const killCount = killMatches?.length || 0;
    if (killCount <= 0) return [];

    const rank = rankFromText(text) || Rank.Lv1;
    const level = rankToLevel(rank);
    const targetIsMale = /(男性|男人|男体|male|man)/i.test(text);
    const targetHasCore = /(灵核|核心|掏核|夺核|挖核)/i.test(text);

    const gainedCredits = 15 * level * killCount;
    const gainedXp = 20 * level * killCount;
    const partAmount = killCount;
    const coreAmount = targetHasCore ? killCount : Math.max(1, Math.floor(killCount / 2));

    setPlayerStats(prev => {
      let nextRankValue = prev.psionic.level;
      let nextXp = prev.psionic.xp + gainedXp;
      let maxXp = prev.psionic.maxXp || RANK_CONFIG[prev.psionic.level].maxXp;
      while (nextXp >= maxXp) {
        const nr = nextRank(nextRankValue);
        if (!nr) {
          nextXp = maxXp;
          break;
        }
        nextXp -= maxXp;
        nextRankValue = nr;
        maxXp = RANK_CONFIG[nextRankValue].maxXp;
      }
      return {
        ...prev,
        credits: prev.credits + gainedCredits,
        psionic: {
          ...prev.psionic,
          level: nextRankValue,
          xp: Math.min(nextXp, maxXp),
          maxXp,
        },
        mp: {
          ...prev.mp,
          max: getMaxMpByGenderAndRank(playerGender, nextRankValue),
          current: Math.min(prev.mp.current, getMaxMpByGenderAndRank(playerGender, nextRankValue)),
        },
      };
    });

    addInventoryItem({
      id: `mat_part_${rank}`,
      name: `人体部位素材 ${rank}`,
      quantity: partAmount,
      icon: '🧩',
      description: `用于灵弦共鸣的素材（${rank}）。`,
      category: 'material',
      rank,
    });
    addInventoryItem({
      id: `mat_core_${rank}`,
      name: `灵核碎片 ${rank}`,
      quantity: coreAmount,
      icon: '🔹',
      description: `用于灵弦共鸣的核心素材（${rank}）。`,
      category: 'material',
      rank,
    });

    if (playerGender === 'female' && targetIsMale) {
      setPlayerSoulLedger(prev => ({ ...prev, [rank]: (prev[rank] || 0) + killCount }));
    }

    spawnFloatingText(`+${gainedCredits} 灵能币`, 'text-amber-300');
    spawnFloatingText(`+${gainedXp} 经验`, 'text-purple-300');

    const lines = [
      `击杀结算：${rank} 目标 x${killCount}`,
      `获得灵能币 +${gainedCredits}，经验 +${gainedXp}`,
      `掉落 人体部位素材 ${rank} x${partAmount}，灵核碎片 ${rank} x${coreAmount}`,
    ];
    if (playerGender === 'female' && targetIsMale) {
      lines.push(`灵魂账本 +${killCount}（${rank}）`);
    }
    return lines;
  };

  const parseTagPayload = (raw: string): Record<string, string> => {
    const result: Record<string, string> = {};
    raw.split('|').forEach(seg => {
      const [k, ...rest] = seg.split('=');
      if (!k || rest.length === 0) return;
      result[k.trim()] = rest.join('=').trim();
    });
    return result;
  };

  const settleStatusFromText = (text: string): string[] => {
    const lines: string[] = [];

    const partMatches = [...text.matchAll(/\[(?:状态|灵枢状态)\|([^\]]+)\]/g)];
    if (partMatches.length > 0) {
      setPlayerLingshu(prev => {
        let next = [...prev];
        partMatches.forEach(match => {
          const payload = parseTagPayload(match[1] || '');
          const partName = payload['部位'] || payload['part'] || '';
          const name = payload['名称'] || payload['name'] || '';
          const description = payload['描述'] || payload['desc'] || '状态生效中';
          const rawType = (payload['类型'] || payload['type'] || 'neutral').toLowerCase();
          if (!partName || !name) return;
          const idx = next.findIndex(part => part.name.includes(partName) || (part.key || '').includes(partName));
          if (idx < 0) return;
          const affix: RuntimeAffix = {
            id: `af_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            description,
            type: rawType.includes('debuff') || rawType.includes('减益') ? 'debuff' : rawType.includes('buff') || rawType.includes('增益') ? 'buff' : 'neutral',
            source: '对话结算',
            stacks: 1,
          };
          const current = next[idx];
          next[idx] = { ...current, statusAffixes: [...(current.statusAffixes || []), affix] };
          lines.push(`状态写入：${current.name} + ${name}`);
        });
        return next;
      });
    }

    const coreMatches = [...text.matchAll(/\[(?:核心状态|灵核状态)\|([^\]]+)\]/g)];
    if (coreMatches.length > 0) {
      setPlayerCoreAffixes(prev => {
        const next = [...prev];
        coreMatches.forEach(match => {
          const payload = parseTagPayload(match[1] || '');
          const name = payload['名称'] || payload['name'] || '';
          const description = payload['描述'] || payload['desc'] || '核心状态生效中';
          const rawType = (payload['类型'] || payload['type'] || 'neutral').toLowerCase();
          if (!name) return;
          next.push({
            id: `core_af_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name,
            description,
            type: rawType.includes('debuff') || rawType.includes('减益') ? 'debuff' : rawType.includes('buff') || rawType.includes('增益') ? 'buff' : 'neutral',
            source: '对话结算',
            stacks: 1,
          });
          lines.push(`核心状态写入：${name}`);
        });
        return next;
      });
    }

    return lines;
  };

  type IntentScene = 'combat_melee' | 'combat_ranged' | 'psionic_control' | 'stealth' | 'social_charm' | 'research';
  const isActionIntent = (text: string) =>
    /(攻击|战斗|击杀|斩杀|处决|冲刺|潜行|调查|追踪|搜查|交涉|谈判|说服|魅惑|施法|灵能|共鸣|抽取|压制|执行|破坏|闯入|夺取|偷袭|射击)/i.test(text);
  const inferIntentScene = (text: string): IntentScene => {
    if (/(谈判|说服|魅惑|交流|交涉|哄|聊天|社交)/i.test(text)) return 'social_charm';
    if (/(潜行|隐蔽|暗杀|偷袭|躲避)/i.test(text)) return 'stealth';
    if (/(研究|解析|分析|调查|推理|侦查)/i.test(text)) return 'research';
    if (/(灵能|施法|共鸣|压制|抽取|外泄)/i.test(text)) return 'psionic_control';
    if (/(射击|远程|狙击|开枪)/i.test(text)) return 'combat_ranged';
    return 'combat_melee';
  };

  const settleIntentCostDeterministic = (text: string): string[] => {
    if (!isActionIntent(text)) {
      return ['意志结算：非行动输入，本轮不触发代价结算'];
    }

    const six = playerStats.sixDim || DEFAULT_SIX_DIM;
    const scene = inferIntentScene(text);
    const dcMap: Record<'low' | 'mid' | 'high', number> = { low: 12, mid: 16, high: 22 };
    const highRisk = /(高风险|强行|硬闯|越级|拼命|极限)/i.test(text);
    const lowRisk = /(轻微|简单|尝试|试探)/i.test(text);
    const dc = highRisk ? dcMap.high : lowRisk ? dcMap.low : dcMap.mid;
    const sceneMap: Record<IntentScene, [number, number, number, string]> = {
      combat_melee: [six.力量 || 8, six.敏捷 || 8, six.体质 || 8, '近战'],
      combat_ranged: [six.敏捷 || 8, six.感知 || 8, six.意志 || 8, '远程'],
      psionic_control: [six.意志 || 8, six.感知 || 8, six.体质 || 8, '灵能控制'],
      stealth: [six.敏捷 || 8, six.感知 || 8, six.意志 || 8, '潜行'],
      social_charm: [six.魅力 || 8, six.感知 || 8, six.意志 || 8, '社交'],
      research: [six.感知 || 8, six.意志 || 8, six.魅力 || 8, '研究'],
    };
    const [a, b, c, label] = sceneMap[scene];
    const power = Math.floor(a * 0.5 + b * 0.3 + c * 0.2);
    const gap = Math.max(0, dc - power);
    const mpCost = Math.max(2, 5 + Math.ceil(gap * 0.9));
    const sanityCost = Math.max(0, Math.ceil(gap * 0.35));
    const repCost = scene === 'social_charm' ? Math.max(0, Math.ceil(gap * 0.25)) : 0;

    setPlayerStats(prev => ({
      ...prev,
      mp: { ...prev.mp, current: Math.max(0, prev.mp.current - mpCost) },
      sanity: { ...prev.sanity, current: Math.max(0, prev.sanity.current - sanityCost) },
    }));
    if (repCost > 0) {
      setBetaStatus(prev => ({ ...prev, creditScore: Math.max(0, prev.creditScore - repCost) }));
    }

    let relationLine = '';
    if (scene === 'social_charm') {
      const cha = six.魅力 || 8;
      const bonus = cha >= 95 ? 12 : cha >= 80 ? 8 : cha >= 60 ? 5 : cha >= 40 ? 2 : 1;
      const selectedTargetId = selectedNPC?.id || '';
      const nameMatchedIds = npcs
        .filter(npc => {
          const name = (npc.name || '').trim();
          return name.length > 0 && text.includes(name);
        })
        .map(npc => npc.id);
      const targetIds = selectedTargetId
        ? [selectedTargetId]
        : nameMatchedIds.length > 0
          ? [nameMatchedIds[0]]
          : [];

      if (targetIds.length > 0) {
        setNpcs(prev =>
          prev.map(npc => {
            if (!targetIds.includes(npc.id)) return npc;
            if (npc.gender === 'female') {
              return normalizeNpcForUi({ ...npc, affection: Math.min(100, (npc.affection || 0) + bonus) });
            }
            return normalizeNpcForUi({ ...npc, trust: Math.min(100, (npc.trust || 0) + bonus) });
          }),
        );
        const targetName = npcs.find(n => n.id === targetIds[0])?.name || '目标';
        relationLine = `关系变化：${targetName} +${bonus}`;
      } else {
        relationLine = '关系变化：未命中具体NPC，本轮不改人物关系';
      }
    }

    return [
      `意志结算：${label}行为必定成功（无概率判定）`,
      `代价：MP-${mpCost}${sanityCost > 0 ? `，理智-${sanityCost}` : ''}${repCost > 0 ? `，信誉-${repCost}` : ''}`,
      `强度：属性值 ${power} / 难度 ${dc}（差值 ${gap}）`,
      ...(relationLine ? [relationLine] : []),
    ];
  };

  const handleConversion = (type: 'xp' | 'coin' | 'mp', amount: number) => {
    const rate = Math.max(0, effectivePlayerStats.psionic.conversionRate) / 100;
    const regionFactor = getExchangeRegionFactor(currentNarrativeLocation || '', playerGender);

    if (type === 'xp') {
      if (playerStats.mp.current < amount) return;
      const xpGained = Math.floor(amount * rate);
      if (xpGained <= 0) return;
      setPlayerStats(prev => ({
        ...prev,
        ...(() => {
          let rank = prev.psionic.level;
          let xp = prev.psionic.xp + xpGained;
          let cap = RANK_CONFIG[rank].maxXp;

          while (xp >= cap) {
            const n = nextRank(rank);
            if (!n) {
              xp = cap;
              break;
            }
            xp -= cap;
            rank = n;
            cap = RANK_CONFIG[rank].maxXp;
          }

          return {
            mp: {
              ...prev.mp,
              current: Math.max(0, prev.mp.current - amount),
              max: getMaxMpByGenderAndRank(playerGender, rank),
            },
            psionic: {
              ...prev.psionic,
              level: rank,
              xp: Math.min(xp, cap),
              maxXp: cap,
            },
          };
        })(),
      }));
      spawnFloatingText(`+${xpGained} 经验`, 'text-purple-400');
      return;
    }

    if (type === 'coin') {
      if (regionFactor === null) return;
      if (playerStats.mp.current < amount) return;
      const coinsGained = Math.floor(amount * rate * (regionFactor || 1));
      if (coinsGained <= 0) return;
      setPlayerStats(prev => ({ ...prev, mp: { ...prev.mp, current: prev.mp.current - amount }, credits: prev.credits + coinsGained }));
      return;
    }

    if (regionFactor === null) return;
    if (playerStats.credits < amount) return;
    const mpGained = Math.floor(amount * rate * (regionFactor || 1));
    if (mpGained <= 0) return;
    setPlayerStats(prev => ({
      ...prev,
      credits: prev.credits - amount,
      mp: { ...prev.mp, current: Math.min(prev.mp.max, prev.mp.current + mpGained) },
    }));
  };

  const handleUseItem = (item: Item) => {
    const parsed = parseRuntimeBonusFromText(`${item.name || ''} ${item.description || ''}`);
    if (parsed.charisma > 0 || Object.keys(parsed.sixDim || {}).length > 0) {
      setPlayerStats(prev => {
        const six = prev.sixDim || DEFAULT_SIX_DIM;
        const cap = six.cap || 99;
        return {
          ...prev,
          charisma: {
            ...prev.charisma,
            current: Math.min(prev.charisma.max, Math.max(0, prev.charisma.current + parsed.charisma)),
          },
          sixDim: {
            ...six,
            力量: Math.min(cap, Math.max(1, (six.力量 || 8) + (parsed.sixDim.力量 || 0))),
            敏捷: Math.min(cap, Math.max(1, (six.敏捷 || 8) + (parsed.sixDim.敏捷 || 0))),
            体质: Math.min(cap, Math.max(1, (six.体质 || 8) + (parsed.sixDim.体质 || 0))),
            感知: Math.min(cap, Math.max(1, (six.感知 || 8) + (parsed.sixDim.感知 || 0))),
            意志: Math.min(cap, Math.max(1, (six.意志 || 8) + (parsed.sixDim.意志 || 0))),
            魅力: Math.min(cap, Math.max(1, (six.魅力 || 8) + (parsed.sixDim.魅力 || 0))),
          },
        };
      });
    }
    if (parsed.conversion || parsed.recovery) {
      setPlayerStats(prev => ({
        ...prev,
        psionic: {
          ...prev.psionic,
          conversionRate: Math.max(0, prev.psionic.conversionRate + (parsed.conversion || 0)),
          recoveryRate: Math.max(0, prev.psionic.recoveryRate + (parsed.recovery || 0)),
        },
      }));
    }
    if (parsed.canFly) {
      setPlayerCoreAffixes(prev => {
        if (prev.some(a => /飞行|悬浮/.test(a.name))) return prev;
        return [
          ...prev,
          {
            id: `core_flight_${Date.now()}`,
            name: '状态：短距飞行',
            description: `由[${item.name}]触发，可进行短距飞行与越障。`,
            type: 'buff',
            source: '道具',
          },
        ];
      });
    }

    const sysMsg: Message = {
      id: Date.now().toString(),
      sender: 'System',
      content: `你使用了 [${item.name}]。${parsed.canFly ? '获得短距飞行能力。' : ''}`,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      type: 'narrative',
    };
    setMessages(prev => [...prev, sysMsg]);
    if (item.quantity > 1) {
      setPlayerInventory(prev => prev.map(i => (i.id === item.id ? { ...i, quantity: i.quantity - 1 } : i)));
    } else {
      setPlayerInventory(prev => prev.filter(i => i.id !== item.id));
      setSelectedItem(null);
    }
  };

  const processCommand = async (input: string) => {
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const actionMinutes = estimateActionMinutes(input);
    const nextElapsedMinutes = (mapRuntime.elapsedMinutes || 0) + actionMinutes;
    const nextGameTimeText = formatGameTime(nextElapsedMinutes);
    const nextGameDayPhase = getDayPhase(nextElapsedMinutes);
    const nextGameSceneHint = `${getSceneHintByPhase(nextGameDayPhase)}${activeEffectHint ? ` 当前增益：${activeEffectHint}` : ''}`;
    const playerMsg: Message = {
      id: `user_${Date.now()}`,
      sender: 'Player',
      content: input,
      timestamp: now,
      type: 'action',
    };

    setMessages(prev => {
      let base = prev;
      if (focusedLayerId) {
        const focusIndex = prev.findIndex(msg => msg.id === focusedLayerId);
        if (focusIndex >= 0) base = prev.slice(0, focusIndex + 1);
      }
      return [...base, playerMsg];
    });

    let layerContent = buildPseudoLayer({
      playerInput: input,
      location: currentNarrativeLocation || '未知区域',
      credits: effectivePlayerStats.credits,
      reputation: betaStatus.creditScore,
      gameTime: nextGameTimeText,
      dayPhase: nextGameDayPhase,
      sceneHint: nextGameSceneHint,
    });

    let aborted = false;
    let requestSeq = 0;
    if (apiConfig.enabled) {
      requestSeq = ++apiRequestSeqRef.current;
      const controller = new AbortController();
      apiAbortControllerRef.current = controller;
      setIsApiSending(true);
      setApiError('');
      try {
        const apiText = await requestApiMaintext(input, {
          gameTime: nextGameTimeText,
          dayPhase: nextGameDayPhase,
          location: currentNarrativeLocation || '未知区域',
          sceneHint: nextGameSceneHint,
        }, controller.signal);
        if (apiText) {
          layerContent = replaceMaintext(layerContent, apiText);
        } else {
          setApiError('本轮输出未检测到合格 <maintext>，已回退到系统伪0层正文模板。');
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          aborted = true;
        } else {
        const message = error instanceof Error ? error.message : '未知错误';
        setApiError(`API 调用失败: ${message}`);
        }
      } finally {
        if (apiRequestSeqRef.current === requestSeq) {
          setIsApiSending(false);
          apiAbortControllerRef.current = null;
        }
      }
    }

    if (aborted) {
      setMessages(prev => [
        ...prev,
        {
          id: `sys_abort_${Date.now()}`,
          sender: 'System',
          content: '本轮生成已手动停止。',
          timestamp: now,
          type: 'narrative',
        },
      ]);
      return;
    }

    const systemLayerMsg: Message = {
      id: `layer_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sender: 'System',
      content: layerContent,
      timestamp: now,
      type: 'narrative',
    };

    const parsedMaintext = parsePseudoLayer(layerContent).maintext || '';
    const settleSource = `${input}\n${parsedMaintext}`;
    const settlementLines = [
      ...settleIntentCostDeterministic(input),
      ...settleKillFromText(settleSource),
      ...settleStatusFromText(settleSource),
    ];

    setMessages(prev => {
      const next = [...prev, systemLayerMsg];
      if (settlementLines.length > 0) {
        next.push({
          id: `settle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          sender: 'System',
          content: settlementLines.join('\n'),
          timestamp: now,
          type: 'narrative',
        });
      }
      return next;
    });
    setMapRuntime(prev => ({
      ...prev,
      elapsedMinutes: nextElapsedMinutes,
      logs: [...(prev.logs || []), `+${actionMinutes}min -> ${nextGameTimeText}(${nextGameDayPhase})`].slice(-30),
    }));
    setFocusedLayerId(systemLayerMsg.id);
  };

  const rerollActiveLayer = (targetLayerId?: string) => {
    const targetLayer = targetLayerId
      ? layerMessages.find(layer => layer.id === targetLayerId) || activeLayerMessage
      : activeLayerMessage;
    if (!targetLayer) return;
    const layerIdx = messages.findIndex(msg => msg.id === targetLayer.id);
    if (layerIdx < 0) return;
    const latestPlayerInput =
      [...messages]
        .slice(0, layerIdx)
        .reverse()
        .find(msg => msg.sender === 'Player')?.content || '继续推进当前局势';
    const nextLayer = buildPseudoLayer({
      playerInput: latestPlayerInput,
      location: currentNarrativeLocation || '未知区域',
      credits: playerStats.credits,
      reputation: betaStatus.creditScore,
      gameTime: gameTimeText,
      dayPhase: gameDayPhase,
      sceneHint: gameSceneHint,
    });
    setMessages(prev => prev.map(msg => (msg.id === targetLayer.id ? { ...msg, content: nextLayer } : msg)));
    setFocusedLayerId(targetLayer.id);
  };

  const rerollByMessage = (messageId: string, sender: 'Player' | 'System') => {
    if (sender === 'System') {
      rerollActiveLayer(messageId);
      return;
    }
    const playerIdx = messages.findIndex(msg => msg.id === messageId && msg.sender === 'Player');
    if (playerIdx < 0) return;
    const playerInput = messages[playerIdx]?.content || '继续推进当前局势';
    const targetLayer = messages.slice(playerIdx + 1).find(msg => msg.sender === 'System' && hasPseudoLayer(msg.content));
    if (!targetLayer) {
      return;
    }
    const nextLayer = buildPseudoLayer({
      playerInput,
      location: currentNarrativeLocation || '未知区域',
      credits: playerStats.credits,
      reputation: betaStatus.creditScore,
      gameTime: gameTimeText,
      dayPhase: gameDayPhase,
      sceneHint: gameSceneHint,
    });
    setMessages(prev => prev.map(msg => (msg.id === targetLayer.id ? { ...msg, content: nextLayer } : msg)));
    setFocusedLayerId(targetLayer.id);
  };

  const openEditActiveLayer = (targetLayerId?: string) => {
    const targetLayer = targetLayerId
      ? layerMessages.find(layer => layer.id === targetLayerId) || activeLayerMessage
      : activeLayerMessage;
    if (!targetLayer) return;
    const parsed = parsePseudoLayer(targetLayer.content);
    setEditMaintextDraft(parsed.maintext);
    setFocusedLayerId(targetLayer.id);
    setIsEditLayerOpen(true);
  };

  const saveEditActiveLayer = () => {
    if (!activeLayerMessage) return;
    const nextContent = replaceMaintext(activeLayerMessage.content, editMaintextDraft);
    setMessages(prev => prev.map(msg => (msg.id === activeLayerMessage.id ? { ...msg, content: nextContent } : msg)));
    setIsEditLayerOpen(false);
  };

  const openEditPlayerMessage = (messageId: string) => {
    const target = messages.find(msg => msg.id === messageId && msg.sender === 'Player');
    if (!target) return;
    setEditPlayerMessageId(target.id);
    setEditPlayerMessageDraft(target.content || '');
    setIsEditPlayerMessageOpen(true);
  };

  const saveEditPlayerMessage = () => {
    if (!editPlayerMessageId) return;
    const trimmed = editPlayerMessageDraft.trim();
    if (!trimmed) return;
    setMessages(prev => prev.map(msg => (msg.id === editPlayerMessageId ? { ...msg, content: trimmed } : msg)));
    setIsEditPlayerMessageOpen(false);
    setEditPlayerMessageId(null);
  };

  const rollbackToLayer = (layerId: string) => {
    setMessages(prev => {
      const idx = prev.findIndex(msg => msg.id === layerId);
      if (idx < 0) return prev;
      return prev.slice(0, idx + 1);
    });
    setFocusedLayerId(layerId);
  };

  const deleteLayerById = (layerId: string) => {
    const nextMessages = messages.filter(msg => msg.id !== layerId);
    setMessages(nextMessages);
    const nextLayers = nextMessages.filter(msg => msg.sender === 'System' && hasPseudoLayer(msg.content));
    if (nextLayers.length === 0) {
      setFocusedLayerId(null);
      return;
    }
    if (focusedLayerId === layerId) {
      setFocusedLayerId(nextLayers[nextLayers.length - 1].id);
    }
  };

  const appendMapDescriptionToChat = (title: string, description: string, images: string[] = []) => {
    const now = Date.now();
    const summary = description?.trim() || '该节点暂无描述。';
    const imageBlock =
      images.length > 0
        ? `\n\n图片:\n${images
            .slice(0, 3)
            .map((url, index) => `![${title}-${index + 1}](${url})`)
            .join('\n')}`
        : '';
    setMessages(prev => [
      ...prev,
      {
        id: `map_desc_${now}_${Math.random().toString(36).slice(2, 7)}`,
        sender: 'System',
        name: '地图情报',
        content: `【${title}】\n${summary}${imageBlock}`,
        timestamp: new Date(now).toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
  };

  const importMapFromRecentChat = (mode: 'replace' | 'merge'): { ok: boolean; message: string } => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.sender === 'Player') continue;
      const patch = tryParseMapPatchFromText(msg.content || '');
      const parsed = patch?.map || tryParseMapFromText(msg.content || '');
      if (!parsed) continue;

      const finalMode = patch?.mode || mode;
      setWorldNodeMap(prev => (finalMode === 'replace' ? parsed : mergeWorldNodeMap(prev, parsed)));

      const now = Date.now();
      const action = finalMode === 'replace' ? '替换' : '合并';
      setMessages(prev => [
        ...prev,
        {
          id: `map_import_${now}_${Math.random().toString(36).slice(2, 7)}`,
          sender: 'System',
          name: '地图同步',
          content: `已从最近聊天中提取地图 JSON，并完成${action}。`,
          timestamp: new Date(now).toLocaleTimeString('zh-CN', { hour12: false }),
          type: 'narrative',
        },
      ]);
      return { ok: true, message: `已从最近聊天${action}地图` };
    }
    return { ok: false, message: '最近聊天未发现有效地图 JSON' };
  };

  const handleSend = async () => {
    const command = inputText.trim();
    if (!command || isApiSending) return;

    if (command === '/reroll' || command === '/重掷') {
      rerollActiveLayer();
      setInputText('');
      return;
    }

    if (command === '/clearsave' || command === '/清档') {
      try {
        window.localStorage.removeItem(LN_ARCHIVES_KEY);
        window.localStorage.removeItem(LN_LAST_ARCHIVE_ID_KEY);
      } catch (error) {
        console.warn('清理本地存档失败:', error);
      }
      setArchiveSlots([]);
      setSelectedArchiveId('');
      setArchiveNameInput('');
      setMessages(prev => [
        ...prev,
        {
          id: `sys_clear_save_${Date.now()}`,
          sender: 'System',
          content: '本地档案已清空。',
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          type: 'narrative',
        },
      ]);
      setInputText('');
      return;
    }

    setInputText('');
    await processCommand(command);
  };

  const handleStopGenerating = () => {
    const controller = apiAbortControllerRef.current;
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
    const stopTavernGenerate = (globalThis as { stopGeneration?: () => void }).stopGeneration;
    if (typeof stopTavernGenerate === 'function') {
      try {
        stopTavernGenerate();
      } catch {
        // ignore stop errors from host env
      }
    }
  };


  const handleSetupComplete = (config: GameConfig) => {
    const startRankConfig = RANK_CONFIG[config.startPsionicRank];
    const startMaxMp = getMaxMpByGenderAndRank(config.gender, config.startPsionicRank);
    const newStats: PlayerStats = {
      ...MOCK_PLAYER_STATS,
      credits: config.startCredits,
      mp: { current: startMaxMp, max: startMaxMp },
      psionic: {
        ...MOCK_PLAYER_STATS.psionic,
        level: config.startPsionicRank,
        maxXp: startRankConfig.maxXp,
        conversionRate: config.startConversionRate,
        recoveryRate: config.startRecoveryRate,
      },
      sanity: { ...MOCK_PLAYER_STATS.sanity, current: config.startPsionicRank === Rank.Lv5 ? 30 : 60 },
      charisma: config.gender === 'female' ? { current: 65, max: 100 } : { current: 40, max: 100 },
      sixDim:
        config.startSixDim ||
        (config.gender === 'female'
          ? { 力量: 9, 敏捷: 10, 体质: 8, 感知: 11, 意志: 9, 魅力: 12, freePoints: 0, cap: 99 }
          : { 力量: 10, 敏捷: 9, 体质: 10, 感知: 8, 意志: 9, 魅力: 7, freePoints: 0, cap: 99 }),
    };
    setPlayerStats(newStats);
    setPlayerGender(config.gender);
    setPlayerNeuralProtocol(config.neuralProtocol || (config.installBetaChip ? 'beta' : 'none'));
    setCoinVault({
      [Rank.Lv1]: config.startPsionicRank === Rank.Lv1 ? config.startCredits : 0,
      [Rank.Lv2]: config.startPsionicRank === Rank.Lv2 ? config.startCredits : 0,
      [Rank.Lv3]: config.startPsionicRank === Rank.Lv3 ? config.startCredits : 0,
      [Rank.Lv4]: config.startPsionicRank === Rank.Lv4 ? config.startCredits : 0,
      [Rank.Lv5]: config.startPsionicRank === Rank.Lv5 ? config.startCredits : 0,
    });
    setPlayerSoulLedger({
      [Rank.Lv1]: 0,
      [Rank.Lv2]: 0,
      [Rank.Lv3]: 0,
      [Rank.Lv4]: 0,
      [Rank.Lv5]: 0,
    });
    setPlayerCoreAffixes(
      config.gender === 'male'
        ? [{ id: 'core_affix_m_1', name: '状态：压制残响', description: '承压后短时抑制外泄。', type: 'debuff', source: '初始' }]
        : [{ id: 'core_affix_f_1', name: '状态：奇点凝附', description: '提升灵海稳定与吸附能力。', type: 'buff', source: '初始' }],
    );

    const baseBoard = config.selectedBoard || MOCK_CHIPS.find(c => c.type === 'board');
    const beta = config.installBetaChip ? MOCK_CHIPS.find(c => c.type === 'beta') : undefined;
    const equippedChips = [...(baseBoard ? [baseBoard] : []), ...(beta ? [beta] : []), ...config.selectedChips];
    setPlayerChips(equippedChips);
    const equippedChipIds = new Set(equippedChips.map(chip => chip.id));
    setStorageChips(MOCK_STORAGE_CHIPS.filter(chip => !equippedChipIds.has(chip.id)));
    setPlayerInventory([...config.selectedItems]);
    setPlayerLingshu(config.selectedLingshu || []);
    if (config.careerTracks && config.careerTracks.length > 0) {
      setCareerTracks(config.careerTracks);
    }
    setPlayerFaction({ ...MOCK_PLAYER_FACTION, name: config.factionName, headquarters: config.startingLocation });
    setMapRuntime({
      viewed: null,
      playerPosition: null,
      elapsedMinutes: 0,
      logs: [],
    });
    setSelectedBetaProfessionId(null);
    setBetaTasks([]);
    setAcceptedBetaTaskIds([]);
    setClaimableBetaTaskIds([]);
    setTaskDeadlines({});
    setBetaStatus(prev => ({
      ...prev,
      taxOfficerUnlocked: !!config.installBetaChip,
      taxOfficerBoundId: null,
      taxOfficerName: '',
      taxOfficeAddress: '',
      taxDeadline: prev.taxDeadline?.replaceAll('-', '.'),
    }));

    if (config.gender === 'male' && config.hasRedString) {
      setPlayerSkills(prev => [
        {
          id: 'ps_special_1',
          name: '灵弦：【本命】皇权回响',
          level: 5,
          description: '领袖级特质，转化效率锁定为 300%。',
          rankColor: 'red',
        },
        ...prev,
      ]);
    }

    const bootMsg: Message = {
      id: 'sys_init',
      sender: 'System',
      content: `初始化完成：角色「${config.name}」已载入。当前势力：${config.factionName}；当前位置：${config.startingLocation}。请直接输入你的开局叙事或第一步行动。`,
      timestamp: new Date().toLocaleTimeString('zh-CN'),
      type: 'narrative',
    };
    setMessages([bootMsg]);
    setFocusedLayerId(null);
    setSelectedNPC(null);
    setIsLayerPickerOpen(false);
    setGameStage('game');
  };

  const completeBetaTaskReward = (taskId: string) => {
    const task = betaTasks.find(t => t.id === taskId);
    if (!task || task.done) return;

    setBetaTasks(prev => prev.map(t => (t.id === taskId ? { ...t, done: true } : t)));
    setPlayerStats(prev => ({ ...prev, credits: prev.credits + task.creditReward }));
    setBetaStatus(prev => ({
      ...prev,
      creditScore: Math.min(120, prev.creditScore + task.scoreReward),
      deductionHistory: [
        {
          id: `beta_log_reward_${Date.now()}`,
          reason: `完成任务：${task.title}`,
          amount: task.scoreReward,
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'fine',
        },
        ...prev.deductionHistory,
      ],
    }));
    setBetaTasks(prev => prev.filter(t => t.id !== taskId));
    setAcceptedBetaTaskIds(prev => prev.filter(id => id !== taskId));
    setClaimableBetaTaskIds(prev => prev.filter(id => id !== taskId));
    setTaskDeadlines(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const handleApplyBetaUpgrade = () => {
    if (betaStatus.creditScore < 100) return;
    const nextLevel = (betaStatus.betaLevel || 1) + 1;
    const nextTier = getBetaTierTitle(nextLevel);
    setBetaStatus(prev => ({
      ...prev,
      betaLevel: nextLevel,
      betaTierName: nextTier,
      creditScore: Math.max(0, prev.creditScore - 100),
      deductionHistory: [
        {
          id: `beta_upgrade_${Date.now()}`,
          reason: `通过升等申请：Beta Lv.${nextLevel}`,
          amount: -100,
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'fine',
        },
        ...prev.deductionHistory,
      ],
    }));
  };

  const applyTaskPenaltyAndRemove = (taskId: string, reason: string) => {
    const task = betaTasks.find(t => t.id === taskId);
    if (!task) return;
    setPlayerStats(prev => ({ ...prev, credits: Math.max(0, prev.credits - task.creditReward) }));
    setBetaStatus(prev => ({
      ...prev,
      creditScore: Math.max(0, prev.creditScore - task.scoreReward),
      deductionHistory: [
        {
          id: `beta_penalty_${Date.now()}_${taskId}`,
          reason,
          amount: -task.scoreReward,
          timestamp: new Date().toLocaleString('zh-CN'),
          type: 'fine',
        },
        ...prev.deductionHistory,
      ],
    }));
    setBetaTasks(prev => prev.filter(t => t.id !== taskId));
    setAcceptedBetaTaskIds(prev => prev.filter(id => id !== taskId));
    setClaimableBetaTaskIds(prev => prev.filter(id => id !== taskId));
    setTaskDeadlines(prev => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const handleSelectBetaProfession = (professionId: string) => {
    if (selectedBetaProfessionId) return;
    const profession = availableBetaProfessions.find(p => p.id === professionId);
    if (!profession) return;
    setSelectedBetaProfessionId(professionId);
    setBetaTasks([]);
    setAcceptedBetaTaskIds([]);
    setClaimableBetaTaskIds([]);
    setTaskDeadlines({});
    setMessages(prev => [
      ...prev,
      {
        id: `beta_profession_${Date.now()}`,
        sender: 'System',
        content: `身份职业已锁定为「${profession.name}」。后续任务将按该职业分配。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'narrative',
      },
    ]);
  };

  const handleAcceptBetaTask = (taskId: string) => {
    const task = betaTasks.find(t => t.id === taskId);
    if (!task || task.done) return;
    if (acceptedBetaTaskIds.includes(taskId)) return;
    setAcceptedBetaTaskIds(prev => [...prev, taskId]);
    setTaskDeadlines(prev => ({ ...prev, [taskId]: Date.now() + 15 * 60 * 1000 }));
    setMessages(prev => [
      ...prev,
      {
        id: `beta_accept_${Date.now()}`,
        sender: 'System',
        content: `已接取 Beta 任务：「${task.title}」。请在 15 分钟内完成，AI 将判定任务状态。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'narrative',
      },
    ]);
  };

  const handleIgnoreBetaTask = (taskId: string) => {
    const task = betaTasks.find(t => t.id === taskId);
    if (!task || task.done) return;
    applyTaskPenaltyAndRemove(taskId, `忽略任务处罚：${task.title}`);
    setMessages(prev => [
      ...prev,
      {
        id: `beta_ignore_${Date.now()}`,
        sender: 'System',
        content: `已忽略任务「${task.title}」，扣除 ${task.creditReward} 灵能币与 ${task.scoreReward} 信誉。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'narrative',
      },
    ]);
  };

  const handleGenerateBetaTask = () => {
    if (!selectedBetaProfession) {
      setMessages(prev => [
        ...prev,
        {
          id: `beta_task_gen_denied_${Date.now()}`,
          sender: 'System',
          content: '请先在“芯片模组 > 管制协议 > 身份”中选择职业后再获取任务。',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          type: 'narrative',
        },
      ]);
      return;
    }
    const pool = selectedBetaProfession.taskTemplates;
    const template = pool[Math.floor(Math.random() * pool.length)];
    const newTask: BetaTask = {
      id: `beta_task_${Date.now()}`,
      title: `${selectedBetaProfession.name}·${template.title}`,
      detail: template.detail,
      scoreReward: template.scoreReward,
      creditReward: template.creditReward,
      done: false,
    };
    setBetaTasks(prev => [newTask, ...prev.slice(0, 7)]);
  };

  const handleBeginUpgradeTest = () => {
    if (playerNeuralProtocol === 'none') return;
    setPendingUpgradeEvaluation(true);
    setMessages(prev => [
      ...prev,
      {
        id: `beta_upgrade_start_${Date.now()}`,
        sender: 'System',
        content: `升等测试已发起。AI 回复包含“通过/合格/晋升”且信誉值≥100时，将自动执行 Beta 升级。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'narrative',
      },
    ]);
  };

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (!last || last.sender === 'Player') return;
    const text = last.content;

    if (pendingUpgradeEvaluation) {
      const upgradePassKeywords = ['通过', '合格', '晋升', '达标'];
      const passed = upgradePassKeywords.some(k => text.includes(k));
      if (passed) {
        handleApplyBetaUpgrade();
        setPendingUpgradeEvaluation(false);
      }
    }

    const taskPassKeywords = ['完成', '已执行', '通过', '达标', '合格'];
    const passSignal = taskPassKeywords.some(k => text.includes(k));
    if (passSignal) {
      const accepted = betaTasks.filter(t => acceptedBetaTaskIds.includes(t.id) && !claimableBetaTaskIds.includes(t.id));
      if (accepted.length > 0) {
        const matched =
          accepted.find(t => text.includes(t.title) || text.includes(t.title.slice(0, 3))) ||
          accepted[0];
        setClaimableBetaTaskIds(prev => (prev.includes(matched.id) ? prev : [...prev, matched.id]));
      }
    }
  }, [messages, pendingUpgradeEvaluation, betaTasks, acceptedBetaTaskIds, claimableBetaTaskIds]);

  useEffect(() => {
    if (!autoMapSyncEnabled) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender === 'Player') return;
    if (lastAutoMapSyncMessageIdRef.current === last.id) return;

    const patch = tryParseMapPatchFromText(last.content || '');
    if (!patch) return;

    lastAutoMapSyncMessageIdRef.current = last.id;
    setWorldNodeMap(prev => (patch.mode === 'replace' ? patch.map : mergeWorldNodeMap(prev, patch.map)));

    const now = Date.now();
    setMessages(prev => [
      ...prev,
      {
        id: `map_auto_sync_${now}_${Math.random().toString(36).slice(2, 7)}`,
        sender: 'System',
        name: '地图同步',
        content: `已自动应用地图补丁（${patch.mode === 'replace' ? '替换' : '合并'}）。`,
        timestamp: new Date(now).toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
  }, [messages, autoMapSyncEnabled]);

  useEffect(() => {
    const sweepExpiredTasks = () => {
      const now = Date.now();
      const expired = acceptedBetaTaskIds.filter(id => {
        const deadline = taskDeadlines[id];
        return typeof deadline === 'number' && now > deadline && !claimableBetaTaskIds.includes(id);
      });
      if (expired.length === 0) return;
      expired.forEach(id => {
        const task = betaTasks.find(t => t.id === id);
        if (task) {
          applyTaskPenaltyAndRemove(id, `任务超时处罚：${task.title}`);
        }
      });
    };
    sweepExpiredTasks();
    const timer = setInterval(sweepExpiredTasks, 30000);
    return () => clearInterval(timer);
  }, [acceptedBetaTaskIds, taskDeadlines, claimableBetaTaskIds, betaTasks]);

  useEffect(() => {
    if (!layerMenu) return;
    const close = () => setLayerMenu(null);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('click', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [layerMenu]);

  useEffect(() => {
    if (gameStage !== 'game') return;
    const timer = window.setTimeout(() => {
      saveAutoArchiveSilently();
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [
    gameStage,
    messages,
    playerStats,
    playerGender,
    playerSkills,
    npcs,
    contactGroups,
    playerChips,
    storageChips,
    playerInventory,
    playerLingshu,
    playerFaction,
    leftModuleTab,
    playerNeuralProtocol,
    careerTracks,
    betaStatus,
    betaTasks,
    acceptedBetaTaskIds,
    claimableBetaTaskIds,
    taskDeadlines,
    pendingUpgradeEvaluation,
    selectedBetaProfessionId,
    focusedLayerId,
    worldNodeMap,
    mapRuntime,
    playerSoulLedger,
    coinVault,
    playerCoreAffixes,
  ]);

  const handleContinueGame = () => {
    const lastId = window.localStorage.getItem(LN_LAST_ARCHIVE_ID_KEY) || selectedArchiveId;
    const target = archiveSlots.find(slot => slot.id === lastId) || archiveSlots[0];
    if (!target) {
      setGameStage('setup');
      return;
    }
    loadArchiveById(target.id);
  };

  const handleNewGame = () => {
    setSelectedNPC(null);
    setFocusedLayerId(null);
    setLayerMenu(null);
    setIsLayerPickerOpen(false);
    setGameStage('setup');
  };

  const handleNavToTax = () => {
    const target = betaStatus.taxOfficeAddress?.trim() || `${playerFaction.headquarters} · 税务征收机构`;
    const navMsg: Message = {
      id: `nav_tax_${Date.now()}`,
      sender: 'System',
      content: `导航已设定：${target}`,
      timestamp: new Date().toLocaleTimeString('zh-CN'),
      type: 'narrative',
    };
    setMessages(prev => [...prev, navMsg]);
  };

  const bindTaxOfficer = (candidate: TaxOfficerCandidate) => {
    setBetaStatus(prev => ({
      ...prev,
      taxOfficerUnlocked: true,
      taxOfficerBoundId: candidate.id,
      taxOfficerName: candidate.name,
      taxOfficeAddress: candidate.location,
    }));
    setNpcs(prev =>
      prev.map(npc =>
        npc.id === candidate.id
          ? normalizeNpcForUi({
              ...npc,
              isContact: true,
              group: npc.group || '税务关系',
              position: npc.position || '区域缴税官',
            })
          : npc,
      ),
    );
    setContactGroups(prev => (prev.includes('税务关系') ? prev : ['税务关系', ...prev]));
    setMessages(prev => [
      ...prev,
      {
        id: `tax_officer_bound_${Date.now()}`,
        sender: 'System',
        content: `税务官已绑定：${candidate.name}（${candidate.affiliation}）`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'narrative',
      },
    ]);
  };

  const forceAssignBetaTaxOfficer = (reason: 'activation' | 'fallback') => {
    const district = pickAirelaTaxDistrict(betaStatus.citizenId || '');
    const officerId = `airela_tax_officer_${district.id}`;
    const boundAlready = !!betaStatus.taxOfficerBoundId && !!betaStatus.taxOfficerName;
    if (boundAlready && reason === 'activation') {
      setBetaStatus(prev => ({ ...prev, taxOfficerUnlocked: true }));
      return;
    }

    setNpcs(prev => {
      const foundIndex = prev.findIndex(npc => npc.id === officerId || npc.name === district.officerName);
      const nextNpc: NPC = {
        id: officerId,
        name: district.officerName,
        gender: 'female',
        group: '税务关系',
        position: '分区税务官',
        affiliation: district.officerAffiliation,
        location: district.officeAddress,
        isContact: true,
        stats: MOCK_PLAYER_STATS,
        affection: 10,
        avatarUrl: 'https://via.placeholder.com/64',
        status: 'online',
        inventory: [],
        socialFeed: [],
      };
      if (foundIndex === -1) return normalizeNpcListForUi([nextNpc, ...prev]);
      const cloned = [...prev];
      cloned[foundIndex] = normalizeNpcForUi({ ...cloned[foundIndex], ...nextNpc });
      return normalizeNpcListForUi(cloned);
    });

    setContactGroups(prev => (prev.includes('税务关系') ? prev : ['税务关系', ...prev]));

    setBetaStatus(prev => ({
      ...prev,
      taxOfficerUnlocked: true,
      taxOfficerBoundId: officerId,
      taxOfficerName: district.officerName,
      taxOfficeAddress: district.officeAddress,
    }));

    setMessages(prev => [
      ...prev,
      {
        id: `beta_tax_assign_${Date.now()}`,
        sender: 'System',
        content: `Beta协议已生效：你被强制编入「${district.name}」，分配税务官「${district.officerName}」。`,
        timestamp: new Date().toLocaleTimeString('zh-CN'),
        type: 'narrative',
      },
    ]);
  };

  const handleAddTaxOfficerContact = () => {
    if (!betaStatus.taxOfficerUnlocked) {
      setMessages(prev => [
        ...prev,
        {
          id: `tax_officer_locked_${Date.now()}`,
          sender: 'System',
          content: '税务官绑定尚未解锁：当前未接入 Beta 税务协议。',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          type: 'narrative',
        },
      ]);
      return;
    }
    if (taxOfficerCandidates.length === 0) {
      setMessages(prev => [
        ...prev,
        {
          id: `tax_officer_no_candidate_${Date.now()}`,
          sender: 'System',
          content: '暂无可绑定对象：请先在标记人物中建立可交互 NPC。',
          timestamp: new Date().toLocaleTimeString('zh-CN'),
          type: 'narrative',
        },
      ]);
      return;
    }
    setIsTaxOfficerPickerOpen(true);
  };

  useEffect(() => {
    if (gameStage !== 'game') return;
    const prevProtocol = lastProtocolRef.current;
    const currentProtocol = playerNeuralProtocol;
    const justActivated = prevProtocol !== 'beta' && currentProtocol === 'beta';

    if (currentProtocol === 'beta') {
      if (justActivated || !betaStatus.taxOfficerBoundId) {
        forceAssignBetaTaxOfficer(justActivated ? 'activation' : 'fallback');
      } else if (!betaStatus.taxOfficerUnlocked) {
        setBetaStatus(prev => ({ ...prev, taxOfficerUnlocked: true }));
      }
    }
    lastProtocolRef.current = currentProtocol;
  }, [gameStage, playerNeuralProtocol, betaStatus.taxOfficerBoundId, betaStatus.taxOfficerUnlocked, betaStatus.citizenId]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as any).webkitRequestFullscreen) {
          await (document.documentElement as any).webkitRequestFullscreen();
        }
      } else if (document.exitFullscreen) {
        await document.exitFullscreen();
      } else if ((document as any).webkitExitFullscreen) {
        await (document as any).webkitExitFullscreen();
      }
    } catch (e) {
      console.error('Fullscreen error:', e);
    }
  };

  const openTavernPhone = useCallback(() => {
    const buttons = Array.from(document.querySelectorAll<HTMLElement>('.qr--button, .menu_button, button'));
    const target = buttons.find(el => (el.textContent || '').trim() === '手机');
    if (!target) {
      spawnFloatingText('未找到酒馆手机按钮', 'text-amber-300');
      return;
    }
    target.click();
  }, [spawnFloatingText]);

  const openTavernRegexSettings = useCallback(() => {
    const extButton = document.querySelector<HTMLElement>('#extensions-settings-button');
    if (extButton) extButton.click();

    const regexToggle =
      document.querySelector<HTMLElement>('#regex_container .inline-drawer-toggle') ||
      document.querySelector<HTMLElement>('#regex_container .inline-drawer-header');
    if (regexToggle) {
      regexToggle.click();
      regexToggle.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    const regexContainer = document.querySelector<HTMLElement>('#regex_container');
    if (regexContainer) {
      regexContainer.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    spawnFloatingText('未找到脚本/正则设置区', 'text-amber-300');
  }, [spawnFloatingText]);

  const availableLingshuEquipItems = useMemo(
    () => playerInventory.filter(item => isLingshuEquipableItem(item)),
    [playerInventory],
  );
  const availableResonanceMaterials = useMemo(
    () =>
      playerInventory.filter(
        item =>
          item.category === 'material' &&
          item.quantity > 0 &&
          (item.name.includes('人体部位') || item.name.includes('灵核') || item.name.includes('灵魂')),
      ),
    [playerInventory],
  );

  const playerSpiritNpc: NPC = useMemo(() => {
    const getPartSkills = (part: LingshuPart): Skill[] =>
      part.spiritSkills ?? (part.spiritSkill ? [part.spiritSkill] : []);

    const bodyParts = (playerLingshu || []).map((part, index) => {
      // Backward compatibility for old saves that may miss `id`.
      const normalizedId = part.id || `ls_${part.key || 'part'}_${index + 1}`;
      return {
        id: normalizedId,
        name: part.name,
        key: part.key || normalizedId,
        rank: part.rank,
        strengthProgress: part.strengthProgress ?? 0,
        description: part.description,
        skills: getPartSkills(part),
        equippedItems: part.equippedItems ?? (part.equippedItem ? [part.equippedItem] : []),
        statusAffixes: part.statusAffixes || [],
        maxSkillSlots: part.maxSkillSlots || 3,
        maxEquipSlots: part.maxEquipSlots || DEFAULT_LINGSHU_EQUIP_SLOTS,
      };
    });

    return {
      id: 'player_female_nexus',
      name: '玩家灵枢',
      gender: playerGender,
      group: '',
      position: '灵枢操作者',
      affiliation: playerFaction.name,
      location: playerFaction.headquarters,
      isContact: false,
      stats: playerStats,
      affection: 0,
      bodyParts,
      chips: [],
      avatarUrl: 'https://via.placeholder.com/64',
      status: 'online',
      inventory: playerInventory,
      socialFeed: [],
    };
  }, [playerGender, playerLingshu, playerFaction.headquarters, playerFaction.name, playerInventory, playerStats]);

  const moduleTabs: { id: LeftModuleTab; label: string }[] = [
    { id: 'chips', label: '芯片模组' },
    { id: 'lingshu', label: '灵枢' },
    { id: 'inventory', label: '物品栏' },
  ];
  const nextRankForCross = useMemo(() => {
    const lv = rankToLevel(playerStats.psionic.level);
    return lv >= 5 ? null : levelToRank(lv + 1);
  }, [playerStats.psionic.level]);
  const nextRankCoin = nextRankForCross ? coinVault[nextRankForCross] || 0 : 0;

  const renderContent = () => {
    if (gameStage === 'start') return <StartScreen onStart={() => setGameStage('splash')} />;
    if (gameStage === 'splash') return <SplashScreen onNewGame={handleNewGame} onContinue={handleContinueGame} canContinue={archiveSlots.length > 0} />;
    if (gameStage === 'setup') return <GameSetup onComplete={handleSetupComplete} />;

    return (
      <>
        {floatingTexts.map(ft => (
          <div key={ft.id} className={`fixed pointer-events-none z-[100] animate-float-up text-lg font-bold ${ft.color}`} style={{ left: `${ft.x}%`, top: `${ft.y}%` }}>
            {ft.text}
          </div>
        ))}

        <CareerLineEditorModal
          open={isCareerEditorOpen}
          onClose={() => setIsCareerEditorOpen(false)}
          tracks={careerTracks}
          onChangeTracks={setCareerTracks}
        />

        {isSpiritCoreModalOpen && (
          <PlayerSpiritCoreModal
            skills={playerSkills}
            rank={playerStats.psionic.level}
            gender={playerGender}
            conversionRate={effectiveConversionRate}
            recoveryRate={effectiveRecoveryRate}
            baseDailyRecovery={playerGender === 'female' ? 30 : 120}
            coreAffixes={playerCoreAffixes}
            soulLedger={playerSoulLedger}
            onClose={() => setIsSpiritCoreModalOpen(false)}
            onAddSkill={handleAddPlayerSkill}
            onRemoveSkill={handleRemovePlayerSkill}
          />
        )}

        {isMobileViewport && (leftOpen || rightOpen) && (
          <div
            className="fixed inset-0 z-30 bg-black/45 md:hidden"
            onClick={() => {
              setLeftOpen(false);
              setRightOpen(false);
            }}
          />
        )}

        <aside
          onClick={e => e.stopPropagation()}
          className={`border-r border-fuchsia-900/20 flex flex-col bg-[#050205]/95 z-40 md:h-full transition-all duration-300 absolute md:relative h-full overflow-y-auto custom-scrollbar scrollbar-hidden ${
            leftOpen ? 'w-full md:w-80 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-none'
          }`}
        >
          <button onClick={() => setLeftOpen(false)} className="md:hidden absolute top-2 right-2 p-2 text-slate-500 z-50">
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 space-y-3 min-w-[320px] pb-4 px-4 pt-4">
            <CyberPanel title="生理监测" className="mb-2" noPadding variant="gold">
              <PlayerStatePanel stats={effectivePlayerStats} hasBetaChip={hasBetaChip} onOpenSpiritCore={() => setIsSpiritCoreModalOpen(true)} gender={playerGender} />
            </CyberPanel>

            <CyberPanel title="功能面板" className="mb-2" noPadding>
              <div className="p-3 bg-black/40 space-y-3">
                <div className={`grid gap-2 ${moduleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  {moduleTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setLeftModuleTab(tab.id)}
                      className={`border px-2 py-1.5 text-xs font-bold transition-colors ${
                        leftModuleTab === tab.id
                          ? 'border-fuchsia-500 bg-fuchsia-900/20 text-fuchsia-300'
                          : 'border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </CyberPanel>

            {leftModuleTab === 'chips' && (
              <ChipPanel
                chips={playerChips}
                storageChips={storageChips}
                status={betaStatus}
                neuralProtocol={playerNeuralProtocol}
                onNavigateToTax={handleNavToTax}
                onEquip={handleEquipChip}
                onUnequip={handleUnequipChip}
                onAddTaxOfficerContact={handleAddTaxOfficerContact}
                onOpenCareerIdentity={() => setIsCareerEditorOpen(true)}
              />
            )}

            {leftModuleTab === 'lingshu' && (
              <CyberPanel title="灵枢系统" className="flex-1 min-h-[220px]" noPadding allowExpand collapsible>
                <div className="p-3 bg-black/50 min-h-full">
                  <SpiritNexus
                    npc={playerSpiritNpc}
                    isReadOnly={false}
                    availableEquipItems={availableLingshuEquipItems}
                    availableResonanceMaterials={availableResonanceMaterials}
                    currentMp={playerStats.mp.current}
                    onForgetSkill={handleForgetLingshuSkill}
                    onLearnSkill={handleLearnLingshuSkill}
                    onInjectEnergy={handleInjectLingshuEnergy}
                    onEquipItem={handleEquipLingshuItem}
                    onUnequipItem={handleUnequipLingshuItem}
                    onRemoveAffix={handleRemoveLingshuAffix}
                  />
                </div>
              </CyberPanel>
            )}

            {leftModuleTab === 'inventory' && (
              <CyberPanel title="物品栏" className="flex-1 min-h-[150px] border-t-0" allowExpand collapsible>
                {selectedItem && <ItemDetailView item={selectedItem} onClose={() => setSelectedItem(null)} onUse={handleUseItem} />}
                <div className="p-3 bg-black/50 min-h-full">
                  <div className="grid grid-cols-4 gap-2">
                    {playerInventory.slice(0, 8).map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="aspect-square border border-slate-800/50 bg-[#1a0b1a]/50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-fuchsia-900/30 hover:border-fuchsia-500/50 transition-colors"
                      >
                        <span className="text-xl">{item.icon}</span>
                        <span className="text-[9px] text-slate-400 mt-1">x{item.quantity}</span>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - playerInventory.length) }).map((_, i) => (
                      <div key={i} className="aspect-square border border-slate-800/30 border-dashed rounded-lg bg-white/5 opacity-30" />
                    ))}
                  </div>
                  <div
                    onClick={() => setIsInventoryOpen(true)}
                    className="flex items-center justify-center text-[10px] text-slate-500 mt-3 cursor-pointer hover:text-fuchsia-400 border border-dashed border-slate-800 rounded-lg p-2 hover:border-fuchsia-500/30 transition-colors"
                  >
                    <Package className="w-3 h-3 mr-1" /> 打开物品库
                  </div>
                </div>
              </CyberPanel>
            )}

          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col relative z-0 h-full w-full bg-[#080408]">
          <div className="h-12 border-b border-white/5 flex items-center px-4 justify-between bg-black/40 shrink-0 backdrop-blur-sm">
            <div className="md:hidden">
              <button
                onClick={() => {
                  setLeftOpen(true);
                  if (isMobileViewport) setRightOpen(false);
                }}
                className="p-2 text-fuchsia-500"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <MapIcon className="w-4 h-4 text-fuchsia-500" />
              <span>区域：</span>
              <span className="text-white font-bold">{currentNarrativeLocation || '未知区域'}</span>
              <span className="text-slate-600">|</span>
              <span>时间：</span>
              <span className="text-cyan-300 font-bold">{gameTimeText}</span>
              <span className="text-amber-300">({gameDayPhase})</span>
            </div>
            <div className="md:hidden">
              <button
                onClick={() => {
                  setRightOpen(true);
                  if (isMobileViewport) setLeftOpen(false);
                }}
                className="p-2 text-fuchsia-500"
              >
                <Users className="w-5 h-5" />
              </button>
            </div>
          </div>

          <NarrativeFeed
            messages={visibleMessages}
            pseudoLayerMode
            focusLayerId={focusedLayerId}
            onLayerContextMenu={payload => {
              if (payload.sender === 'System') setFocusedLayerId(payload.messageId);
              setLayerMenu(payload);
            }}
          />

          <ActionMenu
            stats={effectivePlayerStats}
            onConvert={handleConversion}
            onCrossLevelConvert={handleCrossLevelExchange}
            nextRankCoin={nextRankCoin}
            onOpenPhone={openTavernPhone}
          />

          <div className="p-4 border-t border-white/5 bg-black/60 shrink-0 backdrop-blur-md">
            <div className="flex gap-2">
              <span className="px-2 py-3 text-fuchsia-500 font-mono text-lg">{'>'}</span>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isApiSending && handleSend()}
                placeholder="输入行动指令..."
                className="flex-1 bg-transparent border-b border-slate-800 text-fuchsia-100 px-2 py-3 focus:outline-none focus:border-fuchsia-500 font-mono text-sm placeholder:text-slate-700"
              />
              <button
                onClick={isApiSending ? handleStopGenerating : handleSend}
                title={isApiSending ? '停止生成' : '发送'}
                className={`px-4 transition-colors ${isApiSending ? 'text-cyan-300 hover:text-white' : 'text-fuchsia-500 hover:text-white'}`}
              >
                {isApiSending ? <Square className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            {apiError && <div className="mt-2 text-[11px] text-red-400">{apiError}</div>}
          </div>
        </main>

        <aside
          onClick={e => e.stopPropagation()}
          className={`border-l border-fuchsia-900/20 flex flex-col bg-[#050205]/95 z-40 h-full transition-all duration-300 absolute md:relative right-0 ${
            rightOpen ? 'w-full md:w-[450px] translate-x-0' : 'w-0 translate-x-full md:w-0 overflow-hidden border-none'
          }`}
        >
          <div className="flex border-b border-white/10 min-w-[380px]">
            {[
              { id: 'contacts', icon: <Users className="w-4 h-4" />, label: '标记人物' },
              { id: 'settings', icon: <Settings className="w-4 h-4" />, label: '设置' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'contacts' | 'settings')}
                className={`flex-1 py-3 text-xs font-bold uppercase flex flex-col items-center gap-1 transition-all ${
                  activeTab === tab.id ? 'text-fuchsia-400 bg-fuchsia-950/20 border-b-2 border-fuchsia-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
            <button onClick={() => setRightOpen(false)} className="md:hidden px-4 text-slate-500 border-l border-white/10">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 pr-6 ln-carbon min-w-[380px] custom-scrollbar scrollbar-hidden">
            {activeTab === 'contacts' && (
              <div className="space-y-6 h-full flex flex-col">
                {!selectedNPC ? (
                  <ContactList
                    npcs={npcs}
                    onSelect={setSelectedNPC}
                    onUpdateNpc={handleUpdateNpc}
                    groups={contactGroups}
                    onUpdateGroups={setContactGroups}
                    onDeleteGroup={handleRemoveGroup}
                    currentLocation={currentNarrativeLocation || '未知区域'}
                  />
                ) : (
                  <NPCProfile npc={selectedNPC} onBack={() => setSelectedNPC(null)} />
                )}
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <CyberPanel title="档案" noPadding allowExpand collapsible>
                  <div className="p-3 bg-black/40 space-y-3">
                    <div className="text-xs text-slate-400">刷新后默认回到开局界面，继续游戏会读取最近档案。</div>
                    <input
                      type="text"
                      value={archiveNameInput}
                      onChange={e => setArchiveNameInput(e.target.value)}
                      placeholder="档案名称（可选）"
                      className="w-full bg-black/50 border border-slate-700 px-2 py-2 text-xs text-white"
                    />
                    <select
                      value={selectedArchiveId}
                      onChange={e => {
                        const nextId = e.target.value;
                        setSelectedArchiveId(nextId);
                        const found = archiveSlots.find(slot => slot.id === nextId);
                        setArchiveNameInput(found?.name || '');
                      }}
                      className="w-full bg-black/50 border border-slate-700 px-2 py-2 text-xs text-white"
                    >
                      <option value="">未选择档案</option>
                      {archiveSlots
                        .slice()
                        .sort((a, b) => b.updatedAt - a.updatedAt)
                        .map(slot => (
                          <option key={slot.id} value={slot.id}>
                            {slot.name} · {new Date(slot.updatedAt).toLocaleString('zh-CN')}
                          </option>
                        ))}
                    </select>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={saveCurrentArchive}
                        disabled={gameStage !== 'game'}
                        className="border border-cyan-700 text-cyan-300 hover:text-white hover:border-cyan-500 px-2 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <Save className="w-3.5 h-3.5" /> 保存档案
                      </button>
                      <button
                        type="button"
                        onClick={() => selectedArchiveId && loadArchiveById(selectedArchiveId)}
                        disabled={!selectedArchiveId}
                        className="border border-fuchsia-700 text-fuchsia-300 hover:text-white hover:border-fuchsia-500 px-2 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> 读取档案
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={deleteSelectedArchive}
                      disabled={!selectedArchiveId}
                      className="w-full border border-red-800 text-red-300 hover:text-white hover:border-red-600 px-2 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 删除选中档案
                    </button>
                  </div>
                </CyberPanel>

                <CyberPanel title="脚本与正则" noPadding allowExpand collapsible>
                  <div className="p-3 bg-black/40 space-y-2">
                    <div className="text-xs text-slate-400">打开酒馆扩展设置并定位到正则区域。</div>
                    <button
                      type="button"
                      onClick={openTavernRegexSettings}
                      className="w-full border border-amber-700 text-amber-300 hover:text-white hover:border-amber-500 px-2 py-1.5 text-xs"
                    >
                      打开脚本/正则
                    </button>
                  </div>
                </CyberPanel>

                <div className="text-[11px] text-slate-500 px-1">
                  当前档案：{selectedArchiveId ? archiveSlots.find(slot => slot.id === selectedArchiveId)?.name || '未命名' : '未选择'}
                </div>
              </div>
            )}
          </div>
        </aside>

        {layerMenu && (
          <div
            className="fixed inset-0 z-[130]"
            onClick={() => setLayerMenu(null)}
            onContextMenu={e => {
              e.preventDefault();
              setLayerMenu(null);
            }}
          >
            <div
              className="absolute min-w-[180px] border border-fuchsia-900/60 bg-[#0a0410]/95 shadow-xl"
              style={{ left: layerMenu.x, top: layerMenu.y }}
              onClick={e => e.stopPropagation()}
            >
              {layerMenu.sender === 'System' && (
                <button
                  type="button"
                  onClick={() => {
                    setFocusedLayerId(layerMenu.messageId);
                    setIsLayerPickerOpen(true);
                    setLayerMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-fuchsia-900/30"
                >
                  读档楼层
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (layerMenu.sender === 'System') {
                    openEditActiveLayer(layerMenu.messageId);
                  } else {
                    openEditPlayerMessage(layerMenu.messageId);
                  }
                  setLayerMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-fuchsia-900/30 border-t border-slate-800"
              >
                {layerMenu.sender === 'System' ? '修改对话' : '修改玩家输入'}
              </button>
              <button
                type="button"
                onClick={() => {
                  rerollByMessage(layerMenu.messageId, layerMenu.sender);
                  setLayerMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-fuchsia-900/30 border-t border-slate-800"
              >
                {layerMenu.sender === 'System' ? 'reroll 当前层' : 'reroll 该回合'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteLayerById(layerMenu.messageId);
                  setLayerMenu(null);
                }}
                className="w-full text-left px-3 py-2 text-xs text-red-300 hover:bg-red-900/30 border-t border-slate-800"
              >
                删除对话
              </button>
            </div>
          </div>
        )}

        {isLayerPickerOpen && (
          <div
            className="fixed inset-0 z-[131] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setIsLayerPickerOpen(false)}
          >
            <div
              className="w-full max-w-2xl border border-fuchsia-900/60 rounded bg-[#07030b] p-3"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="text-sm font-bold text-fuchsia-300">读档楼层</div>
                <button
                  type="button"
                  onClick={() => setIsLayerPickerOpen(false)}
                  className="text-xs px-2 py-1 border border-slate-700 text-slate-300 hover:text-white"
                >
                  关闭
                </button>
              </div>
              <div className="text-xs text-slate-400 mt-2 mb-3">点击任意楼层会立即回退到该楼层，后续楼层会被清除。</div>
              <div className="max-h-[55vh] overflow-auto border border-slate-800 bg-black/30 custom-scrollbar scrollbar-hidden">
                {visibleLayerMessages.length === 0 ? (
                  <div className="text-xs text-slate-500 p-3">暂无楼层可读档。</div>
                ) : (
                  visibleLayerMessages.map((layer, idx) => {
                    const parsed = parsePseudoLayer(layer.content);
                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => {
                          rollbackToLayer(layer.id);
                          setIsLayerPickerOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 border-b border-slate-800 last:border-b-0 ${
                          focusedLayerId === layer.id ? 'bg-fuchsia-900/20 text-fuchsia-200' : 'text-slate-300 hover:bg-slate-900/50'
                        }`}
                      >
                        <div className="text-xs font-mono">第 {idx + 1} 层 · {layer.id}</div>
                        <div className="text-[11px] text-slate-500 truncate">{parsed.sum || '无小结'}</div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {isTaxOfficerPickerOpen && (
          <div className="fixed inset-0 z-[132] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setIsTaxOfficerPickerOpen(false)}>
            <div className="w-full max-w-2xl border border-fuchsia-900/60 rounded bg-[#07030b] p-3" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="text-sm font-bold text-fuchsia-300">选择税务官</div>
                <button
                  type="button"
                  onClick={() => setIsTaxOfficerPickerOpen(false)}
                  className="text-xs px-2 py-1 border border-slate-700 text-slate-300 hover:text-white"
                >
                  关闭
                </button>
              </div>
              <div className="text-xs text-slate-400 mt-2 mb-3">优先展示夜莺线索与已标记人物。选择后会写入 Beta 税务档案。</div>
              <div className="max-h-[55vh] overflow-auto border border-slate-800 bg-black/30 custom-scrollbar scrollbar-hidden">
                {taxOfficerCandidates.length === 0 ? (
                  <div className="text-xs text-slate-500 p-3">暂无可绑定对象。</div>
                ) : (
                  taxOfficerCandidates.map(candidate => {
                    const selected = betaStatus.taxOfficerBoundId === candidate.id;
                    return (
                      <div key={candidate.id} className="px-3 py-2 border-b border-slate-800 last:border-b-0 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-sm font-bold ${selected ? 'text-fuchsia-300' : 'text-slate-200'}`}>{candidate.name}</div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {candidate.affiliation} · {candidate.location} · {candidate.group}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            bindTaxOfficer(candidate);
                            setIsTaxOfficerPickerOpen(false);
                          }}
                          className={`shrink-0 text-xs px-2 py-1 border ${
                            selected
                              ? 'border-fuchsia-600 text-fuchsia-300'
                              : 'border-cyan-700 text-cyan-300 hover:text-white hover:border-cyan-500'
                          }`}
                        >
                          {selected ? '已绑定' : '绑定'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {isInventoryOpen && (
          <InventoryModal title="物品库" items={playerInventory} onClose={() => setIsInventoryOpen(false)} isOwner={true} />
        )}

        {isEditLayerOpen && (
          <div className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-3xl border border-cyan-900/60 rounded bg-[#06060a] p-4 space-y-3">
              <div className="text-sm font-bold text-cyan-300">编辑当前层正文（仅 maintext）</div>
              <textarea
                value={editMaintextDraft}
                onChange={e => setEditMaintextDraft(e.target.value)}
                rows={14}
                className="w-full bg-black/50 border border-slate-700 text-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditLayerOpen(false)}
                  className="px-3 py-1.5 text-xs border border-slate-700 text-slate-300 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveEditActiveLayer}
                  className="px-3 py-1.5 text-xs border border-cyan-700 text-cyan-300 hover:text-white hover:border-cyan-500"
                >
                  保存正文
                </button>
              </div>
            </div>
          </div>
        )}

        {isEditPlayerMessageOpen && (
          <div className="fixed inset-0 z-[141] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-2xl border border-fuchsia-900/60 rounded bg-[#06060a] p-4 space-y-3">
              <div className="text-sm font-bold text-fuchsia-300">编辑玩家输入</div>
              <textarea
                value={editPlayerMessageDraft}
                onChange={e => setEditPlayerMessageDraft(e.target.value)}
                rows={8}
                className="w-full bg-black/50 border border-slate-700 text-slate-200 px-3 py-2 text-sm"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditPlayerMessageOpen(false);
                    setEditPlayerMessageId(null);
                  }}
                  className="px-3 py-1.5 text-xs border border-slate-700 text-slate-300 hover:text-white"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={saveEditPlayerMessage}
                  className="px-3 py-1.5 text-xs border border-fuchsia-700 text-fuchsia-300 hover:text-white hover:border-fuchsia-500"
                >
                  保存输入
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="ln-root flex flex-col md:flex-row bg-[#030005] text-slate-200 font-sans selection:bg-fuchsia-500/30 relative">
      {renderContent()}
      <button
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-[60] bg-[#0f0510] border border-fuchsia-900/50 text-fuchsia-500 hover:text-white hover:bg-fuchsia-900 transition-all flex items-center justify-center w-8 h-8 rounded-md shadow-[0_0_10px_rgba(219,39,119,0.2)] animate-in fade-in slide-in-from-right-2"
        title={isFullscreen ? '退出全屏' : '进入全屏'}
      >
        {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
      </button>
      {gameStage === 'game' && (
        <>
          <button
            onClick={() => setLeftOpen(v => !v)}
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-[58] w-7 h-20 items-center justify-center rounded-r-xl border border-fuchsia-900/50 bg-[#0b040f]/90 text-fuchsia-500 hover:text-white hover:bg-fuchsia-900/30 transition-all ${
              leftOpen ? 'left-[320px]' : 'left-0'
            }`}
            title={leftOpen ? '收起左侧栏' : '展开左侧栏'}
          >
            {leftOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setRightOpen(v => !v)}
            className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-[58] w-7 h-20 items-center justify-center rounded-l-xl border border-fuchsia-900/50 bg-[#0b040f]/90 text-fuchsia-500 hover:text-white hover:bg-fuchsia-900/30 transition-all ${
              rightOpen ? 'right-[450px]' : 'right-0'
            }`}
            title={rightOpen ? '收起右侧栏' : '展开右侧栏'}
          >
            {rightOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </>
      )}
    </div>
  );
};

export default App;

