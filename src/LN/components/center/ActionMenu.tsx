import React, { useState } from 'react';
import { PlayerStats } from '../../types';
import { ArrowRight, BatteryCharging, ChevronDown, ChevronUp, Coins, Zap } from 'lucide-react';

interface Props {
  stats: PlayerStats;
  onConvert: (type: 'xp' | 'coin' | 'mp', amount: number) => void;
  onCrossLevelConvert?: (direction: 'up' | 'down', amount: number) => void;
  nextRankCoin?: number;
}

const ActionMenu: React.FC<Props> = ({ stats, onConvert, onCrossLevelConvert, nextRankCoin = 0 }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [activeSection, setActiveSection] = useState<'conversion' | 'reserved'>('conversion');

  const safeConvert = (type: 'xp' | 'coin' | 'mp') => {
    let amount = batchSize;
    const rate = Math.max(0, stats.psionic.conversionRate) / 100;

    if (type === 'xp' || type === 'coin') {
      if (rate <= 0) return;
      amount = Math.min(batchSize, stats.mp.current);
    } else {
      if (rate <= 0) return;
      const maxByCredits = stats.credits;
      const maxByCapacity = Math.floor((stats.mp.max - stats.mp.current) / rate);
      amount = Math.min(batchSize, maxByCredits, Math.max(0, maxByCapacity));
    }

    if (amount <= 0) return;
    onConvert(type, amount);
  };

  return (
    <div className="relative z-20 mx-4 mb-2">
      <div className="flex justify-center">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[#080408] border border-b-0 border-fuchsia-900/50 text-fuchsia-500 px-4 py-1 rounded-t-lg hover:text-white hover:bg-fuchsia-900/20 transition-all flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest"
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          灵能操作
        </button>
      </div>

      {isOpen && (
        <div className="bg-[#0a050a]/95 border border-fuchsia-900/30 backdrop-blur-xl p-4 rounded-lg shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveSection('conversion')}
              className={`text-xs py-1.5 border transition-colors ${
                activeSection === 'conversion'
                  ? 'border-cyan-500 text-cyan-200 bg-cyan-900/20'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              资源转换
            </button>
            <button
              onClick={() => setActiveSection('reserved')}
              className={`text-xs py-1.5 border transition-colors ${
                activeSection === 'reserved'
                  ? 'border-amber-500 text-amber-200 bg-amber-900/20'
                  : 'border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              其他操作
            </button>
          </div>

          <div className="mb-3 text-[10px] text-slate-500 border border-slate-800 bg-black/30 px-3 py-2">
            行动代价已改为自动结算：发送指令后由系统按六维与场景直接扣除（无需手动计算）。
          </div>

          <div className="flex justify-end gap-2 mb-4">
            {[10, 100, 1000, 10000].map(size => (
              <button
                key={size}
                onClick={() => setBatchSize(size)}
                className={`text-[10px] font-mono border px-2 py-1 rounded transition-all ${
                  batchSize === size ? 'bg-fuchsia-900/50 text-white border-fuchsia-500' : 'text-slate-500 border-slate-700 hover:border-slate-500'
                }`}
              >
                {size}
              </button>
            ))}
          </div>

          {activeSection === 'conversion' && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900/40 border border-slate-800 p-3 flex flex-col gap-2 hover:border-purple-500/50 transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                    <span>淬炼灵核</span>
                    <Zap className="w-3 h-3 text-purple-500" />
                  </div>
                  <div className="text-center py-2">
                    <div className="text-xs text-slate-500 mb-1">MP <ArrowRight className="w-3 h-3 inline mx-1" /> XP</div>
                    <div className="text-[10px] font-mono text-purple-400">倍率: {stats.psionic.conversionRate}%</div>
                  </div>
                  <button onClick={() => safeConvert('xp')} className="bg-purple-900/30 border border-purple-800 hover:bg-purple-600 hover:text-white text-purple-300 text-xs py-2 font-bold transition-all active:scale-95">
                    转化
                  </button>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-3 flex flex-col gap-2 hover:border-amber-500/50 transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                    <span>铸造货币</span>
                    <Coins className="w-3 h-3 text-amber-500" />
                  </div>
                    <div className="text-center py-2">
                    <div className="text-xs text-slate-500 mb-1">MP <ArrowRight className="w-3 h-3 inline mx-1" /> Coin</div>
                    <div className="text-[10px] font-mono text-amber-400">倍率: {stats.psionic.conversionRate}%</div>
                  </div>
                  <button onClick={() => safeConvert('coin')} className="bg-amber-900/30 border border-amber-800 hover:bg-amber-600 hover:text-white text-amber-300 text-xs py-2 font-bold transition-all active:scale-95">
                    铸造
                  </button>
                </div>

                <div className="bg-slate-900/40 border border-slate-800 p-3 flex flex-col gap-2 hover:border-cyan-500/50 transition-colors">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 uppercase font-bold">
                    <span>购买灵力</span>
                    <BatteryCharging className="w-3 h-3 text-cyan-500" />
                  </div>
                    <div className="text-center py-2">
                    <div className="text-xs text-slate-500 mb-1">Coin <ArrowRight className="w-3 h-3 inline mx-1" /> MP</div>
                    <div className="text-[10px] font-mono text-red-400">倍率: {stats.psionic.conversionRate}%</div>
                  </div>
                  <button onClick={() => safeConvert('mp')} className="bg-cyan-900/30 border border-cyan-800 hover:bg-cyan-600 hover:text-white text-cyan-300 text-xs py-2 font-bold transition-all active:scale-95">
                    充能
                  </button>
                </div>
              </div>

              {onCrossLevelConvert && (
                <div className="mt-4 border border-slate-800 bg-black/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] text-slate-400 uppercase font-bold">跨级兑换（固定损耗80%）</div>
                    <div className="text-[10px] text-slate-500 font-mono">高一级持有: {nextRankCoin}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => onCrossLevelConvert('up', batchSize)}
                      className="bg-amber-900/30 border border-amber-800 hover:bg-amber-600 hover:text-white text-amber-300 text-xs py-2 font-bold transition-all active:scale-95"
                    >
                      压缩到高一级
                    </button>
                    <button
                      onClick={() => onCrossLevelConvert('down', batchSize)}
                      className="bg-cyan-900/30 border border-cyan-800 hover:bg-cyan-600 hover:text-white text-cyan-300 text-xs py-2 font-bold transition-all active:scale-95"
                    >
                      分解到当前级
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeSection === 'reserved' && (
            <div className="mt-2 border border-slate-800 bg-black/30 p-3 space-y-2">
              <div className="text-[10px] text-slate-400 uppercase font-bold">预留操作位（后续扩展）</div>
              <div className="space-y-2 text-xs text-slate-400">
                <div className="border border-slate-700/80 bg-[#081020]/70 px-3 py-2">灵枢注能（预留）</div>
                <div className="border border-slate-700/80 bg-[#081020]/70 px-3 py-2">灵弦共鸣（预留）</div>
                <div className="border border-slate-700/80 bg-[#081020]/70 px-3 py-2">装备校准（预留）</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActionMenu;
