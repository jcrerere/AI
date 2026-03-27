import { CityRuntimeData, DistrictEventCategory, DistrictEventOpportunityRecord, DistrictGridProfile } from '../types';
import { getDistrictTaskState, resolveDistrictProfileById } from './cityRuntime';

type EventTemplate = {
  id: string;
  category: DistrictEventCategory;
  title: string;
  teaser: string;
  summary: string;
  routeHint: string | null;
  locationHint?: string;
};

const hashText = (input: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const DISTRICT_EVENT_TEMPLATES: Record<string, EventTemplate[]> = {
  airela_north_gate: [
    {
      id: 'north_gate_manifest',
      category: 'contract',
      title: '关务名册出现了离线缺页',
      teaser: '北门分区有人正在悄悄寻找能避开正式流程补回缺页的人。',
      summary: '适合作为低调接触关务、补件、代送或假证引子。',
      routeHint: 'black_market',
      locationHint: '北门关务口岸周边',
    },
    {
      id: 'north_gate_checkpoint_shift',
      category: 'hazard',
      title: '边检班次突然调整',
      teaser: '赫卡关城附近的盘查节奏正在改变，有人想提前卖消息。',
      summary: '适合作为出入城、规避盘查、追查通行痕迹的前置异动。',
      routeHint: 'travel',
      locationHint: '赫卡关城',
    },
  ],
  airela_central_ring: [
    {
      id: 'central_ring_envelope',
      category: 'encounter',
      title: '礼序外包员弄丢了一只封签袋',
      teaser: '中环分区有人低声打听是否能在审计前把东西悄悄补回去。',
      summary: '适合作为接触官署边缘人、补漏、勒索或情报交换的引子。',
      routeHint: 'shop',
      locationHint: '中环礼序区',
    },
    {
      id: 'central_ring_guest_list',
      category: 'rumor',
      title: '礼宾馆外流出了一份错名接待单',
      teaser: '有人想知道名单上的错位身份到底是谁故意安排的。',
      summary: '适合作为礼宾、假名、会面名单或上层关系误植的切入口。',
      routeHint: 'restaurant',
      locationHint: '帝绶礼宾馆',
    },
  ],
  airela_south_port: [
    {
      id: 'south_port_manifest_swap',
      category: 'contract',
      title: '南港货单里混进了一件不该出现的标记物',
      teaser: '有人在找能在装卸前把它挑出来的人。',
      summary: '适合作为港务、暗货、偷换箱单与低调搬运的事件种子。',
      routeHint: 'black_market',
      locationHint: '南港货桥',
    },
  ],
  north_sin_square: [
    {
      id: 'sin_square_bd_trial',
      category: 'vice',
      title: '罪吻片区流出了一段高风险样片',
      teaser: '有人正在找胆子够大、又肯闭嘴的试用客。',
      summary: '适合作为超感样片、夜场试胆、黑医善后和债务诱导的前置钩子。',
      routeHint: 'entertainment',
      locationHint: '罪吻广场周边',
    },
    {
      id: 'sin_square_missing_worker',
      category: 'encounter',
      title: '一名排班中的夜场从业者突然断线',
      teaser: '附近的店家都在装作不知道，但有几个熟客已经开始着急。',
      summary: '适合作为夜场找人、红灯场所压力测试或关系线接入点。',
      routeHint: 'entertainment',
      locationHint: '罪吻广场',
    },
  ],
  north_entertainment: [
    {
      id: 'entertainment_race_fix',
      category: 'contract',
      title: '有人在赛道外圈悄悄收买测试员',
      teaser: '黑赛盘口之外，还有人想提前知道哪台灵械今晚会爆。',
      summary: '适合作为黑赛、下注、赛道事故或技术作弊的幕后引子。',
      routeHint: 'entertainment',
      locationHint: '裂帛赛道',
    },
    {
      id: 'entertainment_demo_leak',
      category: 'rumor',
      title: '会展塔里一台演示机提前泄出了片段参数',
      teaser: '参数本身不值钱，真正值钱的是谁先拿到了它。',
      summary: '适合作为样机泄漏、赞助竞争和路演截胡的事件起点。',
      routeHint: 'black_market',
      locationHint: '浮霓会展塔',
    },
  ],
  north_university: [
    {
      id: 'university_sample_runner',
      category: 'contract',
      title: '一份路演样机需要在公开开场前被悄悄换手',
      teaser: '诺丝大学外围有人正在找动作稳、嘴也稳的跑腿人。',
      summary: '适合作为产研接口、样机试运、资本试探和技术倒手的引子。',
      routeHint: 'black_market',
      locationHint: '诺丝大学产业带',
    },
    {
      id: 'university_fund_match',
      category: 'rumor',
      title: '一支新基金正在暗中挑选下一轮路演样本',
      teaser: '没人知道他们真正看重的是技术、团队，还是只想卡死竞争对手。',
      summary: '适合作为赞助、竞价、团队挖角与公开路演线的前置异动。',
      routeHint: 'shop',
      locationHint: '诺丝大学外环',
    },
  ],
  north_capital: [
    {
      id: 'capital_proxy_vote',
      category: 'hazard',
      title: '一场不公开的代理表决正在提前清理旁听名单',
      teaser: '有人需要一个可信又不会留下正式身份的人进场带话。',
      summary: '适合作为资本会面、代理签约、清算厅博弈与身份借壳的事件入口。',
      routeHint: 'black_market',
      locationHint: '资本议事片区',
    },
  ],
  xiyu_white_bay: [
    {
      id: 'white_bay_booking',
      category: 'contract',
      title: '白湾港侧的一笔高价预订忽然失联',
      teaser: '有人想在客人察觉前把空掉的服务链补上。',
      summary: '适合作为旅游服务、替位、接待错单和码头灰色链路的起点。',
      routeHint: 'restaurant',
      locationHint: '白湾片区',
    },
  ],
  holy_cathedral: [
    {
      id: 'holy_quota_shift',
      category: 'hazard',
      title: '教区配给窗口的额度突然被抽走了一截',
      teaser: '有人想知道到底是审查加严，还是某个名单被故意挪用了。',
      summary: '适合作为配给、限购、名册漂移与教区压力的区域事件种子。',
      routeHint: 'travel',
      locationHint: '圣堂片区',
    },
  ],
  borderland_dogtown: [
    {
      id: 'dogtown_scrap_route',
      category: 'contract',
      title: '狗镇废料线里混进了一批来路不正的整件货',
      teaser: '有人想先一步摸清它们最终会落去哪个摊口。',
      summary: '适合作为狗镇黑市、截货、改装件倒流与渠道争夺的起点。',
      routeHint: 'black_market',
      locationHint: '狗镇片区',
    },
  ],
};

const REGION_EVENT_TEMPLATES: Record<string, EventTemplate[]> = {
  aerila: [
    {
      id: 'aerila_protocol_review',
      category: 'hazard',
      title: '某条行政流程忽然被要求补齐追溯链',
      teaser: '这意味着有人正在回头翻旧账，也意味着有人会急着灭痕。',
      summary: '适合作为官署压力、身份追溯和制度性风险的隐线入口。',
      routeHint: 'travel',
    },
  ],
  north: [
    {
      id: 'north_backroom_signal',
      category: 'vice',
      title: '一条灰色渠道突然开始只接熟客',
      teaser: '外人只会看到店门还开着，熟人则知道今晚货路已经变了。',
      summary: '适合作为黑市、暗柜、熟客门槛和掮客筛选的区域信号。',
      routeHint: 'black_market',
    },
  ],
  holy: [
    {
      id: 'holy_registry_anomaly',
      category: 'rumor',
      title: '教区某份登记本出现了顺序错位',
      teaser: '表面上只是文书问题，实际上有人已经开始借机追名单。',
      summary: '适合作为教区配给、审查和名单争议的区域事件骨架。',
      routeHint: 'travel',
    },
  ],
  borderland: [
    {
      id: 'borderland_salvage_bid',
      category: 'contract',
      title: '边境上有人在提前收一批还没公开拆封的旧件',
      teaser: '没人会白白收废铁，所以真正的值钱货还没被说出来。',
      summary: '适合作为黑市估价、废料竞标和边境灰产任务的引子。',
      routeHint: 'black_market',
    },
  ],
};

const DEFAULT_EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'default_whisper',
    category: 'rumor',
    title: '附近有人正在低声兜售一条不方便公开说的消息',
    teaser: '这不一定是任务，但通常意味着一条线要开始浮出水面了。',
    summary: '适合作为区域内任意接触线、试探线和临时事件的保底入口。',
    routeHint: null,
  },
];

