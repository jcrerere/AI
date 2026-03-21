import { RuntimeShopTier, RuntimeShopType } from '../types';
import { resolveDistrictProfileFromLocation } from './cityRuntime';

export type EconomyPriceCategory =
  | 'food_basic'
  | 'housing_basic'
  | 'transit_basic'
  | 'daily_apparel'
  | 'status_apparel'
  | 'public_tech'
  | 'medical_basic'
  | 'nightlife_service'
  | 'black_market'
  | 'general_service';

type EconomyRegionKey =
  | 'airela'
  | 'north'
  | 'xiyu'
  | 'holy'
  | 'cuiling'
  | 'borderland'
  | 'dogtown'
  | 'qiling';

type EconomyProfile = {
  key: EconomyRegionKey;
  label: string;
  structureLabel: string;
  note: string;
  retailMultiplier: Record<EconomyPriceCategory, number>;
  essentialCashFactor: number;
  medianSpendFactor: number;
  averageSpendFactor: number;
  medianIncomeFactor: number;
  averageIncomeFactor: number;
  medianFoodFactor: number;
  averageFoodFactor: number;
};

export interface EconomyBenchmarkSnapshot {
  label: string;
  structureLabel: string;
  note: string;
  minimumDailyCash: number;
  minimumDailyEquivalent: number;
  medianDailyConsumption: number;
  averageDailyConsumption: number;
  medianDailyIncome: number;
  averageDailyIncome: number;
  engelFloor: number;
  engelMedian: number;
  engelAverage: number;
}

export interface EconomyScenePriceSnapshot {
  districtLabel: string;
  basicMeal: number;
  casualMeal: number;
  dateMeal: number;
  quickRideFare: number;
  commuteFare: number;
}

const round = (value: number): number => Math.max(0, Math.round(value));

const BASE_EQUIVALENT_BASKET = {
  food_basic: 14,
  housing_basic: 10,
  transit_basic: 4,
  daily_apparel: 3,
  medical_basic: 2,
  general_service: 1,
} as const;

