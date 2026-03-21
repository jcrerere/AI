import {
  CityAnchorKind,
  CityAnchorRecord,
  CityCellRecord,
  CityRuntimeData,
  CityTenantRecord,
  DistrictGridProfile,
  RuntimeShopRecord,
  RuntimeShopTier,
  RuntimeShopType,
  TransportAssetStatus,
  TransportLayerMode,
  TransportLineRecord,
  TransportProjectRecord,
  TransportStopRecord,
} from '../types';
import { resolveLocationJurisdiction } from './locationJurisdiction';

type ShopArchetype = 'fashion' | 'cybertech' | 'pharmacy' | 'luxury' | 'general' | 'restaurant';

type StopPreset = {
  id: string;
  districtId: string;
  label: string;
  x: number;
  y: number;
  lineIds: string[];
};

type DistrictProfileInternal = DistrictGridProfile & {
  match: RegExp;
};

const pad = (value: number, width: number): string => String(Math.max(0, value)).padStart(width, '0');

const hashText = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const normalizeKey = (value: string): string =>
  `${value || ''}`
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·:：\-—_()（）'"“”‘’、，。,.!?！？]/g, '');

const toArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const CITY_DISTRICT_PROFILES: DistrictProfileInternal[] = [
  {
    id: 'airela_north_gate',
    regionKey: 'aerila',
    regionLabel: '艾瑞拉区',
    districtLabel: '北门分区',
    regionCode: 11,
    districtCode: 11,
    width: 14,
    height: 14,
    transportModes: ['metro', 'expressway', 'bridge'],
    notes: '首都入城与关务口岸。',
    match: /(艾瑞拉区.*北门|北门分区|赫卡关城|北门换乘站)/,
  },
  {
    id: 'airela_central_ring',
    regionKey: 'aerila',
    regionLabel: '艾瑞拉区',
    districtLabel: '中环分区',
    regionCode: 11,
    districtCode: 12,
    width: 16,
    height: 16,
    transportModes: ['metro', 'expressway', 'bridge'],
    notes: '首都礼制与官僚中枢。',
    match: /(艾瑞拉区.*中环|中环分区|玫印住册总厅|帝绶礼宾馆|镜徽样板馆|瑰徽观礼台|皇徽授册廊|璧章甄序院|绶纹配驻署|玉诰觐见阶|朱玺通行署)/,
  },
  {
    id: 'airela_old_port',
    regionKey: 'aerila',
    regionLabel: '艾瑞拉区',
    districtLabel: '旧港分区',
    regionCode: 11,
    districtCode: 13,
    width: 12,
    height: 12,
    transportModes: ['expressway', 'bridge'],
    notes: '旧港仓储与旧礼制边缘地带。',
    match: /(艾瑞拉区.*旧港|旧港分区)/,
  },
  {
    id: 'airela_south_port',
    regionKey: 'aerila',
    regionLabel: '艾瑞拉区',
    districtLabel: '南港分区',
    regionCode: 11,
    districtCode: 14,
    width: 14,
    height: 14,
    transportModes: ['metro', 'expressway', 'bridge'],
    notes: '南港关务、港桥与货流节点。',
    match: /(艾瑞拉区.*南港|南港分区|南港关务站|观海桥|桥口结算站|西港一号码头)/,
  },
  {
    id: 'north_sin_square',
    regionKey: 'north',
    regionLabel: '诺丝区',
    districtLabel: '罪吻片区',
    regionCode: 21,
    districtCode: 11,
    width: 16,
    height: 16,
    transportModes: ['metro', 'expressway'],
    notes: '红灯、夜场与灰色消费核。',
    match: /(诺丝区.*罪吻|罪吻广场|红绡馆|瘾巷|绮债包厢环|剥光秀台|罪吻换乘厅)/,
  },
  {
    id: 'north_entertainment',
    regionKey: 'north',
    regionLabel: '诺丝区',
    districtLabel: '娱乐赛道片区',
    regionCode: 21,
    districtCode: 12,
    width: 16,
    height: 16,
    transportModes: ['metro', 'expressway'],
    notes: '秀场、赛道与高风险娱乐地带。',
    match: /(诺丝区.*综合娱乐区|综合娱乐区|裂帛赛道|浮霓会展塔|灵械斗技穹笼|黑赛下注点)/,
  },
  {
    id: 'north_university',
    regionKey: 'north',
    regionLabel: '诺丝区',
    districtLabel: '大学产研片区',
    regionCode: 21,
    districtCode: 13,
    width: 16,
    height: 16,
    transportModes: ['metro', 'expressway'],
    notes: '大学、孵化、样机和路演接口。',
    match: /(诺丝区.*诺丝大学|诺丝大学|天演路演港|灵构试装城|群星孵化塔|脉冲评测港|阈光样机市)/,
  },
  {
    id: 'north_capital',
    regionKey: 'north',
    regionLabel: '诺丝区',
    districtLabel: '资本仲裁片区',
    regionCode: 21,
    districtCode: 14,
    width: 16,
    height: 16,
    transportModes: ['expressway'],
    notes: '资本竞价、签约与清算中枢。',
    match: /(诺丝区.*联席|黑玫瑰暗层联席网|曜金竞价庭|云冠清算厅|棱幕艺术馆|灰幕仲裁塔|霓链签约厅)/,
  },
  {
    id: 'xiyu_white_bay',
    regionKey: 'xiyu',
    regionLabel: '汐屿区',
    districtLabel: '白湾片区',
    regionCode: 31,
    districtCode: 11,
    width: 12,
    height: 12,
    transportModes: ['metro', 'bridge', 'ferry'],
    notes: '港区、湾岸与旅居消费带。',
    match: /(汐屿区.*白湾|白湾会馆|白湾口岸站|巡礼驿站)/,
  },
  {
    id: 'xiyu_tidemirror',
    regionKey: 'xiyu',
    regionLabel: '汐屿区',
    districtLabel: '潮镜片区',
    regionCode: 31,
    districtCode: 12,
    width: 12,
    height: 12,
    transportModes: ['metro', 'bridge', 'ferry'],
    notes: '潮镜地产与滨水宅邸带。',
    match: /(汐屿区.*潮镜|潮镜别墅|潮镜别墅站)/,
  },
  {
    id: 'holy_cathedral',
    regionKey: 'holy',
    regionLabel: '圣教区',
    districtLabel: '圣堂片区',
    regionCode: 41,
    districtCode: 11,
    width: 12,
    height: 12,
    transportModes: ['bridge', 'expressway'],
    notes: '圣堂、骑士团与教化核心。',
    match: /(圣教区|大圣堂|修道院|教化所|圣殿骑士团驻地|粮誓仓廊|圣痕浴场|风誓原场)/,
  },
  {
    id: 'qiling_core',
    regionKey: 'qiling',
    regionLabel: '栖灵区',
    districtLabel: '栖灵核心区',
    regionCode: 51,
    districtCode: 11,
    width: 12,
    height: 12,
    transportModes: ['bridge', 'expressway'],
    notes: '默认保留的栖灵数字图区。',
    match: /(栖灵区|栖灵)/,
  },
  {
    id: 'borderland_dogtown',
    regionKey: 'borderland',
    regionLabel: '交界地',
    districtLabel: '狗镇片区',
    regionCode: 61,
    districtCode: 11,
    width: 14,
    height: 14,
    transportModes: ['bridge', 'expressway'],
    notes: '边境狗镇与冒险者节点。',
    match: /(交界地|狗镇|冒险者公会|跨区关卡桥梁网络)/,
  },
  {
    id: 'cuiling_core',
    regionKey: 'cuiling',
    regionLabel: '淬灵区',
    districtLabel: '淬灵工业区',
    regionCode: 71,
    districtCode: 11,
    width: 12,
    height: 12,
    transportModes: ['expressway', 'bridge'],
    notes: '工业重区，默认不开放地铁。',
    match: /(淬灵区|淬灵)/,
  },
];