const EVENT_LIMIT = 60;

const pickEventTemplate = (profile: DistrictGridProfile, windowIndex: number): EventTemplate => {
  const districtTemplates = DISTRICT_EVENT_TEMPLATES[profile.id] || [];
  const regionTemplates = REGION_EVENT_TEMPLATES[profile.regionKey] || [];
  const pool = [...districtTemplates, ...regionTemplates, ...DEFAULT_EVENT_TEMPLATES];
  const seed = hashText(`${profile.id}|${windowIndex}|${profile.regionKey}`);
  return pool[seed % pool.length];
};

const buildEventId = (districtId: string, windowIndex: number): string => `event_${districtId}_${String(windowIndex).padStart(3, '0')}`;

const createDistrictEventOpportunity = (
  profile: DistrictGridProfile,
  windowIndex: number,
  elapsedMinutes: number,
): DistrictEventOpportunityRecord => {
  const template = pickEventTemplate(profile, windowIndex);
  return {
    id: buildEventId(profile.id, windowIndex),
    districtId: profile.id,
    regionKey: profile.regionKey,
    windowIndex,
    templateId: template.id,
    category: template.category,
    title: template.title,
    teaser: template.teaser,
    summary: template.summary,
    routeHint: template.routeHint,
    locationHint: template.locationHint || `${profile.regionLabel}·${profile.districtLabel}`,
    openedAtMinutes: elapsedMinutes,
    lastUpdatedAtMinutes: elapsedMinutes,
    status: 'open',
  };
};

