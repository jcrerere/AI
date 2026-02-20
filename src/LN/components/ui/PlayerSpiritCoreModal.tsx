import React, { useState } from 'react';
import { Skill, Rank, RuntimeAffix } from '../../types';
import { getRankColor } from '../../constants';
import { X, AlertTriangle, Sparkles, Trash2, Atom, Lock, Brain, Infinity, Gauge, RefreshCw, Sigma, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  skills: Skill[];
  onAddSkill: () => void;
  onRemoveSkill: (id: string) => void;
  onClose: () => void;
  rank: Rank;
  isReadOnly?: boolean;
  gender?: 'male' | 'female';
  conversionRate?: number;
  recoveryRate?: number;
  baseDailyRecovery?: number;
  coreAffixes?: RuntimeAffix[];
  soulLedger?: Partial<Record<Rank, number>>;
}

const parseRankLevel = (rank: Rank): number => Number(rank.replace('Lv.', '')) || 1;
const normalizeRate = (value: number): number => (value > 3 ? value / 100 : value);
const SIX_DIM_KEYS: Array<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力'> = ['力量', '敏捷', '体质', '感知', '意志', '魅力'];
const CORE_MP_CAP_BY_RANK: Record<Rank, number> = {
  [Rank.Lv1]: 200,
  [Rank.Lv2]: 800,
  [Rank.Lv3]: 2500,
  [Rank.Lv4]: 10000,
  [Rank.Lv5]: 50000,
};

const getSkillEffectLines = (skill: Skill): string[] => {
  const preset = (skill.effectLines || []).filter(Boolean);
  if (preset.length > 0) return preset;

  const lines: string[] = [];
  if (skill.description?.trim()) lines.push(skill.description.trim());

  const bonuses = skill.sixDimBonuses || {};
  const hasBonus = Object.keys(bonuses).length > 0;
  if (hasBonus) {
    SIX_DIM_KEYS.forEach(key => {
      const value = bonuses[key];
      if (typeof value === 'number' && value !== 0) {
        lines.push(`${value > 0 ? '+' : ''}${value} ${key}`);
      }
    });
  } else {
    const base = Math.max(2, skill.level * 2);
    lines.push(`+${base} 感知`);
    lines.push(`+${Math.max(1, Math.floor(base / 2))} 意志`);
  }

  return lines;
};