const STOP_PRESETS: StopPreset[] = [
  { id: 'stop_aerila_north_gate_exchange', districtId: 'airela_north_gate', label: '艾瑞拉区·北门换乘站', x: 3, y: 10, lineIds: ['line_aerila_crown_1'] },
  { id: 'stop_aerila_central_ritual', districtId: 'airela_central_ring', label: '艾瑞拉区·中环礼序站', x: 8, y: 8, lineIds: ['line_aerila_crown_1', 'line_aerila_admin_2'] },
  { id: 'stop_aerila_south_customs', districtId: 'airela_south_port', label: '艾瑞拉区·南港关务站', x: 11, y: 6, lineIds: ['line_aerila_crown_1'] },
  { id: 'stop_north_university', districtId: 'north_university', label: '诺丝区·诺丝大学站', x: 5, y: 11, lineIds: ['line_north_flux_1'] },
  { id: 'stop_north_show', districtId: 'north_entertainment', label: '诺丝区·会展赛道站', x: 9, y: 7, lineIds: ['line_north_flux_1'] },
  { id: 'stop_north_sin', districtId: 'north_sin_square', label: '诺丝区·罪吻广场站', x: 12, y: 5, lineIds: ['line_north_flux_1'] },
  { id: 'stop_xiyu_white_bay', districtId: 'xiyu_white_bay', label: '汐屿区·白湾口岸站', x: 4, y: 9, lineIds: ['line_xiyu_tide_1'] },
  { id: 'stop_xiyu_tidemirror', districtId: 'xiyu_tidemirror', label: '汐屿区·潮镜别墅站', x: 9, y: 4, lineIds: ['line_xiyu_tide_1'] },
];

