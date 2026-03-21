import { Item, Rank, RuntimeShopType } from '../types';

export type SceneActionRoute = 'shop' | 'black_race_bet' | 'metro_route';

export interface SceneActionDescriptor {
  id: string;
  route: SceneActionRoute;
  label: string;
  detail: string;
  source: 'location' | 'narrative' | 'ai';
  priority: number;
}

export interface ProceduralShopItem extends Item {
  price: number;
  slot: number;
  shopTag: string;
  sourceEpoch?: number;
  availability?: 'front' | 'backroom';
  styleTags?: string[];
}

export interface ProceduralShop {
  id: string;
  shopId?: string;
  title: string;
  archetype: 'fashion' | 'cybertech' | 'pharmacy' | 'luxury' | 'general';
  type?: RuntimeShopType;
  locationLabel: string;
  summary: string;
  items: ProceduralShopItem[];
  shopMode?: 'retail' | 'restaurant';
  tier?: 'street' | 'standard' | 'premium' | 'elite';
  loyalty?: number;
  discountTier?: number;
  hasBackroom?: boolean;
  refreshEpoch?: number;
  refreshLabel?: string;
  commissionHint?: string;
  venueLabel?: string;
  specialtyLabel?: string;
  ownerLabel?: string;
  dateFriendly?: boolean;
}

export interface MetroStop {
  id: string;
  label: string;
  region: string;
  district: string;
}

export interface MetroLine {
  id: string;
  name: string;
  colorClass: string;
  stops: MetroStop[];
}

export interface MetroTravelOption {
  stop: MetroStop;
  fare: number;
  minutes: number;
  lineIds: string[];
}

export interface MetroNetwork {
  currentStop: MetroStop;
  lines: MetroLine[];
  options: MetroTravelOption[];
}

export interface SceneActionState {
  actions: SceneActionDescriptor[];
  shop: ProceduralShop | null;
  metro: MetroNetwork | null;
}

type InferSceneActionInput = {
  rawLayerContent: string;
  currentLocation: string;
  latestPlayerInput: string;
  layerId: string;
  allowMetroRoute?: boolean;
};

const readTag = (content: string, tag: string): string => {
  const reg = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  return content.match(reg)?.[1]?.trim() || '';
};

const createSeed = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seedText: string) => {
  let state = createSeed(seedText) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const sample = <T>(items: T[], rng: () => number): T => items[Math.floor(rng() * items.length)];

const shuffle = <T>(items: T[], rng: () => number): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const parseUiActionRoutes = (raw: string): SceneActionRoute[] => {
  const text = raw.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    const values = Array.isArray(parsed)
      ? parsed.map(entry => (typeof entry === 'string' ? entry : `${entry?.route || entry?.id || ''}`))
      : [];
    return values.map(normalizeSceneActionRoute).filter((value): value is SceneActionRoute => !!value);
  } catch {
    return text
      .split(/[\n,|]+/)
      .map(part => normalizeSceneActionRoute(part))
      .filter((value): value is SceneActionRoute => !!value);
  }
};

const normalizeSceneActionRoute = (value: string): SceneActionRoute | null => {
  const text = `${value || ''}`.trim().toLowerCase();
  if (!text) return null;
  if (['shop', 'store', 'shopping', '购物', '购买', '选购'].includes(text)) return 'shop';
  if (['restaurant', 'dining', 'food', 'meal', '餐厅', '餐馆', '饭店', '吃饭', '用餐', '点餐', '点单', '订座'].includes(text)) return 'shop';
  if (['black_race_bet', 'blackrace', 'gambling', 'bet', '下注', '赌局', '黑赛', '黑赛下注'].includes(text)) return 'black_race_bet';
  if (['metro_route', 'metro', 'subway', 'transit', '地铁', '线路', '乘车'].includes(text)) return 'metro_route';
  return null;
};

const SHOP_PATTERNS = {
  fashion: /(服装店|成衣店|裁缝|衣廊|礼服|裙|西装|外套|试衣|服饰|时装|衣装)/,
  cybertech: /(芯片店|义体|灵构|零件|改装|样机|接口|终端|装备店|器材)/,
  pharmacy: /(药店|药剂|诊台|医疗|针剂|抑制剂|恢复剂|诊所柜台|镇痛)/,
  luxury: /(精品|高定|珠宝|名品|展柜|礼品|奢侈|艺术品|藏品)/,
};

