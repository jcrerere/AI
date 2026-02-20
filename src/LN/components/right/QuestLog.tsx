import React from 'react';
import { Quest, Rank } from '../../types';
import { getRankColor } from '../../constants';
import CyberPanel from '../ui/CyberPanel';
import { Shield, Target, Clock, Gift, CheckSquare } from 'lucide-react';

interface Props {
  quests: Quest[];
}

const QuestLog: React.FC<Props> = ({ quests }) => {
  return (
    <div className="space-y-4 h-full overflow-y-auto pr-1">
      {quests.map((quest) => (
        <CyberPanel 
            key={quest.id} 
            className={`transition-all duration-200 group ${quest.status === 'completed' ? 'opacity-60 grayscale' : 'hover:border-cyan-500/50'}`}
            noPadding
        >
          {/* Header */}
          <div className="p-3 bg-black/40 border-b border-white/5 flex justify-between items-start">
             <div>
                 <h3 className={`text-sm font-bold ${quest.status === 'active' ? 'text-white' : 'text-slate-400 line-through'}`}>
                     {quest.title}
                 </h3>
                 <div className="flex items-center gap-2 mt-1">
                     <span className={`text-[9px] border px-1 ${getRankColor(quest.difficulty)}`}>{quest.difficulty}</span>
                     <span className="text-[10px] text-slate-500 font-mono">FROM: {quest.issuer}</span>
                 </div>
             </div>
             {quest.status === 'completed' ? (
                 <span className="text-[10px] font-bold text-green-500 border border-green-500/30 px-2 py-0.5 bg-green-900/20">DONE</span>
             ) : (
                 <span className="text-[10px] font-bold text-yellow-500 border border-yellow-500/30 px-2 py-0.5 bg-yellow-900/20 animate-pulse">ACTIVE</span>
             )}
          </div>

          {/* Body */}
          <div className="p-3 space-y-3">
             <p className="text-xs text-slate-300 leading-relaxed italic">
                 "{quest.description}"
             </p>

             {/* Objectives */}
             <div className="space-y-1">
                 <h4 className="text-[10px] uppercase text-slate-500 font-bold flex items-center gap-1">
                     <Target className="w-3 h-3" /> Targets
                 </h4>
                 <ul className="space-y-1">
                     {quest.objectives.map((obj, i) => (
                         <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                             <CheckSquare className="w-3 h-3 mt-0.5 opacity-50" />
                             <span>{obj}</span>
                         </li>
                     ))}
                 </ul>
             </div>

             {/* Footer Info */}
             <div className="flex items-center justify-between pt-2 border-t border-dashed border-slate-800">
                 {quest.deadline && (
                     <div className="flex items-center gap-1 text-[10px] text-red-400">
                         <Clock className="w-3 h-3" />
                         <span>{quest.deadline}</span>
                     </div>
                 )}
                 <div className="flex items-center gap-1 text-[10px] text-yellow-400 ml-auto">
                     <Gift className="w-3 h-3" />
                     <span>{quest.reward}</span>
                 </div>
             </div>
          </div>
        </CyberPanel>
      ))}
    </div>
  );
};

export default QuestLog;