const LINE_PRESETS: Array<Omit<TransportLineRecord, 'stopIds'> & { stopIds: string[] }> = [
  {
    id: 'line_aerila_crown_1',
    mode: 'metro',
    label: '皇港一号线',
    regionKey: 'aerila',
    districtIds: ['airela_north_gate', 'airela_central_ring', 'airela_south_port'],
    stopIds: ['stop_aerila_north_gate_exchange', 'stop_aerila_central_ritual', 'stop_aerila_south_customs'],
    status: 'active',
    summary: '艾瑞拉区内部的主干地铁线。',
  },
  {
    id: 'line_aerila_admin_2',
    mode: 'metro',
    label: '礼政二号线',
    regionKey: 'aerila',
    districtIds: ['airela_north_gate', 'airela_central_ring'],
    stopIds: ['stop_aerila_north_gate_exchange', 'stop_aerila_central_ritual'],
    status: 'active',
    summary: '艾瑞拉区内的短轴行政线。',
  },
  {
    id: 'line_north_flux_1',
    mode: 'metro',
    label: '霓流一号线',
    regionKey: 'north',
    districtIds: ['north_university', 'north_entertainment', 'north_sin_square'],
    stopIds: ['stop_north_university', 'stop_north_show', 'stop_north_sin'],
    status: 'active',
    summary: '诺丝区内部的市场通勤线，不与外区直连。',
  },
  {
    id: 'line_xiyu_tide_1',
    mode: 'metro',
    label: '潮湾一号线',
    regionKey: 'xiyu',
    districtIds: ['xiyu_white_bay', 'xiyu_tidemirror'],
    stopIds: ['stop_xiyu_white_bay', 'stop_xiyu_tidemirror'],
    status: 'active',
    summary: '汐屿区唯一的近岸轨道线。',
  },
];

const REGION_DEFAULT_PROJECTS: TransportProjectRecord[] = [
  {
    id: 'project_holy_bridge_upgrade',
    districtId: 'holy_cathedral',
    mode: 'bridge',
    label: '圣教区桥梁加固案',
    status: 'planned',
    summary: '保留桥梁与陆路扩容位，不预置地铁。',
  },
  {
    id: 'project_qiling_road_survey',
    districtId: 'qiling_core',
    mode: 'expressway',
    label: '栖灵区道路测绘案',
    status: 'planned',
    summary: '仅保留未来公路与桥梁扩张接口。',
  },
  {
    id: 'project_cuiling_freight_spur',
    districtId: 'cuiling_core',
    mode: 'rail',
    label: '淬灵货运支线预案',
    status: 'planned',
    summary: '货运优先，不开放民用地铁。',
  },
];

const createStopCellId = (districtId: string, x: number, y: number): string => {
  const profile = CITY_DISTRICT_PROFILES.find(item => item.id === districtId) || CITY_DISTRICT_PROFILES[0];
  return `${pad(profile.regionCode, 2)}${pad(profile.districtCode, 2)}${pad(x, 2)}${pad(y, 2)}`;
};

