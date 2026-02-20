
import React, { useState } from 'react';
import { NPC } from '../../types';
import { ChevronRight, ChevronDown, Plus, Trash2, Edit2, Check, UserPlus, MoreHorizontal, Radar, MapPin, X, History, UserMinus } from 'lucide-react';

interface Props {
  npcs: NPC[];
  onSelect: (npc: NPC) => void;
  onUpdateNpc: (npcId: string, updates: Partial<NPC>) => void;
  groups: string[];
  onUpdateGroups: (newGroups: string[]) => void;
  onDeleteGroup: (groupName: string) => void;
  currentLocation: string; // Used to filter nearby NPCs
}

const ContactList: React.FC<Props> = ({ npcs, onSelect, onUpdateNpc, groups, onUpdateGroups, onDeleteGroup, currentLocation }) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isNearbyOpen, setIsNearbyOpen] = useState(true);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [actionMenuNpcId, setActionMenuNpcId] = useState<string | null>(null);

  // Filter lists
  const nearbyNPCs = npcs.filter(npc => !npc.isContact && (npc.location === currentLocation || npc.location.includes(currentLocation.split(' ')[0]) || npc.temporaryStatus));
  const contactNPCs = npcs.filter(npc => npc.isContact);

  // Initialize open state for groups if not set
  React.useEffect(() => {
      const initialOpen: Record<string, boolean> = {};
      groups.forEach(g => initialOpen[g] = true);
      setOpenGroups(prev => ({ ...initialOpen, ...prev }));
  }, [groups]);

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleCreateGroup = () => {
      if (newGroupName.trim()) {
          const name = newGroupName.trim();
          if (!groups.includes(name)) {
              onUpdateGroups([...groups, name]);
          }
          setNewGroupName('');
          setIsCreatingGroup(false);
      }
  };

  const handleDeleteGroup = (e: React.MouseEvent, groupToDelete: string) => {
      e.stopPropagation(); // Stop bubbling to accordion toggle
      
      const npcsInGroup = npcs.filter(n => n.isContact && n.group === groupToDelete);
      
      // If group is empty, delete immediately without confirm
      if (npcsInGroup.length === 0) {
          onDeleteGroup(groupToDelete);
          return;
      }

      const message = `确定要删除分组 "${groupToDelete}" 吗？\n\n组内的 ${npcsInGroup.length} 名联系人将被移除至【周围人物】并标记为“近期删除”。`;
      if (window.confirm(message)) {
          onDeleteGroup(groupToDelete);
      }
  };

  const handleRenameGroup = (e: React.MouseEvent, oldName: string) => {
      e.stopPropagation();
      if (editGroupName.trim() && editGroupName !== oldName && !groups.includes(editGroupName.trim())) {
          const updatedGroups = groups.map(g => g === oldName ? editGroupName.trim() : g);
          onUpdateGroups(updatedGroups);
          
          contactNPCs.forEach(npc => {
              if (npc.group === oldName) {
                  onUpdateNpc(npc.id, { group: editGroupName.trim() });
              }
          });
      }
      setEditingGroupId(null);
      setEditGroupName('');
  };

  const startEditing = (e: React.MouseEvent, group: string) => {
      e.stopPropagation();
      setEditingGroupId(group);
      setEditGroupName(group);
  };

  const cancelEditing = (e: React.MouseEvent) => {
      e.stopPropagation();
      setEditingGroupId(null);
      setEditGroupName('');
  };

  const handleAddContact = (npc: NPC, targetGroup: string) => {
      onUpdateNpc(npc.id, { 
          isContact: true, 
          group: targetGroup,
          temporaryStatus: undefined
      });
      setActionMenuNpcId(null);
  };

  const handleMoveGroup = (npc: NPC, targetGroup: string) => {
      onUpdateNpc(npc.id, { group: targetGroup });
      setActionMenuNpcId(null);
  };

  const handleRemoveContact = (e: React.MouseEvent, npc: NPC) => {
      e.stopPropagation(); // Stop bubbling to row select
      
      if (window.confirm(`确定要移除联系人 ${npc.name} 吗？`)) {
          onUpdateNpc(npc.id, { 
              isContact: false, 
              group: '',
              temporaryStatus: '近期删除'
          });
      }
      setActionMenuNpcId(null);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
        
        {/* 1. NEARBY SECTION */}
        <div className="border border-green-900/30 bg-green-950/10 rounded overflow-hidden flex flex-col shrink-0">
            <div 
                onClick={() => setIsNearbyOpen(!isNearbyOpen)}
                className="flex items-center justify-between p-2 bg-green-950/20 cursor-pointer hover:bg-green-900/30 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Radar className="w-4 h-4 text-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-green-400 uppercase tracking-wider">周围人物 (Nearby)</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-green-600 font-mono">{nearbyNPCs.length} 信号</span>
                    {isNearbyOpen ? <ChevronDown className="w-3 h-3 text-green-600"/> : <ChevronRight className="w-3 h-3 text-green-600"/>}
                </div>
            </div>
            
            {isNearbyOpen && (
                <div className="p-1 space-y-1 max-h-[150px] overflow-y-auto custom-scrollbar">
                    {nearbyNPCs.length === 0 && (
                        <div className="text-[10px] text-green-800 text-center py-2 font-mono">
                            -- 无生命体征反应 --
                        </div>
                    )}
                    {nearbyNPCs.map(npc => (
                        <div key={npc.id} className="flex items-center justify-between p-2 hover:bg-green-900/20 group rounded transition-colors">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full overflow-hidden border border-green-800 opacity-70 group-hover:opacity-100">
                                    <img src={npc.avatarUrl} className="w-full h-full object-cover grayscale group-hover:grayscale-0" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs font-bold text-green-200">{npc.name}</div>
                                        {npc.temporaryStatus && (
                                            <span className="text-[8px] bg-red-900/50 text-red-300 px-1 rounded flex items-center gap-0.5 border border-red-800 animate-pulse">
                                                <History className="w-2 h-2" /> 近期删除
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[9px] text-green-600">{npc.position}</div>
                                </div>
                            </div>
                            <div className="relative">
                                <button 
                                    onClick={() => setActionMenuNpcId(actionMenuNpcId === npc.id ? null : npc.id)}
                                    className="p-1 text-green-600 hover:text-green-300"
                                >
                                    <UserPlus className="w-4 h-4" />
                                </button>
                                {actionMenuNpcId === npc.id && (
                                    <div className="absolute right-0 top-6 z-20 bg-black border border-green-500/50 rounded shadow-xl w-32 animate-in fade-in zoom-in-95">
                                        <div className="text-[9px] text-green-600 px-2 py-1 bg-green-950/30 font-bold uppercase">添加到分组</div>
                                        {groups.map(g => (
                                            <button 
                                                key={g}
                                                onClick={() => handleAddContact(npc, g)}
                                                className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-green-900/40 hover:text-white"
                                            >
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* 2. MARKED GROUPS SECTION */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">标记人物 (Marked)</span>
                <button 
                    onClick={() => setIsCreatingGroup(true)}
                    className="text-[10px] flex items-center gap-1 text-cyan-500 hover:text-cyan-300 transition-colors"
                >
                    <Plus className="w-3 h-3" /> 新建分组
                </button>
            </div>

            {isCreatingGroup && (
                <div className="flex gap-2 mb-2 px-1 animate-in slide-in-from-top-2">
                    <input 
                        autoFocus
                        type="text" 
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="分组名称..."
                        className="flex-1 bg-black border border-slate-700 text-xs px-2 py-1 text-white focus:border-cyan-500 outline-none"
                    />
                    <button onClick={handleCreateGroup} className="text-cyan-500 hover:text-white"><Check className="w-4 h-4"/></button>
                    <button onClick={() => setIsCreatingGroup(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
                </div>
            )}

            {/* Render Groups */}
            {groups.map(group => {
                const groupNPCs = contactNPCs.filter(n => n.group === group);
                const isEditing = editingGroupId === group;

                return (
                    <div key={group} className="mb-2">
                        {/* Group Header */}
                        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-900/40 border-b border-white/5 hover:bg-slate-800 group/header relative">
                            <div className="flex items-center gap-2 flex-1 cursor-pointer select-none" onClick={() => !isEditing && toggleGroup(group)}>
                                {openGroups[group] ? <ChevronDown className="w-3 h-3 text-slate-500"/> : <ChevronRight className="w-3 h-3 text-slate-500"/>}
                                {isEditing ? (
                                    <input 
                                        type="text" 
                                        value={editGroupName} 
                                        onChange={(e) => setEditGroupName(e.target.value)}
                                        className="bg-black border border-slate-600 text-xs px-1 text-white w-32 focus:outline-none"
                                        onClick={(e) => e.stopPropagation()}
                                        autoFocus
                                    />
                                ) : (
                                    <span className="text-xs font-bold text-slate-300">{group}</span>
                                )}
                                {!isEditing && <span className="text-[9px] text-slate-600 font-mono">({groupNPCs.length})</span>}
                            </div>
                            
                            {/* Group Actions - Always Visible and Z-Indexed to ensure clickability */}
                            <div className="flex items-center gap-2 z-20 relative">
                                {isEditing ? (
                                    <>
                                        <button onClick={(e) => handleRenameGroup(e, group)} className="text-green-500 hover:text-green-300 p-1"><Check className="w-3 h-3"/></button>
                                        <button onClick={cancelEditing} className="text-slate-500 hover:text-white p-1"><X className="w-3 h-3"/></button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={(e) => startEditing(e, group)} 
                                            className="text-slate-500 hover:text-cyan-400 p-1.5 transition-colors cursor-pointer" 
                                            title="重命名"
                                        >
                                            <Edit2 className="w-3 h-3" />
                                        </button>
                                        <button 
                                            onClick={(e) => handleDeleteGroup(e, group)} 
                                            className="text-slate-500 hover:text-red-500 p-1.5 transition-colors cursor-pointer" 
                                            title="删除分组"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Group NPCs */}
                        {openGroups[group] && (
                            <div className="pl-2 border-l border-white/5 ml-3 mt-1 space-y-1">
                                {groupNPCs.map(npc => (
                                    <div 
                                        key={npc.id} 
                                        className="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer group/npc relative select-none"
                                        onClick={() => onSelect(npc)}
                                    >
                                        <div className={`w-6 h-6 rounded-full overflow-hidden border ${npc.status === 'online' ? 'border-green-500' : 'border-slate-600'}`}>
                                            <img src={npc.avatarUrl} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-xs text-slate-300 truncate group-hover/npc:text-white">{npc.name}</div>
                                            <div className="text-[8px] text-slate-500 truncate">{npc.position}</div>
                                        </div>
                                        
                                        {/* Quick Delete Button (Visible on Hover, High Z-Index) */}
                                        <button
                                            onClick={(e) => handleRemoveContact(e, npc)}
                                            className="text-slate-600 hover:text-red-500 p-1.5 transition-opacity z-10 cursor-pointer"
                                            title="移除"
                                        >
                                            <UserMinus className="w-3 h-3" />
                                        </button>

                                        {/* Move Group Menu Trigger */}
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionMenuNpcId(actionMenuNpcId === npc.id ? null : npc.id);
                                            }}
                                            className="text-slate-500 hover:text-white p-1.5 transition-opacity z-10 cursor-pointer"
                                            title="移动"
                                        >
                                            <MoreHorizontal className="w-3 h-3" />
                                        </button>

                                        {/* Move Group Context Menu */}
                                        {actionMenuNpcId === npc.id && (
                                            <div className="absolute right-0 top-8 z-50 bg-black border border-slate-700 rounded shadow-xl w-32 animate-in fade-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                                                <div className="text-[9px] text-slate-500 px-2 py-1 bg-slate-900/50 uppercase font-bold">移动至...</div>
                                                {groups.filter(g => g !== group).map(g => (
                                                    <button 
                                                        key={g}
                                                        onClick={() => handleMoveGroup(npc, g)}
                                                        className="w-full text-left px-2 py-1.5 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-white block"
                                                    >
                                                        {g}
                                                    </button>
                                                ))}
                                                {groups.length <= 1 && <div className="p-2 text-[9px] text-slate-600 italic">无其他分组</div>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {groupNPCs.length === 0 && (
                                    <div className="text-[9px] text-slate-600 italic px-2 py-1">空分组</div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default ContactList;
