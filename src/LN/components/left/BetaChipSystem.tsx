import React, { useState } from 'react';
import { Chip, PlayerCivilianStatus, Rank } from '../../types';
import ChipMatrix from './ChipMatrix';
import CyberPanel from '../ui/CyberPanel';
import { AlertTriangle, CreditCard, Clock, RotateCcw } from 'lucide-react';
import { getRankColor } from '../../constants';

interface Props {
  chips: Chip[];
  status: PlayerCivilianStatus;
  onChipClick: (chip: Chip) => void;
}

const BetaChipSystem: React.FC<Props> = ({ chips, status, onChipClick }) => {
  const [viewMode, setViewMode] = useState<'chips' | 'status'>('chips');

  return (
    <CyberPanel 
        title="BETA CHIP //  гражданский чип" 
        className="h-auto transition-all duration-500"
        variant={status.warningLevel === 'Purge' ? 'danger' : 'default'}
    >
      {/* Toggle Header */}
      <div className="flex justify-end -mt-8 mb-2">
         <button 
            onClick={() => setViewMode(viewMode === 'chips' ? 'status' : 'chips')}
            className={`text-[10px] uppercase font-mono px-2 py-0.5 border ${viewMode === 'status' ? 'bg-cyan-900/50 border-cyan-400 text-cyan-300' : 'border-slate-700 text-slate-500 hover:text-cyan-400'}`}
         >
            {viewMode === 'chips' ? 'View Status' : 'View Modules'}
         </button>
      </div>

      <div className="relative min-h-[160px]">
        {viewMode === 'chips' ? (
           <div className="animate-in fade-in zoom-in-95 duration-300">
               <ChipMatrix chips={chips} onChipClick={onChipClick} />
           </div>
        ) : (
           <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-3 p-1">
              {/* Credit Score */}
              <div className="flex justify-between items-center border-b border-dashed border-slate-700 pb-2">
                  <div className="flex items-center gap-2 text-slate-400">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-xs font-mono uppercase">信誉分 (Credit)</span>
                  </div>
                  <div className={`text-xl font-bold font-mono ${status.creditScore < 500 ? 'text-red-500' : 'text-cyan-400'}`}>
                      {status.creditScore}
                  </div>
              </div>

              {/* Warning Level */}
              <div className="flex justify-between items-center border-b border-dashed border-slate-700 pb-2">
                  <div className="flex items-center gap-2 text-slate-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-xs font-mono uppercase">警告等级 (Warning)</span>
                  </div>
                  <div className={`text-sm font-bold uppercase px-2 py-0.5 border ${
                      status.warningLevel === 'Low' ? 'border-green-500 text-green-500 bg-green-900/20' :
                      status.warningLevel === 'Medium' ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' :
                      'border-red-500 text-red-500 bg-red-900/20 animate-pulse'
                  }`}>
                      {status.warningLevel}
                  </div>
              </div>

              {/* Tax Deadline */}
              <div className="space-y-1">
                  <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs font-mono uppercase">缴税期限 (Tax Cycle)</span>
                  </div>
                  <div className="bg-red-950/30 border border-red-900/50 p-2 rounded flex justify-between items-center">
                      <div>
                          <div className="text-xs text-red-300">欠款: ¥{status.taxAmount.toLocaleString()}</div>
                          <div className="text-[10px] text-red-500/70 font-mono">{status.taxDeadline}</div>
                      </div>
                      <button className="text-[10px] bg-red-900/50 hover:bg-red-800 text-red-200 px-2 py-1 rounded border border-red-700 transition-colors">
                          PAY NOW
                      </button>
                  </div>
              </div>
           </div>
        )}
      </div>
    </CyberPanel>
  );
};

export default BetaChipSystem;