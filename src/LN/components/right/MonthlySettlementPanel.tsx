import React from 'react';
import { CalendarClock, Coins, ReceiptText, ShieldAlert } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { MonthlySettlementRecord } from '../../types';

interface SettlementPreview {
  currentMonthLabel: string;
  checkpointMonthLabel: string;
  cycleLabel: string;
  pendingMonths: number;
  canSettle: boolean;
  baseAllowance: number;
  currentTaxDue: number;
  arrearsDue: number;
  taxDue: number;
  maintenanceCost: number;
  penaltyCost: number;
  netDelta: number;
  notes: string[];
}

interface Props {
  preview: SettlementPreview;
  records: MonthlySettlementRecord[];
  onSettle: () => void;
}

const MonthlySettlementPanel: React.FC<Props> = ({ preview, records, onSettle }) => {
  return (
    <CyberPanel title="月结面板" noPadding allowExpand collapsible>
      <div className="p-3 bg-black/40 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] text-cyan-300">
              <CalendarClock className="w-3.5 h-3.5" />
              当前月份
            </div>
            <div className="mt-1 text-sm font-bold text-white">{preview.currentMonthLabel}</div>
            <div className="text-[11px] text-slate-500">上次结算基准：{preview.checkpointMonthLabel}</div>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/10 p-3">
            <div className="flex items-center gap-1 text-[11px] text-amber-300">
              <ReceiptText className="w-3.5 h-3.5" />
              待处理周期
            </div>
            <div className="mt-1 text-sm font-bold text-white">{preview.cycleLabel}</div>
            <div className="text-[11px] text-slate-500">{preview.pendingMonths} 个自然月待月结</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <div>
              <div className="text-[10px] text-slate-500">基础津贴</div>
              <div className="text-sm font-bold text-emerald-300">+¥{preview.baseAllowance.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">应缴税额</div>
              <div className="text-sm font-bold text-red-300">-¥{preview.taxDue.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">维持费用</div>
              <div className="text-sm font-bold text-amber-300">-¥{preview.maintenanceCost.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">风险扣款</div>
              <div className="text-sm font-bold text-fuchsia-300">-¥{preview.penaltyCost.toLocaleString()}</div>
            </div>
          </div>
          <div className="mt-3 rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[11px] text-slate-400">
                <Coins className="w-3.5 h-3.5 text-amber-300" />
                月结净变化
              </div>
              <div className={`text-base font-black ${preview.netDelta >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                {preview.netDelta >= 0 ? '+' : '-'}¥{Math.abs(preview.netDelta).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Current Tax</div>
              <div className="mt-1 text-sm font-semibold text-red-300">-¥{preview.currentTaxDue.toLocaleString()}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">Arrears Carryover</div>
              <div className="mt-1 text-sm font-semibold text-amber-300">-¥{preview.arrearsDue.toLocaleString()}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            月结说明
          </div>
          <div className="mt-2 space-y-1 text-[11px] text-slate-400">
            {preview.notes.map(note => (
              <div key={note}>- {note}</div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onSettle}
          disabled={!preview.canSettle}
          className="w-full rounded border border-fuchsia-700 px-3 py-2 text-xs text-fuchsia-200 hover:border-fuchsia-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {preview.canSettle ? '执行月结' : '当前月份未跨月，无需结算'}
        </button>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="text-[11px] font-bold text-slate-300">月结记录</div>
          <div className="mt-2 space-y-2">
            {records.length === 0 && <div className="text-[11px] text-slate-500">暂无月结记录。</div>}
            {records.map(record => (
              <div key={record.id} className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-300">{record.cycleLabel}</div>
                  <div className={`text-[11px] font-mono ${record.status === 'arrears' ? 'text-red-300' : 'text-emerald-300'}`}>
                    {record.netDelta >= 0 ? '+' : '-'}¥{Math.abs(record.netDelta).toLocaleString()}
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">{record.processedAt}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CyberPanel>
  );
};

export default MonthlySettlementPanel;
