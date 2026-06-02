import type { NPC } from '../types';

export type NpcRuntimeSource = 'auto' | 'structured' | 'social' | 'linked';

export interface NpcRuntimeEntry {
  npc: NPC;
  source: NpcRuntimeSource;
  lastSeenAt?: string;
  lastSeenLocation?: string;
  lastUpdatedAt?: string;
  recentMemoryDigest?: string;
  recentMemoryAt?: string;
  offscreenAnchorAt?: string;
  lastSeenAtMinutes?: number;
  lastUpdatedAtMinutes?: number;
  recentMemoryAtMinutes?: number;
  offscreenAnchorAtMinutes?: number;
  offscreenPending?: boolean;
  offscreenGapMinutes?: number;
  offscreenSummary?: string;
  lingnetDirty?: boolean;
  lingnetDirtyReason?: string;
  lingnetRefreshAnchorAt?: string;
  lingnetRefreshAnchorAtMinutes?: number;
  lingnetCooldownUntilMinutes?: number;
}

export interface NpcRuntimeState {
  version: number;
  registry: Record<string, NpcRuntimeEntry>;
}

export interface NpcRuntimeConsumeContext {
  timeLabel?: string;
  location?: string;
  elapsedMinutes?: number;
}

export interface NpcRuntimeMemoryUpdate {
  npcId: string;
  digest: string;
}

export interface NpcLingnetDirtyContext {
  reason?: string;
  timeLabel?: string;
  elapsedMinutes?: number;
}

export interface NpcLingnetRuntimeHint {
  dirty: boolean;
  due: boolean;
  label: string;
  detail?: string;
}

export const NPC_RUNTIME_VERSION = 1;
export const MAX_NPC_RUNTIME_ENTRIES = 48;
export const NPC_OFFSCREEN_BACKFILL_THRESHOLD_MINUTES = 6 * 60;
export const NPC_LINGNET_REFRESH_COOLDOWN_MINUTES = 12 * 60;
export const NPC_RUNTIME_MEMORY_DIGEST_MAX_LENGTH = 180;

const AUTO_NEARBY_NPC_ID_PREFIX = 'auto_nearby_';

const isRecord = (value: unknown): value is Record<string, any> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const textOf = (value: unknown): string => `${value ?? ''}`.trim();

const toFiniteNumber = (value: unknown): number | null => {
  const next = Number(value);
  return Number.isFinite(next) ? next : null;
};

const clonePlainData = <T,>(value: T): T => {
  if (value === undefined || value === null) return value;
  return JSON.parse(JSON.stringify(value)) as T;
};

const hasListEntries = (value: unknown): boolean => Array.isArray(value) && value.length > 0;

const hasMeaningfulTextList = (value: unknown): boolean =>
  Array.isArray(value) && value.some(item => textOf(item).length > 0);

const trimRuntimeMemoryDigest = (value: unknown): string => {
  const normalized = textOf(value).replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= NPC_RUNTIME_MEMORY_DIGEST_MAX_LENGTH) return normalized;
  return `${normalized.slice(0, NPC_RUNTIME_MEMORY_DIGEST_MAX_LENGTH - 1).trim()}…`;
};

const isAutoNearbyNpc = (npc: Pick<NPC, 'id'>): boolean => textOf(npc.id).startsWith(AUTO_NEARBY_NPC_ID_PREFIX);

const npcHasExtendedSocialState = (npc: NPC): boolean =>
  !!npc.playerFollows ||
  !!npc.followsPlayer ||
  hasListEntries(npc.socialFeed) ||
  hasListEntries(npc.gallery) ||
  hasListEntries(npc.dmThread);

const npcHasStructuredBodyState = (npc: NPC): boolean =>
  Array.isArray(npc.bodyParts) &&
  npc.bodyParts.some(part =>
    hasListEntries(part.skills) ||
    hasListEntries(part.equippedItems) ||
    hasListEntries(part.statusAffixes) ||
    (Number.isFinite(part.capturedSouls) && Number(part.capturedSouls) > 0),
  );

const npcHasMeaningfulStructuredState = (npc: NPC): boolean =>
  npcHasStructuredBodyState(npc) ||
  hasListEntries(npc.chips) ||
  hasMeaningfulTextList(npc.statusTags) ||
  hasMeaningfulTextList(npc.chipSummary) ||
  hasMeaningfulTextList(npc.clueNotes) ||
  hasListEntries(npc.dossierSections) ||
  !!npc.darknetProfile ||
  !!npc.unlockState ||
  !!npc.aiDirectorCard ||
  !!npc.citizenId;

