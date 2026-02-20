import React, { useState } from 'react';
import { PlayerFaction, Zone, FactionTask, FactionMember } from '../../types';
import CyberPanel from '../ui/CyberPanel';
import { Building2, Users, TrendingUp, TrendingDown, Swords, Shield, Crosshair, Briefcase, FileText, Factory, Plus, UserPlus } from 'lucide-react';
import { MOCK_NPCS } from '../../constants';

interface Props {
  faction: PlayerFaction;
  zones: Zone[];
}

const FactionManager: React.FC<Props> = ({ faction, zones }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'industry' | 'tasks' | 'personnel' | 'diplomacy'>('overview');
  const [selectedMember, setSelectedMember] = useState<FactionMember | null>(null);
  const [showRecruitModal, setShowRecruitModal] = useState(false);

  const getRelationColor = (status: string) => {
      switch(status) {
          case 'Allied': return 'text-green-400';
          case 'Friendly': return 'text-cyan-400';
          case 'Hostile': return 'text-red-500';
          default: return 'text-slate-400';
      }
  };

  return (
    <div className="flex flex-col h-full relative">
        {/* Header */}
        <div className="mb-4 pb-2 border-b border-white/10">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-500" />
                {faction.name}
            </h2>
            <div className="flex justify-between items-end mt-1">
                 <span className="text-xs text-slate-500">总部: {faction.headquarters}</span>
                 <span className="text-xs font-mono text-cyan-400 border border-cyan-900 bg-cyan-950/30 px-2 rounded">LV.{faction.level}</span>
            </div>
        </div>

        {/* Navigation Grid */}
        <div className="grid grid-cols-5 gap-1 mb-4">
            {[
                { id: 'overview', label: '概览', icon: <FileText className="w-3 h-3" /> },
                { id: 'industry', label: '产业', icon: <Factory className="w-3 h-3" /> },
                { id: 'tasks', label: '任务', icon: <Briefcase className="w-3 h-3" /> },
                { id: 'personnel', label: '人员', icon: <Users className="w-3 h-3" /> },
                { id: 'diplomacy', label: '外交', icon: <Swords className="w-3 h-3" /> },
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-2 text-[9px] font-bold uppercase tracking-wider border transition-all flex flex-col items-center gap-1 ${activeTab === tab.id ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300' : 'bg-black/40 border-slate-800 text-slate-500 hover:text-white'}`}
                >
                    {tab.icon} {tab.label}
                </button>
            ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-2 pb-4">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
                <div className="space-y-4">
                    {/* Treasury */}
                    <CyberPanel title="财务报表" noPadding className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-xs text-slate-400">当前资金池</span>
                            <span className="text-xl font-bold font-mono text-yellow-400">¥ {faction.economy.treasury.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-900/50 p-3 border border-slate-800 rounded">
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                                    <TrendingUp className="w-3 h-3 text-green-500" /> 月度收入
                                </div>
                                <div className="text-sm font-bold text-green-400">+ ¥{faction.economy.monthlyIncome.toLocaleString()}</div>
                            </div>
                            <div className="bg-slate-900/50 p-3 border border-slate-800 rounded">
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 mb-1">
                                    <TrendingDown className="w-3 h-3 text-red-500" /> 月度维护
                                </div>
                                <div className="text-sm font-bold text-red-400">- ¥{faction.economy.monthlyUpkeep.toLocaleString()}</div>
                            </div>
                        </div>
                    </CyberPanel>

                    {/* Logs */}
                    <CyberPanel title="组织日志" className="max-h-[300px]">
                        <div className="space-y-2">
                            {faction.logs.map(log => (
                                <div key={log.id} className="border-l-2 border-slate-700 pl-3 py-1 relative">
                                    <div className="absolute left-[-17px] top-1.5 w-2 h-2 rounded-full bg-slate-800 border border-slate-600"></div>
                                    <div className="text-[9px] text-slate-500 font-mono mb-0.5">{log.timestamp}</div>
                                    <div className={`text-xs ${log.type === 'alert' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : 'text-slate-300'}`}>
                                        {log.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CyberPanel>
                </div>
            )}

            {/* INDUSTRY TAB */}
            {activeTab === 'industry' && (
                <div className="space-y-3">
                    {faction.industries.map(ind => (
                        <div key={ind.id} className="bg-slate-900/40 border border-slate-700 p-3 flex justify-between items-start">
                             <div>
                                 <div className="flex items-center gap-2 mb-1">
                                     <span className="text-sm font-bold text-slate-200">{ind.name}</span>
                                     <span className={`text-[9px] px-1 rounded border ${ind.status === 'active' ? 'border-green-800 text-green-500' : 'border-yellow-800 text-yellow-500'}`}>{ind.status.toUpperCase()}</span>
                                 </div>
                                 <div className="text-[10px] text-slate-500">{ind.type} // LV.{ind.level}</div>
                             </div>
                             <div className="text-right">
                                 <div className="text-xs font-mono text-green-400">+¥{ind.output}/wk</div>
                                 <div className="text-[10px] font-mono text-red-400">-¥{ind.upkeep}/wk</div>
                             </div>
                        </div>
                    ))}
                    <button className="w-full py-3 border border-dashed border-slate-700 text-xs text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 flex items-center justify-center gap-2 transition-colors">
                        <Plus className="w-4 h-4" /> 收购新产业
                    </button>
                </div>
            )}

            {/* TASKS TAB */}
            {activeTab === 'tasks' && (
                <div className="space-y-4">
                    <div className="bg-slate-900/50 p-3 border border-cyan-900/30">
                        <h3 className="text-xs font-bold text-cyan-400 mb-2">发布新委托</h3>
                        <div className="flex gap-2 mb-2">
                             <input type="text" placeholder="任务标题" className="flex-1 bg-black border border-slate-700 px-2 py-1 text-xs text-white" />
                             <input type="number" placeholder="酬金" className="w-20 bg-black border border-slate-700 px-2 py-1 text-xs text-white" />
                        </div>
                        <div className="flex gap-2">
                            <select className="bg-black border border-slate-700 px-2 py-1 text-xs text-slate-300">
                                <option>内部指派</option>
                                <option>公开悬赏</option>
                            </select>
                            <button className="flex-1 bg-cyan-900/50 text-cyan-400 text-xs font-bold border border-cyan-800 hover:bg-cyan-800">发布</button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        {faction.postedTasks.map(task => (
                            <div key={task.id} className="bg-black/30 border border-slate-800 p-3 hover:border-slate-600 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-sm text-slate-200">{task.title}</div>
                                    <div className="text-xs font-mono text-yellow-400">¥{task.reward}</div>
                                </div>
                                <p className="text-[10px] text-slate-500 mb-2">{task.description}</p>
                                <div className="flex justify-between items-center text-[10px]">
                                    <span className={`px-2 py-0.5 border rounded ${task.status === 'open' ? 'text-green-500 border-green-900' : 'text-slate-500 border-slate-800'}`}>
                                        {task.status === 'open' ? 'OPEN' : 'ASSIGNED'}
                                    </span>
                                    <span className="text-slate-600">{task.targetAudience === 'internal' ? '内部任务' : '公开悬赏'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* PERSONNEL TAB */}
            {activeTab === 'personnel' && (
                <div className="space-y-4">
                    {/* Groups Section */}
                    <div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase mb-2">战斗小组</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {faction.groups.map(grp => (
                                <div key={grp.id} className="bg-slate-900/40 border border-slate-700 p-2 cursor-pointer hover:border-cyan-500/50">
                                    <div className="text-xs font-bold text-white mb-1">{grp.name}</div>
                                    <div className="text-[10px] text-slate-500">{grp.memberIds.length} 成员</div>
                                </div>
                            ))}
                            <button className="border border-dashed border-slate-700 text-[10px] text-slate-500 flex items-center justify-center hover:text-white hover:border-slate-500">
                                + 新建
                            </button>
                        </div>
                    </div>

                    {/* Members List */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase">所有成员</h3>
                            <button 
                                onClick={() => setShowRecruitModal(true)}
                                className="text-[10px] flex items-center gap-1 text-cyan-400 hover:text-white"
                            >
                                <UserPlus className="w-3 h-3" /> 招募
                            </button>
                        </div>
                        <div className="space-y-2">
                            {faction.members.map(member => (
                                <div 
                                    key={member.id} 
                                    onClick={() => setSelectedMember(selectedMember?.id === member.id ? null : member)}
                                    className={`bg-slate-900/30 border p-3 cursor-pointer transition-all ${selectedMember?.id === member.id ? 'border-cyan-500 bg-cyan-900/10' : 'border-slate-800 hover:bg-slate-800'}`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-slate-500 font-bold">
                                                {member.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{member.name}</div>
                                                <div className="text-[10px] text-cyan-400">{member.role}</div>
                                            </div>
                                        </div>
                                        <div className={`text-[9px] px-2 py-0.5 rounded border ${
                                            member.status === 'idle' ? 'border-green-800 text-green-400' :
                                            member.status === 'combat' ? 'border-red-800 text-red-400' :
                                            'border-yellow-800 text-yellow-400'
                                        }`}>
                                            {member.status === 'idle' ? '待命' : member.status === 'combat' ? '战斗中' : '任务中'}
                                        </div>
                                    </div>
                                    
                                    {/* Action Menu when selected */}
                                    {selectedMember?.id === member.id && (
                                        <div className="mt-3 pt-2 border-t border-slate-700 flex gap-2 animate-in fade-in">
                                            <button className="flex-1 bg-cyan-900/30 border border-cyan-800 text-[10px] text-cyan-300 py-1 hover:bg-cyan-800">指派任务</button>
                                            <button className="flex-1 bg-slate-800 border border-slate-700 text-[10px] text-slate-300 py-1 hover:bg-slate-700">调整职位</button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* DIPLOMACY TAB */}
            {activeTab === 'diplomacy' && (
                <div className="space-y-3">
                    {faction.relations.map((rel, i) => {
                        const zoneName = zones.find(z => z.id === rel.zoneId)?.name || '未知区域';
                        return (
                            <div key={i} className="bg-slate-900/40 border border-slate-700 p-3 group">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <Crosshair className="w-4 h-4 text-slate-500" />
                                        <span className="text-sm font-bold text-slate-200">{zoneName}</span>
                                    </div>
                                    <div className={`text-xs font-bold ${getRelationColor(rel.status)}`}>
                                        {rel.status === 'Hostile' ? '敌对' : rel.status === 'Allied' ? '同盟' : rel.status === 'Friendly' ? '友好' : '中立'} 
                                        <span className="ml-1 text-[10px] font-mono opacity-70">[{rel.standing}]</span>
                                    </div>
                                </div>
                                <div className="h-1 bg-slate-800 w-full mb-3">
                                    <div 
                                        className={`h-full ${rel.standing > 0 ? 'bg-green-500' : 'bg-red-500'}`} 
                                        style={{ width: `${Math.abs(rel.standing)}%` }}
                                    ></div>
                                </div>
                                <div className="flex gap-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <button className="flex-1 border border-slate-600 text-[9px] text-slate-300 py-1 hover:bg-slate-700">委托</button>
                                    <button className="flex-1 border border-slate-600 text-[9px] text-slate-300 py-1 hover:bg-slate-700">合作</button>
                                    <button className="flex-1 border border-red-900/50 text-[9px] text-red-400 py-1 hover:bg-red-900/30">掠夺</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>

        {/* Recruit Modal Overlay */}
        {showRecruitModal && (
            <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-h-full bg-slate-900 border border-slate-700 flex flex-col shadow-2xl">
                    <div className="p-3 border-b border-slate-700 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white">招募新成员</h3>
                        <button onClick={() => setShowRecruitModal(false)} className="text-slate-500 hover:text-white"><Users className="w-4 h-4"/></button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        <div className="text-[10px] font-bold text-slate-500 uppercase px-2">通讯录好友</div>
                        {MOCK_NPCS.map(npc => (
                            <div key={npc.id} className="flex items-center justify-between p-2 hover:bg-slate-800 cursor-pointer border border-transparent hover:border-cyan-500/30">
                                <div className="flex items-center gap-2">
                                    <img src={npc.avatarUrl} className="w-6 h-6 rounded-full" />
                                    <div className="text-xs text-slate-300">{npc.name}</div>
                                </div>
                                <button className="text-[9px] border border-cyan-800 text-cyan-500 px-2 py-0.5">邀请</button>
                            </div>
                        ))}
                        <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mt-4">自由雇佣兵市场</div>
                        {[1,2,3].map(i => (
                             <div key={i} className="flex items-center justify-between p-2 hover:bg-slate-800 cursor-pointer border border-transparent hover:border-cyan-500/30">
                                <div>
                                    <div className="text-xs text-slate-300">未知雇佣兵 #{2077+i}</div>
                                    <div className="text-[9px] text-slate-500">突击兵 | Lv.2</div>
                                </div>
                                <button className="text-[9px] border border-yellow-800 text-yellow-500 px-2 py-0.5">雇佣 (¥500)</button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default FactionManager;