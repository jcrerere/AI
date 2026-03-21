import React, { useMemo } from 'react';
import { AlertTriangle, BadgeAlert, Fingerprint, ScrollText } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { RuntimeAffix } from '../../types';

interface Props {
  affixes: RuntimeAffix[];
  warnings: string[];
  taxAmount: number;
  taxArrears: number;
  neuralProtocol: 'none' | 'beta';
  creditScore: number;
  sceneHint: string;
}

const StatusPenaltyPanel: React.FC<Props> = ({ affixes, warnings, taxAmount, taxArrears, neuralProtocol, creditScore, sceneHint }) => {
  const normalizedAffixes = useMemo(
    () =>
      affixes
        .map(affix => ({
          ...affix,
          name: affix.name?.trim() || '未命名状态',
          tone:
            affix.type === 'debuff'
              ? 'border-red-900/50 bg-red-950/20 text-red-200'
              : affix.type === 'buff'
              ? 'border-emerald-900/50 bg-emerald-950/20 text-emerald-200'
              : 'border-slate-800 bg-slate-950/30 text-slate-300',
        }))
        .filter(affix => affix.name),
    [affixes],
  );

  const complianceLevel =
    creditScore >= 100 ? '高合规' : creditScore >= 80 ? '稳定' : creditScore >= 50 ? '观察中' : creditScore >= 20 ? '高危' : '失控边缘';

  return (
    <CyberPanel title="状态与惩戒" className="mb-2" noPadding allowExpand collapsible>
      <div className="p-3 bg-black/40 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-red-300">
              <BadgeAlert className="w-3.5 h-3.5" />
              信誉与管制
            </div>
            <div className="mt-2 text-lg font-black text-white">{creditScore}</div>
            <div className="text-[11px] text-slate-500">{complianceLevel} · {neuralProtocol.toUpperCase()}</div>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-300">
              <ScrollText className="w-3.5 h-3.5" />
              本期待缴
            </div>
            <div className="mt-2 text-lg font-black text-white">{taxAmount.toLocaleString()} 灵能币</div>
            <div className="text-[11px] text-slate-500">会在月结和税务面板共同结算</div>
          </div>
        </div>

        {taxArrears > 0 ? (
          <div className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-amber-200">累计欠缴情形</div>
                <div className="mt-1 text-[11px] text-slate-400">欠缴情形会在后续月结中持续并入应缴税额，直到手动补缴。</div>
              </div>
              <div className="font-mono text-lg text-amber-200">{taxArrears.toLocaleString()} 灵能币</div>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <Fingerprint className="w-3.5 h-3.5 text-cyan-300" />
            当前状态
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {normalizedAffixes.length === 0 && warnings.length === 0 && (
              <span className="rounded border border-slate-800 bg-slate-950/30 px-2 py-1 text-[11px] text-slate-500">暂无附加状态</span>
            )}
            {normalizedAffixes.map(affix => (
              <span key={affix.id} className={`rounded border px-2 py-1 text-[11px] ${affix.tone}`}>
                {affix.name}
              </span>
            ))}
            {warnings.map((warning, index) => (
              <span key={`${warning}_${index}`} className="rounded border border-red-900/50 bg-red-950/20 px-2 py-1 text-[11px] text-red-200">
                警告：{warning}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
            当前提示
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-400">{sceneHint || '当前无额外场景提示。'}</div>
        </div>
      </div>
    </CyberPanel>
  );
};

export default StatusPenaltyPanel;
