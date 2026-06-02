import React from 'react';
import { Item, Rank } from '../../types';
import { getRankColor } from '../../constants';
import { estimateItemMarketValue } from '../../data/speciesCatalog';
import { FileText, Trash2, X, Zap } from 'lucide-react';

interface Props {
  item: Item;
  onClose: () => void;
  onUse?: (item: Item) => void;
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

const getCategoryLabel = (category: Item['category']) => {
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

const ItemDetailView: React.FC<Props> = ({ item, onClose, onUse, locationLabel }) => {
  const estimatedValue = estimateItemMarketValue(item, locationLabel);
  const rarityLabel = item.commodityProfile?.rarity || DEFAULT_RARITY_BY_RANK[item.rank];
  const weightLabel = formatWeight(item.commodityProfile?.weightKg);
  const valueLabel = `${estimatedValue.toLocaleString()} 灵能币`;
  const valueHint = locationLabel ? `区域估价 · ${locationLabel}` : '标准估价';
  const sourceLabel = item.commodityProfile?.sourceRace || item.commodityProfile?.sourceRegion || '未知';
  const sourceTitle = item.commodityProfile?.sourceRace
    ? '来源种族'
    : item.commodityProfile?.sourceRegion
      ? '来源地区'
      : '来源主体';

  return (
    <div className="absolute inset-0 z-50 flex flex-col border border-cyan-500/30 bg-[#080408]/95 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95">
      <div className="border-b border-white/10 bg-slate-900/50 p-4">
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center border bg-black/40 text-2xl shadow-inner ${getRankColor(item.rank)}`}>
              {item.icon}
            </div>
            <div>
              <h3 className={`text-sm font-bold leading-tight ${getRankColor(item.rank).split(' ')[0]}`}>{item.name}</h3>
              <span className="rounded border border-slate-700 bg-black/30 px-1 text-[10px] uppercase tracking-wider text-slate-400">
                {getCategoryLabel(item.category)} <span className="text-slate-600">|</span> {item.rank}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-500 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2">
          {onUse && (
            <button
              onClick={() => onUse(item)}
              className="flex flex-1 items-center justify-center gap-1 bg-cyan-600 px-3 py-2 text-xs font-bold text-white shadow-[0_0_10px_rgba(8,145,178,0.4)] transition-all hover:bg-cyan-500"
            >
              <Zap className="h-3 w-3 fill-current" /> 立即使用
            </button>
          )}
          <button className="flex flex-1 items-center justify-center gap-1 border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs font-bold text-red-400 transition-all hover:bg-red-900/60">
            <Trash2 className="h-3 w-3" /> 丢弃
          </button>
        </div>
      </div>

      <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        <div className="relative rounded border border-slate-800/60 bg-black/30 p-3">
          <div className="absolute right-2 top-2 opacity-10">
            <FileText className="h-8 w-8" />
          </div>
          <h4 className="mb-1 text-[9px] font-bold uppercase text-slate-500">物品描述</h4>
          <p className="text-xs italic leading-relaxed text-slate-300">{item.description || '暂无描述。'}</p>
        </div>

        {item.commodityProfile && (
          <div className="rounded border border-emerald-500/20 bg-emerald-950/15 p-3">
            <h4 className="mb-2 text-[9px] font-bold uppercase text-emerald-200/80">商品来源谱系</h4>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-slate-800/80 bg-black/20 px-2 py-1.5">
                  <div className="text-[9px] text-slate-500">稀有度</div>
                  <div className="mt-1 font-semibold text-amber-200">{rarityLabel}</div>
                </div>
                <div className="rounded border border-slate-800/80 bg-black/20 px-2 py-1.5">
                  <div className="text-[9px] text-slate-500">管制状态</div>
                  <div className="mt-1 font-semibold text-rose-200">{item.commodityProfile.legalStatus || '未标注'}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-slate-800/80 bg-black/20 px-2 py-1.5">
                  <div className="text-[9px] text-slate-500">{sourceTitle}</div>
                  <div className="mt-1 font-semibold text-emerald-100">{sourceLabel}</div>
                </div>
                <div className="rounded border border-slate-800/80 bg-black/20 px-2 py-1.5">
                  <div className="text-[9px] text-slate-500">来源类型</div>
                  <div className="mt-1 font-semibold text-cyan-200">{item.commodityProfile.sourceKind || '常规制品'}</div>
                </div>
              </div>

              {!!item.commodityProfile.activeComponents?.length && (
                <div>
                  <div className="mb-1 text-slate-500">活性成分</div>
                  <div className="flex flex-wrap gap-1">
                    {item.commodityProfile.activeComponents.map(component => (
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

              {!!item.commodityProfile.deliveryMethods?.length && (
                <div>
                  <div className="mb-1 text-slate-500">使用方式</div>
                  <div className="flex flex-wrap gap-1">
                    {item.commodityProfile.deliveryMethods.map(method => (
                      <span
                        key={method}
                        className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!item.commodityProfile.traitTags?.length && (
                <div>
                  <div className="mb-1 text-slate-500">效果标签</div>
                  <div className="flex flex-wrap gap-1">
                    {item.commodityProfile.traitTags.map(tag => (
                      <span
                        key={tag}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {!!item.commodityProfile.noteLines?.length && (
                <div className="space-y-1 rounded border border-slate-800/80 bg-black/20 px-2 py-2 text-[10px] leading-4 text-slate-400">
                  {item.commodityProfile.noteLines.map(line => (
                    <div key={line}>{line}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {item.clothingProfile && (
          <div className="rounded border border-fuchsia-500/20 bg-fuchsia-950/20 p-3">
            <h4 className="mb-2 text-[9px] font-bold uppercase text-fuchsia-200/80">衣物语义</h4>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">品类</span>
                <span>{item.clothingProfile.categoryLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">品质</span>
                <span>{item.clothingProfile.quality}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">轮廓</span>
                <span>{item.clothingProfile.silhouette}</span>
              </div>
              <div>
                <div className="mb-1 text-slate-500">适合场景</div>
                <div className="flex flex-wrap gap-1">
                  {item.clothingProfile.sceneTags.map(tag => (
                    <span key={tag} className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] text-fuchsia-100">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-slate-500">给人的印象</div>
                <div className="flex flex-wrap gap-1">
                  {item.clothingProfile.impressionTags.map(tag => (
                    <span key={tag} className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {item.forgeProfile && (
          <div className="rounded border border-cyan-500/20 bg-cyan-950/20 p-3">
            <h4 className="mb-2 text-[9px] font-bold uppercase text-cyan-200/80">工坊语义</h4>
            <div className="space-y-2 text-[11px] text-slate-300">
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">品质</span>
                <span>{item.forgeProfile.quality}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">蓝图</span>
                <span>{item.forgeProfile.blueprintLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-slate-500">工坊等级</span>
                <span>Lv.{item.forgeProfile.crafterLevel}</span>
              </div>
              <div>
                <div className="mb-1 text-slate-500">锻造词条</div>
                <div className="space-y-2">
                  {item.forgeProfile.affixes.map(affix => (
                    <div key={affix.id} className="rounded border border-white/10 bg-black/20 px-2 py-2">
                      <div className="font-semibold text-white">
                        {affix.label}
                        {affix.valueLabel}
                      </div>
                      <div className="mt-1 text-slate-400">{affix.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="rounded border border-slate-800/60 bg-black/30 p-3">
          <h4 className="mb-2 text-[9px] font-bold uppercase text-slate-500">属性预览</h4>
          <div className="space-y-2">
            <div className="flex justify-between border-b border-slate-800/50 pb-1 text-[10px]">
              <span className="text-slate-400">持有数量</span>
              <span className="font-mono text-white">x{item.quantity}</span>
            </div>
            <div className="flex justify-between border-b border-slate-800/50 pb-1 text-[10px]">
              <span className="text-slate-400">单体重量</span>
              <span className="font-mono text-white">{weightLabel}</span>
            </div>
            {!!item.sourceShopLabel && (
              <div className="flex justify-between border-b border-slate-800/50 pb-1 text-[10px]">
                <span className="text-slate-400">来源渠道</span>
                <span className="font-mono text-cyan-200">{item.sourceShopLabel}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-400">{valueHint}</span>
              <span className="font-mono text-yellow-400">{valueLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailView;