const npcHasLingnetPresence = (npc: NPC): boolean =>
  !!textOf(npc.socialHandle) ||
  !!textOf(npc.socialBio) ||
  hasListEntries(npc.socialFeed) ||
  hasListEntries(npc.dmThread) ||
  !!npc.playerFollows ||
  !!npc.followsPlayer;

const classifyNpcRuntimeSource = (npc: NPC): NpcRuntimeSource => {
  if (npcHasExtendedSocialState(npc)) return 'social';
  if (npc.isContact || !isAutoNearbyNpc(npc)) return 'linked';
  if (npcHasMeaningfulStructuredState(npc)) return 'structured';
  return 'auto';
};

export const shouldPersistNpcToRuntime = (npc: NPC): boolean => {
  if (!textOf(npc.id) || !textOf(npc.name)) return false;
  if (textOf(npc.temporaryStatus)) return false;
  if (npc.isContact) return true;
  if (!isAutoNearbyNpc(npc)) return true;
  return npcHasExtendedSocialState(npc) || npcHasMeaningfulStructuredState(npc);
};

const scoreNpcRuntimeEntry = (npc: NPC): number => {
  let score = 0;
  if (npc.isContact) score += 220;
  if (!isAutoNearbyNpc(npc)) score += 120;
  if (npcHasExtendedSocialState(npc)) score += 80;
  if (npcHasMeaningfulStructuredState(npc)) score += 60;
  if (npc.aiDirectorCard?.enabled) score += 20;
  score += Math.min((npc.socialFeed?.length || 0) * 2, 24);
  score += Math.min((npc.gallery?.length || 0) * 2, 20);
  score += Math.min(npc.dmThread?.length || 0, 12);
  return score;
};

const sanitizeNpcSnapshotForRuntime = (npc: NPC): NPC =>
  clonePlainData({
    ...npc,
    temporaryStatus: undefined,
  });

const buildNpcRuntimeSnapshotDigest = (npc: NPC): string =>
  JSON.stringify(sanitizeNpcSnapshotForRuntime(npc));

const buildNpcLingnetSnapshotDigest = (npc: NPC): string =>
  JSON.stringify({
    socialHandle: textOf(npc.socialHandle),
    socialBio: textOf(npc.socialBio),
    playerFollows: !!npc.playerFollows,
    followsPlayer: !!npc.followsPlayer,
    socialFeed: Array.isArray(npc.socialFeed)
      ? npc.socialFeed.map(post => ({
          id: textOf(post.id),
          timestamp: textOf(post.timestamp),
          content: textOf(post.content),
          commentCount: Array.isArray(post.comments) ? post.comments.length : 0,
          tipsReceived: Number(post.tipsReceived || 0),
          unlockedByPlayer: !!post.unlockedByPlayer,
        }))
      : [],
    dmThread: Array.isArray(npc.dmThread)
      ? npc.dmThread.map(message => ({
          id: textOf(message.id),
          sender: textOf(message.sender),
          timestamp: textOf(message.timestamp),
          kind: textOf(message.kind),
          hasAmount: Number(message.amount || 0) > 0,
          content: textOf(message.content),
        }))
      : [],
  });

