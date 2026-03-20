import React, { useMemo } from 'react';
import { CityRuntimeData, RuntimeTodoStatus } from '../../types';
import { getCurrentDistrictLabel, getDistrictTransportSnapshot } from '../../utils/cityRuntime';

interface Props {
  runtime: CityRuntimeData;
  currentLocation: string;
  onMarkTodoRead: (todoId: string) => void;
  onUpdateTodoStatus: (todoId: string, status: RuntimeTodoStatus) => void;
}

const TODO_STATUS_LABEL: Record<RuntimeTodoStatus, string> = {
  active: '进行中',
  ready: '就绪',
  completed: '完成',
  failed: '失败',
  cancelled: '取消',
};

const TODO_STATUS_CLASS: Record<RuntimeTodoStatus, string> = {
  active: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-100',
  ready: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100',
  completed: 'border-slate-400/20 bg-slate-500/10 text-slate-200',
  failed: 'border-rose-400/20 bg-rose-500/10 text-rose-100',
  cancelled: 'border-white/10 bg-white/[0.04] text-slate-400',
};

const CityRuntimePanel: React.FC<Props> = ({ runtime, currentLocation, onMarkTodoRead, onUpdateTodoStatus }) => {
  const currentAnchor = useMemo(
    () => runtime.anchors.find(anchor => anchor.id === runtime.currentAnchorId) || null,
    [runtime.anchors, runtime.currentAnchorId],
  );
  const transport = useMemo(() => getDistrictTransportSnapshot(runtime, runtime.currentDistrictId), [runtime]);
  const districtShops = useMemo(
    () => runtime.shops.filter(shop => shop.districtId === runtime.currentDistrictId).slice(-5).reverse(),
    [runtime.shops, runtime.currentDistrictId],
  );
  const unreadTodos = useMemo(() => runtime.todos.filter(todo => todo.unread).length, [runtime.todos]);
  const visibleTodos = useMemo(
    () =>
      [...runtime.todos]
        .sort((a, b) => {
          if (a.unread !== b.unread) return a.unread ? -1 : 1;
          const aOpen = a.status === 'active' || a.status === 'ready';
          const bOpen = b.status === 'active' || b.status === 'ready';
          if (aOpen !== bOpen) return aOpen ? -1 : 1;
          return b.createdAtMinutes - a.createdAtMinutes;
        })
        .slice(0, 5),
    [runtime.todos],
  );

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-cyan-500/15 bg-cyan-950/10 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-cyan-200/70">数字地图</div>
        <div className="mt-1 text-sm font-semibold text-cyan-50">{getCurrentDistrictLabel(runtime)}</div>
        <div className="mt-1 text-xs text-slate-400">{currentLocation || '未锁定当前位置'}</div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] text-slate-300 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Cell</div>
            <div className="mt-1 font-mono text-cyan-100">{runtime.currentCellId || 'NULL'}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Anchor</div>
            <div className="mt-1 font-mono text-cyan-100">{runtime.currentAnchorId || 'NULL'}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">待办</div>
            <div className="mt-1 text-cyan-100">
              {runtime.todos.length} 条 / 未读 {unreadTodos}
            </div>
          </div>
        </div>
        {currentAnchor && (
          <div className="mt-3 rounded-xl border border-white/8 bg-black/30 px-3 py-2 text-xs text-slate-300">
            当前锚点：<span className="font-semibold text-white">{currentAnchor.label}</span>
            <span className="ml-2 text-slate-500">{currentAnchor.kind}</span>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">待办账本</div>
          {unreadTodos > 0 && (
            <div className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-100">
              新待办 {unreadTodos}
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {visibleTodos.map(todo => {
            const isActionable = todo.status === 'active' || todo.status === 'ready';
            return (
              <div key={todo.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-xs font-semibold text-white">{todo.title}</div>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] ${TODO_STATUS_CLASS[todo.status]}`}>
                    {TODO_STATUS_LABEL[todo.status]}
                  </span>
                  {todo.unread && (
                    <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-2 py-0.5 text-[10px] text-rose-100">
                      NEW
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-300">{todo.summary}</div>
                <div className="mt-2 text-[11px] text-slate-500">
                  {todo.locationLabel}
                  {todo.routeHint ? ` · 接口 ${todo.routeHint}` : ''}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {todo.unread && (
                    <button
                      type="button"
                      onClick={() => onMarkTodoRead(todo.id)}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] text-slate-200 hover:bg-white/[0.09]"
                    >
                      标记已读
                    </button>
                  )}
                  {isActionable && (
                    <button
                      type="button"
                      onClick={() => onUpdateTodoStatus(todo.id, 'completed')}
                      className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-100 hover:bg-emerald-500/20"
                    >
                      完成
                    </button>
                  )}
                  {isActionable && (
                    <button
                      type="button"
                      onClick={() => onUpdateTodoStatus(todo.id, 'cancelled')}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10px] text-slate-300 hover:bg-white/[0.1]"
                    >
                      取消
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {visibleTodos.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
              当前没有运行中的生活待办。灵网私信、代办、会面和取货安排会在这里登记。
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">交通层</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {(transport.activeModes.length ? transport.activeModes : ['none']).map(mode => (
            <span
              key={mode}
              className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] ${
                mode === 'none'
                  ? 'border-white/10 bg-white/[0.04] text-slate-500'
                  : 'border-emerald-400/18 bg-emerald-500/10 text-emerald-100'
              }`}
            >
              {mode}
            </span>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {transport.activeLines.slice(0, 4).map(line => (
            <div key={line.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              <div className="text-xs font-semibold text-white">{line.label}</div>
              <div className="mt-1 text-[11px] text-slate-400">{line.summary}</div>
            </div>
          ))}
          {transport.activeLines.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
              当前分区没有开放中的轨道线路，只保留道路/桥梁扩张接口。
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/8 bg-black/30 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500">已注册店铺</div>
        <div className="mt-3 space-y-2">
          {districtShops.map(shop => (
            <div key={shop.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-white">{shop.name}</div>
                <div className="text-[10px] uppercase tracking-[0.16em] text-fuchsia-300">{shop.tier}</div>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {shop.type} · 风格 {shop.signatureStyle.join(' / ')}
                {shop.hasBackroom ? ' · 暗柜可疑' : ''}
              </div>
            </div>
          ))}
          {districtShops.length === 0 && (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-slate-500">
              这个分区的运行时店铺还没有被正式注册。
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CityRuntimePanel;
