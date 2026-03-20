import { CityRuntimeData, RuntimeTodoRecord, RuntimeTodoStatus } from '../types';

type LingnetTodoDraft = Omit<RuntimeTodoRecord, 'id' | 'unread'>;

const TODO_LIMIT = 120;
const MINUTES_PER_DAY = 24 * 60;
const TODO_GRACE_MINUTES = 120;

const normalizeKey = (value: string): string =>
  `${value || ''}`
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,!?;:'"`~()[\]{}<>《》【】「」『』，。！？；：、·\-_/\\]/g, '');

const clampMinutes = (value: number): number => Math.max(0, Math.round(value));

const extractTimeHint = (
  content: string,
  currentElapsedMinutes: number,
): { label: string | null; dueAtMinutes: number | null } => {
  const text = `${content || ''}`;

  if (/(今晚|今夜|夜里|晚点)/.test(text)) {
    return {
      label: '今晚',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + 3 * 60),
    };
  }
  if (/(明早|明晨|明天早上)/.test(text)) {
    return {
      label: '明早',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + MINUTES_PER_DAY + 10 * 60),
    };
  }
  if (/(明晚|明天晚上)/.test(text)) {
    return {
      label: '明晚',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + MINUTES_PER_DAY + 20 * 60),
    };
  }
  if (/(明天|次日)/.test(text)) {
    return {
      label: '明天',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + MINUTES_PER_DAY),
    };
  }
  if (/(周末|这周末|本周末)/.test(text)) {
    return {
      label: '周末',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + 3 * MINUTES_PER_DAY),
    };
  }
  if (/(下周)/.test(text)) {
    return {
      label: '下周',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + 7 * MINUTES_PER_DAY),
    };
  }
  if (/(稍后|晚些|回头|之后)/.test(text)) {
    return {
      label: '稍后',
      dueAtMinutes: clampMinutes(currentElapsedMinutes + 2 * 60),
    };
  }

  return { label: null, dueAtMinutes: null };
};

const COMMISSION_SUBJECT_KEYWORDS = [
  '夜莺制服',
  '空姐制服',
  '情趣内衣',
  '礼服',
  '西服',
  '西装',
  'JK',
  'jk',
  '丝袜',
  '制服',
  '衣服',
  '外套',
  '芯片',
  '药剂',
  '烟草',
  '香烟',
  '毒品',
  '样机',
  '配件',
];

const extractCommissionSubject = (content: string): string => {
  const matchedKeyword = COMMISSION_SUBJECT_KEYWORDS.find(keyword => content.includes(keyword));
  if (matchedKeyword) return matchedKeyword;

  const pairMatch = content.match(
    /(定制|帮我搞|帮我弄|帮我找|帮我订|给我做|给我留|代办|进货|弄一套|搞一套)(.{0,18}?)(制服|西服|西装|礼服|衣服|外套|芯片|药剂|烟草|毒品|样机|配件)/i,
  );
  if (pairMatch) {
    return `${pairMatch[2] || ''}${pairMatch[3] || ''}`.trim();
  }

  const genericMatch = content.match(/(定制|帮我搞|帮我弄|代办|进货|给我做)(.{1,20})/i);
  return genericMatch?.[2]?.trim() || '代办事项';
};

const inferCommissionRoute = (subject: string): string | null => {
  if (/(制服|西服|西装|礼服|衣服|外套|丝袜|jk|JK|内衣)/.test(subject)) return 'shop';
  if (/(芯片|样机|配件)/.test(subject)) return 'shop';
  if (/(药剂|烟草|香烟|毒品)/.test(subject)) return 'shop';
  return null;
};

const inferMeetingLabel = (content: string): string => {
  if (/(吃饭|约饭|晚饭|午饭|早饭|餐厅)/.test(content)) return '约饭';
  if (/(约会)/.test(content)) return '约会';
  if (/(喝咖啡|咖啡)/.test(content)) return '碰面';
  if (/(喝酒|酒吧)/.test(content)) return '夜聚';
  return '会面';
};