const formatElapsedGapLabel = (minutes: number): string => {
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}分钟`;
  if (minutes < 24 * 60) {
    const hours = minutes / 60;
    return `${hours >= 10 ? Math.round(hours) : hours.toFixed(1).replace(/\.0$/, '')}小时`;
  }
  const days = minutes / (24 * 60);
  return `${days >= 10 ? Math.round(days) : days.toFixed(1).replace(/\.0$/, '')}天`;
};

const buildOffscreenSummary = (entry: {
  npc: NPC;
  gapMinutes: number;
  lastSeenAt?: string;
  lastSeenLocation?: string;
}): string => {
  const gapLabel = formatElapsedGapLabel(entry.gapMinutes);
  const lastLocation = textOf(entry.lastSeenLocation) || textOf(entry.npc.location) || '未知区域';
  const lastSeenAt = textOf(entry.lastSeenAt) || '上次可确认时间点';
  return `与玩家断联约${gapLabel}；上次可确认时间为 ${lastSeenAt}，地点在 ${lastLocation}。再次接触时，应先补足这段离屏生活与状态变化的摘要，再让她以符合人设、当前关系与区域逻辑的方式重新进入场景，不要把她写成静止等待。`;
};

const normalizeRuntimeEntry = (raw: unknown): NpcRuntimeEntry | null => {
  if (!isRecord(raw) || !isRecord(raw.npc)) return null;
  const npc = clonePlainData(raw.npc) as NPC;
  if (!shouldPersistNpcToRuntime(npc)) return null;
  const sourceRaw = textOf(raw.source).toLowerCase();
  const source: NpcRuntimeSource =
    sourceRaw === 'auto' || sourceRaw === 'structured' || sourceRaw === 'social' || sourceRaw === 'linked'
      ? (sourceRaw as NpcRuntimeSource)
      : classifyNpcRuntimeSource(npc);
  return {
    npc,
    source,
    lastSeenAt: textOf(raw.lastSeenAt) || undefined,
    lastSeenLocation: textOf(raw.lastSeenLocation) || undefined,
    lastUpdatedAt: textOf(raw.lastUpdatedAt) || undefined,
    recentMemoryDigest: trimRuntimeMemoryDigest(raw.recentMemoryDigest) || undefined,
    recentMemoryAt: textOf(raw.recentMemoryAt) || undefined,
    offscreenAnchorAt: textOf(raw.offscreenAnchorAt) || undefined,
    lastSeenAtMinutes: toFiniteNumber(raw.lastSeenAtMinutes) ?? undefined,
    lastUpdatedAtMinutes: toFiniteNumber(raw.lastUpdatedAtMinutes) ?? undefined,
    recentMemoryAtMinutes: toFiniteNumber(raw.recentMemoryAtMinutes) ?? undefined,
    offscreenAnchorAtMinutes: toFiniteNumber(raw.offscreenAnchorAtMinutes) ?? undefined,
    offscreenPending: raw.offscreenPending === true,
    offscreenGapMinutes: toFiniteNumber(raw.offscreenGapMinutes) ?? undefined,
    offscreenSummary: textOf(raw.offscreenSummary) || undefined,
    lingnetDirty: raw.lingnetDirty === true,
    lingnetDirtyReason: textOf(raw.lingnetDirtyReason) || undefined,
    lingnetRefreshAnchorAt: textOf(raw.lingnetRefreshAnchorAt) || undefined,
    lingnetRefreshAnchorAtMinutes: toFiniteNumber(raw.lingnetRefreshAnchorAtMinutes) ?? undefined,
    lingnetCooldownUntilMinutes: toFiniteNumber(raw.lingnetCooldownUntilMinutes) ?? undefined,
  };
};

const mergeNpcLists = <T,>(primary: T[] | undefined, fallback: T[] | undefined): T[] => {
  if (Array.isArray(primary) && primary.length > 0) return primary;
  if (Array.isArray(fallback) && fallback.length > 0) return fallback;
  return [];
};

const mergeNpcSnapshots = (persisted: NPC, live: NPC): NPC =>
  clonePlainData({
    ...persisted,
    ...live,
    stats: live.stats || persisted.stats,
    affection: live.affection ?? persisted.affection,
    trust: live.trust ?? persisted.trust,
    statusTags: mergeNpcLists(live.statusTags, persisted.statusTags),
    bodyParts: mergeNpcLists(live.bodyParts, persisted.bodyParts),
    spiritSkills: mergeNpcLists(live.spiritSkills, persisted.spiritSkills),
    chips: mergeNpcLists(live.chips, persisted.chips),
    inventory: mergeNpcLists(live.inventory, persisted.inventory),
    chipSummary: mergeNpcLists(live.chipSummary, persisted.chipSummary),
    clueNotes: mergeNpcLists(live.clueNotes, persisted.clueNotes),
    dossierSections: mergeNpcLists(live.dossierSections, persisted.dossierSections),
    gallery: mergeNpcLists(live.gallery, persisted.gallery),
    dmThread: mergeNpcLists(live.dmThread, persisted.dmThread),
    socialFeed: mergeNpcLists(live.socialFeed, persisted.socialFeed),
    playerFollows: live.playerFollows ?? persisted.playerFollows,
    followsPlayer: live.followsPlayer ?? persisted.followsPlayer,
    followerCount: live.followerCount ?? persisted.followerCount,
    followingCount: live.followingCount ?? persisted.followingCount,
    walletTag: live.walletTag || persisted.walletTag,
    citizenId: live.citizenId || persisted.citizenId,
    socialHandle: live.socialHandle || persisted.socialHandle,
    socialBio: live.socialBio || persisted.socialBio,
    darknetProfile: live.darknetProfile || persisted.darknetProfile,
    unlockState: live.unlockState || persisted.unlockState,
    aiDirectorCard: live.aiDirectorCard || persisted.aiDirectorCard,
  });

export const createEmptyNpcRuntimeState = (): NpcRuntimeState => ({
  version: NPC_RUNTIME_VERSION,
  registry: {},
});

export const parseNpcRuntimeState = (raw: unknown): NpcRuntimeState => {
  if (!isRecord(raw) || !isRecord(raw.registry)) return createEmptyNpcRuntimeState();

  const entries = Object.entries(raw.registry)
    .map(([id, value]) => {
      const entry = normalizeRuntimeEntry(value);
      if (!entry) return null;
      return { id, entry };
    })
    .filter((entry): entry is { id: string; entry: NpcRuntimeEntry } => !!entry)
    .sort((a, b) => {
      const scoreDiff = scoreNpcRuntimeEntry(b.entry.npc) - scoreNpcRuntimeEntry(a.entry.npc);
      if (scoreDiff !== 0) return scoreDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_NPC_RUNTIME_ENTRIES);

  const registry: Record<string, NpcRuntimeEntry> = {};
  entries.forEach(({ id, entry }) => {
    registry[id] = entry;
  });
  return {
    version: Number.isFinite(raw.version) ? Number(raw.version) : NPC_RUNTIME_VERSION,
    registry,
  };
};

export const buildNpcRuntimeState = (
  npcs: NPC[],
  context: { timeLabel?: string; location?: string; elapsedMinutes?: number } = {},
  previous: NpcRuntimeState = createEmptyNpcRuntimeState(),
): NpcRuntimeState => {
  const registry: Record<string, NpcRuntimeEntry> = {};
  const currentElapsedMinutes = toFiniteNumber(context.elapsedMinutes) ?? undefined;

  const entries = npcs
    .filter(shouldPersistNpcToRuntime)
    .map(npc => {
      const snapshot = sanitizeNpcSnapshotForRuntime(npc);
      const previousEntry = previous.registry[npc.id];
      const location = textOf(npc.location) || textOf(context.location) || undefined;
      const timeLabel = textOf(context.timeLabel) || undefined;
      const currentDigest = buildNpcRuntimeSnapshotDigest(snapshot);
      const previousDigest = previousEntry ? buildNpcRuntimeSnapshotDigest(previousEntry.npc) : '';
      const snapshotChanged = currentDigest !== previousDigest;

      const hasLingnet = npcHasLingnetPresence(snapshot);
      const currentLingnetDigest = hasLingnet ? buildNpcLingnetSnapshotDigest(snapshot) : '';
      const previousLingnetDigest =
        previousEntry && npcHasLingnetPresence(previousEntry.npc)
          ? buildNpcLingnetSnapshotDigest(previousEntry.npc)
          : '';
      const lingnetChanged = hasLingnet && currentLingnetDigest !== previousLingnetDigest;

      const anchorMinutes =
        previousEntry?.offscreenAnchorAtMinutes ??
        previousEntry?.lastUpdatedAtMinutes ??
        previousEntry?.lastSeenAtMinutes ??
        currentElapsedMinutes;
      const gapMinutes =
        currentElapsedMinutes !== undefined && anchorMinutes !== undefined
          ? Math.max(0, currentElapsedMinutes - anchorMinutes)
          : undefined;
      const offscreenPending =
        !snapshotChanged &&
        gapMinutes !== undefined &&
        gapMinutes >= NPC_OFFSCREEN_BACKFILL_THRESHOLD_MINUTES;
      const offscreenSummary = offscreenPending
        ? buildOffscreenSummary({
            npc: snapshot,
            gapMinutes,
            lastSeenAt: previousEntry?.lastSeenAt,
            lastSeenLocation: previousEntry?.lastSeenLocation,
          })
        : undefined;

      const lingnetRefreshAnchorAtMinutes =
        hasLingnet
          ? lingnetChanged
            ? currentElapsedMinutes
            : previousEntry?.lingnetRefreshAnchorAtMinutes ?? currentElapsedMinutes
          : undefined;
      const lingnetRefreshAnchorAt =
        hasLingnet
          ? lingnetChanged
            ? timeLabel
            : previousEntry?.lingnetRefreshAnchorAt || timeLabel
          : undefined;
      const lingnetCooldownUntilMinutes =
        hasLingnet && lingnetRefreshAnchorAtMinutes !== undefined
          ? lingnetRefreshAnchorAtMinutes + NPC_LINGNET_REFRESH_COOLDOWN_MINUTES
          : undefined;

      return {
        id: npc.id,
        entry: {
          npc: snapshot,
          source: classifyNpcRuntimeSource(snapshot),
          lastSeenAt: timeLabel,
          lastSeenLocation: location,
          lastUpdatedAt: timeLabel,
          recentMemoryDigest: previousEntry?.recentMemoryDigest,
          recentMemoryAt: previousEntry?.recentMemoryAt,
          offscreenAnchorAt: snapshotChanged ? timeLabel : previousEntry?.offscreenAnchorAt || timeLabel,
          lastSeenAtMinutes: currentElapsedMinutes,
          lastUpdatedAtMinutes: currentElapsedMinutes,
          recentMemoryAtMinutes: previousEntry?.recentMemoryAtMinutes,
          offscreenAnchorAtMinutes: snapshotChanged ? currentElapsedMinutes : anchorMinutes,
          offscreenPending,
          offscreenGapMinutes: offscreenPending ? gapMinutes : undefined,
          offscreenSummary,
          lingnetDirty: hasLingnet ? previousEntry?.lingnetDirty === true : false,
          lingnetDirtyReason: hasLingnet ? previousEntry?.lingnetDirtyReason : undefined,
          lingnetRefreshAnchorAt,
          lingnetRefreshAnchorAtMinutes,
          lingnetCooldownUntilMinutes,
        } as NpcRuntimeEntry,
      };
    })
    .sort((a, b) => {
      const scoreDiff = scoreNpcRuntimeEntry(b.entry.npc) - scoreNpcRuntimeEntry(a.entry.npc);
      if (scoreDiff !== 0) return scoreDiff;
      return a.id.localeCompare(b.id);
    })
    .slice(0, MAX_NPC_RUNTIME_ENTRIES);

  entries.forEach(({ id, entry }) => {
    registry[id] = entry;
  });

  return {
    version: NPC_RUNTIME_VERSION,
    registry,
  };
};

export const mergeNpcListWithRuntimeSnapshots = (current: NPC[], runtime: NpcRuntimeState): NPC[] => {
  const runtimeEntries = Object.values(runtime.registry || {});
  if (runtimeEntries.length === 0) return current;

  const persistedById = new Map(
    runtimeEntries
      .filter(entry => shouldPersistNpcToRuntime(entry.npc))
      .map(entry => [entry.npc.id, clonePlainData(entry.npc)] as const),
  );
  const seenIds = new Set<string>();

  const mergedCurrent = current.map(npc => {
    const persisted = persistedById.get(npc.id);
    seenIds.add(npc.id);
    return persisted ? mergeNpcSnapshots(persisted, npc) : npc;
  });

  const restored = Array.from(persistedById.values()).filter(npc => !seenIds.has(npc.id));
  return [...mergedCurrent, ...restored];
};

export const getNpcRuntimeEntry = (runtime: NpcRuntimeState, npcId: string): NpcRuntimeEntry | null => {
  const key = textOf(npcId);
  if (!key) return null;
  return runtime.registry[key] || null;
};

export const consumeNpcRuntimeOffscreen = (
  runtime: NpcRuntimeState,
  npcIds: string[],
  context: NpcRuntimeConsumeContext = {},
): NpcRuntimeState => {
  const normalizedIds = Array.from(new Set((npcIds || []).map(textOf).filter(Boolean)));
  if (normalizedIds.length === 0) return runtime;

  const timeLabel = textOf(context.timeLabel) || undefined;
  const location = textOf(context.location) || undefined;
  const elapsedMinutes = toFiniteNumber(context.elapsedMinutes) ?? undefined;
  let changed = false;
  const nextRegistry: Record<string, NpcRuntimeEntry> = { ...runtime.registry };

  normalizedIds.forEach(id => {
    const entry = nextRegistry[id];
    if (!entry || !entry.offscreenPending) return;
    changed = true;
    nextRegistry[id] = {
      ...entry,
      lastSeenAt: timeLabel || entry.lastSeenAt,
      lastSeenLocation: location || entry.lastSeenLocation,
      lastUpdatedAt: timeLabel || entry.lastUpdatedAt,
      lastSeenAtMinutes: elapsedMinutes ?? entry.lastSeenAtMinutes,
      lastUpdatedAtMinutes: elapsedMinutes ?? entry.lastUpdatedAtMinutes,
      offscreenAnchorAt: timeLabel || entry.offscreenAnchorAt || entry.lastSeenAt,
      offscreenAnchorAtMinutes: elapsedMinutes ?? entry.offscreenAnchorAtMinutes ?? entry.lastSeenAtMinutes,
      offscreenPending: false,
      offscreenGapMinutes: undefined,
      offscreenSummary: undefined,
    };
  });

  if (!changed) return runtime;
  return {
    version: runtime.version || NPC_RUNTIME_VERSION,
    registry: nextRegistry,
  };
};

export const rememberNpcRuntimeMemory = (
  runtime: NpcRuntimeState,
  updates: NpcRuntimeMemoryUpdate[],
  context: NpcRuntimeConsumeContext = {},
): NpcRuntimeState => {
  const normalizedUpdates = (updates || [])
    .map(update => ({
      npcId: textOf(update?.npcId),
      digest: trimRuntimeMemoryDigest(update?.digest),
    }))
    .filter(update => update.npcId && update.digest);
  if (normalizedUpdates.length === 0) return runtime;

  const timeLabel = textOf(context.timeLabel) || undefined;
  const elapsedMinutes = toFiniteNumber(context.elapsedMinutes) ?? undefined;
  let changed = false;
  const nextRegistry: Record<string, NpcRuntimeEntry> = { ...runtime.registry };

  normalizedUpdates.forEach(update => {
    const entry = nextRegistry[update.npcId];
    if (!entry) return;
    if (
      entry.recentMemoryDigest === update.digest &&
      (elapsedMinutes === undefined || entry.recentMemoryAtMinutes === elapsedMinutes)
    ) {
      return;
    }
    changed = true;
    nextRegistry[update.npcId] = {
      ...entry,
      lastUpdatedAt: timeLabel || entry.lastUpdatedAt,
      lastUpdatedAtMinutes: elapsedMinutes ?? entry.lastUpdatedAtMinutes,
      recentMemoryDigest: update.digest,
      recentMemoryAt: timeLabel || entry.recentMemoryAt,
      recentMemoryAtMinutes: elapsedMinutes ?? entry.recentMemoryAtMinutes,
    };
  });

  if (!changed) return runtime;
  return {
    version: runtime.version || NPC_RUNTIME_VERSION,
    registry: nextRegistry,
  };
};

export const markNpcRuntimeLingnetDirty = (
  runtime: NpcRuntimeState,
  npcIds: string[],
  context: NpcLingnetDirtyContext = {},
): NpcRuntimeState => {
  const normalizedIds = Array.from(new Set((npcIds || []).map(textOf).filter(Boolean)));
  if (normalizedIds.length === 0) return runtime;

  const reason = textOf(context.reason) || '最近互动可能影响她的灵网近况。';
  const timeLabel = textOf(context.timeLabel) || undefined;
  const elapsedMinutes = toFiniteNumber(context.elapsedMinutes) ?? undefined;
  let changed = false;
  const nextRegistry: Record<string, NpcRuntimeEntry> = { ...runtime.registry };

  normalizedIds.forEach(id => {
    const entry = nextRegistry[id];
    if (!entry || !npcHasLingnetPresence(entry.npc)) return;
    if (entry.lingnetDirty && entry.lingnetDirtyReason === reason) return;
    changed = true;
    nextRegistry[id] = {
      ...entry,
      lastUpdatedAt: timeLabel || entry.lastUpdatedAt,
      lastUpdatedAtMinutes: elapsedMinutes ?? entry.lastUpdatedAtMinutes,
      lingnetDirty: true,
      lingnetDirtyReason: reason,
      lingnetRefreshAnchorAt: entry.lingnetRefreshAnchorAt || timeLabel || entry.lastSeenAt,
      lingnetRefreshAnchorAtMinutes:
        entry.lingnetRefreshAnchorAtMinutes ?? elapsedMinutes ?? entry.lastSeenAtMinutes ?? entry.lastUpdatedAtMinutes,
    };
  });

  if (!changed) return runtime;
  return {
    version: runtime.version || NPC_RUNTIME_VERSION,
    registry: nextRegistry,
  };
};

export const consumeNpcRuntimeLingnetRefresh = (
  runtime: NpcRuntimeState,
  npcIds: string[],
  context: NpcLingnetDirtyContext = {},
): NpcRuntimeState => {
  const normalizedIds = Array.from(new Set((npcIds || []).map(textOf).filter(Boolean)));
  if (normalizedIds.length === 0) return runtime;

  const timeLabel = textOf(context.timeLabel) || undefined;
  const elapsedMinutes = toFiniteNumber(context.elapsedMinutes) ?? undefined;
  let changed = false;
  const nextRegistry: Record<string, NpcRuntimeEntry> = { ...runtime.registry };

  normalizedIds.forEach(id => {
    const entry = nextRegistry[id];
    if (!entry || !npcHasLingnetPresence(entry.npc)) return;
    changed = true;
    nextRegistry[id] = {
      ...entry,
      lastUpdatedAt: timeLabel || entry.lastUpdatedAt,
      lastUpdatedAtMinutes: elapsedMinutes ?? entry.lastUpdatedAtMinutes,
      lingnetDirty: false,
      lingnetDirtyReason: undefined,
      lingnetRefreshAnchorAt: timeLabel || entry.lingnetRefreshAnchorAt || entry.lastSeenAt,
      lingnetRefreshAnchorAtMinutes:
        elapsedMinutes ?? entry.lingnetRefreshAnchorAtMinutes ?? entry.lastSeenAtMinutes ?? entry.lastUpdatedAtMinutes,
      lingnetCooldownUntilMinutes:
        elapsedMinutes !== undefined
          ? elapsedMinutes + NPC_LINGNET_REFRESH_COOLDOWN_MINUTES
          : entry.lingnetCooldownUntilMinutes,
    };
  });

  if (!changed) return runtime;
  return {
    version: runtime.version || NPC_RUNTIME_VERSION,
    registry: nextRegistry,
  };
};

export const getNpcLingnetRuntimeHint = (
  runtime: NpcRuntimeState,
  npc: Pick<NPC, 'id'>,
  elapsedMinutes?: number,
): NpcLingnetRuntimeHint | null => {
  const entry = getNpcRuntimeEntry(runtime, npc.id);
  if (!entry || !npcHasLingnetPresence(entry.npc)) return null;
  if (entry.lingnetDirty) {
    return {
      dirty: true,
      due: false,
      label: '待补动态',
      detail: entry.lingnetDirtyReason || '最近互动可能影响她的灵网近况。',
    };
  }
  const nextElapsedMinutes = toFiniteNumber(elapsedMinutes);
  const due =
    nextElapsedMinutes !== null &&
    entry.lingnetCooldownUntilMinutes !== undefined &&
    nextElapsedMinutes >= entry.lingnetCooldownUntilMinutes;
  if (!due) return null;
  return {
    dirty: false,
    due: true,
    label: '可补近况',
    detail: '该账号离上次社交锚点已过去一段时间，可按需补最近动态。',
  };
};

export const buildNpcRuntimePromptSupplement = (
  runtime: NpcRuntimeState,
  npc: Pick<NPC, 'id' | 'name'>,
): string => {
  const entry = getNpcRuntimeEntry(runtime, npc.id);
  if (!entry) return '';
  const displayName = textOf(npc.name) || textOf(entry.npc.name) || textOf(npc.id);
  const blocks: string[] = [];
  if (entry.recentMemoryDigest) {
    blocks.push(
      `【最近社交记忆 / ${displayName}】`,
      entry.recentMemoryAt ? `时间: ${entry.recentMemoryAt}` : '时间: 最近一次互动',
      entry.recentMemoryDigest,
    );
  }
  if (entry.offscreenPending && entry.offscreenSummary) {
    blocks.push(
      `【离屏待补摘要 / ${displayName}】`,
      `间隔: ${formatElapsedGapLabel(entry.offscreenGapMinutes || 0)}`,
      entry.offscreenSummary,
    );
  }
  return blocks.join('\n');
};