const SHOP_BASE_TEMPLATES: Record<ProceduralShop['archetype'], Array<Omit<ProceduralShopItem, 'id' | 'quantity' | 'slot' | 'shopTag' | 'price'>>> = {
  fashion: [
    { name: '绮纹长外套', icon: '🧥', description: '兼顾门面与防污层的诺丝流行款。', category: 'equipment', rank: Rank.Lv1 },
    { name: '夜缎礼服', icon: '👗', description: '适合夜宴和交易场合的修身礼装。', category: 'equipment', rank: Rank.Lv2 },
    { name: '导电高跟靴', icon: '👢', description: '鞋底加入导电纹路，适合霓虹湿地表面。', category: 'equipment', rank: Rank.Lv2 },
    { name: '镜纱披肩', icon: '🧣', description: '薄层镜纱可改变肩颈轮廓的观感。', category: 'equipment', rank: Rank.Lv3 },
    { name: '礼序徽章', icon: '🎖️', description: '仿制礼序徽记，适合出席正式场合。', category: 'equipment', rank: Rank.Lv2 },
  ],
  cybertech: [
    { name: '灵构接口针', icon: '🔌', description: '常见的接口调试耗材。', category: 'material', rank: Rank.Lv2 },
    { name: '感压箔片', icon: '📎', description: '用于微型装置校准和粘接。', category: 'material', rank: Rank.Lv1 },
    { name: '折叠观测片', icon: '🪞', description: '可挂载在视觉模块上的便携观测片。', category: 'equipment', rank: Rank.Lv2 },
    { name: '灵压校准夹', icon: '🛠️', description: '用于临时校准灵压波动的夹具。', category: 'equipment', rank: Rank.Lv3 },
    { name: '旧式驱动芯', icon: '💽', description: '被灰产渠道反复翻修的旧驱动芯。', category: 'material', rank: Rank.Lv1 },
  ],
  pharmacy: [
    { name: '镇痛注剂', icon: '💉', description: '短时压制伤痛与肌肉痉挛。', category: 'consumable', rank: Rank.Lv1 },
    { name: '神经缓释贴', icon: '🩹', description: '减轻神经负荷带来的恶心和震颤。', category: 'consumable', rank: Rank.Lv1 },
    { name: '应急灵液', icon: '🧪', description: '少量补充灵压并稳定呼吸节奏。', category: 'consumable', rank: Rank.Lv2 },
    { name: '抑躁喷雾', icon: '🫙', description: '用于压制过热后的烦躁与冲动。', category: 'consumable', rank: Rank.Lv2 },
    { name: '稳态针剂', icon: '⚗️', description: '黑市常见的高阶稳态药剂。', category: 'consumable', rank: Rank.Lv3 },
  ],
  luxury: [
    { name: '镜曜胸针', icon: '💎', description: '会在光源下投出细密星点的装饰胸针。', category: 'equipment', rank: Rank.Lv3 },
    { name: '霓金领饰', icon: '📿', description: '高价场合常见的身份装点件。', category: 'equipment', rank: Rank.Lv4 },
    { name: '绮纹手套', icon: '🧤', description: '礼仪与触感设计都偏上层市场。', category: 'equipment', rank: Rank.Lv2 },
    { name: '琉灯耳饰', icon: '✨', description: '饰面采用导光纤层，适合舞台与酒会。', category: 'equipment', rank: Rank.Lv2 },
    { name: '宴会名片匣', icon: '💼', description: '给商业宴席准备的定制名片匣。', category: 'equipment', rank: Rank.Lv3 },
  ],
  general: [
    { name: '压缩口粮', icon: '🍱', description: '适合长时间活动携带。', category: 'consumable', rank: Rank.Lv1 },
    { name: '能量饮剂', icon: '🥤', description: '短时提神的标准饮剂。', category: 'consumable', rank: Rank.Lv1 },
    { name: '线路胶带', icon: '🧵', description: '临时封线和绝缘时常用。', category: 'material', rank: Rank.Lv1 },
    { name: '过滤芯片', icon: '🧿', description: '一次性过滤模块的平价替代件。', category: 'material', rank: Rank.Lv1 },
    { name: '便携照明片', icon: '🔦', description: '可折叠的薄片照明设备。', category: 'equipment', rank: Rank.Lv1 },
  ],
};

