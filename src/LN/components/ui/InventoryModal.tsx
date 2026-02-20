import React, { useState } from 'react';
import { Item, ItemCategory, Rank } from '../../types';
import { getRankColor } from '../../constants';
import { X, Package, ArrowUpDown, FileText } from 'lucide-react';
import ItemDetailView from './ItemDetailView';

interface Props {
  title: string;
  items: Item[];
  onClose: () => void;
  isOwner?: boolean;
}

const InventoryModal: React.FC<Props> = ({ title, items, onClose, isOwner = true }) => {
  const [invCategory, setInvCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sortOrder, setSortOrder] = useState<number>(0); // 0=Def, 1=Desc, 2=Asc

  const getProcessedItems = (rawItems: Item[]) => {
      let result = rawItems;
      if (invCategory !== 'all') {
          result = result.filter(i => i.category === invCategory);
      }
      if (sortOrder !== 0) {
          const rankOrder = { [Rank.Lv1]: 1, [Rank.Lv2]: 2, [Rank.Lv3]: 3, [Rank.Lv4]: 4, [Rank.Lv5]: 5 };
          result = [...result].sort((a, b) => {
              const diff = rankOrder[a.rank] - rankOrder[b.rank];
              return sortOrder === 1 ? -diff : diff;
          });
      }
      return result;
  };

  const processedItems = getProcessedItems(items);

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
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200">
        <div className="w-full max-w-4xl bg-[#0a0a0c] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.1)] flex flex-col h-[80%] relative">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-black/50 shrink-0">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-cyan-400 flex items-center gap-2"><Package /> {title}</h2>
                    <div className="flex gap-2">
                            {['all', 'consumable', 'equipment', 'material', 'quest'].map((cat) => (
                                <button 
                                key={cat}
                                onClick={() => setInvCategory(cat as any)}
                                className={`px-3 py-1 text-xs uppercase font-bold border ${invCategory === cat ? 'bg-cyan-900/50 border-cyan-400 text-white' : 'border-slate-700 text-slate-500 hover:text-cyan-300'}`}
                                >
                                    {cat === 'all' ? '全部' : cat === 'consumable' ? '消耗' : cat === 'equipment' ? '装备' : cat === 'material' ? '素材' : '任务'}
                                </button>
                            ))}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => setSortOrder((sortOrder + 1) % 3)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
                    >
                        <ArrowUpDown className="w-3 h-3" />
                        {sortOrder === 0 ? '默认排序' : sortOrder === 1 ? '等级: 高 -> 低' : '等级: 低 -> 高'}
                    </button>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X /></button>
                </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 p-6 overflow-hidden relative flex">
                {/* Item Grid */}
                <div className="flex-1 overflow-y-auto grid grid-cols-6 gap-4 pr-4 content-start custom-scrollbar">
                    {processedItems.map((item) => (
                        <div 
                            key={item.id} 
                            onClick={() => setSelectedItem(item)}
                            className={`aspect-square bg-slate-900/50 border hover:border-cyan-500 flex flex-col items-center justify-center cursor-pointer group relative p-2 transition-all ${getRankColor(item.rank)} ${selectedItem?.id === item.id ? 'bg-white/10 border-cyan-400 ring-1 ring-cyan-400' : ''}`}
                        >
                            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{item.icon}</div>
                            <div className="text-xs font-bold text-slate-300 text-center leading-tight truncate w-full">{item.name}</div>
                            <div className="absolute top-1 right-1 text-[9px] bg-black/80 px-1 rounded text-slate-400">x{item.quantity}</div>
                            <div className="absolute top-1 left-1 text-[9px] font-mono opacity-50">{item.rank}</div>
                        </div>
                    ))}
                    {/* Empty Slots Filler */}
                    {Array.from({length: Math.max(0, 30 - processedItems.length)}).map((_, i) => (
                        <div key={i} className="aspect-square bg-black/20 border border-slate-800/30"></div>
                    ))}
                </div>
                
                {/* Detail Side Panel Overlay */}
                {selectedItem && (
                        <div className="w-80 border-l border-white/10 pl-6 flex flex-col h-full animate-in slide-in-from-right-4 shrink-0">
                            {/* Header: Icon + Name */}
                            <div className="flex gap-4 items-start mb-4 shrink-0">
                                <div className={`w-20 h-20 border-2 flex items-center justify-center bg-black/40 text-4xl shrink-0 ${getRankColor(selectedItem.rank)}`}>
                                    {selectedItem.icon}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white mb-1 leading-tight">{selectedItem.name}</h2>
                                    <div className="flex flex-col gap-1">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 border w-fit ${getRankColor(selectedItem.rank)}`}>{selectedItem.rank}</span>
                                        <span className="text-[10px] text-slate-500 uppercase font-mono tracking-wider">{getCategoryLabel(selectedItem.category)}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Description - Scrollable */}
                            <div className="bg-slate-900/50 p-4 border border-slate-800 mb-4 flex-1 overflow-y-auto custom-scrollbar relative">
                                <div className="absolute top-2 right-2 opacity-10"><FileText className="w-12 h-12" /></div>
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">DESCRIPTION</h4>
                                <p className="text-sm text-slate-300 leading-relaxed font-sans">{selectedItem.description}</p>
                                
                                <div className="mt-4 pt-4 border-t border-dashed border-slate-700 grid grid-cols-2 gap-2 text-xs">
                                     <div className="flex justify-between">
                                         <span className="text-slate-500">Weight</span>
                                         <span className="text-slate-300">0.5 kg</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span className="text-slate-500">Value</span>
                                         <span className="text-yellow-500">¥ 150</span>
                                     </div>
                                </div>
                            </div>

                            {/* Actions - Fixed at Bottom */}
                            <div className="space-y-2 mt-auto shrink-0">
                                <button className="w-full py-2 bg-cyan-600/90 text-black font-bold hover:bg-cyan-500 transition-colors shadow-[0_0_10px_rgba(8,145,178,0.3)]">{isOwner ? '使用物品' : '请求赠予'}</button>
                                <button className="w-full py-2 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-colors">{isOwner ? '丢弃' : '偷窃'}</button>
                            </div>
                        </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default InventoryModal;
