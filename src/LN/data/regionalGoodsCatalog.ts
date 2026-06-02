import { Item, ItemCommodityProfile, Rank } from '../types';

export interface RegionalGoodsTemplate {
  id: string;
  region: string;
  name: string;
  icon: string;
  description: string;
  summary: string;
  riskLabel: string;
  note: string;
  category: Item['category'];
  rank: Rank;
  commodityProfile: ItemCommodityProfile;
}

type RegionalGoodsEntry = {
  label: string;
  riskLabel: string;
  summary: string;
  note: string;
  item: Omit<Item, 'id' | 'quantity'>;
};

const normalizeRegionName = (value?: string): string => {
  const text = `${value || ''}`.trim();
  if (!text) return '';
  if (/汐屿|白湾|潮镜|xiyu/i.test(text)) return '汐屿区';
  return text;
};

const REGIONAL_GOODS_LIBRARY: Record<string, RegionalGoodsTemplate> = {
  xiyu_tidal_bath_salt: {
    id: 'xiyu_tidal_bath_salt',
    region: '汐屿区',
    name: '白湾潮浴香盐',
    icon: '🧂',
    description:
      '白湾浴场、旅舍和短租海景房最稳定的消耗品之一。它把潮盐灵矿、海雾香精和微量舒缓剂压成可直接溶浴的香盐，能让皮肤长期带着湿热、柔软和被海风舔过一样的余味。',
    summary: '汐屿区海滨旅宿和开放浴场最稳定的度假耗材。',
    riskLabel: '微醺放松',
    note: '它卖的是海风、热水和夜生活的气氛，不是调教用品；很多外地游客把它当成汐屿区最标准的伴手礼。',
    category: 'consumable',
    rank: Rank.Lv2,
    commodityProfile: {
      rarity: '少见',
      basePrice: 220,
      marketCategory: 'nightlife_service',
      sourceRegion: '汐屿区',
      sourceKind: '地区制品',
      legalStatus: '合法',
      marketTier: 'premium',
      weightKg: 0.24,
      deliveryMethods: ['潮浴池', '热水溶浴', '贴肤盐敷'],
      activeComponents: ['潮盐灵矿', '海雾香精', '低剂量舒缓素'],
      traitTags: ['海滨旅宿', '轻度助兴', '皮肤留香'],
      noteLines: ['白湾片区旅舍常把它和双人浴池套餐一起售卖。'],
    },
  },
  xiyu_sweet_tide_pastilles: {
    id: 'xiyu_sweet_tide_pastilles',
    region: '汐屿区',
    name: '白湾甜潮糖片',
    icon: '🍬',
    description:
      '外层是普通旅游糖片，内层包着会缓慢释出的海潮甜剂和暖身配方。它常卖给晕船游客、观潮夜游的伴侣和酒吧散场后的双人短住客，用来压海风、提精神和抬一点暧昧气氛。',
    summary: '白湾最日常的夜游零食糖片。',
    riskLabel: '微醺回甘',
    note: '在汐屿区它更像带一点海盐和酒气的旅游零食，不是诺丝区黑市里那种拿来驯人的药片。',
    category: 'consumable',
    rank: Rank.Lv1,
    commodityProfile: {
      rarity: '常见',
      basePrice: 88,
      marketCategory: 'nightlife_service',
      sourceRegion: '汐屿区',
      sourceKind: '地区制品',
      legalStatus: '合法',
      marketTier: 'standard',
      weightKg: 0.05,
      deliveryMethods: ['含服', '酒后压片', '旅途分发'],
      activeComponents: ['海潮甜剂', '暖身缓释胶'],
      traitTags: ['夜游零食', '轻度助兴', '观潮'],
      noteLines: ['白湾口岸的小店和旅舍前台几乎都会摆上一盒。'],
    },
  },
  xiyu_mistkiss_perfume: {
    id: 'xiyu_mistkiss_perfume',
    region: '汐屿区',
    name: '潮镜雾吻香水',
    icon: '🧴',
    description:
      '潮镜片区豪宅圈最爱的一类定制香。前调像海雾和冷玻璃，后调会慢慢落到湿发、体温和床边织物上，让人闻起来像刚被夜潮和拥抱一起泡过。',
    summary: '潮镜豪宅区标志性的湿冷留痕香。',
    riskLabel: '留香标记',
    note: '它贵的不是香，而是“我刚从潮镜出来”的海景夜生活气味。很多旅客会在离岛前补喷一层，像把度假尾声封进皮肤里。',
    category: 'consumable',
    rank: Rank.Lv3,
    commodityProfile: {
      rarity: '稀有',
      basePrice: 520,
      marketCategory: 'status_apparel',
      sourceRegion: '汐屿区',
      sourceKind: '地区制品',
      legalStatus: '合法',
      marketTier: 'premium',
      weightKg: 0.08,
      deliveryMethods: ['喷雾留香', '织物浸染', '颈侧点涂'],
      activeComponents: ['海雾冷香基底', '体温增幅留香剂'],
      traitTags: ['高端香氛', '旅拍', '海景夜游'],
      noteLines: ['潮镜别墅区的礼宾柜台往往只卖给熟客。'],
    },
  },
  xiyu_dual_stay_band: {
    id: 'xiyu_dual_stay_band',
    region: '汐屿区',
    name: '白湾双人潮宿腕带',
    icon: '🎟️',
    description:
      '白湾旅舍、夜渡码头和海景温泉常见的双人腕带，绑定后可以共用潮宿折扣、夜游检票和部分浴场包厢。它是汐屿区最标准的“今晚一起玩到天亮”通行物，不带任何主从意味。',
    summary: '开放旅游区最常见的双人夜宿凭证。',
    riskLabel: '行程上头',
    note: '情侣、炮友、临时旅伴都能买，重点是省事、好看、方便一起续下一摊。',
    category: 'equipment',
    rank: Rank.Lv2,
    commodityProfile: {
      rarity: '少见',
      basePrice: 260,
      marketCategory: 'nightlife_service',
      sourceRegion: '汐屿区',
      sourceKind: '地区制品',
      legalStatus: '合法',
      marketTier: 'premium',
      weightKg: 0.03,
      deliveryMethods: ['双人入住', '夜渡检票', '潮宿通行'],
      activeComponents: ['潮宿识别晶膜', '夜航检票编码'],
      traitTags: ['双人旅行', '夜宿通行', '开放旅游'],
      noteLines: ['很多游客会把它留到返程后，当成一段海边艳遇的纪念票。'],
    },
  },
  xiyu_tidemirror_dreamchip: {
    id: 'xiyu_tidemirror_dreamchip',
    region: '汐屿区',
    name: '伴潮留影片',
    icon: '🎞️',
    description:
      '把海风夜游、酒吧散场、海景短住和自愿缠绵的第一人称感知剪成可反复回放的留影片。它专门卖给想把一段海滨艳遇、度假恋游或短宿激情保存下来的游客。',
    summary: '汐屿区高消费旅游里最受欢迎的感知纪念品。',
    riskLabel: '回味成瘾',
    note: '它卖的是度假氛围和回忆浓度，不是奴化模板；这点和诺丝区黑市超梦是两套逻辑。',
    category: 'equipment',
    rank: Rank.Lv4,
    commodityProfile: {
      rarity: '珍稀',
      basePrice: 1180,
      marketCategory: 'nightlife_service',
      sourceRegion: '汐屿区',
      sourceKind: '地区制品',
      legalStatus: '灰市',
      marketTier: 'elite',
      weightKg: 0.03,
      deliveryMethods: ['留影贝片', '感知眼罩', '旅宿私网回放'],
      activeComponents: ['海景恋游记忆片段', '情绪润滑脚本', '潮汐环境声纹'],
      traitTags: ['第一人称纪念', '海滨恋游', '开放旅游'],
      noteLines: ['白湾旅舍和潮镜礼宾通常只把完整版卖给高消费熟客。'],
    },
  },
};

