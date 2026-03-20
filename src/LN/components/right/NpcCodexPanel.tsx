import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { NPC } from '../../types';
import { resolveNpcCodexAccessState } from '../../utils/npcCodex';
import NpcCodexEntryPanel from './NpcCodexEntryPanel';
import { BookOpen, Search, UserRoundSearch } from 'lucide-react';
import { useCompactViewport } from '../../hooks/useCompactViewport';

interface Props {
  npcs: NPC[];
  playerCredits: number;
  selectedNpcId: string | null;
  onSelectNpcId: (npcId: string | null) => void;
  onPurchaseService: (payload: { npcId: string; serviceId: string }) => { ok: boolean; message?: string };
}

const INDEX_BATCH_SIZE = 10;

const getEntryName = (npc: NPC): string => {
  const access = resolveNpcCodexAccessState(npc);
  if (access.dossierLevel <= 0) return '未收录人物';
  if (access.dossierLevel === 1) return '未识别人形';
  return npc.name;
};

const getEntryHint = (npc: NPC): string => {
  const access = resolveNpcCodexAccessState(npc);
  if (access.dossierLevel <= 1) return (npc.clueNotes || [npc.location || '仅获得零碎线索'])[0] || '仅获得零碎线索';
  if (access.darknetLevel >= 3 && npc.darknetProfile?.summary?.trim()) return npc.darknetProfile.summary.trim();
  if (access.dossierLevel === 2) return npc.darknetProfile?.accessTier || npc.position || '基础词条已开放';
  return npc.affiliation || npc.position || '暗网词条';
};

const getEntryStageLabel = (npc: NPC): string => {
  const access = resolveNpcCodexAccessState(npc);
  if (access.dossierLevel <= 1) return '线索';
  if (access.dossierLevel === 2) return '基础';
  if (access.dossierLevel === 3) return '深化';
  return '完整';
};

const buildSearchHaystack = (npc: NPC): string =>
  [
    npc.name,
    npc.position,
    npc.affiliation,
    npc.location,
    npc.darknetProfile?.handle,
    npc.darknetProfile?.alias,
    npc.darknetProfile?.summary,
    npc.darknetProfile?.accessTier,
    npc.darknetProfile?.marketVector,
    ...((npc.darknetProfile?.services || []).flatMap(service => [service.title, service.summary, service.kind, ...(service.tags || [])])),
    ...(npc.clueNotes || []),
    ...(npc.darknetProfile?.tags || []),
    ...(npc.darknetProfile?.knownAssociates || []),
    ...((npc.darknetProfile?.intelRecords || []).flatMap(record => [record.title, record.source, record.location, ...(record.tags || [])])),
  ]
    .join(' ')
    .toLowerCase();

