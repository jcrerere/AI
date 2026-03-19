import { NPC } from '../types';

export const isDefaultChiplessRaceText = (text: string): boolean => {
  const normalized = `${text || ''}`.trim();
  if (!normalized) return false;
  return /灵族|汐屿族/.test(normalized);
};

export const isDefaultChiplessNpc = (npc: NPC): boolean => {
  const text = `${npc.race || ''} ${npc.raceClass || ''} ${npc.name || ''} ${npc.affiliation || ''} ${npc.group || ''}`.trim();
  return isDefaultChiplessRaceText(text);
};
