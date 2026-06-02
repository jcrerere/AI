import React, { useState } from 'react';
import { Item, ItemCategory, Rank } from '../../types';
import { getRankColor } from '../../constants';
import { estimateItemMarketValue } from '../../data/speciesCatalog';
import { ArrowUpDown, FileText, Package, X } from 'lucide-react';

interface Props {
  title: string;
  items: Item[];
  onClose: () => void;
  isOwner?: boolean;
  locationLabel?: string;
}

const DEFAULT_RARITY_BY_RANK: Record<Rank, string> = {
  [Rank.Lv1]: '常见',
  [Rank.Lv2]: '少见',
  [Rank.Lv3]: '稀有',
  [Rank.Lv4]: '珍稀',
  [Rank.Lv5]: '传说',
};

const formatWeight = (weightKg?: number): string => {
  if (!weightKg || weightKg <= 0) return '未知';
  if (weightKg >= 1) return `${weightKg.toFixed(1)} kg`;
  return `${weightKg.toFixed(2)} kg`;
};

const getCategoryLabel = (category: ItemCategory) => {
  switch (category) {
    case 'consumable':
      return '消耗品';
    case 'equipment':
      return '装备';
    case 'material':
      return '素材';
    case 'quest':
      return '任务道具';
    default:
      return '杂项';
  }
};

