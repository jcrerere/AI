import { LocationNode, RegionNode, StreetNode, WorldNodeMapData } from '../types';

type UnknownRecord = Record<string, unknown>;

const EMPTY_LINKS = { up: null, down: null, left: null, right: null } as const;

const safeText = (value: unknown, fallback = ''): string => (typeof value === 'string' ? value : fallback);

const normalizeLocation = (value: unknown, index: number): LocationNode => {
  const source = (value || {}) as UnknownRecord;
  const name = safeText(source.name, `地点${index + 1}`);
  const summary = safeText(source.summary).trim();
  return {
    id: safeText(source.id, `L_${index + 1}`),
    name,
    type: safeText(source.type, '未分类'),
    summary:
      summary ||
      [
        `【地点定位】${name}`,
        '【场景氛围】填写现场视觉、声音、气味',
        '【可互动点】至少3个',
        '【风险提示】治安/黑产/冲突',
      ].join('\n'),
    links: { ...EMPTY_LINKS, ...(source.links as UnknownRecord) },
    imageUrls: Array.isArray(source.imageUrls) ? source.imageUrls.filter(v => typeof v === 'string') : [],
  };
};

const normalizeStreet = (value: unknown, index: number): StreetNode => {
  const source = (value || {}) as UnknownRecord;
  const locationsRaw = Array.isArray(source.locations) ? source.locations : [];
  const locations = locationsRaw.map((item, i) => normalizeLocation(item, i));
  const name = safeText(source.name, `街区${index + 1}`);
  const summary = safeText(source.summary).trim();
  return {
    id: safeText(source.id, `S_${index + 1}`),
    name,
    summary:
      summary ||
      [
        `【街区定位】${name}`,
        '【功能主轴】商业/物流/娱乐/治安',
        `【包含地点】${locations.map(item => item.name).join('、') || '待补充'}`,
        '【玩家玩法钩子】探索/交易/冲突',
      ].join('\n'),
    entryLocationId: safeText(source.entryLocationId, locations[0]?.id || ''),
    links: { ...EMPTY_LINKS, ...(source.links as UnknownRecord) },
    locations,
    imageUrls: Array.isArray(source.imageUrls) ? source.imageUrls.filter(v => typeof v === 'string') : [],
  };
};

const normalizeRegion = (value: unknown, index: number): RegionNode => {
  const source = (value || {}) as UnknownRecord;
  const streetsRaw = Array.isArray(source.streets) ? source.streets : [];
  const streets = streetsRaw.map((item, i) => normalizeStreet(item, i));
  const name = safeText(source.name, `区域${index + 1}`);
  const summary = safeText(source.summary).trim();
  return {
    id: safeText(source.id, `R_${index + 1}`),
    name,
    summary:
      summary ||
      [
        `【区域定位】${name}`,
        '【整体风格】视觉/产业/秩序',
        `【核心街区】${streets.map(item => item.name).join('、') || '待补充'}`,
        '【玩家进入后可做】先看哪里，再去哪里',
      ].join('\n'),
    entryStreetId: safeText(source.entryStreetId, streets[0]?.id || ''),
    links: { ...EMPTY_LINKS, ...(source.links as UnknownRecord) },
    streets,
    imageUrls: Array.isArray(source.imageUrls) ? source.imageUrls.filter(v => typeof v === 'string') : [],
  };
};

export const normalizeWorldNodeMap = (input: unknown): WorldNodeMapData | null => {
  const source = (input || {}) as UnknownRecord;
  let regionsRaw: unknown[] | null = null;

  if (Array.isArray((source.map as UnknownRecord)?.regions)) {
    regionsRaw = (source.map as UnknownRecord).regions as unknown[];
  } else if (Array.isArray(source.regions)) {
    regionsRaw = source.regions as unknown[];
  }

  if (!regionsRaw) return null;
  return {
    map: {
      regions: regionsRaw.map((item, i) => normalizeRegion(item, i)),
    },
  };
};

const extractJsonBlocks = (text: string): string[] => {
  const blocks: string[] = [];
  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null = null;
  while ((match = fence.exec(text)) !== null) {
    blocks.push(match[1]);
  }
  return blocks;
};