const SHOP_NAME_PARTS: Record<ProceduralShop['archetype'], { prefix: string[]; suffix: string[] }> = {
  fashion: {
    prefix: ['霓褶', '绯缎', '镜裁', '暮纱'],
    suffix: ['衣廊', '成衣铺', '试装间', '陈列店'],
  },
  cybertech: {
    prefix: ['阈光', '灵构', '脉冲', '零位'],
    suffix: ['改装铺', '接口站', '零件间', '配件柜'],
  },
  pharmacy: {
    prefix: ['岚针', '静脉', '白剂', '稳态'],
    suffix: ['药台', '剂柜', '诊台', '应急柜'],
  },
  luxury: {
    prefix: ['镜曜', '曜金', '琉光', '绮徽'],
    suffix: ['精品间', '礼物厅', '展柜', '名饰屋'],
  },
  general: {
    prefix: ['灰幕', '夜巡', '折返', '阙下'],
    suffix: ['百货店', '杂货铺', '补给点', '柜台'],
  },
};

const rankBasePrice = (rank: Rank) => {
  switch (rank) {
    case Rank.Lv1:
      return 60;
    case Rank.Lv2:
      return 180;
    case Rank.Lv3:
      return 420;
    case Rank.Lv4:
      return 860;
    case Rank.Lv5:
      return 1800;
    default:
      return 100;
  }
};

const buildProceduralShop = (currentLocation: string, latestPlayerInput: string, layerId: string, archetype: ProceduralShop['archetype']): ProceduralShop => {
  const seedText = `${currentLocation}|${latestPlayerInput}|${layerId}|${archetype}`;
  const rng = createRng(seedText);
  const nameParts = SHOP_NAME_PARTS[archetype];
  const title = `${sample(nameParts.prefix, rng)}${sample(nameParts.suffix, rng)}`;
  const pool = shuffle(SHOP_BASE_TEMPLATES[archetype], rng).slice(0, 5);
  const items = pool.map((item, index) => {
    const priceFactor = 0.85 + rng() * 0.45;
    const surcharge = Math.round(rng() * 60);
    return {
      ...item,
      id: `proc_shop_${createSeed(`${title}_${item.name}_${index}`).toString(36)}`,
      quantity: 1,
      slot: index,
      shopTag: title,
      price: Math.max(30, Math.round(rankBasePrice(item.rank) * priceFactor) + surcharge),
      sourceEpoch: 1,
      availability: 'front',
      styleTags: [],
    };
  });
  const summaryMap: Record<ProceduralShop['archetype'], string> = {
    fashion: '根据当前场景词和地点临时拼出的服装货架，适合没有单独写店铺时快速落地购物。',
    cybertech: '围绕芯片、灵构和配件拼出的临时器材货架，可承接灰产和公开技术市场。',
    pharmacy: '从诊台、药柜和恢复用品词里生成的应急采购面板。',
    luxury: '更偏宴会、商务和高消费场景的陈列货架。',
    general: '默认的通用柜台，用来承接没有单独细写的普通购物场景。',
  };

  return {
    id: `scene_shop_${createSeed(seedText).toString(36)}`,
    title,
    archetype,
    locationLabel: currentLocation,
    summary: summaryMap[archetype],
    items,
  };
};

const detectShopArchetype = (combinedText: string): ProceduralShop['archetype'] | null => {
  if (SHOP_PATTERNS.fashion.test(combinedText)) return 'fashion';
  if (SHOP_PATTERNS.cybertech.test(combinedText)) return 'cybertech';
  if (SHOP_PATTERNS.pharmacy.test(combinedText)) return 'pharmacy';
  if (SHOP_PATTERNS.luxury.test(combinedText)) return 'luxury';
  if (/(商店|店铺|购物|购买|选购|货架|柜台|橱窗|售卖|百货|买点东西)/.test(combinedText)) return 'general';
  return null;
};