const ECONOMY_PROFILES: Record<EconomyRegionKey, EconomyProfile> = {
  airela: {
    key: 'airela',
    label: '艾瑞拉区',
    structureLabel: '高福利稳盘',
    note: '女性生活稳定舒适，但消费礼序化，不鼓励诺丝式奢靡。',
    retailMultiplier: {
      food_basic: 0.98,
      housing_basic: 0.96,
      transit_basic: 0.88,
      daily_apparel: 1.0,
      status_apparel: 1.18,
      public_tech: 1.05,
      medical_basic: 0.95,
      nightlife_service: 1.16,
      black_market: 1.36,
      general_service: 0.96,
    },
    essentialCashFactor: 0.9,
    medianSpendFactor: 2.18,
    averageSpendFactor: 1.39,
    medianIncomeFactor: 1.18,
    averageIncomeFactor: 1.58,
    medianFoodFactor: 1.24,
    averageFoodFactor: 1.46,
  },
  north: {
    key: 'north',
    label: '诺丝区',
    structureLabel: '资本失衡盘',
    note: '公开技术和低端货有价格竞争，高定、夜场和身份消费极度昂贵，穷人常年被生活线追杀。',
    retailMultiplier: {
      food_basic: 1.06,
      housing_basic: 1.32,
      transit_basic: 1.18,
      daily_apparel: 0.94,
      status_apparel: 1.95,
      public_tech: 0.92,
      medical_basic: 1.14,
      nightlife_service: 1.72,
      black_market: 1.48,
      general_service: 1.05,
    },
    essentialCashFactor: 1.1,
    medianSpendFactor: 2.25,
    averageSpendFactor: 1.48,
    medianIncomeFactor: 0.96,
    averageIncomeFactor: 1.33,
    medianFoodFactor: 1.18,
    averageFoodFactor: 1.36,
  },
  xiyu: {
    key: 'xiyu',
    label: '汐屿区',
    structureLabel: '旅游回收盘',
    note: '外来消费、旅游服务和高待遇女性回流货币集中在这里，住宿餐饮与娱乐长期溢价。',
    retailMultiplier: {
      food_basic: 1.32,
      housing_basic: 1.4,
      transit_basic: 1.12,
      daily_apparel: 1.35,
      status_apparel: 2.18,
      public_tech: 1.16,
      medical_basic: 1.22,
      nightlife_service: 2.05,
      black_market: 1.66,
      general_service: 1.28,
    },
    essentialCashFactor: 1.08,
    medianSpendFactor: 2.3,
    averageSpendFactor: 1.44,
    medianIncomeFactor: 1.08,
    averageIncomeFactor: 1.26,
    medianFoodFactor: 1.22,
    averageFoodFactor: 1.48,
  },
  holy: {
    key: 'holy',
    label: '圣教区',
    structureLabel: '配给限购盘',
    note: '合法基础品依配给和限购流通，现金压力低于市场等值；超出额度后只能走高风险灰市。',
    retailMultiplier: {
      food_basic: 0.9,
      housing_basic: 0.92,
      transit_basic: 0.85,
      daily_apparel: 0.95,
      status_apparel: 1.45,
      public_tech: 1.52,
      medical_basic: 0.88,
      nightlife_service: 1.08,
      black_market: 2.85,
      general_service: 0.9,
    },
    essentialCashFactor: 0.64,
    medianSpendFactor: 1.82,
    averageSpendFactor: 1.24,
    medianIncomeFactor: 1.22,
    averageIncomeFactor: 1.18,
    medianFoodFactor: 1.05,
    averageFoodFactor: 1.16,
  },
  cuiling: {
    key: 'cuiling',
    label: '淬灵区',
    structureLabel: '工业贫压盘',
    note: '人工便宜但药品、成衣和进口件偏贵，低收入群体生活脆弱，工业事故会进一步抬高必要支出。',
    retailMultiplier: {
      food_basic: 1.46,
      housing_basic: 1.18,
      transit_basic: 1.16,
      daily_apparel: 1.34,
      status_apparel: 1.84,
      public_tech: 1.56,
      medical_basic: 1.48,
      nightlife_service: 1.18,
      black_market: 1.86,
      general_service: 1.18,
    },
    essentialCashFactor: 1.06,
    medianSpendFactor: 1.82,
    averageSpendFactor: 1.29,
    medianIncomeFactor: 0.88,
    averageIncomeFactor: 1.14,
    medianFoodFactor: 1.08,
    averageFoodFactor: 1.2,
  },
  borderland: {
    key: 'borderland',
    label: '交界地',
    structureLabel: '风险套利盘',
    note: '基础流通依赖风险运输和灰色补给，常住者支出高、收入波动大，冒险收益与死亡率一起抬升。',
    retailMultiplier: {
      food_basic: 1.52,
      housing_basic: 1.2,
      transit_basic: 1.14,
      daily_apparel: 1.4,
      status_apparel: 2.02,
      public_tech: 1.62,
      medical_basic: 1.56,
      nightlife_service: 1.36,
      black_market: 1.98,
      general_service: 1.24,
    },
    essentialCashFactor: 1.08,
    medianSpendFactor: 1.88,
    averageSpendFactor: 1.32,
    medianIncomeFactor: 0.9,
    averageIncomeFactor: 1.12,
    medianFoodFactor: 1.09,
    averageFoodFactor: 1.21,
  },
  dogtown: {
    key: 'dogtown',
    label: '狗镇',
    structureLabel: '灰产赌盘',
    note: '均价接近汐屿，但不是旅游溢价，而是风险、赌场、保护费和灰色渠道共同抬价。',
    retailMultiplier: {
      food_basic: 1.34,
      housing_basic: 1.32,
      transit_basic: 1.18,
      daily_apparel: 1.3,
      status_apparel: 2.12,
      public_tech: 1.44,
      medical_basic: 1.38,
      nightlife_service: 2.02,
      black_market: 2.04,
      general_service: 1.22,
    },
    essentialCashFactor: 1.09,
    medianSpendFactor: 2.2,
    averageSpendFactor: 1.49,
    medianIncomeFactor: 0.97,
    averageIncomeFactor: 1.26,
    medianFoodFactor: 1.18,
    averageFoodFactor: 1.34,
  },
  qiling: {
    key: 'qiling',
    label: '栖灵区',
    structureLabel: '封闭稀缺盘',
    note: '运输和流通都受限，高等级货、医疗与技术件长期高价，整体成本远高于帝国核心区。',
    retailMultiplier: {
      food_basic: 2.08,
      housing_basic: 1.86,
      transit_basic: 1.62,
      daily_apparel: 2.02,
      status_apparel: 2.84,
      public_tech: 2.38,
      medical_basic: 2.18,
      nightlife_service: 1.62,
      black_market: 2.58,
      general_service: 1.96,
    },
    essentialCashFactor: 1.05,
    medianSpendFactor: 1.92,
    averageSpendFactor: 1.36,
    medianIncomeFactor: 0.93,
    averageIncomeFactor: 1.12,
    medianFoodFactor: 1.07,
    averageFoodFactor: 1.16,
  },
};