export const inferLingnetTodoFromMessage = (params: {
  npcId: string;
  npcName: string;
  npcLocation?: string;
  currentLocation: string;
  content: string;
  currentElapsedMinutes: number;
}): LingnetTodoDraft | null => {
  const content = params.content.trim();
  if (!content) return null;

  const timeHint = extractTimeHint(content, params.currentElapsedMinutes);
  const locationLabel = params.npcLocation?.trim() || params.currentLocation || '待定地点';

  const meetingRequested =
    /(吃饭|约饭|见面|约会|碰头|喝酒|喝咖啡|一起去|一起吃|一起坐坐)/.test(content) &&
    (timeHint.label !== null || /(餐厅|咖啡|酒吧|周末|明天|今晚|晚上|下午|中午|哪天|到时)/.test(content));

  if (meetingRequested) {
    const label = inferMeetingLabel(content);
    return {
      title: `${label}：${params.npcName}`,
      category: 'meeting',
      status: 'active',
      sourceType: 'lingnet',
      sourceId: params.npcId,
      locationLabel,
      dueAtMinutes: timeHint.dueAtMinutes,
      createdAtMinutes: params.currentElapsedMinutes,
      summary: timeHint.label
        ? `已通过灵网发出${label}请求，目标时间为${timeHint.label}。`
        : `已通过灵网发出${label}请求，等待后续确认时间。`,
      detail: `联系人：${params.npcName}\n地点参考：${locationLabel}\n原始内容：${content}`,
      routeHint: null,
    };
  }

  const commissionRequested =
    /(定制|帮我搞|帮我弄|帮我找|帮我订|给我做|给我留|代办|进货|弄一套|搞一套)/.test(content) &&
    /(制服|西服|西装|礼服|衣服|外套|芯片|药剂|烟草|香烟|毒品|样机|配件|丝袜|JK|jk)/.test(content);

  if (commissionRequested) {
    const subject = extractCommissionSubject(content);
    return {
      title: `委托：${subject}`,
      category: 'commission',
      status: 'active',
      sourceType: 'lingnet',
      sourceId: params.npcId,
      locationLabel,
      dueAtMinutes: timeHint.dueAtMinutes,
      createdAtMinutes: params.currentElapsedMinutes,
      summary: timeHint.label
        ? `已向 ${params.npcName} 发出代办请求，目标时段为${timeHint.label}。`
        : `已向 ${params.npcName} 发出代办请求，等待对方确认渠道。`,
      detail: `委托对象：${params.npcName}\n委托内容：${subject}\n地点参考：${locationLabel}\n原始内容：${content}`,
      routeHint: inferCommissionRoute(subject),
    };
  }

  const pickupRequested = /(取货|拿货|提货|收货|到货)/.test(content);
  if (pickupRequested) {
    return {
      title: `取货：${params.npcName}`,
      category: 'pickup',
      status: 'active',
      sourceType: 'lingnet',
      sourceId: params.npcId,
      locationLabel,
      dueAtMinutes: timeHint.dueAtMinutes,
      createdAtMinutes: params.currentElapsedMinutes,
      summary: timeHint.label
        ? `已通过灵网确认取货安排，建议在${timeHint.label}前处理。`
        : '已通过灵网提及取货安排，等待具体窗口期。',
      detail: `联系人：${params.npcName}\n地点参考：${locationLabel}\n原始内容：${content}`,
      routeHint: null,
    };
  }

  return null;
};