export const listDistrictEventOpportunities = (
  runtime: CityRuntimeData,
  districtId: string,
): DistrictEventOpportunityRecord[] =>
  runtime.districtEventOpportunities
    .filter(event => event.districtId === districtId)
    .sort((left, right) => left.windowIndex - right.windowIndex);

export const syncDistrictEventLayer = (
  runtime: CityRuntimeData,
  params: {
    districtId: string;
    locationLabel: string;
    elapsedMinutes: number;
  },
): { runtime: CityRuntimeData; created: DistrictEventOpportunityRecord[]; changed: boolean } => {
  const profile = resolveDistrictProfileById(params.districtId, params.locationLabel);
  const taskState = getDistrictTaskState(runtime, profile.id);
  if (taskState.opportunityWindows <= 0) {
    return { runtime, created: [], changed: false };
  }

  const existingKeys = new Set(
    runtime.districtEventOpportunities
      .filter(event => event.districtId === profile.id)
      .map(event => `${event.districtId}:${event.windowIndex}`),
  );

  const created: DistrictEventOpportunityRecord[] = [];
  for (let windowIndex = 1; windowIndex <= taskState.opportunityWindows; windowIndex += 1) {
    const eventKey = `${profile.id}:${windowIndex}`;
    if (existingKeys.has(eventKey)) continue;
    created.push(createDistrictEventOpportunity(profile, windowIndex, params.elapsedMinutes));
  }

  if (created.length === 0) {
    return { runtime, created: [], changed: false };
  }

  const nextEvents = [...runtime.districtEventOpportunities, ...created]
    .sort((left, right) => right.openedAtMinutes - left.openedAtMinutes)
    .slice(0, EVENT_LIMIT);

  return {
    runtime: {
      ...runtime,
      districtEventOpportunities: nextEvents,
    },
    created,
    changed: true,
  };
};

export const buildEventLayerDigest = (runtime: CityRuntimeData, locationLabel: string): string => {
  const profile = resolveDistrictProfileById(runtime.currentDistrictId, locationLabel);
  const taskState = getDistrictTaskState(runtime, profile.id);
  const openEvents = listDistrictEventOpportunities(runtime, profile.id).filter(event => event.status === 'open');

  if (openEvents.length === 0) {
    if (taskState.opportunityWindows <= 0) {
      return `${profile.regionLabel}·${profile.districtLabel} 事件层静默；当前还没有可供 AI 自然引出的区域机会。`;
    }
    return `${profile.regionLabel}·${profile.districtLabel} 已开出 ${taskState.opportunityWindows} 个隐藏任务窗口，但当前还没有稳定登记到事件账本的区域机会。`;
  }

  const primary = openEvents[0];
  const secondary = openEvents.slice(1, 3).map(event => event.title).join(' / ');
  const routeText = primary.routeHint ? ` 接口=${primary.routeHint};` : '';
  const extraText = secondary ? ` 备选=${secondary};` : '';
  return `${profile.regionLabel}·${profile.districtLabel} 当前有 ${openEvents.length} 条隐含区域机会；主引子=「${primary.title}」 ${primary.teaser}${routeText}${extraText}`;
};

export const buildRecentEventSnapshot = (
  runtime: CityRuntimeData,
  locationLabel: string,
): Record<string, unknown> => {
  const profile = resolveDistrictProfileById(runtime.currentDistrictId, locationLabel);
  const recent = [...runtime.districtEventOpportunities]
    .sort((left, right) => right.openedAtMinutes - left.openedAtMinutes)
    .slice(0, 3);
  return {
    district_id: profile.id,
    district_label: profile.districtLabel,
    open_count: runtime.districtEventOpportunities.filter(event => event.status === 'open').length,
    current_open_count: listDistrictEventOpportunities(runtime, profile.id).filter(event => event.status === 'open').length,
    recent_titles: recent.map(event => event.title),
    recent_routes: recent.map(event => event.routeHint || ''),
  };
};