const NpcCodexPanel: React.FC<Props> = ({ npcs, playerCredits, selectedNpcId, onSelectNpcId, onPurchaseService }) => {
  const [keyword, setKeyword] = useState('');
  const [visibleEntryCount, setVisibleEntryCount] = useState(INDEX_BATCH_SIZE);
  const isCompactViewport = useCompactViewport();
  const deferredKeyword = useDeferredValue(keyword);
  const indexBatchSize = isCompactViewport ? 8 : INDEX_BATCH_SIZE;

  const selectedNpc = useMemo(() => {
    if (!selectedNpcId) return null;
    return npcs.find(npc => npc.id === selectedNpcId) || null;
  }, [npcs, selectedNpcId]);

  const entries = useMemo(() => {
    const search = deferredKeyword.trim().toLowerCase();
    return [...npcs]
      .sort((a, b) => {
        const accessA = resolveNpcCodexAccessState(a);
        const accessB = resolveNpcCodexAccessState(b);
        const dossierDiff = accessB.dossierLevel - accessA.dossierLevel;
        if (dossierDiff !== 0) return dossierDiff;
        const darknetDiff = accessB.darknetLevel - accessA.darknetLevel;
        if (darknetDiff !== 0) return darknetDiff;
        const recordDiff = (b.darknetProfile?.intelRecords?.length || 0) - (a.darknetProfile?.intelRecords?.length || 0);
        if (recordDiff !== 0) return recordDiff;
        if (!!b.isContact !== !!a.isContact) return b.isContact ? 1 : -1;
        return (a.name || '').localeCompare(b.name || '', 'zh-CN');
      })
      .filter(npc => {
        if (!search) return true;
        return buildSearchHaystack(npc).includes(search);
      });
  }, [deferredKeyword, npcs]);

  const indexedCount = useMemo(() => entries.filter(npc => resolveNpcCodexAccessState(npc).dossierLevel > 0).length, [entries]);
  const deepLinkedCount = useMemo(() => entries.filter(npc => resolveNpcCodexAccessState(npc).darknetLevel >= 3).length, [entries]);
  const serviceNodeCount = useMemo(() => entries.filter(npc => (npc.darknetProfile?.services || []).length > 0).length, [entries]);

  useEffect(() => {
    setVisibleEntryCount(indexBatchSize);
  }, [deferredKeyword, entries.length, indexBatchSize]);

  if (selectedNpc) {
    return (
      <NpcCodexEntryPanel
        npc={selectedNpc}
        playerCredits={playerCredits}
        onBack={() => onSelectNpcId(null)}
        onPurchaseService={onPurchaseService}
      />
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 font-mono">
      <div className="relative overflow-hidden rounded-md border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(8,18,14,0.96),rgba(4,8,7,0.98)),repeating-linear-gradient(180deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_9px)] p-4">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/60 to-transparent" />
        <div className="flex items-center gap-2 text-emerald-300">
          <BookOpen className="w-4 h-4" />
          <div className="text-sm font-bold tracking-[0.24em] uppercase">Darknet Index</div>
        </div>
        <div className="mt-2 max-w-2xl text-xs leading-6 text-emerald-100/75">
          暗网独立维护人物志、节点画像与黑市记录，不再复用灵网动态流。这里更像受限终端，不是社交主页。
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          <div className="rounded-md border border-emerald-500/15 bg-black/35 px-3 py-2">
            <div className="tracking-[0.24em] uppercase text-emerald-400/70">Indexed</div>
            <div className="mt-1 text-lg font-semibold text-white">{indexedCount}</div>
          </div>
          <div className="rounded-md border border-emerald-500/15 bg-black/35 px-3 py-2">
            <div className="tracking-[0.24em] uppercase text-emerald-400/70">Deep Link</div>
            <div className="mt-1 text-lg font-semibold text-white">{deepLinkedCount}</div>
          </div>
          <div className="rounded-md border border-amber-500/15 bg-black/35 px-3 py-2">
            <div className="tracking-[0.24em] uppercase text-amber-300/70">Scan</div>
            <div className="mt-1 text-lg font-semibold text-white">{entries.length}</div>
          </div>
          <div className="rounded-md border border-cyan-500/15 bg-black/35 px-3 py-2">
            <div className="tracking-[0.24em] uppercase text-cyan-300/70">Market</div>
            <div className="mt-1 text-lg font-semibold text-white">{serviceNodeCount}</div>
          </div>
        </div>
      </div>

      <div className="rounded-md border border-emerald-500/20 bg-[#07110e]/75 px-3 py-2">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-emerald-300/65" />
          <input
            type="text"
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="搜索名字、势力、暗网句柄、标签或情报来源"
            className="w-full bg-transparent text-sm text-white placeholder:text-emerald-300/30 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
        {entries.length === 0 ? (
          <div className="rounded-md border border-dashed border-emerald-500/15 bg-black/30 p-6 text-center text-sm text-slate-500">
            当前没有符合条件的暗网词条。
          </div>
        ) : (
          entries.slice(0, visibleEntryCount).map(npc => {
            const access = resolveNpcCodexAccessState(npc);
            return (
              <button
                key={npc.id}
                type="button"
                onClick={() => onSelectNpcId(npc.id)}
                className="w-full rounded-md border border-emerald-500/15 bg-[linear-gradient(135deg,rgba(6,12,10,0.96),rgba(4,7,6,0.98))] p-3 text-left transition hover:border-emerald-300/35 hover:bg-[#0b1612]"
              >
                <div className="flex items-center gap-3">
                  <div className="h-16 w-12 overflow-hidden rounded-sm border border-emerald-500/15 bg-black shrink-0">
                    <img
                      src={npc.avatarUrl}
                      alt={getEntryName(npc)}
                      loading="lazy"
                      decoding="async"
                      className={`h-full w-full object-cover ${access.dossierLevel <= 1 ? 'grayscale blur-[1px] opacity-70' : ''}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{getEntryName(npc)}</div>
                        <div className="mt-1 truncate text-[10px] uppercase tracking-[0.18em] text-emerald-300/55">
                          {npc.darknetProfile?.handle || npc.affiliation || 'UNRESOLVED SIGNAL'}
                        </div>
                      </div>
                      <span className="shrink-0 rounded-sm border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 text-[10px] text-emerald-300">
                        {getEntryStageLabel(npc)}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] leading-5 text-slate-300/80">
                      {getEntryHint(npc)}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="inline-flex items-center gap-1 text-slate-400">
                        <UserRoundSearch className="w-3 h-3" />
                        解锁 Lv.{access.dossierLevel}
                      </span>
                      <span className="rounded-sm border border-emerald-500/15 px-2 py-0.5 text-emerald-200/80">
                        暗网 Lv.{access.darknetLevel}
                      </span>
                      <span className="rounded-sm border border-amber-500/15 px-2 py-0.5 text-amber-200/80">
                        {(npc.darknetProfile?.intelRecords || []).length} 条记录
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
        {entries.length > visibleEntryCount ? (
          <button
            type="button"
            onClick={() => setVisibleEntryCount(count => count + indexBatchSize)}
            className="w-full rounded-md border border-emerald-500/15 bg-black/30 px-3 py-3 text-sm text-emerald-200 transition hover:border-emerald-300/35 hover:bg-[#0b1612]"
          >
            加载更多暗网词条
          </button>
        ) : null}
      </div>
    </div>
  );
};

export default NpcCodexPanel;
