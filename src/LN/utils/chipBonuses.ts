import { Chip } from '../types';

const SIX_DIM_KEYS: Array<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力'> = [
  '力量',
  '敏捷',
  '体质',
  '感知',
  '意志',
  '魅力',
];

export const formatChipBonusTags = (chip: Pick<Chip, 'sixDimBonuses' | 'conversionRateBonus' | 'recoveryRateBonus'>): string[] => {
  const tags: string[] = [];
  SIX_DIM_KEYS.forEach(key => {
    const value = Number(chip.sixDimBonuses?.[key] || 0);
    if (value > 0) tags.push(`${key}+${value}`);
  });
  if ((chip.conversionRateBonus || 0) > 0) tags.push(`转化率+${chip.conversionRateBonus}%`);
  if ((chip.recoveryRateBonus || 0) > 0) tags.push(`恢复率+${chip.recoveryRateBonus}%`);
  return tags;
};
