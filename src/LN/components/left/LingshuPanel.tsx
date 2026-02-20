import React, { useMemo, useState } from 'react';
import CyberPanel from '../ui/CyberPanel';
import { EquippedItem, LingshuPart, Rank, Skill } from '../../types';
import { Atom, Shield, Sparkles, Waves, Wrench, BookOpen, X } from 'lucide-react';

interface Props {
  parts: LingshuPart[];
  onChange?: (parts: LingshuPart[]) => void;
  embedded?: boolean;
}

type SlotKey = 'core' | 'sense' | 'flow' | 'guard';

const SLOT_META: Record<SlotKey, { label: string; icon: React.ReactNode }> = {
  core: { label: '灵枢核心', icon: <Atom className="w-4 h-4" /> },
  sense: { label: '感知回路', icon: <Sparkles className="w-4 h-4" /> },
  flow: { label: '流转回路', icon: <Waves className="w-4 h-4" /> },
  guard: { label: '护持回路', icon: <Shield className="w-4 h-4" /> },
};

const DEFAULT_PARTS: LingshuPart[] = [
  { id: 'ls_core', name: '月潮枢核', rank: Rank.Lv2, description: '灵枢核心部位，维持共鸣稳定。' },
  { id: 'ls_sense', name: '镜花感知', rank: Rank.Lv3, description: '感知回路部位，强化信息读取能力。' },
  { id: 'ls_flow', name: '星环流刻', rank: Rank.Lv4, description: '流转回路部位，提高灵力循环效率。' },
  { id: 'ls_guard', name: '夜雾护印', rank: Rank.Lv1, description: '护持回路部位，降低环境干扰。' },
];

const DEFAULT_EQUIPMENT: EquippedItem[] = [
  { id: 'lse_1', name: '共鸣束环', rank: Rank.Lv2, description: '稳定部位灵压，减少回路噪声。' },
  { id: 'lse_2', name: '灵导护片', rank: Rank.Lv3, description: '提升灵力传导效率与耐受。' },
  { id: 'lse_3', name: '折光膜片', rank: Rank.Lv1, description: '降低外界干扰，提升隐蔽性。' },
  { id: 'lse_4', name: '虚轴锚点', rank: Rank.Lv4, description: '增强高压状态下的稳定锚定。' },
];

const DEFAULT_SKILLS: Skill[] = [
  { id: 'lss_1', name: '灵弦：回声锁定', level: 1, description: '锁定目标灵压特征，提升追踪精度。' },
  { id: 'lss_2', name: '灵弦：镜像偏折', level: 2, description: '短时偏折感知，提高规避能力。' },
  { id: 'lss_3', name: '灵弦：潮汐复位', level: 3, description: '清除回路杂讯，快速恢复秩序。' },
  { id: 'lss_4', name: '灵弦：静默屏障', level: 4, description: '形成短时静默域，压制外部侵扰。' },
];

const rankValue = (rank: Rank) => parseInt(rank.replace('Lv.', ''), 10);
const rankLabel = (rank: Rank) => `${rankValue(rank)}级`;
const levelToRank = (level: number): Rank => {
  if (level <= 1) return Rank.Lv1;
  if (level === 2) return Rank.Lv2;
  if (level === 3) return Rank.Lv3;
  if (level === 4) return Rank.Lv4;
  return Rank.Lv5;
};

