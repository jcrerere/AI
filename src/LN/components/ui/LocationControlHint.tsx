import React from 'react';
import { AlertTriangle, MapPinned, ShieldAlert } from 'lucide-react';

interface Props {
  headline: string;
  exchangeText: string;
  hints: string[];
  riskTone: 'safe' | 'watch' | 'danger';
}

const toneClass: Record<Props['riskTone'], string> = {
  safe: 'border-emerald-900/40 bg-emerald-950/10 text-emerald-200',
  watch: 'border-amber-900/40 bg-amber-950/10 text-amber-200',
  danger: 'border-red-900/40 bg-red-950/10 text-red-200',
};

const LocationControlHint: React.FC<Props> = ({ headline, exchangeText, hints, riskTone }) => {
  return (
    <div className={`mt-2 rounded-xl border px-3 py-2 ${toneClass[riskTone]}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 text-[11px] font-bold">
          <MapPinned className="w-3.5 h-3.5" />
          {headline}
        </div>
        <div className="flex items-center gap-1 text-[11px] opacity-80">
          <ShieldAlert className="w-3.5 h-3.5" />
          {exchangeText}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {hints.map(hint => (
          <span key={hint} className="inline-flex items-center gap-1 rounded border border-white/10 bg-black/20 px-2 py-1 text-[11px] text-slate-200">
            <AlertTriangle className="w-3 h-3 opacity-70" />
            {hint}
          </span>
        ))}
      </div>
    </div>
  );
};

export default LocationControlHint;