const REGIONAL_GOODS_ORDER: Record<string, string[]> = {
  汐屿区: [
    'xiyu_tidal_bath_salt',
    'xiyu_sweet_tide_pastilles',
    'xiyu_mistkiss_perfume',
    'xiyu_dual_stay_band',
    'xiyu_tidemirror_dreamchip',
  ],
};

export const getRegionalGoodsTemplates = (region?: string): RegionalGoodsTemplate[] => {
  const normalized = normalizeRegionName(region);
  if (!normalized) return [];
  const ids = REGIONAL_GOODS_ORDER[normalized] || [];
  return ids.map(id => REGIONAL_GOODS_LIBRARY[id]).filter(Boolean);
};

export const materializeRegionalGood = (
  templateId: string,
  options?: {
    id?: string;
    quantity?: number;
  },
): Item | null => {
  const template = REGIONAL_GOODS_LIBRARY[templateId];
  if (!template) return null;
  return {
    id: options?.id || `regional_${template.id}`,
    name: template.name,
    quantity: Math.max(1, options?.quantity || 1),
    icon: template.icon,
    description: template.description,
    category: template.category,
    rank: template.rank,
    commodityProfile: { ...template.commodityProfile },
  };
};

export const buildRegionalGoodsEntries = (region: string): RegionalGoodsEntry[] =>
  getRegionalGoodsTemplates(region).map(template => ({
    label: template.name,
    riskLabel: template.riskLabel,
    summary: template.summary,
    note: template.note,
    item: {
      name: template.name,
      icon: template.icon,
      description: template.description,
      category: template.category,
      rank: template.rank,
      commodityProfile: { ...template.commodityProfile },
    },
  }));
