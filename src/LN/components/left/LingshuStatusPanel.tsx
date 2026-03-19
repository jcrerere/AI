import React, { useMemo } from 'react';
import { Activity, Layers3, ShieldPlus, Sparkles } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { LingshuPart } from '../../types';

interface Props {
  parts: LingshuPart[];
}

const resolvePartSkills = (part: LingshuPart) => part.spiritSkills ?? (part.spiritSkill ? [part.spiritSkill] : []);
const resolvePartItems = (part: LingshuPart) => part.equippedItems ?? (part.equippedItem ? [part.equippedItem] : []);

const LingshuStatusPanel: React.FC<Props> = ({ parts }) => {
  const summary = useMemo(() => {
    const totalLevel = parts.reduce((sum, part) => sum + (part.level || 0), 0);
    const totalAffixes = parts.reduce((sum, part) => sum + (part.statusAffixes?.length || 0), 0);
    const totalSkills = parts.reduce((sum, part) => sum + resolvePartSkills(part).length, 0);
    const totalEquips = parts.reduce((sum, part) => sum + resolvePartItems(part).length, 0);
    return {
      avgLevel: parts.length > 0 ? (totalLevel / parts.length).toFixed(1) : '0.0',
      totalAffixes,
      totalSkills,
      totalEquips,
    };
  }, [parts]);

  return (
    <CyberPanel title="灵枢状态" className="mb-2" noPadding allowExpand collapsible>
      <div className="p-3 bg-black/40 space-y-3">
        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          <div className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] text-fuchsia-300">
              <Activity className="w-3.5 h-3.5" />
              平均等级
            </div>
            <div className="mt-1 text-lg font-black text-white">{summary.avgLevel}</div>
          </div>
          <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              灵弦槽
            </div>
            <div className="mt-1 text-lg font-black text-white">{summary.totalSkills}</div>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] text-amber-300">
              <ShieldPlus className="w-3.5 h-3.5" />
              装备槽
            </div>
            <div className="mt-1 text-lg font-black text-white">{summary.totalEquips}</div>
          </div>
          <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] text-red-300">
              <Layers3 className="w-3.5 h-3.5" />
              异常状态
            </div>
            <div className="mt-1 text-lg font-black text-white">{summary.totalAffixes}</div>
          </div>
        </div>

        <div className="space-y-2">
          {parts.length === 0 && <div className="rounded border border-slate-800 bg-slate-950/30 px-3 py-2 text-xs text-slate-500">当前未装配灵枢部件。</div>}
          {parts.map(part => {
            const skills = resolvePartSkills(part);
            const equips = resolvePartItems(part);
            const affixes = part.statusAffixes || [];
            return (
              <div key={part.id} className="rounded-xl border border-slate-800 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-white">{part.name}</div>
                    <div className="text-[11px] text-slate-500">
                      {part.rank} · 等级 {part.level || 0} · 进度 {part.strengthProgress ?? 0}%
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    灵弦 {skills.length} / 装备 {equips.length}
                  </div>
                </div>
                {affixes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {affixes.map(affix => (
                      <span
                        key={affix.id}
                        className={`rounded border px-2 py-1 text-[11px] ${
                          affix.type === 'debuff'
                            ? 'border-red-900/50 bg-red-950/20 text-red-200'
                            : affix.type === 'buff'
                            ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-200'
                            : 'border-slate-800 bg-slate-950/30 text-slate-300'
                        }`}
                      >
                        {affix.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </CyberPanel>
  );
};

export default LingshuStatusPanel;
