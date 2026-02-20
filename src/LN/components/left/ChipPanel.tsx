import React, { useMemo, useState } from 'react';
import { Chip, PlayerCivilianStatus, Rank } from '../../types';
import CyberPanel from '../ui/CyberPanel';
import {
  AlertTriangle,
  BadgeAlert,
  Box,
  CircuitBoard,
  Cpu,
  Disc,
  Fingerprint,
  Lock,
  ScrollText,
  ShieldAlert,
  X,
  Zap,
} from 'lucide-react';

interface Props {
  chips: Chip[];
  storageChips?: Chip[];
  status?: PlayerCivilianStatus;
  neuralProtocol?: 'none' | 'beta' | 'alpha';
  isReadOnly?: boolean;
  onNavigateToTax?: () => void;
  onEquip?: (chip: Chip) => void;
  onUnequip?: (chip: Chip) => void;
  onAddTaxOfficerContact?: () => void;
  onOpenCareerIdentity?: () => void;
}

type PanelMode = 'neural' | 'control';

const getCapacity = (rank?: Rank) => {
  switch (rank) {
    case Rank.Lv1:
      return 1;
    case Rank.Lv2:
      return 3;
    case Rank.Lv3:
      return 6;
    case Rank.Lv4:
      return 9;
    case Rank.Lv5:
      return 12;
    default:
      return 1;
  }
};

const formatRank = (rank?: Rank) => {
  if (!rank) return '未知';
  return `${rank.replace('Lv.', '')}级`;
};

const rankTone = (rank?: Rank) => {
  switch (rank) {
    case Rank.Lv1:
      return {
        border: 'border-slate-300/70',
        softBorder: 'border-slate-400/40',
        glow: 'shadow-[0_0_12px_rgba(226,232,240,0.18)]',
        bg: 'bg-slate-100/5',
        text: 'text-slate-100',
        subText: 'text-slate-300',
      };
    case Rank.Lv2:
      return {
        border: 'border-sky-500/80',
        softBorder: 'border-sky-500/40',
        glow: 'shadow-[0_0_14px_rgba(14,165,233,0.24)]',
        bg: 'bg-sky-900/15',
        text: 'text-sky-300',
        subText: 'text-sky-200',
      };
    case Rank.Lv3:
      return {
        border: 'border-purple-500/85',
        softBorder: 'border-purple-500/40',
        glow: 'shadow-[0_0_14px_rgba(168,85,247,0.25)]',
        bg: 'bg-purple-900/15',
        text: 'text-purple-300',
        subText: 'text-purple-200',
      };
    case Rank.Lv4:
      return {
        border: 'border-amber-500/85',
        softBorder: 'border-amber-500/40',
        glow: 'shadow-[0_0_14px_rgba(245,158,11,0.24)]',
        bg: 'bg-amber-900/15',
        text: 'text-amber-300',
        subText: 'text-amber-200',
      };
    case Rank.Lv5:
      return {
        border: 'border-red-500/85',
        softBorder: 'border-red-500/40',
        glow: 'shadow-[0_0_16px_rgba(239,68,68,0.26)]',
        bg: 'bg-red-900/15',
        text: 'text-red-300',
        subText: 'text-red-200',
      };
    default:
      return {
        border: 'border-slate-700',
        softBorder: 'border-slate-700/70',
        glow: '',
        bg: 'bg-slate-900/20',
        text: 'text-slate-200',
        subText: 'text-slate-400',
      };
  }
};

const typeIcon = (type: Chip['type']) => {
  if (type === 'active') return <Zap className="w-4 h-4 text-white" />;
  if (type === 'process') return <Disc className="w-4 h-4 text-white" />;
  return <Cpu className="w-4 h-4 text-white" />;
};

