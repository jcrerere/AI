import React, { useEffect, useMemo, useState } from 'react';
import { NPC, EquippedItem, Skill, Item, RuntimeAffix } from '../../types';
import { Fingerprint, Waves, ShieldAlert, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';

interface Props {
  npc: NPC;
  isReadOnly?: boolean;
  availableEquipItems?: Item[];
  availableResonanceMaterials?: Item[];
  currentMp?: number;
  onForgetSkill?: (partId: string, skillId: string) => void;
  onLearnSkill?: (partId: string, materialId: string) => void;
  onInjectEnergy?: (partId: string, spend: number) => void;
  onEquipItem?: (partId: string, itemId: string) => void;
  onUnequipItem?: (partId: string, itemId: string) => void;
  onRemoveAffix?: (partId: string, affixId: string) => void;
}

const rankText = (rank?: string) => rank || 'Lv.1';
const rankLevel = (rank?: string) => {
  const value = parseInt((rank || 'Lv.1').replace('Lv.', ''), 10);
  return Number.isFinite(value) ? Math.min(5, Math.max(1, value)) : 1;
};
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const SIX_DIM_KEYS: Array<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力'> = ['力量', '敏捷', '体质', '感知', '意志', '魅力'];
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
      if (typeof value === 'number' && value !== 0) lines.push(`${value > 0 ? '+' : ''}${value} ${key}`);
    });
  }
  return lines.length > 0 ? lines : ['暂无效果描述'];
};

