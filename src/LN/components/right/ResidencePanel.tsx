import React, { useMemo, useState } from 'react';
import { BedDouble, Building2, Home, MoonStar, Shield, Sparkles } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { PlayerCivilianStatus, PlayerResidenceState, ResidenceProfile } from '../../types';

interface Props {
  hasOfficialRegistry: boolean;
  residence: PlayerResidenceState;
  residenceOptions: ResidenceProfile[];
  status: PlayerCivilianStatus;
  currentLocation: string;
  playerCredits: number;
  onSwitchResidence: (residenceId: string) => { ok: boolean; message?: string };
  onRestAtResidence: () => { ok: boolean; message?: string };
}

const kindLabelMap: Record<ResidenceProfile['kind'], string> = {
  official: '官方宿位',
  rental: '登记租住',
  safehouse: '隐匿据点',
  temporary: '临时床位',
};

const ResidencePanel: React.FC<Props> = ({
  hasOfficialRegistry,
  residence,
  residenceOptions,
  status,
  currentLocation,
  playerCredits,
  onSwitchResidence,
  onRestAtResidence,
}) => {
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warn'; text: string } | null>(null);
  const currentResidence = useMemo(
    () =>
      residenceOptions.find(option => option.id === residence.currentResidenceId) ||
      (residence.currentResidenceId
        ? {
            id: residence.currentResidenceId,
            label: residence.currentResidenceLabel || residence.currentResidenceId,
            kind: 'temporary' as const,
            source: 'fallback' as const,
            districtLabel: status.assignedDistrict || '未登记分区',
            summary: '当前住所来自既有存档或剧情登记，尚未映射到新的住所目录。',
            safety: 'Medium' as const,
            privacy: 'Medium' as const,
            curfew: '跟随当地法域',
            monthlyCost: 0,
            switchCost: 0,
            restMinutes: 360,
            hpRestore: 12,
            mpRestore: 24,
            sanityRestore: 10,
            note: '建议后续切换到结构化住处。',
          }
        : null),
    [residenceOptions, residence.currentResidenceId, residence.currentResidenceLabel, status.assignedDistrict],
  );

  const handleSwitchClick = (residenceId: string) => {
    const result = onSwitchResidence(residenceId);
    setFeedback({ tone: result.ok ? 'success' : 'warn', text: result.message || (result.ok ? '已切换住处。' : '住处切换失败。') });
  };

  const handleRestClick = () => {
    const result = onRestAtResidence();
    setFeedback({ tone: result.ok ? 'success' : 'warn', text: result.message || (result.ok ? '已完成休整。' : '休整失败。') });
  };

  return (
    <CyberPanel title="住所系统" noPadding allowExpand collapsible>
      <div className="p-3 bg-black/40 space-y-3">
        <div className="rounded-xl border border-cyan-900/30 bg-cyan-950/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-cyan-300">
                <Home className="w-3.5 h-3.5" />
                当前登记住处
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {currentResidence?.label || residence.currentResidenceLabel || '未登记住所'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {currentResidence?.summary || '当前还没有稳定住处，后续夜禁、会面与恢复都会偏弱。'}
              </div>
            </div>
            <div className="rounded-lg border border-cyan-400/20 bg-black/30 px-2 py-1 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/60">District</div>
              <div className="mt-1 text-[11px] text-cyan-100">{currentResidence?.districtLabel || status.assignedDistrict || '待绑定'}</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] xl:grid-cols-4">
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">安全</div>
              <div className="mt-1 text-emerald-300">{currentResidence?.safety || '低'}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">隐匿</div>
              <div className="mt-1 text-violet-200">{currentResidence?.privacy || '低'}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">宵禁</div>
              <div className="mt-1 text-amber-200">{currentResidence?.curfew || '跟随当地法域'}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">月维持费</div>
              <div className="mt-1 font-mono text-slate-200">{(currentResidence?.monthlyCost || 0).toLocaleString()} 灵能币</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleRestClick}
              disabled={!currentResidence}
              className="inline-flex items-center gap-1 rounded border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MoonStar className="w-3.5 h-3.5" />
              回住处休整
            </button>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400">
              当前所在地：{currentLocation || '未知区域'}
            </div>
          </div>
          {feedback && (
            <div className={`mt-3 rounded border px-3 py-2 text-[11px] ${feedback.tone === 'success' ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-200' : 'border-amber-700/50 bg-amber-950/20 text-amber-200'}`}>
              {feedback.text}
            </div>
          )}
        </div>

        {hasOfficialRegistry && (status.assignedHXDormLabel || status.assignedDistrict) && (
          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-200">
              <Building2 className="w-3.5 h-3.5" />
              艾瑞拉区官方住册
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              这条记录只在艾瑞拉区法域内视为官方宿位；离开艾瑞拉区后，它只保留为住册锚点，不会把外区住处算成官方分配。
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2 text-[11px]">
                <div className="text-slate-500">绑定分区</div>
                <div className="mt-1 text-slate-200">{status.assignedDistrict || '未绑定'}</div>
              </div>
              <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2 text-[11px]">
                <div className="text-slate-500">官方宿位</div>
                <div className="mt-1 text-slate-200">{status.assignedHXDormLabel || '未绑定'}</div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
              <BedDouble className="w-3.5 h-3.5 text-amber-300" />
              可切换住处
            </div>
            <div className="text-[11px] text-slate-500">余额 {playerCredits.toLocaleString()} 灵能币</div>
          </div>
          <div className="space-y-2">
            {residenceOptions.map(option => {
              const isCurrent = option.id === residence.currentResidenceId;
              const isUnlocked = residence.unlockedResidenceIds.includes(option.id);
              const actionLabel = isCurrent ? '当前住处' : isUnlocked ? '迁入' : option.switchCost > 0 ? `登记 ${option.switchCost} 灵能币` : '登记';
              return (
                <div key={option.id} className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white">{option.label}</div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                          {kindLabelMap[option.kind]}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{option.summary}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSwitchClick(option.id)}
                      disabled={isCurrent}
                      className="rounded border border-fuchsia-700 px-3 py-1.5 text-xs text-fuchsia-200 hover:border-fuchsia-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {actionLabel}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] xl:grid-cols-4">
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">法域</div>
                      <div className="mt-1 text-slate-200">{option.districtLabel}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">安全 / 隐匿</div>
                      <div className="mt-1 text-slate-200">{option.safety} / {option.privacy}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">休整收益</div>
                      <div className="mt-1 text-slate-200">HP+{option.hpRestore} MP+{option.mpRestore} SAN+{option.sanityRestore}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">费用</div>
                      <div className="mt-1 text-slate-200">登记者 {option.switchCost} 灵能币 / 月维持 {option.monthlyCost} 灵能币</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-start gap-1 text-[11px] text-slate-500">
                    <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span>{option.note}</span>
                  </div>
                </div>
              );
            })}
            {residenceOptions.length === 0 && (
              <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
                当前没有可登记住处，通常说明世界观变量还没同步到当前会话。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1 font-bold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            说明
          </div>
          <div className="mt-2 space-y-1">
            <div>- 住所只维护登记与恢复链，不会强行覆盖你当前剧情所在地。</div>
            <div>- 月维持费会并入月结，住处越好，维持费越高。</div>
            <div>- Beta 绑定宿位始终保留，方便回归官方链路。</div>
          </div>
        </div>
      </div>
    </CyberPanel>
  );
};

export default ResidencePanel;