const InventoryModal: React.FC<Props> = ({ title, items, onClose, isOwner = true, locationLabel }) => {
  const [invCategory, setInvCategory] = useState<ItemCategory | 'all'>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [sortOrder, setSortOrder] = useState(0);

  const processedItems = (() => {
    let result = items;
    if (invCategory !== 'all') {
      result = result.filter(item => item.category === invCategory);
    }
    if (sortOrder !== 0) {
      const rankOrder = { [Rank.Lv1]: 1, [Rank.Lv2]: 2, [Rank.Lv3]: 3, [Rank.Lv4]: 4, [Rank.Lv5]: 5 };
      result = [...result].sort((a, b) => {
        const diff = rankOrder[a.rank] - rankOrder[b.rank];
        return sortOrder === 1 ? -diff : diff;
      });
    }
    return result;
  })();

  const selectedValue = selectedItem ? estimateItemMarketValue(selectedItem, locationLabel) : 0;
  const selectedWeight = formatWeight(selectedItem?.commodityProfile?.weightKg);
  const selectedRarity = selectedItem ? selectedItem.commodityProfile?.rarity || DEFAULT_RARITY_BY_RANK[selectedItem.rank] : '';
  const selectedSourceLabel = selectedItem?.commodityProfile?.sourceRace || selectedItem?.commodityProfile?.sourceRegion || '未知';
  const selectedSourceTitle = selectedItem?.commodityProfile?.sourceRace
    ? '来源种族'
    : selectedItem?.commodityProfile?.sourceRegion
      ? '来源地区'
      : '来源主体';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-8 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex h-[80%] w-full max-w-4xl flex-col border border-cyan-500/30 bg-[#0a0a0c] shadow-[0_0_50px_rgba(6,182,212,0.1)]">
        <div className="flex items-center justify-between border-b border-white/10 bg-black/50 p-4">
          <div className="flex items-center gap-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-cyan-400">
              <Package />
              {title}
            </h2>
            <div className="flex gap-2">
              {(['all', 'consumable', 'equipment', 'material', 'quest'] as const).map(category => (
                <button
                  key={category}
                  onClick={() => setInvCategory(category)}
                  className={`border px-3 py-1 text-xs font-bold uppercase ${
                    invCategory === category
                      ? 'border-cyan-400 bg-cyan-900/50 text-white'
                      : 'border-slate-700 text-slate-500 hover:text-cyan-300'
                  }`}
                >
                  {category === 'all' ? '全部' : getCategoryLabel(category)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSortOrder((sortOrder + 1) % 3)}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
            >
              <ArrowUpDown className="h-3 w-3" />
              {sortOrder === 0 ? '默认排序' : sortOrder === 1 ? '等级：高 -> 低' : '等级：低 -> 高'}
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <X />
            </button>
          </div>
        </div>

        <div className="relative flex flex-1 overflow-hidden p-6">
          <div className="custom-scrollbar grid flex-1 content-start grid-cols-6 gap-4 overflow-y-auto pr-4">
            {processedItems.map(item => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`group relative aspect-square cursor-pointer border bg-slate-900/50 p-2 transition-all hover:border-cyan-500 ${getRankColor(item.rank)} ${
                  selectedItem?.id === item.id ? 'border-cyan-400 bg-white/10 ring-1 ring-cyan-400' : ''
                }`}
              >
                <div className="flex h-full flex-col items-center justify-center">
                  <div className="mb-2 text-3xl transition-transform group-hover:scale-110">{item.icon}</div>
                  <div className="w-full truncate text-center text-xs font-bold leading-tight text-slate-300">{item.name}</div>
                </div>
                <div className="absolute left-1 top-1 text-[9px] font-mono opacity-50">{item.rank}</div>
                <div className="absolute right-1 top-1 rounded bg-black/80 px-1 text-[9px] text-slate-400">x{item.quantity}</div>
              </div>
            ))}

            {Array.from({ length: Math.max(0, 30 - processedItems.length) }).map((_, index) => (
              <div key={index} className="aspect-square border border-slate-800/30 bg-black/20" />
            ))}
          </div>

          {selectedItem && (
            <div className="flex h-full w-80 shrink-0 flex-col border-l border-white/10 pl-6 animate-in slide-in-from-right-4">
              <div className="mb-4 flex items-start gap-4 shrink-0">
                <div className={`flex h-20 w-20 shrink-0 items-center justify-center border-2 bg-black/40 text-4xl ${getRankColor(selectedItem.rank)}`}>
                  {selectedItem.icon}
                </div>
                <div>
                  <h2 className="mb-1 text-lg font-bold leading-tight text-white">{selectedItem.name}</h2>
                  <div className="flex flex-col gap-1">
                    <span className={`w-fit border px-1.5 py-0.5 text-[10px] font-bold ${getRankColor(selectedItem.rank)}`}>{selectedItem.rank}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{getCategoryLabel(selectedItem.category)}</span>
                    <span className="text-[10px] text-amber-300">稀有度：{selectedRarity}</span>
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar relative mb-4 flex-1 overflow-y-auto border border-slate-800 bg-slate-900/50 p-4">
                <div className="absolute right-2 top-2 opacity-10">
                  <FileText className="h-12 w-12" />
                </div>
                <h4 className="mb-2 text-[10px] font-bold uppercase text-slate-500">DESCRIPTION</h4>
                <p className="font-sans text-sm leading-relaxed text-slate-300">{selectedItem.description || '暂无描述。'}</p>

                {selectedItem.commodityProfile && (
                  <div className="mt-4 rounded border border-emerald-500/15 bg-emerald-950/10 p-3 text-xs text-slate-300">
                    <div className="text-[10px] font-bold uppercase text-emerald-200/80">商品来源信息</div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div className="rounded border border-slate-800 bg-black/20 px-2 py-1.5">
                        <div className="text-[9px] text-slate-500">{selectedSourceTitle}</div>
                        <div className="mt-1 text-emerald-100">{selectedSourceLabel}</div>
                      </div>
                      <div className="rounded border border-slate-800 bg-black/20 px-2 py-1.5">
                        <div className="text-[9px] text-slate-500">管制状态</div>
                        <div className="mt-1 text-rose-200">{selectedItem.commodityProfile.legalStatus || '未标注'}</div>
                      </div>
                    </div>
                    {!!selectedItem.commodityProfile.activeComponents?.length && (
                      <div className="mt-2">
                        <div className="mb-1 text-[10px] text-slate-500">活性成分</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedItem.commodityProfile.activeComponents.map(component => (
                            <span
                              key={component}
                              className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-100"
                            >
                              {component}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 border-t border-dashed border-slate-700 pt-4 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">重量</span>
                    <span className="text-slate-300">{selectedWeight}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">估价</span>
                    <span className="text-yellow-500">{selectedValue.toLocaleString()} 灵能币</span>
                  </div>
                </div>
              </div>

              <div className="mt-auto shrink-0 space-y-2">
                <button className="w-full bg-cyan-600/90 py-2 font-bold text-black shadow-[0_0_10px_rgba(8,145,178,0.3)] transition-colors hover:bg-cyan-500">
                  {isOwner ? '使用物品' : '请求赠予'}
                </button>
                <button className="w-full border border-slate-700 py-2 text-slate-400 transition-colors hover:border-slate-500 hover:text-white">
                  {isOwner ? '丢弃' : '偷窃'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryModal;