export const tryParseMapFromText = (text: string): WorldNodeMapData | null => {
  const sources = extractJsonBlocks(text);
  if (sources.length === 0) sources.push(text);
  for (const source of sources) {
    try {
      const parsed = JSON.parse(source);
      const normalized = normalizeWorldNodeMap(parsed);
      if (normalized) return normalized;
    } catch {
      // ignore parse error and keep trying
    }
  }
  return null;
};

export interface MapPatchPayload {
  mode: 'merge' | 'replace';
  map: WorldNodeMapData;
}

export const tryParseMapPatchFromText = (text: string): MapPatchPayload | null => {
  const sources = extractJsonBlocks(text);
  const tagMatch = text.match(/<MAP_PATCH>\s*([\s\S]*?)\s*<\/MAP_PATCH>/i);
  if (tagMatch?.[1]) sources.push(tagMatch[1]);
  if (sources.length === 0) sources.push(text);

  for (const source of sources) {
    try {
      const parsed = JSON.parse(source) as UnknownRecord;
      const patchObj = (parsed.map_patch || parsed.mapPatch || parsed.patch || parsed) as UnknownRecord;
      const modeRaw = String(patchObj.mode || parsed.mode || 'merge').toLowerCase();
      const mode: 'merge' | 'replace' = modeRaw === 'replace' ? 'replace' : 'merge';
      const candidate = patchObj.map || patchObj.data || parsed.map ? (patchObj.map || patchObj.data || parsed) : parsed;
      const normalized = normalizeWorldNodeMap(candidate);
      if (normalized) return { mode, map: normalized };
    } catch {
      // ignore parse error and keep trying
    }
  }
  return null;
};

const mergeLocationList = (base: LocationNode[], incoming: LocationNode[]): LocationNode[] => {
  const index = new Map(base.map(item => [item.id, item]));
  for (const item of incoming) {
    const prev = index.get(item.id);
    index.set(item.id, prev ? { ...prev, ...item } : item);
  }
  return Array.from(index.values());
};

const mergeStreetList = (base: StreetNode[], incoming: StreetNode[]): StreetNode[] => {
  const index = new Map(base.map(item => [item.id, item]));
  for (const item of incoming) {
    const prev = index.get(item.id);
    index.set(
      item.id,
      prev
        ? {
            ...prev,
            ...item,
            locations: mergeLocationList(prev.locations || [], item.locations || []),
          }
        : item,
    );
  }
  return Array.from(index.values());
};

export const mergeWorldNodeMap = (base: WorldNodeMapData, incoming: WorldNodeMapData): WorldNodeMapData => {
  const index = new Map(base.map.regions.map(item => [item.id, item]));
  for (const item of incoming.map.regions) {
    const prev = index.get(item.id);
    index.set(
      item.id,
      prev
        ? {
            ...prev,
            ...item,
            streets: mergeStreetList(prev.streets || [], item.streets || []),
          }
        : item,
    );
  }
  return { map: { regions: Array.from(index.values()) } };
};

export const MAP_OUTPUT_PROMPT = [
  '你是地图数据生成器。输出 <MAP_PATCH> 包裹的 JSON，不要解释。',
  '输出结构：{"map_patch":{"mode":"merge","map":{"regions":[...]}}}',
  '整图重建用 mode=replace，日常增量更新用 mode=merge。',
  'map 结构必须是 {"map":{"regions":[...]}} 或 {"regions":[...]}。',
  '字段必须包含 id/name/summary/links/streets/locations。',
  'id 规则：区域 R_xxx，街区 S_xxx，地点 L_xxx。',
].join('\n');

export const AUTO_MAP_PATCH_PROTOCOL = [
  '当且仅当剧情新增/删除/改名地点、街区、区域，或节点描述发生变化时，在回复末尾追加地图补丁。',
  '补丁格式：<MAP_PATCH>{"map_patch":{"mode":"merge","map":{"regions":[...]}}}</MAP_PATCH>',
  '无地图变更时，不要输出 MAP_PATCH。',
].join('\n');