const inferShopType = (archetype: ShopArchetype, locationLabel: string, suggestedName: string): RuntimeShopType => {
  if (/(餐厅|饭店|餐馆|咖啡|酒吧|茶屋|食堂|面包房|会馆|小馆|馆子)/.test(`${locationLabel} ${suggestedName}`)) {
    return 'restaurant';
  }
  switch (archetype) {
    case 'fashion':
      return 'clothing';
    case 'cybertech':
      return 'chip';
    case 'pharmacy':
      return 'drug';
    case 'restaurant':
      return 'restaurant';
    case 'luxury':
      return 'service';
    default:
      return 'general';
  }
};

const inferShopStyles = (archetype: ShopArchetype, locationLabel: string): string[] => {
  if (archetype === 'restaurant') {
    if (/(诺丝区|罪吻|夜场|酒吧)/.test(locationLabel)) return ['夜饮', '约场', '热菜'];
    if (/(汐屿区|白湾|潮镜)/.test(locationLabel)) return ['景观', '海味', '甜点'];
    if (/(艾瑞拉区|中环|礼序)/.test(locationLabel)) return ['礼序', '会席', '轻食'];
    if (/(圣教区)/.test(locationLabel)) return ['配给', '汤食', '清淡'];
    return ['常餐', '热菜', '饮品'];
  }
  if (archetype === 'fashion') return /(夜场|罪吻|红绡|瘾巷)/.test(locationLabel) ? ['夜场', '制服', '礼服'] : ['常服', '礼服', '制服'];
  if (archetype === 'cybertech') return ['芯片', '灵构', '器件'];
  if (archetype === 'pharmacy') return ['药剂', '抑制', '恢复'];
  if (archetype === 'luxury') return ['礼品', '高定', '会面'];
  return ['常规', '补给'];
};

const inferAnchorKindFromLocation = (locationLabel: string): CityAnchorKind => {
  if (/(站|站台|换乘|月台|闸机)/.test(locationLabel)) return 'station';
  if (/(公寓|住处|宿位|宿舍)/.test(locationLabel)) return 'residence';
  if (/(总部|大楼|总厅|署|庭|教会|学院|大学|公会|局|所)/.test(locationLabel)) return 'institution';
  if (/(关卡|桥|口岸|海关|结算站)/.test(locationLabel)) return 'checkpoint';
  if (/(剧院|浴场|广场|赛道|会展|馆|斗技|厅)/.test(locationLabel)) return 'venue';
  if (/(诊台|诊所|馆|店|市|屋|馆|场|驿站|面包房)/.test(locationLabel)) return 'service';
  return 'street';
};

const districtFallbackByJurisdiction = (location: string): DistrictGridProfile => {
  const jurisdiction = resolveLocationJurisdiction(location);
  switch (jurisdiction.key) {
    case 'aerila':
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'airela_central_ring') || CITY_DISTRICT_PROFILES[0];
    case 'north':
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'north_entertainment') || CITY_DISTRICT_PROFILES[0];
    case 'xiyu':
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'xiyu_white_bay') || CITY_DISTRICT_PROFILES[0];
    case 'holy':
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'holy_cathedral') || CITY_DISTRICT_PROFILES[0];
    case 'borderland':
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'borderland_dogtown') || CITY_DISTRICT_PROFILES[0];
    case 'cuiling':
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'cuiling_core') || CITY_DISTRICT_PROFILES[0];
    default:
      return CITY_DISTRICT_PROFILES.find(item => item.id === 'qiling_core') || CITY_DISTRICT_PROFILES[0];
  }
};

export const resolveDistrictProfileFromLocation = (locationLabel: string): DistrictGridProfile => {
  const matched = CITY_DISTRICT_PROFILES.find(profile => profile.match.test(locationLabel || ''));
  return matched || districtFallbackByJurisdiction(locationLabel);
};

export const getDistrictProfiles = (): DistrictGridProfile[] => CITY_DISTRICT_PROFILES.map(({ match: _match, ...profile }) => ({ ...profile }));

