import React, { useEffect, useMemo, useState } from 'react';
import { Package, ScrollText, Sparkles, Wrench, X } from 'lucide-react';
import { BlackMarketHubTab, BlackMarketRecord, BlackMarketVenue } from '../../types';

interface Props {
  currentLocationLabel: string;
  playerCredits: number;
  initialTab: BlackMarketHubTab;
  venue: BlackMarketVenue | null;
  history: BlackMarketRecord[];
  onClose: () => void;
  onBuyListing: (payload: { listingId: string }) => { ok: boolean; message?: string };
  onUseTreatment: (payload: { treatmentId: string }) => { ok: boolean; message?: string };
  onSubmitCommission: (payload: { request: string }) => { ok: boolean; message?: string };
}

const TABS: Array<{ id: BlackMarketHubTab; label: string; icon: React.ReactNode }> = [
  { id: 'backroom', label: '暗柜', icon: <Package className="h-3.5 w-3.5" /> },
  { id: 'street_doctor', label: '黑医', icon: <Wrench className="h-3.5 w-3.5" /> },
  { id: 'commission', label: '代办', icon: <ScrollText className="h-3.5 w-3.5" /> },
];

const formatClock = (timestamp: string) => {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return timestamp || '刚刚';
  return new Date(parsed).toLocaleTimeString('zh-CN', { hour12: false });
};

const formatSigned = (value: number) => `${value >= 0 ? '+' : '-'}${Math.abs(value).toLocaleString()}`;