const METRO_LINES: MetroLine[] = [
  {
    id: 'm1',
    name: '皇港一号线',
    colorClass: 'text-cyan-300 border-cyan-500/30 bg-cyan-500/10',
    stops: [
      { id: 'airela_north_gate', label: '艾瑞拉区·北门换乘站', region: '艾瑞拉区', district: '北门分区' },
      { id: 'airela_central', label: '艾瑞拉区·中环礼序站', region: '艾瑞拉区', district: '中环分区' },
      { id: 'airela_south_port', label: '艾瑞拉区·南港关务站', region: '艾瑞拉区', district: '南港分区' },
      { id: 'north_entertainment', label: '诺丝区·综合娱乐区站', region: '诺丝区', district: '综合娱乐区' },
      { id: 'north_sin', label: '诺丝区·罪吻广场站', region: '诺丝区', district: '红灯核心' },
    ],
  },
  {
    id: 'm2',
    name: '霓潮二号线',
    colorClass: 'text-fuchsia-200 border-fuchsia-500/30 bg-fuchsia-500/10',
    stops: [
      { id: 'north_university', label: '诺丝区·诺丝大学站', region: '诺丝区', district: '学院带' },
      { id: 'north_race', label: '诺丝区·裂帛赛道站', region: '诺丝区', district: '黑赛带' },
      { id: 'north_show', label: '诺丝区·浮霓会展塔站', region: '诺丝区', district: '会展带' },
      { id: 'xiyu_bay', label: '汐屿区·白湾口岸站', region: '汐屿区', district: '白湾' },
      { id: 'xiyu_mirror', label: '汐屿区·潮镜别墅站', region: '汐屿区', district: '潮镜坡地' },
    ],
  },
  {
    id: 'm3',
    name: '誓厅三号线',
    colorClass: 'text-amber-200 border-amber-500/30 bg-amber-500/10',
    stops: [
      { id: 'north_sin_hub', label: '诺丝区·罪吻广场换乘厅', region: '诺丝区', district: '红灯核心' },
      { id: 'church_knight', label: '圣教区·圣殿骑士团驻地站', region: '圣教区', district: '骑士驻地' },
      { id: 'church_cathedral', label: '圣教区·大圣堂站', region: '圣教区', district: '圣堂腹地' },
      { id: 'church_grain', label: '圣教区·粮誓仓廊站', region: '圣教区', district: '粮运带' },
    ],
  },
];

const resolveCurrentMetroStop = (currentLocation: string): MetroStop => {
  for (const line of METRO_LINES) {
    const direct = line.stops.find(stop => currentLocation.includes(stop.label) || currentLocation.includes(stop.district));
    if (direct) return direct;
  }
  if (currentLocation.includes('诺丝区')) return METRO_LINES[0].stops[3];
  if (currentLocation.includes('艾瑞拉区') && currentLocation.includes('北门')) return METRO_LINES[0].stops[0];
  if (currentLocation.includes('艾瑞拉区') && currentLocation.includes('南港')) return METRO_LINES[0].stops[2];
  if (currentLocation.includes('艾瑞拉区')) return METRO_LINES[0].stops[1];
  if (currentLocation.includes('圣教区')) return METRO_LINES[2].stops[1];
  if (currentLocation.includes('汐屿区')) return METRO_LINES[1].stops[3];
  return METRO_LINES[0].stops[1];
};