export const buildCellId = (profile: DistrictGridProfile, x: number, y: number): string =>
  `${pad(profile.regionCode, 2)}${pad(profile.districtCode, 2)}${pad(x, 2)}${pad(y, 2)}`;

const buildAnchorId = (cellId: string, slot: number): string => `${cellId}${pad(slot, 3)}`;

const buildTenantId = (anchorId: string, label: string): string => `tenant_${anchorId}_${pad(hashText(label) % 1000, 3)}`;

const findStopPresetForLocation = (districtId: string, locationLabel: string): StopPreset | null =>
  STOP_PRESETS.find(stop => stop.districtId === districtId && locationLabel.includes(stop.label)) || null;

export const resolveGridCoordinatesForLocation = (profile: DistrictGridProfile, locationLabel: string): { x: number; y: number } => {
  const preset = findStopPresetForLocation(profile.id, locationLabel);
  if (preset) return { x: preset.x, y: preset.y };
  const hash = hashText(normalizeKey(locationLabel || profile.districtLabel));
  const x = (hash % profile.width) + 1;
  const y = (Math.floor(hash / Math.max(1, profile.width)) % profile.height) + 1;
  return { x, y };
};

const createDefaultTransportStops = (): TransportStopRecord[] =>
  STOP_PRESETS.map(stop => ({
    id: stop.id,
    districtId: stop.districtId,
    label: stop.label,
    cellId: createStopCellId(stop.districtId, stop.x, stop.y),
    anchorId: null,
    x: stop.x,
    y: stop.y,
    lineIds: [...stop.lineIds],
    status: 'active',
  }));

const createDefaultTransportLines = (): TransportLineRecord[] => LINE_PRESETS.map(line => ({ ...line }));

export const createEmptyCityRuntime = (): CityRuntimeData => ({
  version: 1,
  currentDistrictId: '',
  currentCellId: '',
  currentAnchorId: '',
  cells: [],
  anchors: [],
  tenants: [],
  shops: [],
  todos: [],
  transportStops: createDefaultTransportStops(),
  transportLines: createDefaultTransportLines(),
  transportProjects: REGION_DEFAULT_PROJECTS.map(project => ({ ...project })),
});

export const normalizeCityRuntime = (input: unknown): CityRuntimeData | null => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const source = input as Record<string, unknown>;
  const base = createEmptyCityRuntime();
  return {
    version: 1,
    currentDistrictId: typeof source.currentDistrictId === 'string' ? source.currentDistrictId : '',
    currentCellId: typeof source.currentCellId === 'string' ? source.currentCellId : '',
    currentAnchorId: typeof source.currentAnchorId === 'string' ? source.currentAnchorId : '',
    cells: toArray<CityCellRecord>(source.cells).filter(item => item && typeof item.id === 'string'),
    anchors: toArray<CityAnchorRecord>(source.anchors).filter(item => item && typeof item.id === 'string'),
    tenants: toArray<CityTenantRecord>(source.tenants).filter(item => item && typeof item.id === 'string'),
    shops: toArray<RuntimeShopRecord>(source.shops)
      .filter(item => item && typeof item.id === 'string')
      .map(item => ({
        ...item,
        soldItemKeys: Array.isArray(item.soldItemKeys) ? item.soldItemKeys.filter(key => typeof key === 'string') : [],
      })),
    todos: toArray(source.todos).filter(item => item && typeof item === 'object') as CityRuntimeData['todos'],
    transportStops: (() => {
      const fromSave = toArray<TransportStopRecord>(source.transportStops).filter(item => item && typeof item.id === 'string');
      return fromSave.length ? fromSave : base.transportStops;
    })(),
    transportLines: (() => {
      const fromSave = toArray<TransportLineRecord>(source.transportLines).filter(item => item && typeof item.id === 'string');
      return fromSave.length ? fromSave : base.transportLines;
    })(),
    transportProjects: (() => {
      const fromSave = toArray<TransportProjectRecord>(source.transportProjects).filter(item => item && typeof item.id === 'string');
      return fromSave.length ? fromSave : base.transportProjects;
    })(),
  };
};

