import React, { useState } from 'react';
import { ArrowRight, Clock3, Coins, MapPin, Route, TrainFront, X } from 'lucide-react';
import { MetroNetwork } from '../../utils/sceneActions';
import { TravelRuleSnapshot } from '../../utils/transportRuntime';

interface Props {
  currentLocationLabel: string;
  travelRules: TravelRuleSnapshot;
  metroNetwork: MetroNetwork | null;
  onClose: () => void;
  onPlanMetro: (stopId: string) => { ok: boolean; message: string };
}

const availabilityClassMap: Record<'available' | 'restricted' | 'blocked', string> = {
  available: 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-100',
  restricted: 'border-amber-500/20 bg-amber-500/[0.06] text-amber-100',
  blocked: 'border-white/10 bg-white/[0.03] text-slate-400',
};

const availabilityLabelMap: Record<'available' | 'restricted' | 'blocked', string> = {
  available: '可用',
  restricted: '受限',
  blocked: '封闭',
};

const TravelPlannerModal: React.FC<Props> = ({
  currentLocationLabel,
  travelRules,
  metroNetwork,
  onClose,
  onPlanMetro,
}) => {
  const [notice, setNotice] = useState('');
  const metroOptions = metroNetwork?.options || [];

  return (
    <div
      className="fixed inset-0 z-[148] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-3xl border border-white/10 bg-[#05070b] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-amber-200/70">
              <Route className="h-4 w-4" />
              出行规划
            </div>
            <div className="mt-1 text-xl font-bold text-white">{travelRules.regionLabel} · {travelRules.districtLabel}</div>
            <div className="mt-1 text-xs text-slate-400">
              本轮由前端先完成路线、时间和费用结算，下一轮 AI 再基于新位置继续对戏。
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar max-h-[76vh] overflow-y-auto p-5">
          <div className="grid gap-3 lg:grid-cols-[1.2fr,1fr]">
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  当前锚点
                </div>
                <div className="mt-2 text-sm font-semibold text-white">{currentLocationLabel}</div>
                <div className="mt-1 text-xs text-slate-400">{travelRules.enforcementNote}</div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">交通层规则</div>
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {travelRules.modes.map(mode => (
                    <div
                      key={mode.id}
                      className={`rounded-2xl border px-3 py-3 ${availabilityClassMap[mode.availability]}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold">{mode.label}</div>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                          {availabilityLabelMap[mode.availability]}
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-300/90">{mode.scopeLabel}</div>
                      <div className="mt-1 text-[11px] leading-5 text-slate-400">{mode.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-4">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-amber-200/70">
                  <TrainFront className="h-3.5 w-3.5" />
                  轨道可达站点
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  {metroNetwork
                    ? `当前站点：${metroNetwork.currentStop.label}`
                    : '当前分区没有可直接调用的轨道站点。'}
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  这里只列当前前端可直接结算的出行方式；其他交通方式后续接入同一层。
                </div>
              </div>

              <div className="space-y-2">
                {metroOptions.length > 0 ? (
                  metroOptions.map(option => (
                    <div
                      key={option.stop.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold text-white">
                            <span>{option.stop.label}</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                            <span className="text-xs font-normal text-slate-400">
                              {option.stop.region} / {option.stop.district}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1.5">
                              <Coins className="h-3.5 w-3.5 text-amber-200/70" />
                              {option.fare} 灵能币
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <Clock3 className="h-3.5 w-3.5 text-cyan-200/70" />
                              {option.minutes} 分钟
                            </span>
                            <span>线路 {option.lineIds.map(id => id.toUpperCase()).join(' / ')}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const result = onPlanMetro(option.stop.id);
                            setNotice(result.message);
                          }}
                          className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-500/20"
                        >
                          进入结算
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-slate-500">
                    当前分区没有可直接结算的轨道通勤。你仍然可以查看交通层规则，后续再接入干道、摆渡和出租系统。
                  </div>
                )}
              </div>
            </div>
          </div>

          {!!notice && (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">
              {notice}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TravelPlannerModal;
