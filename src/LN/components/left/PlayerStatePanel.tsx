import React from 'react';
import { PlayerStats } from '../../types';
import {
  Activity,
  Brain,
  Zap,
  Heart,
  Droplets,
  Coins,
  Wind,
  Atom,
  Sparkles,
  Dumbbell,
  Gauge,
  Shield,
  Eye,
  Flame,
  WandSparkles,
} from 'lucide-react';

interface Props {
  stats: PlayerStats;
  hasBetaChip?: boolean;
  onOpenSpiritCore?: () => void;
  gender?: 'male' | 'female';
}

const PlayerStatePanel: React.FC<Props> = ({ stats, hasBetaChip, onOpenSpiritCore, gender = 'male' }) => {
  const segments = 20;
  const activeSegments = Math.ceil((stats.formStability / 100) * segments);

  const getStabilityColor = () => {
    if (stats.formStability > 75) return 'bg-fuchsia-500';
    if (stats.formStability > 50) return 'bg-purple-500';
    if (stats.formStability > 25) return 'bg-amber-500';
    return 'bg-red-600 animate-pulse';
  };

  const rankLevel = parseInt(stats.psionic.level.replace('Lv.', ''));
  const rankBonus = rankLevel * 20;
  const isFemale = gender === 'female';
  const conversionRate = stats.psionic.conversionRate;
  const isSovereignMale = !isFemale && conversionRate > 200;
  const rankText = stats.psionic.level.replace('Lv.', '') + '级';
  const sixDim = {
    力量: stats.sixDim?.力量 ?? 8,
    敏捷: stats.sixDim?.敏捷 ?? 8,
    体质: stats.sixDim?.体质 ?? 8,
    感知: stats.sixDim?.感知 ?? 8,
    意志: stats.sixDim?.意志 ?? 8,
    魅力: stats.sixDim?.魅力 ?? stats.charisma.current ?? 8,
  };
  const sixDimCap = stats.sixDim?.cap ?? 99;
  const sixDimEntries: Array<{ key: keyof typeof sixDim; icon: React.ReactNode; color: string }> = [
    { key: '力量', icon: <Dumbbell className="w-3 h-3" />, color: 'text-rose-300' },
    { key: '敏捷', icon: <Gauge className="w-3 h-3" />, color: 'text-cyan-300' },
    { key: '体质', icon: <Shield className="w-3 h-3" />, color: 'text-emerald-300' },
    { key: '感知', icon: <Eye className="w-3 h-3" />, color: 'text-violet-300' },
    { key: '意志', icon: <Flame className="w-3 h-3" />, color: 'text-amber-300' },
    { key: '魅力', icon: <WandSparkles className="w-3 h-3" />, color: 'text-fuchsia-300' },
  ];

  return (
    <div className="mb-0 select-none px-2 py-2">
      <div className="space-y-3 mb-4">
        <div className="relative h-5 bg-black/60 border border-slate-800 rounded-full overflow-hidden shadow-md">
          <div
            className="absolute inset-y-0 left-0 bg-red-800/80 transition-all duration-300"
            style={{ width: `${(stats.hp.current / stats.hp.max) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold z-10 text-white leading-none tracking-wide">
            <span className="flex items-center gap-2">
              <Heart className="w-3.5 h-3.5 text-red-200 fill-red-800" /> 生命值
            </span>
            <span className="font-mono opacity-85">{stats.hp.current} / {stats.hp.max}</span>
          </div>
        </div>

        <div className="relative h-5 bg-black/60 border border-slate-800 rounded-full overflow-hidden shadow-md">
          <div
            className="absolute inset-y-0 left-0 bg-fuchsia-800/80 transition-all duration-300"
            style={{ width: `${(stats.mp.current / stats.mp.max) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-bold z-10 text-white leading-none tracking-wide">
            <span className="flex items-center gap-2">
              <Droplets className="w-3.5 h-3.5 text-fuchsia-200 fill-fuchsia-800" /> 灵力值
            </span>
            <span className="font-mono opacity-85">{stats.mp.current} / {stats.mp.max}</span>
          </div>
        </div>
      </div>

      <div className="w-full mb-4">
        <div className="flex justify-between items-center mb-1.5 px-1">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">形态稳定率</span>
          </div>
          <span className="text-[10px] font-mono text-fuchsia-500">{stats.formStability}%</span>
        </div>

        <div className="flex gap-[2px] h-1.5 w-full bg-slate-900/50 p-[1px] rounded-sm overflow-hidden">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className={`h-full flex-1 rounded-[1px] transition-all duration-300 ${
                i < activeSegments ? getStabilityColor() : 'bg-slate-900'
              }`}
            />
          ))}
        </div>
      </div>

      <div
        onClick={onOpenSpiritCore}
        className={`w-full mb-4 bg-slate-900/30 border rounded-lg p-3 relative overflow-hidden group cursor-pointer transition-all ${
          isSovereignMale
            ? 'border-amber-500/50 hover:bg-amber-950/20'
            : 'border-amber-900/30 hover:bg-slate-900/60 hover:border-amber-500/50'
        }`}
      >
        <div className="absolute top-0 right-0 p-1 opacity-10">
          <Atom className="w-14 h-14 text-amber-500" />
        </div>

        <div className="flex justify-between items-center mb-2 relative z-10">
          <div className="flex items-center gap-1">
            <Zap className={`w-3.5 h-3.5 ${isSovereignMale ? 'text-red-500' : 'text-amber-500'}`} />
            <span className={`text-[10px] font-bold ${isSovereignMale ? 'text-red-100' : 'text-amber-100 group-hover:text-amber-400'}`}>
              {isFemale ? '灵枢检测' : '灵核检测'}
            </span>
          </div>
          <span className={`text-[9px] border px-1 rounded bg-black/50 ${isSovereignMale ? 'text-red-400 border-red-500' : 'text-amber-500/80 border-amber-900/50'}`}>
            {isFemale ? '奇点型' : isSovereignMale ? '领袖型' : '发散型'}
          </span>
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
            <div className={`absolute inset-0 blur-md rounded-full animate-pulse ${isFemale ? 'bg-fuchsia-500/10' : 'bg-amber-500/10'}`} />
            {isFemale ? (
              <div className="w-7 h-7 border-2 border-fuchsia-600 rounded-full flex items-center justify-center bg-black shadow-[0_0_15px_#d946ef]">
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            ) : (
              <div
                className={`w-7 h-7 border-2 rounded-full flex items-center justify-center bg-black ${
                  isSovereignMale ? 'border-red-500 shadow-[0_0_20px_#ef4444]' : 'border-amber-600 shadow-[0_0_15px_#f59e0b]'
                }`}
              >
                <div className="w-2 h-2 bg-white rounded-full" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-end mb-1">
              <span className="text-[10px] text-slate-400">灵能密度</span>
              <span className="text-sm font-bold text-white font-mono">{rankText}</span>
            </div>
            <div className="h-1.5 w-full bg-black rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full opacity-80 ${
                  isFemale
                    ? 'bg-gradient-to-r from-transparent via-fuchsia-600 to-fuchsia-200'
                    : 'bg-gradient-to-r from-transparent via-amber-600 to-amber-200'
                }`}
                style={{ width: `${(stats.psionic.xp / stats.psionic.maxXp) * 100}%` }}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenSpiritCore?.();
          }}
          className="absolute bottom-1 right-2 text-[8px] text-amber-500 bg-black/80 px-1 rounded border border-amber-900 hover:text-white hover:border-amber-500"
        >
          查看灵核详情
        </button>
      </div>

      <div className="w-full mb-4 px-1">
        <div className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1">
            <Wind className={`w-3 h-3 ${hasBetaChip || stats.gasMask.current > 50 ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-[10px] text-slate-400 font-bold">大气过滤</span>
          </div>
          <span className={`text-[10px] font-mono ${hasBetaChip ? 'text-green-500' : stats.gasMask.current < 20 ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`}>
            {hasBetaChip ? '安全' : `${stats.gasMask.current}%`}
          </span>
        </div>

        {hasBetaChip ? (
          <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
            <div className="h-full bg-green-600 w-full shadow-[0_0_8px_#15803d]" />
          </div>
        ) : (
          <div className="h-1 w-full bg-black/60 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                stats.gasMask.current > 50 ? 'bg-green-600' : stats.gasMask.current > 20 ? 'bg-yellow-600' : 'bg-red-600'
              }`}
              style={{ width: `${(stats.gasMask.current / stats.gasMask.max) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1a051a]/50 border border-fuchsia-900/30 p-2 flex flex-col justify-between relative overflow-hidden h-16 rounded-xl hover:border-fuchsia-500/50 transition-colors group">
          <div className="flex items-center gap-1 relative z-10 mb-1">
            <Brain className="w-3 h-3 text-purple-400" />
            <span className="text-[10px] text-slate-400 font-bold">理智值</span>
          </div>
          <div className="relative z-10 flex items-baseline gap-1">
            <span className="text-lg font-bold text-purple-300 font-mono">{stats.sanity.current}</span>
            <span className="text-[9px] text-slate-500">/ {stats.sanity.max + rankBonus}</span>
          </div>
          <div className="text-[8px] text-purple-500/60 relative z-10">+ {rankBonus} 境界加成</div>
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-purple-500 transition-all opacity-50"
            style={{ width: `${(stats.sanity.current / (stats.sanity.max + rankBonus)) * 100}%` }}
          />
        </div>

        <div className="bg-[#131005]/50 border border-cyan-900/30 p-2 flex flex-col justify-between h-16 rounded-xl hover:border-cyan-500/50 transition-colors">
          <div className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] text-slate-400 font-bold">魅力值</span>
          </div>
          <div className="text-lg font-bold text-cyan-300 leading-none font-mono mt-auto">
            {stats.charisma.current}
            <span className="text-[9px] text-slate-500 ml-1">/ {stats.charisma.max}</span>
          </div>
        </div>

        <div className="bg-[#1a1005]/50 border border-amber-900/30 p-2 flex flex-col justify-between h-16 rounded-xl hover:border-amber-500/50 transition-colors">
          <div className="flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-500" />
            <span className="text-[10px] text-slate-400 font-bold">灵能币</span>
          </div>
          <div className="text-lg font-bold text-amber-400 truncate leading-none font-mono mt-auto">¥ {stats.credits.toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-slate-800 bg-black/30 p-2.5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-slate-400 font-bold">六维属性</div>
          <div className="text-[10px] text-slate-500 font-mono">上限 {sixDimCap}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {sixDimEntries.map(entry => {
            const value = sixDim[entry.key];
            const percent = Math.max(2, Math.min(100, (value / sixDimCap) * 100));
            return (
              <div key={entry.key} className="rounded-lg border border-slate-800/90 bg-slate-950/40 p-2">
                <div className="flex items-center justify-between">
                  <div className={`text-[10px] flex items-center gap-1 ${entry.color}`}>
                    {entry.icon}
                    <span>{entry.key}</span>
                  </div>
                  <div className={`text-[11px] font-mono font-bold ${entry.color}`}>{value}</div>
                </div>
                <div className="mt-1 h-1 rounded-full bg-black/70 overflow-hidden">
                  <div className="h-full bg-slate-300/70" style={{ width: `${percent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PlayerStatePanel;
