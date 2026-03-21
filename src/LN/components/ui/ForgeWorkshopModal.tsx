import React, { useEffect, useMemo, useState } from 'react';
import { Chip, ForgeWorkshopState, ForgeWorkshopTab, Item } from '../../types';
import { buildForgeDigest, getForgeBlueprints, resolveForgeLockSlots } from '../../utils/forgeRuntime';
import { Cpu, Hammer, Lock, RefreshCcw, Wrench, X } from 'lucide-react';

interface Props {
  state: ForgeWorkshopState;
  chipTargets: Chip[];
  cyberwareTargets: Item[];
  initialTab: ForgeWorkshopTab;
  onClose: () => void;
  onForge: (payload: {
    kind: ForgeWorkshopTab;
    blueprintId: string;
    targetId?: string;
    lockedAffixIds: string[];
  }) => { ok: boolean; message: string };
}

const TAB_META: Array<{ id: ForgeWorkshopTab; label: string; icon: React.ReactNode }> = [
  { id: 'chip', label: '芯片锻造', icon: <Cpu className="h-3.5 w-3.5" /> },
  { id: 'cyberware', label: '义体模组', icon: <Wrench className="h-3.5 w-3.5" /> },
];

const ForgeWorkshopModal: React.FC<Props> = ({
  state,
  chipTargets,
  cyberwareTargets,
  initialTab,
  onClose,
  onForge,
}) => {
  const [activeTab, setActiveTab] = useState<ForgeWorkshopTab>(initialTab);
  const [selectedBlueprintId, setSelectedBlueprintId] = useState('');
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const [lockedAffixIds, setLockedAffixIds] = useState<string[]>([]);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const blueprints = useMemo(() => getForgeBlueprints(activeTab), [activeTab]);
  const selectedBlueprint = useMemo(
    () => blueprints.find(blueprint => blueprint.id === selectedBlueprintId) || blueprints[0] || null,
    [blueprints, selectedBlueprintId],
  );
  const lockSlots = useMemo(() => resolveForgeLockSlots(state.level), [state.level]);
  const targets = activeTab === 'chip' ? chipTargets : cyberwareTargets;
  const selectedTarget = useMemo(
    () => targets.find(target => target.id === selectedTargetId) || null,
    [targets, selectedTargetId],
  );
  const targetForgeProfile = selectedTarget?.forgeProfile?.kind === activeTab ? selectedTarget.forgeProfile : null;
  useEffect(() => {
    if (!blueprints.length) {
      setSelectedBlueprintId('');
      return;
    }
    setSelectedBlueprintId(current => (blueprints.some(blueprint => blueprint.id === current) ? current : blueprints[0].id));
  }, [blueprints]);

  useEffect(() => {
    setSelectedTargetId('');
    setLockedAffixIds([]);
  }, [activeTab, selectedBlueprintId]);

  const toggleLock = (affixId: string) => {
    setLockedAffixIds(current => {
      if (current.includes(affixId)) return current.filter(id => id !== affixId);
      if (current.length >= lockSlots) return current;
      return [...current, affixId];
    });
  };

  const handleSubmit = () => {
    if (!selectedBlueprint) {
      setNotice('当前没有可用蓝图。');
      return;
    }
    const result = onForge({
      kind: activeTab,
      blueprintId: selectedBlueprint.id,
      targetId: targetForgeProfile ? selectedTargetId : undefined,
      lockedAffixIds,
    });
    setNotice(result.message);
  };

  return (
    <div className="fixed inset-0 z-[149] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-3xl border border-cyan-500/18 bg-[#05070b] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-cyan-200/70">
              <Hammer className="h-4 w-4" />
              生活层 / 工坊层
            </div>
            <div className="mt-1 text-xl font-bold text-white">灵构锻造工坊</div>
            <div className="mt-1 text-xs text-slate-400">{buildForgeDigest(state)}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar max-h-[76vh] overflow-y-auto p-5">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">工坊等级</div>
              <div className="mt-1 text-cyan-50">Lv.{state.level}</div>
              <div className="mt-1 text-[11px] text-slate-400">经验 {state.xp}/{state.nextXp}</div>
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">锁词条</div>
              <div className="mt-1 text-cyan-50">{lockSlots} 条</div>
              <div className="mt-1 text-[11px] text-slate-400">重锻时可保留现有词条</div>
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">本轮记录</div>
              <div className="mt-1 text-cyan-50">{state.records.length} 条</div>
              <div className="mt-1 text-[11px] text-slate-400">只保留最近一批有效锻造历史</div>
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] px-3 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">锻造规则</div>
              <div className="mt-1 text-cyan-50">前端本轮结算</div>
              <div className="mt-1 text-[11px] text-slate-400">AI 下一轮只读取结果摘要</div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 rounded-[22px] border border-white/8 bg-white/[0.03] p-1">
            {TAB_META.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id ? 'bg-white text-black' : 'text-slate-400 hover:text-cyan-100'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.15fr,0.85fr]">
            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">蓝图</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {blueprints.map(blueprint => {
                    const selected = blueprint.id === selectedBlueprint?.id;
                    return (
                      <button
                        key={blueprint.id}
                        type="button"
                        onClick={() => setSelectedBlueprintId(blueprint.id)}
                        className={`rounded-2xl border p-4 text-left transition ${
                          selected ? 'border-cyan-400/40 bg-cyan-500/[0.08]' : 'border-white/10 bg-black/20 hover:border-cyan-500/20'
                        }`}
                      >
                        <div className="text-sm font-semibold text-white">{blueprint.label}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-400">{blueprint.summary}</div>
                        <div className="mt-3 flex flex-wrap gap-1 text-[11px]">
                          <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-100">
                            基础台费 {blueprint.baseFee} 灵能币
                          </span>
                          {blueprint.requirements.map(requirement => (
                            <span key={requirement.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-slate-200">
                              {requirement.label}×{requirement.count}
                            </span>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500">{blueprint.note}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">重锻目标</div>
                  <div className="text-[11px] text-slate-500">不选则按新锻造处理</div>
                </div>
                <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                  <select
                    value={selectedTargetId}
                    onChange={event => setSelectedTargetId(event.target.value)}
                    className="w-full bg-transparent text-sm text-white outline-none"
                  >
                    <option value="">新锻造 / 不锁词条</option>
                    {targets
                      .filter(target => target.forgeProfile?.kind === activeTab)
                      .map(target => (
                        <option key={target.id} value={target.id}>
                          {target.name}
                        </option>
                      ))}
                  </select>
                </div>
                {targetForgeProfile ? (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-slate-400">
                      当前可锁 {lockSlots} 条，已选 {lockedAffixIds.length} 条。
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      {targetForgeProfile.affixes.map(affix => {
                        const selected = lockedAffixIds.includes(affix.id);
                        const disabled = !selected && lockedAffixIds.length >= lockSlots;
                        return (
                          <button
                            key={affix.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleLock(affix.id)}
                            className={`rounded-2xl border px-3 py-3 text-left text-xs transition ${
                              selected
                                ? 'border-cyan-400/40 bg-cyan-500/[0.08] text-cyan-50'
                                : disabled
                                  ? 'border-white/8 bg-white/[0.02] text-slate-600'
                                  : 'border-white/10 bg-black/20 text-slate-300 hover:border-cyan-500/20'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold">{affix.label}</span>
                              {selected && <Lock className="h-3.5 w-3.5" />}
                            </div>
                            <div className="mt-1">{affix.valueLabel}</div>
                            <div className="mt-1 text-slate-500">{affix.summary}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-500">
                    当前没有可用于重锻的已成品，先锻出一件再回来锁词条。
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">需求预览</div>
                <div className="mt-3 space-y-2">
                  {(selectedBlueprint?.requirements || []).map(requirement => (
                    <div key={requirement.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-300">
                      <div className="font-semibold text-white">{requirement.label}</div>
                      <div className="mt-1">需求 {requirement.count} 份，缺料时台面补齐 +{requirement.fallbackFee} 灵能币/份。</div>
                    </div>
                  ))}
                  {!selectedBlueprint && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-500">
                      先选一个蓝图。
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">最近锻造</div>
                <div className="mt-3 space-y-2">
                  {state.records.slice(0, 5).map(record => (
                    <div key={record.id} className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold text-white">{record.resultLabel}</div>
                        <div className="text-cyan-200">{record.quality}</div>
                      </div>
                      <div className="mt-1 text-slate-400">{record.blueprintLabel}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {record.affixes.map(affix => (
                          <span key={affix.id} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200">
                            {affix.label}{affix.valueLabel}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {state.records.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 px-3 py-3 text-xs text-slate-500">
                      当前还没有锻造记录。
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">提示</div>
                <div className="mt-3 space-y-2 text-xs text-slate-400">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                    锻造由前端本轮直接结算，下一轮 AI 只读取结果摘要。
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                    锁词条只在重锻已有成品时生效，锁得越多，台费越高。
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-3">
                    没有合适素材时会自动走台面补齐，但价格会更贵。
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-slate-400">{notice || '选蓝图后可直接开锻。'}</div>
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-500/18"
            >
              <RefreshCcw className="h-4 w-4" />
              执行锻造
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgeWorkshopModal;
