
import React from 'react';
import { Item, Rank } from '../../types';
import { getRankColor } from '../../constants';
import { X, FileText, Zap, Trash2 } from 'lucide-react';

interface Props {
  item: Item;
  onClose: () => void;
  onUse?: (item: Item) => void;
}

const ItemDetailView: React.FC<Props> = ({ item, onClose, onUse }) => {
  const getCategoryLabel = (cat: string) => {
      switch(cat) {
          case 'consumable': return '消耗品';
          case 'equipment': return '装备';
          case 'material': return '素材';
          case 'quest': return '任务道具';
          default: return '杂项';
      }
  };

  return (
    <div className="absolute inset-0 bg-[#080408]/95 z-50 animate-in fade-in zoom-in-95 flex flex-col border border-cyan-500/30 shadow-2xl backdrop-blur-md">
         {/* HEADER & ACTIONS - Now Combined at Top */}
         <div className="p-4 border-b border-white/10 bg-slate-900/50">
             <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                     <div className={`w-12 h-12 border flex items-center justify-center bg-black/40 text-2xl shadow-inner ${getRankColor(item.rank)}`}>
                         {item.icon}
                     </div>
                     <div>
                         <h3 className={`text-sm font-bold leading-tight ${getRankColor(item.rank).split(' ')[0]}`}>{item.name}</h3>
                         <span className="text-[10px] text-slate-400 uppercase tracking-wider border border-slate-700 px-1 rounded bg-black/30">
                             {getCategoryLabel(item.category)} <span className="text-slate-600">|</span> {item.rank}
                         </span>
                     </div>
                 </div>
                 <button onClick={onClose} className="text-slate-500 hover:text-white p-1"><X className="w-5 h-5"/></button>
             </div>

             {/* ACTION BUTTONS - Moved Here */}
             <div className="flex gap-2">
                 {onUse && (
                     <button 
                        onClick={() => onUse(item)}
                        className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2 px-3 flex items-center justify-center gap-1 shadow-[0_0_10px_rgba(8,145,178,0.4)] transition-all"
                     >
                        <Zap className="w-3 h-3 fill-current" /> 立即使用
                     </button>
                 )}
                 <button className="flex-1 bg-red-950/40 border border-red-900/50 text-red-400 hover:bg-red-900/60 text-xs font-bold py-2 px-3 flex items-center justify-center gap-1 transition-all">
                     <Trash2 className="w-3 h-3" /> 丢弃
                 </button>
             </div>
         </div>

         {/* SCROLLABLE CONTENT */}
         <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
             <div className="bg-black/30 p-3 border border-slate-800/60 rounded relative">
                 <div className="absolute top-2 right-2 opacity-10"><FileText className="w-8 h-8" /></div>
                 <h4 className="text-[9px] font-bold text-slate-500 uppercase mb-1">物品描述</h4>
                 <p className="text-xs text-slate-300 italic leading-relaxed">{item.description}</p>
             </div>

             <div className="bg-black/30 p-3 border border-slate-800/60 rounded">
                 <h4 className="text-[9px] font-bold text-slate-500 uppercase mb-2">属性预览</h4>
                 <div className="space-y-2">
                     <div className="flex justify-between text-[10px] border-b border-slate-800/50 pb-1">
                         <span className="text-slate-400">持有数量</span>
                         <span className="font-mono text-white">x{item.quantity}</span>
                     </div>
                     <div className="flex justify-between text-[10px] border-b border-slate-800/50 pb-1">
                         <span className="text-slate-400">单体重量</span>
                         <span className="font-mono text-white">0.5 kg</span>
                     </div>
                     <div className="flex justify-between text-[10px]">
                         <span className="text-slate-400">黑市估值</span>
                         <span className="font-mono text-yellow-400">¥ 150</span>
                     </div>
                 </div>
             </div>
         </div>
    </div>
  );
};

export default ItemDetailView;