const resolveEconomyKeyFromDistrictId = (districtId?: string): EconomyRegionKey => {
  const text = `${districtId || ''}`.trim();
  if (!text) return 'airela';
  if (text.startsWith('airela_')) return 'airela';
  if (text.startsWith('north_')) return 'north';
  if (text.startsWith('xiyu_')) return 'xiyu';
  if (text.startsWith('holy_')) return 'holy';
  if (text.startsWith('cuiling_')) return 'cuiling';
  if (text.startsWith('qiling_')) return 'qiling';
  if (text === 'borderland_dogtown') return 'dogtown';
  if (text.startsWith('borderland_')) return 'borderland';
  return 'airela';
};

const resolveEconomyKeyFromLocation = (locationLabel?: string): EconomyRegionKey => {
  const text = `${locationLabel || ''}`;
  if (!text.trim()) return 'airela';
  if (text.includes('狗镇')) return 'dogtown';
  if (text.includes('交界地')) return 'borderland';
  if (text.includes('诺丝区')) return 'north';
  if (text.includes('汐屿区')) return 'xiyu';
  if (text.includes('圣教区')) return 'holy';
  if (text.includes('淬灵区')) return 'cuiling';
  if (text.includes('栖灵区')) return 'qiling';
  if (text.includes('艾瑞拉区')) return 'airela';
  try {
    return resolveEconomyKeyFromDistrictId(resolveDistrictProfileFromLocation(text).id);
  } catch {
    return 'airela';
  }
};

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

const sumEquivalentBasket = (profile: EconomyProfile): number =>
  Object.entries(BASE_EQUIVALENT_BASKET).reduce((total, [category, base]) => {
    const next = profile.retailMultiplier[category as keyof typeof BASE_EQUIVALENT_BASKET as EconomyPriceCategory] || 1;
    return total + base * next;
  }, 0);

const foodEquivalent = (profile: EconomyProfile): number => BASE_EQUIVALENT_BASKET.food_basic * profile.retailMultiplier.food_basic;

const resolveProfile = (districtId?: string, locationLabel?: string): EconomyProfile => {
  const key = districtId ? resolveEconomyKeyFromDistrictId(districtId) : resolveEconomyKeyFromLocation(locationLabel);
  return ECONOMY_PROFILES[key];
};

export const buildEconomyBenchmarkSnapshot = (districtId?: string, locationLabel?: string): EconomyBenchmarkSnapshot => {
  const profile = resolveProfile(districtId, locationLabel);
  const minimumDailyEquivalent = round(sumEquivalentBasket(profile));
  const minimumDailyCash = round(minimumDailyEquivalent * profile.essentialCashFactor);
  const medianDailyConsumption = round(minimumDailyEquivalent * profile.medianSpendFactor);
  const averageDailyConsumption = round(medianDailyConsumption * profile.averageSpendFactor);
  const medianDailyIncome = round(medianDailyConsumption * profile.medianIncomeFactor);
  const averageDailyIncome = round(averageDailyConsumption * profile.averageIncomeFactor);
  const foodCost = foodEquivalent(profile);
  return {
    label: profile.label,
    structureLabel: profile.structureLabel,
    note: profile.note,
    minimumDailyCash,
    minimumDailyEquivalent,
    medianDailyConsumption,
    averageDailyConsumption,
    medianDailyIncome,
    averageDailyIncome,
    engelFloor: round((foodCost / Math.max(1, minimumDailyEquivalent)) * 100),
    engelMedian: round(((foodCost * profile.medianFoodFactor) / Math.max(1, medianDailyConsumption)) * 100),
    engelAverage: round(((foodCost * profile.averageFoodFactor) / Math.max(1, averageDailyConsumption)) * 100),
  };
};

export const buildEconomyDigest = (districtId?: string, locationLabel?: string): string => {
  const snapshot = buildEconomyBenchmarkSnapshot(districtId, locationLabel);
  return `${snapshot.structureLabel}|现${snapshot.minimumDailyCash}/等${snapshot.minimumDailyEquivalent}|中消${snapshot.medianDailyConsumption}|均消${snapshot.averageDailyConsumption}|均收${snapshot.averageDailyIncome}|恩${snapshot.engelMedian}%`;
};

