import React from 'react';
import { Fingerprint, MapPinned, ReceiptText, ShieldAlert, UserRoundSearch } from 'lucide-react';
import CyberPanel from '../ui/CyberPanel';
import { PlayerCivilianStatus } from '../../types';

interface Props {
  status: PlayerCivilianStatus;
  playerName: string;
  factionName: string;
  currentLocation: string;
  neuralProtocol: 'none' | 'beta';
  onNavigateToTax: () => void;
  onPickTaxOfficer: () => void;
  onOpenCareerIdentity: () => void;
}

const TaxDossierPanel: React.FC<Props> = ({
  status,
  playerName,
  factionName,
  currentLocation,
  neuralProtocol,
  onNavigateToTax,
  onPickTaxOfficer,
  onOpenCareerIdentity,
}) => {
  return (
    <CyberPanel title="税务官档案" noPadding allowExpand collapsible>
      <div className="p-3 bg-black/40 space-y-3">
        <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-3">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <div className="text-slate-500">接入者</div>
              <div className="mt-1 text-slate-200">{playerName}</div>
            </div>
            <div>
              <div className="text-slate-500">身份编号</div>
              <div className="mt-1 font-mono text-red-200">{status.citizenId || '未登记'}</div>
            </div>
            <div>
              <div className="text-slate-500">所属体系</div>
              <div className="mt-1 text-slate-200">{factionName}</div>
            </div>
            <div>
              <div className="text-slate-500">协议状态</div>
              <div className="mt-1 text-slate-200">{neuralProtocol.toUpperCase()}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onOpenCareerIdentity}
            className="rounded-xl border border-fuchsia-900/40 bg-fuchsia-950/10 p-3 text-left hover:border-fuchsia-500/60"
          >
            <div className="flex items-center gap-1 text-[11px] text-fuchsia-300">
              <Fingerprint className="w-3.5 h-3.5" />
              身份线路
            </div>
            <div className="mt-1 text-[11px] text-slate-500">打开职业线与身份配置</div>
          </button>
          <button
            type="button"
            onClick={onPickTaxOfficer}
            className="rounded-xl border border-cyan-900/40 bg-cyan-950/10 p-3 text-left hover:border-cyan-500/60"
          >
            <div className="flex items-center gap-1 text-[11px] text-cyan-300">
              <UserRoundSearch className="w-3.5 h-3.5" />
              绑定税务官
            </div>
            <div className="mt-1 text-[11px] text-slate-500">切换或补录当前责任税务官</div>
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3 space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <ReceiptText className="w-3.5 h-3.5 text-red-300" />
            当前税务信息
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">当前税务官</div>
              <div className="mt-1 text-slate-200">{status.taxOfficerName || '未绑定'}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">信誉值</div>
              <div className="mt-1 font-mono text-red-200">{status.creditScore}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">本期待缴</div>
              <div className="mt-1 font-mono text-red-200">¥{status.taxAmount.toLocaleString()}</div>
            </div>
            <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
              <div className="text-slate-500">截止时间</div>
              <div className="mt-1 text-slate-200">{status.taxDeadline || '待月结后生成'}</div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3 space-y-2">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <MapPinned className="w-3.5 h-3.5 text-amber-300" />
            机构与地点
          </div>
          <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2 text-[11px]">
            <div className="text-slate-500">当前所在地</div>
            <div className="mt-1 text-slate-200">{currentLocation || '未知区域'}</div>
          </div>
          <div className="rounded border border-slate-800/90 bg-slate-950/40 p-2 text-[11px]">
            <div className="text-slate-500">税务机构</div>
            <div className="mt-1 text-slate-200">{status.taxOfficeAddress || '待绑定税务官后写入'}</div>
          </div>
          <button
            type="button"
            onClick={onNavigateToTax}
            className="w-full rounded border border-red-700 px-3 py-2 text-xs text-red-200 hover:border-red-500 hover:text-white"
          >
            导航至税务机构
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
            扣分与警告记录
          </div>
          <div className="mt-2 space-y-2">
            {(status.deductionHistory || []).length === 0 && (status.warnings || []).length === 0 && (
              <div className="text-[11px] text-slate-500">当前没有处罚记录。</div>
            )}
            {(status.warnings || []).map((warning, index) => (
              <div key={`${warning}_${index}`} className="rounded border border-red-900/40 bg-red-950/20 px-2 py-1.5 text-[11px] text-red-200">
                警告：{warning}
              </div>
            ))}
            {(status.deductionHistory || []).slice().reverse().slice(0, 8).map(record => (
              <div key={record.id} className="rounded border border-slate-800/90 bg-slate-950/40 p-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-200">{record.reason}</div>
                  <div className={`text-[11px] font-mono ${record.amount >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {record.amount >= 0 ? `+${record.amount}` : record.amount}
                  </div>
                </div>
                <div className="mt-1 text-[10px] text-slate-500">{record.timestamp}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CyberPanel>
  );
};

export default TaxDossierPanel;
