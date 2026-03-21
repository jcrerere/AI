import { PlayerStats, SurvivalGauge } from '../types';

export type LifeAdvanceMode = 'dialogue' | 'travel' | 'rest' | 'meal';

export interface LifeAdvancePreview {
  mode: LifeAdvanceMode;
  minutes: number;
  staminaDelta: number;
  satietyDelta: number;
}

export interface LifeAdvanceResult extends LifeAdvancePreview {
  stats: PlayerStats;
  digest: string;
  statusTags: string[];
}

const DEFAULT_STAMINA: SurvivalGauge = { current: 82, max: 100 };
const DEFAULT_SATIETY: SurvivalGauge = { current: 76, max: 100 };

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

const normalizeGauge = (raw: Partial<SurvivalGauge> | undefined, fallback: SurvivalGauge): SurvivalGauge => {
  const max = clamp(Math.round(raw?.max ?? fallback.max), 1, 999);
  const current = clamp(Math.round(raw?.current ?? fallback.current), 0, max);
  return { current, max };
};

export const ensurePlayerLifeStats = (stats: PlayerStats): PlayerStats => ({
  ...stats,
  stamina: normalizeGauge((stats as Partial<PlayerStats>).stamina, DEFAULT_STAMINA),
  satiety: normalizeGauge((stats as Partial<PlayerStats>).satiety, DEFAULT_SATIETY),
});

const describeStamina = (value: number, max: number): string => {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) return '体力充沛';
  if (ratio >= 0.45) return '体力稳定';
  if (ratio >= 0.2) return '轻度疲劳';
  return '体力透支';
};

const describeSatiety = (value: number, max: number): string => {
  const ratio = max > 0 ? value / max : 0;
  if (ratio >= 0.75) return '饱腹稳定';
  if (ratio >= 0.45) return '饱腹可维持';
  if (ratio >= 0.2) return '轻饥';
  return '饥饿';
};

export const buildLifeStatusTags = (stats: PlayerStats): string[] => {
  const next = ensurePlayerLifeStats(stats);
  const tags: string[] = [];
  const staminaRatio = next.stamina.max > 0 ? next.stamina.current / next.stamina.max : 0;
  const satietyRatio = next.satiety.max > 0 ? next.satiety.current / next.satiety.max : 0;
  if (staminaRatio < 0.2) tags.push('体力透支');
  else if (staminaRatio < 0.45) tags.push('轻度疲劳');
  if (satietyRatio < 0.2) tags.push('饥饿');
  else if (satietyRatio < 0.45) tags.push('轻饥');
  return tags;
};

export const buildLifeStateDigest = (stats: PlayerStats): string => {
  const next = ensurePlayerLifeStats(stats);
  const staminaLabel = describeStamina(next.stamina.current, next.stamina.max);
  const satietyLabel = describeSatiety(next.satiety.current, next.satiety.max);
  const recommendations: string[] = [];
  if (next.stamina.current / next.stamina.max < 0.45) recommendations.push('建议休整');
  if (next.satiety.current / next.satiety.max < 0.45) recommendations.push('建议补给');
  return `体力 ${next.stamina.current}/${next.stamina.max}[${staminaLabel}] | 饱腹 ${next.satiety.current}/${next.satiety.max}[${satietyLabel}]${recommendations.length ? ` | ${recommendations.join(' / ')}` : ''}`;
};

const buildDialoguePreview = (minutes: number): LifeAdvancePreview => ({
  mode: 'dialogue',
  minutes,
  staminaDelta: minutes < 15 ? 0 : -Math.max(1, Math.round(minutes / 35)),
  satietyDelta: minutes < 60 ? 0 : -Math.max(1, Math.round(minutes / 90)),
});

const buildTravelPreview = (minutes: number): LifeAdvancePreview => ({
  mode: 'travel',
  minutes,
  staminaDelta: minutes <= 0 ? 0 : -Math.max(1, Math.round(minutes / 30)),
  satietyDelta: minutes < 30 ? 0 : -Math.max(1, Math.round(minutes / 80)),
});

const buildRestPreview = (minutes: number): LifeAdvancePreview => ({
  mode: 'rest',
  minutes,
  staminaDelta: minutes <= 0 ? 0 : Math.max(18, Math.round(minutes / 10)),
  satietyDelta: minutes <= 0 ? 0 : -Math.max(1, Math.round(minutes / 150)),
});

const resolveMealMinutes = (price: number, styleTags: string[]): number => {
  const styles = new Set(styleTags);
  if (styles.has('双人') || styles.has('会席') || styles.has('约场餐饮')) return 80;
  if (styles.has('饮品') && !styles.has('热菜')) return 35;
  if (price >= 120) return 75;
  if (price >= 60) return 55;
  return 35;
};

const buildMealPreview = (price: number, styleTags: string[]): LifeAdvancePreview => {
  const minutes = resolveMealMinutes(price, styleTags);
  const styles = new Set(styleTags);
  let satietyGain = price >= 120 ? 40 : price >= 60 ? 30 : price >= 30 ? 22 : 14;
  let staminaGain = price >= 120 ? 10 : price >= 60 ? 7 : price >= 30 ? 5 : 3;
  if (styles.has('饮品') && !styles.has('热菜')) {
    satietyGain = Math.max(8, satietyGain - 6);
    staminaGain += 3;
  }
  if (styles.has('热菜') || styles.has('海味')) satietyGain += 4;
  if (styles.has('双人') || styles.has('会席') || styles.has('约场餐饮')) staminaGain += 3;
  return {
    mode: 'meal',
    minutes,
    staminaDelta: staminaGain,
    satietyDelta: satietyGain,
  };
};

export const previewLifeAdvance = (params: {
  mode: LifeAdvanceMode;
  minutes: number;
  mealPrice?: number;
  styleTags?: string[];
}): LifeAdvancePreview => {
  switch (params.mode) {
    case 'travel':
      return buildTravelPreview(params.minutes);
    case 'rest':
      return buildRestPreview(params.minutes);
    case 'meal':
      return buildMealPreview(params.mealPrice ?? 0, params.styleTags ?? []);
    case 'dialogue':
    default:
      return buildDialoguePreview(params.minutes);
  }
};

export const applyLifeAdvance = (stats: PlayerStats, params: {
  mode: LifeAdvanceMode;
  minutes: number;
  mealPrice?: number;
  styleTags?: string[];
}): LifeAdvanceResult => {
  const next = ensurePlayerLifeStats(stats);
  const preview = previewLifeAdvance(params);
  const stamina = normalizeGauge(
    {
      current: next.stamina.current + preview.staminaDelta,
      max: next.stamina.max,
    },
    next.stamina,
  );
  const satiety = normalizeGauge(
    {
      current: next.satiety.current + preview.satietyDelta,
      max: next.satiety.max,
    },
    next.satiety,
  );
  const updated = ensurePlayerLifeStats({
    ...next,
    stamina,
    satiety,
  });
  return {
    ...preview,
    stats: updated,
    digest: buildLifeStateDigest(updated),
    statusTags: buildLifeStatusTags(updated),
  };
};

export const buildLifeChangeSummary = (result: LifeAdvancePreview): string => {
  const parts: string[] = [];
  if (result.staminaDelta !== 0) parts.push(`体力${result.staminaDelta > 0 ? '+' : ''}${result.staminaDelta}`);
  if (result.satietyDelta !== 0) parts.push(`饱腹${result.satietyDelta > 0 ? '+' : ''}${result.satietyDelta}`);
  if (result.minutes > 0) parts.push(`时间+${result.minutes}分钟`);
  return parts.join(' / ');
};
