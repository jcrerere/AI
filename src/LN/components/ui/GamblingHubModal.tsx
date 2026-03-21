import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Dice3, Flag, HeartHandshake, Sparkles, Ticket, Trophy, X } from 'lucide-react';
import {
  BlackRaceBetRecord,
  BlackRaceMarket,
  GamblingHubTab,
  HorseRaceBetRecord,
  HorseRaceMeet,
  RedLightSessionRecord,
  RedLightVenue,
  SlotSpinRecord,
} from '../../types';

interface Props {
  currentLocationLabel: string;
  playerCredits: number;
  playerGender: 'male' | 'female';
  initialTab: GamblingHubTab;
  blackRaceMarket: BlackRaceMarket | null;
  blackRaceHistory: BlackRaceBetRecord[];
  horseRaceMeet: HorseRaceMeet | null;
  horseRaceHistory: HorseRaceBetRecord[];
  redLightVenue: RedLightVenue | null;
  redLightHistory: RedLightSessionRecord[];
  slotHistory: SlotSpinRecord[];
  onClose: () => void;
  onPlaceBlackRaceBet: (payload: {
    optionId: string;
    amount: number;
  }) => { ok: boolean; message?: string; outcome?: 'win' | 'lose'; payout?: number; net?: number };
  onPlaceHorseRaceBet: (payload: {
    runnerId: string;
    amount: number;
  }) => { ok: boolean; message?: string; outcome?: 'win' | 'lose'; payout?: number; net?: number };
  onBookRedLightService: (payload: {
    providerId: string;
    serviceId: string;
  }) => { ok: boolean; message?: string; net?: number };
  onWorkRedLightShift: (payload: {
    serviceId: string;
  }) => { ok: boolean; message?: string; net?: number };
  onSpinSlots: (payload: {
    amount: number;
  }) => { ok: boolean; message?: string; outcome?: SlotSpinRecord['outcome']; payout?: number; net?: number };
}

const TABS: Array<{ id: GamblingHubTab; label: string; icon: React.ReactNode }> = [
  { id: 'black_race', label: '黑赛', icon: <Flag className="h-3.5 w-3.5" /> },
  { id: 'horse_race', label: '赛马', icon: <Trophy className="h-3.5 w-3.5" /> },
  { id: 'slot_machine', label: '三转盘', icon: <Dice3 className="h-3.5 w-3.5" /> },
  { id: 'red_light', label: '红灯服务', icon: <HeartHandshake className="h-3.5 w-3.5" /> },
];

const formatClock = (timestamp: string) => {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return timestamp || '刚刚';
  return new Date(parsed).toLocaleTimeString('zh-CN', { hour12: false });
};

const formatSigned = (value: number) => `${value >= 0 ? '+' : '-'}${Math.abs(value).toLocaleString()}`;