const SpiritNexus: React.FC<Props> = ({
  npc,
  isReadOnly = false,
  availableEquipItems = [],
  availableResonanceMaterials = [],
  currentMp = 0,
  onForgetSkill,
  onLearnSkill,
  onInjectEnergy,
  onEquipItem,
  onUnequipItem,
  onRemoveAffix,
}) => {
  const parts = useMemo(() => npc.bodyParts || [], [npc.bodyParts]);
  const [selectedPartId, setSelectedPartId] = useState<string>(parts[0]?.id || '');
  const [equipSelection, setEquipSelection] = useState<Record<string, string>>({});
  const [injectSpend, setInjectSpend] = useState<Record<string, number>>({});
  const [resonanceSelection, setResonanceSelection] = useState<Record<string, string>>({});
  const [expandedSkillId, setExpandedSkillId] = useState<string | null>(null);
  const [expandedEquipId, setExpandedEquipId] = useState<string | null>(null);
  const isMale = npc.gender === 'male';

  useEffect(() => {
    if (parts.length === 0) {
      setSelectedPartId('');
      return;
    }
    if (!selectedPartId) return;
    if (!parts.some(p => p.id === selectedPartId)) {
      setSelectedPartId(parts[0].id);
    }
  }, [parts, selectedPartId]);

  const isHighLeakPart = (partName: string, partKey?: string) => {
    const text = `${partName} ${partKey || ''}`.toLowerCase();
    const commonHead = ['头', '脑', '眼', '嘴', 'face', 'head', 'brain', 'eye', 'mouth'].some(k => text.includes(k));
    if (commonHead) return true;
    return ['阴', '裆', '臀', 'groin', 'genital', 'vulva', 'hip'].some(k => text.includes(k));
  };

  if (parts.length === 0) {
    return <div className="text-xs text-slate-500">暂无灵枢部位数据</div>;
  }

  return (
    <div className="h-full flex flex-col gap-2 max-h-[64vh] overflow-y-auto pr-1 custom-scrollbar">
      {parts.map(part => {
        const active = part.id === selectedPartId;
        const highLeak = isHighLeakPart(part.name, part.key);
        const skills: Skill[] = part.skills || [];
        const equippedItems: EquippedItem[] = part.equippedItems || [];
        const statusAffixes: RuntimeAffix[] = part.statusAffixes || [];
        const level = rankLevel(part.rank);
        const progress = clamp(Math.round(part.strengthProgress ?? 0), 0, 100);
        const skillBonus = skills.length * 4;
        const equipBonus = equippedItems.length * 3;
        const strengthValue = level >= 5 ? 100 : progress;
        const absorbRate = Math.round((isMale ? 18 : 34) + level * 10 + skillBonus + equipBonus);
        const leakBase = highLeak ? (isMale ? 46 : 52) : 14;
        const leakRate = Math.max(3, Math.round(leakBase - level * 4 - skillBonus * 0.5 - equipBonus));
        const brainText = `${part.name} ${part.key || ''}`.toLowerCase();
        const isBrainPart = ['脑', 'brain'].some(k => brainText.includes(k));
        const perceptionValue = Math.round((isMale ? 28 : 22) + strengthValue * 0.7 + skillBonus * 0.8 + equipBonus * 0.6);
        const maxSkillSlots = part.maxSkillSlots || 3;
        const maxEquipSlots = part.maxEquipSlots || 3;
        const canEquipMore = equippedItems.length < maxEquipSlots;
        const selectedEquipId = equipSelection[part.id] || '';

        return (
          <div key={part.id} className="space-y-2">
            <button
              type="button"
              onClick={() => setSelectedPartId(prev => (prev === part.id ? '' : part.id))}
              className={`w-full rounded-full border px-3 py-2 flex items-center justify-between text-left transition-colors ${
                active
                  ? 'border-cyan-500/70 bg-cyan-900/20 text-cyan-100'
                  : 'border-slate-800 bg-black/30 text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="text-xs font-bold">{part.name}</span>
              <span className="text-[10px] text-slate-400">{rankText(part.rank)}</span>
            </button>

            {active && (
              <div className="rounded-2xl border border-slate-800/80 bg-[#0b090f]/95 px-3 pb-3 pt-2.5 space-y-3">
                <div className="text-[11px] text-slate-400">{part.description || '暂无描述'}</div>

                <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-2 text-[11px]">
                  <div className="text-slate-500 flex items-center gap-1">
                    <Fingerprint className="w-3 h-3" /> 灵枢强度
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-cyan-300 font-mono">{rankText(part.rank)} · {strengthValue}%</div>
                    <div className="text-[10px] text-slate-400">{level >= 5 ? '已满阶' : `距下一阶 ${100 - progress}%`}</div>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-black/60 overflow-hidden">
                    <div className="h-full bg-cyan-500" style={{ width: `${clamp(strengthValue, 2, 100)}%` }} />
                  </div>
                </div>

                {!isReadOnly && onInjectEnergy && (
                  <div className="rounded-xl border border-cyan-900/40 p-2 bg-black/20 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">注入灵能提升该部位</span>
                      <span className="text-cyan-300 font-mono">当前灵能值 {currentMp}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={injectSpend[part.id] || 20}
                        onChange={e =>
                          setInjectSpend(prev => ({
                            ...prev,
                            [part.id]: Number(e.target.value) || 20,
                          }))
                        }
                        className="flex-1 bg-black/50 border border-slate-700 px-2 py-1 text-[10px] text-white rounded-lg"
                      >
                        <option value={10}>注入 10 灵能值</option>
                        <option value={20}>注入 20 灵能值</option>
                        <option value={50}>注入 50 灵能值</option>
                        <option value={100}>注入 100 灵能值</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => onInjectEnergy(part.id, injectSpend[part.id] || 20)}
                        disabled={level >= 5}
                        className="rounded-lg border border-cyan-800 text-cyan-300 hover:text-white hover:border-cyan-500 text-[10px] px-3 py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        注入提升
                      </button>
                    </div>
                  </div>
                )}

                {isBrainPart && (
                  <div className="rounded-xl border border-slate-800 px-2 py-1.5 bg-slate-950/30 text-[11px] flex items-center justify-between">
                    <div className="text-slate-500">灵能感知</div>
                    <div className="text-cyan-300 font-mono">{perceptionValue}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-xl border border-slate-800 p-2 bg-slate-950/30">
                    <div className="text-slate-500">吸取速率</div>
                    <div className="text-fuchsia-300 font-mono">{absorbRate}%</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 p-2 bg-slate-950/30">
                    <div className="text-slate-500">外泄速率</div>
                    <div className="text-amber-300 font-mono">{leakRate}%</div>
                  </div>
                </div>

                <div className={`text-[11px] flex items-center gap-1 ${highLeak ? 'text-red-300' : 'text-slate-400'}`}>
                  {highLeak ? <ShieldAlert className="w-3 h-3" /> : <Waves className="w-3 h-3" />}
                  {highLeak ? '高外泄敏感部位：对吸取与压制判定更敏感' : '低外泄部位：主要受灵枢强度与装备修正影响'}
                </div>

                <div className="rounded-xl border border-slate-800 p-2 space-y-2 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-rose-300 font-bold">状态词条</div>
                    <div className="text-[10px] text-slate-500 font-mono">{statusAffixes.length}</div>
                  </div>
                  {statusAffixes.length === 0 ? (
                    <div className="text-[10px] text-slate-600">暂无词条</div>
                  ) : (
                    <div className="space-y-1.5">
                      {statusAffixes.map(affix => {
                        const color =
                          affix.type === 'debuff' ? 'text-red-300 border-red-900/40' : affix.type === 'buff' ? 'text-emerald-300 border-emerald-900/40' : 'text-slate-300 border-slate-800';
                        return (
                          <div key={affix.id} className={`border bg-slate-900/50 p-2 ${color}`}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="text-[11px] font-bold">{affix.name}</div>
                              {!isReadOnly && onRemoveAffix && (
                                <button
                                  type="button"
                                  onClick={() => onRemoveAffix(part.id, affix.id)}
                                  className="text-[10px] px-1.5 py-0.5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                                >
                                  移除
                                </button>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">{affix.description || '暂无描述'}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500">由战斗/对话结算自动添加</div>
                </div>

                <div className="rounded-xl border border-slate-800 p-2 space-y-2 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-purple-300 font-bold">灵弦槽位</div>
                    <div className="text-[10px] text-slate-500 font-mono">{skills.length}/{maxSkillSlots}</div>
                  </div>
                  {skills.length === 0 ? (
                    <div className="text-[10px] text-slate-600">暂无灵弦</div>
                  ) : (
                    <div className="space-y-1.5">
                      {skills.map(skill => {
                        const expanded = expandedSkillId === skill.id;
                        const effectLines = getSkillEffectLines(skill);
                        return (
                          <div key={skill.id} className="bg-slate-900/50 border border-fuchsia-900/40 hover:border-fuchsia-500/50 transition-all relative">
                            <button
                              type="button"
                              onClick={() => setExpandedSkillId(prev => (prev === skill.id ? null : skill.id))}
                              className="w-full p-2 text-left"
                            >
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <span className="text-[11px] text-cyan-300 font-bold truncate">{skill.name}</span>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-amber-400 bg-amber-950/30 font-mono px-1 rounded">LV.{skill.level}</span>
                                  {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                                </div>
                              </div>
                              {expanded ? (
                                <div className="space-y-1 pr-8">
                                  {effectLines.map((line, idx) => (
                                    <div key={`${skill.id}_${idx}`} className="text-[10px] text-slate-400">• {line}</div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-slate-500 pr-8 truncate">{effectLines[0]}</div>
                              )}
                            </button>
                            {!isReadOnly && onForgetSkill && (
                              <button
                                type="button"
                                onClick={() => onForgetSkill(part.id, skill.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 border border-red-700 text-red-300 hover:text-white hover:border-red-500"
                              >
                                遗忘
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!isReadOnly && onLearnSkill && (
                    <div className="space-y-1.5">
                      <select
                        value={resonanceSelection[part.id] || ''}
                        onChange={e =>
                          setResonanceSelection(prev => ({
                            ...prev,
                            [part.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-black/50 border border-slate-700 px-2 py-1 text-[10px] text-white rounded-lg"
                      >
                        <option value="">{availableResonanceMaterials.length === 0 ? '背包里没有可共鸣素材' : '选择共鸣素材（人体部位/灵核/灵魂）'}</option>
                        {availableResonanceMaterials.map(item => (
                          <option key={item.id} value={item.id}>{item.name} x{item.quantity}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const materialId = resonanceSelection[part.id] || '';
                          if (!materialId) return;
                          onLearnSkill(part.id, materialId);
                          setResonanceSelection(prev => ({ ...prev, [part.id]: '' }));
                        }}
                        disabled={!resonanceSelection[part.id] || availableResonanceMaterials.length === 0}
                        className="w-full rounded-lg border border-cyan-800 text-cyan-300 hover:text-white hover:border-cyan-500 text-[10px] py-1 flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3 h-3" /> 共鸣灵弦
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-800 p-2 space-y-2 bg-black/20">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] text-amber-300 font-bold">装备槽位</div>
                    <div className="text-[10px] text-slate-500 font-mono">{equippedItems.length}/{maxEquipSlots}</div>
                  </div>
                  {equippedItems.length === 0 ? (
                    <div className="text-[10px] text-slate-600">暂无装备</div>
                  ) : (
                    <div className="space-y-1.5">
                      {equippedItems.map(item => {
                        const expanded = expandedEquipId === item.id;
                        const desc = item.description || '暂无装备描述';
                        return (
                          <div key={item.id} className="bg-slate-900/50 border border-amber-900/40 hover:border-amber-500/50 transition-all relative">
                            <button
                              type="button"
                              onClick={() => setExpandedEquipId(prev => (prev === item.id ? null : item.id))}
                              className="w-full p-2 text-left"
                            >
                              <div className="flex justify-between items-start mb-1 gap-2">
                                <span className="text-[11px] text-amber-200 font-bold truncate">{item.name}</span>
                                {expanded ? <ChevronDown className="w-3 h-3 text-slate-500" /> : <ChevronRight className="w-3 h-3 text-slate-500" />}
                              </div>
                              <div className={`text-[10px] text-slate-400 pr-8 ${expanded ? 'break-words' : 'truncate'}`}>{desc}</div>
                            </button>
                            {!isReadOnly && onUnequipItem && (
                              <button
                                type="button"
                                onClick={() => onUnequipItem(part.id, item.id)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> 卸下
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {!isReadOnly && onEquipItem && (
                    <div className="space-y-1.5">
                      <select
                        value={selectedEquipId}
                        onChange={e =>
                          setEquipSelection(prev => ({
                            ...prev,
                            [part.id]: e.target.value,
                          }))
                        }
                        className="w-full bg-black/50 border border-slate-700 px-2 py-1 text-[10px] text-white rounded-lg"
                        disabled={!canEquipMore || availableEquipItems.length === 0}
                      >
                        <option value="">{availableEquipItems.length === 0 ? '背包里没有可装配装备' : '选择要装上的装备'}</option>
                        {availableEquipItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name} x{item.quantity}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectedEquipId) return;
                          onEquipItem(part.id, selectedEquipId);
                          setEquipSelection(prev => ({ ...prev, [part.id]: '' }));
                        }}
                        disabled={!canEquipMore || !selectedEquipId}
                        className="w-full rounded-lg border border-amber-800 text-amber-300 hover:text-white hover:border-amber-500 text-[10px] py-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        装上装备
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SpiritNexus;
