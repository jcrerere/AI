import { Message } from '../types';
import { hasPseudoLayer } from './pseudoLayer';

type TavernChatMessage = {
  message_id: number;
  name?: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden?: boolean;
  message: string;
};

type GetChatMessagesFn = (
  range: string | number,
  option?: {
    role?: 'all' | 'system' | 'assistant' | 'user';
    hide_state?: 'all' | 'hidden' | 'unhidden';
  },
) => TavernChatMessage[];

type CreateChatMessagesFn = (
  chat_messages: Array<{
    name?: string;
    role: 'system' | 'assistant' | 'user';
    is_hidden?: boolean;
    message: string;
    data?: Record<string, any>;
    extra?: Record<string, any>;
  }>,
  option?: {
    insert_before?: number | 'end';
    refresh?: 'none' | 'affected' | 'all';
  },
) => Promise<void>;

type SetChatMessagesFn = (
  chat_messages: Array<{
    message_id: number;
    message?: string;
    is_hidden?: boolean;
    data?: Record<string, any>;
    extra?: Record<string, any>;
  }>,
  option?: {
    refresh?: 'none' | 'affected' | 'all';
  },
) => Promise<void>;

type DeleteChatMessagesFn = (
  message_ids: number[],
  option?: {
    refresh?: 'none' | 'affected' | 'all';
  },
) => Promise<void>;

type GetLastMessageIdFn = () => number;

export interface TavernChatBridge {
  getLastMessageId: GetLastMessageIdFn | null;
  getChatMessages: GetChatMessagesFn | null;
  createChatMessages: CreateChatMessagesFn | null;
  setChatMessages: SetChatMessagesFn | null;
  deleteChatMessages: DeleteChatMessagesFn | null;
}

const bindHostFunction = <T extends (...args: any[]) => any>(host: unknown, key: string): T | null => {
  if (!host || (typeof host !== 'object' && typeof host !== 'function')) return null;
  const record = host as Record<string, unknown>;
  const fn = record[key];
  if (typeof fn !== 'function') return null;
  return (fn as (...args: any[]) => any).bind(host) as T;
};

const readParentRuntime = (): unknown => {
  try {
    return (globalThis as { parent?: unknown }).parent;
  } catch {
    return undefined;
  }
};

const readLooseGlobalValue = <T,>(name: string): T | null => {
  const runtime = globalThis as Record<string, unknown>;
  const direct = runtime[name];
  if (direct !== undefined) return direct as T;
  try {
    const resolved = Function(`return typeof ${name} !== 'undefined' ? ${name} : null;`)();
    return (resolved ?? null) as T | null;
  } catch {
    return null;
  }
};

const readLooseGlobalFunction = <T extends (...args: any[]) => any>(name: string): T | null => {
  const resolved = readLooseGlobalValue<unknown>(name);
  return typeof resolved === 'function' ? (resolved as T) : null;
};

