import React, { useMemo, useState } from 'react';
import { ShoppingBag, TrainFront, X } from 'lucide-react';
import { MetroNetwork, ProceduralShop } from '../../utils/sceneActions';

interface Props {
  mode: 'shop' | 'metro';
  shop?: ProceduralShop;
  metro?: MetroNetwork;
  onClose: () => void;
  onBuy?: (itemId: string) => { ok: boolean; message: string };
  onTravel?: (stopId: string) => { ok: boolean; message: string };
}

const SceneActionModal: React.FC<Props> = props => {
  const [notice, setNotice] = useState<string>('');
  const title = props.mode === 'shop' ? props.shop?.title || '临时货架' : '地铁线路';
  const kicker = props.mode === 'shop' ? '临时货架' : '轨道通勤';
  const icon = props.mode === 'shop' ? <ShoppingBag className="w-4 h-4" /> : <TrainFront className="w-4 h-4" />;
  const colorClass = props.mode === 'shop' ? 'border-cyan-500/20 bg-cyan-500/[0.05]' : 'border-amber-500/20 bg-amber-500/[0.05]';

  const currentLineNames = useMemo(() => {
    if (props.mode !== 'metro' || !props.metro) return '';
    return props.metro.lines
      .filter(line => line.stops.some(stop => stop.id === props.metro.currentStop.id))
      .map(line => line.name)
      .join(' / ');
  }, [props]);

  return (
    <div className="fixed inset-0 z-[145] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={props.onClose}>
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
                ? props.shop?.summary || '当前货架已载入。'
                : `当前站点：${props.metro?.currentStop.label || '未知站点'} ${currentLineNames ? `| ${currentLineNames}` : ''}`}
            </div>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-full border border-white/10 p-2 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-5 custom-scrollbar">
          {props.mode === 'shop' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400">地点：{props.shop?.locationLabel || '未知地点'}</div>
              <div className="grid gap-3 md:grid-cols-2">
                {(props.shop?.items || []).map(item => (
                  <div key={item.id} className={`rounded-2xl border px-4 py-4 ${colorClass}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl leading-none">{item.icon}</div>
                        <div>
                          <div className="text-sm font-semibold text-white">{item.name}</div>
                          <div className="mt-1 text-xs text-slate-400 leading-5">{item.description}</div>
                          <div className="mt-2 text-[11px] text-slate-500">
                            {item.category} | {item.rank}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-amber-300 font-semibold">¥{item.price}</div>
                        <button
                          type="button"
                          onClick={() => setNotice(props.onBuy?.(item.id).message || '购物接口未接入。')}
                          className="mt-3 rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-500/20"
                        >
                          购买
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                          <div>车费 ¥{option.fare}</div>
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
