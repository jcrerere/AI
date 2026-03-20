import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CyberPanel from './components/ui/CyberPanel';
import { Suspense, lazy } from 'react';
import PlayerStatePanel from './components/left/PlayerStatePanel';
import ChipPanel from './components/left/ChipPanel';
import PsionicEconomyPanel from './components/left/PsionicEconomyPanel';
import StatusPenaltyPanel from './components/left/StatusPenaltyPanel';
import LingshuStatusPanel from './components/left/LingshuStatusPanel';
import SpiritNexus from './components/right/SpiritNexus';
import type { SocialImportDraft } from './components/right/LingnetPhonePanel';
import NarrativeFeed from './components/center/NarrativeFeed';
import ItemDetailView from './components/ui/ItemDetailView';
import InventoryModal from './components/ui/InventoryModal';
import PlayerSpiritCoreModal from './components/ui/PlayerSpiritCoreModal';
import CareerLineEditorModal from './components/ui/CareerLineEditorModal';
import LocationControlHint from './components/ui/LocationControlHint';
import StartScreen from './components/flow/StartScreen';
import SplashScreen from './components/flow/SplashScreen';
import GameSetup from './components/flow/GameSetup';
import {
  Message,
  NPC,
  Item,
  GameConfig,
  PlayerStats,
  Chip,
  PlayerFaction,
  Rank,
  Skill,
  PlayerCivilianStatus,
  BetaTask,
  CareerTrack,
  WorldNodeMapData,
  MapRuntimeData,
  LingshuPart,
  RuntimeAffix,
  BodyPart,
  DirectMessage,
  SocialPost,
  MonthlySettlementRecord,
  NpcDarknetProfile,
  NpcDarknetRecord,
  NpcDarknetService,
  FinanceLedgerEntry,
  PlayerResidenceState,
  ResidenceProfile,
} from './types';
import { buildPseudoLayer, buildPseudoLayerFromParts, hasPseudoLayer, parsePseudoLayer, replaceMaintext, replaceNpcData, replaceSum } from './utils/pseudoLayer';
import {
  MOCK_MESSAGES,
  MOCK_CHIPS,
  MOCK_INVENTORY,
  MOCK_PLAYER_STATS,
  MOCK_PLAYER_STATUS,
  MOCK_PLAYER_FACTION,
  MOCK_STORAGE_CHIPS,
  RANK_CONFIG,
} from './constants';
import { mergeWorldNodeMap, normalizeWorldNodeMap, tryParseMapFromText, tryParseMapPatchFromText } from './utils/mapData';
import { createEmptyWorldMap, isWorldMapEmpty, loadDefaultQilingMap } from './utils/mapLoader';
import { pullPseudoLayerMessagesFromTavern, resolveTavernChatBridge } from './utils/tavernChat';
import { buildDefaultSetupPack, cloneCareerTracks, cloneChipList } from './data/setupPack';
import { applyNpcCodexOverlay, buildNpcDirectorPrompt, getNpcDirectorKeepAliveTurns, getNpcDirectorLookupTokens } from './data/npcCodex';
import { resolveNpcCodexAccessState } from './utils/npcCodex';
import { resolveLocationJurisdiction } from './utils/locationJurisdiction';
import { resolveLocationVisualTheme } from './utils/locationTheme';
import { Users, Map as MapIcon, Send, Square, Package, X, Menu, Maximize, Minimize, ChevronLeft, ChevronRight, Settings, Save, Trash2, FolderOpen, Smartphone, ScrollText } from 'lucide-react';

type GameStage = 'start' | 'splash' | 'setup' | 'game';
type LeftModuleTab = 'chips' | 'economy' | 'lingshu' | 'inventory';
type RightPanelTab = 'contacts' | 'phone' | 'system' | 'settings';
const LN_ARCHIVES_KEY_PREFIX = 'ln_archives_v2';
const LN_LAST_ARCHIVE_ID_KEY_PREFIX = 'ln_last_archive_id_v2';
const LN_API_CONFIG_KEY = 'ln_api_config_v1';
const LN_AUTO_ARCHIVE_ID = 'archive_auto_latest_v1';
const MAX_ARCHIVE_SLOTS = 20;
const LN_DEFAULT_ARCHIVE_SCOPE = 'global';
const LN_DEFAULT_PLAYER_NAME = '未命名接入者';

const ContactList = lazy(() => import('./components/right/ContactList'));
const NPCProfile = lazy(() => import('./components/right/NPCProfile'));
const LingnetPhonePanel = lazy(() => import('./components/right/LingnetPhonePanel'));
const MonthlySettlementPanel = lazy(() => import('./components/right/MonthlySettlementPanel'));
const ResidencePanel = lazy(() => import('./components/right/ResidencePanel'));
const TaxDossierPanel = lazy(() => import('./components/right/TaxDossierPanel'));

const LazyPanelFallback: React.FC<{ title: string; detail?: string }> = ({ title, detail }) => (
  <CyberPanel title={title} noPadding allowExpand collapsible>
    <div className="space-y-3 p-4 bg-black/35">
      <div className="h-3 w-24 rounded-full bg-white/8" />
      <div className="h-3 w-full rounded-full bg-white/6" />
      <div className="h-3 w-5/6 rounded-full bg-white/6" />
      <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-3 text-xs text-slate-500">
        {detail || '模块正在按需装载。'}
      </div>
    </div>
  </CyberPanel>
);

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

const DEFAULT_CAREER_TRACKS: CareerTrack[] = buildDefaultSetupPack().careerTracks;

interface FloatingText {
  id: number;
  text: string;
  x: number;
  y: number;
  color: string;
}

interface LnSaveData {
  version: 1 | 2;
  playerName?: string;
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
  leftModuleTab: LeftModuleTab;
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
  monthlySettlementLog?: MonthlySettlementRecord[];
  settlementCheckpointMonth?: string | null;
  financeLedger?: FinanceLedgerEntry[];
  playerResidence?: PlayerResidenceState;
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

type ApiRuntimeMode = 'disabled' | 'tavern' | 'external';

const normalizeArchiveScopeId = (raw: unknown): string => {
  const text = `${raw ?? ''}`.trim();
  return text || LN_DEFAULT_ARCHIVE_SCOPE;
};

const resolveCurrentTavernChatScope = (): string => {
  try {
    if (typeof SillyTavern?.getCurrentChatId === 'function') {
      return normalizeArchiveScopeId(SillyTavern.getCurrentChatId());
    }
  } catch {
    // Ignore cross-frame access errors and fall back to a global scope.
  }
  return LN_DEFAULT_ARCHIVE_SCOPE;
};

const buildScopedStorageKey = (prefix: string, scopeId: string): string =>
  `${prefix}::${encodeURIComponent(normalizeArchiveScopeId(scopeId))}`;

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
  aliases: string[];
  officeAddress: string;
  officerName: string;
  officerAffiliation: string;
  xStationId: string;
  hxDormId: string;
}

interface AirelaFacilityBinding {
  districtId: string;
  districtName: string;
  officeAddress: string;
  xStationId: string;
  xStationLabel: string;
  hxDormId: string;
  hxDormLabel: string;
  residenceId: string;
  residenceLabel: string;
}

const AIRELA_TAX_DISTRICTS: AirelaTaxDistrict[] = [
  {
    id: 'north_gate',
    name: '艾瑞拉·北门分区',
    aliases: ['北门', '北门分区'],
    officeAddress: '艾瑞拉·北门分区税务局',
    officerName: '夜莺税务官·岚绯',
    officerAffiliation: '夜莺驻艾瑞拉税务署',
    xStationId: 'X1',
    hxDormId: 'H10',
  },
  {
    id: 'central_ring',
    name: '艾瑞拉·中环分区',
    aliases: ['中环', '中环分区'],
    officeAddress: '艾瑞拉·中环税务局',
    officerName: '夜莺税务官·绫织',
    officerAffiliation: '夜莺驻艾瑞拉税务署',
    xStationId: 'X2',
    hxDormId: 'H18',
  },
  {
    id: 'south_dock',
    name: '艾瑞拉·南港分区',
    aliases: ['南港', '南港分区'],
    officeAddress: '艾瑞拉·南港税务局',
    officerName: '夜莺税务官·璃棠',
    officerAffiliation: '夜莺驻艾瑞拉税务署',
    xStationId: 'X4',
    hxDormId: 'H27',
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
      aliases: ['临时分区'],
      officeAddress: '艾瑞拉·临时税务局',
      officerName: '夜莺税务官·临时代理',
      officerAffiliation: '夜莺驻艾瑞拉税务署',
      xStationId: 'X0',
      hxDormId: 'H00',
    };
  }
  const index = hashText(citizenId || 'NO_ID') % list.length;
  return list[index];
};

const formatAirelaSiteLabel = (siteType: 'x_station' | 'hx_dorm', siteId: string, districtName?: string): string => {
  const suffix = siteType === 'x_station' ? '性控所' : '男奴公寓';
  return `${districtName ? `${districtName}·` : ''}${siteId}${suffix}`;
};

const findAirelaTaxDistrict = (value: string): AirelaTaxDistrict | null => {
  const text = `${value || ''}`.trim();
  if (!text) return null;
  return (
    AIRELA_TAX_DISTRICTS.find(
      district =>
        district.id === text ||
        text.includes(district.name) ||
        text.includes(district.officeAddress) ||
        district.aliases.some(alias => text.includes(alias)) ||
        text.includes(`${district.xStationId}性控所`) ||
        text.includes(`${district.hxDormId}男奴公寓`) ||
        text.includes(district.xStationId) ||
        text.includes(district.hxDormId),
    ) || null
  );
};

const buildAirelaFacilityBinding = (district: AirelaTaxDistrict | null): AirelaFacilityBinding | null => {
  if (!district) return null;
  const xStationLabel = formatAirelaSiteLabel('x_station', district.xStationId, district.name);
  const hxDormLabel = formatAirelaSiteLabel('hx_dorm', district.hxDormId, district.name);
  return {
    districtId: district.id,
    districtName: district.name,
    officeAddress: district.officeAddress,
    xStationId: district.xStationId,
    xStationLabel,
    hxDormId: district.hxDormId,
    hxDormLabel,
    residenceId: `airela_${district.id}_${district.hxDormId.toLowerCase()}`,
    residenceLabel: hxDormLabel,
  };
};

const resolveAirelaFacilityBinding = (options: { districtHint?: string | null; citizenId?: string | null }): AirelaFacilityBinding | null => {
  const directDistrict = findAirelaTaxDistrict(`${options.districtHint ?? ''}`.trim());
  if (directDistrict) return buildAirelaFacilityBinding(directDistrict);
  if (options.citizenId) return buildAirelaFacilityBinding(pickAirelaTaxDistrict(options.citizenId));
  return null;
};

const resolveAirelaSceneState = (
  location: string,
  fallbackBinding: AirelaFacilityBinding | null,
): {
  currentDistrict: string;
  currentSiteType: string;
  currentSiteId: string;
  currentSiteLabel: string;
} => {
  const text = `${location || ''}`.trim();
  if (!text) {
    return { currentDistrict: '', currentSiteType: '', currentSiteId: '', currentSiteLabel: '' };
  }

  const matchedDistrict = findAirelaTaxDistrict(text) ?? findAirelaTaxDistrict(fallbackBinding?.districtName || '');
  const xMatch = text.match(/(X\d{1,2})\s*性控所/u) ?? (text.includes('性控所') ? text.match(/(X\d{1,2})/u) : null);
  if (xMatch?.[1]) {
    const siteId = xMatch[1].toUpperCase();
    const siteDistrict = findAirelaTaxDistrict(siteId) ?? matchedDistrict;
    return {
      currentDistrict: siteDistrict?.name || fallbackBinding?.districtName || '',
      currentSiteType: 'x_station',
      currentSiteId: siteId,
      currentSiteLabel: formatAirelaSiteLabel('x_station', siteId, siteDistrict?.name || fallbackBinding?.districtName),
    };
  }

  const hMatch = text.match(/(H\d{1,3})\s*男奴公寓/u) ?? (text.includes('男奴公寓') ? text.match(/(H\d{1,3})/u) : null);
  if (hMatch?.[1]) {
    const siteId = hMatch[1].toUpperCase();
    const siteDistrict = findAirelaTaxDistrict(siteId) ?? matchedDistrict;
    return {
      currentDistrict: siteDistrict?.name || fallbackBinding?.districtName || '',
      currentSiteType: 'hx_dorm',
      currentSiteId: siteId,
      currentSiteLabel: formatAirelaSiteLabel('hx_dorm', siteId, siteDistrict?.name || fallbackBinding?.districtName),
    };
  }

  if (matchedDistrict && text.includes('税务局')) {
    return {
      currentDistrict: matchedDistrict.name,
      currentSiteType: 'tax_office',
      currentSiteId: `${matchedDistrict.id}_tax`,
      currentSiteLabel: matchedDistrict.officeAddress,
    };
  }

  const isAirelaText = /(艾瑞拉|北门|中环|南港|X\d{1,2}性控所|H\d{1,3}男奴公寓)/u.test(text);
  return {
    currentDistrict: matchedDistrict?.name || (isAirelaText ? fallbackBinding?.districtName || '' : ''),
    currentSiteType: '',
    currentSiteId: '',
    currentSiteLabel: '',
  };
};

const EMPTY_RESIDENCE_STATE: PlayerResidenceState = {
  currentResidenceId: '',
  currentResidenceLabel: '',
  unlockedResidenceIds: [],
};

const normalizeResidenceState = (
  rawState: Partial<PlayerResidenceState> | null | undefined,
  fallback?: Partial<PlayerResidenceState> | null,
): PlayerResidenceState => {
  const currentResidenceId = `${rawState?.currentResidenceId ?? fallback?.currentResidenceId ?? ''}`.trim();
  const currentResidenceLabel = `${rawState?.currentResidenceLabel ?? fallback?.currentResidenceLabel ?? ''}`.trim();
  const unlockedResidenceIds = Array.from(
    new Set(
      [
        ...(Array.isArray(rawState?.unlockedResidenceIds) ? rawState!.unlockedResidenceIds : []),
        ...(Array.isArray(fallback?.unlockedResidenceIds) ? fallback!.unlockedResidenceIds : []),
        currentResidenceId,
      ]
        .map(value => `${value ?? ''}`.trim())
        .filter(Boolean),
    ),
  );
  return {
    currentResidenceId,
    currentResidenceLabel,
    unlockedResidenceIds,
  };
};

const buildFallbackResidenceProfile = (residence: PlayerResidenceState, districtLabel: string): ResidenceProfile | null => {
  if (!residence.currentResidenceId && !residence.currentResidenceLabel) return null;
  return {
    id: residence.currentResidenceId || `legacy_residence_${hashText(residence.currentResidenceLabel || 'fallback')}`,
    label: residence.currentResidenceLabel || residence.currentResidenceId,
    kind: 'temporary',
    source: 'fallback',
    districtLabel: districtLabel || '未登记分区',
    summary: '旧档案或剧情里留下的住处记录，尚未进入结构化住所目录。',
    safety: 'Medium',
    privacy: 'Medium',
    curfew: '跟随当地法域',
    monthlyCost: 0,
    switchCost: 0,
    restMinutes: 360,
    hpRestore: 12,
    mpRestore: 24,
    sanityRestore: 10,
    note: '建议后续迁入结构化住处，避免月结和住册信息脱节。',
  };
};

const buildJurisdictionResidenceProfile = (location: string, districtLabel: string): ResidenceProfile => {
  const jurisdiction = resolveLocationJurisdiction(location);
  switch (jurisdiction.key) {
    case 'aerila':
      return {
        id: 'airela_civic_capsule',
        label: `${districtLabel || '艾瑞拉'}·民政夜栖舱`,
        kind: 'rental',
        source: 'civic',
        districtLabel: districtLabel || '艾瑞拉法域',
        summary: '首都法域下的标准化夜栖舱，手续快，但监控和宵禁都更重。',
        safety: 'High',
        privacy: 'Low',
        curfew: '严格',
        monthlyCost: 180,
        switchCost: 120,
        restMinutes: 420,
        hpRestore: 16,
        mpRestore: 32,
        sanityRestore: 8,
        note: '适合保信用和保通行，但不适合做隐蔽会面。',
      };
    case 'cuiling':
      return {
        id: 'cuiling_shift_dorm',
        label: '淬灵区·轮班宿舍',
        kind: 'rental',
        source: 'industrial',
        districtLabel: districtLabel || '淬灵区法域',
        summary: '工序区配套宿舍，成本低、恢复稳定，但生活节奏被排班绑定。',
        safety: 'Medium',
        privacy: 'Low',
        curfew: '常规',
        monthlyCost: 110,
        switchCost: 70,
        restMinutes: 420,
        hpRestore: 14,
        mpRestore: 28,
        sanityRestore: 10,
        note: '适合做长期周转住处，不适合高强度藏匿。',
      };
    case 'xiyu':
      return {
        id: 'xiyu_port_hostel',
        label: '汐屿区·港务旅舍',
        kind: 'rental',
        source: 'port',
        districtLabel: districtLabel || '汐屿区法域',
        summary: '港区流动人口旅舍，手续弹性高，适合短期停泊和中转。',
        safety: 'Medium',
        privacy: 'Medium',
        curfew: '港巡时段',
        monthlyCost: 150,
        switchCost: 100,
        restMinutes: 360,
        hpRestore: 12,
        mpRestore: 26,
        sanityRestore: 12,
        note: '边检友好，但消费记录会留痕。',
      };
    case 'north':
      return {
        id: 'north_silk_suite',
        label: '诺丝区·灰幕套间',
        kind: 'safehouse',
        source: 'market',
        districtLabel: districtLabel || '诺丝区法域',
        summary: '灰产地带的短租套间，隐匿性高，但维持费和灰色抽成都更重。',
        safety: 'Medium',
        privacy: 'High',
        curfew: '宽松',
        monthlyCost: 240,
        switchCost: 160,
        restMinutes: 360,
        hpRestore: 14,
        mpRestore: 30,
        sanityRestore: 16,
        note: '适合会面和藏匿，但会抬高月维持费。',
      };
    case 'holy':
      return {
        id: 'holy_parish_bed',
        label: '圣教区·教律宿床',
        kind: 'temporary',
        source: 'parish',
        districtLabel: districtLabel || '圣教区法域',
        summary: '教区宿床成本低，但规训高、公开审查强。',
        safety: 'High',
        privacy: 'Low',
        curfew: '严密',
        monthlyCost: 90,
        switchCost: 40,
        restMinutes: 480,
        hpRestore: 18,
        mpRestore: 24,
        sanityRestore: 6,
        note: '只适合守规矩的停留，不适合带灰色状态久住。',
      };
    case 'borderland':
      return {
        id: 'borderland_safe_camp',
        label: '交界地·加固营位',
        kind: 'safehouse',
        source: 'frontier',
        districtLabel: districtLabel || '交界地法域',
        summary: '边地营位更像生存据点，隐匿好，但安全和恢复都不稳定。',
        safety: 'Low',
        privacy: 'High',
        curfew: '无统一',
        monthlyCost: 130,
        switchCost: 80,
        restMinutes: 300,
        hpRestore: 10,
        mpRestore: 18,
        sanityRestore: 8,
        note: '适合躲风险，不适合长期恢复。',
      };
    default:
      return {
        id: 'civic_transit_pod',
        label: '区域·中转舱位',
        kind: 'temporary',
        source: 'fallback',
        districtLabel: districtLabel || '未锁定法域',
        summary: '临时中转床位，能应急，但不适合长期绑定。',
        safety: 'Medium',
        privacy: 'Low',
        curfew: '跟随当地法域',
        monthlyCost: 100,
        switchCost: 60,
        restMinutes: 300,
        hpRestore: 10,
        mpRestore: 18,
        sanityRestore: 8,
        note: '更适合作为过渡住处。',
      };
  }
};

const isAirelaResidenceZone = (location: string): boolean => resolveLocationJurisdiction(location).key === 'aerila';

const buildResidenceProfiles = (params: {
  location: string;
  hasOfficialControl: boolean;
  status: PlayerCivilianStatus;
  residence: PlayerResidenceState;
}): ResidenceProfile[] => {
  const districtLabel = params.status.assignedDistrict || resolveLocationJurisdiction(params.location).regionLabel || '未锁定法域';
  const inAirelaZone = isAirelaResidenceZone(params.location);
  const officialBinding =
    params.hasOfficialControl && (params.status.assignedDistrict || params.status.assignedHXDormLabel || params.status.citizenId)
      ? resolveAirelaFacilityBinding({
          districtHint: params.status.assignedDistrict || params.status.assignedHXDormLabel || '',
          citizenId: params.status.citizenId || '',
        })
      : null;
  const profiles: ResidenceProfile[] = [];
  if (inAirelaZone && params.hasOfficialControl && params.status.assignedHXDormId && params.status.assignedHXDormLabel) {
    profiles.push({
      id: officialBinding?.residenceId || `airela_${params.status.assignedHXDormId.toLowerCase()}`,
      label: params.status.assignedHXDormLabel,
      kind: 'official',
      source: 'beta',
      districtLabel: params.status.assignedDistrict || '艾瑞拉·官方分区',
      summary: 'Beta 管理链登记宿位，通行与税务最稳定，但夜禁、点名和监管都会更密。',
      safety: 'High',
      privacy: 'Low',
      curfew: '严格',
      monthlyCost: 90,
      switchCost: 0,
      restMinutes: 420,
      hpRestore: 18,
      mpRestore: 36,
      sanityRestore: 12,
      note: '官方宿位始终保留，不会因切换民间住处而丢失住册。',
    });
  }
  profiles.push(buildJurisdictionResidenceProfile(params.location, districtLabel));
  const fallback = buildFallbackResidenceProfile(params.residence, districtLabel);
  if (fallback) profiles.push(fallback);
  return Array.from(new Map(profiles.map(profile => [profile.id, profile])).values());
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
    playerInput: latestPlayer?.content || '',
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

const LCOIN_BUCKET_KEYS = ['lv1', 'lv2', 'lv3', 'lv4', 'lv5'] as const;
type LcoinBucketKey = typeof LCOIN_BUCKET_KEYS[number];
const RANK_TO_LCOIN_KEY: Record<Rank, LcoinBucketKey> = {
  [Rank.Lv1]: 'lv1',
  [Rank.Lv2]: 'lv2',
  [Rank.Lv3]: 'lv3',
  [Rank.Lv4]: 'lv4',
  [Rank.Lv5]: 'lv5',
};
const DEFAULT_STAT_EXCHANGE_RULES = {
  same_level_theoretical_rate: 1.0,
  cross_level_loss_rate: 0.8,
  region_modifier: {
    艾瑞拉: { male: 0.55, female: 1.0 },
    淬灵区: { male: 0.55, female: 1.0 },
    汐屿区: { male: 0.55, female: 0.55 },
    诺丝区: { male: 0.45, female: 0.45 },
    圣教区: { exchange_enabled: false },
  },
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

const getMonthKeyFromElapsedMinutes = (elapsedMinutes: number): string => {
  const d = new Date(GAME_CLOCK_BASE.getTime() + elapsedMinutes * 60_000);
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}`;
};

const monthKeyToIndex = (monthKey: string): number => {
  const match = `${monthKey || ''}`.match(/^(\d{4})-(\d{2})$/);
  if (!match) return 0;
  return Number(match[1]) * 12 + (Number(match[2]) - 1);
};

const monthKeyToLabel = (monthKey: string): string => {
  const match = `${monthKey || ''}`.match(/^(\d{4})-(\d{2})$/);
  if (!match) return '未知月份';
  return `${match[1]}年${Number(match[2])}月`;
};

const addMonthsToMonthKey = (monthKey: string, diff: number): string => {
  const match = `${monthKey || ''}`.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  date.setMonth(date.getMonth() + diff);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

const getMonthDiff = (fromMonthKey: string, toMonthKey: string): number => {
  return Math.max(0, monthKeyToIndex(toMonthKey) - monthKeyToIndex(fromMonthKey));
};

const buildSettlementCycleLabel = (startMonthKey: string, monthCount: number): string => {
  if (monthCount <= 0) return '当前未跨月';
  if (monthCount === 1) return monthKeyToLabel(startMonthKey);
  const endMonthKey = addMonthsToMonthKey(startMonthKey, monthCount - 1);
  return `${monthKeyToLabel(startMonthKey)} - ${monthKeyToLabel(endMonthKey)}`;
};

const getMonthDeadlineText = (monthKey: string): string => {
  const match = `${monthKey || ''}`.match(/^(\d{4})-(\d{2})$/);
  if (!match) return '';
  const deadline = new Date(Number(match[1]), Number(match[2]), 0, 23, 59, 0, 0);
  const mm = `${deadline.getMonth() + 1}`.padStart(2, '0');
  const dd = `${deadline.getDate()}`.padStart(2, '0');
  return `${deadline.getFullYear()}-${mm}-${dd} 23:59`;
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

const buildLocationControlProfile = (
  location: string,
  phase: string,
  protocol: 'none' | 'beta',
  gender: 'male' | 'female',
  creditScore: number,
  sceneHint: string,
) => {
  const text = `${location || ''}`;
  const riskTone: 'safe' | 'watch' | 'danger' =
    creditScore <= 40 || (/艾瑞拉/.test(text) && protocol === 'none' && gender === 'male')
      ? 'danger'
      : /诺丝|圣教/.test(text)
      ? 'watch'
      : 'safe';
  const regionFactor = getExchangeRegionFactor(text, gender);
  const exchangeText =
    regionFactor === null ? '本地禁兑' : `官方倍率 ${(regionFactor || 1).toFixed(2)}x`;
  const hints = [sceneHint];

  if (/艾瑞拉/.test(text)) {
    hints.push(protocol === 'beta' ? '首都毒素已被协议抑制，但夜间检查更严。' : '首都存在男性毒素环境，无协议将持续承压。');
    if (phase === '夜晚' || phase === '深夜') hints.push('夜间居住与出行更容易触发证件抽查。');
  } else if (/淬灵/.test(text)) {
    hints.push('这里是压缩与分解中枢，跨级换币更适合在官方设施完成。');
    hints.push(gender === 'female' ? '女性在淬灵区享受标准兑换率。' : '男性在淬灵区仍受显著折损。');
  } else if (/汐屿/.test(text)) {
    hints.push('旅游与港口并行，夜莺更重视证件与边检而非当场镇压。');
    hints.push('灵网、消费与轻社交事件更容易在本区触发。');
  } else if (/诺丝/.test(text)) {
    hints.push('诺丝区官方汇率更低，黑市与灰色网络更活跃。');
    hints.push('直播、违禁芯片和地下经济会抬高风险暴露。');
  } else if (/圣教/.test(text)) {
    hints.push('教区禁兑灵能币，通行和言行都会被教义审查。');
    hints.push('越界交易与公开欲望行为更容易触发高压追责。');
  } else {
    hints.push('当前区域规则未完全锁定，优先参考楼层小结与系统状态。');
  }

  if (creditScore <= 20) hints.push('信誉分已逼近崩溃线，后续处罚会明显升级。');
  else if (creditScore <= 40) hints.push('信誉已落入高危区，税务和夜间巡查都会提高关注度。');

  return {
    headline: `${location || '未知区域'} · ${phase}管制提示`,
    exchangeText,
    riskTone,
    hints: Array.from(new Set(hints)).slice(0, 4),
  };
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

const HIDDEN_CONTINUE_REQUEST = '请基于已有聊天记录直接给出下一条回复，不要复述本句。';
const PSEUDO_LAYER_RESPONSE_RULES = [
  '【输出格式要求】',
  '只输出以下两个模块，禁止输出额外标题、解释、代码块或 Markdown 包裹：',
  '<maintext>...</maintext>',
  '<sum>...</sum>',
  'maintext 只写正文推进与对白，不要在开头重复时间、地点、时段，不要输出选项。',
  'sum 只写本层小总结，保持单行，尽量包含“地点 / 时间 / 状态”三个字段。',
].join('\n');

const resolveGenerateRequestInput = (raw: string): string => {
  const clean = sanitizeAiMaintext(raw);
  return clean || HIDDEN_CONTINUE_REQUEST;
};

const isStatusLikeMaintextLine = (rawLine: string): boolean => {
  const line = sanitizeAiMaintext(rawLine);
  if (!line) return false;
  if (/^【(?:时间|地点|区域|场景)】/i.test(line)) return true;
  if (/^(?:当前)?(?:时间|地点|区域|场景|时段)[:：]/i.test(line)) return true;
  if (/^(?:时间推进至|地点确认为)/i.test(line)) return true;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?:\s*[\|｜/／].*)?$/i.test(line)) return true;
  if (/^[^\n]{1,40}[,，]\s*\d{1,2}:\d{2}[。.]?$/.test(line)) return true;
  if (
    /^[^\n]{1,40}\s*[\|｜/／]\s*[^\n]{1,40}\s*[\|｜/／]\s*[^\n]{1,20}$/.test(line)
    && /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(line)
  ) {
    return true;
  }
  return false;
};

const stripLeadingStatusLinesFromMaintext = (raw: string): string => {
  const clean = sanitizeAiMaintext(raw);
  if (!clean) return '';
  const lines = clean.split('\n');
  let index = 0;
  while (index < lines.length && !lines[index].trim()) index += 1;

  let stripped = 0;
  while (index < lines.length && stripped < 3) {
    if (!isStatusLikeMaintextLine(lines[index])) break;
    stripped += 1;
    index += 1;
    while (index < lines.length && !lines[index].trim()) index += 1;
  }

  if (!stripped) return clean;
  const remainder = sanitizeAiMaintext(lines.slice(index).join('\n'));
  return remainder || clean;
};

const extractTextFromUnknownResult = (value: unknown, depth = 0): string => {
  if (value === null || value === undefined || depth > 4) return '';
  if (typeof value === 'string') return value.trim() ? value : '';

  if (Array.isArray(value)) {
    for (const entry of value) {
      const nested = extractTextFromUnknownResult(entry, depth + 1);
      if (nested) return nested;
    }
    return '';
  }

  if (typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;

  const directFields = [
    record.text,
    record.content,
    record.message,
    record.reply,
    record.output,
    record.result,
    record.response,
    record.completion,
  ];
  for (const field of directFields) {
    const nested = extractTextFromUnknownResult(field, depth + 1);
    if (nested) return nested;
  }

  const choices = record.choices;
  if (Array.isArray(choices)) {
    for (const entry of choices) {
      const nested = extractTextFromUnknownResult(entry, depth + 1);
      if (nested) return nested;
    }
  }

  const nestedData = [record.data, record.results, record.output_text];
  for (const entry of nestedData) {
    const nested = extractTextFromUnknownResult(entry, depth + 1);
    if (nested) return nested;
  }

  return '';
};

const coerceGenerateResultToText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (!value) return '';
  const extracted = extractTextFromUnknownResult(value);
  if (extracted) return extracted;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const resolveApiEndpoint = (raw: string) => {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/\/(?:chat\/completions|responses)$/i.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, '');
    if (!pathname || pathname === '/') {
      url.pathname = '/v1/chat/completions';
      return url.toString().replace(/\/+$/, '');
    }
    if (pathname.endsWith('/v1')) {
      url.pathname = `${pathname}/chat/completions`;
      return url.toString().replace(/\/+$/, '');
    }
    return url.toString().replace(/\/+$/, '');
  } catch {
    if (trimmed.endsWith('/v1')) return `${trimmed}/chat/completions`;
    return trimmed;
  }
};

const isResponsesApiEndpoint = (endpoint: string): boolean => /\/responses$/i.test(endpoint.trim());

const resolveApiRuntimeMode = (config: LnApiConfig): ApiRuntimeMode => {
  if (config.useTavernApi) return 'tavern';
  if (config.enabled) return 'external';
  return 'disabled';
};

const getApiRuntimeModeLabel = (mode: ApiRuntimeMode): string => {
  if (mode === 'tavern') return '酒馆接口';
  if (mode === 'external') return '外部接口';
  return '已关闭';
};

const validateExternalApiConfig = (config: LnApiConfig): string | null => {
  const endpoint = resolveApiEndpoint(config.endpoint);
  if (!endpoint) return '当前为外部接口模式，但未填写 endpoint。';
  if (!/^https?:\/\//i.test(endpoint)) return '外部接口 endpoint 需要是 http/https 地址。';
  if (!config.model.trim()) return '当前为外部接口模式，但未填写 model。';
  return null;
};

const buildResponsesApiInput = (messages: Array<{ role: 'system' | 'user'; content: string }>) =>
  messages.map(message => ({
    role: message.role,
    content: [{ type: 'input_text', text: message.content }],
  }));

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

const buildSocialHandleSeed = (npc: NPC): string =>
  `${npc.name || npc.id || 'guest'}`
    .replace(/[^\w\u4e00-\u9fa5]+/g, '')
    .toLowerCase()
    .slice(0, 18) || 'guest';

const normalizeUniqueStrings = (values: string[] | undefined): string[] =>
  Array.from(new Set((values || []).map(value => `${value || ''}`.trim()).filter(Boolean)));

const normalizeUnlockCount = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.floor(parsed));
};

const clampDarknetRiskRating = (value: unknown, fallback = 2): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Math.min(5, Math.max(1, Math.floor(fallback)));
  return Math.min(5, Math.max(1, Math.round(parsed)));
};

const buildFallbackDarknetProfile = (npc: NPC): NpcDarknetProfile => {
  const relation = npc.gender === 'female' ? npc.affection || 0 : npc.trust || 0;
  const cleanTags = normalizeUniqueStrings(
    [
      npc.group || undefined,
      npc.affiliation || undefined,
      npc.position || undefined,
      ...(npc.statusTags || []).filter(tag => tag !== '自动识别' && tag !== '待补全'),
    ].filter((value): value is string => !!value),
  ).slice(0, 5);

  const intelRecords: NpcDarknetRecord[] =
    (npc.clueNotes || []).length > 0
      ? [
          {
            id: `darknet_auto_${npc.id}_1`,
            title: '节点底稿',
            content: `${(npc.clueNotes || []).slice(0, 2).join('；')}。当前仅建立了基础暗网索引，更多记录需要继续接触、交易或剧情推进后解锁。`,
            timestamp: '未标注时间',
            source: npc.affiliation || '未知来源',
            location: npc.location || '未知区域',
            risk: npc.isContact ? 'medium' : 'low',
            kind: 'intel',
            unlockLevel: 2,
            tags: cleanTags.slice(0, 3),
          },
        ]
      : [];

  return {
    handle: `dn://${buildSocialHandleSeed(npc)}`,
    alias: npc.name ? `${npc.name} / 镜像条目` : '匿名节点',
    summary: npc.isContact
      ? `${npc.name} 已进入联系人观察名单，暗网侧保留了与 ${npc.affiliation || '未知来源'} 相关的基础检索骨架。`
      : `${npc.name || '该人物'} 仅留下零散痕迹，目前仍处在边缘索引状态。`,
    accessTier: npc.isContact ? '灰名单已校验' : '边缘索引',
    marketVector: npc.position || npc.affiliation || '人物观察',
    riskRating: clampDarknetRiskRating(1 + Math.floor(relation / 25) + (npc.isContact ? 1 : 0), 2),
    bounty: relation >= 55 ? '内部关注对象' : '未挂牌',
    tags: cleanTags,
    knownAssociates: normalizeUniqueStrings([npc.affiliation || '', npc.group || '']).slice(0, 3),
    lastSeen: npc.location || '未知区域',
    intelRecords,
  };
};

