import React, { useState } from 'react';
import { AlertTriangle, Clock3, Coins, MapPin, Route, TrainFront, X } from 'lucide-react';
import { TravelSettlementPlan } from '../../utils/transportRuntime';

interface Props {
  plan: TravelSettlementPlan;
  credits: number;
  onClose: () => void;
  onConfirm: () => { ok: boolean; message: string };
}

const TravelSettlementModal: React.FC<Props> = ({ plan, credits, onClose, onConfirm }) => {
  const [notice, setNotice] = useState('');
  const remainingCredits = Math.max(0, credits - plan.fare);
  const insufficient = credits < plan.fare;
  const lineLabel = plan.lineIds.map(id => id.toUpperCase()).join(' / ');

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-3xl border border-amber-500/20 bg-[#05070b] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-amber-200/70">
              <TrainFront className="h-4 w-4" />
              出行结算
            </div>
            <div className="mt-1 text-xl font-bold text-white">{plan.routeLabel}</div>
            <div className="mt-1 text-xs text-slate-400">{plan.summary}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                路径
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{plan.fromLabel}</div>
              <div className="mt-1 text-xs text-slate-500">↓ {plan.modeLabel}</div>
              <div className="mt-1 text-sm font-semibold text-cyan-100">{plan.toLabel}</div>
              <div className="mt-2 text-xs text-slate-400">{plan.districtLabel}</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <Route className="h-3.5 w-3.5" />
                线路
              </div>
              <div className="mt-2 text-sm font-semibold text-white">{plan.routeLabel}</div>
              <div className="mt-1 text-xs text-slate-400">线路代码 {lineLabel || 'N/A'}</div>
              <div className="mt-2 text-xs text-slate-400">
                {plan.transferCount > 0 ? `换乘 ${plan.transferCount} 次` : '直达'} / 目标站点 {plan.targetStopId}
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-amber-500/15 bg-amber-500/[0.04] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-amber-200/70">
                <Coins className="h-3.5 w-3.5" />
                车费
              </div>
              <div className="mt-2 text-lg font-semibold text-amber-100">{plan.fare} 灵能币</div>
            </div>
            <div className="rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.04] px-4 py-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200/70">
                <Clock3 className="h-3.5 w-3.5" />
                耗时
              </div>
              <div className="mt-2 text-lg font-semibold text-cyan-100">{plan.minutes} 分钟</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">当前时间</div>
              <div className="mt-2 text-sm font-semibold text-white">{plan.currentTimeLabel}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">抵达时间</div>
              <div className="mt-2 text-sm font-semibold text-emerald-100">{plan.arrivalTimeLabel}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-4">
              <span>当前余额 {credits} 灵能币</span>
              <span>结算后余额 {remainingCredits} 灵能币</span>
            </div>
            {insufficient && (
              <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/[0.06] px-3 py-3 text-xs text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                余额不足，当前无法确认本次出行。先补足灵能币，或改走别的出行方式。
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-slate-300 hover:bg-white/[0.06]"
            >
              暂不出行
            </button>
            <button
              type="button"
              disabled={insufficient}
              onClick={() => {
                const result = onConfirm();
                if (!result.ok) setNotice(result.message);
              }}
              className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-slate-500"
            >
              确认结算并出行
            </button>
          </div>

          {!!notice && <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">{notice}</div>}
        </div>
      </div>
    </div>
  );
};

export default TravelSettlementModal;
