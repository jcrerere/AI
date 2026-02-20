import React from 'react';
import { Chip, Rank } from '../../types';
import { getRankColor, getRankBg } from '../../constants';
import { Cpu, Zap, Disc } from 'lucide-react';

interface Props {
  chips: Chip[];
  onChipClick: (chip: Chip) => void;
}

const ChipMatrix: React.FC<Props> = ({ chips, onChipClick }) => {
  return (
    <div className="grid grid-cols-3 gap-2 py-2">
      {/* 6 Fixed Slots Layout */}
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const chip = chips[idx];
        return (
          <div 
            key={idx}
            onClick={() => chip && onChipClick(chip)}
            className={`aspect-square relative group cursor-pointer border transition-all duration-300 ${chip ? getRankColor(chip.rank) : 'border-slate-800 border-dashed hover:border-slate-600'} rounded-lg flex items-center justify-center bg-black/20`}
          >
            {chip ? (
              <>
                <div className={`absolute inset-0 opacity-10 ${getRankBg(chip.rank)}`}></div>
                 {/* Icon based on type */}
                {chip.type === 'active' && <Zap className="w-5 h-5" />}
                {chip.type === 'passive' && <Cpu className="w-5 h-5" />}
                {chip.type === 'process' && <Disc className="w-5 h-5" />}
                
                {/* Connection lines decor */}
                <div className="absolute top-0 right-0 w-1 h-1 bg-current opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-1 h-1 bg-current opacity-50"></div>
              </>
            ) : (
                <span className="text-[10px] text-slate-700 font-mono">EMPTY</span>
            )}
            
            {/* Tooltip Hover */}
            {chip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-black/90 border border-slate-700 p-2 text-xs z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className={`font-bold ${getRankColor(chip.rank)}`}>{chip.name}</div>
                    <div className="text-slate-400 mt-1">{chip.description}</div>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ChipMatrix;