const normalizeDarknetRecord = (npc: NPC, record: NpcDarknetRecord, index: number): NpcDarknetRecord => ({
  id: record?.id || `darknet_${npc.id}_${index + 1}`,
  title: `${record?.title || `记录 ${index + 1}`}`.trim(),
  content: `${record?.content || ''}`.trim() || '暗网节点未返回正文。',
  timestamp: `${record?.timestamp || '未标注时间'}`.trim() || '未标注时间',
  source: record?.source?.trim() || undefined,
  location: `${record?.location || npc.location || ''}`.trim() || undefined,
  risk:
    record?.risk === 'sealed' || record?.risk === 'high' || record?.risk === 'medium' || record?.risk === 'low'
      ? record.risk
      : 'low',
  kind:
    record?.kind === 'contract' || record?.kind === 'leak' || record?.kind === 'sighting' || record?.kind === 'transaction'
      ? record.kind
      : 'intel',
  unlockLevel: Number.isFinite(record?.unlockLevel) ? Math.min(4, Math.max(1, Math.floor(Number(record.unlockLevel)))) : 2,
  tags: normalizeUniqueStrings(record?.tags),
  image: record?.image?.trim() || undefined,
});

const normalizeDarknetService = (service: NpcDarknetService, index: number): NpcDarknetService => ({
  id: service?.id || `darknet_service_${index + 1}`,
  title: `${service?.title || `暗网服务 ${index + 1}`}`.trim(),
  summary: `${service?.summary || ''}`.trim() || '该服务未返回说明。',
  price: Number.isFinite(service?.price) ? Math.max(1, Math.floor(Number(service.price))) : 100,
  kind:
    service?.kind === 'bounty' || service?.kind === 'intel' || service?.kind === 'medical' || service?.kind === 'rewrite' || service?.kind === 'smuggling'
      ? service.kind
      : 'intel',
  unlockLevel: Number.isFinite(service?.unlockLevel) ? Math.min(4, Math.max(1, Math.floor(Number(service.unlockLevel)))) : 2,
  risk:
    service?.risk === 'sealed' || service?.risk === 'high' || service?.risk === 'medium' || service?.risk === 'low'
      ? service.risk
      : 'medium',
  availability: `${service?.availability || ''}`.trim() || undefined,
  delivery: `${service?.delivery || ''}`.trim() || undefined,
  tags: normalizeUniqueStrings(service?.tags),
});

const normalizeDarknetProfile = (npc: NPC, profile: NpcDarknetProfile | undefined): NpcDarknetProfile => {
  const fallback = buildFallbackDarknetProfile(npc);
  const sourceRecords = Array.isArray(profile?.intelRecords) ? profile.intelRecords : fallback.intelRecords || [];
  return {
    ...fallback,
    ...profile,
    handle: profile?.handle?.trim() || fallback.handle,
    alias: profile?.alias?.trim() || fallback.alias,
    summary: profile?.summary?.trim() || fallback.summary,
    accessTier: profile?.accessTier?.trim() || fallback.accessTier,
    marketVector: profile?.marketVector?.trim() || fallback.marketVector,
    riskRating: clampDarknetRiskRating(profile?.riskRating, fallback.riskRating || 2),
    bounty: profile?.bounty?.trim() || fallback.bounty,
    tags: normalizeUniqueStrings([...(fallback.tags || []), ...((profile?.tags || []) as string[])]),
    knownAssociates: normalizeUniqueStrings([...(fallback.knownAssociates || []), ...((profile?.knownAssociates || []) as string[])]),
    lastSeen: profile?.lastSeen?.trim() || fallback.lastSeen,
    intelRecords: sourceRecords
      .map((record, index) => normalizeDarknetRecord(npc, record, index))
      .sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0) || a.id.localeCompare(b.id)),
    services: Array.isArray(profile?.services)
      ? profile.services.map((service, index) => normalizeDarknetService(service, index))
      : undefined,
  };
};

const normalizeNpcUnlockState = (npc: NPC): NPC['unlockState'] => {
  const access = resolveNpcCodexAccessState(npc);
  return {
    ...(npc.unlockState || {}),
    dossierLevel: access.dossierLevel,
    socialUnlocked: access.socialUnlocked,
    darknetLevel: access.darknetLevel,
    darknetUnlocked: access.darknetUnlocked,
    albumUnlockedCount: normalizeUnlockCount(npc.unlockState?.albumUnlockedCount),
    intelUnlockedCount: normalizeUnlockCount(npc.unlockState?.intelUnlockedCount),
  };
};

const buildImportedDarknetRecord = (
  draft: SocialImportDraft,
  displayName: string,
  timestamp: string,
  fallbackLocation: string,
): NpcDarknetRecord => ({
  id: `darknet_import_${Date.now()}`,
  title: `来源映射：${displayName}`,
  content: `已接入来自 ${draft.platform.toUpperCase()} 的公开素材映射。原始发布者为 ${draft.originalAuthorName.trim() || draft.originalAuthorHandle.trim() || '未标注来源'}，后续互动与关系推进全部转入 LN 本地链路。`,
  timestamp,
  source: `${draft.platform.toUpperCase()} 公开源`,
  location: fallbackLocation || '灵网镜像节点',
  risk: draft.visibility === 'premium' ? 'medium' : 'low',
  kind: 'leak',
  unlockLevel: draft.visibility === 'premium' ? 4 : 2,
  tags: normalizeUniqueStrings([draft.platform.toUpperCase(), '来源映射', '公开素材导入']),
  image: draft.imageUrl.trim() || undefined,
});

const buildPurchasedDarknetServiceRecord = (
  npc: NPC,
  service: NpcDarknetService,
  timestamp: string,
  fallbackLocation: string,
): NpcDarknetRecord => ({
  id: `darknet_service_record_${npc.id}_${service.id}_${Date.now()}`,
  title: `${service.title} · 已交割`,
  content:
    service.delivery
    || `${npc.name} 已通过暗网节点交付「${service.title}」，相关影响将在后续剧情与系统互动中兑现。`,
  timestamp,
  source: npc.darknetProfile?.handle || `${npc.name} 暗网节点`,
  location: fallbackLocation || npc.darknetProfile?.lastSeen || npc.location || '暗网节点',
  risk: service.risk || 'medium',
  kind: service.kind === 'bounty' ? 'contract' : service.kind === 'intel' ? 'intel' : 'transaction',
  unlockLevel: 2,
  tags: normalizeUniqueStrings([...(service.tags || []), '服务交割', service.kind]),
});

const normalizeSocialPost = (npc: NPC, post: SocialPost, index: number): SocialPost => ({
  id: post?.id || `social_${npc.id}_${index + 1}`,
  content: `${post?.content || ''}`.trim(),
  timestamp: `${post?.timestamp || new Date().toISOString()}`,
  image: post?.image || undefined,
  comments: Array.isArray(post?.comments)
    ? post.comments.map((comment, commentIndex) => ({
        id: comment?.id || `comment_${npc.id}_${index + 1}_${commentIndex + 1}`,
        sender: `${comment?.sender || '未知'}`,
        content: `${comment?.content || ''}`,
        timestamp: `${comment?.timestamp || new Date().toISOString()}`,
        isPlayer: !!comment?.isPlayer,
      }))
    : [],
  visibility: post?.visibility === 'premium' ? 'premium' : post?.visibility === 'mutual' ? 'mutual' : 'public',
  unlockPrice: Number.isFinite(post?.unlockPrice) ? Math.max(1, Number(post.unlockPrice)) : undefined,
  unlockedByPlayer: !!post?.unlockedByPlayer,
  likedByPlayer: !!post?.likedByPlayer,
  likeCount: Number.isFinite(post?.likeCount) ? Math.max(0, Number(post.likeCount)) : 0,
  tipsReceived: Number.isFinite(post?.tipsReceived) ? Math.max(0, Number(post.tipsReceived)) : 0,
  location: `${post?.location || npc.location || ''}`.trim(),
  source: post?.source
    ? {
        platform: post.source.platform || 'native',
        authorHandle: post.source.authorHandle?.trim() || undefined,
        authorName: post.source.authorName?.trim() || undefined,
        profileUrl: post.source.profileUrl?.trim() || undefined,
        postUrl: post.source.postUrl?.trim() || undefined,
        importedAt: post.source.importedAt?.trim() || undefined,
        note: post.source.note?.trim() || undefined,
      }
    : undefined,
});

const normalizeDirectMessage = (message: DirectMessage, index: number): DirectMessage => ({
  id: message?.id || `dm_${index + 1}`,
  sender: message?.sender === 'player' || message?.sender === 'npc' ? message.sender : 'system',
  content: `${message?.content || ''}`,
  timestamp: `${message?.timestamp || new Date().toISOString()}`,
  amount: Number.isFinite(message?.amount) ? Math.max(0, Number(message.amount)) : undefined,
  kind: message?.kind || 'text',
});

const normalizeNpcForUi = (npc: NPC): NPC => {
  const mergedNpc = applyNpcCodexOverlay(npc);
  const normalizedUnlockState = normalizeNpcUnlockState(mergedNpc);
  const normalizedDarknetProfile = normalizeDarknetProfile({ ...mergedNpc, unlockState: normalizedUnlockState }, mergedNpc.darknetProfile);

  if (isAutoNearbyNpc(mergedNpc) || (mergedNpc.statusTags || []).includes('自动识别')) {
    return {
      ...mergedNpc,
      stats: ensurePlayerStatsSixDim(mergedNpc.stats || MOCK_PLAYER_STATS),
      bodyParts: Array.isArray(mergedNpc.bodyParts) ? mergedNpc.bodyParts : [],
      chips: Array.isArray(mergedNpc.chips) ? mergedNpc.chips : [],
      inventory: Array.isArray(mergedNpc.inventory) ? mergedNpc.inventory : [],
      chipSummary: Array.isArray(mergedNpc.chipSummary) ? mergedNpc.chipSummary : [],
      clueNotes: Array.isArray(mergedNpc.clueNotes) ? mergedNpc.clueNotes : [],
      dossierSections: Array.isArray(mergedNpc.dossierSections) ? mergedNpc.dossierSections : [],
      gallery: Array.isArray(mergedNpc.gallery) ? mergedNpc.gallery : [],
      socialHandle: mergedNpc.socialHandle?.trim() || `@${buildSocialHandleSeed(mergedNpc)}`,
      socialBio: mergedNpc.socialBio?.trim() || `${mergedNpc.affiliation || '未知来源'} · ${mergedNpc.position || '待识别人物'}`,
      playerFollows: !!mergedNpc.playerFollows,
      followsPlayer: !!mergedNpc.followsPlayer,
      followerCount: Number.isFinite(mergedNpc.followerCount) ? Math.max(0, Number(mergedNpc.followerCount)) : 0,
      followingCount: Number.isFinite(mergedNpc.followingCount) ? Math.max(0, Number(mergedNpc.followingCount)) : 0,
      walletTag: mergedNpc.walletTag?.trim() || `LPAY-${buildSocialHandleSeed(mergedNpc).slice(0, 10).toUpperCase()}`,
      unlockState: normalizedUnlockState,
      darknetProfile: normalizedDarknetProfile,
      dmThread: Array.isArray(mergedNpc.dmThread) ? mergedNpc.dmThread.map(normalizeDirectMessage) : [],
      socialFeed: Array.isArray(mergedNpc.socialFeed) ? mergedNpc.socialFeed.map((post, index) => normalizeSocialPost(mergedNpc, post, index)) : [],
    };
  }

  const fallbackBoard = MOCK_CHIPS.find(chip => chip.type === 'board');
  const fallbackNormals = MOCK_CHIPS.filter(chip => chip.type === 'active' || chip.type === 'passive' || chip.type === 'process');
  const sourceChips = Array.isArray(mergedNpc.chips) ? mergedNpc.chips : [];
  const normalizedChips =
    sourceChips.length > 0
      ? sourceChips
      : [
          ...(fallbackBoard ? [{ ...fallbackBoard }] : []),
          ...(fallbackNormals.length > 0
            ? [
                { ...fallbackNormals[hashTextToIndex(`${mergedNpc.id}_c1`, fallbackNormals.length)] },
                { ...fallbackNormals[hashTextToIndex(`${mergedNpc.id}_c2`, fallbackNormals.length)] },
              ]
            : []),
        ];
  const source = mergedNpc.bodyParts || [];
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
      id: from?.id || `npc_${mergedNpc.id}_${tpl.key}_${idx + 1}`,
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
      id: part.id || `npc_${mergedNpc.id}_extra_${idx + 1}`,
      equippedItems: part.equippedItems || [],
      skills: part.skills || [],
      maxSkillSlots: part.maxSkillSlots || 3,
      maxEquipSlots: part.maxEquipSlots || DEFAULT_LINGSHU_EQUIP_SLOTS,
    }));

  const normalizedNpc: NPC = { ...mergedNpc, bodyParts: [...normalized, ...extras], chips: normalizedChips };
  return {
    ...normalizedNpc,
    chipSummary: Array.isArray(normalizedNpc.chipSummary) ? normalizedNpc.chipSummary : [],
    clueNotes: Array.isArray(normalizedNpc.clueNotes) ? normalizedNpc.clueNotes : [],
    dossierSections: Array.isArray(normalizedNpc.dossierSections) ? normalizedNpc.dossierSections : [],
    gallery: Array.isArray(normalizedNpc.gallery) ? normalizedNpc.gallery : [],
    socialHandle: normalizedNpc.socialHandle?.trim() || `@${buildSocialHandleSeed(normalizedNpc)}`,
    socialBio: normalizedNpc.socialBio?.trim() || `${normalizedNpc.affiliation || '未知来源'} · ${normalizedNpc.position || '灵网账号'}`,
    playerFollows: !!normalizedNpc.playerFollows,
    followsPlayer: normalizedNpc.followsPlayer ?? !!normalizedNpc.isContact,
    followerCount: Number.isFinite(normalizedNpc.followerCount) ? Math.max(0, Number(normalizedNpc.followerCount)) : 120 + (hashText(normalizedNpc.id) % 900),
    followingCount: Number.isFinite(normalizedNpc.followingCount) ? Math.max(0, Number(normalizedNpc.followingCount)) : 20 + (hashText(`${normalizedNpc.id}_f`) % 180),
    walletTag: normalizedNpc.walletTag?.trim() || `LPAY-${buildSocialHandleSeed(normalizedNpc).slice(0, 10).toUpperCase()}`,
    unlockState: normalizedUnlockState,
    darknetProfile: normalizedDarknetProfile,
    dmThread: Array.isArray(normalizedNpc.dmThread) ? normalizedNpc.dmThread.map(normalizeDirectMessage) : [],
    socialFeed: Array.isArray(normalizedNpc.socialFeed) ? normalizedNpc.socialFeed.map((post, index) => normalizeSocialPost(normalizedNpc, post, index)) : [],
  };
};

const normalizeNpcListForUi = (list: NPC[]): NPC[] => list.map(normalizeNpcForUi);

type NearbyNpcSeed = {
  name: string;
  position: string;
  gender: NPC['gender'];
  affiliation?: string;
};

const AUTO_NEARBY_NPC_ID_PREFIX = 'auto_nearby_';

const normalizeNpcNameKey = (name: string): string =>
  sanitizeAiMaintext(`${name || ''}`)
    .replace(/[「」“”"'`·•\s]/g, '')
    .trim()
    .toLowerCase();

const isAutoNearbyNpc = (npc: NPC): boolean => (npc.id || '').startsWith(AUTO_NEARBY_NPC_ID_PREFIX);

const NEARBY_NPC_NAME_STOPWORDS = new Set([
  '系统',
  '玩家',
  '前文',
  '当前位置',
  '当前地点',
  '当前时间',
  '时间',
  '地点',
  '场景',
  '势力',
  '区域',
  '状态',
  '资源',
  '信誉',
  '灵能',
  '剧情',
  '设置',
  '对话',
  '正文',
  '周围人物',
  '可交互信号',
  '初始化完成',
  '第一步行动',
  '开局叙事',
  '继续',
  '行动',
  '艾瑞拉',
  '黄昏',
]);

const NEARBY_NPC_OBJECT_WORDS = [
  '高跟鞋',
  '鞋跟',
  '靴子',
  '警犬',
  '水管',
  '积水',
  '雨水',
  '水洼',
  '霓虹',
  '广告牌',
  '脚步',
  '尾音',
  '塑料片',
  '机械眼球',
  '手套',
  '短鞭',
  '巷子',
];

const NEARBY_SOUND_LIKE_NAME_RE = /^(?:哈|啊|呀|哒|啪|咔|咚|呜|哼|嘿|呵|啧|噗|嘭|铛|叮|滴|答|吱|呲|咻|呼|嗯|哦|嗷|喵|汪|哐|砰|咣){1,4}$/;
const NEARBY_HUMAN_CUE_RE = /(她|他|女性|男性|女子|男人|少女|女士|小姐|先生|夜莺|修女|巡逻者|税务官|猎手|特工|佣兵|队长|警员|主人)/;
const NEARBY_FEMALE_CUE_RE = /(她|女性|女子|女人|少女|女士|小姐|夜莺|修女)/;
const NEARBY_MALE_CUE_RE = /(他|男性|男子|男人|先生)/;
const NEARBY_ACTION_CUE_RE = /(停了下来|停下|停住|开口|说道|说|低声|冷笑|俯身|逼近|走来|走近|靠近|抬手|举起|看向|盯着|命令|追来|站定|转过身|挥手)/;

const isSoundEffectLikeName = (name: string): boolean => {
  const compact = name.replace(/[「」“”"'`·•\s，。、！？!?,.~\-]/g, '');
  if (!compact) return true;
  return compact.length <= 4 && NEARBY_SOUND_LIKE_NAME_RE.test(compact);
};

const stripNpcTitlePrefix = (rawName: string): { name: string; affiliation?: string; position?: string } => {
  const clean = rawName.trim();
  if (clean.startsWith('夜莺') && clean.length > 2) {
    return { name: clean.slice(2), affiliation: '夜莺' };
  }
  if (clean.startsWith('税务官') && clean.length > 3) {
    return { name: clean.slice(3), position: '税务官' };
  }
  if (clean.startsWith('巡逻者') && clean.length > 3) {
    return { name: clean.slice(3), position: '巡逻者' };
  }
  if (clean.startsWith('警员') && clean.length > 2) {
    return { name: clean.slice(2), position: '警员' };
  }
  return { name: clean };
};

const inferNearbyAffiliation = (text: string): string | undefined => {
  if (/夜莺/.test(text)) return '夜莺';
  if (/圣教/.test(text)) return '圣教';
  if (/黑玫瑰/.test(text)) return '黑玫瑰';
  if (/血玫瑰/.test(text)) return '血玫瑰';
  return undefined;
};

const inferNearbyPosition = (text: string, fallback?: string): string => {
  const normalizedFallback = (fallback || '').trim();
  if (normalizedFallback) return normalizedFallback;
  if (/税务官/.test(text)) return '税务官';
  if (/巡逻/.test(text)) return '巡逻者';
  if (/(追猎|追杀|猎手|追踪)/.test(text) && /夜莺/.test(text)) return '夜莺追猎者';
  if (/夜莺/.test(text)) return '夜莺成员';
  if (/警员/.test(text)) return '警员';
  if (/佣兵/.test(text)) return '佣兵';
  return '待识别人物';
};

const inferNearbyGender = (text: string): NPC['gender'] => {
  const hasFemaleCue = NEARBY_FEMALE_CUE_RE.test(text);
  const hasMaleCue = NEARBY_MALE_CUE_RE.test(text);
  if (hasFemaleCue && !hasMaleCue) return 'female';
  return 'male';
};

const isRejectedNpcName = (name: string): boolean => {
  const clean = name.trim();
  if (!clean) return true;
  if (clean.length > 16 || /^\d+$/.test(clean)) return true;
  if (NEARBY_NPC_NAME_STOPWORDS.has(clean) || NEARBY_NPC_NAME_STOPWORDS.has(normalizeNpcNameKey(clean))) return true;
  if (NEARBY_NPC_OBJECT_WORDS.some(word => clean.includes(word))) return true;
  if (isSoundEffectLikeName(clean)) return true;
  return false;
};

const buildAutoNearbyNpcStats = (seedKey: string, gender: NPC['gender']): PlayerStats => {
  const isFemale = gender === 'female';
  const baseOffset = hashText(seedKey);
  const hpMax = isFemale ? 220 : 180;
  const mpMax = isFemale ? 260 : 180;
  return ensurePlayerStatsSixDim({
    hp: { current: hpMax, max: hpMax },
    mp: { current: mpMax, max: mpMax },
    formStability: 74 + (baseOffset % 12),
    formStatus: MOCK_PLAYER_STATS.formStatus,
    psionic: {
      level: Rank.Lv1,
      xp: 0,
      maxXp: RANK_CONFIG[Rank.Lv1].maxXp,
      conversionRate: isFemale ? 88 : 42,
      recoveryRate: isFemale ? 55 : 120,
    },
    sixDim: {
      力量: 7 + (baseOffset % 4),
      敏捷: 8 + ((baseOffset >> 1) % 4),
      体质: 7 + ((baseOffset >> 2) % 4),
      感知: 8 + ((baseOffset >> 3) % 4),
      意志: 8 + ((baseOffset >> 4) % 4),
      魅力: isFemale ? 10 + ((baseOffset >> 5) % 4) : 7 + ((baseOffset >> 5) % 4),
      freePoints: 0,
      cap: 99,
    },
    sanity: { current: 70, max: 100 },
    charisma: { current: isFemale ? 58 : 40, max: 100 },
    credits: 0,
    gasMask: { current: 100, max: 100 },
  });
};

const buildAutoNearbyNpcBodyParts = (npcId: string): BodyPart[] =>
  LINGSHU_BODY_PART_TEMPLATE.map((tpl, index) => ({
    id: `${npcId}_${tpl.key}_${index + 1}`,
    key: tpl.key,
    name: tpl.name,
    rank: levelToRank(tpl.level),
    description: tpl.description,
    skills: [],
    equippedItems: [],
    statusAffixes: [],
    maxSkillSlots: 3,
    maxEquipSlots: DEFAULT_LINGSHU_EQUIP_SLOTS,
  }));

const buildAutoNearbyNpcChips = (npcId: string, gender: NPC['gender']): Chip[] =>
  gender === 'male'
    ? [
        {
          id: `${npcId}_chip_board`,
          name: '基础神经主板',
          type: 'board',
          rank: Rank.Lv1,
          description: '自动识别人物，未取得详细芯片模组资料。',
        },
      ]
    : [];

const buildAutoNearbyNpcFromSeed = (location: string, seed: NearbyNpcSeed, index: number, current?: NPC): NPC => {
  const loc = (location || '未知区域').trim() || '未知区域';
  const seedKey = `${loc}_${seed.name}_${index}`;
  const npcId = current?.id || `${AUTO_NEARBY_NPC_ID_PREFIX}${hashText(seedKey)}_${index + 1}`;
  const statusList: NPC['status'][] = ['online', 'busy', 'offline'];
  const status = current?.status || statusList[hashTextToIndex(`${seedKey}_s`, statusList.length)];
  const gender = seed.gender || current?.gender || 'male';
  const stats = buildAutoNearbyNpcStats(seedKey, gender);
  return normalizeNpcForUi({
    id: npcId,
    name: seed.name,
    gender,
    group: current?.group || '',
    position: seed.position || current?.position || '待识别人物',
    affiliation: seed.affiliation || current?.affiliation || '待识别来源',
    location: loc,
    isContact: current?.isContact || false,
    temporaryStatus: current?.temporaryStatus,
    stats,
    affection: gender === 'female' ? current?.affection ?? 12 : undefined,
    trust: gender === 'male' ? current?.trust ?? 12 : undefined,
    bodyParts: gender === 'female' ? buildAutoNearbyNpcBodyParts(npcId) : [],
    spiritSkills: gender === 'male' ? [] : undefined,
    chips: buildAutoNearbyNpcChips(npcId, gender),
    avatarUrl: current?.avatarUrl || 'https://via.placeholder.com/64',
    status,
    inventory: current?.inventory || [],
    socialFeed: current?.socialFeed || [],
    statusTags: Array.from(new Set([...(current?.statusTags || []), '自动识别', '待补全'])),
  });
};

const extractKnownNpcSeedsFromText = (text: string, existingNpcs: NPC[]): NearbyNpcSeed[] => {
  const normalizedText = sanitizeAiMaintext(text).replace(/\s+/g, ' ').trim();
  if (!normalizedText) return [];

  return existingNpcs
    .filter(npc => {
      const name = (npc.name || '').trim();
      return name.length >= 2 && normalizedText.includes(name);
    })
    .sort((a, b) => (b.name || '').length - (a.name || '').length)
    .map(npc => ({
      name: npc.name,
      position: npc.position || '待识别人物',
      gender: npc.gender,
      affiliation: npc.affiliation || '待识别来源',
    }));
};

const inferNearbyNpcSeedsFromMaintext = (maintext: string): NearbyNpcSeed[] => {
  const text = `${maintext || ''}`.replace(/\s+/g, ' ').trim();
  if (!text) return [];

  const seeds: NearbyNpcSeed[] = [];
  const pushSeed = (name: string, position?: string, sourceText?: string, contextText?: string) => {
    const titled = stripNpcTitlePrefix(name.trim());
    const cleanName = titled.name.trim();
    const normalizedName = normalizeNpcNameKey(cleanName);
    if (!normalizedName || isRejectedNpcName(cleanName)) return;
    if (seeds.some(seed => normalizeNpcNameKey(seed.name) === normalizedName)) return;
    const detailText = `${cleanName} ${position || ''} ${sourceText || ''} ${contextText || ''}`.trim();
    if (!NEARBY_HUMAN_CUE_RE.test(detailText) && !/(名叫|叫做|名为|称作)/.test(sourceText || '') && !NEARBY_ACTION_CUE_RE.test(detailText)) {
      return;
    }
    const affiliation = titled.affiliation || inferNearbyAffiliation(detailText);
    seeds.push({
      name: cleanName,
      position: inferNearbyPosition(detailText, titled.position || position),
      gender: inferNearbyGender(detailText),
      affiliation,
    });
  };

  const patterns: Array<{ regex: RegExp; nameIdx: number; posIdx?: number }> = [
    { regex: /(?:名叫|叫做|叫|名为|称作)\s*[「“]?([\u4e00-\u9fa5A-Za-z0-9·_-]{2,16})[」”]?(?:的)?(?:一名|一个)?([\u4e00-\u9fa5]{2,12})?/g, nameIdx: 1, posIdx: 2 },
    { regex: /([「“]?[\u4e00-\u9fa5A-Za-z0-9_-]{2,10}[」”]?)[:：]/g, nameIdx: 1 },
    { regex: /([\u4e00-\u9fa5A-Za-z0-9·_-]{2,16})\s*[（(]([^)）]{2,12})[)）]/g, nameIdx: 1, posIdx: 2 },
    { regex: /(?:^|[，。！？；\s])([\u4e00-\u9fa5A-Za-z0-9·_-]{2,16})(?=(?:停了下来|停下|停住|开口|说道|说|低声|冷笑|俯身|逼近|走来|走近|靠近|抬手|举起|看向|盯着|命令|追来|站定|转过身|挥手))/g, nameIdx: 1 },
  ];

  patterns.forEach(({ regex, nameIdx, posIdx }) => {
    const matches = text.matchAll(regex);
    for (const match of matches) {
      const rawName = `${match[nameIdx] || ''}`.replace(/[「」“”]/g, '');
      const rawPos = posIdx ? `${match[posIdx] || ''}` : '';
      if (rawName.length < 2) continue;
      if (/当前地点|系统|玩家|你在|继续行动|灵能|剧情|设置|时间|地点|场景/.test(rawName)) continue;
      const contextStart = Math.max(0, (match.index || 0) - 18);
      const contextEnd = Math.min(text.length, (match.index || 0) + (match[0] || '').length + 18);
      const contextText = text.slice(contextStart, contextEnd);
      pushSeed(rawName, rawPos, match[0] || '', contextText);
      if (seeds.length >= 4) break;
    }
  });

  return seeds.slice(0, 4);
};

const collectNearbyNpcSeeds = (texts: string[], existingNpcs: NPC[], currentLocation: string, factionName: string): NearbyNpcSeed[] => {
  const locationKey = normalizeNpcNameKey(currentLocation);
  const factionKey = normalizeNpcNameKey(factionName);
  const merged: NearbyNpcSeed[] = [];
  const seen = new Set<string>();

  const pushSeed = (seed: NearbyNpcSeed) => {
    const key = normalizeNpcNameKey(seed.name);
    if (!key || seen.has(key)) return;
    if (key === locationKey || key === factionKey) return;
    seen.add(key);
    merged.push({
      ...seed,
      position: seed.position || '待识别人物',
      affiliation: seed.affiliation || '待识别来源',
    });
  };

  texts.forEach(text => {
    extractKnownNpcSeedsFromText(text, existingNpcs).forEach(pushSeed);
    inferNearbyNpcSeedsFromMaintext(text).forEach(pushSeed);
  });

  return merged.slice(0, 6);
};

const buildAutoNearbyNpcsFromSeeds = (location: string, seeds: NearbyNpcSeed[]): NPC[] => {
  const loc = (location || '未知区域').trim() || '未知区域';
  if (seeds.length === 0) return [];

  return seeds.slice(0, 6).map((seed, index) => buildAutoNearbyNpcFromSeed(loc, seed, index));
};

type NearbyNpcRecordBodyPart = {
  key: string;
  spiritStrings: string[];
  equipments: string[];
};

type NearbyNpcRecord = {
  name: string;
  gender: NPC['gender'];
  affiliation: string;
  position: string;
  location?: string;
  race?: string;
  psionicRank: Rank;
  perception?: number;
  chipModules: string[];
  bodyParts: NearbyNpcRecordBodyPart[];
  storedSouls?: number;
  statusTags: string[];
};

const coerceRankFromValue = (value: unknown, fallback: Rank = Rank.Lv1): Rank => {
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return fallback;
    const normalized = text.toLowerCase();
    if (normalized === 'lv.1' || normalized === 'lv1' || normalized === '1') return Rank.Lv1;
    if (normalized === 'lv.2' || normalized === 'lv2' || normalized === '2') return Rank.Lv2;
    if (normalized === 'lv.3' || normalized === 'lv3' || normalized === '3') return Rank.Lv3;
    if (normalized === 'lv.4' || normalized === 'lv4' || normalized === '4') return Rank.Lv4;
    if (normalized === 'lv.5' || normalized === 'lv5' || normalized === '5') return Rank.Lv5;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return levelToRank(value);
  }
  return fallback;
};

const coerceNearbyGender = (value: unknown, coreType?: unknown): NPC['gender'] => {
  const text = `${value || ''}`.trim().toLowerCase();
  if (text === 'female' || text === '女' || text === '女性') return 'female';
  if (text === 'male' || text === '男' || text === '男性') return 'male';
  const coreText = `${coreType || ''}`.trim();
  if (coreText.includes('奇点')) return 'female';
  return 'male';
};

const pickStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map(entry => `${entry || ''}`.trim())
        .filter(Boolean),
    ),
  );
};

