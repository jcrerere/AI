import React, { useMemo, useState } from 'react';
import { ArrowRightLeft, BatteryCharging, Coins, Layers3, Sparkles, Wallet, Zap } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { PlayerStats, Rank } from '../../types';

interface Props {
  stats: PlayerStats;
  currentLocation: string;
  gender: 'male' | 'female';
  regionFactor: number | null;
  coinVault: Partial<Record<Rank, number>>;
  soulLedger?: Partial<Record<Rank, number>>;
  nextRankCoin?: number;
  onConvert: (type: 'xp' | 'coin' | 'mp', amount: number) => void;
  onCrossLevelConvert: (direction: 'up' | 'down', amount: number) => void;
}

const RANK_ORDER: Rank[] = [Rank.Lv1, Rank.Lv2, Rank.Lv3, Rank.Lv4, Rank.Lv5];

const formatRank = (rank: Rank) => rank.replace('Lv.', 'L');

const PsionicEconomyPanel: React.FC<Props> = ({
  stats,
  currentLocation,
  gender,
  regionFactor,
  coinVault,
  soulLedger,
  nextRankCoin = 0,
  onConvert,
  onCrossLevelConvert,
}) => {
  const [batchSize, setBatchSize] = useState(100);
  const effectiveRate = useMemo(() => {
    if (regionFactor === null) return 0;
    return Math.max(0, stats.psionic.conversionRate) / 100 * (regionFactor || 1);
  }, [regionFactor, stats.psionic.conversionRate]);

  const regionSummary =
    regionFactor === null
      ? '当前区域禁用灵能币兑换'
      : `区域倍率 ${regionFactor.toFixed(2)}x，实际铸币效率 ${(effectiveRate * 100).toFixed(0)}%`;

  const handleSafeConvert = (type: 'xp' | 'coin' | 'mp') => {
    const amount = Math.max(1, Math.floor(batchSize || 0));
    onConvert(type, amount);
  };

  return (
    <CyberPanel title="铸币与换币" className="flex-1 min-h-[220px]" noPadding allowExpand collapsible>
      <div className="p-3 bg-black/50 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-amber-300">当前区域</div>
            <div className="mt-1 text-sm font-bold text-amber-100">{currentLocation || '未知区域'}</div>
            <div className="mt-1 text-[11px] text-slate-500">{regionSummary}</div>
          </div>
          <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-300">转化参数</div>
            <div className="mt-1 text-sm font-bold text-cyan-100">{stats.psionic.conversionRate}%</div>
            <div className="mt-1 text-[11px] text-slate-500">
              {gender === 'female' ? '女性回路' : '男性回路'} · 跨级损耗固定 80%
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {[10, 100, 1000, 10000].map(size => (
            <button
              key={size}
              type="button"
              onClick={() => setBatchSize(size)}
              className={`rounded border px-2 py-1 text-[11px] font-mono transition-colors ${
                batchSize === size ? 'border-fuchsia-500 bg-fuchsia-950/30 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {size}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
          <button
            type="button"
            onClick={() => handleSafeConvert('xp')}
            className="rounded-xl border border-violet-800/60 bg-violet-950/20 p-3 text-left hover:border-violet-500/70"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-violet-200">灵能淬炼</div>
              <Sparkles className="w-4 h-4 text-violet-300" />
            </div>
            <div className="mt-2 text-sm text-white">MP → XP</div>
            <div className="mt-1 text-[11px] text-slate-500">按个人转化率提升密度经验，批量 {batchSize}</div>
          </button>

          <button
            type="button"
            onClick={() => handleSafeConvert('coin')}
            disabled={regionFactor === null}
            className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-3 text-left hover:border-amber-500/70 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-amber-200">铸造灵能币</div>
              <Coins className="w-4 h-4 text-amber-300" />
            </div>
            <div className="mt-2 text-sm text-white">MP → Coin</div>
            <div className="mt-1 text-[11px] text-slate-500">当前按区域倍率结算，批量 {batchSize}</div>
          </button>

          <button
            type="button"
            onClick={() => handleSafeConvert('mp')}
            disabled={regionFactor === null}
            className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-3 text-left hover:border-cyan-500/70 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-cyan-200">反向充能</div>
              <BatteryCharging className="w-4 h-4 text-cyan-300" />
            </div>
            <div className="mt-2 text-sm text-white">Coin → MP</div>
            <div className="mt-1 text-[11px] text-slate-500">以当前区域规则换回灵力，批量 {batchSize}</div>
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold text-slate-300">跨级兑换</div>
            <div className="text-[11px] font-mono text-slate-500">高一级持有 {nextRankCoin}</div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onCrossLevelConvert('up', batchSize)}
              className="rounded border border-amber-700/70 px-3 py-2 text-xs text-amber-200 hover:border-amber-500 hover:text-white"
            >
              <div className="flex items-center justify-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                压缩到高一级
              </div>
            </button>
            <button
              type="button"
              onClick={() => onCrossLevelConvert('down', batchSize)}
              className="rounded border border-cyan-700/70 px-3 py-2 text-xs text-cyan-200 hover:border-cyan-500 hover:text-white"
            >
              <div className="flex items-center justify-center gap-1">
                <ArrowRightLeft className="w-3.5 h-3.5" />
                分解到当前级
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-300">
              <Wallet className="w-3.5 h-3.5 text-amber-300" />
              灵能币仓
            </div>
            <div className="space-y-2">
              {RANK_ORDER.map(rank => (
                <div key={rank} className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/40 px-2 py-1.5">
                  <div className="text-[11px] text-slate-400">{formatRank(rank)}</div>
                  <div className="text-[11px] font-mono text-amber-300">{coinVault[rank] || 0}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-bold text-slate-300">
              <Layers3 className="w-3.5 h-3.5 text-fuchsia-300" />
              灵魂账本
            </div>
            <div className="space-y-2">
              {RANK_ORDER.map(rank => (
                <div key={rank} className="flex items-center justify-between rounded border border-slate-800/80 bg-slate-950/40 px-2 py-1.5">
                  <div className="text-[11px] text-slate-400">{formatRank(rank)}</div>
                  <div className="text-[11px] font-mono text-fuchsia-300">{soulLedger?.[rank] || 0}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/10 px-3 py-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1 text-fuchsia-300">
            <Zap className="w-3.5 h-3.5" />
            结算说明
          </div>
          <div className="mt-1">同级兑换仍按个人转化率结算，跨级兑换固定损耗 80%，禁兑区不会开放铸币与反向充能。</div>
        </div>
      </div>
    </CyberPanel>
  );
};

export default PsionicEconomyPanel;
