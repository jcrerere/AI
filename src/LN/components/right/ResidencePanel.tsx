import React, { useMemo, useState } from 'react';
import { BedDouble, Building2, Home, LockKeyhole, MoonStar, Package, Shield, Sparkles } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { Item, PlayerCivilianStatus, PlayerResidenceState, ResidenceBurglaryTarget, ResidenceProfile } from '../../types';

interface Props {
  hasOfficialRegistry: boolean;
  residence: PlayerResidenceState;
  residenceOptions: ResidenceProfile[];
  burglaryTargets: ResidenceBurglaryTarget[];
  playerInventory: Item[];
  status: PlayerCivilianStatus;
  currentLocation: string;
  playerCredits: number;
  onSwitchResidence: (residenceId: string) => { ok: boolean; message?: string };
  onRestAtResidence: () => { ok: boolean; message?: string };
  onStoreItem: (itemId: string) => { ok: boolean; message?: string };
  onWithdrawItem: (itemId: string) => { ok: boolean; message?: string };
  onAttemptBurglary: (targetId: string) => { ok: boolean; message?: string };
}

const kindLabelMap: Record<ResidenceProfile['kind'], string> = {
  official: '官方宿位',
  rental: '登记租住',
  safehouse: '隐匿据点',
  temporary: '临时床位',
};

const assetTierLabelMap: Record<ResidenceProfile['assetTier'], string> = {
  Basic: '基础',
  Comfortable: '舒适',
  Premium: '高配',
  Official: '官方',
};

const burglaryHeatLabel = (heat: number): string => {
  if (heat >= 5) return '极高';
  if (heat >= 3) return '偏高';
  if (heat >= 1) return '已留痕';
  return '低';
};

