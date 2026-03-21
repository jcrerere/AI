import { CityRuntimeData, TransportLineRecord, TransportStopRecord } from '../types';
import { MetroLine, MetroNetwork, MetroStop, MetroTravelOption } from './sceneActions';
import { buildRegionalTransitFare } from './economyRuntime';
import { getDistrictTransportSnapshot, resolveDistrictProfileById } from './cityRuntime';

export type TravelSettlementMode = 'metro';
export type TravelRuleMode = 'walk' | 'metro' | 'taxi' | 'coach' | 'ferry';
export type TravelRuleAvailability = 'available' | 'restricted' | 'blocked';

export interface TravelRuleEntry {
  id: TravelRuleMode;
  label: string;
  availability: TravelRuleAvailability;
  scopeLabel: string;
  summary: string;
}

export interface TravelRuleSnapshot {
  districtId: string;
  districtLabel: string;
  regionLabel: string;
  enforcementNote: string;
  modes: TravelRuleEntry[];
}

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

const buildTravelRuleEnforcementNote = (regionKey: string): string => {
  switch (regionKey) {
    case 'aerila':
      return '跨分区优先走轨道与干道，不接受长距离步行直跳。';
    case 'north':
      return '诺丝区允许同城高价出行，但不容许跨区靠步行或出租车硬跳。';
    case 'xiyu':
      return '汐屿区近岸轨道和摆渡优先，跨片区移动不按步行处理。';
    case 'holy':
      return '圣教区民用出行受限，长距移动更依赖官方通道与干道。';
    case 'borderland':
      return '交界地长距移动默认走干道或桥梁节点，风险会被放大。';
    case 'cuiling':
      return '淬灵区没有民用地铁，跨片区主要靠干道运输。';
    case 'qiling':
      return '栖灵区封闭稀缺，长距位移必须走正式交通接口。';
    default:
      return '长距离移动必须先过交通层结算，不能直接文本跳转。';
  }
};

export const buildTravelRuleSnapshot = (runtime: CityRuntimeData, currentLocation: string): TravelRuleSnapshot => {
  const profile = resolveDistrictProfileById(runtime.currentDistrictId, currentLocation);
  const transport = getDistrictTransportSnapshot(runtime, profile.id);
  const hasMetro = transport.activeLines.some(line => line.mode === 'metro');
  const hasFerry = transport.activeLines.some(line => line.mode === 'ferry') || profile.transportModes.includes('ferry');
  const hasCoach = profile.transportModes.includes('expressway') || transport.projects.some(project => project.mode === 'expressway');

  const modes: TravelRuleEntry[] = [
    {
      id: 'walk',
      label: '步行',
      availability: 'available',
      scopeLabel: '同分区短距',
      summary: '默认只覆盖当前分区和邻近锚点；跨分区或长距离不按步行直接结算。',
    },
    {
      id: 'metro',
      label: '地铁',
      availability: hasMetro ? 'available' : 'blocked',
      scopeLabel: '既有站点',
      summary: hasMetro
        ? `只在当前分区已开放的轨道站点间移动，目前有 ${transport.activeLines.filter(line => line.mode === 'metro').length} 条轨道线可用。`
        : '当前分区没有开放中的民用轨道线，不能靠地铁完成位移。',
    },
    {
      id: 'taxi',
      label: '出租车',
      availability: profile.regionKey === 'holy' || profile.regionKey === 'qiling' ? 'restricted' : 'available',
      scopeLabel: '同城 / 同法域',
      summary:
        profile.regionKey === 'holy' || profile.regionKey === 'qiling'
          ? '当前区域民用出租受限，最多作为补充方式，不承担长距主通勤。'
          : '适合同城中短距补位，但不会承担跨区域主通勤。',
    },
    {
      id: 'coach',
      label: '干道客运',
      availability: hasCoach ? 'available' : 'restricted',
      scopeLabel: '跨分区 / 中长距',
      summary: hasCoach
        ? '跨分区和中长距位移默认走干道、桥梁或高速客运接口。'
        : '当前分区没有成熟干道客运层，长距移动会受到更强限制。',
    },
    {
      id: 'ferry',
      label: '摆渡',
      availability: hasFerry ? 'available' : 'blocked',
      scopeLabel: '沿水域 / 港区',
      summary: hasFerry
        ? '当前区域存在沿岸摆渡或水路接驳，可作为特定片区通行方式。'
        : '当前区域没有可用摆渡层，水路不作为主通勤方式。',
    },
  ];

  return {
    districtId: profile.id,
    districtLabel: profile.districtLabel,
    regionLabel: profile.regionLabel,
    enforcementNote: buildTravelRuleEnforcementNote(profile.regionKey),
    modes,
  };
};

export const buildTravelRuleDigest = (runtime: CityRuntimeData, currentLocation: string): string => {
  const snapshot = buildTravelRuleSnapshot(runtime, currentLocation);
  const modeSummary = snapshot.modes
    .map(mode => {
      const prefix = mode.availability === 'available' ? '可用' : mode.availability === 'restricted' ? '受限' : '封闭';
      return `${mode.label}[${prefix}/${mode.scopeLabel}]`;
    })
    .join(' / ');
  return `${snapshot.regionLabel}·${snapshot.districtLabel} 交通规则: ${modeSummary}; ${snapshot.enforcementNote}`;
};

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