const GamblingHubModal: React.FC<Props> = ({
  currentLocationLabel,
  playerCredits,
  playerGender,
  initialTab,
  blackRaceMarket,
  blackRaceHistory,
  horseRaceMeet,
  horseRaceHistory,
  redLightVenue,
  redLightHistory,
  slotHistory,
  onClose,
  onPlaceBlackRaceBet,
  onPlaceHorseRaceBet,
  onBookRedLightService,
  onWorkRedLightShift,
  onSpinSlots,
}) => {
  const [activeTab, setActiveTab] = useState<GamblingHubTab>(initialTab);
  const [notice, setNotice] = useState('');
  const [blackRaceOptionId, setBlackRaceOptionId] = useState('');
  const [horseRunnerId, setHorseRunnerId] = useState('');
  const [redLightProviderId, setRedLightProviderId] = useState('');
  const [redLightServiceId, setRedLightServiceId] = useState('');
  const [betAmount, setBetAmount] = useState('120');
  const [slotAmount, setSlotAmount] = useState('80');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!blackRaceMarket?.options?.length) {
      setBlackRaceOptionId('');
      return;
    }
    setBlackRaceOptionId(current =>
      blackRaceMarket.options.some(option => option.id === current) ? current : blackRaceMarket.options[0].id,
    );
  }, [blackRaceMarket]);

  useEffect(() => {
    if (!horseRaceMeet?.runners?.length) {
      setHorseRunnerId('');
      return;
    }
    setHorseRunnerId(current =>
      horseRaceMeet.runners.some(runner => runner.id === current) ? current : horseRaceMeet.runners[0].id,
    );
  }, [horseRaceMeet]);

  useEffect(() => {
    if (!redLightVenue?.providers?.length) {
      setRedLightProviderId('');
      return;
    }
    setRedLightProviderId(current =>
      redLightVenue.providers.some(provider => provider.id === current) ? current : redLightVenue.providers[0].id,
    );
  }, [redLightVenue]);

  useEffect(() => {
    if (!redLightVenue?.services?.length) {
      setRedLightServiceId('');
      return;
    }
    setRedLightServiceId(current =>
      redLightVenue.services.some(service => service.id === current) ? current : redLightVenue.services[0].id,
    );
  }, [redLightVenue]);

  const selectedBlackRaceOption = useMemo(
    () => blackRaceMarket?.options.find(option => option.id === blackRaceOptionId) || null,
    [blackRaceMarket, blackRaceOptionId],
  );
  const selectedHorseRunner = useMemo(
    () => horseRaceMeet?.runners.find(runner => runner.id === horseRunnerId) || null,
    [horseRaceMeet, horseRunnerId],
  );
  const selectedRedLightProvider = useMemo(
    () => redLightVenue?.providers.find(provider => provider.id === redLightProviderId) || null,
    [redLightProviderId, redLightVenue],
  );
  const selectedRedLightService = useMemo(
    () => redLightVenue?.services.find(service => service.id === redLightServiceId) || null,
    [redLightServiceId, redLightVenue],
  );

  const recentBlackRaceHistory = useMemo(() => blackRaceHistory.slice(0, 5), [blackRaceHistory]);
  const recentHorseRaceHistory = useMemo(() => horseRaceHistory.slice(0, 5), [horseRaceHistory]);
  const recentRedLightHistory = useMemo(() => redLightHistory.slice(0, 5), [redLightHistory]);
  const recentSlotHistory = useMemo(() => slotHistory.slice(0, 5), [slotHistory]);

  const submitBlackRace = () => {
    if (!selectedBlackRaceOption) {
      setNotice('当前没有可下注的黑赛盘口。');
      return;
    }
    const result = onPlaceBlackRaceBet({
      optionId: selectedBlackRaceOption.id,
      amount: Number(betAmount) || 0,
    });
    setNotice(result.message || '黑赛盘口已刷新。');
  };

  const submitHorseRace = () => {
    if (!selectedHorseRunner) {
      setNotice('当前没有可下注的赛马对象。');
      return;
    }
    const result = onPlaceHorseRaceBet({
      runnerId: selectedHorseRunner.id,
      amount: Number(betAmount) || 0,
    });
    setNotice(result.message || '赛马盘口已刷新。');
  };

  const submitSlot = () => {
    const result = onSpinSlots({
      amount: Number(slotAmount) || 0,
    });
    setNotice(result.message || '转盘已完成结算。');
  };

  const submitRedLightBooking = () => {
    if (!selectedRedLightProvider || !selectedRedLightService) {
      setNotice('请先锁定名单和服务单。');
      return;
    }
    const result = onBookRedLightService({
      providerId: selectedRedLightProvider.id,
      serviceId: selectedRedLightService.id,
    });
    setNotice(result.message || '红灯服务已完成记账。');
  };

  const submitRedLightShift = () => {
    if (!selectedRedLightService) {
      setNotice('请先选择要接的服务单。');
      return;
    }
    const result = onWorkRedLightShift({
      serviceId: selectedRedLightService.id,
    });
    setNotice(result.message || '上工结算已完成。');
  };

  return (
    <div className="fixed inset-0 z-[147] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-3xl border border-fuchsia-500/18 bg-[#05070b] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-fuchsia-200/70">
              <Sparkles className="h-4 w-4" />
              生活层 / 娱乐子层
            </div>
            <div className="mt-1 text-xl font-bold text-white">诺丝区娱乐中枢</div>
            <div className="mt-1 text-xs text-slate-400">
              当前锚点：{currentLocationLabel} / 灵能币余额 {playerCredits.toLocaleString()}
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
          <div className="flex flex-wrap gap-2 rounded-[22px] border border-white/8 bg-white/[0.03] p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[16px] px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-white text-black'
                    : 'text-slate-400 hover:text-fuchsia-100'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  {tab.icon}
                  {tab.label}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
            <div className="space-y-4">
              {activeTab === 'black_race' && (
                <>
                  <div className="rounded-[24px] border border-rose-500/15 bg-rose-500/[0.05] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-rose-200/60">Black Race</div>
                    <div className="mt-2 text-lg font-semibold text-white">{blackRaceMarket?.title || '黑赛盘口未上线'}</div>
                    <div className="mt-1 text-sm text-slate-300">{blackRaceMarket?.venue || '诺丝区·黑赛下注点'}</div>
                    <div className="mt-1 text-xs text-slate-400">{blackRaceMarket?.heatLabel || '盘口平稳'}</div>
                  </div>
                  <div className="grid gap-3">
                    {(blackRaceMarket?.options || []).map(option => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setBlackRaceOptionId(option.id)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition ${
                          selectedBlackRaceOption?.id === option.id
                            ? 'border-rose-400/30 bg-rose-500/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-rose-300/20'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{option.label}</div>
                            <div className="mt-1 text-xs text-slate-400">{option.build} / {option.note}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-amber-200">{option.odds.toFixed(2)}x</div>
                            <div className="text-[11px] text-slate-500">{option.risk}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {[120, 300, 600].map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBetAmount(String(value))}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-rose-300/20 hover:text-white"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="number"
                        min={1}
                        value={betAmount}
                        onChange={event => setBetAmount(event.target.value)}
                        className="flex-1 rounded-[18px] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={submitBlackRace}
                        className="rounded-[18px] border border-rose-400/25 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 hover:bg-rose-500/18"
                      >
                        确认下注
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'horse_race' && (
                <>
                  <div className="rounded-[24px] border border-amber-500/15 bg-amber-500/[0.05] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/60">Horse Race</div>
                    <div className="mt-2 text-lg font-semibold text-white">{horseRaceMeet?.title || '赛马场次未开放'}</div>
                    <div className="mt-1 text-sm text-slate-300">{horseRaceMeet?.venue || '诺丝区·赛马下注台'}</div>
                    <div className="mt-1 text-xs text-slate-400">{horseRaceMeet?.heatLabel || '场次准备中'}</div>
                  </div>
                  <div className="grid gap-3">
                    {(horseRaceMeet?.runners || []).map(runner => (
                      <button
                        key={runner.id}
                        type="button"
                        onClick={() => setHorseRunnerId(runner.id)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition ${
                          selectedHorseRunner?.id === runner.id
                            ? 'border-amber-400/30 bg-amber-500/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-amber-300/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{runner.label}</div>
                            <div className="mt-1 text-xs text-slate-400">{runner.style} / {runner.note}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-amber-200">{runner.odds.toFixed(2)}x</div>
                            <div className="text-[11px] text-slate-500">稳 {runner.stability} / 冲 {runner.sprint}</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {[120, 300, 600].map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBetAmount(String(value))}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-300/20 hover:text-white"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="number"
                        min={1}
                        value={betAmount}
                        onChange={event => setBetAmount(event.target.value)}
                        className="flex-1 rounded-[18px] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={submitHorseRace}
                        className="rounded-[18px] border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/18"
                      >
                        确认下注
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'slot_machine' && (
                <>
                  <div className="rounded-[24px] border border-violet-500/15 bg-violet-500/[0.05] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-violet-200/60">Slot Machine</div>
                    <div className="mt-2 text-lg font-semibold text-white">诺丝区·三转盘机</div>
                    <div className="mt-1 text-sm text-slate-300">点击即结算，结果直接写入生活账本与资金流水。</div>
                    <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
                      <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2">三同普通：6x - 12x</div>
                      <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2">三同稀有：18x 以上</div>
                      <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-2">双同：1.5x - 2.4x</div>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {[80, 160, 320].map(value => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSlotAmount(String(value))}
                          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:border-violet-300/20 hover:text-white"
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="number"
                        min={1}
                        value={slotAmount}
                        onChange={event => setSlotAmount(event.target.value)}
                        className="flex-1 rounded-[18px] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
                      />
                      <button
                        type="button"
                        onClick={submitSlot}
                        className="rounded-[18px] border border-violet-400/25 bg-violet-500/10 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-500/18"
                      >
                        启动转盘
                      </button>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'red_light' && (
                <>
                  <div className="rounded-[24px] border border-pink-500/15 bg-pink-500/[0.05] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-pink-200/60">Red Light</div>
                    <div className="mt-2 text-lg font-semibold text-white">{redLightVenue?.title || '红灯场所未上线'}</div>
                    <div className="mt-1 text-sm text-slate-300">{redLightVenue?.locationLabel || '诺丝区·罪吻广场'}</div>
                    <div className="mt-1 text-xs text-slate-400">{redLightVenue?.heatLabel || '场内热度待刷新'}</div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr,1fr]">
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-200/70">名单</div>
                      {(redLightVenue?.providers || []).map(provider => (
                        <button
                          key={provider.id}
                          type="button"
                          onClick={() => setRedLightProviderId(provider.id)}
                          className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                            selectedRedLightProvider?.id === provider.id
                              ? 'border-pink-400/30 bg-pink-500/10'
                              : 'border-white/10 bg-white/[0.03] hover:border-pink-300/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{provider.label}</div>
                              <div className="mt-1 text-xs text-slate-400">{provider.role} / {provider.style}</div>
                            </div>
                            <div className="text-[11px] text-slate-500">{provider.source === 'authored' ? '命名人物' : '运行时生成'}</div>
                          </div>
                          <div className="mt-2 text-xs text-slate-400">{provider.summary}</div>
                        </button>
                      ))}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-pink-200/70">服务单</div>
                      {(redLightVenue?.services || []).map(service => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => setRedLightServiceId(service.id)}
                          className={`w-full rounded-[22px] border px-4 py-4 text-left transition ${
                            selectedRedLightService?.id === service.id
                              ? 'border-pink-400/30 bg-pink-500/10'
                              : 'border-white/10 bg-white/[0.03] hover:border-pink-300/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{service.label}</div>
                              <div className="mt-1 text-xs text-slate-400">{service.summary}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-amber-200">{service.price}</div>
                              <div className="text-[11px] text-slate-500">{service.category}</div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">{service.note}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={submitRedLightBooking}
                        className="rounded-[18px] border border-pink-400/25 bg-pink-500/10 px-4 py-3 text-sm font-semibold text-pink-100 hover:bg-pink-500/18"
                      >
                        预约服务
                      </button>
                      <button
                        type="button"
                        onClick={submitRedLightShift}
                        disabled={playerGender !== 'female'}
                        className={`rounded-[18px] border px-4 py-3 text-sm font-semibold ${
                          playerGender === 'female'
                            ? 'border-fuchsia-300/25 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/18'
                            : 'border-white/10 bg-white/[0.03] text-slate-500'
                        }`}
                      >
                        接单上工
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-slate-400">
                      {playerGender === 'female'
                        ? '女性角色可直接走上工结算链；作者命名人物会混入场内名单，但不等于常驻从业。'
                        : '当前角色走消费链。后续如果要扩展其他从业方式，再单独拆职业支线。'}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Coins className="h-4 w-4 text-amber-200" />
                  当前回执
                </div>
                <div className="mt-3 rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-sm text-slate-300">
                  {notice || '选择一个娱乐子层后即可在前端直接结算，下一轮 AI 再接收结果。'}
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Ticket className="h-4 w-4 text-cyan-200" />
                  最近结算
                </div>
                <div className="mt-3 space-y-2">
                  {activeTab === 'black_race' && recentBlackRaceHistory.length === 0 && (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-xs text-slate-500">还没有黑赛记录。</div>
                  )}
                  {activeTab === 'black_race' && recentBlackRaceHistory.map(record => (
                    <div key={record.id} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">{record.optionLabel}</span>
                        <span className={record.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatSigned(record.net)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{record.marketTitle} / {formatClock(record.resolvedAt)}</div>
                    </div>
                  ))}

                  {activeTab === 'horse_race' && recentHorseRaceHistory.length === 0 && (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-xs text-slate-500">还没有赛马记录。</div>
                  )}
                  {activeTab === 'horse_race' && recentHorseRaceHistory.map(record => (
                    <div key={record.id} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">{record.runnerLabel}</span>
                        <span className={record.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatSigned(record.net)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{record.meetTitle} / {formatClock(record.resolvedAt)}</div>
                    </div>
                  ))}

                  {activeTab === 'slot_machine' && recentSlotHistory.length === 0 && (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-xs text-slate-500">还没有转盘记录。</div>
                  )}
                  {activeTab === 'slot_machine' && recentSlotHistory.map(record => (
                    <div key={record.id} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">{record.reels.join(' / ')}</span>
                        <span className={record.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatSigned(record.net)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{record.outcome} / {formatClock(record.resolvedAt)}</div>
                    </div>
                  ))}

                  {activeTab === 'red_light' && recentRedLightHistory.length === 0 && (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-xs text-slate-500">还没有红灯服务记录。</div>
                  )}
                  {activeTab === 'red_light' && recentRedLightHistory.map(record => (
                    <div key={record.id} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-semibold text-white">{record.playerRole === 'worker' ? `上工 / ${record.serviceLabel}` : `${record.providerLabel || '场内名单'} / ${record.serviceLabel}`}</span>
                        <span className={record.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatSigned(record.net)}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">{record.venueTitle} / {formatClock(record.resolvedAt)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamblingHubModal;
