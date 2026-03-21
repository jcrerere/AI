import { Item, Rank, RuntimeShopRecord, RuntimeShopType } from '../types';
import { buildRegionalRetailPrice, resolveShopPriceCategory } from './economyRuntime';

export interface RuntimeShopItem extends Item {
  price: number;
  slot: number;
  shopTag: string;
  sourceEpoch: number;
  availability: 'front' | 'backroom';
  styleTags: string[];
}

export interface RuntimeShopView {
  id: string;
  shopId: string;
  title: string;
  archetype: 'fashion' | 'cybertech' | 'pharmacy' | 'luxury' | 'general';
  locationLabel: string;
  summary: string;
  items: RuntimeShopItem[];
  tier: RuntimeShopTier;
  loyalty: number;
  discountTier: number;
  hasBackroom: boolean;
  refreshEpoch: number;
  refreshLabel: string;
  commissionHint: string;
}

type CatalogItem = {
  name: string;
  icon: string;
  description: string;
  category: Item['category'];
  rank: Rank;
  styles: string[];
  tag?: 'restricted' | 'statement' | 'uniform' | 'formal' | 'night';
};

type ShopArchetype = RuntimeShopView['archetype'];

const MINUTES_PER_DAY = 24 * 60;

const hashText = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const createRng = (seedText: string) => {
  let state = hashText(seedText) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const shuffle = <T>(items: T[], rng: () => number): T[] => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
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

const resolveArchetypeFromShopType = (type: RuntimeShopType): ShopArchetype => {
  switch (type) {
    case 'clothing':
      return 'fashion';
    case 'chip':
      return 'cybertech';
    case 'clinic':
    case 'drug':
      return 'pharmacy';
    case 'service':
    case 'restaurant':
      return 'luxury';
    default:
      return 'general';
  }
};

const SHOP_SUMMARY: Record<ShopArchetype, string> = {
  fashion: '固定店面货架，主打穿搭、礼装、制服和夜场变体，库存按周期滚动更新。',
  cybertech: '固定店面货架，主打芯片、样机、接口和公开器材，老货会在柜台停留一段时间。',
  pharmacy: '固定店面货架，主打药剂、恢复、烟草和黑市常备补给，周期更新但不整店清空。',
  luxury: '固定店面货架，主打高定、服务票据和高消费场景用品，暗柜货更重渠道。',
  general: '固定店面货架，承接一般购物、临时补给和非专门场景的基础采购。',
};

const SHOP_COMMISSION_HINT: Record<ShopArchetype, string> = {
  fashion: '例如：定制礼服 / 代办夜莺制服 / 进货空姐制服',
  cybertech: '例如：帮我留一枚样机 / 找一套旧式接口件',
  pharmacy: '例如：帮我留一套稳态针剂 / 准备一批夜场烟草',
  luxury: '例如：准备一套宴会装 / 留一间私席包厢',
  general: '例如：帮我留货 / 下期进一批我指定的东西',
};

const FRONT_CATALOG: Record<ShopArchetype, CatalogItem[]> = {
  fashion: [
    { name: '镜纹常服', icon: '🧥', description: '剪裁规整的日常常服，适合公开活动。', category: 'equipment', rank: Rank.Lv1, styles: ['常服', '体面', '日常'] },
    { name: '翎线西装', icon: '👔', description: '偏正式的修身西装，门面感明显。', category: 'equipment', rank: Rank.Lv2, styles: ['礼服', '正式', '商务'], tag: 'formal' },
    { name: '浅霓JK套装', icon: '🎀', description: '学院感很强的成套穿搭，风格鲜明。', category: 'equipment', rank: Rank.Lv2, styles: ['制服', '学院', '日常'] },
    { name: '夜缎礼服', icon: '👗', description: '适合夜宴与会面的礼服款式。', category: 'equipment', rank: Rank.Lv3, styles: ['礼服', '夜场', '正式'], tag: 'formal' },
    { name: '导电丝袜', icon: '🧦', description: '兼顾造型和舞台光泽的贴身搭配件。', category: 'equipment', rank: Rank.Lv2, styles: ['夜场', '挑逗', '配件'], tag: 'night' },
    { name: '绮幕空乘制服', icon: '🛫', description: '仿空乘风格的高识别制服装束。', category: 'equipment', rank: Rank.Lv3, styles: ['制服', '身份', '礼装'], tag: 'uniform' },
    { name: '灰阶机能外套', icon: '🦺', description: '更重行动便利和遮挡感的机能外套。', category: 'equipment', rank: Rank.Lv2, styles: ['功能', '机能', '行动'] },
    { name: '宴厅肩章披衣', icon: '🧣', description: '偏上层宴会路线的礼序披衣。', category: 'equipment', rank: Rank.Lv3, styles: ['礼服', '身份', '体面'], tag: 'statement' },
  ],
  cybertech: [
    { name: '旧式驱动芯', icon: '💽', description: '翻修过的旧式驱动芯，公开市场仍有流通。', category: 'material', rank: Rank.Lv1, styles: ['芯片', '旧式', '公开'] },
    { name: '灵构接口针', icon: '🔌', description: '常见接口调试耗材。', category: 'material', rank: Rank.Lv2, styles: ['接口', '器件', '常备'] },
    { name: '脉冲评测片', icon: '📟', description: '用于样机演示和快速评测的便携模块。', category: 'equipment', rank: Rank.Lv2, styles: ['样机', '评测', '公开'] },
    { name: '零位样机板', icon: '🧩', description: '用于公开路演的基础样机板。', category: 'equipment', rank: Rank.Lv3, styles: ['样机', '技术', '公开'] },
    { name: '观测折叠镜片', icon: '🪞', description: '挂载式视觉辅助镜片。', category: 'equipment', rank: Rank.Lv2, styles: ['视觉', '器件', '便携'] },
    { name: '灵压校准夹', icon: '🛠️', description: '临时校准灵压波动的现场工具。', category: 'equipment', rank: Rank.Lv3, styles: ['校准', '维护', '器件'] },
  ],
  pharmacy: [
    { name: '镇痛注剂', icon: '💉', description: '短时压制伤痛与痉挛。', category: 'consumable', rank: Rank.Lv1, styles: ['药剂', '恢复', '诊台'] },
    { name: '神经缓释贴', icon: '🩹', description: '减轻负荷带来的恶心和震颤。', category: 'consumable', rank: Rank.Lv1, styles: ['药剂', '恢复', '常备'] },
    { name: '应急灵液', icon: '🧪', description: '少量补充灵压并稳定呼吸节奏。', category: 'consumable', rank: Rank.Lv2, styles: ['药剂', '恢复', '夜场'] },
    { name: '抑躁喷雾', icon: '🫙', description: '压制过热后的烦躁与冲动。', category: 'consumable', rank: Rank.Lv2, styles: ['药剂', '抑制', '常备'] },
    { name: '静燃烟草', icon: '🚬', description: '夜场常见的平价烟草，带轻微松弛效果。', category: 'consumable', rank: Rank.Lv1, styles: ['烟草', '夜场', '消耗'] },
    { name: '稳态针剂', icon: '⚗️', description: '灰市里更高阶的稳态药剂。', category: 'consumable', rank: Rank.Lv3, styles: ['药剂', '高阶', '诊台'] },
  ],
  luxury: [
    { name: '宴会名片匣', icon: '💼', description: '给高消费社交场景准备的定制名片匣。', category: 'equipment', rank: Rank.Lv3, styles: ['礼装', '身份', '会面'] },
    { name: '琉灯耳饰', icon: '✨', description: '导光纤层耳饰，适合舞台与酒会。', category: 'equipment', rank: Rank.Lv2, styles: ['礼装', '舞台', '高定'] },
    { name: '绮纹手套', icon: '🧤', description: '礼仪感与手感设计都偏上层市场。', category: 'equipment', rank: Rank.Lv2, styles: ['礼装', '商务', '会面'] },
    { name: '私席凭单', icon: '🎟️', description: '部分会馆和演出空间承认的私席票据。', category: 'equipment', rank: Rank.Lv3, styles: ['服务', '票据', '会面'] },
    { name: '会面香签', icon: '🪪', description: '高消费场所偏爱的预约信物。', category: 'equipment', rank: Rank.Lv2, styles: ['服务', '预约', '礼装'] },
  ],
  general: [
    { name: '压缩口粮', icon: '🍱', description: '适合长时间活动携带。', category: 'consumable', rank: Rank.Lv1, styles: ['补给', '常备', '通用'] },
    { name: '能量饮剂', icon: '🥤', description: '短时提神的标准饮剂。', category: 'consumable', rank: Rank.Lv1, styles: ['补给', '通用', '常备'] },
    { name: '过滤芯片', icon: '🧿', description: '一次性过滤模块的平价替代件。', category: 'material', rank: Rank.Lv1, styles: ['器件', '通用', '补给'] },
    { name: '便携照明片', icon: '🔦', description: '可折叠的薄片照明设备。', category: 'equipment', rank: Rank.Lv1, styles: ['器件', '通用', '便携'] },
    { name: '线路胶带', icon: '🧵', description: '临时封线和绝缘时常用。', category: 'material', rank: Rank.Lv1, styles: ['工具', '通用', '维修'] },
  ],
};

const BACKROOM_CATALOG: Record<ShopArchetype, CatalogItem[]> = {
  fashion: [
    { name: '仿夜莺礼序制服', icon: '🪽', description: '不能明面陈列的仿制机构制服。', category: 'equipment', rank: Rank.Lv4, styles: ['制服', '身份', '违禁'], tag: 'restricted' },
    { name: '空姐制服高仿套', icon: '✈️', description: '渠道货，高识别度但来源复杂。', category: 'equipment', rank: Rank.Lv3, styles: ['制服', '身份', '渠道'], tag: 'restricted' },
    { name: '绯幕情趣内衣', icon: '🩱', description: '只在暗柜里流转的高刺激夜场套装。', category: 'equipment', rank: Rank.Lv3, styles: ['夜场', '挑逗', '违禁'], tag: 'night' },
  ],
  cybertech: [
    { name: '阈值旁路片', icon: '🛰️', description: '不适合公开交易的旁路器件。', category: 'material', rank: Rank.Lv4, styles: ['芯片', '灰产', '旁路'], tag: 'restricted' },
    { name: '匿名写入针', icon: '🪡', description: '常见于灰网技术交易的写入工具。', category: 'equipment', rank: Rank.Lv3, styles: ['器件', '灰产', '匿名'], tag: 'restricted' },
  ],
  pharmacy: [
    { name: '深梦雾剂', icon: '🌫️', description: '只在黑市圈流通的高风险雾剂。', category: 'consumable', rank: Rank.Lv4, styles: ['药剂', '灰市', '夜场'], tag: 'restricted' },
    { name: '烬息烟卷', icon: '🔥', description: '带明显刺激性的高价烟草卷。', category: 'consumable', rank: Rank.Lv3, styles: ['烟草', '灰市', '高价'], tag: 'restricted' },
  ],
  luxury: [
    { name: '私宴徽章', icon: '🥀', description: '只在特定包厢圈内流通的会面信物。', category: 'equipment', rank: Rank.Lv4, styles: ['预约', '圈层', '违禁'], tag: 'restricted' },
  ],
  general: [
    { name: '代办暗柜券', icon: '🎫', description: '可以换取一次额外代办渠道。', category: 'equipment', rank: Rank.Lv3, styles: ['代办', '暗柜', '渠道'], tag: 'restricted' },
  ],
};

export const resolveShopRefreshEpoch = (elapsedMinutes: number): number => Math.max(1, Math.floor((elapsedMinutes || 0) / MINUTES_PER_DAY) + 1);

const filterCatalogByStyles = (items: CatalogItem[], styles: string[]): CatalogItem[] => {
  const normalized = new Set(styles);
  const matched = items.filter(item => item.styles.some(style => normalized.has(style)));
  return matched.length >= 4 ? matched : items;
};

const buildItemId = (shopId: string, epoch: number, slot: number, name: string): string => {
  const base = hashText(`${shopId}|${epoch}|${slot}|${name}`).toString(36);
  return `${shopId}_e${epoch}_${slot}_${base}`;
};

const parseItemEpoch = (itemId: string): number | null => {
  const matched = itemId.match(/_e(\d+)_/);
  return matched ? Number(matched[1]) : null;
};

const buildShopItem = (params: {
  shop: RuntimeShopRecord;
  epoch: number;
  slot: number;
  item: CatalogItem;
  availability: 'front' | 'backroom';
  shopName: string;
}): RuntimeShopItem => {
  const basePrice = rankBasePrice(params.item.rank);
  const priceCategory = resolveShopPriceCategory({
    shopType: params.shop.type,
    itemCategory: params.item.category,
    styleTags: params.item.styles,
    availability: params.availability,
    restricted: params.item.tag === 'restricted',
  });
  const price = buildRegionalRetailPrice({
    basePrice,
    category: priceCategory,
    districtId: params.shop.districtId,
    tier: params.shop.tier,
    discountTier: params.shop.discountTier,
    seedText: `${params.shop.refreshSeed}|${params.epoch}|${params.slot}|${params.item.name}`,
    extraFactor: params.availability === 'backroom' ? 1.18 : 1,
  });
  return {
    id: buildItemId(params.shop.id, params.epoch, params.slot, params.item.name),
    name: params.item.name,
    icon: params.item.icon,
    description: params.item.description,
    category: params.item.category,
    rank: params.item.rank,
    quantity: 1,
    slot: params.slot,
    shopTag: params.shopName,
    price,
    sourceEpoch: params.epoch,
    availability: params.availability,
    styleTags: params.item.styles,
  };
};

export const buildRuntimeShopView = (shop: RuntimeShopRecord, locationLabel: string, elapsedMinutes: number): RuntimeShopView => {
  const archetype = resolveArchetypeFromShopType(shop.type);
  const currentEpoch = Math.max(shop.refreshEpoch, resolveShopRefreshEpoch(elapsedMinutes));
  const previousEpoch = Math.max(1, currentEpoch - 1);
  const styles = shop.signatureStyle.length ? shop.signatureStyle : ['常规', '补给'];
  const currentFrontPool = filterCatalogByStyles(FRONT_CATALOG[archetype], styles);
  const previousFrontPool = filterCatalogByStyles(FRONT_CATALOG[archetype], styles);
  const currentRng = createRng(`${shop.refreshSeed}|front|${currentEpoch}`);
  const previousRng = createRng(`${shop.refreshSeed}|front|${previousEpoch}`);

  const frontItems = [
    ...shuffle(currentFrontPool, currentRng).slice(0, 4).map((item, index) =>
      buildShopItem({ shop, epoch: currentEpoch, slot: index + 1, item, availability: 'front', shopName: shop.name }),
    ),
    ...shuffle(previousFrontPool, previousRng).slice(0, 2).map((item, index) =>
      buildShopItem({ shop, epoch: previousEpoch, slot: index + 11, item, availability: 'front', shopName: shop.name }),
    ),
  ];

  const backroomItems =
    shop.hasBackroom
      ? shuffle(BACKROOM_CATALOG[archetype], createRng(`${shop.refreshSeed}|backroom|${currentEpoch}`))
          .slice(0, 1)
          .map((item, index) =>
            buildShopItem({ shop, epoch: currentEpoch, slot: index + 21, item, availability: 'backroom', shopName: shop.name }),
          )
      : [];

  const items = [...frontItems, ...backroomItems].filter(item => !shop.soldItemKeys.includes(item.id));

  return {
    id: `scene_${shop.id}`,
    shopId: shop.id,
    title: shop.name,
    archetype,
    locationLabel,
    summary: SHOP_SUMMARY[archetype],
    items,
    tier: shop.tier,
    loyalty: shop.loyalty,
    discountTier: shop.discountTier,
    hasBackroom: shop.hasBackroom,
    refreshEpoch: currentEpoch,
    refreshLabel: `第 ${currentEpoch} 期货架`,
    commissionHint: SHOP_COMMISSION_HINT[archetype],
  };
};

export const syncRuntimeShopEpoch = (
  shop: RuntimeShopRecord,
  elapsedMinutes: number,
): { shop: RuntimeShopRecord; changed: boolean } => {
  const nextEpoch = resolveShopRefreshEpoch(elapsedMinutes);
  if (nextEpoch <= shop.refreshEpoch) {
    return { shop, changed: false };
  }
  const keptSoldKeys = shop.soldItemKeys.filter(itemId => {
    const epoch = parseItemEpoch(itemId);
    return epoch !== null && epoch >= nextEpoch - 1;
  });
  return {
    shop: {
      ...shop,
      refreshEpoch: nextEpoch,
      soldItemKeys: keptSoldKeys,
    },
    changed: true,
  };
};

export const applyRuntimeShopPurchase = (
  shop: RuntimeShopRecord,
  itemId: string,
): { shop: RuntimeShopRecord; changed: boolean } => {
  if (shop.soldItemKeys.includes(itemId)) return { shop, changed: false };
  const loyalty = Math.min(24, shop.loyalty + 1);
  const discountTier = loyalty >= 9 ? 3 : loyalty >= 6 ? 2 : loyalty >= 3 ? 1 : 0;
  return {
    shop: {
      ...shop,
      loyalty,
      discountTier,
      soldItemKeys: [...shop.soldItemKeys, itemId].slice(-24),
    },
    changed: true,
  };
};
