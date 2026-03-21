import { CityRuntimeData, TransportLineRecord, TransportStopRecord } from '../types';
import { MetroLine, MetroNetwork, MetroStop, MetroTravelOption } from './sceneActions';
import { buildRegionalTransitFare } from './economyRuntime';

export type TravelSettlementMode = 'metro';

export interface TravelSettlementPlan {
  id: string;
  mode: TravelSettlementMode;
  modeLabel: string;
  title: string;
  fromLabel: string;
  toLabel: string;
  routeLabel: string;
  districtLabel: string;
  fare: number;
  minutes: number;
  transferCount: number;
  currentTimeLabel: string;
  arrivalTimeLabel: string;
  summary: string;
  lineIds: string[];
  targetStopId: string;
}

const buildMetroStop = (stop: TransportStopRecord, runtime: CityRuntimeData): MetroStop => {
  const line = runtime.transportLines.find(entry => entry.stopIds.includes(stop.id));
  const districtLabel =
    runtime.cells.find(cell => cell.districtId === stop.districtId)?.districtLabel
    || runtime.anchors.find(anchor => anchor.districtId === stop.districtId)?.label
    || stop.districtId;
  const region = line?.regionKey === 'aerila'
    ? '艾瑞拉区'
    : line?.regionKey === 'north'
      ? '诺丝区'
      : line?.regionKey === 'xiyu'
        ? '汐屿区'
        : line?.regionKey === 'holy'
          ? '圣教区'
          : line?.regionKey === 'borderland'
            ? '交界地'
            : line?.regionKey === 'cuiling'
              ? '淬灵区'
              : line?.regionKey === 'qiling'
                ? '栖灵区'
                : '未知区域';
  return {
    id: stop.id,
    label: stop.label,
    region,
    district: districtLabel,
  };
};

const buildMetroLine = (line: TransportLineRecord, runtime: CityRuntimeData): MetroLine => ({
  id: line.id,
  name: line.label,
  colorClass: 'text-cyan-200 border-cyan-500/30 bg-cyan-500/10',
  stops: line.stopIds
    .map(stopId => runtime.transportStops.find(stop => stop.id === stopId))
    .filter((stop): stop is TransportStopRecord => !!stop)
    .map(stop => buildMetroStop(stop, runtime)),
});

const resolveCurrentStop = (runtime: CityRuntimeData, currentLocation: string, candidateStops: TransportStopRecord[]): TransportStopRecord | null => {
  const direct = candidateStops.find(stop => currentLocation.includes(stop.label));
  if (direct) return direct;
  const byCell = candidateStops.find(stop => stop.cellId === runtime.currentCellId);
  if (byCell) return byCell;
  return candidateStops[0] || null;
};

export const buildRuntimeMetroNetwork = (runtime: CityRuntimeData, currentLocation: string): MetroNetwork | null => {
  const activeLines = runtime.transportLines.filter(
    line => line.mode === 'metro' && line.status === 'active' && line.districtIds.includes(runtime.currentDistrictId),
  );
  if (!activeLines.length) return null;

  const activeStops = runtime.transportStops.filter(
    stop =>
      stop.status === 'active'
      && stop.lineIds.some(lineId => activeLines.some(line => line.id === lineId)),
  );
  const currentStopRecord = resolveCurrentStop(runtime, currentLocation, activeStops);
  if (!currentStopRecord) return null;

  const currentStop = buildMetroStop(currentStopRecord, runtime);
  const lines = activeLines.map(line => buildMetroLine(line, runtime));
  const optionMap = new Map<string, MetroTravelOption>();

  activeLines
    .filter(line => line.stopIds.includes(currentStop.id))
    .forEach(line => {
      const currentIndex = line.stopIds.findIndex(stopId => stopId === currentStop.id);
      line.stopIds.forEach((stopId, index) => {
        if (stopId === currentStop.id) return;
        const stopRecord = runtime.transportStops.find(stop => stop.id === stopId && stop.status === 'active');
        if (!stopRecord) return;
        const stop = buildMetroStop(stopRecord, runtime);
        const stopCount = Math.abs(index - currentIndex);
        const fare = buildRegionalTransitFare({
          districtId: stopRecord.districtId,
          locationLabel: stop.label,
          stopCount,
          transferCount: 0,
        });
        const minutes = Math.max(3, stopCount * 4);
        const existing = optionMap.get(stop.id);
        if (existing) {
          existing.lineIds = Array.from(new Set([...existing.lineIds, line.id]));
          existing.fare = Math.min(existing.fare, fare);
          existing.minutes = Math.min(existing.minutes, minutes);
          return;
        }
        optionMap.set(stop.id, {
          stop,
          fare,
          minutes,
          lineIds: [line.id],
        });
      });
    });

  return {
    currentStop,
    lines,
    options: [...optionMap.values()].sort((a, b) => a.fare - b.fare || a.minutes - b.minutes),
  };
};

const formatClockLabel = (elapsedMinutes: number): string => {
  const base = new Date('2077-11-03T20:30:00');
  const value = new Date(base.getTime() + Math.max(0, elapsedMinutes || 0) * 60_000);
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const buildMetroTravelSettlementPlan = (params: {
  metro: MetroNetwork;
  option: MetroTravelOption;
  currentLocation: string;
  currentElapsedMinutes: number;
}): TravelSettlementPlan => {
  const primaryLine = params.metro.lines.find(line => params.option.lineIds.includes(line.id));
  const routeLabel = primaryLine?.name || params.option.lineIds[0]?.toUpperCase() || '轨道线路';
  const transferCount = Math.max(0, params.option.lineIds.length - 1);
  const nextElapsedMinutes = Math.max(0, params.currentElapsedMinutes || 0) + params.option.minutes;
  return {
    id: `travel_plan_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    mode: 'metro',
    modeLabel: '地铁',
    title: '出行结算',
    fromLabel: params.metro.currentStop.label || params.currentLocation || '当前站点',
    toLabel: params.option.stop.label,
    routeLabel,
    districtLabel: params.option.stop.district || params.option.stop.region,
    fare: params.option.fare,
    minutes: params.option.minutes,
    transferCount,
    currentTimeLabel: formatClockLabel(params.currentElapsedMinutes || 0),
    arrivalTimeLabel: formatClockLabel(nextElapsedMinutes),
    summary:
      transferCount > 0
        ? `本次轨道通勤需要换乘 ${transferCount} 次，确认后才会正式写入时间和位置。`
        : '本次轨道通勤会在确认后正式写入时间和位置，不直接让 AI 先行跳转场景。',
    lineIds: params.option.lineIds,
    targetStopId: params.option.stop.id,
  };
};