const FRONTEND_LOADER_PATTERN = /<body>[\s\S]*?\$\(?'body'?\)?\.load\([\s\S]*?dist\/LN\/index\.html/i;

export const isFrontendLoaderMessage = (content: string): boolean => FRONTEND_LOADER_PATTERN.test(content || '');

export const resolveTavernChatBridge = (): TavernChatBridge => {
  const runtime = globalThis as Record<string, unknown>;
  const parentRuntime = readParentRuntime() as Record<string, unknown> | undefined;
  const directTavernHelper = readLooseGlobalValue<unknown>('TavernHelper');

  return {
    getLastMessageId:
      readLooseGlobalFunction<GetLastMessageIdFn>('getLastMessageId')
      || bindHostFunction<GetLastMessageIdFn>(runtime, 'getLastMessageId')
      || bindHostFunction<GetLastMessageIdFn>(directTavernHelper, 'getLastMessageId')
      || bindHostFunction<GetLastMessageIdFn>(runtime.TavernHelper, 'getLastMessageId')
      || bindHostFunction<GetLastMessageIdFn>(parentRuntime, 'getLastMessageId')
      || bindHostFunction<GetLastMessageIdFn>(parentRuntime?.TavernHelper, 'getLastMessageId'),
    getChatMessages:
      readLooseGlobalFunction<GetChatMessagesFn>('getChatMessages')
      || bindHostFunction<GetChatMessagesFn>(runtime, 'getChatMessages')
      || bindHostFunction<GetChatMessagesFn>(directTavernHelper, 'getChatMessages')
      || bindHostFunction<GetChatMessagesFn>(runtime.TavernHelper, 'getChatMessages')
      || bindHostFunction<GetChatMessagesFn>(parentRuntime, 'getChatMessages')
      || bindHostFunction<GetChatMessagesFn>(parentRuntime?.TavernHelper, 'getChatMessages'),
    createChatMessages:
      readLooseGlobalFunction<CreateChatMessagesFn>('createChatMessages')
      || bindHostFunction<CreateChatMessagesFn>(runtime, 'createChatMessages')
      || bindHostFunction<CreateChatMessagesFn>(directTavernHelper, 'createChatMessages')
      || bindHostFunction<CreateChatMessagesFn>(runtime.TavernHelper, 'createChatMessages')
      || bindHostFunction<CreateChatMessagesFn>(parentRuntime, 'createChatMessages')
      || bindHostFunction<CreateChatMessagesFn>(parentRuntime?.TavernHelper, 'createChatMessages'),
    setChatMessages:
      readLooseGlobalFunction<SetChatMessagesFn>('setChatMessages')
      || bindHostFunction<SetChatMessagesFn>(runtime, 'setChatMessages')
      || bindHostFunction<SetChatMessagesFn>(directTavernHelper, 'setChatMessages')
      || bindHostFunction<SetChatMessagesFn>(runtime.TavernHelper, 'setChatMessages')
      || bindHostFunction<SetChatMessagesFn>(parentRuntime, 'setChatMessages')
      || bindHostFunction<SetChatMessagesFn>(parentRuntime?.TavernHelper, 'setChatMessages'),
    deleteChatMessages:
      readLooseGlobalFunction<DeleteChatMessagesFn>('deleteChatMessages')
      || bindHostFunction<DeleteChatMessagesFn>(runtime, 'deleteChatMessages')
      || bindHostFunction<DeleteChatMessagesFn>(directTavernHelper, 'deleteChatMessages')
      || bindHostFunction<DeleteChatMessagesFn>(runtime.TavernHelper, 'deleteChatMessages')
      || bindHostFunction<DeleteChatMessagesFn>(parentRuntime, 'deleteChatMessages')
      || bindHostFunction<DeleteChatMessagesFn>(parentRuntime?.TavernHelper, 'deleteChatMessages'),
  };
};

const mapChatMessageToInternal = (message: TavernChatMessage): Message | null => {
  const content = String(message.message || '');
  if (isFrontendLoaderMessage(content)) return null;
  if (message.role !== 'user' && !hasPseudoLayer(content)) return null;

  return {
    id: `chat_${message.message_id}`,
    chatMessageId: message.message_id,
    sender: message.role === 'user' ? 'Player' : 'System',
    name: message.role === 'user' ? undefined : message.name,
    content,
    timestamp: `${message.message_id}`,
    type: message.role === 'user' ? 'action' : 'narrative',
  };
};

export const pullPseudoLayerMessagesFromTavern = (): Message[] | null => {
  const bridge = resolveTavernChatBridge();
  if (typeof bridge.getLastMessageId !== 'function' || typeof bridge.getChatMessages !== 'function') {
    return null;
  }

  let lastMessageId = -1;
  try {
    lastMessageId = bridge.getLastMessageId();
  } catch {
    return null;
  }

  if (!Number.isFinite(lastMessageId) || lastMessageId < 0) {
    return [];
  }

  try {
    const chatMessages = bridge.getChatMessages(`0-${lastMessageId}`, {
      role: 'all',
      hide_state: 'all',
    });
    return chatMessages
      .map(mapChatMessageToInternal)
      .filter((message): message is Message => !!message);
  } catch {
    return null;
  }
};