export const upsertRuntimeTodo = (
  runtime: CityRuntimeData,
  draft: LingnetTodoDraft,
): { runtime: CityRuntimeData; todo: RuntimeTodoRecord; created: boolean } => {
  const matchIndex = runtime.todos.findIndex(
    todo =>
      todo.sourceType === draft.sourceType &&
      todo.sourceId === draft.sourceId &&
      todo.status !== 'completed' &&
      todo.status !== 'failed' &&
      todo.status !== 'cancelled' &&
      normalizeKey(todo.title) === normalizeKey(draft.title),
  );

  if (matchIndex >= 0) {
    const nextTodo: RuntimeTodoRecord = {
      ...runtime.todos[matchIndex],
      ...draft,
      unread: true,
    };
    const nextTodos = runtime.todos.map((todo, index) => (index === matchIndex ? nextTodo : todo));
    return {
      runtime: {
        ...runtime,
        todos: nextTodos.slice(0, TODO_LIMIT),
      },
      todo: nextTodo,
      created: false,
    };
  }

  const nextTodo: RuntimeTodoRecord = {
    id: `todo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...draft,
    unread: true,
    timelineState: draft.dueAtMinutes === null ? undefined : draft.dueAtMinutes <= draft.createdAtMinutes ? 'due' : 'upcoming',
  };

  return {
    runtime: {
      ...runtime,
      todos: [nextTodo, ...runtime.todos].slice(0, TODO_LIMIT),
    },
    todo: nextTodo,
    created: true,
  };
};

export const markTodoRead = (runtime: CityRuntimeData, todoId: string): CityRuntimeData => ({
  ...runtime,
  todos: runtime.todos.map(todo => (todo.id === todoId ? { ...todo, unread: false } : todo)),
});

export const markAllTodosRead = (runtime: CityRuntimeData): CityRuntimeData => ({
  ...runtime,
  todos: runtime.todos.map(todo => ({ ...todo, unread: false })),
});

export const updateTodoStatus = (
  runtime: CityRuntimeData,
  todoId: string,
  status: RuntimeTodoStatus,
): CityRuntimeData => ({
  ...runtime,
  todos: runtime.todos.map(todo => (todo.id === todoId ? { ...todo, status, unread: false } : todo)),
});

export const buildTodoDigest = (todos: RuntimeTodoRecord[]): string => {
  const activeTodos = todos.filter(todo => todo.status === 'active' || todo.status === 'ready').slice(0, 3);
  if (activeTodos.length === 0) return '';
  return activeTodos.map(todo => `${todo.title}@${todo.locationLabel}`).join(' | ');
};

export const buildDueTodoDigest = (todos: RuntimeTodoRecord[]): string => {
  const dueTodos = todos.filter(todo => todo.status === 'ready').slice(0, 3);
  if (dueTodos.length === 0) return '';
  return dueTodos.map(todo => `${todo.title}@${todo.locationLabel}`).join(' | ');
};

export const buildOverdueTodoDigest = (todos: RuntimeTodoRecord[]): string => {
  const missedTodos = todos.filter(todo => todo.status === 'failed').slice(0, 3);
  if (missedTodos.length === 0) return '';
  return missedTodos.map(todo => `${todo.title}@${todo.locationLabel}`).join(' | ');
};

type TodoTimelineEvent = {
  todo: RuntimeTodoRecord;
  event: 'due' | 'missed';
};

export const advanceRuntimeTodoTimeline = (
  runtime: CityRuntimeData,
  currentElapsedMinutes: number,
): { runtime: CityRuntimeData; events: TodoTimelineEvent[]; changed: boolean } => {
  const events: TodoTimelineEvent[] = [];
  let changed = false;

  const todos = runtime.todos.map(todo => {
    if (todo.status === 'completed' || todo.status === 'cancelled' || todo.dueAtMinutes === null) {
      return todo;
    }

    if ((todo.status === 'active' || todo.status === 'ready') && currentElapsedMinutes >= todo.dueAtMinutes + TODO_GRACE_MINUTES) {
      if (todo.status !== 'failed' || todo.timelineState !== 'missed') {
        changed = true;
        const nextTodo = { ...todo, status: 'failed' as const, unread: true, timelineState: 'missed' as const };
        events.push({ todo: nextTodo, event: 'missed' });
        return nextTodo;
      }
      return todo;
    }

    if (todo.status === 'active' && currentElapsedMinutes >= todo.dueAtMinutes) {
      changed = true;
      const nextTodo = { ...todo, status: 'ready' as const, unread: true, timelineState: 'due' as const };
      events.push({ todo: nextTodo, event: 'due' });
      return nextTodo;
    }

    if (todo.timelineState !== 'upcoming' && currentElapsedMinutes < todo.dueAtMinutes) {
      changed = true;
      return { ...todo, timelineState: 'upcoming' as const };
    }

    return todo;
  });

  return {
    runtime: changed ? { ...runtime, todos } : runtime,
    events,
    changed,
  };
};
