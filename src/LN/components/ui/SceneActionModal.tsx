import React, { useMemo, useState } from 'react';
import { ShoppingBag, TrainFront, X } from 'lucide-react';
import { MetroNetwork, ProceduralShop } from '../../utils/sceneActions';

interface Props {
  mode: 'shop' | 'metro';
  shop?: ProceduralShop;
  metro?: MetroNetwork;
  onClose: () => void;
  onBuy?: (itemId: string) => { ok: boolean; message: string };
  onCommission?: (request: string) => { ok: boolean; message: string };
  onTravel?: (stopId: string) => { ok: boolean; message: string };
}

const SceneActionModal: React.FC<Props> = props => {
  const [notice, setNotice] = useState<string>('');
  const [commissionDraft, setCommissionDraft] = useState('');
  const isRestaurant = props.mode === 'shop' && props.shop?.shopMode === 'restaurant';
  const title = props.mode === 'shop' ? props.shop?.title || '固定店铺' : '地铁线路';
  const kicker = props.mode === 'shop' ? (isRestaurant ? '固定餐厅' : '固定店铺') : '轨道通勤';
  const icon = props.mode === 'shop' ? <ShoppingBag className="w-4 h-4" /> : <TrainFront className="w-4 h-4" />;
  const colorClass = props.mode === 'shop' ? (isRestaurant ? 'border-rose-500/20 bg-rose-500/[0.05]' : 'border-cyan-500/20 bg-cyan-500/[0.05]') : 'border-amber-500/20 bg-amber-500/[0.05]';
  const itemActionLabel = isRestaurant ? '点单' : '购买';
  const commissionSectionLabel = isRestaurant ? '订座 / 留菜' : '进货委托';
  const frontShelfLabel = isRestaurant ? props.shop?.venueLabel || '当期菜单' : '前台货架';

  const currentLineNames = useMemo(() => {
    if (props.mode !== 'metro' || !props.metro) return '';
    return props.metro.lines
      .filter(line => line.stops.some(stop => stop.id === props.metro.currentStop.id))
      .map(line => line.name)
      .join(' / ');
  }, [props]);

  const frontItems = useMemo(
    () => (props.mode === 'shop' ? (props.shop?.items || []).filter(item => item.availability !== 'backroom') : []),
    [props],
  );
  const backroomItems = useMemo(
    () => (props.mode === 'shop' ? (props.shop?.items || []).filter(item => item.availability === 'backroom') : []),
    [props],
  );

  return (
    <div className="fixed inset-0 z-[145] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onClick={props.onClose}>
      <div
        className="w-full max-w-4xl rounded-3xl border border-white/10 bg-[#05070b] shadow-2xl"
        onClick={event => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {icon}
              {kicker}
            </div>
            <div className="mt-1 text-xl font-bold text-white">{title}</div>
            <div className="mt-1 text-xs text-slate-400">
              {props.mode === 'shop'
                ? props.shop?.summary || '当前店铺货架已载入。'
                : `当前站点：${props.metro?.currentStop.label || '未知站点'} ${currentLineNames ? `| ${currentLineNames}` : ''}`}
            </div>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar max-h-[72vh] overflow-y-auto p-5">
          {props.mode === 'shop' && (
            <div className="space-y-3">
              <div className="grid gap-2 text-xs text-slate-400 md:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">地点</div>
                  <div className="mt-1 text-slate-200">{props.shop?.locationLabel || '未知地点'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">档次</div>
                  <div className="mt-1 text-slate-200">{props.shop?.tier || 'standard'}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">熟客折扣</div>
                  <div className="mt-1 text-slate-200">
                    Lv.{props.shop?.discountTier || 0} / 熟客 {props.shop?.loyalty || 0}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">货架周期</div>
                  <div className="mt-1 text-slate-200">{props.shop?.refreshLabel || '当前期'}</div>
                </div>
              </div>

              {isRestaurant && (
                <div className="grid gap-2 text-xs text-slate-400 md:grid-cols-3">
                  <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-rose-200/70">餐厅类型</div>
                    <div className="mt-1 text-rose-50">{props.shop?.venueLabel || '地方餐厅'}</div>
                    <div className="mt-1 text-[11px] text-slate-400">{props.shop?.specialtyLabel || '常餐与热菜'}</div>
                  </div>
                  <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-rose-200/70">熟客关系</div>
                    <div className="mt-1 text-rose-50">{props.shop?.ownerLabel || '老板还在认脸。'}</div>
                    <div className="mt-1 text-[11px] text-slate-400">折扣会跟着熟客度一起抬升。</div>
                  </div>
                  <div className="rounded-2xl border border-rose-500/15 bg-rose-500/[0.04] px-3 py-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-rose-200/70">约会适配</div>
                    <div className="mt-1 text-rose-50">{props.shop?.dateFriendly ? '适合正式邀约和会面。' : '更适合日常吃饭，不强调约会。'}</div>
                    <div className="mt-1 text-[11px] text-slate-400">这里只负责生活场景，不给属性奖励。</div>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{frontShelfLabel}</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {frontItems.map(item => (
                    <div key={item.id} className={`rounded-2xl border px-4 py-4 ${colorClass}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="text-3xl leading-none">{item.icon}</div>
                          <div>
                            <div className="text-sm font-semibold text-white">{item.name}</div>
                            <div className="mt-1 text-xs leading-5 text-slate-400">{item.description}</div>
                            <div className="mt-2 text-[11px] text-slate-500">
                              {item.category} | {item.rank}
                              {item.styleTags?.length ? ` | ${item.styleTags.join(' / ')}` : ''}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-amber-300">{item.price} 灵能币</div>
                          <button
                            type="button"
                            onClick={() => setNotice(props.onBuy?.(item.id).message || '购物接口未接入。')}
                            className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                          >
                            {itemActionLabel}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {frontItems.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-xs text-slate-500 md:col-span-2">
                      {isRestaurant ? '当前菜单这一轮已经被点空，等下一期加菜或直接登记订座更稳。' : '当前前台货架已被扫空，等下一期补货或直接登记委托更稳。'}
                    </div>
                  )}
                </div>
              </div>

              {props.shop?.hasBackroom && (
                <div className="rounded-2xl border border-fuchsia-500/20 bg-fuchsia-500/[0.05] px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/80">暗柜货</div>
                  <div className="mt-1 text-xs text-slate-400">这部分不是公开货架，价格更高，渠道更敏感。</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {backroomItems.map(item => (
                      <div key={item.id} className="rounded-2xl border border-fuchsia-500/20 bg-black/20 px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="text-3xl leading-none">{item.icon}</div>
                            <div>
                              <div className="text-sm font-semibold text-white">{item.name}</div>
                              <div className="mt-1 text-xs leading-5 text-slate-400">{item.description}</div>
                              <div className="mt-2 text-[11px] text-slate-500">
                                {item.category} | {item.rank}
                                {item.styleTags?.length ? ` | ${item.styleTags.join(' / ')}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-amber-300">{item.price} 灵能币</div>
                            <button
                              type="button"
                              onClick={() => setNotice(props.onBuy?.(item.id).message || '购物接口未接入。')}
                              className="mt-3 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 hover:bg-fuchsia-500/20"
                            >
                              拿货
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {backroomItems.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-fuchsia-500/20 bg-black/20 px-4 py-4 text-xs text-slate-500 md:col-span-2">
                        这期暗柜没有可直接拿走的货，只能走委托或等下一期。
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{commissionSectionLabel}</div>
                <div className="mt-1 text-xs text-slate-400">{props.shop?.commissionHint || '可登记代办、留货或下期进货请求。'}</div>
                <div className="mt-3 flex flex-col gap-2 md:flex-row">
                  <input
                    type="text"
                    value={commissionDraft}
                    onChange={event => setCommissionDraft(event.target.value)}
                    placeholder={props.shop?.commissionHint || '例如：帮我留一套制服'}
                    className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const result = props.onCommission?.(commissionDraft) || { ok: false, message: '委托接口未接入。' };
                      setNotice(result.message);
                      if (result.ok) setCommissionDraft('');
                    }}
                    className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                  >
                    {isRestaurant ? '登记订座' : '登记委托'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {props.mode === 'metro' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3 text-sm text-amber-100">
                当前站：{props.metro?.currentStop.label || '未知站点'}
              </div>
              <div className="grid gap-3">
                {(props.metro?.options || []).map(option => (
                  <div key={option.stop.id} className={`rounded-2xl border px-4 py-4 ${colorClass}`}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-white">{option.stop.label}</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {option.stop.region} / {option.stop.district} / 线路 {option.lineIds.map(id => id.toUpperCase()).join(', ')}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right text-xs text-slate-400">
                          <div>车费 {option.fare} 灵能币</div>
                          <div>耗时 {option.minutes} 分钟</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setNotice(props.onTravel?.(option.stop.id).message || '线路接口未接入。')}
                          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100 hover:bg-amber-500/20"
                        >
                          乘车
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!!notice && <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-300">{notice}</div>}
        </div>
      </div>
    </div>
  );
};

export default SceneActionModal;