const ChipPanel: React.FC<Props> = ({
  chips: equippedChips,
  storageChips = [],
  status,
  neuralProtocol = 'none',
  isReadOnly = false,
  onNavigateToTax,
  onEquip,
  onUnequip,
  onAddTaxOfficerContact,
  onOpenCareerIdentity,
}) => {
  const [selectedChip, setSelectedChip] = useState<Chip | null>(null);
  const [showStorage, setShowStorage] = useState(false);
  const [panelMode, setPanelMode] = useState<PanelMode>('neural');
  const [showCreditLog, setShowCreditLog] = useState(false);
  const [showTaxDetail, setShowTaxDetail] = useState(false);

  const boardChip = useMemo(() => equippedChips.find(c => c.type === 'board'), [equippedChips]);
  const normalChips = useMemo(() => equippedChips.filter(c => c.type !== 'beta' && c.type !== 'board'), [equippedChips]);
  const maxSlots = getCapacity(boardChip?.rank);

  const score = status?.creditScore ?? 0;
  const betaLevel = status?.betaLevel ?? 1;
  const taxScale = Math.max(0.55, 1 - (betaLevel - 1) * 0.1);
  const taxAmountByLevel = Math.round((status?.taxAmount || 0) * taxScale);

  const controlLabel = neuralProtocol === 'beta' ? 'BETA' : neuralProtocol === 'alpha' ? 'ALPHA' : '未挂载';
  const controlClass =
    neuralProtocol === 'beta'
      ? 'border-red-500 text-red-300 bg-red-900/20'
      : neuralProtocol === 'alpha'
      ? 'border-amber-500 text-amber-300 bg-amber-900/20'
      : 'border-slate-700 text-slate-500 bg-white/5';

  const handleInstall = (chip: Chip) => {
    if (!onEquip) return;
    if (chip.type === 'board' || chip.type === 'beta') return;
    if (normalChips.length >= maxSlots) return;
    onEquip(chip);
  };

  const quickUnequip = (chip: Chip) => {
    if (!onUnequip) return;
    onUnequip(chip);
    if (selectedChip?.id === chip.id) setSelectedChip(null);
  };

  return (
    <CyberPanel title="芯片模组" className="flex flex-col bg-black text-white border-b-0" noPadding collapsible>
      <div className="p-3 bg-black space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPanelMode('neural')}
            className={`border rounded p-2 text-left transition-colors ${
              panelMode === 'neural' ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700'
            }`}
          >
            <div className="text-xs text-cyan-300 font-bold">神经协议</div>
            <div className="mt-2 border border-cyan-700/50 rounded h-10 flex items-center justify-center bg-cyan-950/20 gap-1">
              <CircuitBoard className="w-4 h-4 text-cyan-300" />
              <span className="text-[11px] text-cyan-200">{formatRank(boardChip?.rank)}</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setPanelMode('control')}
            className={`border rounded p-2 text-left transition-colors ${panelMode === 'control' ? controlClass : 'border-slate-700'}`}
          >
            <div className="text-xs font-bold">管制协议</div>
            <div className="mt-2 border rounded h-10 flex items-center justify-center bg-black/30 gap-1">
              <Fingerprint
                className={`w-4 h-4 ${
                  neuralProtocol === 'beta' ? 'text-red-400' : neuralProtocol === 'alpha' ? 'text-amber-400' : 'text-slate-500'
                }`}
              />
              <span className={`text-[11px] ${neuralProtocol === 'beta' ? 'text-red-300' : neuralProtocol === 'alpha' ? 'text-amber-300' : 'text-slate-500'}`}>
                {controlLabel}
              </span>
            </div>
          </button>
        </div>

        {panelMode === 'neural' && (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[10px] text-slate-400 font-bold">
                <span>芯片插槽</span>
                <span className="ml-2">{Math.min(normalChips.length, maxSlots)} / {maxSlots}</span>
              </div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setShowStorage(true);
                    setSelectedChip(null);
                  }}
                  className="text-[9px] font-bold flex items-center gap-1 bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 px-2 py-1 hover:bg-cyan-500 hover:text-black transition-all"
                >
                  <Box className="w-3 h-3" /> 芯片库
                </button>
              )}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: maxSlots }).map((_, idx) => {
                const chip = normalChips[idx];
                const tone = rankTone(chip?.rank);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (chip) setSelectedChip(chip);
                      else if (!isReadOnly) setShowStorage(true);
                    }}
                    className={`relative aspect-square rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                      chip
                        ? `border ${tone.border} ${tone.bg} ${tone.glow} hover:brightness-110`
                        : 'border border-slate-800 bg-white/5 hover:border-slate-600'
                    }`}
                  >
                    {chip ? (
                      <div className="absolute inset-0 p-2 flex flex-col items-center justify-center gap-1">
                        {typeIcon(chip.type)}
                        <div className={`text-[9px] leading-none font-bold ${tone.subText}`}>{formatRank(chip.rank)}</div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600">{idx + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {panelMode === 'control' && (
          <div className="border border-red-900/50 rounded bg-[linear-gradient(180deg,rgba(120,0,0,0.16),rgba(0,0,0,0.75))]">
            <div className="px-3 py-2 border-b border-red-900/50 flex items-center justify-between">
              <div className="text-xs font-bold text-red-300 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                协议面板
              </div>
            </div>

            {neuralProtocol === 'none' ? (
              <div className="p-3 text-xs text-slate-400">未挂载协议，模块不可用。</div>
            ) : neuralProtocol === 'alpha' ? (
              <div className="p-3 text-xs text-slate-400">当前为 ALPHA 协议，不启用 BETA 管制任务与税务惩戒。</div>
            ) : (
              <div className="p-3 space-y-3">
                <button
                  type="button"
                  onClick={() => setShowCreditLog(prev => !prev)}
                  className="w-full border border-red-800 rounded p-2 bg-black/40 text-left hover:bg-red-950/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-red-300 flex items-center gap-1">
                      <BadgeAlert className="w-3.5 h-3.5" />
                      信誉值
                    </div>
                    <div className="text-2xl font-black text-red-400">{score}</div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">点击查看加扣分记录</div>
                </button>

                <button
                  type="button"
                  onClick={onOpenCareerIdentity}
                  className="w-full border border-red-800 rounded p-2 bg-black/40 text-left hover:bg-red-950/20"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-red-300 flex items-center gap-1">
                      <Fingerprint className="w-3.5 h-3.5" />
                      身份
                    </div>
                    <div className="text-[10px] text-red-400">打开</div>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">点击进入职业线路设计</div>
                </button>

                {showCreditLog && (
                  <div className="border border-red-900/50 rounded p-2 bg-black/50 space-y-1 max-h-36 overflow-y-auto scrollbar-hidden">
                    {(status?.deductionHistory || []).length === 0 && <div className="text-[11px] text-slate-500">暂无记录</div>}
                    {(status?.deductionHistory || []).map(record => (
                      <div key={record.id} className="flex items-start justify-between text-[11px] gap-2">
                        <div className="text-slate-300">{record.reason}</div>
                        <div className={record.amount >= 0 ? 'text-emerald-400' : 'text-red-400'}>{record.amount >= 0 ? `+${record.amount}` : record.amount}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border border-red-900/50 rounded p-3 bg-black/30 space-y-3">
                  <button type="button" onClick={() => setShowTaxDetail(prev => !prev)} className="w-full flex items-center justify-between">
                    <span className="text-xs text-red-300 flex items-center gap-1">
                      <ScrollText className="w-3.5 h-3.5" />
                      税务系统
                    </span>
                    <span className="text-[10px] text-red-400">{showTaxDetail ? '收起' : '展开'}</span>
                  </button>

                  <div className="border border-red-900/40 rounded p-3 bg-black/50">
                    <div className="text-[10px] text-red-500 uppercase tracking-wider">本期应缴</div>
                    <div className="text-3xl font-black text-red-300 mt-1">¥{taxAmountByLevel.toLocaleString()}</div>
                    <div className="text-[10px] text-slate-500 mt-1">等级系数: Beta Lv.{betaLevel}</div>
                  </div>

                  {showTaxDetail && (
                    <div className="space-y-2 text-[11px]">
                      <button
                        type="button"
                        onClick={onAddTaxOfficerContact}
                        className="w-full text-left border border-red-800/50 rounded p-2 hover:bg-red-900/20"
                      >
                        <div className="text-slate-400">缴税官</div>
                        <div className="text-red-300 mt-0.5">「{status?.taxOfficerName || '第7区征税官·未登记'}」</div>
                        <div className="text-[10px] text-slate-500 mt-1">点击添加到标记人物</div>
                      </button>

                      <div className="border border-red-900/30 rounded p-2 bg-black/40">
                        <div className="text-slate-400">机构点</div>
                        <div className="text-slate-200 mt-0.5">{status?.taxOfficeAddress || '第7区税务征收机构'}</div>
                      </div>

                      <div className="border border-red-900/30 rounded p-2 bg-black/40">
                        <div className="text-slate-400">到期</div>
                        <div className="text-slate-200 mt-0.5">{status?.taxDeadline || '--'}</div>
                      </div>

                      <div className="text-red-400">跨区未申请视为重大违法。</div>

                      <button type="button" onClick={onNavigateToTax} className="border border-red-700 text-red-300 hover:bg-red-900/30 px-2 py-1 text-[10px]">
                        导航至机构点
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedChip && (
        <div className="absolute inset-0 z-30 bg-black p-4 border border-white/10 animate-in fade-in zoom-in-95 duration-200">
          {(() => {
            const tone = rankTone(selectedChip.rank);
            return (
              <>
                <div className={`border ${tone.softBorder} rounded-lg p-3 ${tone.bg}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className={`text-base leading-5 font-black tracking-wide ${tone.text}`}>{selectedChip.name}</div>
                      <div className={`mt-1 inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-bold ${tone.border} ${tone.subText}`}>
                        等级 {formatRank(selectedChip.rank)}
                      </div>
                    </div>
                    <button onClick={() => setSelectedChip(null)} className="text-slate-400 hover:text-white shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="border border-slate-800/80 rounded p-2 bg-black/40">
                      <div className="text-[10px] text-slate-500">芯片类型</div>
                      <div className={`mt-1 text-xs font-bold ${tone.subText}`}>
                        {selectedChip.type === 'active' ? '主动' : selectedChip.type === 'process' ? '进程' : '被动'}
                      </div>
                    </div>
                    <div className="border border-slate-800/80 rounded p-2 bg-black/40">
                      <div className="text-[10px] text-slate-500">协议接口</div>
                      <div className={`mt-1 text-xs font-bold ${tone.subText}`}>{selectedChip.rank}</div>
                    </div>
                    <div className="border border-slate-800/80 rounded p-2 bg-black/40">
                      <div className="text-[10px] text-slate-500">状态</div>
                      <div className={`mt-1 text-xs font-bold ${tone.subText}`}>已加载</div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-[11px] text-slate-400 leading-relaxed border border-slate-800 rounded p-3 bg-black/40">
                  {selectedChip.description}
                </div>
              </>
            );
          })()}

          {!isReadOnly && (
            <div className="mt-4 flex justify-end">
              {selectedChip.type === 'beta' || selectedChip.type === 'board' ? (
                <div className="text-[10px] text-red-400 flex items-center gap-1">
                  {selectedChip.type === 'board' ? <Lock className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                  核心协议不可卸载
                </div>
              ) : (
                <button onClick={() => quickUnequip(selectedChip)} className="text-[11px] border border-red-900/60 bg-red-950/20 text-red-400 px-3 py-1.5 hover:bg-red-900/40">
                  卸载芯片
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {showStorage && (
        <div className="absolute inset-0 z-40 bg-black p-4 border border-cyan-900/50 animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between border-b border-cyan-900/40 pb-2 mb-3">
            <div className="text-sm text-cyan-400 font-bold">芯片库</div>
            <button onClick={() => setShowStorage(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-hidden pr-1">
            {storageChips.length === 0 && <div className="text-xs text-slate-500">芯片库为空</div>}
            {storageChips.map(chip => {
              const lockedByDoctor = chip.type === 'board' || chip.type === 'beta';
              const full = chip.type !== 'board' && chip.type !== 'beta' && normalChips.length >= maxSlots;

              return (
                <div key={chip.id} className="border border-slate-800 bg-slate-900/30 p-2 flex items-center justify-between">
                  <div>
                    <div className="text-xs text-white">{chip.name}</div>
                    <div className="text-[10px] text-slate-500">{formatRank(chip.rank)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleInstall(chip)}
                    disabled={lockedByDoctor || full}
                    className={`text-[10px] border px-2 py-1 ${
                      lockedByDoctor || full ? 'border-slate-700 text-slate-600 cursor-not-allowed' : 'border-cyan-800 text-cyan-400 hover:bg-cyan-900/30'
                    }`}
                  >
                    {lockedByDoctor ? '义体医生' : full ? '插槽已满' : '安装'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </CyberPanel>
  );
};

export default ChipPanel;
