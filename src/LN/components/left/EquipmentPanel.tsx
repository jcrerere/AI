import React, { useMemo, useState } from 'react';
import { Item } from '../../types';
import CyberPanel from '../ui/CyberPanel';
import { Shirt, Shield, Sword, Sparkles, X } from 'lucide-react';

interface Props {
  items: Item[];
}

type SlotKey = 'head' | 'body' | 'weapon' | 'accessory';

const SLOT_META: Record<SlotKey, { label: string; icon: React.ReactNode }> = {
  head: { label: '头部/面罩', icon: <Shield className="w-4 h-4" /> },
  body: { label: '身体', icon: <Shirt className="w-4 h-4" /> },
  weapon: { label: '武器', icon: <Sword className="w-4 h-4" /> },
  accessory: { label: '饰品', icon: <Sparkles className="w-4 h-4" /> },
};

const EquipmentPanel: React.FC<Props> = ({ items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSlot, setActiveSlot] = useState<SlotKey>('head');
  const [equipped, setEquipped] = useState<Record<SlotKey, Item | null>>({
    head: null,
    body: null,
    weapon: null,
    accessory: null,
  });

  const equipmentItems = useMemo(() => items.filter(i => i.category === 'equipment'), [items]);

  const equipToSlot = (item: Item) => {
    setEquipped(prev => ({ ...prev, [activeSlot]: item }));
  };

  const clearSlot = (slot: SlotKey) => {
    setEquipped(prev => ({ ...prev, [slot]: null }));
  };

  return (
    <>
      <CyberPanel title="装备模块" className="mb-2" noPadding>
        <div className="p-3 bg-black/40">
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(SLOT_META) as SlotKey[]).map(slot => (
              <div
                key={slot}
                className="h-16 border border-slate-700/70 rounded-lg bg-slate-950/40 px-2 py-1 flex items-center gap-2"
              >
                <div className="text-slate-400">{SLOT_META[slot].icon}</div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-500">{SLOT_META[slot].label}</div>
                  <div className="text-xs text-slate-200 truncate">{equipped[slot]?.name || '空'}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="w-full mt-3 border border-cyan-800/70 text-cyan-300 hover:text-white hover:bg-cyan-900/30 transition-colors text-xs py-2 rounded"
          >
            打开装备管理
          </button>
        </div>
      </CyberPanel>

      {isOpen && (
        <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl border border-slate-700 bg-[#080408] rounded-lg overflow-hidden">
            <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4">
              <div className="text-sm font-bold text-cyan-300">装备管理</div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div>
                <div className="text-xs text-slate-400 mb-2">装备槽位</div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(SLOT_META) as SlotKey[]).map(slot => (
                    <button
                      key={slot}
                      onClick={() => setActiveSlot(slot)}
                      className={`h-20 border rounded px-2 py-1 text-left transition-all ${
                        activeSlot === slot
                          ? 'border-cyan-500 bg-cyan-900/20'
                          : 'border-slate-700 bg-black/30 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-slate-300">
                        {SLOT_META[slot].icon}
                        <span className="text-xs">{SLOT_META[slot].label}</span>
                      </div>
                      <div className="text-[11px] text-slate-200 mt-2 truncate">{equipped[slot]?.name || '空'}</div>
                      {equipped[slot] && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            clearSlot(slot);
                          }}
                          className="text-[10px] mt-1 text-amber-400 hover:text-amber-300"
                        >
                          卸下
                        </button>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400 mb-2">可装备物品 ({equipmentItems.length})</div>
                <div className="max-h-[340px] overflow-y-auto scrollbar-hidden space-y-2 pr-1">
                  {equipmentItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => equipToSlot(item)}
                      className="w-full border border-slate-700 bg-black/30 hover:border-cyan-500/70 hover:bg-cyan-900/10 transition-all text-left p-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.icon}</span>
                        <div className="min-w-0">
                          <div className="text-sm text-slate-100 truncate">{item.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{item.description || '暂无描述'}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                  {equipmentItems.length === 0 && (
                    <div className="text-xs text-slate-500 border border-dashed border-slate-700 rounded p-3 text-center">
                      当前背包没有装备类物品
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EquipmentPanel;