const resolveNearbyBodyPartKey = (value: unknown): string => {
  const text = `${value || ''}`.trim().toLowerCase();
  if (!text) return 'body';
  const direct = LINGSHU_BODY_PART_TEMPLATE.find(tpl => {
    const aliasSet = new Set([tpl.key, ...(tpl.aliases || [])].map(item => item.toLowerCase()));
    return aliasSet.has(text);
  });
  if (direct) return direct.key;
  if (/(眼|eye)/.test(text)) return 'eyes';
  if (/(脑|核|core|brain)/.test(text)) return 'brain';
  if (/(脸|face)/.test(text)) return 'face';
  if (/(嘴|mouth)/.test(text)) return 'mouth';
  if (/(胸|chest)/.test(text)) return 'chest';
  if (/(左臂|leftarm|larm)/.test(text)) return 'l_arm';
  if (/(右臂|rightarm|rarm)/.test(text)) return 'r_arm';
  if (/(左手|lefthand|lhand)/.test(text)) return 'l_hand';
  if (/(右手|righthand|rhand)/.test(text)) return 'r_hand';
  if (/(左腿|leftleg|lleg)/.test(text)) return 'l_leg';
  if (/(右腿|rightleg|rleg)/.test(text)) return 'r_leg';
  if (/(左脚|leftfoot|lfoot)/.test(text)) return 'l_foot';
  if (/(右脚|rightfoot|rfoot)/.test(text)) return 'r_foot';
  if (/(腿|leg)/.test(text)) return 'r_leg';
  if (/(脚|foot)/.test(text)) return 'r_foot';
  if (/(躯干|身躯|body|torso)/.test(text)) return 'body';
  if (/(臀|hip)/.test(text)) return 'hip';
  if (/(腋|axilla)/.test(text)) return 'axilla';
  return 'body';
};

const classifyNearbyChipType = (name: string): Chip['type'] => {
  if (/(主板|母板|board)/i.test(name)) return 'board';
  if (/(协议|算法|管理|控制|矩阵|识别)/i.test(name)) return 'process';
  if (/(驱动|推进|强化|增幅|追踪|激活|爆发)/i.test(name)) return 'active';
  return 'passive';
};

const buildNearbySkill = (name: string, rank: Rank, description?: string): Skill => ({
  id: `skill_${hashText(`${name}_${rank}_${description || ''}_${Date.now()}`)}`,
  name: name.startsWith('灵弦') ? name : `灵弦：${name}`,
  level: rankToLevel(rank),
  description: description || '由结构化 NPC 数据写入的灵弦。',
  rank,
});

const buildNearbyEquipItem = (npcId: string, partKey: string, name: string, rank: Rank) => ({
  id: `${npcId}_${partKey}_equip_${hashText(name)}`,
  name,
  description: '由结构化 NPC 数据写入的部位装备。',
  sourceCategory: 'equipment' as const,
  rank,
});

const buildNearbyCapturedSouls = (npcId: string, count: number, rank: Rank) =>
  Array.from({ length: Math.max(0, Math.min(10, count)) }).map((_, index) => ({
    id: `${npcId}_soul_${index + 1}`,
    originalName: `未登记灵魂-${index + 1}`,
    rank,
    efficiency: 1,
    retainedSkills: [],
    status: 'intact' as const,
  }));

const buildStructuredNpcStats = (record: NearbyNpcRecord, seedKey: string): PlayerStats => {
  const isFemale = record.gender === 'female';
  const level = rankToLevel(record.psionicRank);
  const maxMp = getMaxMpByGenderAndRank(record.gender, record.psionicRank);
  const maxHp = 150 + level * 45 + (isFemale ? 15 : 0);
  const perception = Math.max(6, Math.min(99, Number(record.perception || (isFemale ? 14 : 12))));
  const baseHash = hashText(seedKey);
  return ensurePlayerStatsSixDim({
    hp: { current: maxHp, max: maxHp },
    mp: { current: maxMp, max: maxMp },
    formStability: 72 + (baseHash % 16),
    formStatus: MOCK_PLAYER_STATS.formStatus,
    psionic: {
      level: record.psionicRank,
      xp: 0,
      maxXp: RANK_CONFIG[record.psionicRank].maxXp,
      conversionRate: isFemale ? 80 + level * 6 : 38 + level * 10,
      recoveryRate: isFemale ? 42 + level * 4 : 96 + level * 10,
    },
    sixDim: {
      力量: 7 + Math.min(4, level),
      敏捷: 8 + ((baseHash >> 1) % 4),
      体质: 7 + ((baseHash >> 2) % 4),
      感知: perception,
      意志: 8 + Math.min(4, level),
      魅力: isFemale ? 9 + ((baseHash >> 3) % 5) : 7 + ((baseHash >> 3) % 4),
      freePoints: 0,
      cap: 99,
    },
    sanity: { current: 75, max: 100 },
    charisma: { current: isFemale ? 60 : 45, max: 100 },
    credits: 0,
    gasMask: { current: 100, max: 100 },
  });
};

const buildStructuredNpcBodyParts = (npcId: string, record: NearbyNpcRecord): BodyPart[] => {
  const rank = record.psionicRank;
  const baseParts = buildAutoNearbyNpcBodyParts(npcId).map(part => ({ ...part, rank }));
  const partMap = new Map(baseParts.map(part => [part.key, part]));
  record.bodyParts.forEach(partRecord => {
    const target = partMap.get(partRecord.key);
    if (!target) return;
    target.skills = partRecord.spiritStrings.map(name => buildNearbySkill(name, rank));
    target.equippedItems = partRecord.equipments.map(name => buildNearbyEquipItem(npcId, partRecord.key, name, rank));
  });
  if (record.gender === 'female' && (record.storedSouls || 0) > 0) {
    const corePart = partMap.get('brain');
    if (corePart) {
      corePart.capturedSouls = buildNearbyCapturedSouls(npcId, record.storedSouls || 0, rank);
    }
  }
  return Array.from(partMap.values());
};

const buildStructuredNpcChips = (npcId: string, record: NearbyNpcRecord): Chip[] =>
  record.chipModules.map((name, index) => ({
    id: `${npcId}_chip_${index + 1}_${hashText(name)}`,
    name,
    type: classifyNearbyChipType(name),
    rank: record.psionicRank,
    description: '由结构化 NPC 数据写入的芯片模组。',
  }));

const extractNpcDataCandidate = (raw: string): { found: boolean; text: string } => {
  const clean = sanitizeAiMaintext(raw);
  if (!clean) return { found: false, text: '' };

  const pickFromText = (source: string): string => {
    const scoped = source.match(/<npcdata\b[^>]*>([\s\S]*?)<\/npcdata>/i)?.[1] || source;
    const trimmed = scoped.trim();
    if (!trimmed) return '';
    if (trimmed.startsWith('[')) return trimmed;
    return extractFirstJsonArraySnippet(trimmed);
  };

  const direct = pickFromText(clean);
  if (direct) return { found: true, text: direct };

  const fencedBlocks = [...clean.matchAll(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g)].map(match => match[1] || '');
  for (const block of fencedBlocks) {
    const picked = pickFromText(block);
    if (picked) return { found: true, text: picked };
  }

  return { found: false, text: '' };
};

const parseNearbyNpcRecordsFromText = (raw: string): { records: NearbyNpcRecord[]; error: string | null } => {
  const candidate = extractNpcDataCandidate(raw);
  if (!candidate.found) return { records: [], error: null };

  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate.text);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 语法错误';
    return { records: [], error: `npcdata 解析失败：${message}` };
  }

  if (!Array.isArray(parsed)) {
    return { records: [], error: 'npcdata 解析结果不是数组。' };
  }

  const records: NearbyNpcRecord[] = [];
  parsed.forEach(entry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const row = entry as Record<string, unknown>;
    const titled = stripNpcTitlePrefix(`${row.name || row.npc_name || ''}`.trim());
    const name = titled.name.trim();
    if (isRejectedNpcName(name)) return;

    const rawCore = row.core && typeof row.core === 'object' && !Array.isArray(row.core) ? (row.core as Record<string, unknown>) : {};
    const gender = coerceNearbyGender(row.gender, rawCore.type || row.core_type);
    const rank = coerceRankFromValue(
      row.psionic_rank || row.psionicRank || row.rank || row.psionic_level || rawCore.rank,
      Rank.Lv1,
    );
    const bodyPartRows = Array.isArray(row.body_parts)
      ? row.body_parts
      : Array.isArray(row.bodyParts)
        ? row.bodyParts
        : [];
    const mergedParts = new Map<string, NearbyNpcRecordBodyPart>();
    bodyPartRows.forEach(partEntry => {
      if (!partEntry || typeof partEntry !== 'object' || Array.isArray(partEntry)) return;
      const partRow = partEntry as Record<string, unknown>;
      const key = resolveNearbyBodyPartKey(partRow.key || partRow.part || partRow.name);
      const current = mergedParts.get(key) || { key, spiritStrings: [], equipments: [] };
      current.spiritStrings = Array.from(
        new Set([
          ...current.spiritStrings,
          ...pickStringArray(partRow.spirit_strings || partRow.spiritStrings || partRow.strings),
        ]),
      ).slice(0, 5);
      current.equipments = Array.from(
        new Set([
          ...current.equipments,
          ...pickStringArray(partRow.equipments || partRow.equipment || partRow.items),
        ]),
      ).slice(0, 4);
      mergedParts.set(key, current);
    });

    const chipModules = pickStringArray(row.chip_modules || row.chipModules || row.chips).slice(0, 8);
    const storedSoulsRaw = Number(
      rawCore.stored_souls || rawCore.storedSouls || rawCore.soul_count || rawCore.soulCount || row.stored_souls || row.storedSouls || 0,
    );
    const storedSouls = gender === 'female' && Number.isFinite(storedSoulsRaw) ? Math.max(0, Math.min(10, storedSoulsRaw)) : 0;
    const perceptionRaw = Number(row.perception || row.perception_value || row.sense || row.sense_value);
    const perception = Number.isFinite(perceptionRaw) ? Math.max(6, Math.min(99, perceptionRaw)) : undefined;
    const affiliation =
      `${row.affiliation || row.faction || row.organization || titled.affiliation || ''}`.trim() || '待识别来源';
    const position = inferNearbyPosition(
      `${row.position || row.role || ''} ${affiliation}`.trim(),
      `${row.position || row.role || titled.position || ''}`.trim(),
    );
    const race = `${row.race || row.race_name || ''}`.trim() || undefined;
    const notes = pickStringArray(rawCore.notes || row.notes);
    const statusTags = Array.from(
      new Set([
        ...pickStringArray(row.status_tags || row.statusTags || row.tags),
        ...notes,
        perception ? `感知度 ${perception}` : '',
        gender === 'female' ? `灵核空间 ${storedSouls} 魂` : '发散型灵核',
      ].filter(Boolean)),
    ).slice(0, 8);

    records.push({
      name,
      gender,
      affiliation,
      position,
      location: `${row.location || ''}`.trim() || undefined,
      race,
      psionicRank: rank,
      perception,
      chipModules,
      bodyParts: Array.from(mergedParts.values()),
      storedSouls,
      statusTags,
    });
  });

  return { records, error: null };
};

const serializeNearbyNpcRecords = (records: NearbyNpcRecord[]): string => JSON.stringify(records, null, 2);

const buildStructuredNearbyNpc = (location: string, record: NearbyNpcRecord, index: number, current?: NPC): NPC => {
  const fallbackSeed: NearbyNpcSeed = {
    name: record.name,
    gender: record.gender,
    position: record.position,
    affiliation: record.affiliation,
  };
  const base = buildAutoNearbyNpcFromSeed(location, fallbackSeed, index, current);
  const npcId = current?.id || base.id;
  const stats = buildStructuredNpcStats(record, `${location}_${record.name}_${index}`);
  const bodyParts = buildStructuredNpcBodyParts(npcId, record);
  const chips = buildStructuredNpcChips(npcId, record);
  const spiritSkills = record.gender === 'male' ? bodyParts.flatMap(part => part.skills || []).slice(0, 6) : [];
  return normalizeNpcForUi({
    ...base,
    ...current,
    id: npcId,
    name: record.name,
    gender: record.gender,
    position: record.position,
    affiliation: record.affiliation,
    location: record.location || location,
    race: record.race,
    isContact: current?.isContact || false,
    temporaryStatus: undefined,
    stats,
    statusTags: Array.from(new Set([...(current?.statusTags || []), '自动识别', ...record.statusTags])),
    affection: record.gender === 'female' ? current?.affection ?? 12 : undefined,
    trust: record.gender === 'male' ? current?.trust ?? 12 : undefined,
    bodyParts,
    spiritSkills,
    chips,
    inventory: current?.inventory || [],
    socialFeed: current?.socialFeed || [],
  });
};

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
  if (tagMatch?.[1]?.trim()) return stripLeadingStatusLinesFromMaintext(tagMatch[1]);
  const contentMatch = text.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i);
  if (contentMatch?.[1]?.trim()) return stripLeadingStatusLinesFromMaintext(contentMatch[1]);

  const fencedBlocks = [...text.matchAll(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g)].map(m => m[1]?.trim() || '');
  const preferred = fencedBlocks.find(block => /<maintext>[\s\S]*?<\/maintext>/i.test(block));
  if (preferred) {
    const inner = preferred.match(/<maintext>([\s\S]*?)<\/maintext>/i);
    if (inner?.[1]?.trim()) return stripLeadingStatusLinesFromMaintext(inner[1]);
  }

  // Strict fallback:
  // If model mixed modules in one response and forgot <maintext>,
  // only keep the prefix before <sum>/<UpdateVariable>.
  const splitIndex = text.search(/<(?:sum|npcdata|update(?:variable)?)\b/i);
  if (splitIndex > 0) {
    const prefix = stripLeadingStatusLinesFromMaintext(text.slice(0, splitIndex));
    if (prefix) return prefix;
  }

  // Relaxed fallback:
  // If no <maintext> exists, remove known module blocks and keep plain narrative body.
  const stripped = sanitizeAiMaintext(
    text
      .replace(/<thinking\b[^>]*>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<sum\b[^>]*>[\s\S]*?<\/sum>/gi, '')
      .replace(/<npcdata\b[^>]*>[\s\S]*?<\/npcdata>/gi, '')
      .replace(/<update(?:variable)?\b[^>]*>[\s\S]*?<\/update(?:variable)?>/gi, '')
      .replace(/<analysis\b[^>]*>[\s\S]*?<\/analysis>/gi, '')
      .replace(/<jsonpatch\b[^>]*>[\s\S]*?<\/jsonpatch>/gi, '')
      .replace(/<\/?(?:time|content|recap|details|summary)\b[^>]*>/gi, '')
      .replace(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g, '$1'),
  );
  return stripLeadingStatusLinesFromMaintext(stripped || text);
};

const extractTaggedTextFromApiOutput = (raw: string, tags: string[]): string | null => {
  const text = sanitizeAiMaintext(raw);
  if (!text || tags.length === 0) return null;
  const escapedTags = tags.map(tag => tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const tagPattern = escapedTags.join('|');

  const matchTaggedBlock = (source: string): string | null => {
    const direct = source.match(new RegExp(`<(${tagPattern})\\b[^>]*>([\\s\\S]*?)<\\/\\1>`, 'i'));
    const inner = direct?.[2]?.trim();
    return inner ? sanitizeAiMaintext(inner) : null;
  };

  const direct = matchTaggedBlock(text);
  if (direct) return direct;

  const fencedBlocks = [...text.matchAll(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g)].map(match => match[1] || '');
  for (const block of fencedBlocks) {
    const picked = matchTaggedBlock(block);
    if (picked) return picked;
  }

  return null;
};

const extractSumFromApiOutput = (raw: string): string | null => extractTaggedTextFromApiOutput(raw, ['sum', 'summary', 'recap']);

type VariablePatchOperation =
  | { op: 'replace'; path: string; value: unknown }
  | { op: 'delta'; path: string; value: number }
  | { op: 'insert'; path: string; value: unknown }
  | { op: 'remove'; path: string }
  | { op: 'move'; from: string; to: string };

type ParsedApiOutput = {
  maintext: string | null;
  sum: string | null;
  npcDataRecords: NearbyNpcRecord[];
  npcDataParseError: string | null;
  patchOperations: VariablePatchOperation[];
  patchParseError: string | null;
};

type PatchApplyResult = {
  applied: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type WriteMode = 'upsert' | 'insert';

const deepClonePlainData = <T,>(value: T): T => {
  if (value === null || value === undefined) return value;
  if (typeof globalThis.structuredClone === 'function') {
    try {
      return globalThis.structuredClone(value);
    } catch {
      // fallback to JSON clone below
    }
  }
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const next = Number(value);
  return Number.isFinite(next) ? next : undefined;
};

const runtimePercentToStatRate = (value: number): number => {
  const normalized = Math.max(0, value) / 100;
  return Math.round(normalized * 1000) / 1000;
};

const statRateToRuntimePercent = (value: unknown): number | undefined => {
  const next = toFiniteNumber(value);
  if (next === undefined) return undefined;
  return Math.abs(next) <= 3 ? next * 100 : next;
};

const createEmptyLcoinBuckets = (): Record<LcoinBucketKey, number> => ({
  lv1: 0,
  lv2: 0,
  lv3: 0,
  lv4: 0,
  lv5: 0,
});

const readLcoinBucketsFromStat = (raw: unknown): {
  buckets: Record<LcoinBucketKey, number>;
  total: number;
  hasAny: boolean;
} => {
  const buckets = createEmptyLcoinBuckets();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { buckets, total: 0, hasAny: false };
  }

  let total = 0;
  let hasAny = false;
  LCOIN_BUCKET_KEYS.forEach(key => {
    const next = Math.max(0, toFiniteNumber((raw as Record<string, unknown>)[key]) ?? 0);
    buckets[key] = next;
    total += next;
    if (next > 0) hasAny = true;
  });

  const explicitTotal = Math.max(0, toFiniteNumber((raw as Record<string, unknown>).total) ?? 0);
  return {
    buckets,
    total: explicitTotal > 0 ? explicitTotal : total,
    hasAny: hasAny || explicitTotal > 0,
  };
};

const buildLcoinBucketsFromVault = (
  vault: Partial<Record<Rank, number>>,
  fallbackCredits: number,
  currentRank: Rank,
): Record<LcoinBucketKey, number> => {
  const buckets = createEmptyLcoinBuckets();
  LCOIN_BUCKET_KEYS.forEach((_, index) => {
    const rank = levelToRank(index + 1);
    buckets[RANK_TO_LCOIN_KEY[rank]] = Math.max(0, toFiniteNumber(vault?.[rank]) ?? 0);
  });
  const total = Object.values(buckets).reduce((sum, value) => sum + value, 0);
  if (total <= 0 && fallbackCredits > 0) {
    buckets[RANK_TO_LCOIN_KEY[currentRank]] = Math.max(0, fallbackCredits);
  }
  return buckets;
};

const normalizeRuntimeAffixList = (raw: unknown, prefix: string): RuntimeAffix[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) return null;
        return {
          id: `${prefix}_${index + 1}_${hashText(name)}`,
          name,
          description: name,
          type: 'neutral' as const,
          source: '变量同步',
        };
      }
      if (typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const name = `${record.name ?? record.title ?? ''}`.trim();
      if (!name) return null;
      const description = `${record.description ?? record.desc ?? record.detail ?? name}`.trim() || name;
      const typeRaw = `${record.type ?? 'neutral'}`.trim().toLowerCase();
      const type =
        typeRaw === 'buff' || typeRaw === 'debuff' || typeRaw === 'neutral'
          ? (typeRaw as RuntimeAffix['type'])
          : 'neutral';
      return {
        id: `${record.id ?? `${prefix}_${index + 1}_${hashText(`${name}_${description}`)}`}`,
        name,
        description,
        type,
        source: `${record.source ?? '变量同步'}`.trim() || '变量同步',
        stacks: Math.max(1, Math.round(toFiniteNumber(record.stacks) ?? 1)),
      };
    })
    .filter((entry): entry is RuntimeAffix => !!entry);
};

const toStatAffixRecord = (affix: RuntimeAffix) => ({
  name: affix.name,
  desc: affix.description || affix.name,
  description: affix.description || affix.name,
  type: affix.type || 'neutral',
  source: affix.source || '前端同步',
  stacks: affix.stacks ?? 1,
});

const normalizeStatLingshuParts = (raw: unknown): GameConfig['selectedLingshu'] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const record = entry as Record<string, unknown>;
      const name = `${record.name ?? record.key ?? record.id ?? ''}`.trim();
      if (!name) return null;
      const rank = coerceRankFromValue(record.rank ?? record.level ?? record.lv, Rank.Lv1);
      const level = Math.max(1, Math.round(toFiniteNumber(record.level) ?? rankToLevel(rank)));
      return {
        id: `${record.id ?? record.key ?? `stat_lingshu_${index + 1}`}`,
        key: `${record.key ?? record.id ?? `part_${index + 1}`}`,
        name,
        rank,
        level,
        strengthProgress: Math.max(0, Math.min(100, Math.round(toFiniteNumber(record.strengthProgress) ?? 0))),
        description: `${record.description ?? `${name}灵枢节点`}`.trim() || `${name}灵枢节点`,
        statusAffixes: normalizeRuntimeAffixList(record.status ?? record.statusAffixes, `lingshu_${index + 1}`),
        equippedItems: [],
        spiritSkills: [],
      };
    })
    .filter((entry): entry is GameConfig['selectedLingshu'][number] => !!entry);
};

const toStatLingshuPartRecord = (part: GameConfig['selectedLingshu'][number], index: number) => ({
  id: part.id,
  key: part.key || part.id || `part_${index + 1}`,
  name: part.name,
  rank: part.rank,
  level: part.level || rankToLevel(part.rank),
  lingshu_strength: part.level || rankToLevel(part.rank),
  strengthProgress: Math.max(0, Math.min(100, Math.round(part.strengthProgress ?? 0))),
  description: part.description || `${part.name}灵枢节点`,
  status: (part.statusAffixes || []).map(toStatAffixRecord),
});

const unwrapCodeFence = (raw: string): string => {
  const text = sanitizeAiMaintext(raw);
  const fenced = text.match(/^```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)\s*```$/);
  return fenced?.[1]?.trim() || text;
};