export const ensureAnchorForLocation = (
  runtime: CityRuntimeData,
  params: { locationLabel: string; label?: string; kind?: CityAnchorKind; tags?: string[]; legacyAliases?: string[] },
): { runtime: CityRuntimeData; cell: CityCellRecord; anchor: CityAnchorRecord; changed: boolean } => {
  const profile = resolveDistrictProfileFromLocation(params.locationLabel);
  const { x, y } = resolveGridCoordinatesForLocation(profile, params.locationLabel);
  const cellId = buildCellId(profile, x, y);
  const signature = normalizeKey(params.label || params.locationLabel);
  const nextLabel = params.label || params.locationLabel;

  const existingCell = runtime.cells.find(cell => cell.id === cellId);
  const existingAnchor =
    runtime.anchors.find(anchor => anchor.signature === signature && anchor.cellId === cellId) ||
    runtime.anchors.find(anchor => normalizeKey(anchor.label) === signature && anchor.cellId === cellId);

  let nextCells = runtime.cells;
  let nextAnchors = runtime.anchors;
  let changed = false;

  const cell =
    existingCell ||
    (() => {
      changed = true;
      const created: CityCellRecord = {
        id: cellId,
        regionKey: profile.regionKey,
        regionLabel: profile.regionLabel,
        districtId: profile.id,
        districtLabel: profile.districtLabel,
        x,
        y,
        discoveredAt: Date.now(),
        anchorIds: [],
      };
      nextCells = [...runtime.cells, created];
      return created;
    })();

  const anchor =
    existingAnchor ||
    (() => {
      const takenSlots = nextAnchors
        .filter(item => item.cellId === cellId)
        .map(item => Number(item.id.slice(-3)))
        .filter(value => Number.isFinite(value));
      let slot = 1;
      while (takenSlots.includes(slot)) slot += 1;
      const created: CityAnchorRecord = {
        id: buildAnchorId(cellId, slot),
        cellId,
        districtId: profile.id,
        label: nextLabel,
        kind: params.kind || inferAnchorKindFromLocation(params.locationLabel),
        status: 'active',
        signature,
        tenantId: null,
        discoveredAt: Date.now(),
        tags: [...(params.tags || [])],
        legacyAliases: [...(params.legacyAliases || [])],
      };
      changed = true;
      nextAnchors = [...nextAnchors, created];
      nextCells = nextCells.map(item => (item.id === cellId ? { ...item, anchorIds: [...item.anchorIds, created.id] } : item));
      return created;
    })();

  const pointersChanged =
    runtime.currentDistrictId !== profile.id || runtime.currentCellId !== cellId || runtime.currentAnchorId !== anchor.id;

  const nextRuntime =
    changed || pointersChanged
      ? {
          ...runtime,
          currentDistrictId: profile.id,
          currentCellId: cellId,
          currentAnchorId: anchor.id,
          cells: nextCells,
          anchors: nextAnchors,
        }
      : runtime;

  return {
    runtime: nextRuntime,
    cell: nextRuntime.cells.find(item => item.id === cellId) || cell,
    anchor: nextRuntime.anchors.find(item => item.id === anchor.id) || anchor,
    changed: changed || pointersChanged,
  };
};