const BlackMarketHubModal: React.FC<Props> = ({
  currentLocationLabel,
  playerCredits,
  initialTab,
  venue,
  history,
  onClose,
  onBuyListing,
  onUseTreatment,
  onSubmitCommission,
}) => {
  const [activeTab, setActiveTab] = useState<BlackMarketHubTab>(initialTab);
  const [listingId, setListingId] = useState('');
  const [treatmentId, setTreatmentId] = useState('');
  const [commissionDraft, setCommissionDraft] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (!venue?.listings?.length) {
      setListingId('');
      return;
    }
    setListingId(current => (venue.listings.some(item => item.id === current) ? current : venue.listings[0].id));
  }, [venue]);

  useEffect(() => {
    if (!venue?.treatments?.length) {
      setTreatmentId('');
      return;
    }
    setTreatmentId(current => (venue.treatments.some(item => item.id === current) ? current : venue.treatments[0].id));
  }, [venue]);

  const selectedListing = useMemo(
    () => venue?.listings.find(item => item.id === listingId) || null,
    [listingId, venue],
  );
  const selectedTreatment = useMemo(
    () => venue?.treatments.find(item => item.id === treatmentId) || null,
    [treatmentId, venue],
  );
  const recentHistory = useMemo(() => history.slice(0, 6), [history]);

  const submitPurchase = () => {
    if (!selectedListing) {
      setNotice('当前没有可购买的暗柜货。');
      return;
    }
    const result = onBuyListing({ listingId: selectedListing.id });
    setNotice(result.message || '暗柜账单已刷新。');
  };

  const submitTreatment = () => {
    if (!selectedTreatment) {
      setNotice('当前没有可接入的黑医处理。');
      return;
    }
    const result = onUseTreatment({ treatmentId: selectedTreatment.id });
    setNotice(result.message || '黑医窗口已完成处理。');
  };

  const submitCommission = () => {
    const request = commissionDraft.trim();
    if (!request) {
      setNotice('先写清楚你要代办什么。');
      return;
    }
    const result = onSubmitCommission({ request });
    if (result.ok) setCommissionDraft('');
    setNotice(result.message || '代办窗口已登记。');
  };

  return (
    <div className="fixed inset-0 z-[148] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-6xl rounded-3xl border border-emerald-500/18 bg-[#030706] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-emerald-200/70">
              <Sparkles className="h-4 w-4" />
              黑市渠道层
            </div>
            <div className="mt-1 text-xl font-bold text-white">{venue?.title || '灰市渠道未上线'}</div>
            <div className="mt-1 text-xs text-slate-400">
              当前锚点：{currentLocationLabel} / 灵能币余额：{playerCredits.toLocaleString()}
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
                  activeTab === tab.id ? 'bg-emerald-200 text-black' : 'text-slate-400 hover:text-emerald-100'
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
              <div className="rounded-[24px] border border-emerald-500/15 bg-emerald-500/[0.05] px-4 py-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-emerald-200/60">
                  {venue?.districtLabel || 'Black Market'}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">{venue?.locationLabel || currentLocationLabel}</div>
                <div className="mt-1 text-sm text-slate-300">{venue?.heatLabel || '灰市流量待刷新'}</div>
              </div>

              {activeTab === 'backroom' && (
                <>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{venue?.backroomLabel || '暗柜货架'}</div>
                    <div className="mt-3 grid gap-3">
                      {(venue?.listings || []).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setListingId(item.id)}
                          className={`rounded-[20px] border px-4 py-4 text-left transition ${
                            selectedListing?.id === item.id
                              ? 'border-emerald-400/30 bg-emerald-500/10'
                              : 'border-white/10 bg-black/20 hover:border-emerald-300/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">
                                {item.item.icon} {item.label}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">{item.summary}</div>
                              <div className="mt-2 text-[11px] text-slate-500">{item.note}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-emerald-100">{item.price.toLocaleString()}</div>
                              <div className="text-[11px] text-amber-200">{item.riskLabel}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs text-slate-400">
                      {selectedListing
                        ? `${selectedListing.item.name} / ${selectedListing.item.rank} / ${selectedListing.item.description || selectedListing.summary}`
                        : '先选一件暗柜货。'}
                    </div>
                    <button
                      type="button"
                      onClick={submitPurchase}
                      className="mt-3 rounded-[18px] border border-emerald-400/25 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-500/18"
                    >
                      结算暗柜货
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'street_doctor' && (
                <>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{venue?.doctorLabel || '黑医窗口'}</div>
                    <div className="mt-3 grid gap-3">
                      {(venue?.treatments || []).map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTreatmentId(item.id)}
                          className={`rounded-[20px] border px-4 py-4 text-left transition ${
                            selectedTreatment?.id === item.id
                              ? 'border-sky-400/30 bg-sky-500/10'
                              : 'border-white/10 bg-black/20 hover:border-sky-300/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-white">{item.label}</div>
                              <div className="mt-1 text-xs text-slate-400">{item.summary}</div>
                              <div className="mt-2 text-[11px] text-slate-500">{item.note}</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-sky-100">{item.price.toLocaleString()}</div>
                              <div className="text-[11px] text-slate-500">{item.intensity}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs text-slate-400">
                      {selectedTreatment ? `${selectedTreatment.label} / ${selectedTreatment.summary}` : '先选一项黑医处理。'}
                    </div>
                    <button
                      type="button"
                      onClick={submitTreatment}
                      className="mt-3 rounded-[18px] border border-sky-400/25 bg-sky-500/10 px-4 py-2 text-sm font-semibold text-sky-100 hover:bg-sky-500/18"
                    >
                      结算黑医处理
                    </button>
                  </div>
                </>
              )}

              {activeTab === 'commission' && (
                <>
                  <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{venue?.commissionLabel || '代办登记'}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(venue?.commissionHints || []).map(hint => (
                        <div
                          key={hint}
                          className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] text-slate-300"
                        >
                          {hint}
                        </div>
                      ))}
                    </div>
                    <textarea
                      value={commissionDraft}
                      onChange={event => setCommissionDraft(event.target.value)}
                      placeholder="写清楚你要代办什么，比如：帮我找一套夜莺制服高仿，三天内取货。"
                      className="mt-4 min-h-[160px] w-full rounded-[20px] border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-600"
                    />
                    <button
                      type="button"
                      onClick={submitCommission}
                      className="mt-3 rounded-[18px] border border-amber-400/25 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/18"
                    >
                      登记代办
                    </button>
                  </div>
                </>
              )}

              <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-400">
                {notice || '黑市结算由前端本轮完成，下一轮 AI 只接结果，不代替你跑概率和路线。'}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-500">最近渠道记录</div>
                <div className="mt-3 space-y-3">
                  {recentHistory.length === 0 ? (
                    <div className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3 text-xs text-slate-500">
                      还没有黑市记录。
                    </div>
                  ) : (
                    recentHistory.map(record => (
                      <div key={record.id} className="rounded-[18px] border border-white/8 bg-black/20 px-3 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{record.title}</div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {record.kind} · {formatClock(record.resolvedAt)}
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${record.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {formatSigned(record.amount)}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-slate-400">{record.detail}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlackMarketHubModal;