const PlayerSpiritCoreModal: React.FC<Props> = ({
  skills,
  onAddSkill,
  onRemoveSkill,
  onClose,
  rank,
  isReadOnly = false,
  gender = 'male',
  conversionRate = 0,
  recoveryRate = 0,
  baseDailyRecovery = 100,
  coreAffixes = [],
  soulLedger = {},
}) => {
  const isFemale = gender === 'female';
  const maxSkills = isFemale ? Math.max(5, skills.length + 1) : 3;

  const coreTypeLabel = isFemale ? '奇点型 / Singularity' : '发散型 / Divergent';
  const coreColor = isFemale ? 'text-fuchsia-500' : 'text-amber-500';
  const borderColor = isFemale ? 'border-fuchsia-900' : 'border-amber-900';
  const bgColor = isFemale ? 'bg-fuchsia-950/30' : 'bg-amber-950/30';
  const shadowColor = isFemale ? 'shadow-[0_0_50px_rgba(217,70,239,0.15)]' : 'shadow-[0_0_50px_rgba(217,119,6,0.15)]';

  const densityLevel = parseRankLevel(rank);
  const recoveryFactor = normalizeRate(recoveryRate > 0 ? recoveryRate : 1);
  const conversionFactor = normalizeRate(conversionRate > 0 ? conversionRate : 0);
  const dailyRecovery = Math.round(baseDailyRecovery * recoveryFactor);
  const SOUL_CAPACITY_BY_RANK: Record<Rank, number> = {
    [Rank.Lv1]: 30,
    [Rank.Lv2]: 90,
    [Rank.Lv3]: 270,
    [Rank.Lv4]: 810,
    [Rank.Lv5]: 2430,
  };
  const SOUL_REGEN_BY_RANK: Record<Rank, number> = {
    [Rank.Lv1]: 1,
    [Rank.Lv2]: 3,
    [Rank.Lv3]: 9,
    [Rank.Lv4]: 27,
    [Rank.Lv5]: 81,
  };
  const soulCount =
    (soulLedger[Rank.Lv1] || 0) +
    (soulLedger[Rank.Lv2] || 0) +
    (soulLedger[Rank.Lv3] || 0) +
    (soulLedger[Rank.Lv4] || 0) +
    (soulLedger[Rank.Lv5] || 0);
  const soulCapacity =
    (soulLedger[Rank.Lv1] || 0) * SOUL_CAPACITY_BY_RANK[Rank.Lv1] +
    (soulLedger[Rank.Lv2] || 0) * SOUL_CAPACITY_BY_RANK[Rank.Lv2] +
    (soulLedger[Rank.Lv3] || 0) * SOUL_CAPACITY_BY_RANK[Rank.Lv3] +
    (soulLedger[Rank.Lv4] || 0) * SOUL_CAPACITY_BY_RANK[Rank.Lv4] +
    (soulLedger[Rank.Lv5] || 0) * SOUL_CAPACITY_BY_RANK[Rank.Lv5];
  const soulRegen =
    (soulLedger[Rank.Lv1] || 0) * SOUL_REGEN_BY_RANK[Rank.Lv1] +
    (soulLedger[Rank.Lv2] || 0) * SOUL_REGEN_BY_RANK[Rank.Lv2] +
    (soulLedger[Rank.Lv3] || 0) * SOUL_REGEN_BY_RANK[Rank.Lv3] +
    (soulLedger[Rank.Lv4] || 0) * SOUL_REGEN_BY_RANK[Rank.Lv4] +
    (soulLedger[Rank.Lv5] || 0) * SOUL_REGEN_BY_RANK[Rank.Lv5];
  const coreMpCap = CORE_MP_CAP_BY_RANK[rank] || 200;
  const soulSeaMax = Math.min(coreMpCap, soulCapacity);
  const soulSeaCurrent = soulSeaMax;
  const soulSeaPercent = soulSeaMax > 0 ? Math.round((soulSeaCurrent / soulSeaMax) * 100) : 0;
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(skills[0]?.id || null);

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className={`w-full max-w-md bg-slate-950 border ${isFemale ? 'border-fuchsia-600/30' : 'border-amber-600/30'} ${shadowColor} flex flex-col relative overflow-hidden`}>
        <div className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,${isFemale ? 'rgba(217,70,239,0.1)' : 'rgba(217,119,6,0.1)'},transparent_70%)] pointer-events-none`} />

        <div className={`flex justify-between items-start p-4 border-b ${borderColor} relative z-10 bg-black/40`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full border-2 ${isFemale ? 'border-fuchsia-500' : 'border-amber-500'} flex items-center justify-center bg-black/50 shadow-[0_0_15px_currentColor] relative ${coreColor}`}>
              {isFemale ? <Infinity className="w-6 h-6 animate-pulse" /> : <Atom className="w-6 h-6 animate-spin-slow" />}
              <div className={`absolute inset-0 rounded-full border ${isFemale ? 'border-fuchsia-500/50' : 'border-amber-500/50'} animate-ping opacity-50`} />
            </div>
            <div>
              <h2 className={`text-lg font-bold ${isFemale ? 'text-fuchsia-100' : 'text-amber-100'} leading-none`}>灵核空间 (Spirit Core)</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={`text-[10px] ${coreColor} border ${borderColor} px-1.5 rounded ${bgColor} uppercase`}>{coreTypeLabel}</span>
                <span className={`text-[10px] font-bold ${getRankColor(rank)} px-1.5`}>{rank}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-red-950/20 border-y border-red-900/30 p-2 flex items-center gap-2 justify-center">
          {isFemale ? (
            <>
              <Sparkles className="w-4 h-4 text-fuchsia-500" />
              <span className="text-[10px] text-fuchsia-300 font-mono">奇点灵核稳定，回路压缩效率优先。</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-[10px] text-amber-300 font-mono">发散灵核活跃，外放与感知能力优先。</span>
            </>
          )}
        </div>

        <div className="p-4 space-y-4 relative z-10">
          <div className="grid grid-cols-3 gap-2 text-[10px]">
            <div className="border border-slate-800 bg-black/40 p-2">
              <div className="text-slate-500 flex items-center gap-1"><Gauge className="w-3 h-3" /> 密度等级</div>
              <div className="text-cyan-300 font-mono">Lv.{densityLevel}</div>
            </div>
            <div className="border border-slate-800 bg-black/40 p-2">
              <div className="text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 回复率</div>
              <div className="text-fuchsia-300 font-mono">{Math.round(recoveryFactor * 100)}%</div>
            </div>
            <div className="border border-slate-800 bg-black/40 p-2">
              <div className="text-slate-500 flex items-center gap-1"><Sigma className="w-3 h-3" /> 转化率</div>
              <div className="text-amber-300 font-mono">{Math.round(conversionFactor * 100)}%</div>
            </div>
          </div>

          {isFemale ? (
            <div className="border border-fuchsia-900/40 bg-black/30 p-2 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-[11px] text-fuchsia-300 font-bold">灵魂仓 / 灵海</div>
                <div className="text-[10px] text-slate-500 font-mono">{soulCount} 魂</div>
              </div>
              <div className="border border-slate-800 bg-black/30 p-2">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-slate-500">灵海</span>
                  <span className="text-cyan-300 font-mono">{soulSeaCurrent} / {soulSeaMax}</span>
                </div>
                <div className="h-1.5 rounded-full bg-black/60 overflow-hidden">
                  <div className="h-full bg-fuchsia-500" style={{ width: `${soulSeaPercent}%` }} />
                </div>
              </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="border border-slate-800 p-2">
                    <div className="text-slate-500">灵魂总量</div>
                    <div className="text-cyan-300 font-mono">{soulCount}</div>
                  </div>
                <div className="border border-slate-800 p-2">
                  <div className="text-slate-500">灵海回复贡献</div>
                  <div className="text-amber-300 font-mono">+{soulRegen}/tick</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className={`border ${isFemale ? 'border-fuchsia-900/40' : 'border-amber-900/40'} bg-black/30 p-2 space-y-2`}>
            <div className="flex items-center justify-between">
              <div className={`text-[11px] ${isFemale ? 'text-fuchsia-300' : 'text-amber-300'} font-bold`}>状态</div>
              <div className="text-[10px] text-slate-500 font-mono">{coreAffixes.length} 条</div>
            </div>
            {coreAffixes.length === 0 ? (
              <div className="text-[10px] text-slate-500">当前无状态</div>
            ) : (
              <div className="space-y-1.5">
                {coreAffixes.map(mark => (
                  <div key={mark.id} className="border border-slate-800 bg-black/30 p-2 text-[10px]">
                    <div className={`${isFemale ? 'text-fuchsia-200' : 'text-amber-200'} font-bold`}>{mark.name}</div>
                    <div className="text-slate-400 mt-1">{mark.description}</div>
                    {mark.source && <div className="text-slate-500 mt-1">来源: {mark.source}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>当前灵弦 (Ling Strings)</span>
              <span>{skills.length} / {maxSkills}</span>
            </div>

            {skills.map(skill => {
              const expanded = expandedSkillId === skill.id;
              const effectLines = getSkillEffectLines(skill);
              return (
                <div key={skill.id} className={`bg-slate-900/50 border ${isFemale ? 'border-fuchsia-900/40 hover:border-fuchsia-500/50' : 'border-amber-900/40 hover:border-amber-500/50'} transition-all group relative`}>
                  <button
                    type="button"
                    onClick={() => setExpandedSkillId(prev => (prev === skill.id ? null : skill.id))}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex justify-between items-start mb-1 gap-2">
                      <span className={`text-sm font-bold ${isFemale ? 'text-fuchsia-100' : 'text-amber-100'} group-hover:text-white`}>{skill.name}</span>
                      <div className="flex items-center gap-1">
                        <span className={`text-[10px] ${isFemale ? 'text-fuchsia-500 bg-fuchsia-950/30' : 'text-amber-500 bg-amber-950/30'} font-mono px-1 rounded`}>LV.{skill.level}</span>
                        {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                      </div>
                    </div>
                    {expanded ? (
                      <div className="space-y-1.5 pr-8">
                        {effectLines.map((line, idx) => (
                          <div key={`${skill.id}_line_${idx}`} className="text-[10px] text-slate-400">• {line}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-500 pr-8 truncate">{effectLines[0] || '暂无效果描述'}</p>
                    )}
                  </button>

                  {!isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSkill(skill.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-950/50 rounded transition-all"
                      title="移除此灵弦"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}

            {Array.from({ length: Math.max(0, maxSkills - skills.length) }).map((_, i) => (
              <div key={`empty_${i}`} className="border border-dashed border-slate-800 bg-black/20 p-4 flex flex-col items-center justify-center gap-1 text-slate-600">
                <span className="text-xs font-mono">-- 空闲槽位 --</span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-white/5 space-y-2">
            {!isReadOnly && (
              <button
                type="button"
                onClick={onAddSkill}
                className="w-full py-2 text-xs border border-cyan-800 text-cyan-300 hover:text-white hover:border-cyan-500 transition-colors"
              >
                + 共鸣新灵弦
              </button>
            )}
            <div className="w-full py-3 flex flex-col items-center justify-center gap-2 text-slate-500 border border-dashed border-slate-800 bg-black/40">
              <div className="flex items-center gap-2">
                {isReadOnly ? <Lock className="w-3 h-3" /> : <Brain className={`w-3 h-3 animate-pulse ${coreColor}`} />}
                <span className="text-[10px] font-mono uppercase tracking-wider">
                  {isReadOnly ? '数据流只读 (Read Only)' : '等待灵核觉醒 (Awakening Pending)'}
                </span>
              </div>
              {!isReadOnly && <span className="text-[9px] text-slate-600 italic">后续可通过觉醒提升回复率与转化率。</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerSpiritCoreModal;
