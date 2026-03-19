import { NPC } from '../types';

export interface NpcCodexAccessState {
  dossierLevel: number;
  socialUnlocked: boolean;
  darknetLevel: number;
  darknetUnlocked: boolean;
}

const clampUnlockLevel = (value: number): number => Math.min(4, Math.max(1, Math.floor(value)));

const readFiniteLevel = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return clampUnlockLevel(parsed);
};

const readFiniteCount = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor(parsed));
};

export const resolveNpcCodexAccessState = (npc: NPC): NpcCodexAccessState => {
  const relation = npc.gender === 'female' ? npc.affection || 0 : npc.trust || 0;
  const baseState = npc.unlockState || {};

  let dossierLevel = readFiniteLevel(baseState.dossierLevel) ?? (npc.isContact ? 2 : 1);
  if (relation >= 25) dossierLevel = Math.max(dossierLevel, 3);
  if (relation >= 55 || npc.playerFollows || npc.followsPlayer) dossierLevel = Math.max(dossierLevel, 4);

  let darknetLevel = readFiniteLevel(baseState.darknetLevel) ?? (npc.isContact ? 2 : dossierLevel >= 3 ? 2 : 1);
  if (relation >= 12 || npc.isContact || npc.playerFollows) darknetLevel = Math.max(darknetLevel, 2);
  if (relation >= 35 || npc.followsPlayer) darknetLevel = Math.max(darknetLevel, 3);
  if (relation >= 60 || (npc.playerFollows && npc.followsPlayer)) darknetLevel = Math.max(darknetLevel, 4);

  return {
    dossierLevel: clampUnlockLevel(dossierLevel),
    socialUnlocked: baseState.socialUnlocked ?? (dossierLevel >= 4 || !!npc.playerFollows || !!npc.followsPlayer),
    darknetLevel: clampUnlockLevel(darknetLevel),
    darknetUnlocked:
      baseState.darknetUnlocked ?? (darknetLevel >= 2 || dossierLevel >= 3 || !!npc.isContact || !!npc.playerFollows || !!npc.followsPlayer),
  };
};

export const resolveNpcIntelUnlockedCount = (npc: NPC, totalRecords: number): number => {
  const explicit = readFiniteCount(npc.unlockState?.intelUnlockedCount);
  if (explicit !== null) return Math.min(totalRecords, explicit);

  const access = resolveNpcCodexAccessState(npc);
  if (access.darknetLevel >= 4) return totalRecords;
  if (access.darknetLevel === 3) return Math.min(totalRecords, 3);
  if (access.darknetLevel === 2) return Math.min(totalRecords, 1);
  return 0;
};