export const resolveRetailMultiplier = (
  category: EconomyPriceCategory,
  districtId?: string,
  locationLabel?: string,
): number => resolveProfile(districtId, locationLabel).retailMultiplier[category];

export const resolveShopPriceCategory = (params: {
  shopType: RuntimeShopType;
  itemCategory: 'consumable' | 'equipment' | 'material' | 'quest';
  styleTags?: string[];
  availability?: 'front' | 'backroom';
  restricted?: boolean;
}): EconomyPriceCategory => {
  if (params.availability === 'backroom' || params.restricted) return 'black_market';

  if (params.shopType === 'clothing') {
    const styles = new Set(params.styleTags || []);
    const isStatus =
      styles.has('礼服') ||
      styles.has('身份') ||
      styles.has('制服') ||
      styles.has('夜场') ||
      styles.has('高定') ||
      styles.has('正式');
    return isStatus ? 'status_apparel' : 'daily_apparel';
  }

  if (params.shopType === 'chip') return 'public_tech';
  if (params.shopType === 'clinic' || params.shopType === 'drug') return 'medical_basic';
  if (params.shopType === 'restaurant') return 'food_basic';
  if (params.shopType === 'service') return 'nightlife_service';

  if (params.itemCategory === 'consumable') return 'food_basic';
  return 'general_service';
};

const resolveTierPriceFactor = (tier: RuntimeShopTier): number => {
  switch (tier) {
    case 'elite':
      return 1.45;
    case 'premium':
      return 1.22;
    case 'standard':
      return 1;
    default:
      return 0.86;
  }
};

const resolveDiscountFactor = (discountTier: number): number => {
  if (discountTier >= 3) return 0.84;
  if (discountTier === 2) return 0.9;
  if (discountTier === 1) return 0.95;
  return 1;
};

export const buildRegionalRetailPrice = (params: {
  basePrice: number;
  category: EconomyPriceCategory;
  districtId?: string;
  locationLabel?: string;
  tier: RuntimeShopTier;
  discountTier?: number;
  seedText: string;
  extraFactor?: number;
}): number => {
  const rng = createRng(params.seedText);
  const volatility = 0.92 + rng() * 0.2;
  const retailFactor = resolveRetailMultiplier(params.category, params.districtId, params.locationLabel);
  const tierFactor = resolveTierPriceFactor(params.tier);
  const discountFactor = resolveDiscountFactor(params.discountTier || 0);
  const extraFactor = params.extraFactor ?? 1;
  return Math.max(30, round(params.basePrice * retailFactor * tierFactor * volatility * discountFactor * extraFactor));
};

export const buildRegionalTransitFare = (params: {
  districtId?: string;
  locationLabel?: string;
  stopCount: number;
  transferCount?: number;
}): number => {
  const rideSpan = Math.max(1, params.stopCount);
  const transferCount = Math.max(0, params.transferCount || 0);
  const retailFactor = resolveRetailMultiplier('transit_basic', params.districtId, params.locationLabel);
  const baseline = 2 + Math.max(0, rideSpan - 1) * 1.2 + transferCount * 0.8;
  return Math.max(2, round(baseline * retailFactor));
};

export const buildEconomyScenePrices = (districtId?: string, locationLabel?: string): EconomyScenePriceSnapshot => {
  const foodFactor = resolveRetailMultiplier('food_basic', districtId, locationLabel);
  const serviceFactor = resolveRetailMultiplier('general_service', districtId, locationLabel);
  const nightlifeFactor = resolveRetailMultiplier('nightlife_service', districtId, locationLabel);
  const weightedMealFactor = foodFactor * 0.72 + serviceFactor * 0.28;
  const weightedDateFactor = foodFactor * 0.45 + nightlifeFactor * 0.55;
  return {
    districtLabel: buildEconomyBenchmarkSnapshot(districtId, locationLabel).label,
    basicMeal: Math.max(6, round(8 * foodFactor)),
    casualMeal: Math.max(12, round(18 * weightedMealFactor)),
    dateMeal: Math.max(20, round(42 * weightedDateFactor)),
    quickRideFare: buildRegionalTransitFare({ districtId, locationLabel, stopCount: 1 }),
    commuteFare: buildRegionalTransitFare({ districtId, locationLabel, stopCount: 4 }),
  };
};