const ResidencePanel: React.FC<Props> = ({
  hasOfficialRegistry,
  residence,
  residenceOptions,
  burglaryTargets,
  playerInventory,
  status,
  currentLocation,
  playerCredits,
  onSwitchResidence,
  onRestAtResidence,
  onStoreItem,
  onWithdrawItem,
  onAttemptBurglary,
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
            summary: '当前住处来自既有存档或剧情登记，尚未映射到新的结构化目录。',
            safety: 'Medium' as const,
            privacy: 'Medium' as const,
            curfew: '跟随当地法域',
            shapeKey: 'transit_pod' as const,
            shapeLabel: '中转舱位',
            storageSlots: 6,
            assetTier: 'Basic' as const,
            monthlyCost: 0,
            switchCost: 0,
            restMinutes: 360,
            hpRestore: 12,
            mpRestore: 24,
            sanityRestore: 10,
            note: '建议后续切换到结构化住处，避免月结与住册脱节。',
          }
        : null),
    [residenceOptions, residence.currentResidenceId, residence.currentResidenceLabel, status.assignedDistrict],
  );

  const currentStash = useMemo(() => {
    if (!currentResidence) return null;
    return (
      residence.stashRecords.find(record => record.residenceId === currentResidence.id) || {
        residenceId: currentResidence.id,
        residenceLabel: currentResidence.label,
        storageSlots: currentResidence.storageSlots,
        items: [],
      }
    );
  }, [currentResidence, residence.stashRecords]);

  const storageUsage = useMemo(
    () => (currentStash?.items || []).reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0),
    [currentStash],
  );

  const inventoryCandidates = useMemo(
    () => playerInventory.filter(item => item.category !== 'quest').slice(0, 6),
    [playerInventory],
  );

  const stashPreview = useMemo(() => (currentStash?.items || []).slice(0, 6), [currentStash]);

  const pushFeedback = (result: { ok: boolean; message?: string }, fallbackSuccess: string, fallbackWarn: string) => {
    setFeedback({
      tone: result.ok ? 'success' : 'warn',
      text: result.message || (result.ok ? fallbackSuccess : fallbackWarn),
    });
  };

  return (
    <CyberPanel title="住所系统" noPadding allowExpand collapsible>
      <div className="space-y-3 bg-black/40 p-3">
        <div className="rounded-xl border border-cyan-900/30 bg-cyan-950/10 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1 text-[11px] text-cyan-300">
                <Home className="h-3.5 w-3.5" />
                当前登记住处
              </div>
              <div className="mt-1 text-sm font-semibold text-white">
                {currentResidence?.label || residence.currentResidenceLabel || '未登记住处'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {currentResidence?.summary || '当前还没有稳定住处，休整、储物和夜间出行都会更弱。'}
              </div>
            </div>
            <div className="rounded-lg border border-cyan-400/20 bg-black/30 px-2 py-1 text-right">
              <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-100/60">District</div>
              <div className="mt-1 text-[11px] text-cyan-100">
                {currentResidence?.districtLabel || status.assignedDistrict || '待绑定'}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] xl:grid-cols-4">
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">屋形</div>
              <div className="mt-1 text-slate-200">{currentResidence?.shapeLabel || '未定'}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">安全 / 隐匿</div>
              <div className="mt-1 text-slate-200">
                {currentResidence?.safety || '中'} / {currentResidence?.privacy || '中'}
              </div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">储物格</div>
              <div className="mt-1 text-amber-200">
                {storageUsage}/{currentResidence?.storageSlots || 0}
              </div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">资产层级</div>
              <div className="mt-1 text-emerald-200">
                {currentResidence ? assetTierLabelMap[currentResidence.assetTier] : '未定'}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => pushFeedback(onRestAtResidence(), '已完成休整。', '休整失败。')}
              disabled={!currentResidence}
              className="inline-flex items-center gap-1 rounded border border-cyan-700 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MoonStar className="h-3.5 w-3.5" />
              回住处休整
            </button>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400">
              当前所在：{currentLocation || '未知区域'}
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-400">
              盗窃熟练：Lv.{Math.max(1, residence.burglaryLevel || 1)} / EXP {Math.max(0, residence.burglaryExperience || 0)}
            </div>
          </div>
          {feedback && (
            <div
              className={`mt-3 rounded border px-3 py-2 text-[11px] ${
                feedback.tone === 'success'
                  ? 'border-emerald-700/50 bg-emerald-950/20 text-emerald-200'
                  : 'border-amber-700/50 bg-amber-950/20 text-amber-200'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        {hasOfficialRegistry && (status.assignedHXDormLabel || status.assignedDistrict) && (
          <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-200">
              <Building2 className="h-3.5 w-3.5" />
              艾瑞拉区官方住册
            </div>
            <div className="mt-1 text-[11px] text-slate-400">
              这条记录只在艾瑞拉区法域内视为正式宿位；离开艾瑞拉区后，它只保留为住册锚点，不会覆盖外区住所。
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

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
              <Package className="h-3.5 w-3.5 text-amber-300" />
              住处储物
            </div>
            <div className="text-[11px] text-slate-500">
              已用 {storageUsage}/{currentResidence?.storageSlots || 0}
            </div>
          </div>
          <div className="grid gap-3 xl:grid-cols-2">
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400">可存入物品</div>
              {inventoryCandidates.length > 0 ? (
                inventoryCandidates.map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 rounded border border-slate-800/90 bg-black/30 p-2 text-[11px]">
                    <div className="min-w-0">
                      <div className="truncate text-slate-100">{item.icon} {item.name}</div>
                      <div className="text-slate-500">数量 {item.quantity}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pushFeedback(onStoreItem(item.id), '已存入住处。', '存入失败。')}
                      className="rounded border border-cyan-700 px-2 py-1 text-[11px] text-cyan-200 hover:border-cyan-500 hover:text-white"
                    >
                      存入
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
                  当前没有适合放进住处的物品。
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400">住处储物内容</div>
              {stashPreview.length > 0 ? (
                stashPreview.map(item => (
                  <div key={`${item.id}_stash`} className="flex items-center justify-between gap-3 rounded border border-slate-800/90 bg-black/30 p-2 text-[11px]">
                    <div className="min-w-0">
                      <div className="truncate text-slate-100">{item.icon} {item.name}</div>
                      <div className="text-slate-500">数量 {item.quantity}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => pushFeedback(onWithdrawItem(item.id), '已取回物品。', '取回失败。')}
                      className="rounded border border-fuchsia-700 px-2 py-1 text-[11px] text-fuchsia-200 hover:border-fuchsia-500 hover:text-white"
                    >
                      取回
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
                  这处住处还没有任何存放物。
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
              <LockKeyhole className="h-3.5 w-3.5 text-rose-300" />
              片区踩点 / 入室盗窃
            </div>
            <div className="text-[11px] text-slate-500">按地区价值、锁具和住户在家概率结算</div>
          </div>
          <div className="space-y-2">
            {burglaryTargets.length > 0 ? (
              burglaryTargets.map(target => (
                <div key={target.id} className="rounded-xl border border-slate-800/90 bg-slate-950/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-semibold text-white">{target.label}</div>
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-300">
                          {target.shapeLabel}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{target.note}</div>
                    </div>
                    <button
                      type="button"
                      disabled={target.status !== 'active'}
                      onClick={() => pushFeedback(onAttemptBurglary(target.id), '已完成入室结算。', '入室失败。')}
                      className="rounded border border-rose-700 px-3 py-1.5 text-xs text-rose-200 hover:border-rose-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {target.status === 'active' ? '行动' : '冷却中'}
                    </button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] xl:grid-cols-4">
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">财富层级</div>
                      <div className="mt-1 text-amber-200">{target.wealthTier}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">锁具强度</div>
                      <div className="mt-1 text-slate-200">{target.security} / {target.entryDifficulty}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">住户在家</div>
                      <div className="mt-1 text-slate-200">{target.occupancyLabel}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">热度</div>
                      <div className="mt-1 text-slate-200">{burglaryHeatLabel(target.heat)} / 已动手 {target.hitCount} 次</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2 text-[11px] text-slate-500">
                当前片区还没有可结算的住户目标，通常说明你还没在这里形成稳定活动范围。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
              <BedDouble className="h-3.5 w-3.5 text-amber-300" />
              可切换住处
            </div>
            <div className="text-[11px] text-slate-500">余额 {playerCredits.toLocaleString()} 灵能币</div>
          </div>
          <div className="mt-3 space-y-2">
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
                      onClick={() => pushFeedback(onSwitchResidence(option.id), '已切换住处。', '住处切换失败。')}
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
                      <div className="text-slate-500">屋形 / 储物</div>
                      <div className="mt-1 text-slate-200">{option.shapeLabel} / {option.storageSlots} 格</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">休整收益</div>
                      <div className="mt-1 text-slate-200">HP+{option.hpRestore} MP+{option.mpRestore} SAN+{option.sanityRestore}</div>
                    </div>
                    <div className="rounded border border-slate-800/90 bg-black/30 p-2">
                      <div className="text-slate-500">费用</div>
                      <div className="mt-1 text-slate-200">登记 {option.switchCost} / 月维持 {option.monthlyCost}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-start gap-1 text-[11px] text-slate-500">
                    <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                    <span>{option.note}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-1 font-bold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
            说明
          </div>
          <div className="mt-2 space-y-1">
            <div>- 住处现在会固定屋形、储物格和资产层级，切换后会保留各自的储物内容。</div>
            <div>- 入室盗窃按地区价值、门锁强度、住户在家概率和你的盗窃熟练结算，不由 AI 自由裁决。</div>
            <div>- 艾瑞拉区与圣教区失手更容易留下制度层后果，诺丝区和狗镇则更偏向灰色热度。</div>
          </div>
        </div>
      </div>
    </CyberPanel>
  );
};

export default ResidencePanel;
