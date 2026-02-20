import React, { useState } from 'react';
import { NPC, Item, Skill, Rank } from '../../types';
import { getRankColor } from '../../constants';
import CyberPanel from '../ui/CyberPanel';
import SpiritNexus from './SpiritNexus';
import ChipPanel from '../left/ChipPanel';
import PlayerStatePanel from '../left/PlayerStatePanel';
import ItemDetailView from '../ui/ItemDetailView';
import InventoryModal from '../ui/InventoryModal';
import PlayerSpiritCoreModal from '../ui/PlayerSpiritCoreModal';
import { User, Activity, MapPin, ShieldCheck, Heart, Cpu, Sparkles, Loader2, Upload, Maximize2, X } from 'lucide-react';

interface Props {
  npc: NPC;
  onBack: () => void;
}

const NPCProfile: React.FC<Props> = ({ npc, onBack }) => {
  const [activeSection, setActiveSection] = useState<'nexus' | 'info' | 'chips'>('info');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showFullInventory, setShowFullInventory] = useState(false);
  const [isAvatarGenerating, setIsAvatarGenerating] = useState(false);
  const [showSpiritModal, setShowSpiritModal] = useState(false);
  const [isAvatarZoomed, setIsAvatarZoomed] = useState(false);

  React.useEffect(() => {
    setActiveSection('info');
  }, [npc.id]);

  const handleAvatarGen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAvatarGenerating(true);
    setTimeout(() => setIsAvatarGenerating(false), 1500);
  };

  const getSpiritSkills = (): Skill[] => {
    if (npc.gender === 'female') {
      return npc.bodyParts?.find(p => p.key === 'core')?.skills || [];
    }
    return npc.spiritSkills || [];
  };

  return (
    <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-300 relative">
      <div className="flex flex-col gap-2 mb-4 shrink-0">
        <button onClick={onBack} className="text-xs text-cyan-400 hover:underline mr-auto mb-2">
          &larr; 返回列表
        </button>

        <div className="flex gap-4">
          <div
            onClick={() => setIsAvatarZoomed(true)}
            className="w-24 h-24 rounded-lg border-2 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.3)] overflow-hidden relative group cursor-pointer bg-black shrink-0 hover:border-cyan-400 transition-colors"
          >
            {isAvatarGenerating ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
              </div>
            ) : (
              <img src={npc.avatarUrl} alt={npc.name} className="w-full h-full object-cover" />
            )}

            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity gap-2 backdrop-blur-sm">
              <Maximize2 className="w-5 h-5 text-white mb-1" />
              <div className="flex gap-3">
                <div title="上传图片" className="p-1.5 hover:bg-slate-700 rounded bg-black/50 border border-slate-600">
                  <Upload className="w-3 h-3 text-slate-300" />
                </div>
                <div title="AI 生成形象" onClick={handleAvatarGen} className="p-1.5 hover:bg-cyan-900/50 rounded bg-black/50 border border-cyan-700">
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-end pb-1">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white leading-none tracking-tight">{npc.name}</h2>
              <span className={`w-2 h-2 rounded-full shadow-[0_0_5px_currentColor] ${npc.status === 'online' ? 'bg-green-500 text-green-500' : 'bg-slate-600 text-slate-600'}`} />
            </div>
            <div className="text-xs text-cyan-400 font-bold mb-1">{npc.position}</div>
            <div className="text-[10px] text-slate-400 border px-1.5 py-0.5 rounded border-slate-700 bg-slate-900/50 w-fit mb-2">{npc.affiliation}</div>

            <div className="w-full">
              {npc.gender === 'female' ? (
                <div className="flex items-center gap-2">
                  <Heart className="w-3 h-3 text-pink-500" />
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-pink-500 shadow-[0_0_5px_rgba(236,72,153,0.8)]" style={{ width: `${npc.affection || 0}%` }} />
                  </div>
                  <span className="text-xs text-pink-500 font-bold font-mono">{npc.affection}%</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3 h-3 text-blue-500" />
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]" style={{ width: `${npc.trust || 0}%` }} />
                  </div>
                  <span className="text-xs text-blue-500 font-bold font-mono">{npc.trust}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mb-4 shrink-0">
        <button
          onClick={() => setActiveSection('info')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
            activeSection === 'info'
              ? 'bg-purple-900/40 border-purple-400 text-purple-300 shadow-[0_0_10px_rgba(192,132,252,0.2)]'
              : 'bg-black/40 border-slate-800 text-slate-500 hover:text-purple-400'
          }`}
        >
          <User className="w-3 h-3" /> 个人资料
        </button>

        {npc.gender === 'female' ? (
          <button
            onClick={() => setActiveSection('nexus')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
              activeSection === 'nexus'
                ? 'bg-cyan-900/40 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-black/40 border-slate-800 text-slate-500 hover:text-cyan-400'
            }`}
          >
            <Activity className="w-3 h-3" /> 灵枢
          </button>
        ) : (
          <button
            onClick={() => setActiveSection('chips')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center justify-center gap-2 ${
              activeSection === 'chips'
                ? 'bg-cyan-900/40 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                : 'bg-black/40 border-slate-800 text-slate-500 hover:text-cyan-400'
            }`}
          >
            <Cpu className="w-3 h-3" /> 芯片模组
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {activeSection === 'nexus' && npc.gender === 'female' && (
          <CyberPanel title="灵枢系统" className="min-h-full">
            <SpiritNexus npc={npc} isReadOnly={true} />
          </CyberPanel>
        )}

        {activeSection === 'chips' && npc.gender === 'male' && (
          <div className="h-full">
            <ChipPanel chips={npc.chips || []} isReadOnly={true} />
          </div>
        )}

        {activeSection === 'info' && (
          <div className="space-y-4">
            <CyberPanel title="状态监控" className="p-0">
              <div className="p-3">
                <PlayerStatePanel stats={npc.stats} gender={npc.gender} onOpenSpiritCore={() => setShowSpiritModal(true)} />
              </div>
            </CyberPanel>

            <CyberPanel variant="default" className="p-4 space-y-3">
              <div className="flex justify-between items-center border-b border-dashed border-slate-700 pb-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <User className="w-3 h-3" /> 所属势力
                </span>
                <span className="text-xs text-white bg-slate-800 px-2 py-0.5 rounded">{npc.affiliation}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-700 pb-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <Activity className="w-3 h-3" /> 职位
                </span>
                <span className="text-xs font-bold text-cyan-400">{npc.position}</span>
              </div>
              <div className="flex justify-between items-center border-b border-dashed border-slate-700 pb-2">
                <span className="text-xs text-slate-400 font-bold flex items-center gap-2">
                  <MapPin className="w-3 h-3" /> 当前位置
                </span>
                <span className="text-xs text-slate-300">{npc.location || '未知'}</span>
              </div>
            </CyberPanel>

            <CyberPanel title="背包物品" className="relative group">
              {selectedItem && <ItemDetailView item={selectedItem} onClose={() => setSelectedItem(null)} />}
              <div className="grid grid-cols-5 gap-2">
                {npc.inventory?.slice(0, 10).map(item => (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className={`aspect-square border bg-slate-900/30 flex flex-col items-center justify-center p-1 cursor-pointer hover:bg-slate-800 transition-colors ${getRankColor(item.rank)}`}
                    title={item.name}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[8px] text-slate-400 mt-0.5">x{item.quantity}</span>
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 5 - (npc.inventory?.length || 0)) }).map((_, i) => (
                  <div key={i} className="aspect-square border border-white/5 bg-transparent" />
                ))}
              </div>
              <div
                onClick={() => setShowFullInventory(true)}
                className="text-[9px] text-slate-500 text-center mt-3 cursor-pointer hover:text-white border border-dashed border-slate-700 py-1"
              >
                查看完整背包 ({npc.inventory.length})
              </div>
            </CyberPanel>
          </div>
        )}

        {showFullInventory && (
          <InventoryModal title={`${npc.name} 的背包`} items={npc.inventory} onClose={() => setShowFullInventory(false)} isOwner={false} />
        )}

        {showSpiritModal && (
          <PlayerSpiritCoreModal
            skills={getSpiritSkills()}
            rank={npc.stats.psionic.level}
            isReadOnly={true}
            gender={npc.gender}
            conversionRate={npc.stats.psionic.conversionRate}
            recoveryRate={npc.stats.psionic.recoveryRate}
            baseDailyRecovery={npc.gender === 'female' ? 30 : 120}
            coreAffixes={
              npc.gender === 'male'
                ? [{ id: `${npc.id}_mk_1`, name: '烙印：静默回线', description: '短时抑制回路外放。', source: '未知来源' }]
                : []
            }
            soulLedger={
              npc.gender === 'female'
                ? { [Rank.Lv1]: 1, [Rank.Lv2]: 0, [Rank.Lv3]: 0, [Rank.Lv4]: 0, [Rank.Lv5]: 0 }
                : {}
            }
            onClose={() => setShowSpiritModal(false)}
            onAddSkill={() => {}}
            onRemoveSkill={() => {}}
          />
        )}

        {isAvatarZoomed && (
          <div
            className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-200"
            onClick={() => setIsAvatarZoomed(false)}
          >
            <button className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X className="w-8 h-8" />
            </button>
            <div
              className="relative max-w-2xl max-h-[80%] w-full border-2 border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.2)] bg-black"
              onClick={e => e.stopPropagation()}
            >
              <img src={npc.avatarUrl} className="w-full h-full object-contain" />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 p-4 border-t border-white/10 backdrop-blur-sm flex justify-between items-center">
                <div className="text-white font-bold text-lg">{npc.name}</div>
                <button onClick={handleAvatarGen} className="flex items-center gap-2 bg-cyan-900/50 text-cyan-400 border border-cyan-700 px-4 py-2 hover:bg-cyan-800 transition-colors">
                  <Sparkles className="w-4 h-4" /> 重构形象
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NPCProfile;