export const ensureRuntimeShop = (
  runtime: CityRuntimeData,
  params: {
    locationLabel: string;
    suggestedName: string;
    archetype: ShopArchetype;
    summary: string;
  },
): { runtime: CityRuntimeData; shop: RuntimeShopRecord; anchor: CityAnchorRecord; changed: boolean } => {
  const baseAnchor = ensureAnchorForLocation(runtime, {
    locationLabel: params.locationLabel,
    label: params.suggestedName,
    kind: 'shop',
    tags: [params.archetype],
  });
  const inferredArchetype: ShopArchetype =
    /(餐厅|饭店|餐馆|咖啡|酒吧|茶屋|食堂|面包房|会馆|小馆|馆子)/.test(`${params.locationLabel} ${params.suggestedName}`)
      ? 'restaurant'
      : params.archetype;
  const shopType = inferShopType(inferredArchetype, params.locationLabel, params.suggestedName);
  const shopSignature = normalizeKey(`${baseAnchor.anchor.id}|${shopType}|${params.suggestedName}`);
  const existingShop =
    baseAnchor.runtime.shops.find(shop => shop.anchorId === baseAnchor.anchor.id && normalizeKey(shop.name) === normalizeKey(params.suggestedName)) ||
    baseAnchor.runtime.shops.find(shop => normalizeKey(shop.id) === shopSignature);

  if (existingShop) {
    return {
      runtime: baseAnchor.runtime.currentAnchorId === baseAnchor.anchor.id ? baseAnchor.runtime : { ...baseAnchor.runtime, currentAnchorId: baseAnchor.anchor.id },
      shop: existingShop,
      anchor: baseAnchor.anchor,
      changed: baseAnchor.changed,
    };
  }

  const hash = hashText(`${params.locationLabel}|${params.suggestedName}|${params.archetype}`);
  const tierRoll = hash % 100;
  const tier: RuntimeShopTier = tierRoll > 92 ? 'elite' : tierRoll > 72 ? 'premium' : tierRoll > 36 ? 'standard' : 'street';
  const nextShop: RuntimeShopRecord = {
    id: `shop_${baseAnchor.anchor.id}`,
    anchorId: baseAnchor.anchor.id,
    districtId: baseAnchor.anchor.districtId,
    name: params.suggestedName,
    type: shopType,
    tier,
    signatureStyle: inferShopStyles(inferredArchetype, params.locationLabel),
    hasBackroom:
      shopType === 'restaurant'
        ? false
        : /(north|borderland)/.test(resolveDistrictProfileFromLocation(params.locationLabel).regionKey) || inferredArchetype === 'fashion',
    refreshSeed: `${baseAnchor.anchor.id}|${hash.toString(36)}`,
    refreshEpoch: 1,
    loyalty: 0,
    discountTier: 0,
    soldItemKeys: [],
    firstSeenAt: Date.now(),
    status: 'active',
  };
  const tenant: CityTenantRecord = {
    id: buildTenantId(baseAnchor.anchor.id, params.suggestedName),
    anchorId: baseAnchor.anchor.id,
    label: params.suggestedName,
    kind: 'shop',
    status: 'active',
    createdAt: Date.now(),
    notes: params.summary,
  };

  const nextRuntime: CityRuntimeData = {
    ...baseAnchor.runtime,
    tenants: [...baseAnchor.runtime.tenants, tenant],
    shops: [...baseAnchor.runtime.shops, nextShop],
    anchors: baseAnchor.runtime.anchors.map(anchor =>
      anchor.id === baseAnchor.anchor.id
        ? {
            ...anchor,
            tenantId: tenant.id,
          }
        : anchor,
    ),
  };

  return {
    runtime: nextRuntime,
    shop: nextShop,
    anchor: nextRuntime.anchors.find(anchor => anchor.id === baseAnchor.anchor.id) || baseAnchor.anchor,
    changed: true,
  };
};

export const getDistrictTransportSnapshot = (
  runtime: CityRuntimeData,
  districtId: string,
): {
  profile: DistrictGridProfile | null;
  activeModes: TransportLayerMode[];
  activeLines: TransportLineRecord[];
  activeStops: TransportStopRecord[];
  projects: TransportProjectRecord[];
} => {
  const profile = CITY_DISTRICT_PROFILES.find(item => item.id === districtId) || null;
  const activeLines = runtime.transportLines.filter(line => line.status === 'active' && line.districtIds.includes(districtId));
  const activeStops = runtime.transportStops.filter(stop => stop.status === 'active' && stop.districtId === districtId);
  const projects = runtime.transportProjects.filter(project => project.districtId === districtId);
  const activeModes = Array.from(new Set(activeLines.map(line => line.mode)));
  return { profile, activeModes, activeLines, activeStops, projects };
};

export const getCurrentDistrictLabel = (runtime: CityRuntimeData): string => {
  const profile = CITY_DISTRICT_PROFILES.find(item => item.id === runtime.currentDistrictId);
  return profile?.districtLabel || '未定分区';
};

export const upsertTransportProject = (runtime: CityRuntimeData, nextProject: TransportProjectRecord): CityRuntimeData => {
  const exists = runtime.transportProjects.some(project => project.id === nextProject.id);
  return {
    ...runtime,
    transportProjects: exists
      ? runtime.transportProjects.map(project => (project.id === nextProject.id ? nextProject : project))
      : [...runtime.transportProjects, nextProject],
  };
};