const LingshuPanel: React.FC<Props> = ({ parts, onChange, embedded = false }) => {
  const initialParts = parts.length > 0 ? parts : DEFAULT_PARTS;

  const [localParts, setLocalParts] = useState<LingshuPart[]>(initialParts);
  const [isOpen, setIsOpen] = useState(false);
  const [activePartId, setActivePartId] = useState<string>(initialParts[0]?.id || '');
  const [equipRankFilter, setEquipRankFilter] = useState<'all' | Rank>('all');
  const [skillRankFilter, setSkillRankFilter] = useState<'all' | Rank>('all');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const [equipmentPool] = useState<EquippedItem[]>(DEFAULT_EQUIPMENT);
  const [skillPool] = useState<Skill[]>(DEFAULT_SKILLS);

  const sync = (next: LingshuPart[]) => {
    setLocalParts(next);
    onChange?.(next);
  };

  const activePart = useMemo(
    () => localParts.find(p => p.id === activePartId) || localParts[0],
    [localParts, activePartId],
  );

  const updateActivePart = (patch: Partial<LingshuPart>) => {
    if (!activePart) return;
    sync(localParts.map(p => (p.id === activePart.id ? { ...p, ...patch } : p)));
  };

  const filteredEquipment = useMemo(() => {
    const base = equipRankFilter === 'all' ? equipmentPool : equipmentPool.filter(i => i.rank === equipRankFilter);
    return [...base].sort((a, b) => {
      const diff = rankValue(a.rank || Rank.Lv1) - rankValue(b.rank || Rank.Lv1);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [equipmentPool, equipRankFilter, sortDir]);

  const filteredSkills = useMemo(() => {
    const base = skillRankFilter === 'all' ? skillPool : skillPool.filter(s => levelToRank(s.level) === skillRankFilter);
    return [...base].sort((a, b) => {
      const diff = a.level - b.level;
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [skillPool, skillRankFilter, sortDir]);

  const body = (
    <div className="p-3 bg-black/40">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SLOT_META) as SlotKey[]).map((slot, index) => {
          const part = localParts[index];
          return (
            <div key={slot} className="h-20 border border-fuchsia-900/40 rounded-lg bg-slate-950/40 px-2 py-1.5">
              <div className="flex items-center gap-2 text-fuchsia-300 mb-1">
                {SLOT_META[slot].icon}
                <span className="text-[10px]">{SLOT_META[slot].label}</span>
              </div>
              <div className="text-xs text-slate-100 truncate">{part?.name || '空'}</div>
              <div className="text-[10px] text-slate-500 truncate">装配：{part?.equippedItem?.name || '空'}</div>
              <div className="text-[10px] text-slate-500 truncate">灵弦：{part?.spiritSkill?.name || '空'}</div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full mt-3 border border-fuchsia-700/70 text-fuchsia-300 hover:text-white hover:bg-fuchsia-900/30 transition-colors text-xs py-2 rounded"
      >
        打开灵枢管理
      </button>
    </div>
  );

  return (
    <>
      {embedded ? body : <CyberPanel title="灵枢模块" className="mb-2" noPadding>{body}</CyberPanel>}

      {isOpen && (
        <div className="fixed inset-0 z-[95] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl border border-slate-700 bg-[#080408] rounded-lg overflow-hidden">
            <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4">
              <div className="text-sm font-bold text-fuchsia-300">灵枢管理（部位 / 装备 / 灵弦）</div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 border border-slate-800 rounded p-3 bg-black/20">
                <div className="text-xs text-slate-400 mb-2">灵枢部位</div>
                <div className="space-y-2">
                  {localParts.map(part => (
                    <button
                      key={part.id}
                      onClick={() => setActivePartId(part.id)}
                      className={`w-full text-left border rounded p-2 ${activePart?.id === part.id ? 'border-fuchsia-500 bg-fuchsia-900/20' : 'border-slate-700 bg-black/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-100">{part.name}</div>
                        <div className="text-[10px] text-fuchsia-400">{rankLabel(part.rank)}</div>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mt-1">装配：{part.equippedItem?.name || '空'}</div>
                      <div className="text-[10px] text-slate-500 truncate">灵弦：{part.spiritSkill?.name || '空'}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))}
                    className="border border-slate-700 px-2 py-1 text-xs text-slate-300"
                  >
                    排序：{sortDir === 'asc' ? '从低到高' : '从高到低'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-slate-800 rounded p-3 bg-black/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-cyan-300 flex items-center gap-1"><Wrench className="w-3 h-3" />部位装备</div>
                      <select
                        value={equipRankFilter}
                        onChange={e => setEquipRankFilter(e.target.value as 'all' | Rank)}
                        className="bg-black border border-slate-700 px-1.5 py-1 text-[10px] text-white"
                      >
                        <option value="all">全部</option>
                        {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                      </select>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-hidden space-y-2 pr-1">
                      {filteredEquipment.map(item => (
                        <button
                          key={item.id}
                          onClick={() => updateActivePart({ equippedItem: item })}
                          className={`w-full text-left border rounded p-2 ${activePart?.equippedItem?.id === item.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 bg-black/30'}`}
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-slate-100">{item.name}</span>
                            <span className="text-[10px] text-cyan-400">{rankLabel(item.rank || Rank.Lv1)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">{item.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border border-slate-800 rounded p-3 bg-black/20">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs text-purple-300 flex items-center gap-1"><BookOpen className="w-3 h-3" />部位灵弦</div>
                      <select
                        value={skillRankFilter}
                        onChange={e => setSkillRankFilter(e.target.value as 'all' | Rank)}
                        className="bg-black border border-slate-700 px-1.5 py-1 text-[10px] text-white"
                      >
                        <option value="all">全部</option>
                        {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                      </select>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto scrollbar-hidden space-y-2 pr-1">
                      {filteredSkills.map(skill => {
                        const skillRank = levelToRank(skill.level);
                        return (
                          <button
                            key={skill.id}
                            onClick={() => updateActivePart({ spiritSkill: skill })}
                            className={`w-full text-left border rounded p-2 ${activePart?.spiritSkill?.id === skill.id ? 'border-purple-500 bg-purple-900/20' : 'border-slate-700 bg-black/30'}`}
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-slate-100">{skill.name}</span>
                              <span className="text-[10px] text-purple-400">{rankLabel(skillRank)}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1">{skill.description}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LingshuPanel;