const extractFirstJsonArraySnippet = (raw: string): string => {
  const text = sanitizeAiMaintext(raw);
  if (!text) return '';
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString && char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (char === '[') {
      if (depth === 0) start = i;
      depth += 1;
      continue;
    }
    if (char === ']') {
      if (depth === 0) continue;
      depth -= 1;
      if (depth === 0 && start >= 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return '';
};

const normalizePatchPath = (rawPath: string): string => {
  const trimmed = `${rawPath || ''}`.trim();
  if (!trimmed) return '';

  let body = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  if (!trimmed.startsWith('/') && body.includes('.') && !body.includes('/')) {
    body = body.replace(/\./g, '/');
  }
  body = body.replace(/^\/+/, '');
  if (!body) return '';

  if (body === 'stat_data' || body.startsWith('stat_data/')) {
    return `/${body}`.replace(/\/{2,}/g, '/');
  }
  return `/stat_data/${body}`.replace(/\/{2,}/g, '/');
};

const extractJsonPatchCandidate = (raw: string): { found: boolean; text: string } => {
  const clean = sanitizeAiMaintext(raw);
  if (!clean) return { found: false, text: '' };

  const pickFromText = (source: string): string => {
    const updateMatch = source.match(/<update(?:variable)?\b[^>]*>([\s\S]*?)<\/update(?:variable)?>/i);
    const scoped = updateMatch?.[1] || source;
    const taggedPatch = scoped.match(/<jsonpatch\b[^>]*>([\s\S]*?)<\/jsonpatch>/i);
    if (taggedPatch?.[1]?.trim()) return taggedPatch[1].trim();
    if (updateMatch?.[1]) {
      const arraySnippet = extractFirstJsonArraySnippet(updateMatch[1]);
      if (arraySnippet) return arraySnippet;
    }
    return '';
  };

  const direct = pickFromText(clean);
  if (direct) return { found: true, text: direct };

  const fencedBlocks = [...clean.matchAll(/```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```/g)].map(match => match[1] || '');
  for (const block of fencedBlocks) {
    const picked = pickFromText(block);
    if (picked) return { found: true, text: picked };
  }

  const standalone = clean.match(/<jsonpatch\b[^>]*>([\s\S]*?)<\/jsonpatch>/i);
  if (standalone?.[1]?.trim()) return { found: true, text: standalone[1].trim() };

  return { found: false, text: '' };
};

const parsePatchOperationsFromText = (raw: string): { operations: VariablePatchOperation[]; error: string | null } => {
  const candidate = extractJsonPatchCandidate(raw);
  if (!candidate.found) return { operations: [], error: null };

  const unpacked = unwrapCodeFence(candidate.text);
  const arraySnippet = unpacked.trim().startsWith('[') ? unpacked.trim() : extractFirstJsonArraySnippet(unpacked);
  if (!arraySnippet) {
    return { operations: [], error: '检测到 <UpdateVariable>，但未找到可解析的 JSONPatch 数组。' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(arraySnippet);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'JSON 语法错误';
    return { operations: [], error: `JSONPatch 解析失败：${message}` };
  }

  if (!Array.isArray(parsed)) {
    return { operations: [], error: 'JSONPatch 解析结果不是数组。' };
  }

  const operations: VariablePatchOperation[] = [];
  parsed.forEach(entry => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const op = `${record.op || ''}`.trim().toLowerCase();

    if (op === 'replace' || op === 'insert') {
      const path = normalizePatchPath(`${record.path || ''}`);
      if (!path) return;
      operations.push({ op, path, value: record.value });
      return;
    }

    if (op === 'delta') {
      const path = normalizePatchPath(`${record.path || ''}`);
      const delta = Number(record.value);
      if (!path || !Number.isFinite(delta)) return;
      operations.push({ op: 'delta', path, value: delta });
      return;
    }

    if (op === 'remove') {
      const path = normalizePatchPath(`${record.path || ''}`);
      if (!path) return;
      operations.push({ op: 'remove', path });
      return;
    }

    if (op === 'move') {
      const from = normalizePatchPath(`${record.from || ''}`);
      const to = normalizePatchPath(`${record.to || record.path || ''}`);
      if (!from || !to) return;
      operations.push({ op: 'move', from, to });
    }
  });

  if (operations.length === 0 && parsed.length > 0) {
    return { operations: [], error: 'JSONPatch 中没有可执行的操作（字段缺失或格式不合法）。' };
  }

  return { operations, error: null };
};

const parseApiOutputPayload = (raw: string): ParsedApiOutput => {
  const clean = sanitizeAiMaintext(raw);
  const extractedMaintext = extractMaintextFromApiOutput(clean);
  const finalMaintext = sanitizeAiMaintext(extractedMaintext);
  const maintext =
    /<\/?(?:html|body|script)\b/i.test(finalMaintext)
      ? extractedMaintext || null
      : finalMaintext || extractedMaintext || null;
  const npcDataParsed = parseNearbyNpcRecordsFromText(clean);
  const { operations, error } = parsePatchOperationsFromText(clean);
  return {
    maintext,
    sum: extractSumFromApiOutput(clean),
    npcDataRecords: npcDataParsed.records,
    npcDataParseError: npcDataParsed.error,
    patchOperations: operations,
    patchParseError: error,
  };
};

const decodeJsonPointerToken = (token: string): string => token.replace(/~1/g, '/').replace(/~0/g, '~');
const isObjectRecord = (value: unknown): value is Record<string, any> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isArrayIndexToken = (token: string): boolean => /^\d+$/.test(token);
const parseArrayIndexToken = (token: string): number | null => (isArrayIndexToken(token) ? Number(token) : null);
const toPointerTokens = (path: string): string[] =>
  normalizePatchPath(path)
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map(decodeJsonPointerToken);

const readValueByPointer = (
  root: Record<string, any>,
  tokens: string[],
): { exists: boolean; value: unknown } => {
  if (tokens.length === 0) return { exists: true, value: root };
  let current: unknown = root;
  for (const token of tokens) {
    if (Array.isArray(current)) {
      const index = parseArrayIndexToken(token);
      if (index === null || index < 0 || index >= current.length) return { exists: false, value: undefined };
      current = current[index];
      continue;
    }
    if (!isObjectRecord(current) || !(token in current)) return { exists: false, value: undefined };
    current = current[token];
  }
  return { exists: true, value: current };
};

const writeValueByPointer = (
  root: Record<string, any>,
  tokens: string[],
  value: unknown,
  mode: WriteMode,
): boolean => {
  if (tokens.length === 0) return false;
  let current: unknown = root;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    const nextToken = tokens[i + 1];
    const shouldArray = nextToken === '-' || isArrayIndexToken(nextToken);

    if (Array.isArray(current)) {
      const index = parseArrayIndexToken(token);
      if (index === null || index < 0 || index > current.length) return false;
      if (index === current.length) {
        current.push(shouldArray ? [] : {});
      } else if (current[index] === null || typeof current[index] !== 'object') {
        current[index] = shouldArray ? [] : {};
      }
      current = current[index];
      continue;
    }

    if (!isObjectRecord(current)) return false;
    if (current[token] === null || typeof current[token] !== 'object') {
      current[token] = shouldArray ? [] : {};
    }
    current = current[token];
  }

  const lastToken = tokens[tokens.length - 1];
  const clonedValue = deepClonePlainData(value);
  if (Array.isArray(current)) {
    if (lastToken === '-') {
      current.push(clonedValue);
      return true;
    }
    const index = parseArrayIndexToken(lastToken);
    if (index === null || index < 0) return false;
    if (mode === 'insert') {
      if (index > current.length) return false;
      current.splice(index, 0, clonedValue);
      return true;
    }
    if (index > current.length) return false;
    if (index === current.length) {
      current.push(clonedValue);
      return true;
    }
    current[index] = clonedValue;
    return true;
  }

  if (!isObjectRecord(current)) return false;
  current[lastToken] = clonedValue;
  return true;
};

const removeValueByPointer = (
  root: Record<string, any>,
  tokens: string[],
): { removed: boolean; value: unknown } => {
  if (tokens.length === 0) return { removed: false, value: undefined };
  let current: unknown = root;
  for (let i = 0; i < tokens.length - 1; i += 1) {
    const token = tokens[i];
    if (Array.isArray(current)) {
      const index = parseArrayIndexToken(token);
      if (index === null || index < 0 || index >= current.length) return { removed: false, value: undefined };
      current = current[index];
      continue;
    }
    if (!isObjectRecord(current) || !(token in current)) return { removed: false, value: undefined };
    current = current[token];
  }

  const lastToken = tokens[tokens.length - 1];
  if (Array.isArray(current)) {
    const index = parseArrayIndexToken(lastToken);
    if (index === null || index < 0 || index >= current.length) return { removed: false, value: undefined };
    const [removed] = current.splice(index, 1);
    return { removed: true, value: removed };
  }

  if (!isObjectRecord(current) || !(lastToken in current)) return { removed: false, value: undefined };
  const removed = current[lastToken];
  delete current[lastToken];
  return { removed: true, value: removed };
};

const applyPatchOperationsToVariables = (
  targetVariables: Record<string, any>,
  operations: VariablePatchOperation[],
): PatchApplyResult => {
  const result: PatchApplyResult = { applied: 0, skipped: 0, failed: 0, errors: [] };
  operations.forEach((operation, index) => {
    try {
      if (operation.op === 'remove') {
        const removed = removeValueByPointer(targetVariables, toPointerTokens(operation.path));
        if (removed.removed) result.applied += 1;
        else result.skipped += 1;
        return;
      }

      if (operation.op === 'move') {
        const fromTokens = toPointerTokens(operation.from);
        const toTokens = toPointerTokens(operation.to);
        if (fromTokens.length === 0 || toTokens.length === 0) {
          result.skipped += 1;
          return;
        }
        const removed = removeValueByPointer(targetVariables, fromTokens);
        if (!removed.removed) {
          result.skipped += 1;
          return;
        }
        const moved = writeValueByPointer(targetVariables, toTokens, removed.value, 'upsert');
        if (moved) {
          result.applied += 1;
          return;
        }
        writeValueByPointer(targetVariables, fromTokens, removed.value, 'upsert');
        result.failed += 1;
        result.errors.push(`move#${index + 1} 目标路径不可写`);
        return;
      }

      const tokens = toPointerTokens(operation.path);
      if (tokens.length === 0) {
        result.skipped += 1;
        return;
      }

      if (operation.op === 'delta') {
        const current = readValueByPointer(targetVariables, tokens);
        const currentNumber = Number(current.exists ? current.value : 0);
        const base = Number.isFinite(currentNumber) ? currentNumber : 0;
        const next = base + operation.value;
        const changed = writeValueByPointer(targetVariables, tokens, next, 'upsert');
        if (changed) result.applied += 1;
        else result.skipped += 1;
        return;
      }

      const changed = writeValueByPointer(
        targetVariables,
        tokens,
        operation.value,
        operation.op === 'insert' ? 'insert' : 'upsert',
      );
      if (changed) result.applied += 1;
      else result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      const message = error instanceof Error ? error.message : '未知错误';
      result.errors.push(`op#${index + 1}: ${message}`);
    }
  });
  return result;
};

type TavernGenerateArgs = {
  user_input?: string;
  should_silence?: boolean;
};

type TavernGenerateFn = (args: TavernGenerateArgs) => Promise<unknown>;
type TavernGetVariablesFn = (args: { type: 'chat' }) => Record<string, any>;
type TavernReplaceVariablesFn = (vars: Record<string, any>, args: { type: 'chat' }) => void;

const bindHostFunction = <T extends (...args: any[]) => any>(host: unknown, key: string): T | null => {
  if (!host || (typeof host !== 'object' && typeof host !== 'function')) return null;
  const record = host as Record<string, unknown>;
  const fn = record[key];
  if (typeof fn !== 'function') return null;
  return (fn as (...args: any[]) => any).bind(host) as T;
};

const readParentRuntime = (): unknown => {
  try {
    return (globalThis as { parent?: unknown }).parent;
  } catch {
    return undefined;
  }
};

const readLooseGlobalValue = <T,>(name: string): T | null => {
  const runtime = globalThis as Record<string, unknown>;
  const direct = runtime[name];
  if (direct !== undefined) return direct as T;
  try {
    const resolved = Function(`return typeof ${name} !== 'undefined' ? ${name} : null;`)();
    return (resolved ?? null) as T | null;
  } catch {
    return null;
  }
};

const readLooseGlobalFunction = <T extends (...args: any[]) => any>(name: string): T | null => {
  const resolved = readLooseGlobalValue<unknown>(name);
  return typeof resolved === 'function' ? (resolved as T) : null;
};

const resolveTavernGenerateList = (): TavernGenerateFn[] => {
  const runtime = globalThis as Record<string, unknown>;
  const parentRuntime = readParentRuntime() as Record<string, unknown> | undefined;
  const directTavernHelper = readLooseGlobalValue<unknown>('TavernHelper');
  const candidates: Array<TavernGenerateFn | null> = [
    readLooseGlobalFunction<TavernGenerateFn>('generate'),
    bindHostFunction<TavernGenerateFn>(directTavernHelper, 'generate'),
    bindHostFunction<TavernGenerateFn>(runtime.TavernHelper, 'generate'),
    bindHostFunction<TavernGenerateFn>(runtime, 'generate'),
    bindHostFunction<TavernGenerateFn>(parentRuntime?.TavernHelper, 'generate'),
    bindHostFunction<TavernGenerateFn>(parentRuntime, 'generate'),
    // generate 无法给出正文时，再退回 raw 分支兜底。
    readLooseGlobalFunction<TavernGenerateFn>('generateRaw'),
    bindHostFunction<TavernGenerateFn>(directTavernHelper, 'generateRaw'),
    bindHostFunction<TavernGenerateFn>(runtime.TavernHelper, 'generateRaw'),
    bindHostFunction<TavernGenerateFn>(runtime, 'generateRaw'),
    bindHostFunction<TavernGenerateFn>(parentRuntime?.TavernHelper, 'generateRaw'),
    bindHostFunction<TavernGenerateFn>(parentRuntime, 'generateRaw'),
  ];
  const unique = new Set<TavernGenerateFn>();
  candidates.forEach(candidate => {
    if (typeof candidate === 'function') unique.add(candidate);
  });
  return [...unique];
};

const resolveTavernStopGenerating = (): (() => void) | null => {
  const runtime = globalThis as Record<string, unknown>;
  const parentRuntime = readParentRuntime() as Record<string, unknown> | undefined;
  const directTavernHelper = readLooseGlobalValue<unknown>('TavernHelper');
  const candidates: Array<(() => void) | null> = [
    readLooseGlobalFunction<() => void>('stopAllGeneration'),
    bindHostFunction<() => void>(directTavernHelper, 'stopAllGeneration'),
    bindHostFunction<() => void>(runtime, 'stopAllGeneration'),
    bindHostFunction<() => void>(runtime.TavernHelper, 'stopAllGeneration'),
    bindHostFunction<() => void>(parentRuntime, 'stopAllGeneration'),
    bindHostFunction<() => void>(parentRuntime?.TavernHelper, 'stopAllGeneration'),
    bindHostFunction<() => void>(directTavernHelper, 'stopGeneration'),
    bindHostFunction<() => void>(runtime, 'stopGeneration'),
    bindHostFunction<() => void>(runtime.TavernHelper, 'stopGeneration'),
    bindHostFunction<() => void>(parentRuntime, 'stopGeneration'),
    bindHostFunction<() => void>(parentRuntime?.TavernHelper, 'stopGeneration'),
  ];
  return candidates.find(fn => typeof fn === 'function') || null;
};

const resolveTavernVariableBridge = (): {
  getVariables: TavernGetVariablesFn | null;
  replaceVariables: TavernReplaceVariablesFn | null;
} => {
  const runtime = globalThis as Record<string, unknown>;
  const parentRuntime = readParentRuntime() as Record<string, unknown> | undefined;
  const directTavernHelper = readLooseGlobalValue<unknown>('TavernHelper');
  const directGet = readLooseGlobalFunction<TavernGetVariablesFn>('getVariables');
  const directReplace = readLooseGlobalFunction<TavernReplaceVariablesFn>('replaceVariables');
  if (directGet || directReplace) {
    return {
      getVariables: directGet,
      replaceVariables: directReplace,
    };
  }
  return {
    getVariables:
      bindHostFunction<TavernGetVariablesFn>(runtime, 'getVariables')
      || bindHostFunction<TavernGetVariablesFn>(directTavernHelper, 'getVariables')
      || bindHostFunction<TavernGetVariablesFn>(runtime.TavernHelper, 'getVariables')
      || bindHostFunction<TavernGetVariablesFn>(parentRuntime, 'getVariables')
      || bindHostFunction<TavernGetVariablesFn>(parentRuntime?.TavernHelper, 'getVariables'),
    replaceVariables:
      bindHostFunction<TavernReplaceVariablesFn>(runtime, 'replaceVariables')
      || bindHostFunction<TavernReplaceVariablesFn>(directTavernHelper, 'replaceVariables')
      || bindHostFunction<TavernReplaceVariablesFn>(runtime.TavernHelper, 'replaceVariables')
      || bindHostFunction<TavernReplaceVariablesFn>(parentRuntime, 'replaceVariables')
      || bindHostFunction<TavernReplaceVariablesFn>(parentRuntime?.TavernHelper, 'replaceVariables'),
  };
};

const toCompactSingleLine = (text: string, maxLength = 220): string => {
  const normalized = sanitizeAiMaintext(text).replace(/\n+/g, ' / ').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}…`;
};

const extractRenderableNarrativeFromMessage = (message: Message): string => {
  if (!message?.content) return '';
  if (message.sender === 'System' && hasPseudoLayer(message.content)) {
    const parsed = parsePseudoLayer(message.content);
    const maintext = sanitizeAiMaintext(parsed.maintext || '');
    if (!maintext || maintext.includes('当前为系统占位正文，仅用于保持楼层结构连续。')) {
      return '';
    }
    return maintext;
  }
  return message.content;
};

const buildDialogueContextFromMessages = (timeline: Message[], maxMessages = 8): string => {
  if (!Array.isArray(timeline) || timeline.length === 0) return '';
  const picked = timeline
    .filter(msg => msg.sender === 'Player' || (msg.sender === 'System' && hasPseudoLayer(msg.content || '')))
    .slice(-maxMessages);
  if (picked.length === 0) return '';

  const lines = picked
    .map(msg => {
      const role = msg.sender === 'Player' ? '玩家' : '前文';
      const compact = toCompactSingleLine(extractRenderableNarrativeFromMessage(msg), 260);
      if (!compact) return '';
      return `[${role}] ${compact}`;
    })
    .filter(Boolean);
  if (lines.length === 0) return '';
  return `【最近对话记录】\n${lines.join('\n')}`;
};

const textMatchesNpcLookupToken = (text: string, token: string): boolean => {
  const source = `${text || ''}`.toLowerCase();
  const normalizedToken = `${token || ''}`.trim().toLowerCase();
  if (!source || !normalizedToken || normalizedToken.length <= 1) return false;
  return source.includes(normalizedToken);
};

const App: React.FC = () => {
  const [gameStage, setGameStage] = useState<GameStage>('start');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [activeTab, setActiveTab] = useState<RightPanelTab>('contacts');
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
  const [playerName, setPlayerName] = useState<string>(LN_DEFAULT_PLAYER_NAME);
  const [playerGender, setPlayerGender] = useState<'male' | 'female'>('male');
  const [playerSkills, setPlayerSkills] = useState<Skill[]>([
    { id: 'ps1', name: '灵弦：野性直觉', level: 1, description: '被动增强感知能力。' },
  ]);
  const [isSpiritCoreModalOpen, setIsSpiritCoreModalOpen] = useState(false);

  const [npcs, setNpcs] = useState<NPC[]>([]);
  const [contactGroups, setContactGroups] = useState<string[]>([]);

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
  const [careerTracks, setCareerTracks] = useState<CareerTrack[]>(() => cloneCareerTracks(DEFAULT_CAREER_TRACKS));
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
  const [archiveScopeId, setArchiveScopeId] = useState<string>(() => resolveCurrentTavernChatScope());
  const [apiConfig, setApiConfig] = useState<LnApiConfig>({
    enabled: true,
    useTavernApi: true,
    endpoint: '',
    apiKey: '',
    model: 'gpt-4o-mini',
  });
  const [isApiSending, setIsApiSending] = useState(false);
  const [apiError, setApiError] = useState('');
  const apiAbortControllerRef = useRef<AbortController | null>(null);
  const apiRequestSeqRef = useRef(0);
  const activeNpcDirectorCacheRef = useRef<{ ids: string[]; turnsRemaining: number }>({
    ids: [],
    turnsRemaining: 0,
  });

  const [betaStatus, setBetaStatus] = useState<PlayerCivilianStatus>({
    ...MOCK_PLAYER_STATUS,
    betaLevel: 1,
    betaTierName: getBetaTierTitle(1),
    taxOfficerUnlocked: false,
    taxArrears: 0,
    assignedDistrict: '',
    assignedXStationId: '',
    assignedXStationLabel: '',
    assignedHXDormId: '',
    assignedHXDormLabel: '',
    taxOfficerBoundId: null,
    taxOfficerName: '',
    taxOfficeAddress: '',
  });
  const [playerResidence, setPlayerResidence] = useState<PlayerResidenceState>(EMPTY_RESIDENCE_STATE);
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
  const [monthlySettlementLog, setMonthlySettlementLog] = useState<MonthlySettlementRecord[]>([]);
  const [settlementCheckpointMonth, setSettlementCheckpointMonth] = useState<string | null>(null);
  const [financeLedger, setFinanceLedger] = useState<FinanceLedgerEntry[]>([]);

  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const floatIdCounter = useRef(0);
  const hasTriedLoadDefaultMapRef = useRef(false);
  const lastAutoMapSyncMessageIdRef = useRef('');
  const lastNearbySyncSignatureRef = useRef('');
  const prevMobileRef = useRef<boolean | null>(null);
  const [autoMapSyncEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const lastProtocolRef = useRef<'none' | 'beta' | null>(null);
  const lastPulledSyncSignatureRef = useRef('');
  const lastPushedSyncSignatureRef = useRef('');
  const lastTavernSyncSignatureRef = useRef('');
  const archiveScopeReloadRef = useRef<string>(archiveScopeId);
  const archiveStorageKey = useMemo(() => buildScopedStorageKey(LN_ARCHIVES_KEY_PREFIX, archiveScopeId), [archiveScopeId]);
  const lastArchiveStorageKey = useMemo(() => buildScopedStorageKey(LN_LAST_ARCHIVE_ID_KEY_PREFIX, archiveScopeId), [archiveScopeId]);

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
    setLeftModuleTab(prev => (prev === 'chips' || prev === 'economy' || prev === 'lingshu' || prev === 'inventory' ? prev : 'chips'));
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

  const buildNpcDirectorContextForRequest = useCallback(
    (input: string, dialogueContext: string): string => {
      const searchText = [input, dialogueContext].filter(Boolean).join('\n');
      const matched = new Map<string, NPC>();

      if (selectedNPC) {
        const liveSelected = npcs.find(npc => npc.id === selectedNPC.id) || selectedNPC;
        if (buildNpcDirectorPrompt(liveSelected)) {
          matched.set(liveSelected.id, liveSelected);
        }
      }

      npcs.forEach(npc => {
        if (!buildNpcDirectorPrompt(npc)) return;
        const tokens = getNpcDirectorLookupTokens(npc);
        if (tokens.some(token => textMatchesNpcLookupToken(searchText, token))) {
          matched.set(npc.id, npc);
        }
      });

      let picked = Array.from(matched.values()).slice(0, 2);
      if (picked.length > 0) {
        const keepAliveTurns = Math.max(...picked.map(getNpcDirectorKeepAliveTurns), 3);
        activeNpcDirectorCacheRef.current = {
          ids: picked.map(npc => npc.id),
          turnsRemaining: keepAliveTurns,
        };
      } else if (activeNpcDirectorCacheRef.current.turnsRemaining > 0) {
        picked = activeNpcDirectorCacheRef.current.ids
          .map(id => npcs.find(npc => npc.id === id))
          .filter((npc): npc is NPC => !!npc)
          .filter(npc => !!buildNpcDirectorPrompt(npc))
          .slice(0, 2);
        activeNpcDirectorCacheRef.current = {
          ids: picked.map(npc => npc.id),
          turnsRemaining: Math.max(0, activeNpcDirectorCacheRef.current.turnsRemaining - 1),
        };
      }

      const blocks = picked.map(buildNpcDirectorPrompt).filter(Boolean);
      if (blocks.length === 0) return '';
      return [
        '【当前关键人物隐藏参考】',
        '以下内容只用于稳定扮演，不要整段复述，不要一上来全盘自曝；仅在合理时机通过语气、动作、回避、暗示或局部透露体现。',
        blocks.join('\n\n'),
      ].join('\n');
    },
    [npcs, selectedNPC],
  );

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
    const syncScope = (nextScope?: string) => {
      setArchiveScopeId(normalizeArchiveScopeId(nextScope || resolveCurrentTavernChatScope()));
    };

    syncScope();
    if (typeof eventOn !== 'function' || typeof tavern_events === 'undefined') {
      return;
    }

    const subscription = eventOn(tavern_events.CHAT_CHANGED, nextChatId => {
      syncScope(typeof nextChatId === 'string' ? nextChatId : undefined);
    });

    return () => {
      subscription.stop();
    };
  }, []);

  useEffect(() => {
    if (archiveScopeReloadRef.current === archiveScopeId) return;
    archiveScopeReloadRef.current = archiveScopeId;
    window.location.reload();
  }, [archiveScopeId]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(archiveStorageKey);
      const parsed = raw ? (JSON.parse(raw) as ArchiveSlot[]) : [];
      const valid = Array.isArray(parsed)
        ? parsed.filter(slot => slot?.id && slot?.name && slot?.data && (slot.data.version === 1 || slot.data.version === 2 || slot.data.version === undefined))
        : [];
      setArchiveSlots(valid);

      const lastId = window.localStorage.getItem(lastArchiveStorageKey);
      if (lastId && valid.some(slot => slot.id === lastId)) {
        setSelectedArchiveId(lastId);
        setArchiveNameInput(valid.find(slot => slot.id === lastId)?.name || '');
        return;
      }

      if (valid[0]) {
        setSelectedArchiveId(valid[0].id);
        setArchiveNameInput(valid[0].name);
        return;
      }

      setSelectedArchiveId('');
      setArchiveNameInput('');
    } catch (error) {
      console.warn('读取档案列表失败:', error);
      setArchiveSlots([]);
      setSelectedArchiveId('');
      setArchiveNameInput('');
    }
  }, [archiveStorageKey, lastArchiveStorageKey]);

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
        enabled: parsed.enabled ?? prev.enabled,
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

  const syncMessagesFromTavern = useCallback(() => {
    const pulledMessages = pullPseudoLayerMessagesFromTavern();
    if (pulledMessages === null) return false;

    const signature = pulledMessages.map(message => `${message.id}:${hashText(message.content || '')}`).join('|');
    if (signature === lastTavernSyncSignatureRef.current) {
      return pulledMessages.some(message => message.sender === 'System' && hasPseudoLayer(message.content));
    }

    lastTavernSyncSignatureRef.current = signature;
    setMessages(pulledMessages);
    setFocusedLayerId(prev => {
      if (prev && pulledMessages.some(message => message.id === prev)) return prev;
      const latestLayer = [...pulledMessages].reverse().find(message => message.sender === 'System' && hasPseudoLayer(message.content));
      return latestLayer?.id || null;
    });
    return pulledMessages.some(message => message.sender === 'System' && hasPseudoLayer(message.content));
  }, []);

  const appendTavernChatMessage = useCallback(async (role: 'assistant' | 'user', message: string) => {
    const bridge = resolveTavernChatBridge();
    if (typeof bridge.createChatMessages !== 'function') return false;
    await bridge.createChatMessages([{ role, message }], { refresh: 'none' });
    return true;
  }, []);

  const replaceTavernChatMessage = useCallback(async (messageId: number, message: string) => {
    const bridge = resolveTavernChatBridge();
    if (typeof bridge.setChatMessages !== 'function') return false;
    await bridge.setChatMessages([{ message_id: messageId, message }], { refresh: 'affected' });
    return true;
  }, []);

  const deleteTavernChatMessageIds = useCallback(async (messageIds: number[]) => {
    if (messageIds.length === 0) return true;
    const bridge = resolveTavernChatBridge();
    if (typeof bridge.deleteChatMessages !== 'function') return false;
    await bridge.deleteChatMessages(messageIds, { refresh: 'affected' });
    return true;
  }, []);

  const resetCurrentLnRun = useCallback(async () => {
    const latestPulledMessages = pullPseudoLayerMessagesFromTavern() || [];
    const runtimeMessages = [...latestPulledMessages, ...messages];
    const runtimeChatIds = [...new Set(
      runtimeMessages
        .map(message => message.chatMessageId)
        .filter((messageId): messageId is number => Number.isFinite(messageId)),
    )];

    if (runtimeChatIds.length > 0) {
      try {
        const deleted = await deleteTavernChatMessageIds(runtimeChatIds);
        if (deleted) {
          lastTavernSyncSignatureRef.current = '';
          syncMessagesFromTavern();
        }
      } catch (error) {
        console.warn('重开前清理酒馆楼层失败，回退为前端本地重置:', error);
      }
    }

    lastTavernSyncSignatureRef.current = '';
    setMessages([]);
    setFocusedLayerId(null);
    setSelectedNPC(null);
    setLayerMenu(null);
    setIsLayerPickerOpen(false);
  }, [deleteTavernChatMessageIds, messages, syncMessagesFromTavern]);

  useEffect(() => {
    syncMessagesFromTavern();

    if (typeof eventOn !== 'function' || typeof tavern_events === 'undefined') {
      return;
    }

    const subscriptions = [
      eventOn(tavern_events.CHAT_CHANGED, syncMessagesFromTavern),
      eventOn(tavern_events.MESSAGE_SENT, syncMessagesFromTavern),
      eventOn(tavern_events.MESSAGE_RECEIVED, syncMessagesFromTavern),
      eventOn(tavern_events.MESSAGE_EDITED, syncMessagesFromTavern),
      eventOn(tavern_events.MESSAGE_DELETED, syncMessagesFromTavern),
      eventOn(tavern_events.MESSAGE_UPDATED, syncMessagesFromTavern),
    ];

    return () => {
      subscriptions.forEach(subscription => subscription.stop());
    };
  }, [syncMessagesFromTavern]);

  const syncStateFromTavernVariables = useCallback(() => {
    const tavernBridge = resolveTavernVariableBridge();
    if (typeof tavernBridge.getVariables !== 'function') return;

    let variables: Record<string, any>;
    try {
      variables = tavernBridge.getVariables({ type: 'chat' });
    } catch {
      return;
    }

    const stat = variables?.stat_data;
    if (!stat || typeof stat !== 'object') return;

    const worldNode = stat?.world && typeof stat.world === 'object' && !Array.isArray(stat.world) ? stat.world : {};
    const playerNode = stat?.player && typeof stat.player === 'object' ? stat.player : {};
    const identityRaw = playerNode?.identity;
    const identity =
      identityRaw && typeof identityRaw === 'object' && !Array.isArray(identityRaw)
        ? identityRaw
        : {};
    const coreStatusRaw = playerNode?.core_status;
    const coreStatus =
      coreStatusRaw && typeof coreStatusRaw === 'object' && !Array.isArray(coreStatusRaw)
        ? coreStatusRaw
        : {};
    const statusRaw = playerNode?.status;
    const status =
      statusRaw && typeof statusRaw === 'object' && !Array.isArray(statusRaw)
        ? statusRaw
        : {};
    const psionicRaw = playerNode?.psionic;
    const psionic =
      psionicRaw && typeof psionicRaw === 'object' && !Array.isArray(psionicRaw)
        ? psionicRaw
        : {};
    const assetsRaw = playerNode?.assets;
    const assets =
      assetsRaw && typeof assetsRaw === 'object' && !Array.isArray(assetsRaw)
        ? assetsRaw
        : {};
    const chipRaw = playerNode?.chip;
    const chipNode =
      chipRaw && typeof chipRaw === 'object' && !Array.isArray(chipRaw)
        ? chipRaw
        : {};
    const residenceRaw = playerNode?.residence;
    const residenceNode =
      residenceRaw && typeof residenceRaw === 'object' && !Array.isArray(residenceRaw)
        ? residenceRaw
        : {};
    const sixDimRaw = playerNode?.six_dim;
    const sixDim =
      sixDimRaw && typeof sixDimRaw === 'object' && !Array.isArray(sixDimRaw)
        ? sixDimRaw
        : null;
    const lcoinState = readLcoinBucketsFromStat(assets?.lcoin);
    const rankRaw = `${psionic?.rank ?? playerNode?.psionic_rank ?? ''}`.trim();
    const rankMatch = rankRaw.match(/Lv\.?\s*(\d+)/i);
    const rankValue = rankMatch?.[1] ? levelToRank(Number(rankMatch[1])) : undefined;
    const protocolRaw = `${identity?.neural_protocol ?? playerNode?.neural_protocol ?? ''}`.trim().toLowerCase();
    const protocolValue = protocolRaw === 'beta' ? 'beta' : protocolRaw ? 'none' : null;
    const citizenIdValue = `${identity?.citizen_id ?? playerNode?.citizen_id ?? ''}`.trim();
    const factionValue = `${playerNode?.faction ?? worldNode?.current_faction ?? ''}`.trim();
    const regionValue = `${playerNode?.region ?? worldNode?.current_location ?? ''}`.trim();
    const coreAffixesFromStat = normalizeRuntimeAffixList(playerNode?.core_affixes, 'player_core');
    const hasCoreAffixArray = Array.isArray(playerNode?.core_affixes);
    const lingshuFromStat = normalizeStatLingshuParts(playerNode?.lingshu_parts);
    const hasLingshuArray = Array.isArray(playerNode?.lingshu_parts);
    const pulledCoinVault: Partial<Record<Rank, number>> = {
      [Rank.Lv1]: lcoinState.buckets.lv1,
      [Rank.Lv2]: lcoinState.buckets.lv2,
      [Rank.Lv3]: lcoinState.buckets.lv3,
      [Rank.Lv4]: lcoinState.buckets.lv4,
      [Rank.Lv5]: lcoinState.buckets.lv5,
    };

    const repCurrent =
      toFiniteNumber(coreStatus?.reputation?.current) ??
      toFiniteNumber(status?.reputation?.current) ??
      toFiniteNumber(playerNode?.reputation) ??
      toFiniteNumber(coreStatus?.credit_score);
    const creditsFromStat =
      toFiniteNumber(assets?.credits) ??
      toFiniteNumber(playerNode?.credits) ??
      (rankValue ? pulledCoinVault[rankValue] : undefined) ??
      lcoinState.total;
    const pulledAssignedDistrict = `${chipNode?.assigned_district ?? ''}`.trim();
    const pulledAssignedXStationId = `${chipNode?.assigned_x_station_id ?? ''}`.trim().toUpperCase();
    const pulledAssignedXStationLabel = `${chipNode?.assigned_x_station_label ?? ''}`.trim();
    const pulledAssignedHXDormId = `${chipNode?.assigned_hx_dorm_id ?? ''}`.trim().toUpperCase();
    const pulledAssignedHXDormLabel = `${chipNode?.assigned_hx_dorm_label ?? ''}`.trim();
    const hasAirelaBinding =
      protocolValue === 'beta' ||
      chipNode?.beta_equipped === true ||
      !!(`${chipNode?.tax_officer_id ?? ''}`.trim()) ||
      !!pulledAssignedDistrict ||
      !!pulledAssignedXStationId ||
      !!pulledAssignedHXDormId;
    const derivedBinding = hasAirelaBinding
      ? resolveAirelaFacilityBinding({
          districtHint:
            pulledAssignedDistrict ||
            pulledAssignedXStationLabel ||
            pulledAssignedHXDormLabel ||
            `${chipNode?.tax_office_address ?? chipNode?.office_address ?? ''}`.trim() ||
            regionValue,
          citizenId: citizenIdValue || '',
        })
      : null;
    const pulledResidence = normalizeResidenceState(
      {
        currentResidenceId: `${residenceNode?.current_residence_id ?? ''}`.trim(),
        currentResidenceLabel: `${residenceNode?.current_residence_label ?? ''}`.trim(),
        unlockedResidenceIds: Array.isArray(residenceNode?.unlocked_residence_ids)
          ? residenceNode.unlocked_residence_ids
          : [],
      },
      hasAirelaBinding && isAirelaResidenceZone(regionValue)
        ? {
            currentResidenceId: derivedBinding?.residenceId || '',
            currentResidenceLabel: pulledAssignedHXDormLabel || derivedBinding?.residenceLabel || '',
            unlockedResidenceIds: derivedBinding?.residenceId ? [derivedBinding.residenceId] : [],
          }
        : null,
    );
    const syncSignature = JSON.stringify({
      playerName: `${playerNode?.name ?? playerNode?.display_name ?? ''}`.trim() || null,
      hpCurrent: toFiniteNumber(coreStatus?.hp?.current) ?? toFiniteNumber(status?.hp?.current) ?? null,
      hpMax: toFiniteNumber(coreStatus?.hp?.max) ?? toFiniteNumber(status?.hp?.max) ?? null,
      mpCurrent:
        toFiniteNumber(coreStatus?.mp?.current) ??
        toFiniteNumber(status?.mp?.current) ??
        toFiniteNumber(psionic?.energy_value?.current) ??
        toFiniteNumber(psionic?.energy_value) ??
        null,
      mpMax:
        toFiniteNumber(coreStatus?.mp?.max) ??
        toFiniteNumber(status?.mp?.max) ??
        toFiniteNumber(psionic?.energy_value?.max) ??
        toFiniteNumber(psionic?.energy_value_max) ??
        null,
      sanityCurrent: toFiniteNumber(coreStatus?.sanity?.current) ?? toFiniteNumber(status?.sanity?.current) ?? null,
      sanityMax: toFiniteNumber(coreStatus?.sanity?.max) ?? toFiniteNumber(status?.sanity?.max) ?? null,
      credits: creditsFromStat ?? null,
      lcoin: lcoinState.buckets,
      reputation: repCurrent ?? null,
      conversionRate: statRateToRuntimePercent(psionic?.conversion_rate?.current ?? psionic?.conversion_rate) ?? null,
      recoveryRate: statRateToRuntimePercent(psionic?.recovery_rate?.current ?? psionic?.recovery_rate) ?? null,
      rank: rankRaw || null,
      protocol: protocolValue,
      citizenId: citizenIdValue || null,
      faction: factionValue || null,
      region: regionValue || null,
      assignedDistrict: pulledAssignedDistrict || null,
      assignedXStationId: pulledAssignedXStationId || null,
      assignedHXDormId: pulledAssignedHXDormId || null,
      coreAffixes: coreAffixesFromStat.map(affix => [affix.name, affix.description, affix.type, affix.source].join('|')),
      lingshu: lingshuFromStat.map(part => [part.key || part.id, part.level || rankToLevel(part.rank), part.rank].join('|')),
      taxOfficerId: `${chipNode?.tax_officer_id ?? ''}`.trim() || null,
      taxArrears: toFiniteNumber(chipNode?.tax_arrears ?? chipNode?.taxArrears) ?? null,
      currentResidenceId: pulledResidence.currentResidenceId || null,
      currentResidenceLabel: pulledResidence.currentResidenceLabel || null,
      unlockedResidenceIds: pulledResidence.unlockedResidenceIds,
    });
    lastPulledSyncSignatureRef.current = syncSignature;

    const syncedPlayerName = `${playerNode?.name ?? playerNode?.display_name ?? ''}`.trim();
    if (syncedPlayerName) {
      setPlayerName(prev => (prev === syncedPlayerName ? prev : syncedPlayerName));
    }
    if (protocolValue) {
      setPlayerNeuralProtocol(prev => (prev === protocolValue ? prev : protocolValue));
    }
    setPlayerResidence(prev => {
      const next = pulledResidence;
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    });
    if (factionValue || regionValue) {
      setPlayerFaction(prev => {
        const next = {
          ...prev,
          name: factionValue || prev.name,
          headquarters: regionValue || prev.headquarters,
        };
        return next.name === prev.name && next.headquarters === prev.headquarters ? prev : next;
      });
    }
    if (lcoinState.hasAny) {
      setCoinVault(prev => {
        const same = (Object.values(Rank) as Rank[]).every(rank => (prev[rank] || 0) === (pulledCoinVault[rank] || 0));
        return same ? prev : pulledCoinVault;
      });
    }
    if (hasCoreAffixArray) {
      setPlayerCoreAffixes(prev => {
        const next = coreAffixesFromStat;
        return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
      });
    }
    if (hasLingshuArray) {
      setPlayerLingshu(prev => (JSON.stringify(prev) === JSON.stringify(lingshuFromStat) ? prev : lingshuFromStat));
    }

    setPlayerStats(prev => {
      const next: PlayerStats = {
        ...prev,
        hp: { ...prev.hp },
        mp: { ...prev.mp },
        sanity: { ...prev.sanity },
        psionic: { ...prev.psionic },
        sixDim: { ...prev.sixDim },
      };
      let changed = false;

      const hpCurrent = toFiniteNumber(coreStatus?.hp?.current) ?? toFiniteNumber(status?.hp?.current);
      const hpMax = toFiniteNumber(coreStatus?.hp?.max) ?? toFiniteNumber(status?.hp?.max);
      const mpCurrent =
        toFiniteNumber(coreStatus?.mp?.current) ??
        toFiniteNumber(status?.mp?.current) ??
        toFiniteNumber(psionic?.energy_value?.current) ??
        toFiniteNumber(psionic?.energy_value);
      const mpMax =
        toFiniteNumber(coreStatus?.mp?.max) ??
        toFiniteNumber(status?.mp?.max) ??
        toFiniteNumber(psionic?.energy_value?.max) ??
        toFiniteNumber(psionic?.energy_value_max);
      const sanityCurrent = toFiniteNumber(coreStatus?.sanity?.current) ?? toFiniteNumber(status?.sanity?.current);
      const sanityMax = toFiniteNumber(coreStatus?.sanity?.max) ?? toFiniteNumber(status?.sanity?.max);
      const conversionRate = statRateToRuntimePercent(psionic?.conversion_rate?.current ?? psionic?.conversion_rate);
      const recoveryRate = statRateToRuntimePercent(psionic?.recovery_rate?.current ?? psionic?.recovery_rate);

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
      if (sixDim) {
        const sixDimNext = {
          ...next.sixDim,
          ...(sixDim as PlayerStats['sixDim']),
        };
        if (JSON.stringify(sixDimNext) !== JSON.stringify(prev.sixDim)) {
          next.sixDim = sixDimNext;
          changed = true;
        }
      }

      return changed ? ensurePlayerStatsSixDim(next) : prev;
    });

    setBetaStatus(prev => {
      const next = { ...prev };
      let changed = false;

      if (citizenIdValue && citizenIdValue !== prev.citizenId) {
        next.citizenId = citizenIdValue;
        changed = true;
      }
      if (repCurrent !== undefined && repCurrent !== prev.creditScore) {
        next.creditScore = Math.max(0, Math.min(120, repCurrent));
        changed = true;
      }

      const pulledOfficerId = `${chipNode?.tax_officer_id ?? ''}`.trim();
      const pulledOfficerName = `${chipNode?.tax_officer_name ?? ''}`.trim();
      const pulledOfficeAddress = `${chipNode?.tax_office_address ?? chipNode?.office_address ?? ''}`.trim();
      const pulledTaxAmount = toFiniteNumber(chipNode?.tax_amount ?? chipNode?.taxAmount);
      const pulledTaxArrears = toFiniteNumber(chipNode?.tax_arrears ?? chipNode?.taxArrears);
      const nextAssignedDistrict = hasAirelaBinding ? pulledAssignedDistrict || derivedBinding?.districtName || '' : '';
      const nextAssignedXStationId = hasAirelaBinding ? pulledAssignedXStationId || derivedBinding?.xStationId || '' : '';
      const nextAssignedXStationLabel = hasAirelaBinding
        ? pulledAssignedXStationLabel ||
          (nextAssignedXStationId
            ? formatAirelaSiteLabel('x_station', nextAssignedXStationId, derivedBinding?.districtName)
            : '')
        : '';
      const nextAssignedHXDormId = hasAirelaBinding ? pulledAssignedHXDormId || derivedBinding?.hxDormId || '' : '';
      const nextAssignedHXDormLabel = hasAirelaBinding
        ? pulledAssignedHXDormLabel ||
          (nextAssignedHXDormId ? formatAirelaSiteLabel('hx_dorm', nextAssignedHXDormId, derivedBinding?.districtName) : '')
        : '';

      const nextOfficialControl = protocolValue === 'beta' && chipNode?.beta_equipped === true;
      if (nextOfficialControl !== !!prev.taxOfficerUnlocked) {
        next.taxOfficerUnlocked = nextOfficialControl;
        changed = true;
      }
      if (nextAssignedDistrict !== `${prev.assignedDistrict ?? ''}`) {
        next.assignedDistrict = nextAssignedDistrict;
        changed = true;
      }
      if (nextAssignedXStationId !== `${prev.assignedXStationId ?? ''}`) {
        next.assignedXStationId = nextAssignedXStationId;
        changed = true;
      }
      if (nextAssignedXStationLabel !== `${prev.assignedXStationLabel ?? ''}`) {
        next.assignedXStationLabel = nextAssignedXStationLabel;
        changed = true;
      }
      if (nextAssignedHXDormId !== `${prev.assignedHXDormId ?? ''}`) {
        next.assignedHXDormId = nextAssignedHXDormId;
        changed = true;
      }
      if (nextAssignedHXDormLabel !== `${prev.assignedHXDormLabel ?? ''}`) {
        next.assignedHXDormLabel = nextAssignedHXDormLabel;
        changed = true;
      }
      if (pulledOfficerId !== `${prev.taxOfficerBoundId ?? ''}`) {
        next.taxOfficerBoundId = pulledOfficerId || null;
        changed = true;
      }
      if (pulledOfficerName !== `${prev.taxOfficerName ?? ''}`) {
        next.taxOfficerName = pulledOfficerName;
        changed = true;
      }
      if (pulledOfficeAddress !== `${prev.taxOfficeAddress ?? ''}`) {
        next.taxOfficeAddress = pulledOfficeAddress;
        changed = true;
      }
      if (pulledTaxAmount !== undefined && pulledTaxAmount !== prev.taxAmount) {
        next.taxAmount = Math.max(0, pulledTaxAmount);
        changed = true;
      }
      if (pulledTaxArrears !== undefined && pulledTaxArrears !== (prev.taxArrears || 0)) {
        next.taxArrears = Math.max(0, pulledTaxArrears);
        changed = true;
      }
      if (!nextOfficialControl) {
        const officialFields: Array<[keyof PlayerCivilianStatus, string | null | false | 0]> = [
          ['assignedDistrict', ''],
          ['assignedXStationId', ''],
          ['assignedXStationLabel', ''],
          ['assignedHXDormId', ''],
          ['assignedHXDormLabel', ''],
          ['taxOfficerBoundId', null],
          ['taxOfficerName', ''],
          ['taxOfficeAddress', ''],
          ['taxAmount', 0],
          ['taxArrears', 0],
        ];
        officialFields.forEach(([key, value]) => {
          if ((next[key] as unknown) !== value) {
            (next as Record<string, unknown>)[key] = value;
            changed = true;
          }
        });
      }

      return changed ? next : prev;
    });
  }, []);

  useEffect(() => {
    if (gameStage !== 'game') return;
    syncStateFromTavernVariables();
    const timer = window.setInterval(syncStateFromTavernVariables, 1200);
    return () => window.clearInterval(timer);
  }, [gameStage, syncStateFromTavernVariables]);

  const applyApiPatchToChatVariables = useCallback(
    (operations: VariablePatchOperation[]): PatchApplyResult => {
      if (!operations.length) {
        return { applied: 0, skipped: 0, failed: 0, errors: [] };
      }
      const tavernBridge = resolveTavernVariableBridge();
      if (typeof tavernBridge.getVariables !== 'function' || typeof tavernBridge.replaceVariables !== 'function') {
        return {
          applied: 0,
          skipped: operations.length,
          failed: 0,
          errors: ['酒馆变量接口不可用，JSONPatch 未执行。'],
        };
      }

      try {
        const currentVars = tavernBridge.getVariables({ type: 'chat' }) || {};
        const cloned = deepClonePlainData(currentVars);
        const nextVars =
          cloned && typeof cloned === 'object'
            ? (cloned as Record<string, any>)
            : {};
        const patchResult = applyPatchOperationsToVariables(nextVars, operations);
        if (patchResult.applied > 0) {
          tavernBridge.replaceVariables(nextVars, { type: 'chat' });
          syncStateFromTavernVariables();
        }
        return patchResult;
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误';
        return {
          applied: 0,
          skipped: 0,
          failed: operations.length,
          errors: [`变量写回失败：${message}`],
        };
      }
    },
    [syncStateFromTavernVariables],
  );

  useEffect(() => {
    const currentRank = playerStats.psionic.level;
    setCoinVault(prev => ({
      ...prev,
      [currentRank]: playerStats.credits,
    }));
  }, [playerStats.credits, playerStats.psionic.level]);

  const hasBetaChip = playerChips.some(c => c.type === 'beta');
  const hasOfficialBetaControl = hasBetaChip && playerNeuralProtocol === 'beta';
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
  const hasExistingPseudoProgress = layerMessages.length > 0;
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
    const mainMatch = maintext.match(/(?:你在|位于|身处)\s*([^，。,.\n]+?)(?:继续行动|行动|开展行动|。|，|\n)/);
    if (mainMatch?.[1]?.trim()) return mainMatch[1].trim();
    const locationLine = maintext.match(/当前地点[:：]\s*([^\n]+)/);
    if (locationLine?.[1]?.trim()) return locationLine[1].trim();
    return playerFaction.headquarters || '未知区域';
  }, [activeLayerMessage, playerFaction.headquarters]);
  const lingshuRuntimeAffixes = useMemo(
    () => playerLingshu.flatMap(part => (part.statusAffixes || []).map(affix => ({ ...affix, source: affix.source || part.name }))),
    [playerLingshu],
  );
  const mergedRuntimeAffixes = useMemo(() => {
    const deduped = new Map<string, RuntimeAffix>();
    [...playerCoreAffixes, ...lingshuRuntimeAffixes].forEach(affix => {
      const key = affix.id || affix.name;
      if (key) deduped.set(key, affix);
    });
    return [...deduped.values()];
  }, [playerCoreAffixes, lingshuRuntimeAffixes]);
  const runtimeStatusTags = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...mergedRuntimeAffixes.map(affix => affix.name),
            ...(betaStatus.warnings || []).map(warning => `警告:${warning}`),
          ]
            .map(tag => `${tag || ''}`.trim())
            .filter(Boolean),
        ),
      ),
    [mergedRuntimeAffixes, betaStatus.warnings],
  );
  const chipCount = useMemo(() => playerChips.filter(chip => chip.type !== 'board' && chip.type !== 'beta').length, [playerChips]);
  const spiritStringCount = useMemo(
    () => playerLingshu.reduce((sum, part) => sum + (part.spiritSkills?.length || (part.spiritSkill ? 1 : 0)), 0),
    [playerLingshu],
  );
  const currentMonthKey = useMemo(() => getMonthKeyFromElapsedMinutes(mapRuntime.elapsedMinutes || 0), [mapRuntime.elapsedMinutes]);
  const locationControlProfile = useMemo(
    () =>
      buildLocationControlProfile(
        currentNarrativeLocation || playerFaction.headquarters || '未知区域',
        gameDayPhase,
        playerNeuralProtocol,
        playerGender,
        betaStatus.creditScore,
        gameSceneHint,
      ),
    [currentNarrativeLocation, playerFaction.headquarters, gameDayPhase, playerNeuralProtocol, playerGender, betaStatus.creditScore, gameSceneHint],
  );
  const currentLocationVisualTheme = useMemo(
    () => resolveLocationVisualTheme(currentNarrativeLocation || playerFaction.headquarters || '未知区域'),
    [currentNarrativeLocation, playerFaction.headquarters],
  );
  const residenceProfiles = useMemo(
    () =>
      buildResidenceProfiles({
        location: currentNarrativeLocation || playerFaction.headquarters || '未知区域',
        hasOfficialControl: hasOfficialBetaControl,
        status: betaStatus,
        residence: playerResidence,
      }),
    [
      currentNarrativeLocation,
      playerFaction.headquarters,
      hasOfficialBetaControl,
      betaStatus,
      playerResidence,
    ],
  );
  const officialResidenceBinding = useMemo(
    () =>
      hasOfficialBetaControl
        ? resolveAirelaFacilityBinding({
            districtHint: betaStatus.assignedDistrict || betaStatus.assignedHXDormLabel || currentNarrativeLocation,
            citizenId: betaStatus.citizenId || '',
          })
        : null,
    [hasOfficialBetaControl, betaStatus.assignedDistrict, betaStatus.assignedHXDormLabel, betaStatus.citizenId, currentNarrativeLocation],
  );
  const currentResidenceProfile = useMemo(
    () =>
      residenceProfiles.find(profile => profile.id === playerResidence.currentResidenceId) ||
      buildFallbackResidenceProfile(playerResidence, betaStatus.assignedDistrict || resolveLocationJurisdiction(currentNarrativeLocation || '').regionLabel),
    [residenceProfiles, playerResidence, betaStatus.assignedDistrict, currentNarrativeLocation],
  );
  const monthlySettlementPreview = useMemo(() => {
    const checkpointMonth = settlementCheckpointMonth || currentMonthKey;
    const pendingMonths = getMonthDiff(checkpointMonth, currentMonthKey);
    const upkeepBase = playerLingshu.length * 18 + playerChips.filter(chip => chip.type !== 'board').length * 12;
    const residenceUpkeep = currentResidenceProfile?.monthlyCost || 0;
    const debuffCost = mergedRuntimeAffixes.reduce((sum, affix) => sum + (affix.type === 'debuff' ? 18 : affix.type === 'neutral' ? 8 : 0), 0);
    const warningCost = (betaStatus.warnings || []).length * 25;
    const economyBaseline = Math.max(0, (playerFaction.economy.monthlyIncome || 0) - (playerFaction.economy.monthlyUpkeep || 0));
    const baseAllowancePerMonth = Math.max(120, Math.round(economyBaseline * 0.12) + (betaStatus.betaLevel || 1) * 60);
    const bonusPerMonth = betaStatus.creditScore >= 100 ? 120 : betaStatus.creditScore >= 80 ? 40 : 0;
    const baseAllowance = pendingMonths * (baseAllowancePerMonth + bonusPerMonth);
    const currentTaxDue = pendingMonths * Math.max(0, betaStatus.taxAmount || 0);
    const arrearsDue = Math.max(0, betaStatus.taxArrears || 0);
    const taxDue = currentTaxDue + arrearsDue;
    const maintenanceCost = pendingMonths * (upkeepBase + residenceUpkeep);
    const penaltyCost = pendingMonths * (debuffCost + warningCost);
    const netDelta = baseAllowance - taxDue - maintenanceCost - penaltyCost;
    return {
      currentMonthLabel: monthKeyToLabel(currentMonthKey),
      checkpointMonthLabel: monthKeyToLabel(checkpointMonth),
      cycleLabel: buildSettlementCycleLabel(checkpointMonth, pendingMonths),
      pendingMonths,
      canSettle: pendingMonths > 0,
      baseAllowance,
      currentTaxDue,
      arrearsDue,
      taxDue,
      residenceCost: pendingMonths * residenceUpkeep,
      residenceLabel: currentResidenceProfile?.label || '未登记住所',
      maintenanceCost,
      penaltyCost,
      netDelta,
      notes: [
        `基础津贴由派系月度净收入、Beta 等级和信誉补贴共同决定。`,
        arrearsDue > 0 ? `当前累计欠缴情形 ¥${arrearsDue.toLocaleString()}，本次会并入应缴税额。` : `当前没有历史欠缴情形，月结只计算本期税额。`,
        currentResidenceProfile
          ? `当前住所「${currentResidenceProfile.label}」会带来 ¥${(pendingMonths * residenceUpkeep).toLocaleString()} 的住处维持费。`
          : `当前还没有稳定住所，月结暂不计入住处维持费。`,
        `灵枢部件、已装配芯片和异常状态会持续抬高维持费与风险扣款。`,
        `若结算后余额不足，会记为欠缴并直接压低信誉值。`,
      ],
    };
  }, [
    settlementCheckpointMonth,
    currentMonthKey,
    playerLingshu.length,
    playerChips,
    currentResidenceProfile,
    mergedRuntimeAffixes,
    betaStatus.warnings,
    betaStatus.betaLevel,
    betaStatus.creditScore,
    betaStatus.taxAmount,
    betaStatus.taxArrears,
    playerFaction.economy.monthlyIncome,
    playerFaction.economy.monthlyUpkeep,
  ]);

  useEffect(() => {
    if (gameStage !== 'game') return;
    setSettlementCheckpointMonth(prev => prev || currentMonthKey);
  }, [gameStage, currentMonthKey]);

  useEffect(() => {
    if (gameStage !== 'game') return;
    const location = currentNarrativeLocation || playerFaction.headquarters || '';
    if (isAirelaResidenceZone(location)) return;
    const officialResidenceId = officialResidenceBinding?.residenceId || '';
    if (!officialResidenceId) return;
    if (playerResidence.currentResidenceId !== officialResidenceId) return;
    setPlayerResidence(prev =>
      normalizeResidenceState({
        currentResidenceId: '',
        currentResidenceLabel: '',
        unlockedResidenceIds: [...prev.unlockedResidenceIds, officialResidenceId],
      }),
    );
  }, [
    gameStage,
    currentNarrativeLocation,
    playerFaction.headquarters,
    officialResidenceBinding,
    playerResidence.currentResidenceId,
  ]);

  const syncNearbyNpcsFromContext = useCallback(
    (location: string, playerInput: string, narrativeText: string, structuredRecords: NearbyNpcRecord[] = []) => {
      const normalizedLocation = (location || '未知区域').trim() || '未知区域';
      setNpcs(prev => {
        const seeds =
          structuredRecords.length > 0
            ? []
            : collectNearbyNpcSeeds(
                [playerInput, narrativeText].filter(text => `${text || ''}`.trim().length > 0),
                prev,
                normalizedLocation,
                playerFaction.name,
              );
        const targetKeys = new Set(
          (structuredRecords.length > 0
            ? structuredRecords.map(record => record.name)
            : seeds.map(seed => seed.name))
            .map(name => normalizeNpcNameKey(name))
            .filter(Boolean),
        );
        let next = prev.filter(npc => {
          if (!isAutoNearbyNpc(npc) || npc.isContact || npc.temporaryStatus) return true;
          if ((npc.location || '').trim() !== normalizedLocation) return true;
          return targetKeys.has(normalizeNpcNameKey(npc.name));
        });

        if (structuredRecords.length > 0) {
          structuredRecords.forEach((record, index) => {
            const recordKey = normalizeNpcNameKey(record.name);
            const existingIndex = next.findIndex(npc => normalizeNpcNameKey(npc.name) === recordKey);
            if (existingIndex >= 0) {
              next[existingIndex] = buildStructuredNearbyNpc(normalizedLocation, record, existingIndex, next[existingIndex]);
              return;
            }
            next = [buildStructuredNearbyNpc(normalizedLocation, record, next.length), ...next];
          });
          return normalizeNpcListForUi(next);
        }

        seeds.forEach(seed => {
          const seedKey = normalizeNpcNameKey(seed.name);
          const existingIndex = next.findIndex(npc => normalizeNpcNameKey(npc.name) === seedKey);
          if (existingIndex >= 0) {
            const current = next[existingIndex];
            if (current.isContact && !isAutoNearbyNpc(current)) {
              next[existingIndex] = normalizeNpcForUi({
                ...current,
                name: seed.name,
                gender: seed.gender || current.gender,
                position: seed.position || current.position || '待识别人物',
                affiliation: seed.affiliation || current.affiliation || '待识别来源',
                location: normalizedLocation,
                temporaryStatus: undefined,
              });
            } else {
              next[existingIndex] = buildAutoNearbyNpcFromSeed(normalizedLocation, seed, existingIndex, {
                ...current,
                isContact: false,
                temporaryStatus: undefined,
              });
            }
            return;
          }
          const created = buildAutoNearbyNpcFromSeed(normalizedLocation, seed, next.length);
          if (created) {
            next = [created, ...next];
          }
        });

        return normalizeNpcListForUi(next);
      });
    },
    [playerFaction.name],
  );

  useEffect(() => {
    if (gameStage !== 'game') return;
    if (!activeLayerMessage?.content) return;
    const layerSignature = `${activeLayerMessage.id}:${hashText(activeLayerMessage.content)}`;
    if (layerSignature === lastNearbySyncSignatureRef.current) return;
    lastNearbySyncSignatureRef.current = layerSignature;

    const parsedLayer = parsePseudoLayer(activeLayerMessage.content);
    const parsedMaintext = sanitizeAiMaintext(parsedLayer.maintext || '');
    const parsedNpcRecords = parseNearbyNpcRecordsFromText(parsedLayer.npcdata || '').records;
    const layerIndex = messages.findIndex(msg => msg.id === activeLayerMessage.id);
    const playerTimeline = layerIndex >= 0 ? messages.slice(0, layerIndex) : messages;
    const latestPlayerInput =
      [...playerTimeline].reverse().find(msg => msg.sender === 'Player')?.content || '';

    syncNearbyNpcsFromContext(currentNarrativeLocation || '未知区域', latestPlayerInput, parsedMaintext, parsedNpcRecords);
  }, [gameStage, currentNarrativeLocation, activeLayerMessage, messages, syncNearbyNpcsFromContext]);

  const identityLabel = useMemo(
    () => `${playerName} · ${betaStatus.citizenId} · ${playerNeuralProtocol.toUpperCase()} · ${playerFaction.name}`,
    [playerName, betaStatus.citizenId, playerNeuralProtocol, playerFaction.name],
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
    const tavernBridge = resolveTavernVariableBridge();
    if (typeof tavernBridge.getVariables !== 'function' || typeof tavernBridge.replaceVariables !== 'function') return;

    const nextCoinBuckets = buildLcoinBucketsFromVault(coinVault, playerStats.credits, playerStats.psionic.level);
    const nextCoinTotal = Object.values(nextCoinBuckets).reduce((sum, value) => sum + value, 0);
    const nextCoreAffixes = playerCoreAffixes.map(toStatAffixRecord);
    const nextStatusTags = Array.from(
      new Set(
        [
          ...playerCoreAffixes.map(affix => affix.name),
          ...playerLingshu.flatMap(part => (part.statusAffixes || []).map(affix => affix.name)),
        ].filter(Boolean),
      ),
    );
    const nextLingshuParts = playerLingshu.map(toStatLingshuPartRecord);
    const nextSoulLedger = {
      [Rank.Lv1]: Math.max(0, playerSoulLedger[Rank.Lv1] || 0),
      [Rank.Lv2]: Math.max(0, playerSoulLedger[Rank.Lv2] || 0),
      [Rank.Lv3]: Math.max(0, playerSoulLedger[Rank.Lv3] || 0),
      [Rank.Lv4]: Math.max(0, playerSoulLedger[Rank.Lv4] || 0),
      [Rank.Lv5]: Math.max(0, playerSoulLedger[Rank.Lv5] || 0),
    };
    const airelaBinding = hasOfficialBetaControl
      ? resolveAirelaFacilityBinding({
          districtHint: betaStatus.assignedDistrict || betaStatus.taxOfficeAddress || currentNarrativeLocation,
          citizenId: betaStatus.citizenId || null,
        })
      : null;
    const nextAssignedDistrict = hasOfficialBetaControl ? `${betaStatus.assignedDistrict ?? ''}`.trim() || airelaBinding?.districtName || '' : '';
    const nextAssignedXStationId = hasOfficialBetaControl ? `${betaStatus.assignedXStationId ?? ''}`.trim().toUpperCase() || airelaBinding?.xStationId || '' : '';
    const nextAssignedXStationLabel = hasOfficialBetaControl
      ? `${betaStatus.assignedXStationLabel ?? ''}`.trim() ||
        (nextAssignedXStationId
          ? formatAirelaSiteLabel('x_station', nextAssignedXStationId, airelaBinding?.districtName)
          : '')
      : '';
    const nextAssignedHXDormId = hasOfficialBetaControl ? `${betaStatus.assignedHXDormId ?? ''}`.trim().toUpperCase() || airelaBinding?.hxDormId || '' : '';
    const nextAssignedHXDormLabel = hasOfficialBetaControl
      ? `${betaStatus.assignedHXDormLabel ?? ''}`.trim() ||
        (nextAssignedHXDormId ? formatAirelaSiteLabel('hx_dorm', nextAssignedHXDormId, airelaBinding?.districtName) : '')
      : '';
    const nextSignature = JSON.stringify({
      playerName,
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
      protocol: playerNeuralProtocol,
      citizenId: betaStatus.citizenId,
      faction: playerFaction.name,
      assignedDistrict: nextAssignedDistrict || null,
      assignedXStationId: nextAssignedXStationId || null,
      assignedHXDormId: nextAssignedHXDormId || null,
      currentResidenceId: playerResidence.currentResidenceId || null,
      currentResidenceLabel: playerResidence.currentResidenceLabel || null,
      unlockedResidenceIds: playerResidence.unlockedResidenceIds,
      lcoin: nextCoinBuckets,
      coreAffixes: nextCoreAffixes,
      lingshu: nextLingshuParts.map(part => [part.key, part.level, part.rank].join('|')),
      taxOfficerId: betaStatus.taxOfficerBoundId || null,
      chips: playerChips.map(chip => chip.id),
    });
    if (nextSignature === lastPulledSyncSignatureRef.current) return;
    if (nextSignature === lastPushedSyncSignatureRef.current) return;

    const timer = window.setTimeout(() => {
      try {
        const vars = tavernBridge.getVariables!({ type: 'chat' }) || {};
        const root = vars.stat_data && typeof vars.stat_data === 'object' ? vars.stat_data : {};
        const world = root.world && typeof root.world === 'object' ? root.world : {};
        const player = root.player && typeof root.player === 'object' ? root.player : {};
        const chipRoot = vars.chips && typeof vars.chips === 'object' && !Array.isArray(vars.chips) ? vars.chips : {};
        const coreStatusRaw = player.core_status;
        const coreStatus =
          coreStatusRaw && typeof coreStatusRaw === 'object' && !Array.isArray(coreStatusRaw)
            ? coreStatusRaw
            : {};
        const statusRaw = player.status;
        const status = statusRaw && typeof statusRaw === 'object' && !Array.isArray(statusRaw) ? statusRaw : {};
        const psionic = player.psionic && typeof player.psionic === 'object' ? player.psionic : {};
        const assets = player.assets && typeof player.assets === 'object' ? player.assets : {};
        const identityRaw = player.identity;
        const identity =
          identityRaw && typeof identityRaw === 'object' && !Array.isArray(identityRaw)
            ? identityRaw
            : {};
        const chipStateRaw = player.chip;
        const chipState =
          chipStateRaw && typeof chipStateRaw === 'object' && !Array.isArray(chipStateRaw)
            ? chipStateRaw
            : {};
        const residenceRaw = player.residence;
        const residenceState =
          residenceRaw && typeof residenceRaw === 'object' && !Array.isArray(residenceRaw)
            ? residenceRaw
            : {};
        const lcoin = assets.lcoin && typeof assets.lcoin === 'object' ? assets.lcoin : {};
        const normalizeRateField = (rawRate: unknown, current: number) => {
          const nextCurrent = runtimePercentToStatRate(current);
          if (rawRate && typeof rawRate === 'object' && !Array.isArray(rawRate)) {
            return {
              ...(rawRate as Record<string, any>),
              current: nextCurrent,
            };
          }
          return { current: nextCurrent };
        };
        const worldExchangeRules =
          world.exchange_rules && typeof world.exchange_rules === 'object' && !Array.isArray(world.exchange_rules)
            ? world.exchange_rules
            : {};
        const nextNarrativeLocation = currentNarrativeLocation || world.current_location || '未知区域';
        const nextSceneState = resolveAirelaSceneState(nextNarrativeLocation, hasBetaChip ? airelaBinding : null);
        const allowOfficialResidenceFallback = hasOfficialBetaControl && isAirelaResidenceZone(nextNarrativeLocation);
        const mergedResidence = normalizeResidenceState(
          {
            currentResidenceId: playerResidence.currentResidenceId,
            currentResidenceLabel: playerResidence.currentResidenceLabel,
            unlockedResidenceIds: playerResidence.unlockedResidenceIds,
          },
          {
            currentResidenceId:
              `${residenceState.current_residence_id ?? ''}`.trim() ||
              (allowOfficialResidenceFallback ? airelaBinding?.residenceId || '' : ''),
            currentResidenceLabel:
              `${residenceState.current_residence_label ?? ''}`.trim() ||
              (allowOfficialResidenceFallback ? nextAssignedHXDormLabel || airelaBinding?.residenceLabel || '' : ''),
            unlockedResidenceIds: [
              ...(Array.isArray(residenceState.unlocked_residence_ids) ? residenceState.unlocked_residence_ids : []),
              ...(hasOfficialBetaControl && airelaBinding?.residenceId ? [airelaBinding.residenceId] : []),
            ],
          },
        );
        const nextPlayer: Record<string, any> = {
          ...player,
          name: playerName,
          display_name: playerName,
          gender: playerGender,
          region: nextNarrativeLocation || player.region || world.current_location || '未知区域',
          faction: playerFaction.name || player.faction || world.current_faction || '未知势力',
          occupation: player.occupation || '未定',
          identity: {
            ...identity,
            citizen_id: betaStatus.citizenId,
            neural_protocol: playerNeuralProtocol,
          },
          neural_protocol: playerNeuralProtocol,
          citizen_id: betaStatus.citizenId,
          has_beta_chip: hasBetaChip,
          psionic_rank: playerStats.psionic.level,
          reputation: betaStatus.creditScore,
          credits: playerStats.credits,
          residence: {
            ...residenceState,
            current_residence_id: mergedResidence.currentResidenceId,
            current_residence_label: mergedResidence.currentResidenceLabel,
            unlocked_residence_ids: mergedResidence.unlockedResidenceIds,
          },
          core_status: {
            ...coreStatus,
            hp: { ...(coreStatus.hp || {}), current: playerStats.hp.current, max: playerStats.hp.max },
            mp: { ...(coreStatus.mp || {}), current: playerStats.mp.current, max: playerStats.mp.max },
            sanity: { ...(coreStatus.sanity || {}), current: playerStats.sanity.current, max: playerStats.sanity.max },
            reputation: { ...(coreStatus.reputation || {}), current: betaStatus.creditScore, max: 120 },
          },
          status: {
            ...status,
            hp: { ...(status.hp || {}), current: playerStats.hp.current, max: playerStats.hp.max },
            mp: { ...(status.mp || {}), current: playerStats.mp.current, max: playerStats.mp.max },
            sanity: { ...(status.sanity || {}), current: playerStats.sanity.current, max: playerStats.sanity.max },
            reputation: { ...(status.reputation || {}), current: betaStatus.creditScore, max: 120 },
          },
          six_dim: {
            ...((player.six_dim && typeof player.six_dim === 'object' && !Array.isArray(player.six_dim)) ? player.six_dim : {}),
            ...playerStats.sixDim,
          },
          psionic: {
            ...psionic,
            rank: playerStats.psionic.level,
            density_level: rankToLevel(playerStats.psionic.level),
            energy_value: {
              ...((psionic.energy_value && typeof psionic.energy_value === 'object' && !Array.isArray(psionic.energy_value))
                ? psionic.energy_value
                : {}),
              current: playerStats.mp.current,
              max: playerStats.mp.max,
            },
            energy_value_max: playerStats.mp.max,
            conversion_rate: normalizeRateField(psionic.conversion_rate, playerStats.psionic.conversionRate),
            recovery_rate: normalizeRateField(psionic.recovery_rate, playerStats.psionic.recoveryRate),
            base_daily_recovery: {
              ...((psionic.base_daily_recovery && typeof psionic.base_daily_recovery === 'object' && !Array.isArray(psionic.base_daily_recovery))
                ? psionic.base_daily_recovery
                : {}),
              male: 120,
              female: 30,
            },
          },
          assets: {
            ...assets,
            credits: playerStats.credits,
            lcoin: {
              ...lcoin,
              ...nextCoinBuckets,
              total: nextCoinTotal,
            },
          },
          chip: {
            ...chipState,
            beta_equipped: hasBetaChip,
            assigned_district: nextAssignedDistrict,
            assigned_x_station_id: nextAssignedXStationId,
            assigned_x_station_label: nextAssignedXStationLabel,
            assigned_hx_dorm_id: nextAssignedHXDormId,
            assigned_hx_dorm_label: nextAssignedHXDormLabel,
            tax_officer_id: hasOfficialBetaControl ? betaStatus.taxOfficerBoundId || '' : '',
            tax_officer_name: hasOfficialBetaControl ? betaStatus.taxOfficerName || '' : '',
            tax_office_address: hasOfficialBetaControl ? betaStatus.taxOfficeAddress || '' : '',
            tax_rate: toFiniteNumber(chipState.tax_rate) ?? 0,
            tax_amount: hasOfficialBetaControl ? betaStatus.taxAmount : 0,
            tax_arrears: hasOfficialBetaControl ? Math.max(0, betaStatus.taxArrears || 0) : 0,
            switch_cooldown_round: toFiniteNumber(chipState.switch_cooldown_round) ?? 0,
          },
          flags: {
            ...((player.flags && typeof player.flags === 'object' && !Array.isArray(player.flags)) ? player.flags : {}),
            opening_locked: false,
            narration_owner: 'player',
            allow_auto_opening: false,
          },
          status_tags: nextStatusTags,
          core_affixes: nextCoreAffixes,
          lingshu_parts: nextLingshuParts,
          soul_ledger: nextSoulLedger,
        };

        const nextVars = { ...vars };
        nextVars.stat_data = {
          ...root,
          world: {
            ...world,
            current_time: effectiveGameTimeText,
            current_period: effectiveGameDayPhase,
            current_location: nextNarrativeLocation,
            current_district: nextSceneState.currentDistrict,
            current_site_type: nextSceneState.currentSiteType,
            current_site_id: nextSceneState.currentSiteId,
            current_site_label: nextSceneState.currentSiteLabel,
            current_faction: playerFaction.name || world.current_faction || '未知势力',
            exchange_rules: {
              ...DEFAULT_STAT_EXCHANGE_RULES,
              ...worldExchangeRules,
              region_modifier: {
                ...DEFAULT_STAT_EXCHANGE_RULES.region_modifier,
                ...((worldExchangeRules.region_modifier && typeof worldExchangeRules.region_modifier === 'object' && !Array.isArray(worldExchangeRules.region_modifier))
                  ? worldExchangeRules.region_modifier
                  : {}),
              },
            },
          },
          player: nextPlayer,
        };
        nextVars.chips = {
          ...chipRoot,
          equipped: playerChips.map(chip => ({
            id: chip.id,
            name: chip.name,
            type: chip.type,
            rank: chip.rank,
          })),
          storage: storageChips.map(chip => ({
            id: chip.id,
            name: chip.name,
            type: chip.type,
            rank: chip.rank,
          })),
        };

        tavernBridge.replaceVariables!(nextVars, { type: 'chat' });
        lastPushedSyncSignatureRef.current = nextSignature;
      } catch (error) {
        console.warn('写回酒馆变量失败:', error);
      }
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    gameStage,
    playerName,
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
    playerGender,
    playerNeuralProtocol,
    betaStatus.citizenId,
    betaStatus.creditScore,
    betaStatus.assignedDistrict,
    betaStatus.assignedXStationId,
    betaStatus.assignedXStationLabel,
    betaStatus.assignedHXDormId,
    betaStatus.assignedHXDormLabel,
    playerResidence.currentResidenceId,
    playerResidence.currentResidenceLabel,
    playerResidence.unlockedResidenceIds,
    betaStatus.taxOfficerBoundId,
    betaStatus.taxOfficerName,
    betaStatus.taxOfficeAddress,
    betaStatus.taxAmount,
    betaStatus.taxArrears,
    effectiveGameTimeText,
    effectiveGameDayPhase,
    currentNarrativeLocation,
    playerFaction.name,
    hasBetaChip,
    hasOfficialBetaControl,
    playerChips,
    storageChips,
    coinVault,
    playerCoreAffixes,
    playerLingshu,
    playerSoulLedger,
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

  const pushFinanceLedgerEntry = useCallback(
    (entry: Omit<FinanceLedgerEntry, 'id' | 'timestamp'> & Partial<Pick<FinanceLedgerEntry, 'id' | 'timestamp'>>) => {
      setFinanceLedger(prev => [
        {
          id: entry.id || `ledger_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: entry.timestamp || new Date().toISOString(),
          ...entry,
        },
        ...prev,
      ].slice(0, 80));
    },
    [],
  );

  const persistArchives = (slots: ArchiveSlot[]) => {
    try {
      window.localStorage.setItem(archiveStorageKey, JSON.stringify(slots));
    } catch (error) {
      console.warn('写入档案列表失败:', error);
    }
  };

  const buildSavePayload = (): LnSaveData => ({
    version: 2,
    playerName,
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
    monthlySettlementLog,
    settlementCheckpointMonth,
    financeLedger,
    playerResidence,
    stateLock,
  });

  const applySavePayload = (payload: LnSaveData) => {
    const normalizedMessages = ensurePseudoLayerOnLoad(payload.messages || MOCK_MESSAGES, {
      location: payload.playerFaction?.headquarters || '未知区域',
      credits: payload.playerStats?.credits || 0,
      reputation: payload.betaStatus?.creditScore || 60,
      elapsedMinutes: payload.mapRuntime?.elapsedMinutes || 0,
    });
    setMessages(normalizedMessages);
    setPlayerName(payload.playerName?.trim() || LN_DEFAULT_PLAYER_NAME);
    setPlayerStats(ensurePlayerStatsSixDim(payload.playerStats || MOCK_PLAYER_STATS));
    setPlayerGender(payload.playerGender || 'male');
    setPlayerSkills(payload.playerSkills || []);
    setNpcs(normalizeNpcListForUi(payload.npcs || []));
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
    setLeftModuleTab(
      payload.leftModuleTab === 'chips' || payload.leftModuleTab === 'economy' || payload.leftModuleTab === 'lingshu' || payload.leftModuleTab === 'inventory'
        ? payload.leftModuleTab
        : 'chips',
    );
    setPlayerNeuralProtocol(payload.playerNeuralProtocol === 'beta' ? 'beta' : 'none');
    setCareerTracks(payload.careerTracks?.length ? cloneCareerTracks(payload.careerTracks) : cloneCareerTracks(DEFAULT_CAREER_TRACKS));
    const loadedStatus = payload.betaStatus || MOCK_PLAYER_STATUS;
    setBetaStatus({
      ...loadedStatus,
      taxOfficerUnlocked: loadedStatus.taxOfficerUnlocked ?? payload.playerNeuralProtocol === 'beta',
      taxArrears: Math.max(0, loadedStatus.taxArrears || 0),
      assignedDistrict: loadedStatus.assignedDistrict || '',
      assignedXStationId: loadedStatus.assignedXStationId || '',
      assignedXStationLabel: loadedStatus.assignedXStationLabel || '',
      assignedHXDormId: loadedStatus.assignedHXDormId || '',
      assignedHXDormLabel: loadedStatus.assignedHXDormLabel || '',
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
    setMonthlySettlementLog(payload.monthlySettlementLog || []);
    setSettlementCheckpointMonth(payload.settlementCheckpointMonth || getMonthKeyFromElapsedMinutes(payload.mapRuntime?.elapsedMinutes || 0));
    setFinanceLedger(payload.financeLedger || []);
    setPlayerResidence(normalizeResidenceState(payload.playerResidence, EMPTY_RESIDENCE_STATE));
    setStateLock(
      payload.stateLock || {
        lockTime: false,
        lockLocation: false,
        lockIdentity: false,
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
    const fallbackName = playerName.trim() || new Date(now).toLocaleString('zh-CN');
    const manualSelectedArchiveId = selectedArchiveId && selectedArchiveId !== LN_AUTO_ARCHIVE_ID ? selectedArchiveId : '';
    const targetId = manualSelectedArchiveId || `archive_${now}_${Math.random().toString(36).slice(2, 8)}`;
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
    window.localStorage.setItem(lastArchiveStorageKey, targetId);
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
    window.localStorage.setItem(lastArchiveStorageKey, LN_AUTO_ARCHIVE_ID);
    persistArchives(merged);
  };

  const loadArchiveById = (archiveId: string) => {
    const slot = archiveSlots.find(item => item.id === archiveId);
    if (!slot) return;
    applySavePayload(slot.data);
    setSelectedArchiveId(slot.id);
    setArchiveNameInput(slot.name);
    window.localStorage.setItem(lastArchiveStorageKey, slot.id);
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
      window.localStorage.setItem(lastArchiveStorageKey, nextSelected);
    } else {
      setArchiveNameInput('');
      window.localStorage.removeItem(lastArchiveStorageKey);
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

  const requestApiMaintext = async (
    input: string,
    context?: { gameTime?: string; dayPhase?: string; location?: string; sceneHint?: string; dialogueContext?: string },
    signal?: AbortSignal,
  ): Promise<ParsedApiOutput | null> => {
    const runtimeMode = resolveApiRuntimeMode(apiConfig);
    if (runtimeMode === 'disabled') return null;
    const endpoint = resolveApiEndpoint(apiConfig.endpoint);

    if (runtimeMode === 'tavern') {
      const tavernGenerateList = resolveTavernGenerateList();
      if (tavernGenerateList.length === 0) {
        throw new Error('未找到酒馆生成接口（generate / generateRaw），请检查酒馆助手加载状态。');
      }
      const contextPrefix = context
        ? [
            '【运行上下文（仅用于内部推理，不要原样复述）】',
            `time=${context.gameTime || ''}${context.dayPhase ? ` (${context.dayPhase})` : ''}`,
            `location=${context.location || ''}`,
            context.sceneHint ? `scene=${context.sceneHint}` : '',
            '禁止在 maintext 开头重复输出时间/地点/时段；这些由前端顶部状态栏显示。',
            PSEUDO_LAYER_RESPONSE_RULES,
          ]
            .filter(Boolean)
            .join('\n')
            .concat('\n')
        : `${PSEUDO_LAYER_RESPONSE_RULES}\n`;
      const dialoguePrefix = context?.dialogueContext?.trim()
        ? `${context.dialogueContext.trim()}\n`
        : '';
      const userInput = `${contextPrefix}${dialoguePrefix}${input}`.trim();
      const runWithAbort = async (fn: TavernGenerateFn, shouldSilence?: boolean): Promise<string> => {
        const args: TavernGenerateArgs =
          typeof shouldSilence === 'boolean'
            ? { user_input: userInput, should_silence: shouldSilence }
            : { user_input: userInput };
        const genPromise = fn(args);
        const result = signal
          ? await Promise.race<unknown>([
              genPromise,
              new Promise<never>((_, reject) => {
                if (signal.aborted) {
                  reject(new DOMException('Aborted', 'AbortError'));
                  return;
                }
                const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
                signal.addEventListener('abort', onAbort, { once: true });
              }),
            ])
          : await genPromise;
        return sanitizeAiMaintext(coerceGenerateResultToText(result));
      };

      let text = '';
      // 优先走非静默生成，让父酒馆进入正常生成态；若宿主实现返回空串，再退回静默模式兜底。
      const silenceModes: Array<boolean | undefined> = [false, true];
      for (const silenceMode of silenceModes) {
        for (const generateFn of tavernGenerateList) {
          text = await runWithAbort(generateFn, silenceMode);
          if (text) break;
        }
        if (text) break;
      }
      if (!text) {
        throw new Error('酒馆生成接口返回空文本。');
      }
      return parseApiOutputPayload(text);
    }

    const externalConfigError = validateExternalApiConfig(apiConfig);
    if (externalConfigError) {
      throw new Error(externalConfigError);
    }

    const requestMessages = context
      ? [
          {
            role: 'system',
            content: [
              '以下为运行上下文，仅用于内部推理：',
              `time=${context.gameTime || ''}${context.dayPhase ? ` (${context.dayPhase})` : ''}`,
              `location=${context.location || ''}`,
              context.sceneHint ? `scene=${context.sceneHint}` : '',
              '不要在 maintext 首行重复时间/地点/时段，顶部状态栏已显示。',
              PSEUDO_LAYER_RESPONSE_RULES,
              context.dialogueContext ? `\n${context.dialogueContext}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          },
          { role: 'user', content: input },
        ]
      : [
          { role: 'system', content: PSEUDO_LAYER_RESPONSE_RULES },
          { role: 'user', content: input },
        ];
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiConfig.apiKey.trim()) {
      headers.Authorization = `Bearer ${apiConfig.apiKey.trim()}`;
    }

    const requestBody = isResponsesApiEndpoint(endpoint)
      ? {
          model: apiConfig.model.trim(),
          input: buildResponsesApiInput(requestMessages),
          temperature: 0.85,
        }
      : {
          model: apiConfig.model.trim(),
          messages: requestMessages,
          temperature: 0.85,
        };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal,
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorText = sanitizeAiMaintext(await response.text().catch(() => ''));
      const summary = errorText ? `: ${errorText.slice(0, 180)}` : '';
      throw new Error(`HTTP ${response.status}${summary}`);
    }
    const contentType = `${response.headers.get('content-type') || ''}`.toLowerCase();
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    return parseApiOutputPayload(sanitizeAiMaintext(coerceGenerateResultToText(payload)));
  };

  const handleUpdateNpc = (npcId: string, updates: Partial<NPC>) => {
    setNpcs(prev => prev.map(n => (n.id === npcId ? normalizeNpcForUi({ ...n, ...updates }) : n)));
  };

  const handleToggleSocialFollow = (npcId: string) => {
    setNpcs(prev =>
      prev.map(npc => {
        if (npc.id !== npcId) return npc;
        const nextFollow = !npc.playerFollows;
        const autoMutual = nextFollow && (npc.isContact || (npc.affection || npc.trust || 0) >= 45 || hashText(`${npc.id}_mutual`) % 3 === 0);
        return normalizeNpcForUi({
          ...npc,
          playerFollows: nextFollow,
          followsPlayer: nextFollow ? npc.followsPlayer || autoMutual : npc.followsPlayer,
          unlockState: nextFollow
            ? {
                ...(npc.unlockState || {}),
                dossierLevel: Math.max(autoMutual ? 4 : 3, npc.unlockState?.dossierLevel || 0),
                darknetLevel: Math.max(autoMutual ? 4 : 2, npc.unlockState?.darknetLevel || 0),
                darknetUnlocked: true,
              }
            : npc.unlockState,
          dmThread:
            nextFollow && autoMutual && (npc.dmThread || []).length === 0
              ? [
                  ...(npc.dmThread || []),
                  {
                    id: `dm_follow_${Date.now()}`,
                    sender: 'npc',
                    content: `${playerName || '接入者'}，我看到你的关注了。`,
                    timestamp: new Date().toISOString(),
                    kind: 'text',
                  },
                ]
              : npc.dmThread,
        });
      }),
    );
  };

  const handleAddSocialComment = (npcId: string, postId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setNpcs(prev =>
      prev.map(npc => {
        if (npc.id !== npcId) return npc;
        return normalizeNpcForUi({
          ...npc,
          socialFeed: npc.socialFeed.map(post =>
            post.id === postId
              ? {
                  ...post,
                  comments: [
                    ...post.comments,
                    {
                      id: `comment_${Date.now()}`,
                      sender: playerName || '玩家',
                      content: trimmed,
                      timestamp: new Date().toISOString(),
                      isPlayer: true,
                    },
                  ],
                }
              : post,
          ),
        });
      }),
    );
  };

  const handleSendSocialDm = (npcId: string, content: string) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    setNpcs(prev =>
      prev.map(npc => {
        if (npc.id !== npcId || !(npc.playerFollows && npc.followsPlayer)) return npc;
        const nextThread: DirectMessage[] = [
          ...(npc.dmThread || []),
          {
            id: `dm_player_${Date.now()}`,
            sender: 'player',
            content: trimmed,
            timestamp: new Date().toISOString(),
            kind: 'text',
          },
          {
            id: `dm_npc_${Date.now() + 1}`,
            sender: 'npc',
            content: npc.status === 'busy' ? '我看到了，稍后回你。' : '收到，灵网里说。',
            timestamp: new Date().toISOString(),
            kind: 'text',
          },
        ];
        return normalizeNpcForUi({ ...npc, dmThread: nextThread });
      }),
    );
  };

  const handleSpendOnSocial = ({
    npcId,
    amount,
    kind,
    note,
    postId,
  }: {
    npcId: string;
    amount: number;
    kind: 'transfer' | 'tip' | 'unlock';
    note?: string;
    postId?: string;
  }): { ok: boolean; message?: string } => {
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, message: '金额无效。' };
    if (playerStats.credits < amount) return { ok: false, message: '灵币不足。' };

    const target = npcs.find(npc => npc.id === npcId);
    if (!target) return { ok: false, message: '目标账号不存在。' };

    setPlayerStats(prev => ({ ...prev, credits: Math.max(0, prev.credits - amount) }));
    setNpcs(prev =>
      prev.map(npc => {
        if (npc.id !== npcId) return npc;
        const nextFeed = npc.socialFeed.map(post => {
          if (post.id !== postId) return post;
          if (kind === 'unlock') {
            return { ...post, unlockedByPlayer: true, tipsReceived: (post.tipsReceived || 0) + amount };
          }
          if (kind === 'tip') {
            return { ...post, tipsReceived: (post.tipsReceived || 0) + amount };
          }
          return post;
        });
        const nextThread: DirectMessage[] = [
          ...(npc.dmThread || []),
          {
            id: `dm_pay_${Date.now()}`,
            sender: 'system',
            content: note?.trim() || (kind === 'unlock' ? '已完成内容解锁。' : kind === 'tip' ? '已完成动态打赏。' : '已完成转账。'),
            timestamp: new Date().toISOString(),
            amount,
            kind,
          },
        ];
        return normalizeNpcForUi({
          ...npc,
          stats: {
            ...npc.stats,
            credits: (npc.stats?.credits || 0) + amount,
          },
          affection: npc.gender === 'female' ? Math.min(100, (npc.affection || 0) + Math.max(1, Math.floor(amount / 40))) : npc.affection,
          trust: npc.gender === 'male' ? Math.min(100, (npc.trust || 0) + Math.max(1, Math.floor(amount / 40))) : npc.trust,
          unlockState: {
            ...(npc.unlockState || {}),
            dossierLevel: Math.max(kind === 'unlock' ? 4 : 3, npc.unlockState?.dossierLevel || 0),
            darknetLevel: Math.max(kind === 'unlock' ? 4 : amount >= 80 ? 3 : 2, npc.unlockState?.darknetLevel || 0),
            darknetUnlocked: true,
          },
          dmThread: nextThread,
          socialFeed: nextFeed,
        });
      }),
    );
    setMessages(prev => [
      ...prev,
      {
        id: `social_pay_${Date.now()}`,
        sender: 'System',
        content: `灵网支付完成：向 ${target.name} ${kind === 'tip' ? '打赏' : kind === 'unlock' ? '支付解锁' : '转账'} ${amount} 灵币。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
    pushFinanceLedgerEntry({
      kind: 'social',
      title: kind === 'tip' ? '灵网打赏' : kind === 'unlock' ? '灵网解锁支付' : '灵网转账',
      detail: `向 ${target.name} ${kind === 'tip' ? '打赏' : kind === 'unlock' ? '支付解锁' : '转账'} ${amount} 灵币。`,
      amount: -amount,
      counterparty: target.name,
    });
    return { ok: true };
  };

  const handlePurchaseDarknetService = ({
    npcId,
    serviceId,
  }: {
    npcId: string;
    serviceId: string;
  }): { ok: boolean; message?: string } => {
    const target = npcs.find(npc => npc.id === npcId);
    const service = target?.darknetProfile?.services?.find(item => item.id === serviceId);
    if (!target || !service) return { ok: false, message: '目标服务不存在。' };

    const access = resolveNpcCodexAccessState(target);
    const requiredLevel = Math.max(1, service.unlockLevel || 1);
    if (!access.darknetUnlocked || access.darknetLevel < requiredLevel) {
      return { ok: false, message: `暗网等级不足，需达到 Lv.${requiredLevel}。` };
    }
    if (playerStats.credits < service.price) {
      return { ok: false, message: '灵币不足。' };
    }

    const nowIso = new Date().toISOString();
    const nowDisplay = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const deliveryRecord = buildPurchasedDarknetServiceRecord(
      target,
      service,
      nowIso,
      currentNarrativeLocation || target.location || target.darknetProfile?.lastSeen || '暗网节点',
    );

    setPlayerStats(prev => ({
      ...prev,
      credits: Math.max(0, prev.credits - service.price),
    }));
    setNpcs(prev =>
      prev.map(npc => {
        if (npc.id !== npcId) return npc;
        const currentProfile = npc.darknetProfile || {};
        const nextRecords = [deliveryRecord, ...(currentProfile.intelRecords || [])];
        return normalizeNpcForUi({
          ...npc,
          darknetProfile: {
            ...currentProfile,
            lastSeen: currentNarrativeLocation || currentProfile.lastSeen || npc.location,
            intelRecords: nextRecords,
          },
          unlockState: {
            ...(npc.unlockState || {}),
            dossierLevel: Math.max(3, npc.unlockState?.dossierLevel || 0),
            darknetLevel: Math.max(requiredLevel, npc.unlockState?.darknetLevel || 0),
            darknetUnlocked: true,
            intelUnlockedCount: Math.max(nextRecords.length, npc.unlockState?.intelUnlockedCount || 0),
          },
        });
      }),
    );
    pushFinanceLedgerEntry({
      kind: 'darknet',
      title: '暗网服务采购',
      detail: `向 ${target.name} 采购「${service.title}」。`,
      amount: -service.price,
      counterparty: target.name,
    });
    setMessages(prev => [
      ...prev,
      {
        id: `darknet_service_${Date.now()}`,
        sender: 'System',
        content: `暗网采购完成：已向 ${target.name} 支付 ${service.price} 灵币，服务「${service.title}」已接入当前链路。`,
        timestamp: nowDisplay,
        type: 'narrative',
      },
    ]);
    return { ok: true, message: `已采购 ${service.title}` };
  };

  const handleImportSocialPost = (draft: SocialImportDraft) => {
    const now = new Date().toISOString();
    const existingTarget = draft.targetNpcId && draft.targetNpcId !== '__new__' ? npcs.find(npc => npc.id === draft.targetNpcId) : null;
    const displayName = draft.localName.trim() || existingTarget?.name || '新导入账号';
    const importDarknetRecord = buildImportedDarknetRecord(draft, displayName, now, currentNarrativeLocation || '灵网镜像节点');
    const importedPost: SocialPost = {
      id: `social_import_${Date.now()}`,
      content: draft.caption.trim(),
      timestamp: now,
      image: draft.imageUrl.trim(),
      comments: [],
      visibility: draft.visibility,
      unlockPrice: draft.visibility === 'premium' ? Math.max(1, draft.unlockPrice || 88) : undefined,
      unlockedByPlayer: draft.visibility !== 'premium',
      likeCount: 0,
      tipsReceived: 0,
      location: currentNarrativeLocation || '灵网',
      source: {
        platform: draft.platform,
        authorName: draft.originalAuthorName.trim() || undefined,
        authorHandle: draft.originalAuthorHandle.trim() || undefined,
        profileUrl: draft.profileUrl.trim() || undefined,
        postUrl: draft.postUrl.trim() || undefined,
        importedAt: now,
        note: draft.note.trim() || undefined,
      },
    };

    if (draft.targetNpcId && draft.targetNpcId !== '__new__') {
      setNpcs(prev =>
        prev.map(npc => {
          if (npc.id !== draft.targetNpcId) return npc;
          const nextGallery = draft.imageUrl.trim()
            ? [
                {
                  id: `gallery_import_${Date.now()}`,
                  src: draft.imageUrl.trim(),
                  title: `${displayName} 导入图片`,
                  caption: draft.caption.trim() || `${draft.platform.toUpperCase()} 公开素材导入`,
                  sourceLabel: draft.platform.toUpperCase(),
                  unlockLevel: draft.visibility === 'premium' ? 4 : 2,
                },
                ...(npc.gallery || []),
              ]
            : npc.gallery || [];
          return normalizeNpcForUi({
            ...npc,
            avatarUrl: draft.imageUrl.trim() || npc.avatarUrl,
            socialHandle: draft.socialHandle.trim() || npc.socialHandle,
            socialBio: draft.socialBio.trim() || npc.socialBio,
            clueNotes:
              npc.clueNotes && npc.clueNotes.length > 0
                ? npc.clueNotes
                : [`已导入来自 ${draft.platform.toUpperCase()} 的公开资料映射。`],
            dossierSections:
              npc.dossierSections && npc.dossierSections.length > 0
                ? npc.dossierSections
                : [
                    {
                      id: 'social_import_origin',
                      title: '来源映射',
                      content: `该人物已绑定公开社交素材来源，当前导入平台为 ${draft.platform.toUpperCase()}。互动、评论与私信均在 LN 内本土化处理。`,
                      unlockLevel: 2,
                    },
                  ],
            gallery: nextGallery,
            darknetProfile: {
              ...(npc.darknetProfile || {}),
              handle: npc.darknetProfile?.handle || `dn://${buildSocialHandleSeed({ ...npc, name: displayName })}`,
              alias: npc.darknetProfile?.alias || `${displayName} / 镜像账号`,
              summary:
                npc.darknetProfile?.summary
                || `${displayName} 已建立公开素材来源映射档。公开入口仍走灵网，但情报留痕、来源核验与后续扩写统一沉淀到暗网侧。`,
              accessTier: npc.darknetProfile?.accessTier || '镜像归档节点',
              marketVector: npc.darknetProfile?.marketVector || `${draft.platform.toUpperCase()} 来源镜像 / 灵网导流`,
              riskRating: Math.max(2, npc.darknetProfile?.riskRating || 0),
              bounty: npc.darknetProfile?.bounty || '未挂牌',
              tags: normalizeUniqueStrings([...(npc.darknetProfile?.tags || []), draft.platform.toUpperCase(), '来源映射', '公开素材导入']),
              knownAssociates: normalizeUniqueStrings([
                ...(npc.darknetProfile?.knownAssociates || []),
                draft.originalAuthorName.trim() || draft.originalAuthorHandle.trim(),
              ]),
              lastSeen: currentNarrativeLocation || npc.location || '灵网镜像节点',
              intelRecords: [importDarknetRecord, ...(npc.darknetProfile?.intelRecords || [])],
            },
            unlockState: {
              ...(npc.unlockState || {}),
              dossierLevel: Math.max(4, npc.unlockState?.dossierLevel || 0),
              albumUnlockedCount: Math.max(nextGallery.length, npc.unlockState?.albumUnlockedCount || 0),
              socialUnlocked: true,
              darknetLevel: Math.max(4, npc.unlockState?.darknetLevel || 0),
              darknetUnlocked: true,
              intelUnlockedCount: Math.max((npc.darknetProfile?.intelRecords || []).length + 1, npc.unlockState?.intelUnlockedCount || 0),
            },
            socialFeed: [importedPost, ...npc.socialFeed],
          });
        }),
      );
    } else {
      const npcId = `social_import_npc_${Date.now()}`;
      const seedNpc = normalizeNpcForUi({
        id: npcId,
        name: displayName,
        gender: draft.gender,
        group: '',
        position: '灵网博主',
        affiliation: `${draft.platform.toUpperCase()} 来源映射`,
        location: currentNarrativeLocation || '灵网',
        isContact: false,
        stats: buildAutoNearbyNpcStats(`${npcId}_${draft.localName}`, draft.gender),
        affection: draft.gender === 'female' ? 18 : undefined,
        trust: draft.gender === 'male' ? 18 : undefined,
        bodyParts: draft.gender === 'female' ? buildAutoNearbyNpcBodyParts(npcId) : [],
        spiritSkills: draft.gender === 'male' ? [] : undefined,
        chips: buildAutoNearbyNpcChips(npcId, draft.gender),
        avatarUrl: draft.imageUrl.trim(),
        status: 'online',
        inventory: [],
        socialHandle: draft.socialHandle.trim(),
        socialBio: draft.socialBio.trim() || `${draft.platform.toUpperCase()} 公开素材映射账号`,
        playerFollows: false,
        followsPlayer: false,
        followerCount: 400 + (hashText(displayName) % 1800),
        followingCount: 12 + (hashText(`${displayName}_f`) % 90),
        walletTag: `LPAY-${displayName.trim().replace(/[^\w\u4e00-\u9fa5]+/g, '').slice(0, 10).toUpperCase() || 'IMPORT'}`,
        clueNotes: [
          `来自 ${draft.platform.toUpperCase()} 公开主页的素材映射账号。`,
          '当前已本土化为 LN 灵网人物，可继续解锁人物志与相册。',
        ],
        dossierSections: [
          {
            id: 'social_import_origin',
            title: '来源映射',
            content: `该人物通过 ${draft.platform.toUpperCase()} 公开资料导入。当前账号仅保留公开图片与来源链接，互动与后续剧情均由 LN 内部系统接管。`,
            unlockLevel: 2,
          },
        ],
        gallery: draft.imageUrl.trim()
          ? [
              {
                id: `gallery_import_${Date.now()}`,
                src: draft.imageUrl.trim(),
                title: `${displayName} 导入图片`,
                caption: draft.caption.trim() || `${draft.platform.toUpperCase()} 公开素材导入`,
                sourceLabel: draft.platform.toUpperCase(),
                unlockLevel: draft.visibility === 'premium' ? 4 : 2,
              },
            ]
          : [],
        darknetProfile: {
          handle: `dn://${displayName.trim().replace(/[^\w\u4e00-\u9fa5]+/g, '').toLowerCase().slice(0, 18) || npcId}`,
          alias: `${displayName} / 镜像账号`,
          summary: `该人物通过 ${draft.platform.toUpperCase()} 公开素材导入，公开互动留在灵网，来源映射与后续扩写则统一沉淀到暗网侧。`,
          accessTier: '镜像归档节点',
          marketVector: '公开素材导入 / 本地互动接管',
          riskRating: draft.visibility === 'premium' ? 3 : 2,
          bounty: '未挂牌',
          tags: normalizeUniqueStrings([draft.platform.toUpperCase(), '来源映射', '导入账号']),
          knownAssociates: normalizeUniqueStrings([draft.originalAuthorName.trim() || draft.originalAuthorHandle.trim()]),
          lastSeen: currentNarrativeLocation || '灵网镜像节点',
          intelRecords: [importDarknetRecord],
        },
        unlockState: {
          dossierLevel: 4,
          albumUnlockedCount: 12,
          socialUnlocked: true,
          darknetLevel: 4,
          darknetUnlocked: true,
          intelUnlockedCount: 1,
        },
        dmThread: [],
        socialFeed: [importedPost],
      });
      setNpcs(prev => [seedNpc, ...prev]);
    }

    setMessages(prev => [
      ...prev,
      {
        id: `social_import_${Date.now()}`,
        sender: 'System',
        content: `灵网素材已导入：${displayName} 的公开图片已本土化写入动态流。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
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
      pushFinanceLedgerEntry({
        kind: 'exchange',
        title: '跨级压缩',
        detail: `消耗 ${amount} 灵能币，压缩为 ${gain} 枚 ${target}。`,
        amount: -amount,
      });
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
    pushFinanceLedgerEntry({
      kind: 'exchange',
      title: '跨级分解',
      detail: `分解 ${amount} 枚 ${source}，回收 ${gain} 灵能币。`,
      amount: gain,
    });
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

    pushFinanceLedgerEntry({
      kind: 'combat',
      title: '击杀结算',
      detail: `${rank} 目标 x${killCount}，获得战斗结算灵能币。`,
      amount: gainedCredits,
    });
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
        const next = [...prev];
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
      pushFinanceLedgerEntry({
        kind: 'exchange',
        title: '灵压兑换灵币',
        detail: `消耗 ${amount} MP，兑换 ${coinsGained} 灵能币。`,
        amount: coinsGained,
      });
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
    pushFinanceLedgerEntry({
      kind: 'exchange',
      title: '灵币回充灵压',
      detail: `消耗 ${amount} 灵能币，回充 ${mpGained} MP。`,
      amount: -amount,
    });
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
      content: `已使用 [${item.name}]。${parsed.canFly ? '已获得短距飞行能力。' : ''}`,
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

  const processCommand = async (
    input: string,
    options?: {
      requestInput?: string;
      appendPlayerMessage?: boolean;
    },
  ) => {
    const visibleInput = input.trim();
    const requestInput = resolveGenerateRequestInput(options?.requestInput ?? visibleInput);
    const appendPlayerMessage = options?.appendPlayerMessage ?? visibleInput.length > 0;
    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const actionMinutes = appendPlayerMessage && visibleInput ? estimateActionMinutes(visibleInput) : 0;
    const nextElapsedMinutes = (mapRuntime.elapsedMinutes || 0) + actionMinutes;
    const nextGameTimeText = formatGameTime(nextElapsedMinutes);
    const nextGameDayPhase = getDayPhase(nextElapsedMinutes);
    const nextGameSceneHint = `${getSceneHintByPhase(nextGameDayPhase)}${activeEffectHint ? ` 当前增益：${activeEffectHint}` : ''}`;
    const playerMsg: Message | null =
      appendPlayerMessage && visibleInput
        ? {
            id: `user_${Date.now()}`,
            sender: 'Player',
            content: visibleInput,
            timestamp: now,
            type: 'action',
          }
        : null;
    let baseTimeline = messages;
    if (focusedLayerId) {
      const focusIndex = messages.findIndex(msg => msg.id === focusedLayerId);
      if (focusIndex >= 0) baseTimeline = messages.slice(0, focusIndex + 1);
    }

    const requestTimeline = playerMsg ? [...baseTimeline, playerMsg] : baseTimeline;
    let wrotePlayerToTavern = false;
    if (playerMsg) {
      try {
        wrotePlayerToTavern = await appendTavernChatMessage('user', visibleInput);
      } catch (error) {
        console.warn('写入酒馆用户楼层失败，回退为前端本地状态:', error);
      }
    }

    if (playerMsg || requestTimeline !== messages) {
      if (wrotePlayerToTavern) {
        syncMessagesFromTavern();
      } else {
        setMessages(requestTimeline);
      }
    }

    let layerContent = buildPseudoLayer({
      playerInput: visibleInput,
      location: currentNarrativeLocation || '未知区域',
      credits: effectivePlayerStats.credits,
      reputation: betaStatus.creditScore,
      gameTime: nextGameTimeText,
      dayPhase: nextGameDayPhase,
      sceneHint: nextGameSceneHint,
    });
    const dialogueContextTimeline = appendPlayerMessage && visibleInput ? baseTimeline : requestTimeline;
    const dialogueContextForRequest = buildDialogueContextFromMessages(dialogueContextTimeline);
    const npcDirectorContextForRequest = buildNpcDirectorContextForRequest(requestInput, dialogueContextForRequest);
    const requestSupportContext = [dialogueContextForRequest, npcDirectorContextForRequest].filter(Boolean).join('\n\n');

    let aborted = false;
    let requestSeq = 0;
    let apiPatchResult: PatchApplyResult | null = null;
    let apiPatchParseError: string | null = null;
    let apiNpcDataParseError: string | null = null;
    if (apiConfig.enabled || apiConfig.useTavernApi) {
      requestSeq = ++apiRequestSeqRef.current;
      const controller = new AbortController();
      apiAbortControllerRef.current = controller;
      setIsApiSending(true);
      setApiError('');
      try {
        const apiPayload = await requestApiMaintext(requestInput, {
          gameTime: nextGameTimeText,
          dayPhase: nextGameDayPhase,
          location: currentNarrativeLocation || '未知区域',
          sceneHint: nextGameSceneHint,
          dialogueContext: requestSupportContext,
        }, controller.signal);
        if (apiPayload?.maintext) {
          layerContent = replaceMaintext(layerContent, apiPayload.maintext);
        } else {
          setApiError('本轮生成未提取到可用正文，已回退到系统伪0层正文模板。');
        }
        if (apiPayload?.sum) {
          layerContent = replaceSum(layerContent, apiPayload.sum);
        }
        if (apiPayload?.npcDataRecords?.length) {
          layerContent = replaceNpcData(layerContent, serializeNearbyNpcRecords(apiPayload.npcDataRecords));
        }
        if (apiPayload?.npcDataParseError) {
          apiNpcDataParseError = apiPayload.npcDataParseError;
        }
        if (apiPayload?.patchParseError) {
          apiPatchParseError = apiPayload.patchParseError;
        }
        if (apiPayload?.patchOperations?.length) {
          apiPatchResult = applyApiPatchToChatVariables(apiPayload.patchOperations);
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
    const settleSource = [visibleInput, parsedMaintext].filter(Boolean).join('\n');
    const patchLines: string[] = [];
    if (apiPatchResult) {
      const hasPatchActivity =
        apiPatchResult.applied > 0 ||
        apiPatchResult.skipped > 0 ||
        apiPatchResult.failed > 0 ||
        apiPatchResult.errors.length > 0;
      if (hasPatchActivity) {
        patchLines.push(
          `变量补丁写入：应用 ${apiPatchResult.applied}，跳过 ${apiPatchResult.skipped}，失败 ${apiPatchResult.failed}`,
        );
      }
      if (apiPatchResult.errors.length > 0) {
        patchLines.push(`变量补丁告警：${apiPatchResult.errors.slice(0, 2).join('；')}`);
      }
    }
    if (apiPatchParseError) {
      patchLines.push(`变量补丁解析：${apiPatchParseError}`);
    }
    if (apiNpcDataParseError) {
      patchLines.push(`NPC数据解析：${apiNpcDataParseError}`);
    }
    const settlementLines = [
      ...(appendPlayerMessage && visibleInput ? settleIntentCostDeterministic(visibleInput) : []),
      ...(settleSource ? settleKillFromText(settleSource) : []),
      ...(settleSource ? settleStatusFromText(settleSource) : []),
      ...patchLines,
    ];

    let wroteLayerToTavern = false;
    try {
      wroteLayerToTavern = await appendTavernChatMessage('assistant', layerContent);
    } catch (error) {
      console.warn('写入酒馆正文楼层失败，回退为前端本地状态:', error);
    }

    if (wroteLayerToTavern) {
      syncMessagesFromTavern();
      setFocusedLayerId(null);
    } else {
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
      setFocusedLayerId(systemLayerMsg.id);
    }
    if (actionMinutes > 0) {
      setMapRuntime(prev => ({
        ...prev,
        elapsedMinutes: nextElapsedMinutes,
        logs: [...(prev.logs || []), `+${actionMinutes}min -> ${nextGameTimeText}(${nextGameDayPhase})`].slice(-30),
      }));
    }
  };

  const rerollLayerWithApi = async (targetLayerId: string, playerInput: string, sourcePlayerMessageId?: string) => {
    const targetLayerIndex = messages.findIndex(msg => msg.id === targetLayerId);
    const rerollTimeline = targetLayerIndex >= 0 ? messages.slice(0, targetLayerIndex) : messages;
    const requestInput = resolveGenerateRequestInput(playerInput);
    let nextLayer = buildPseudoLayer({
      playerInput,
      location: currentNarrativeLocation || '未知区域',
      credits: playerStats.credits,
      reputation: betaStatus.creditScore,
      gameTime: gameTimeText,
      dayPhase: gameDayPhase,
      sceneHint: gameSceneHint,
    });
    const dialogueContextTimeline =
      sourcePlayerMessageId && playerInput.trim()
        ? rerollTimeline.filter(msg => msg.id !== sourcePlayerMessageId)
        : rerollTimeline;
    const dialogueContextForRequest = buildDialogueContextFromMessages(dialogueContextTimeline);
    const npcDirectorContextForRequest = buildNpcDirectorContextForRequest(requestInput, dialogueContextForRequest);
    const requestSupportContext = [dialogueContextForRequest, npcDirectorContextForRequest].filter(Boolean).join('\n\n');

    if (apiConfig.enabled || apiConfig.useTavernApi) {
      setApiError('');
      setIsApiSending(true);
      try {
        const apiPayload = await requestApiMaintext(requestInput, {
          gameTime: gameTimeText,
          dayPhase: gameDayPhase,
          location: currentNarrativeLocation || '未知区域',
          sceneHint: gameSceneHint,
          dialogueContext: requestSupportContext,
        });
        if (apiPayload?.maintext) {
          nextLayer = replaceMaintext(nextLayer, apiPayload.maintext);
        } else {
          setApiError('重roll 未提取到可用正文，已回退到系统伪0层正文模板。');
        }
        if (apiPayload?.sum) {
          nextLayer = replaceSum(nextLayer, apiPayload.sum);
        }
        if (apiPayload?.npcDataRecords?.length) {
          nextLayer = replaceNpcData(nextLayer, serializeNearbyNpcRecords(apiPayload.npcDataRecords));
        }
        // reroll 仅改写文本楼层，不重复执行增量变量补丁，避免重复累加。
      } catch (error) {
        const message = error instanceof Error ? error.message : '未知错误';
        setApiError(`重roll 调用失败: ${message}`);
      } finally {
        setIsApiSending(false);
      }
    }

    const now = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const targetLayer = messages.find(msg => msg.id === targetLayerId);
    if (typeof targetLayer?.chatMessageId === 'number') {
      try {
        const replaced = await replaceTavernChatMessage(targetLayer.chatMessageId, nextLayer);
        if (replaced) {
          syncMessagesFromTavern();
          setFocusedLayerId(targetLayerId);
          return;
        }
      } catch (error) {
        console.warn('重写酒馆正文楼层失败，回退为前端本地状态:', error);
      }
    }

    setMessages(prev => {
      if (sourcePlayerMessageId) {
        const sourcePlayerIdx = prev.findIndex(msg => msg.id === sourcePlayerMessageId && msg.sender === 'Player');
        if (sourcePlayerIdx >= 0) {
          const replayPlayerMsg: Message = {
            id: `user_reroll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            sender: 'Player',
            content: playerInput,
            timestamp: now,
            type: 'action',
          };
          const replayLayerMsg: Message = {
            id: targetLayerId,
            sender: 'System',
            content: nextLayer,
            timestamp: now,
            type: 'narrative',
          };
          return [...prev.slice(0, sourcePlayerIdx), replayPlayerMsg, replayLayerMsg];
        }
      }
      return prev.map(msg => (msg.id === targetLayerId ? { ...msg, content: nextLayer, timestamp: now } : msg));
    });
    setFocusedLayerId(targetLayerId);
  };

  const rerollActiveLayer = (targetLayerId?: string) => {
    const targetLayer = targetLayerId
      ? layerMessages.find(layer => layer.id === targetLayerId) || activeLayerMessage
      : activeLayerMessage;
    if (!targetLayer) return;
    const layerIdx = messages.findIndex(msg => msg.id === targetLayer.id);
    if (layerIdx < 0) return;
    const latestPlayerMessage =
      [...messages]
        .slice(0, layerIdx)
        .reverse()
        .find(msg => msg.sender === 'Player');
    const latestPlayerInput = latestPlayerMessage?.content || '';
    void rerollLayerWithApi(targetLayer.id, latestPlayerInput, latestPlayerMessage?.id);
  };

  const rerollByMessage = (messageId: string, sender: 'Player' | 'System') => {
    if (sender === 'System') {
      rerollActiveLayer(messageId);
      return;
    }
    const playerIdx = messages.findIndex(msg => msg.id === messageId && msg.sender === 'Player');
    if (playerIdx < 0) return;
    const playerInput = messages[playerIdx]?.content || '';
    const targetLayer = messages.slice(playerIdx + 1).find(msg => msg.sender === 'System' && hasPseudoLayer(msg.content));
    if (!targetLayer) {
      return;
    }
    void rerollLayerWithApi(targetLayer.id, playerInput, messageId);
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

  const saveEditActiveLayer = async () => {
    if (!activeLayerMessage) return;
    const nextContent = replaceMaintext(activeLayerMessage.content, editMaintextDraft);
    if (typeof activeLayerMessage.chatMessageId === 'number') {
      try {
        const replaced = await replaceTavernChatMessage(activeLayerMessage.chatMessageId, nextContent);
        if (replaced) {
          syncMessagesFromTavern();
          setIsEditLayerOpen(false);
          return;
        }
      } catch (error) {
        console.warn('保存正文到酒馆失败，回退为前端本地状态:', error);
      }
    }
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

  const saveEditPlayerMessage = async () => {
    if (!editPlayerMessageId) return;
    const trimmed = editPlayerMessageDraft.trim();
    if (!trimmed) return;
    const target = messages.find(msg => msg.id === editPlayerMessageId);
    if (typeof target?.chatMessageId === 'number') {
      try {
        const replaced = await replaceTavernChatMessage(target.chatMessageId, trimmed);
        if (replaced) {
          syncMessagesFromTavern();
          setIsEditPlayerMessageOpen(false);
          setEditPlayerMessageId(null);
          return;
        }
      } catch (error) {
        console.warn('保存玩家输入到酒馆失败，回退为前端本地状态:', error);
      }
    }
    setMessages(prev => prev.map(msg => (msg.id === editPlayerMessageId ? { ...msg, content: trimmed } : msg)));
    setIsEditPlayerMessageOpen(false);
    setEditPlayerMessageId(null);
  };

  const rollbackToLayer = async (layerId: string) => {
    const currentIndex = messages.findIndex(msg => msg.id === layerId);
    if (currentIndex < 0) return;

    const trailingIds = messages
      .slice(currentIndex + 1)
      .map(msg => msg.chatMessageId)
      .filter((messageId): messageId is number => Number.isFinite(messageId));

    if (trailingIds.length > 0) {
      try {
        const deleted = await deleteTavernChatMessageIds(trailingIds);
        if (deleted) {
          syncMessagesFromTavern();
          setFocusedLayerId(layerId);
          return;
        }
      } catch (error) {
        console.warn('删除酒馆后续楼层失败，回退为前端本地状态:', error);
      }
    }

    setMessages(prev => {
      const idx = prev.findIndex(msg => msg.id === layerId);
      if (idx < 0) return prev;
      return prev.slice(0, idx + 1);
    });
    setFocusedLayerId(layerId);
  };

  const deleteLayerById = async (layerId: string) => {
    const target = messages.find(msg => msg.id === layerId);
    if (typeof target?.chatMessageId === 'number') {
      try {
        const deleted = await deleteTavernChatMessageIds([target.chatMessageId]);
        if (deleted) {
          syncMessagesFromTavern();
          return;
        }
      } catch (error) {
        console.warn('删除酒馆楼层失败，回退为前端本地状态:', error);
      }
    }

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
    const rawInput = inputText.trim();
    if (isApiSending) return;

    if (rawInput === '/reroll' || rawInput === '/重掷') {
      rerollActiveLayer();
      setInputText('');
      return;
    }

    if (rawInput === '/clearsave' || rawInput === '/清档') {
      try {
        window.localStorage.removeItem(archiveStorageKey);
        window.localStorage.removeItem(lastArchiveStorageKey);
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

    const hasTimelineContext = messages.some(
      msg => msg.sender === 'Player' || (msg.sender === 'System' && hasPseudoLayer(msg.content || '')),
    );
    if (!rawInput && !hasTimelineContext) return;

    setInputText('');
    await processCommand(rawInput, {
      requestInput: rawInput,
      appendPlayerMessage: rawInput.length > 0,
    });
  };

  const handleStopGenerating = () => {
    const controller = apiAbortControllerRef.current;
    if (controller && !controller.signal.aborted) {
      controller.abort();
    }
    const stopTavernGenerate = resolveTavernStopGenerating();
    if (typeof stopTavernGenerate === 'function') {
      try {
        stopTavernGenerate();
      } catch {
        // ignore stop errors from host env
      }
    }
  };


  const handleSetupComplete = async (config: GameConfig) => {
    const nextPlayerName = config.name.trim() || LN_DEFAULT_PLAYER_NAME;
    const nextProtocol = config.neuralProtocol || (config.installBetaChip ? 'beta' : 'none');
    const initialResidenceBinding =
      nextProtocol === 'beta' && isAirelaResidenceZone(config.startingLocation)
        ? resolveAirelaFacilityBinding({
            districtHint: config.startingLocation,
            citizenId: config.citizenId,
          })
        : null;
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
    await resetCurrentLnRun();

    setPlayerName(nextPlayerName);
    setPlayerStats(newStats);
    setPlayerGender(config.gender);
    setPlayerNeuralProtocol(nextProtocol);
    setPlayerSkills([]);
    setNpcs([]);
    setContactGroups([]);
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
    const runtimeChipPool = config.availableChipPool?.length
      ? cloneChipList(config.availableChipPool)
      : cloneChipList(buildDefaultSetupPack().availableChips);
    setStorageChips(runtimeChipPool.filter(chip => !equippedChipIds.has(chip.id)));
    setPlayerInventory([...config.selectedItems]);
    setPlayerLingshu(config.selectedLingshu || []);
    setPlayerResidence(
      normalizeResidenceState(
        nextProtocol === 'beta'
          ? {
              currentResidenceId: initialResidenceBinding?.residenceId || '',
              currentResidenceLabel: initialResidenceBinding?.residenceLabel || '',
              unlockedResidenceIds: initialResidenceBinding?.residenceId ? [initialResidenceBinding.residenceId] : [],
            }
          : EMPTY_RESIDENCE_STATE,
      ),
    );
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
    setPendingUpgradeEvaluation(false);
    setIsTaxOfficerPickerOpen(false);
    setBetaStatus({
      citizenId: config.citizenId,
      creditScore: nextProtocol === 'beta' ? 65 : 60,
      deductionHistory: [],
      warnings: [],
      taxDeadline: '',
      taxAmount: 0,
      taxArrears: 0,
      betaLevel: 1,
      betaTierName: getBetaTierTitle(1),
      taxOfficerUnlocked: nextProtocol === 'beta',
      assignedDistrict: '',
      assignedXStationId: '',
      assignedXStationLabel: '',
      assignedHXDormId: '',
      assignedHXDormLabel: '',
      taxOfficerBoundId: null,
      taxOfficerName: '',
      taxOfficeAddress: '',
    });
    setMonthlySettlementLog([]);
    setSettlementCheckpointMonth(getMonthKeyFromElapsedMinutes(0));
    setFinanceLedger([]);
    setStateLock({
      lockTime: false,
      lockLocation: false,
      lockIdentity: false,
    });
    lastNearbySyncSignatureRef.current = '';

    if (config.gender === 'male' && config.hasRedString) {
      setPlayerSkills([
        {
          id: 'ps_special_1',
          name: '灵弦：【本命】皇权回响',
          level: 5,
          description: '领袖级特质，转化效率锁定为 300%。',
          rankColor: 'red',
        },
      ]);
    }

    const openingContent = buildPseudoLayerFromParts({
      maintext: [
        `身份校验完成，${nextPlayerName} 的神经连接已建立。`,
        `${config.startingLocation} 的边缘光带刚刚亮起，${config.factionName} 的档案已经绑定到当前会话。`,
        nextProtocol === 'beta'
          ? 'Beta 协议处于在线状态，后续正文将继续沿当前楼层推进。'
          : '当前会话运行标准协议，后续正文将继续沿当前楼层推进。',
        '从这一层开始，前端只展示当前楼层正文；历史内容则通过每层小总结回溯。',
      ].join('\n\n'),
      sum: `地点:${config.startingLocation} | 时间:${formatGameTime(0)} | 状态:开局建立`,
    });

    const openingMsg: Message = {
      id: `layer_init_${Date.now()}`,
      sender: 'System',
      content: openingContent,
      timestamp: new Date().toLocaleTimeString('zh-CN'),
      type: 'narrative',
    };

    let wroteOpeningToTavern = false;
    try {
      wroteOpeningToTavern = await appendTavernChatMessage('assistant', openingContent);
    } catch (error) {
      console.warn('写入开局正文到酒馆失败，回退为前端本地状态:', error);
    }

    if (wroteOpeningToTavern) {
      syncMessagesFromTavern();
      setFocusedLayerId(null);
    } else {
      setMessages([openingMsg]);
      setFocusedLayerId(openingMsg.id);
    }

    setSelectedNPC(null);
    setIsLayerPickerOpen(false);
    setGameStage('game');
  };

  const completeBetaTaskReward = (taskId: string) => {
    const task = betaTasks.find(t => t.id === taskId);
    if (!task || task.done) return;

    setBetaTasks(prev => prev.map(t => (t.id === taskId ? { ...t, done: true } : t)));
    setPlayerStats(prev => ({ ...prev, credits: prev.credits + task.creditReward }));
    pushFinanceLedgerEntry({
      kind: 'task',
      title: 'Beta 任务奖励',
      detail: `完成任务「${task.title}」获得 ${task.creditReward} 灵能币。`,
      amount: task.creditReward,
    });
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
    pushFinanceLedgerEntry({
      kind: 'penalty',
      title: 'Beta 任务罚没',
      detail: `${reason}，扣除 ${task.creditReward} 灵能币。`,
      amount: -task.creditReward,
    });
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
    playerName,
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
    monthlySettlementLog,
    settlementCheckpointMonth,
    financeLedger,
    playerResidence,
    stateLock,
  ]);

  const handleContinueGame = () => {
    const lastId = window.localStorage.getItem(lastArchiveStorageKey) || selectedArchiveId;
    const target = archiveSlots.find(slot => slot.id === lastId) || archiveSlots[0];
    if (target) {
      loadArchiveById(target.id);
      return;
    }

    if (hasExistingPseudoProgress) {
      syncMessagesFromTavern();
      setGameStage('game');
      return;
    }

    setGameStage('setup');
  };

  const handleNewGame = () => {
    setSelectedNPC(null);
    setFocusedLayerId(null);
    setLayerMenu(null);
    setIsLayerPickerOpen(false);
    setMessages([]);
    setInputText('');
    setSelectedArchiveId('');
    setArchiveNameInput('');
    setMonthlySettlementLog([]);
    setSettlementCheckpointMonth(null);
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

  const handleSwitchResidence = (residenceId: string): { ok: boolean; message?: string } => {
    const target = residenceProfiles.find(profile => profile.id === residenceId);
    if (!target) {
      return { ok: false, message: '未找到目标住处。' };
    }
    if (target.id === playerResidence.currentResidenceId) {
      return { ok: false, message: '当前已经登记在该住处。' };
    }
    const alreadyUnlocked = playerResidence.unlockedResidenceIds.includes(target.id);
    if (!alreadyUnlocked && target.switchCost > playerStats.credits) {
      return { ok: false, message: `余额不足，当前登记需要 ¥${target.switchCost.toLocaleString()}。` };
    }

    if (!alreadyUnlocked && target.switchCost > 0) {
      setPlayerStats(prev => ({
        ...prev,
        credits: Math.max(0, prev.credits - target.switchCost),
      }));
      pushFinanceLedgerEntry({
        kind: 'system',
        title: '住处登记',
        detail: `已登记住处「${target.label}」。`,
        amount: -target.switchCost,
      });
      spawnFloatingText(`-¥${target.switchCost.toLocaleString()}`, 'text-cyan-300');
    }

    setPlayerResidence(prev =>
      normalizeResidenceState({
        currentResidenceId: target.id,
        currentResidenceLabel: target.label,
        unlockedResidenceIds: [...prev.unlockedResidenceIds, target.id],
      }),
    );
    setMessages(prev => [
      ...prev,
      {
        id: `residence_switch_${Date.now()}`,
        sender: 'System',
        content: alreadyUnlocked
          ? `住册已切换至「${target.label}」，后续月结与休整将以此为当前住处。`
          : `已完成住处登记：「${target.label}」。住处已写入住册，并接入后续月结。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
    return { ok: true, message: `当前住处已切换为「${target.label}」。` };
  };

  const handleRestAtResidence = (): { ok: boolean; message?: string } => {
    const target = currentResidenceProfile;
    if (!target) {
      return { ok: false, message: '当前还没有稳定住处。' };
    }

    let recoveredHp = 0;
    let recoveredMp = 0;
    let recoveredSanity = 0;
    setPlayerStats(prev => {
      const nextHp = Math.min(prev.hp.max, prev.hp.current + target.hpRestore);
      const nextMp = Math.min(prev.mp.max, prev.mp.current + target.mpRestore);
      const nextSanity = Math.min(prev.sanity.max, prev.sanity.current + target.sanityRestore);
      recoveredHp = Math.max(0, nextHp - prev.hp.current);
      recoveredMp = Math.max(0, nextMp - prev.mp.current);
      recoveredSanity = Math.max(0, nextSanity - prev.sanity.current);
      return {
        ...prev,
        hp: { ...prev.hp, current: nextHp },
        mp: { ...prev.mp, current: nextMp },
        sanity: { ...prev.sanity, current: nextSanity },
      };
    });

    const nextElapsedMinutes = (mapRuntime.elapsedMinutes || 0) + target.restMinutes;
    const nextGameTimeText = formatGameTime(nextElapsedMinutes);
    const nextGameDayPhase = getDayPhase(nextElapsedMinutes);
    setMapRuntime(prev => ({
      ...prev,
      elapsedMinutes: nextElapsedMinutes,
      logs: [...(prev.logs || []), `住所休整 ${target.label} -> ${nextGameTimeText}(${nextGameDayPhase})`].slice(-30),
    }));
    setMessages(prev => [
      ...prev,
      {
        id: `residence_rest_${Date.now()}`,
        sender: 'System',
        content: `已在「${target.label}」完成休整。HP +${recoveredHp} / MP +${recoveredMp} / SAN +${recoveredSanity}。当前时段推进至 ${nextGameTimeText}。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
    spawnFloatingText(`HP+${recoveredHp} MP+${recoveredMp}`, 'text-emerald-300');
    return { ok: true, message: `已在「${target.label}」完成休整。` };
  };

  const handleRunMonthlySettlement = () => {
    if (!monthlySettlementPreview.canSettle) return;

    const processedAt = new Date().toLocaleString('zh-CN');
    const shortfall = Math.max(0, -(playerStats.credits + monthlySettlementPreview.netDelta));
    const actualCreditDelta = monthlySettlementPreview.netDelta + shortfall;
    const record: MonthlySettlementRecord = {
      id: `monthly_settlement_${Date.now()}`,
      cycleLabel: monthlySettlementPreview.cycleLabel,
      monthCount: monthlySettlementPreview.pendingMonths,
      checkpointMonthKey: settlementCheckpointMonth || currentMonthKey,
      processedMonthKey: currentMonthKey,
      baseAllowance: monthlySettlementPreview.baseAllowance,
      currentTaxDue: monthlySettlementPreview.currentTaxDue,
      arrearsDue: monthlySettlementPreview.arrearsDue,
      taxDue: monthlySettlementPreview.taxDue,
      maintenanceCost: monthlySettlementPreview.maintenanceCost,
      penaltyCost: monthlySettlementPreview.penaltyCost,
      netDelta: monthlySettlementPreview.netDelta,
      status: shortfall > 0 ? 'arrears' : 'processed',
      processedAt,
      notes: shortfall > 0 ? [...monthlySettlementPreview.notes, `本次仍有 ¥${shortfall.toLocaleString()} 未能完成缴付。`] : monthlySettlementPreview.notes,
    };

    setPlayerStats(prev => ({
      ...prev,
      credits: Math.max(0, prev.credits + monthlySettlementPreview.netDelta),
    }));
    setSettlementCheckpointMonth(currentMonthKey);
    setMonthlySettlementLog(prev => [record, ...prev].slice(0, 18));
    setBetaStatus(prev => {
      const filteredWarnings = (prev.warnings || []).filter(warning => !warning.startsWith('月结欠缴情形'));
      const nextWarnings =
        shortfall > 0 ? [`月结欠缴情形 · 缺口 ¥${shortfall.toLocaleString()}`, ...filteredWarnings].slice(0, 8) : filteredWarnings;
      const nextScore = Math.max(0, Math.min(120, prev.creditScore + (shortfall > 0 ? -Math.max(8, monthlySettlementPreview.pendingMonths * 6) : Math.min(3, monthlySettlementPreview.pendingMonths))));
      return {
        ...prev,
        creditScore: nextScore,
        taxArrears: shortfall,
        warnings: nextWarnings,
        taxDeadline: getMonthDeadlineText(addMonthsToMonthKey(currentMonthKey, 1)),
        deductionHistory: [
          ...(prev.deductionHistory || []),
          {
            id: `monthly_log_${Date.now()}`,
            reason: shortfall > 0 ? `月结欠缴情形 (${monthlySettlementPreview.cycleLabel})` : `月结完成 (${monthlySettlementPreview.cycleLabel})`,
            amount: monthlySettlementPreview.netDelta,
            timestamp: processedAt,
            type: shortfall > 0 ? 'shame' : 'fine',
          },
        ].slice(-30),
      };
    });
    setPlayerCoreAffixes(prev => {
      const next = prev.filter(affix => affix.id !== 'monthly_arrears_affix');
      if (shortfall <= 0) return next;
      return [
        ...next,
        {
          id: 'monthly_arrears_affix',
          name: '状态：月结欠缴',
          description: `存在 ¥${shortfall.toLocaleString()} 未结清税务与维持成本。`,
          type: 'debuff',
          source: '月结',
        },
      ];
    });
    pushFinanceLedgerEntry({
      kind: 'settlement',
      title: shortfall > 0 ? '月结完成，转入欠缴' : '月结完成',
      detail:
        shortfall > 0
          ? `${monthlySettlementPreview.cycleLabel} 仍有 ¥${shortfall.toLocaleString()} 未结清，已转入累计欠缴情形。`
          : `${monthlySettlementPreview.cycleLabel} 已完成结算。`,
      amount: actualCreditDelta,
    });
    spawnFloatingText(
      `${actualCreditDelta >= 0 ? '+' : '-'}¥${Math.abs(actualCreditDelta).toLocaleString()}`,
      actualCreditDelta >= 0 ? 'text-emerald-300' : 'text-red-300',
    );
  };

  const handlePayTaxArrears = () => {
    const currentArrears = Math.max(0, betaStatus.taxArrears || 0);
    if (currentArrears <= 0 || playerStats.credits <= 0) return;

    const paidAmount = Math.min(playerStats.credits, currentArrears);
    const remainingArrears = Math.max(0, currentArrears - paidAmount);
    const processedAt = new Date().toLocaleString('zh-CN');

    setPlayerStats(prev => ({
      ...prev,
      credits: Math.max(0, prev.credits - paidAmount),
    }));
    setBetaStatus(prev => {
      const filteredWarnings = (prev.warnings || []).filter(warning => !warning.startsWith('月结欠缴情形'));
      const nextWarnings =
        remainingArrears > 0
          ? [`月结欠缴情形 · 缺口 ¥${remainingArrears.toLocaleString()}`, ...filteredWarnings].slice(0, 8)
          : filteredWarnings;
      const nextScore = remainingArrears > 0 ? prev.creditScore : Math.min(120, prev.creditScore + 4);
      return {
        ...prev,
        creditScore: nextScore,
        taxArrears: remainingArrears,
        warnings: nextWarnings,
        deductionHistory: [
          {
            id: `tax_arrears_payment_${Date.now()}`,
            reason: remainingArrears > 0 ? '补缴情税款（部分）' : '补缴情税款（结清）',
            amount: -paidAmount,
            timestamp: processedAt,
            type: 'fine',
          },
          ...(prev.deductionHistory || []),
        ].slice(0, 30),
      };
    });
    setPlayerCoreAffixes(prev => {
      const next = prev.filter(affix => affix.id !== 'monthly_arrears_affix');
      if (remainingArrears <= 0) return next;
      return [
        ...next,
        {
          id: 'monthly_arrears_affix',
          name: '状态：月结欠缴',
          description: `仍有 ¥${remainingArrears.toLocaleString()} 未结清税务与维持成本。`,
          type: 'debuff',
          source: '月结',
        },
      ];
    });
    pushFinanceLedgerEntry({
      kind: 'tax',
      title: remainingArrears > 0 ? '补缴情税款（部分）' : '补缴情税款',
      detail:
        remainingArrears > 0
          ? `已补缴 ¥${paidAmount.toLocaleString()}，剩余欠缴情形 ¥${remainingArrears.toLocaleString()}。`
          : `已结清累计欠缴情形 ¥${paidAmount.toLocaleString()}。`,
      amount: -paidAmount,
    });
    setMessages(prev => [
      ...prev,
      {
        id: `tax_arrears_notice_${Date.now()}`,
        sender: 'System',
        content:
          remainingArrears > 0
            ? `已向税务系统补缴 ${paidAmount} 灵币，剩余欠缴情形 ${remainingArrears} 灵币。`
            : `已向税务系统结清累计欠缴情形 ${paidAmount} 灵币。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        type: 'narrative',
      },
    ]);
    spawnFloatingText(`-¥${paidAmount.toLocaleString()}`, 'text-amber-300');
  };

  const bindTaxOfficer = (candidate: TaxOfficerCandidate) => {
    const binding = resolveAirelaFacilityBinding({
      districtHint: candidate.location || betaStatus.assignedDistrict || '',
      citizenId: betaStatus.citizenId || '',
    });
    setBetaStatus(prev => ({
      ...prev,
      taxOfficerUnlocked: true,
      assignedDistrict: binding?.districtName || prev.assignedDistrict || '',
      assignedXStationId: binding?.xStationId || prev.assignedXStationId || '',
      assignedXStationLabel: binding?.xStationLabel || prev.assignedXStationLabel || '',
      assignedHXDormId: binding?.hxDormId || prev.assignedHXDormId || '',
      assignedHXDormLabel: binding?.hxDormLabel || prev.assignedHXDormLabel || '',
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
    const binding = buildAirelaFacilityBinding(district);
    const officerId = `airela_tax_officer_${district.id}`;
    const boundAlready = !!betaStatus.taxOfficerBoundId && !!betaStatus.taxOfficerName;
    if (boundAlready && reason === 'activation') {
      setBetaStatus(prev => ({
        ...prev,
        taxOfficerUnlocked: true,
        assignedDistrict: binding?.districtName || prev.assignedDistrict || '',
        assignedXStationId: binding?.xStationId || prev.assignedXStationId || '',
        assignedXStationLabel: binding?.xStationLabel || prev.assignedXStationLabel || '',
        assignedHXDormId: binding?.hxDormId || prev.assignedHXDormId || '',
        assignedHXDormLabel: binding?.hxDormLabel || prev.assignedHXDormLabel || '',
      }));
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
      assignedDistrict: binding?.districtName || prev.assignedDistrict || '',
      assignedXStationId: binding?.xStationId || prev.assignedXStationId || '',
      assignedXStationLabel: binding?.xStationLabel || prev.assignedXStationLabel || '',
      assignedHXDormId: binding?.hxDormId || prev.assignedHXDormId || '',
      assignedHXDormLabel: binding?.hxDormLabel || prev.assignedHXDormLabel || '',
      taxOfficerBoundId: officerId,
      taxOfficerName: district.officerName,
      taxOfficeAddress: district.officeAddress,
    }));

    setMessages(prev => [
      ...prev,
      {
        id: `beta_tax_assign_${Date.now()}`,
        sender: 'System',
        content: `Beta协议已生效：已编入「${district.name}」，分配税务官「${district.officerName}」。`,
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
    const justActivated = prevProtocol !== 'beta' && currentProtocol === 'beta' && hasBetaChip;

    if (hasOfficialBetaControl) {
      if (justActivated || !betaStatus.taxOfficerBoundId) {
        forceAssignBetaTaxOfficer(justActivated ? 'activation' : 'fallback');
      } else if (!betaStatus.taxOfficerUnlocked) {
        const binding = resolveAirelaFacilityBinding({
          districtHint: betaStatus.assignedDistrict || betaStatus.taxOfficeAddress || '',
          citizenId: betaStatus.citizenId || '',
        });
        setBetaStatus(prev => ({
          ...prev,
          taxOfficerUnlocked: true,
          assignedDistrict: binding?.districtName || prev.assignedDistrict || '',
          assignedXStationId: binding?.xStationId || prev.assignedXStationId || '',
          assignedXStationLabel: binding?.xStationLabel || prev.assignedXStationLabel || '',
          assignedHXDormId: binding?.hxDormId || prev.assignedHXDormId || '',
          assignedHXDormLabel: binding?.hxDormLabel || prev.assignedHXDormLabel || '',
        }));
      }
    } else {
      setBetaStatus(prev => {
        const next = {
          ...prev,
          taxOfficerUnlocked: false,
          assignedDistrict: '',
          assignedXStationId: '',
          assignedXStationLabel: '',
          assignedHXDormId: '',
          assignedHXDormLabel: '',
          taxOfficerBoundId: null,
          taxOfficerName: '',
          taxOfficeAddress: '',
          taxAmount: 0,
          taxArrears: 0,
        };
        return JSON.stringify(next) === JSON.stringify(prev) ? prev : next;
      });
    }
    lastProtocolRef.current = currentProtocol;
  }, [gameStage, playerNeuralProtocol, hasBetaChip, hasOfficialBetaControl, betaStatus.taxOfficerBoundId, betaStatus.taxOfficerUnlocked, betaStatus.citizenId]);

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
    { id: 'economy', label: '铸币面板' },
    { id: 'lingshu', label: '灵枢' },
    { id: 'inventory', label: '物品栏' },
  ];
  const nextRankForCross = useMemo(() => {
    const lv = rankToLevel(playerStats.psionic.level);
    return lv >= 5 ? null : levelToRank(lv + 1);
  }, [playerStats.psionic.level]);
  const nextRankCoin = nextRankForCross ? coinVault[nextRankForCross] || 0 : 0;
  const apiRuntimeMode = resolveApiRuntimeMode(apiConfig);
  const apiRuntimeLabel = getApiRuntimeModeLabel(apiRuntimeMode);
  const normalizedApiEndpoint = resolveApiEndpoint(apiConfig.endpoint);
  const externalApiConfigError = apiRuntimeMode === 'external' ? validateExternalApiConfig(apiConfig) : null;
  const tavernGenerateReady = apiRuntimeMode === 'tavern' ? resolveTavernGenerateList().length > 0 : false;
  const apiRuntimeDetail =
    apiRuntimeMode === 'external'
      ? externalApiConfigError || `${normalizedApiEndpoint || '未配置 endpoint'} · ${apiConfig.model.trim() || '未填写 model'}`
      : apiRuntimeMode === 'tavern'
        ? (tavernGenerateReady ? '已检测到 generate / generateRaw' : '未检测到 generate / generateRaw')
        : '发送后仅使用伪0层模板，不请求任何接口';
  const setApiMode = (mode: ApiRuntimeMode) => {
    setApiConfig(prev => ({
      ...prev,
      useTavernApi: mode === 'tavern',
      enabled: mode === 'external',
    }));
  };

  const renderContent = () => {
    if (gameStage === 'start') return <StartScreen onStart={() => setGameStage('splash')} />;
    if (gameStage === 'splash') return <SplashScreen onNewGame={handleNewGame} onContinue={handleContinueGame} canContinue={hasExistingPseudoProgress || archiveSlots.length > 0} />;
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
          className={`border-r flex flex-col z-40 md:h-full transition-all duration-300 absolute md:relative h-full overflow-y-auto custom-scrollbar scrollbar-hidden ${currentLocationVisualTheme.asideClass} ${
            leftOpen
              ? 'w-full max-w-none md:w-80 md:max-w-none translate-x-0'
              : 'w-0 -translate-x-full md:translate-x-0 md:w-0 overflow-hidden border-none'
          }`}
        >
          <button onClick={() => setLeftOpen(false)} className="md:hidden absolute top-2 right-2 p-2 text-slate-500 z-50">
            <X className="w-5 h-5" />
          </button>

          <div
            className="flex-1 space-y-3 min-w-0 md:min-w-[320px] pb-4 px-4 pt-4"
            style={isMobileViewport ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' } : undefined}
          >
            <CyberPanel title="生理监测" className="mb-2" noPadding variant="gold">
              <PlayerStatePanel
                stats={effectivePlayerStats}
                hasBetaChip={hasBetaChip}
                onOpenSpiritCore={() => setIsSpiritCoreModalOpen(true)}
                gender={playerGender}
                statusTags={runtimeStatusTags}
                chipCount={chipCount}
                spiritStringCount={spiritStringCount}
              />
            </CyberPanel>

            <StatusPenaltyPanel
              affixes={mergedRuntimeAffixes}
              warnings={betaStatus.warnings || []}
              taxAmount={betaStatus.taxAmount}
              taxArrears={Math.max(0, betaStatus.taxArrears || 0)}
              neuralProtocol={playerNeuralProtocol}
              creditScore={betaStatus.creditScore}
              sceneHint={gameSceneHint}
            />

            <CyberPanel title="功能面板" className="mb-2" noPadding>
              <div className="p-3 bg-black/40 space-y-3">
                <div className="grid grid-cols-2 gap-2">
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
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('phone');
                    setRightOpen(true);
                    if (isMobileViewport) setLeftOpen(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-cyan-500/25 bg-cyan-950/15 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/25"
                >
                  <Smartphone className="w-4 h-4" />
                  打开手机
                </button>
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

            {leftModuleTab === 'economy' && (
              <PsionicEconomyPanel
                stats={effectivePlayerStats}
                currentLocation={currentNarrativeLocation || playerFaction.headquarters || '未知区域'}
                gender={playerGender}
                regionFactor={getExchangeRegionFactor(currentNarrativeLocation || playerFaction.headquarters || '', playerGender)}
                coinVault={coinVault}
                soulLedger={playerSoulLedger}
                nextRankCoin={nextRankCoin}
                onConvert={handleConversion}
                onCrossLevelConvert={handleCrossLevelExchange}
              />
            )}

            {leftModuleTab === 'lingshu' && (
              <div className="space-y-3">
                <LingshuStatusPanel parts={playerLingshu} />
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
              </div>
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

        <main className={`flex-1 min-w-0 flex flex-col relative z-0 h-full w-full ${currentLocationVisualTheme.mainClass}`}>
          <div className={`border-b px-4 py-3 shrink-0 backdrop-blur-sm ${currentLocationVisualTheme.headerClass}`}>
            <div className="flex items-center justify-between gap-3">
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
              <div className="flex flex-1 flex-wrap items-center gap-2 text-xs font-mono text-slate-400">
                <MapIcon className={`w-4 h-4 ${currentLocationVisualTheme.iconClass}`} />
                <span>区域：</span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-semibold ${currentLocationVisualTheme.locationPillClass}`}>
                  {currentNarrativeLocation || '未知区域'}
                </span>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] ${currentLocationVisualTheme.hintClass}`}>
                  {currentLocationVisualTheme.label}
                </span>
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
            <div className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold ${currentLocationVisualTheme.hintClass}`}>
              当前区域协议已切换到 {currentLocationVisualTheme.label}
            </div>
            <LocationControlHint
              headline={locationControlProfile.headline}
              exchangeText={locationControlProfile.exchangeText}
              hints={locationControlProfile.hints}
              riskTone={locationControlProfile.riskTone}
            />
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

          <div
            className="p-4 border-t border-white/5 bg-black/60 shrink-0 backdrop-blur-md"
            style={isMobileViewport ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' } : undefined}
          >
            <div className="flex gap-2">
              <span className="px-2 py-3 text-fuchsia-500 font-mono text-lg">{'>'}</span>
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !isApiSending && handleSend()}
                placeholder="输入推进内容或对白（留空可直接续写）..."
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
            <div className="mt-2 flex items-center justify-between gap-3 text-[11px]">
              <div className={`${apiRuntimeMode === 'disabled' ? 'text-slate-500' : apiRuntimeMode === 'external' ? 'text-cyan-300' : 'text-fuchsia-300'}`}>
                当前请求：{apiRuntimeLabel}
              </div>
              <div className={`truncate text-right ${apiRuntimeMode === 'external' && externalApiConfigError ? 'text-amber-300' : 'text-slate-500'}`}>
                {apiRuntimeDetail}
              </div>
            </div>
            {apiError && <div className="mt-2 text-[11px] text-red-400">{apiError}</div>}
          </div>
        </main>

        <aside
          onClick={e => e.stopPropagation()}
          className={`border-l flex flex-col z-40 h-full transition-all duration-300 absolute md:relative right-0 ${currentLocationVisualTheme.asideClass} ${
            rightOpen
              ? 'w-full max-w-none md:w-[450px] md:max-w-none translate-x-0'
              : 'w-0 translate-x-full md:w-0 overflow-hidden border-none'
          }`}
        >
          <div className="flex border-b border-white/10 min-w-0 overflow-x-auto md:min-w-[380px] md:overflow-visible">
            {[
              { id: 'contacts', icon: <Users className="w-4 h-4" />, label: '标记人物' },
              { id: 'phone', icon: <Smartphone className="w-4 h-4" />, label: '手机' },
              { id: 'system', icon: <ScrollText className="w-4 h-4" />, label: '档案' },
              { id: 'settings', icon: <Settings className="w-4 h-4" />, label: '设置' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as RightPanelTab)}
                className={`flex min-w-[78px] flex-1 flex-col items-center gap-1 py-3 text-xs font-bold uppercase transition-all md:min-w-0 ${
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

          <div
            className="flex-1 min-w-0 overflow-y-auto p-4 pr-4 ln-carbon custom-scrollbar scrollbar-hidden md:min-w-[380px] md:pr-6"
            style={isMobileViewport ? { paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' } : undefined}
          >
            {activeTab === 'contacts' && (
              <div className="space-y-6 h-full flex flex-col">
                <Suspense fallback={<LazyPanelFallback title="标记人物" detail="联系人与人物档案正在载入。" />}>
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
                    <NPCProfile
                      npc={selectedNPC}
                      onBack={() => setSelectedNPC(null)}
                    />
                  )}
                </Suspense>
              </div>
            )}
            {activeTab === 'phone' && (
              <Suspense fallback={<LazyPanelFallback title="手机" detail="灵网、暗网与钱包模块正在载入。" />}>
                <LingnetPhonePanel
                  npcs={npcs}
                  playerName={playerName}
                  playerCredits={playerStats.credits}
                  currentLocation={currentNarrativeLocation || '未知区域'}
                  financeLedger={financeLedger}
                  walletSummary={{
                    cycleLabel: monthlySettlementPreview.cycleLabel,
                    currentTaxDue: monthlySettlementPreview.currentTaxDue,
                    taxArrears: Math.max(0, betaStatus.taxArrears || 0),
                    settlementExposure:
                      monthlySettlementPreview.taxDue +
                      monthlySettlementPreview.maintenanceCost +
                      monthlySettlementPreview.penaltyCost,
                  }}
                  onToggleFollow={handleToggleSocialFollow}
                  onAddComment={handleAddSocialComment}
                  onSendDm={handleSendSocialDm}
                  onSpendOnNpc={handleSpendOnSocial}
                  onPurchaseDarknetService={handlePurchaseDarknetService}
                  onImportPost={handleImportSocialPost}
                />
              </Suspense>
            )}
            {activeTab === 'system' && (
              <Suspense fallback={<LazyPanelFallback title="档案" detail="月结、住所和税务档案正在载入。" />}>
                <div className="space-y-4">
                  <MonthlySettlementPanel preview={monthlySettlementPreview} records={monthlySettlementLog} onSettle={handleRunMonthlySettlement} />
                  <ResidencePanel
                    hasOfficialRegistry={hasOfficialBetaControl}
                    residence={playerResidence}
                    residenceOptions={residenceProfiles}
                    status={betaStatus}
                    currentLocation={currentNarrativeLocation || '未知区域'}
                    playerCredits={playerStats.credits}
                    onSwitchResidence={handleSwitchResidence}
                    onRestAtResidence={handleRestAtResidence}
                  />
                  <TaxDossierPanel
                    status={betaStatus}
                    playerName={playerName}
                    playerCredits={playerStats.credits}
                    factionName={playerFaction.name}
                    currentLocation={currentNarrativeLocation || '未知区域'}
                    neuralProtocol={playerNeuralProtocol}
                    onNavigateToTax={handleNavToTax}
                    onPickTaxOfficer={handleAddTaxOfficerContact}
                    onPayArrears={handlePayTaxArrears}
                    onOpenCareerIdentity={() => setIsCareerEditorOpen(true)}
                  />
                </div>
              </Suspense>
            )}
            {activeTab === 'settings' && (
              <div className="space-y-4">
                <CyberPanel title="对话接口" noPadding allowExpand collapsible>
                  <div className="p-3 bg-black/40 space-y-3">
                    <div className="text-xs text-slate-400">
                      这里决定 LN 对话时走哪条生成链路。外部接口模式不会再静默退回酒馆接口，配置错了会直接报错。
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { mode: 'tavern' as ApiRuntimeMode, label: '酒馆接口' },
                        { mode: 'external' as ApiRuntimeMode, label: '外部接口' },
                        { mode: 'disabled' as ApiRuntimeMode, label: '关闭生成' },
                      ].map(option => (
                        <button
                          key={option.mode}
                          type="button"
                          onClick={() => setApiMode(option.mode)}
                          className={`px-2 py-2 text-xs border transition-colors ${
                            apiRuntimeMode === option.mode
                              ? 'border-fuchsia-500 text-white bg-fuchsia-950/40'
                              : 'border-slate-700 text-slate-300 hover:text-white hover:border-fuchsia-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    <div className="rounded border border-slate-800 bg-black/30 px-3 py-2 space-y-1">
                      <div className="text-xs text-slate-300">当前模式：{apiRuntimeLabel}</div>
                      <div className={`text-[11px] ${
                        apiRuntimeMode === 'external' && externalApiConfigError
                          ? 'text-amber-300'
                          : apiRuntimeMode === 'tavern' && !tavernGenerateReady
                            ? 'text-amber-300'
                            : 'text-slate-500'
                      }`}
                      >
                        {apiRuntimeDetail}
                      </div>
                    </div>
                    {apiRuntimeMode === 'external' && (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={apiConfig.endpoint}
                          onChange={e => setApiConfig(prev => ({ ...prev, endpoint: e.target.value }))}
                          placeholder="endpoint，例如 https://api.openai.com/v1 或完整 /chat/completions /responses 地址"
                          className="w-full bg-black/50 border border-slate-700 px-2 py-2 text-xs text-white"
                        />
                        <input
                          type="text"
                          value={apiConfig.model}
                          onChange={e => setApiConfig(prev => ({ ...prev, model: e.target.value }))}
                          placeholder="model，例如 gpt-4o-mini"
                          className="w-full bg-black/50 border border-slate-700 px-2 py-2 text-xs text-white"
                        />
                        <input
                          type="password"
                          value={apiConfig.apiKey}
                          onChange={e => setApiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                          placeholder="API Key（可选，走代理时可留空）"
                          className="w-full bg-black/50 border border-slate-700 px-2 py-2 text-xs text-white"
                        />
                        <div className="flex items-center justify-between gap-3 text-[11px]">
                          <div className="text-slate-500 break-all">
                            实际请求地址：{normalizedApiEndpoint || '未生成'}
                          </div>
                          <button
                            type="button"
                            onClick={() => setApiConfig(prev => ({ ...prev, endpoint: '', apiKey: '', model: 'gpt-4o-mini' }))}
                            className="shrink-0 border border-slate-700 px-2 py-1 text-slate-300 hover:text-white hover:border-fuchsia-700"
                          >
                            清空外部配置
                          </button>
                        </div>
                      </div>
                    )}
                    {apiRuntimeMode === 'tavern' && !tavernGenerateReady && (
                      <div className="text-[11px] text-amber-300">
                        当前未检测到酒馆的 generate / generateRaw。发送时会直接报错，请检查酒馆助手实时监听或宿主注入状态。
                      </div>
                    )}
                  </div>
                </CyberPanel>

                <CyberPanel title="本地快照（可选）" noPadding allowExpand collapsible>
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

                <div className="text-[11px] text-slate-500 px-1">
                  当前档案：{selectedArchiveId ? archiveSlots.find(slot => slot.id === selectedArchiveId)?.name || '未命名' : '未选择'}
                </div>

                <CyberPanel title="显示" noPadding allowExpand collapsible>
                  <div className="p-3 bg-black/40">
                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="w-full border border-fuchsia-700 text-fuchsia-300 hover:text-white hover:border-fuchsia-500 px-2 py-2 text-xs flex items-center justify-center gap-2"
                    >
                      {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
                      {isFullscreen ? '退出全屏' : '进入全屏'}
                    </button>
                  </div>
                </CyberPanel>
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
