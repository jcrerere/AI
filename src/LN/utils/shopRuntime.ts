import { ClothingProfile, Item, Rank, RuntimeShopRecord, RuntimeShopType } from '../types';
import { buildEconomyScenePrices, buildRegionalRetailPrice, resolveShopPriceCategory } from './economyRuntime';

export interface RuntimeShopItem extends Item {
  price: number;
  slot: number;
  shopTag: string;
  sourceEpoch: number;
  availability: 'front' | 'backroom';
  styleTags: string[];
  clothingProfile?: ClothingProfile;
}

export interface RuntimeShopView {
  id: string;
  shopId: string;
  title: string;
  archetype: 'fashion' | 'cybertech' | 'pharmacy' | 'luxury' | 'general';
  type: RuntimeShopType;
  locationLabel: string;
  summary: string;
  items: RuntimeShopItem[];
  shopMode: 'retail' | 'restaurant';
  tier: RuntimeShopTier;
  loyalty: number;
  discountTier: number;
  hasBackroom: boolean;
  refreshEpoch: number;
  refreshLabel: string;
  commissionHint: string;
  venueLabel?: string;
  specialtyLabel?: string;
  ownerLabel?: string;
  dateFriendly?: boolean;
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

const resolveClothingQuality = (rank: Rank, tag?: CatalogItem['tag']): ClothingProfile['quality'] => {
  if (tag === 'restricted') return rank === Rank.Lv5 ? '定制' : '名牌';
  switch (rank) {
    case Rank.Lv1:
      return '标准';
    case Rank.Lv2:
      return '精制';
    case Rank.Lv3:
      return '名牌';
    case Rank.Lv4:
    case Rank.Lv5:
      return '定制';
    default:
      return '标准';
  }
};

const inferClothingCategory = (item: CatalogItem): string => {
  const styles = new Set(item.styles);
  if (styles.has('制服')) return '制服';
  if (styles.has('礼服') || styles.has('商务') || styles.has('正式')) return '礼装';
  if (styles.has('夜场') || styles.has('挑逗')) return '夜场装';
  if (styles.has('功能') || styles.has('机能') || styles.has('行动')) return '功能装';
  if (styles.has('配件')) return '内搭/配件';
  return '常服';
};

const inferClothingSilhouette = (item: CatalogItem): string => {
  const styles = new Set(item.styles);
  if (styles.has('商务') || styles.has('正式')) return '修身礼序';
  if (styles.has('制服')) return '身份制式';
  if (styles.has('夜场')) return '贴身张扬';
  if (styles.has('功能') || styles.has('机能')) return '机能行动';
  if (styles.has('学院')) return '学院分层';
  return '日常利落';
};

const inferClothingImpressions = (item: CatalogItem): string[] => {
  const styles = new Set(item.styles);
  const next = new Set<string>();
  if (styles.has('体面') || styles.has('正式')) next.add('体面');
  if (styles.has('身份') || styles.has('制服')) next.add('权威');
  if (styles.has('商务')) next.add('克制');
  if (styles.has('学院')) next.add('清爽');
  if (styles.has('夜场') || styles.has('挑逗')) next.add('撩拨');
  if (styles.has('机能') || styles.has('行动')) next.add('利落');
  if (!next.size) next.add('日常');
  return Array.from(next).slice(0, 3);
};

const inferClothingScenes = (item: CatalogItem): string[] => {
  const styles = new Set(item.styles);
  const next = new Set<string>();
  if (styles.has('日常') || styles.has('常服')) next.add('日常出行');
  if (styles.has('商务') || styles.has('正式')) next.add('正式会面');
  if (styles.has('礼服')) next.add('宴席礼序');
  if (styles.has('制服') || styles.has('身份')) next.add('身份伪装');
  if (styles.has('夜场') || styles.has('挑逗')) next.add('夜场邀约');
  if (styles.has('功能') || styles.has('机能') || styles.has('行动')) next.add('行动任务');
  if (!next.size) next.add('公开场合');
  return Array.from(next).slice(0, 3);
};

const inferClothingCautions = (item: CatalogItem): string[] => {
  const styles = new Set(item.styles);
  const cautions = new Set<string>();
  if (styles.has('礼服') || styles.has('正式')) cautions.add('不适合追逐与近战');
  if (styles.has('夜场') || styles.has('挑逗')) cautions.add('不适合官方场合');
  if (styles.has('制服') || item.tag === 'restricted') cautions.add('来源敏感，容易引来盘查');
  if (styles.has('配件')) cautions.add('更适合搭配，不建议单独作为主装');
  return Array.from(cautions).slice(0, 2);
};

const buildClothingProfile = (item: CatalogItem): ClothingProfile => ({
  categoryLabel: inferClothingCategory(item),
  quality: resolveClothingQuality(item.rank, item.tag),
  silhouette: inferClothingSilhouette(item),
  impressionTags: inferClothingImpressions(item),
  sceneTags: inferClothingScenes(item),
  cautionTags: inferClothingCautions(item),
  sourceLabel:
    item.tag === 'restricted'
      ? '暗柜渠道'
      : item.tag === 'uniform'
        ? '制式线'
        : item.tag === 'formal'
          ? '礼序线'
          : item.tag === 'night'
            ? '夜场线'
            : '常规货架',
});

const SHOP_SUMMARY: Record<ShopArchetype, string> = {
  fashion: '固定店面货架，主打穿搭、礼装、制服和夜场变体，库存按周期滚动更新。',
  cybertech: '固定店面货架，主打芯片、样机、接口和公开器材，老货会在柜台停留一段时间。',
  pharmacy: '固定店面货架，主打药剂、恢复、诊疗与黑市常备补给，周期更新但不整店清空。',
  luxury: '固定店面货架，主打高定、服务票据和高消费场景用品，暗柜货更重渠道。',
  general: '固定店面货架，承接一般购物、临时补给和非专门场景的基础采购。',
};

const SHOP_COMMISSION_HINT: Record<ShopArchetype, string> = {
  fashion: '例如：定制礼服 / 代办夜莺制服 / 进货空姐制服',
  cybertech: '例如：帮我留一枚样机 / 找一套旧式接口件',
  pharmacy: '例如：帮我留一套稳态针剂 / 准备一批恢复贴片',
  luxury: '例如：准备一套宴会装 / 留一间私席包厢',
  general: '例如：帮我留货 / 下期进一批我指定的东西',
};

const RESTAURANT_MENU_CATALOG: CatalogItem[] = [
  { name: '晨港汤食', icon: '🥣', description: '偏基础与保温的热汤套餐，适合补一顿稳妥正餐。', category: 'consumable', rank: Rank.Lv1, styles: ['基础餐饮', '常餐', '热菜'] },
  { name: '盐烤白鳞', icon: '🐟', description: '带明显地方风味的主菜，常见于景观和海湾餐厅。', category: 'consumable', rank: Rank.Lv2, styles: ['日常餐饮', '海味', '热菜'] },
  { name: '镜糖甜塔', icon: '🍰', description: '甜点与饮品一起出，偏约会和会面场景。', category: 'consumable', rank: Rank.Lv2, styles: ['日常餐饮', '甜点', '饮品'] },
  { name: '礼序轻席', icon: '🍱', description: '份量克制但摆盘考究，更强调礼仪感和面子。', category: 'consumable', rank: Rank.Lv3, styles: ['约场餐饮', '会席', '轻食'] },
  { name: '霓雾调酒', icon: '🍸', description: '夜场餐吧偏爱的发光调酒，适合拖长谈话时间。', category: 'consumable', rank: Rank.Lv2, styles: ['约场餐饮', '夜饮', '饮品'] },
  { name: '双人包席', icon: '🍽️', description: '适合正式邀约的双人定席，包含主菜与收尾甜点。', category: 'consumable', rank: Rank.Lv3, styles: ['约场餐饮', '双人', '会席'] },
];

type RestaurantProfile = {
  venueLabel: string;
  specialtyLabel: string;
  ownerLabel: string;
  dateFriendly: boolean;
  menuLabel: string;
  commissionHint: string;
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
    { name: '静息贴片', icon: '🩹', description: '用于稳定呼吸和脉搏的小型恢复贴片。', category: 'consumable', rank: Rank.Lv1, styles: ['药剂', '恢复', '常备'] },
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
    { name: '灼息抑制剂', icon: '🔥', description: '灰市流通的高强度抑制剂，能迅速压下失控边缘。', category: 'consumable', rank: Rank.Lv3, styles: ['药剂', '灰市', '高价'], tag: 'restricted' },
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

const resolveRestaurantProfile = (shop: RuntimeShopRecord, locationLabel: string): RestaurantProfile => {
  const text = `${locationLabel} ${shop.name}`;
  const venueLabel =
    /(酒吧|夜场)/.test(text)
      ? '夜饮餐吧'
      : /(咖啡|茶屋)/.test(text)
        ? '会面咖啡馆'
        : /(会馆|包厢)/.test(text)
          ? '包厢会席馆'
          : /(食堂)/.test(text)
            ? '配给食堂'
            : '地方餐厅';
  const specialtyLabel =
    shop.signatureStyle.includes('海味')
      ? '海味主菜'
      : shop.signatureStyle.includes('夜饮')
        ? '调酒与夜场热菜'
        : shop.signatureStyle.includes('礼序')
          ? '礼序会席'
          : shop.signatureStyle.includes('配给')
            ? '配给汤食'
            : '常餐与热菜';
  const ownerLabel =
    shop.loyalty >= 9 ? '老板已经把你当熟面孔。' : shop.loyalty >= 4 ? '老板记得你的口味。' : '老板只记得你大概来过。';
  return {
    venueLabel,
    specialtyLabel,
    ownerLabel,
    dateFriendly: /(酒吧|咖啡|会馆|包厢|景观)/.test(text) || shop.tier === 'premium' || shop.tier === 'elite',
    menuLabel: shop.tier === 'elite' || shop.tier === 'premium' ? '当期主菜单与包席' : '当期菜单',
    commissionHint:
      shop.tier === 'elite' || shop.tier === 'premium'
        ? '例如：周末留双人桌 / 预留包厢 / 提前备一套会席'
        : '例如：今晚留两位 / 留一道招牌菜 / 明天中午留桌',
  };
};

const buildRestaurantMenuPrice = (shop: RuntimeShopRecord, item: CatalogItem, epoch: number, slot: number): number => {
  const scenePrices = buildEconomyScenePrices(shop.districtId);
  const tierFactor = shop.tier === 'elite' ? 1.42 : shop.tier === 'premium' ? 1.2 : shop.tier === 'street' ? 0.84 : 1;
  const discountFactor = shop.discountTier >= 3 ? 0.82 : shop.discountTier === 2 ? 0.9 : shop.discountTier === 1 ? 0.95 : 1;
  const rng = createRng(`${shop.refreshSeed}|restaurant|${epoch}|${slot}|${item.name}`);
  const volatility = 0.96 + rng() * 0.14;
  const styles = new Set(item.styles);
  const base =
    styles.has('基础餐饮')
      ? scenePrices.basicMeal
      : styles.has('约场餐饮') || styles.has('会席') || styles.has('双人')
        ? scenePrices.dateMeal
        : scenePrices.casualMeal;
  return Math.max(6, Math.round(base * tierFactor * discountFactor * volatility));
};

const buildShopItem = (params: {
  shop: RuntimeShopRecord;
  epoch: number;
  slot: number;
  item: CatalogItem;
  availability: 'front' | 'backroom';
  shopName: string;
}): RuntimeShopItem => {
  const clothingProfile = params.shop.type === 'clothing' ? buildClothingProfile(params.item) : undefined;
  const priceCategory = resolveShopPriceCategory({
    shopType: params.shop.type,
    itemCategory: params.item.category,
    styleTags: params.item.styles,
    availability: params.availability,
    restricted: params.item.tag === 'restricted',
  });
  const price =
    params.shop.type === 'restaurant'
      ? buildRestaurantMenuPrice(params.shop, params.item, params.epoch, params.slot)
      : buildRegionalRetailPrice({
          basePrice: rankBasePrice(params.item.rank),
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
    clothingProfile,
  };
};

export const buildRuntimeShopView = (shop: RuntimeShopRecord, locationLabel: string, elapsedMinutes: number): RuntimeShopView => {
  const archetype = resolveArchetypeFromShopType(shop.type);
  const currentEpoch = Math.max(shop.refreshEpoch, resolveShopRefreshEpoch(elapsedMinutes));
  const previousEpoch = Math.max(1, currentEpoch - 1);
  const styles = shop.signatureStyle.length ? shop.signatureStyle : ['常规', '补给'];
  const frontCatalog = shop.type === 'restaurant' ? RESTAURANT_MENU_CATALOG : FRONT_CATALOG[archetype];
  const currentFrontPool = filterCatalogByStyles(frontCatalog, styles);
  const previousFrontPool = filterCatalogByStyles(frontCatalog, styles);
  const currentRng = createRng(`${shop.refreshSeed}|front|${currentEpoch}`);
  const previousRng = createRng(`${shop.refreshSeed}|front|${previousEpoch}`);
  const restaurantProfile = shop.type === 'restaurant' ? resolveRestaurantProfile(shop, locationLabel) : null;

  const frontItems = [
    ...shuffle(currentFrontPool, currentRng).slice(0, 4).map((item, index) =>
      buildShopItem({ shop, epoch: currentEpoch, slot: index + 1, item, availability: 'front', shopName: shop.name }),
    ),
    ...shuffle(previousFrontPool, previousRng).slice(0, 2).map((item, index) =>
      buildShopItem({ shop, epoch: previousEpoch, slot: index + 11, item, availability: 'front', shopName: shop.name }),
    ),
  ];

  const backroomItems =
    shop.hasBackroom && shop.type !== 'restaurant'
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
    type: shop.type,
    locationLabel,
    summary: shop.type === 'restaurant' ? '固定餐厅菜单，会按周期加新菜、保留一部分旧菜，并在熟客折扣下形成稳定的生活消费入口。' : SHOP_SUMMARY[archetype],
    items,
    shopMode: shop.type === 'restaurant' ? 'restaurant' : 'retail',
    tier: shop.tier,
    loyalty: shop.loyalty,
    discountTier: shop.discountTier,
    hasBackroom: shop.type === 'restaurant' ? false : shop.hasBackroom,
    refreshEpoch: currentEpoch,
    refreshLabel: shop.type === 'restaurant' ? `第 ${currentEpoch} 期菜单` : `第 ${currentEpoch} 期货架`,
    commissionHint: restaurantProfile?.commissionHint || SHOP_COMMISSION_HINT[archetype],
    venueLabel: restaurantProfile?.venueLabel,
    specialtyLabel: restaurantProfile?.specialtyLabel,
    ownerLabel: restaurantProfile?.ownerLabel,
    dateFriendly: restaurantProfile?.dateFriendly,
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

export const applyRuntimeRestaurantVisit = (shop: RuntimeShopRecord): { shop: RuntimeShopRecord; changed: boolean } => {
  const loyalty = Math.min(24, shop.loyalty + 1);
  const discountTier = loyalty >= 9 ? 3 : loyalty >= 6 ? 2 : loyalty >= 3 ? 1 : 0;
  if (loyalty === shop.loyalty && discountTier === shop.discountTier) {
    return { shop, changed: false };
  }
  return {
    shop: {
      ...shop,
      loyalty,
      discountTier,
    },
    changed: true,
  };
};
