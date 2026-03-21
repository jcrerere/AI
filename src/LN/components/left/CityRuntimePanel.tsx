import React, { useMemo } from 'react';
import { CityRuntimeData, RuntimeTodoStatus } from '../../types';
import { buildLocalMapSnapshot, buildTaskLayerDigest, getCurrentDistrictLabel, getDistrictTaskState, getDistrictTransportSnapshot } from '../../utils/cityRuntime';
import { buildEconomyBenchmarkSnapshot, buildEconomyScenePrices } from '../../utils/economyRuntime';
import { buildTravelRuleDigest, buildTravelRuleSnapshot } from '../../utils/transportRuntime';

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
  const localMap = useMemo(() => buildLocalMapSnapshot(runtime, currentLocation), [runtime, currentLocation]);
  const taskState = useMemo(() => getDistrictTaskState(runtime, localMap.profile.id), [runtime, localMap.profile.id]);
  const taskLayerDigest = useMemo(() => buildTaskLayerDigest(runtime, currentLocation), [runtime, currentLocation]);
  const travelRules = useMemo(() => buildTravelRuleSnapshot(runtime, currentLocation), [runtime, currentLocation]);
  const travelRuleDigest = useMemo(() => buildTravelRuleDigest(runtime, currentLocation), [runtime, currentLocation]);
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
  const economy = useMemo(
    () => buildEconomyBenchmarkSnapshot(runtime.currentDistrictId, currentLocation),
    [runtime.currentDistrictId, currentLocation],
  );
  const economyScenePrices = useMemo(
    () => buildEconomyScenePrices(runtime.currentDistrictId, currentLocation),
    [runtime.currentDistrictId, currentLocation],
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

      <div className="rounded-2xl border border-fuchsia-500/15 bg-fuchsia-950/10 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/70">Local Map</div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
          <span className="font-mono text-cyan-100">{localMap.currentCellId || 'NULL'}</span>
          <span>
            ({localMap.currentCoords.x}, {localMap.currentCoords.y}) / 已发现 {localMap.discoveredCellCount} 格 / {localMap.discoveredAnchorCount} 锚点
          </span>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {localMap.neighbors.map(neighbor => (
            <div key={neighbor.direction} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">{neighbor.directionLabel}</span>
                <span className="font-mono text-[11px] text-cyan-100">{neighbor.blocked ? 'EDGE' : neighbor.cellId}</span>
              </div>
              <div className="mt-1 text-[11px] text-slate-300">
                {neighbor.blocked
                  ? '分区边界'
                  : !neighbor.discovered
                    ? '未发现邻格'
                    : neighbor.anchorLabels.length > 0
                      ? neighbor.anchorLabels.join(' / ')
                      : '已发现，但还没有注册锚点'}
              </div>
              {!neighbor.blocked && neighbor.transportLabels.length > 0 && (
                <div className="mt-1 text-[10px] text-emerald-200/80">{neighbor.transportLabels.join(' / ')}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-fuchsia-500/15 bg-fuchsia-950/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-200/70">Task Layer</div>
          <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1 text-[10px] text-fuchsia-100">
            逗留 {taskState.visitRounds} 轮
          </div>
        </div>
        <div className="mt-2 rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-[11px] leading-5 text-slate-300">
          {taskLayerDigest}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-300">
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">窗口数</div>
            <div className="mt-1 text-fuchsia-100">{taskState.opportunityWindows}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">最新进度层</div>
            <div className="mt-1 font-mono text-fuchsia-100">{taskState.lastProgressLayerId || 'NULL'}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-amber-500/15 bg-amber-950/10 p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/70">经济层</div>
        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-amber-50">{economy.structureLabel}</div>
          <div className="text-[11px] text-amber-200/80">{economy.label}</div>
        </div>
        <div className="mt-1 text-[11px] leading-5 text-slate-400">{economy.note}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 md:grid-cols-5">
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">生存线</div>
            <div className="mt-1 text-amber-100">{economy.minimumDailyCash}/{economy.minimumDailyEquivalent}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">中位消费</div>
            <div className="mt-1 text-amber-100">{economy.medianDailyConsumption}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">均值消费</div>
            <div className="mt-1 text-amber-100">{economy.averageDailyConsumption}</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">中位/均收</div>
            <div className="mt-1 text-amber-100">
              {economy.medianDailyIncome}/{economy.averageDailyIncome}
            </div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">恩格尔</div>
            <div className="mt-1 text-amber-100">{economy.engelMedian}%</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-300 md:grid-cols-4">
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">基础餐饮</div>
            <div className="mt-1 text-amber-100">{economyScenePrices.basicMeal} 灵能币</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">日常吃饭</div>
            <div className="mt-1 text-amber-100">{economyScenePrices.casualMeal} 灵能币</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">约场消费</div>
            <div className="mt-1 text-amber-100">{economyScenePrices.dateMeal} 灵能币</div>
          </div>
          <div className="rounded-xl border border-white/8 bg-black/25 px-3 py-2">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-500">轨道票价</div>
            <div className="mt-1 text-amber-100">
              {economyScenePrices.quickRideFare}/{economyScenePrices.commuteFare} 灵能币
            </div>
          </div>
        </div>
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
        <div className="mt-2 rounded-xl border border-white/8 bg-black/20 px-3 py-3 text-[11px] leading-5 text-slate-300">
          {travelRuleDigest}
        </div>
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
          {travelRules.modes.map(mode => (
            <div key={mode.id} className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-semibold text-white">{mode.label}</div>
                <div
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${
                    mode.availability === 'available'
                      ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                      : mode.availability === 'restricted'
                        ? 'border-amber-400/20 bg-amber-500/10 text-amber-100'
                        : 'border-white/10 bg-white/[0.04] text-slate-400'
                  }`}
                >
                  {mode.scopeLabel}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-slate-400">{mode.summary}</div>
            </div>
          ))}
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
                {shop.hasBackroom ? ' · 暗柜可疑' : ''} · 熟客 {shop.loyalty} · 折扣 Lv.{shop.discountTier}
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
