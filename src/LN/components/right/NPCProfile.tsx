import React, { useMemo, useState } from 'react';
import { NPC, Item } from '../../types';
import CyberPanel from '../ui/CyberPanel';
import PlayerStatePanel from '../left/PlayerStatePanel';
import SpiritNexus from './SpiritNexus';
import ChipPanel from '../left/ChipPanel';
import ItemDetailView from '../ui/ItemDetailView';
import InventoryModal from '../ui/InventoryModal';
import ImageLightbox from '../ui/ImageLightbox';
import { Heart, ShieldCheck, MapPin, Cpu, Package } from 'lucide-react';

interface Props {
  npc: NPC;
  onBack: () => void;
}

const NPCProfile: React.FC<Props> = ({ npc, onBack }) => {
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [showAvatar, setShowAvatar] = useState(false);

  const relationValue = npc.gender === 'female' ? npc.affection || 0 : npc.trust || 0;
  const relationLabel = npc.gender === 'female' ? '好感' : '信任';
  const relationColor = npc.gender === 'female' ? 'bg-pink-500 text-pink-400' : 'bg-blue-500 text-blue-400';
  const chipCount = useMemo(() => (npc.chips || []).length, [npc.chips]);
  const spiritStringCount = useMemo(
    () => (npc.bodyParts || []).reduce((sum, part) => sum + ((part.skills || []).length || 0), 0),
    [npc.bodyParts],
  );
  const visibleTags = (npc.statusTags || []).map(tag => tag.trim()).filter(Boolean).slice(0, 6);

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300 relative">
      <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <button onClick={onBack} className="text-xs text-cyan-400 hover:underline">
          &larr; 返回人物列表
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-black/40 p-4">
          <div className="flex gap-4 items-start">
            <button
              type="button"
              onClick={() => setShowAvatar(true)}
              className="w-24 h-32 shrink-0 overflow-hidden rounded-2xl border border-cyan-500/40 bg-black"
            >
              <img src={npc.avatarUrl} alt={npc.name} className="w-full h-full object-cover" />
            </button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-2xl font-bold text-white">{npc.name}</div>
                  <div className="mt-1 truncate text-sm font-semibold text-cyan-300">{npc.position || '身份未登记'}</div>
                </div>
                <span className={`h-2 w-2 shrink-0 rounded-full ${npc.status === 'online' ? 'bg-emerald-500' : npc.status === 'busy' ? 'bg-amber-400' : 'bg-slate-600'}`} />
              </div>

              <div className="mt-2 inline-flex max-w-full items-center gap-1 rounded-full border border-slate-700 bg-slate-900/50 px-2 py-1 text-[11px] text-slate-300">
                <MapPin className="w-3 h-3 text-slate-500" />
                <span className="truncate">{npc.location || '位置未知'}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-slate-800 bg-black/30 p-2">
                  <div className="text-slate-500">所属</div>
                  <div className="mt-1 text-slate-200">{npc.affiliation || '未知'}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-2">
                  <div className="text-slate-500">分组</div>
                  <div className="mt-1 text-slate-200">{npc.group || '未分组'}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-2">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Cpu className="w-3 h-3" />
                    芯片数
                  </div>
                  <div className="mt-1 text-slate-200">{chipCount}</div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-black/30 p-2">
                  <div className="text-slate-500">灵弦数</div>
                  <div className="mt-1 text-slate-200">{spiritStringCount}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                {npc.gender === 'female' ? <Heart className="w-4 h-4 text-pink-500" /> : <ShieldCheck className="w-4 h-4 text-blue-500" />}
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full ${relationColor.split(' ')[0]}`} style={{ width: `${Math.max(0, Math.min(100, relationValue))}%` }} />
                </div>
                <span className={`text-xs font-mono ${relationColor.split(' ')[1]}`}>
                  {relationLabel} {relationValue}
                </span>
              </div>
            </div>
          </div>
        </div>

        <CyberPanel title="状态总览" className="p-0">
          <div className="p-3">
            <PlayerStatePanel
              stats={npc.stats}
              gender={npc.gender}
              race={npc.race}
              statusTags={npc.statusTags}
              chipCount={chipCount}
              spiritStringCount={spiritStringCount}
            />
          </div>
        </CyberPanel>

        <CyberPanel title="即时状态" className="p-4">
          {visibleTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {visibleTags.map(tag => (
                <span key={tag} className="rounded-full border border-cyan-900/50 bg-cyan-950/20 px-2 py-1 text-[11px] text-cyan-200">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">当前没有记录到额外状态词条。</div>
          )}
        </CyberPanel>

        {(npc.bodyParts || []).length > 0 && (
          <CyberPanel title="灵枢状态" className="p-3">
            <SpiritNexus npc={npc} isReadOnly />
          </CyberPanel>
        )}

        {(npc.chips || []).length > 0 && (
          <ChipPanel
            chips={npc.chips || []}
            storageChips={[]}
            neuralProtocol="none"
            isReadOnly
          />
        )}

        <CyberPanel title="携带物品" className="relative">
          {selectedItem && <ItemDetailView item={selectedItem} onClose={() => setSelectedItem(null)} />}
          {(npc.inventory || []).length === 0 ? (
            <div className="p-3 text-sm text-slate-500">未记录到可查看物品。</div>
          ) : (
            <div className="p-3">
              <div className="grid grid-cols-5 gap-2">
                {(npc.inventory || []).slice(0, 10).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="aspect-square rounded-lg border border-slate-800 bg-slate-900/30 p-1 hover:bg-slate-800"
                    title={item.name}
                  >
                    <div className="flex h-full flex-col items-center justify-center">
                      <span className="text-lg">{item.icon}</span>
                      <span className="mt-1 text-[9px] text-slate-400">x{item.quantity}</span>
                    </div>
                  </button>
                ))}
              </div>
              {(npc.inventory || []).length > 10 && (
                <button
                  type="button"
                  onClick={() => setShowInventory(true)}
                  className="mt-3 inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-white"
                >
                  <Package className="w-3 h-3" />
                  查看完整物品清单
                </button>
              )}
            </div>
          )}
        </CyberPanel>
      </div>

      {showInventory && (
        <InventoryModal
          items={npc.inventory || []}
          title={`${npc.name} 的物品`}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showAvatar && (
        <ImageLightbox
          src={npc.avatarUrl}
          title={npc.name}
          subtitle={npc.position || npc.affiliation || '人物头像'}
          onClose={() => setShowAvatar(false)}
        />
      )}
    </div>
  );
};

export default NPCProfile;