const buildMetroNetwork = (currentLocation: string): MetroNetwork => {
  const currentStop = resolveCurrentMetroStop(currentLocation);
  const options: MetroTravelOption[] = [];
  METRO_LINES.forEach(line => {
    line.stops.forEach((stop, index) => {
      if (stop.id === currentStop.id) return;
      const currentIndex = line.stops.findIndex(candidate => candidate.id === currentStop.id);
      const sameLineDistance = currentIndex >= 0 ? Math.abs(currentIndex - index) : 3;
      const isCrossRegion = stop.region !== currentStop.region;
      const fare = 30 + sameLineDistance * 20 + (isCrossRegion ? 40 : 0);
      const minutes = 6 + sameLineDistance * 5 + (isCrossRegion ? 6 : 0);
      const existing = options.find(option => option.stop.id === stop.id);
      if (existing) {
        existing.lineIds.push(line.id);
        existing.fare = Math.min(existing.fare, fare);
        existing.minutes = Math.min(existing.minutes, minutes);
        return;
      }
      options.push({
        stop,
        fare,
        minutes,
        lineIds: [line.id],
      });
    });
  });
  return {
    currentStop,
    lines: METRO_LINES,
    options: options.sort((a, b) => a.fare - b.fare || a.minutes - b.minutes),
  };
};

export const inferSceneActionState = ({
  rawLayerContent,
  currentLocation,
  latestPlayerInput,
  layerId,
  allowMetroRoute = false,
}: InferSceneActionInput): SceneActionState => {
  const rawMaintext = readTag(rawLayerContent, 'maintext') || rawLayerContent;
  const combinedText = `${currentLocation} ${latestPlayerInput} ${rawMaintext}`.replace(/\s+/g, ' ');
  const aiRoutes = parseUiActionRoutes(readTag(rawLayerContent, 'ui_actions'));
  const shopArchetype = detectShopArchetype(combinedText);
  const isRestaurantScene = /(餐厅|饭店|餐馆|咖啡|酒吧|茶屋|食堂|面包房|会馆|小馆|馆子|用餐|点单|订座|约饭|聚餐)/.test(combinedText);
  const hasBlackRaceSignal =
    /(黑赛|盘口|赔率|下注|赌局|裂帛赛道|灵械斗技穹笼|黑赛下注点|买输赢|赛手)/.test(combinedText) ||
    aiRoutes.includes('black_race_bet');
  const hasMetroSignal =
    allowMetroRoute && (
    /(地铁|轨道|站台|月台|列车|换乘|几号线|线路图|进站|出站|闸机|轻轨)/.test(combinedText) ||
    aiRoutes.includes('metro_route'));
  const shouldShowShop = !!shopArchetype || aiRoutes.includes('shop');

  const actionMap = new Map<SceneActionRoute, SceneActionDescriptor>();
  const put = (route: SceneActionRoute, source: SceneActionDescriptor['source'], priority: number, label: string, detail: string) => {
    const current = actionMap.get(route);
    if (!current || priority > current.priority) {
      actionMap.set(route, {
        id: `scene_action_${route}`,
        route,
        label,
        detail,
        source,
        priority,
      });
    }
  };

  aiRoutes.forEach(route => {
    const labels: Record<SceneActionRoute, { label: string; detail: string }> = {
      shop: { label: isRestaurantScene ? '选择用餐' : '选择购物', detail: isRestaurantScene ? '接入当前场景的餐厅菜单与订座入口。' : '接入当前场景的交易货架。' },
      black_race_bet: { label: '选择下注', detail: '切入当前黑赛盘口与结算页。' },
      metro_route: { label: '查看线路', detail: '打开地铁线路并选择下车站。' },
    };
    if (route === 'metro_route' && !allowMetroRoute) return;
    put(route, 'ai', 90, labels[route].label, labels[route].detail);
  });

  if (shouldShowShop) {
    put(
      'shop',
      'narrative',
      70,
      isRestaurantScene ? '选择用餐' : '选择购物',
      isRestaurantScene ? '根据当前场景词接入餐厅菜单、座位和留菜入口。' : '根据当前场景词生成临时货架。',
    );
  }
  if (hasBlackRaceSignal) put('black_race_bet', 'narrative', 70, '选择下注', '切入当前盘口并执行下注。');
  if (hasMetroSignal) put('metro_route', 'narrative', 70, '查看线路', '查看可达站点并决定下车位置。');

  const shop = shouldShowShop ? buildProceduralShop(currentLocation, latestPlayerInput, layerId, shopArchetype || 'general') : null;
  const metro = allowMetroRoute && hasMetroSignal ? buildMetroNetwork(currentLocation) : null;

  return {
    actions: [...actionMap.values()].sort((a, b) => b.priority - a.priority),
    shop,
    metro,
  };
};
