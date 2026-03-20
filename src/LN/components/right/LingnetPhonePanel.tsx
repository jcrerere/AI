import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { FinanceLedgerEntry, NPC, SocialPlatform } from '../../types';
import NpcCodexPanel from './NpcCodexPanel';
import { BookOpen, Import, MessageCircle, Search, Send, Sparkles, Wallet } from 'lucide-react';
import { resolveLocationJurisdiction } from '../../utils/locationJurisdiction';
import { resolveLocationVisualTheme } from '../../utils/locationTheme';
import { useCompactViewport } from '../../hooks/useCompactViewport';

export interface SocialImportDraft {
  targetNpcId: string;
  localName: string;
  socialHandle: string;
  socialBio: string;
  gender: NPC['gender'];
  platform: SocialPlatform;
  originalAuthorName: string;
  originalAuthorHandle: string;
  profileUrl: string;
  postUrl: string;
  imageUrl: string;
  caption: string;
  visibility: 'public' | 'premium';
  unlockPrice: number;
  note: string;
}

interface SocialSpendPayload {
  npcId: string;
  amount: number;
  kind: 'transfer' | 'tip' | 'unlock';
  note?: string;
  postId?: string;
}

interface Props {
  npcs: NPC[];
  playerName: string;
  playerCredits: number;
  currentLocation: string;
  financeLedger: FinanceLedgerEntry[];
  walletSummary: {
    cycleLabel: string;
    currentTaxDue: number;
    taxArrears: number;
    settlementExposure: number;
  };
  onToggleFollow: (npcId: string) => void;
  onAddComment: (npcId: string, postId: string, content: string) => void;
  onSendDm: (npcId: string, content: string) => void;
  onSpendOnNpc: (payload: SocialSpendPayload) => { ok: boolean; message?: string };
  onPurchaseDarknetService: (payload: { npcId: string; serviceId: string }) => { ok: boolean; message?: string };
  onImportPost: (payload: SocialImportDraft) => void;
}

type PhoneView = 'lingnet' | 'darknet' | 'dm' | 'wallet' | 'import';
type LingnetMode = 'feed' | 'discover' | 'profile';

type PaymentDraft = {
  npcId: string;
  postId?: string;
  kind: 'transfer' | 'tip' | 'unlock';
  amount: string;
  note: string;
};

type FeedbackTone = 'info' | 'success' | 'warn';

type UiFeedback = {
  id: number;
  title: string;
  detail: string;
  tone: FeedbackTone;
  accent: PhoneView;
};

type PhoneTheme = {
  shell: string;
  headerKicker: string;
  headerDescription: string;
  modeLabel: string;
  navWrap: string;
  navActive: string;
  navIdle: string;
  walletPanel: string;
  walletLabel: string;
  chipClass: string;
  dotClass: string;
  sweepClass: string;
  sceneClass: string;
};

const PLATFORM_OPTIONS: Array<{ value: SocialPlatform; label: string }> = [
  { value: 'native', label: '灵网原生' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'x', label: 'X / Twitter' },
  { value: 'rednote', label: '小红书' },
  { value: 'custom', label: '自定义来源' },
];

const normalizeHandle = (value: string): string => {
  const text = value.trim().replace(/\s+/g, '');
  return text ? (text.startsWith('@') ? text : `@${text}`) : '';
};

const formatTime = (timestamp: string): string => {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return timestamp || '刚刚';
  const diff = Date.now() - ms;
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} 分钟前`;
  if (diff < 86_400_000) return `${Math.max(1, Math.floor(diff / 3_600_000))} 小时前`;
  return `${Math.max(1, Math.floor(diff / 86_400_000))} 天前`;
};

const socialHandleOf = (npc: NPC): string => {
  if (npc.socialHandle?.trim()) return normalizeHandle(npc.socialHandle);
  const seed = `${npc.name || npc.id || 'guest'}`.replace(/[^\w\u4e00-\u9fa5]+/g, '').toLowerCase();
  return `@${seed || 'guest'}`;
};

const isMutualFollow = (npc: NPC): boolean => !!npc.playerFollows && !!npc.followsPlayer;

const PHONE_VIEW_LABELS: Record<PhoneView, string> = {
  lingnet: '灵网',
  darknet: '暗网',
  dm: '私信',
  wallet: '钱包',
  import: '导入',
};

const LINGNET_MODE_LABELS: Record<LingnetMode, string> = {
  feed: '动态',
  discover: '发现',
  profile: '主页',
};

const PHONE_THEMES: Record<PhoneView, PhoneTheme> = {
  lingnet: {
    shell:
      'border-cyan-400/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_32%),radial-gradient(circle_at_85%_0%,rgba(244,114,182,0.14),_transparent_24%),linear-gradient(180deg,rgba(6,10,18,0.98),rgba(4,6,12,0.98))]',
    headerKicker: '社交回路在线',
    headerDescription: '灵网负责内容流、主页浏览和轻互动。',
    modeLabel: 'Social Feed',
    navWrap: 'bg-[#070d16]/70 border-white/5',
    navActive: 'bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.12)]',
    navIdle: 'text-slate-400 hover:text-cyan-100',
    walletPanel: 'border-cyan-400/20 bg-cyan-500/10',
    walletLabel: 'text-cyan-200/80',
    chipClass: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-50',
    dotClass: 'ln-dot-cyan',
    sweepClass: 'ln-sweep-cyan',
    sceneClass: 'slide-in-from-left-2 duration-500',
  },
  darknet: {
    shell:
      'border-emerald-500/18 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_24%),linear-gradient(180deg,rgba(5,10,8,0.98),rgba(2,5,4,0.98)),repeating-linear-gradient(180deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_9px)]',
    headerKicker: '受限终端接管',
    headerDescription: '暗网负责人物志、节点画像与黑市记录。',
    modeLabel: 'Restricted Node',
    navWrap: 'bg-[#07110e]/80 border-emerald-500/10',
    navActive: 'bg-emerald-300 text-black shadow-[0_0_24px_rgba(16,185,129,0.2)]',
    navIdle: 'text-slate-400 hover:text-emerald-200',
    walletPanel: 'border-emerald-500/20 bg-emerald-500/10',
    walletLabel: 'text-emerald-200/80',
    chipClass: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-50',
    dotClass: 'ln-dot-emerald',
    sweepClass: 'ln-sweep-emerald',
    sceneClass: 'slide-in-from-right-4 duration-500',
  },
  dm: {
    shell:
      'border-fuchsia-400/18 bg-[radial-gradient(circle_at_top,_rgba(192,38,211,0.18),_transparent_30%),linear-gradient(180deg,rgba(13,7,20,0.98),rgba(7,5,12,0.98))]',
    headerKicker: '私信链路',
    headerDescription: '私信更像近距离联系，不展示公开流。',
    modeLabel: 'Private Relay',
    navWrap: 'bg-[#140918]/75 border-white/5',
    navActive: 'bg-fuchsia-200 text-black shadow-[0_0_24px_rgba(217,70,239,0.2)]',
    navIdle: 'text-slate-400 hover:text-fuchsia-100',
    walletPanel: 'border-fuchsia-400/20 bg-fuchsia-500/10',
    walletLabel: 'text-fuchsia-100/80',
    chipClass: 'border-fuchsia-400/20 bg-fuchsia-500/10 text-fuchsia-50',
    dotClass: 'ln-dot-fuchsia',
    sweepClass: 'ln-sweep-fuchsia',
    sceneClass: 'slide-in-from-bottom-2 duration-500',
  },
  wallet: {
    shell:
      'border-amber-400/18 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.16),_transparent_28%),linear-gradient(180deg,rgba(18,11,5,0.98),rgba(10,7,4,0.98))]',
    headerKicker: '资金结算层',
    headerDescription: '钱包偏结果面板，优先看额度、锁定项和交易。',
    modeLabel: 'Settlement',
    navWrap: 'bg-[#151008]/75 border-white/5',
    navActive: 'bg-amber-200 text-black shadow-[0_0_24px_rgba(245,158,11,0.18)]',
    navIdle: 'text-slate-400 hover:text-amber-100',
    walletPanel: 'border-amber-400/20 bg-amber-500/10',
    walletLabel: 'text-amber-100/80',
    chipClass: 'border-amber-400/20 bg-amber-500/10 text-amber-50',
    dotClass: 'ln-dot-amber',
    sweepClass: 'ln-sweep-amber',
    sceneClass: 'slide-in-from-top-2 duration-500',
  },
  import: {
    shell:
      'border-sky-400/18 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,rgba(6,12,18,0.98),rgba(4,7,12,0.98))]',
    headerKicker: '导入映射层',
    headerDescription: '导入只做采样和本土化，不直接保留外部平台逻辑。',
    modeLabel: 'Mapping Desk',
    navWrap: 'bg-[#08111a]/75 border-white/5',
    navActive: 'bg-sky-200 text-black shadow-[0_0_24px_rgba(56,189,248,0.18)]',
    navIdle: 'text-slate-400 hover:text-sky-100',
    walletPanel: 'border-sky-400/20 bg-sky-500/10',
    walletLabel: 'text-sky-100/80',
    chipClass: 'border-sky-400/20 bg-sky-500/10 text-sky-50',
    dotClass: 'ln-dot-sky',
    sweepClass: 'ln-sweep-sky',
    sceneClass: 'zoom-in-95 duration-500',
  },
};

const FEED_BATCH_SIZE = 6;
const DISCOVER_BATCH_SIZE = 8;
const PROFILE_POST_BATCH_SIZE = 4;
const DM_THREAD_BATCH_SIZE = 10;
const DM_MESSAGE_BATCH_SIZE = 16;
const PAYMENT_BATCH_SIZE = 8;

const JURISDICTION_TONE_CLASS = {
  cyan: 'border-cyan-400/12 bg-cyan-500/6 text-cyan-100',
  emerald: 'border-emerald-500/12 bg-emerald-500/8 text-emerald-100',
  amber: 'border-amber-400/12 bg-amber-500/8 text-amber-100',
  fuchsia: 'border-fuchsia-400/12 bg-fuchsia-500/8 text-fuchsia-100',
  slate: 'border-white/10 bg-white/[0.03] text-slate-100',
} as const;

const PHONE_TABS: Array<{ id: PhoneView; label: string; icon: React.ReactNode }> = [
  { id: 'lingnet', label: '灵网', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'darknet', label: '暗网', icon: <BookOpen className="w-3.5 h-3.5" /> },
  { id: 'dm', label: '私信', icon: <MessageCircle className="w-3.5 h-3.5" /> },
  { id: 'wallet', label: '钱包', icon: <Wallet className="w-3.5 h-3.5" /> },
  { id: 'import', label: '导入', icon: <Import className="w-3.5 h-3.5" /> },
];

const LingnetPhonePanel: React.FC<Props> = ({
  npcs,
  playerName,
  playerCredits,
  currentLocation,
  financeLedger,
  walletSummary,
  onToggleFollow,
  onAddComment,
  onSendDm,
  onSpendOnNpc,
  onPurchaseDarknetService,
  onImportPost,
}) => {
  const [activeView, setActiveView] = useState<PhoneView>('lingnet');
  const [lingnetMode, setLingnetMode] = useState<LingnetMode>('feed');
  const [motionMode, setMotionMode] = useState<'full' | 'lite'>(() => {
    if (typeof window === 'undefined') return 'full';
    try {
      const savedMode = window.localStorage.getItem('ln-phone-motion-mode');
      if (savedMode === 'full' || savedMode === 'lite') return savedMode;
      return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'lite' : 'full';
    } catch {
      return 'full';
    }
  });
  const [selectedNpcId, setSelectedNpcId] = useState('');
  const [selectedThreadNpcId, setSelectedThreadNpcId] = useState('');
  const [selectedDarknetNpcId, setSelectedDarknetNpcId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [dmDraft, setDmDraft] = useState('');
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [uiFeedback, setUiFeedback] = useState<UiFeedback | null>(null);
  const [visibleFeedCount, setVisibleFeedCount] = useState(FEED_BATCH_SIZE);
  const [visibleDiscoverCount, setVisibleDiscoverCount] = useState(DISCOVER_BATCH_SIZE);
  const [visibleProfilePostCount, setVisibleProfilePostCount] = useState(PROFILE_POST_BATCH_SIZE);
  const [visibleDmThreadCount, setVisibleDmThreadCount] = useState(DM_THREAD_BATCH_SIZE);
  const [visibleDmMessageCount, setVisibleDmMessageCount] = useState(DM_MESSAGE_BATCH_SIZE);
  const [visiblePaymentCount, setVisiblePaymentCount] = useState(PAYMENT_BATCH_SIZE);
  const [importDraft, setImportDraft] = useState<SocialImportDraft>({
    targetNpcId: '__new__',
    localName: '',
    socialHandle: '',
    socialBio: '',
    gender: 'female',
    platform: 'instagram',
    originalAuthorName: '',
    originalAuthorHandle: '',
    profileUrl: '',
    postUrl: '',
    imageUrl: '',
    caption: '',
    visibility: 'public',
    unlockPrice: 88,
    note: '',
  });
  const isCompactViewport = useCompactViewport();
  const deferredKeyword = useDeferredValue(keyword);

  const socialAccounts = useMemo(
    () => {
      if (activeView === 'darknet') return [];
      return npcs.filter(
        npc =>
          npc.socialFeed.length > 0 ||
          !!npc.socialHandle ||
          !!npc.socialBio ||
          (npc.dmThread || []).length > 0 ||
          npc.playerFollows ||
          npc.followsPlayer,
      );
    },
    [activeView, npcs],
  );

  const filteredAccounts = useMemo(() => {
    if (activeView !== 'lingnet') return socialAccounts;
    const search = deferredKeyword.trim().toLowerCase();
    if (!search) return socialAccounts;
    return socialAccounts.filter(npc =>
      `${npc.name} ${socialHandleOf(npc)} ${npc.affiliation} ${npc.position} ${npc.socialBio || ''}`
        .toLowerCase()
        .includes(search),
    );
  }, [activeView, deferredKeyword, socialAccounts]);

  const feedEntries = useMemo(
    () => {
      if (activeView !== 'lingnet' || lingnetMode === 'profile') return [];
      return filteredAccounts
        .flatMap(npc => npc.socialFeed.map(post => ({ npc, post, sortKey: Date.parse(post.timestamp) || 0 })))
        .sort((a, b) => b.sortKey - a.sortKey || b.post.id.localeCompare(a.post.id));
    },
    [activeView, filteredAccounts, lingnetMode],
  );

  const dmAccounts = useMemo(
    () => {
      if (activeView !== 'dm') return [];
      return socialAccounts.filter(npc => isMutualFollow(npc) || (npc.dmThread || []).length > 0);
    },
    [activeView, socialAccounts],
  );
  const paymentEntries = useMemo(
    () => {
      if (activeView !== 'wallet') return [];
      return socialAccounts
        .flatMap(npc => (npc.dmThread || []).filter(item => !!item.amount).map(item => ({ npc, item })))
        .sort((a, b) => (Date.parse(b.item.timestamp) || 0) - (Date.parse(a.item.timestamp) || 0));
    },
    [activeView, socialAccounts],
  );
  const ledgerEntries = useMemo(
    () => {
      if (activeView !== 'wallet') return [];
      return [...financeLedger].sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
    },
    [activeView, financeLedger],
  );
  const activeProfileNpc = useMemo(
    () => socialAccounts.find(npc => npc.id === selectedNpcId) || socialAccounts[0] || null,
    [selectedNpcId, socialAccounts],
  );
  const activeDmNpc = useMemo(
    () => dmAccounts.find(npc => npc.id === selectedThreadNpcId) || dmAccounts[0] || null,
    [dmAccounts, selectedThreadNpcId],
  );
  const phoneTheme = PHONE_THEMES[activeView];
  const jurisdiction = useMemo(() => resolveLocationJurisdiction(currentLocation), [currentLocation]);
  const locationVisualTheme = useMemo(() => resolveLocationVisualTheme(currentLocation), [currentLocation]);
  const reduceMotion = motionMode === 'lite';
  const phoneContentInsetStyle = isCompactViewport
    ? ({ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' } as const)
    : undefined;
  const resolveBatchSize = (base: number, compact: number, lite = compact) => {
    if (isCompactViewport) return compact;
    if (reduceMotion) return lite;
    return base;
  };
  const feedBatchSize = resolveBatchSize(FEED_BATCH_SIZE, 4, 5);
  const discoverBatchSize = resolveBatchSize(DISCOVER_BATCH_SIZE, 6, 7);
  const profilePostBatchSize = resolveBatchSize(PROFILE_POST_BATCH_SIZE, 3);
  const dmThreadBatchSize = resolveBatchSize(DM_THREAD_BATCH_SIZE, 8);
  const dmMessageBatchSize = resolveBatchSize(DM_MESSAGE_BATCH_SIZE, 10, 12);
  const paymentBatchSize = resolveBatchSize(PAYMENT_BATCH_SIZE, 6);
  const previewCommentLimit = isCompactViewport ? 2 : 3;
  const lingnetStats = useMemo(
    () => ({
      accounts: socialAccounts.length,
      posts: socialAccounts.reduce((sum, npc) => sum + npc.socialFeed.length, 0),
      mutuals: socialAccounts.filter(npc => isMutualFollow(npc)).length,
    }),
    [socialAccounts],
  );
  const lockedPremiumCount = useMemo(
    () =>
      socialAccounts.reduce(
        (sum, npc) =>
          sum + npc.socialFeed.filter(post => post.visibility === 'premium' && !post.unlockedByPlayer).length,
        0,
      ),
    [socialAccounts],
  );
  const transactionVolume = useMemo(
    () => ledgerEntries.reduce((sum, entry) => sum + Math.abs(Number(entry.amount || 0)), 0),
    [ledgerEntries],
  );
  const recentNetFlow = useMemo(
    () => ledgerEntries.slice(0, 12).reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [ledgerEntries],
  );
  const visibleFeedEntries = useMemo(() => feedEntries.slice(0, visibleFeedCount), [feedEntries, visibleFeedCount]);
  const visibleDiscoverEntries = useMemo(
    () => filteredAccounts.slice(0, visibleDiscoverCount),
    [filteredAccounts, visibleDiscoverCount],
  );
  const visibleProfilePosts = useMemo(
    () => (activeProfileNpc?.socialFeed || []).slice(0, visibleProfilePostCount),
    [activeProfileNpc, visibleProfilePostCount],
  );
  const visibleDmAccounts = useMemo(
    () => dmAccounts.slice(0, visibleDmThreadCount),
    [dmAccounts, visibleDmThreadCount],
  );
  const visibleDmMessages = useMemo(
    () => (activeDmNpc?.dmThread || []).slice(-visibleDmMessageCount),
    [activeDmNpc, visibleDmMessageCount],
  );
  const visibleLedgerEntries = useMemo(
    () => ledgerEntries.slice(0, visiblePaymentCount),
    [ledgerEntries, visiblePaymentCount],
  );
  const getStaggerStyle = (index: number, step = 55): React.CSSProperties => ({
    animationDelay: reduceMotion ? '0ms' : `${Math.min(index * step, 440)}ms`,
  });
  const feedbackToneClass =
    uiFeedback?.tone === 'success'
      ? 'border-emerald-300/25 bg-emerald-500/14'
      : uiFeedback?.tone === 'warn'
        ? 'border-amber-300/25 bg-amber-500/14'
        : 'border-white/12 bg-white/8';
  const feedbackDotClass =
    uiFeedback?.tone === 'success'
      ? 'bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.55)]'
      : uiFeedback?.tone === 'warn'
        ? 'bg-amber-300 shadow-[0_0_14px_rgba(252,211,77,0.45)]'
        : 'bg-cyan-200 shadow-[0_0_14px_rgba(103,232,249,0.45)]';
  const feedbackFlashClass =
    uiFeedback?.accent === 'darknet'
      ? 'ln-flash-emerald'
      : uiFeedback?.accent === 'dm'
        ? 'ln-flash-fuchsia'
        : uiFeedback?.accent === 'wallet'
          ? 'ln-flash-amber'
          : uiFeedback?.accent === 'import'
            ? 'ln-flash-sky'
            : 'ln-flash-cyan';

  useEffect(() => {
    if (!selectedNpcId && socialAccounts[0]) setSelectedNpcId(socialAccounts[0].id);
  }, [selectedNpcId, socialAccounts]);

  useEffect(() => {
    if (!selectedThreadNpcId && dmAccounts[0]) setSelectedThreadNpcId(dmAccounts[0].id);
  }, [dmAccounts, selectedThreadNpcId]);

  useEffect(() => {
    if (!uiFeedback) return undefined;
    const timer = window.setTimeout(() => {
      setUiFeedback(current => (current?.id === uiFeedback.id ? null : current));
    }, 2400);
    return () => window.clearTimeout(timer);
  }, [uiFeedback]);

  useEffect(() => {
    try {
      window.localStorage.setItem('ln-phone-motion-mode', motionMode);
    } catch {
      // ignore storage write failures in embedded contexts
    }
  }, [motionMode]);

  useEffect(() => {
    setVisibleFeedCount(feedBatchSize);
  }, [deferredKeyword, feedBatchSize, feedEntries.length]);

  useEffect(() => {
    setVisibleDiscoverCount(discoverBatchSize);
  }, [deferredKeyword, discoverBatchSize, filteredAccounts.length]);

  useEffect(() => {
    setVisibleProfilePostCount(profilePostBatchSize);
  }, [activeProfileNpc?.id, profilePostBatchSize]);

  useEffect(() => {
    setVisibleDmThreadCount(dmThreadBatchSize);
  }, [dmAccounts.length, dmThreadBatchSize]);

  useEffect(() => {
    setVisibleDmMessageCount(dmMessageBatchSize);
  }, [activeDmNpc?.id, activeDmNpc?.dmThread?.length, dmMessageBatchSize]);

  useEffect(() => {
    setVisiblePaymentCount(paymentBatchSize);
  }, [ledgerEntries.length, paymentBatchSize]);

  const pushFeedback = (title: string, detail: string, tone: FeedbackTone = 'info', accent: PhoneView = activeView) => {
    setUiFeedback({
      id: Date.now() + Math.random(),
      title,
      detail,
      tone,
      accent,
    });
  };

  const switchView = (
    view: PhoneView,
    options?: {
      silent?: boolean;
      title?: string;
      detail?: string;
      tone?: FeedbackTone;
      accent?: PhoneView;
    },
  ) => {
    setActiveView(view);
    if (options?.silent) return;
    pushFeedback(
      options?.title || `已切换到${PHONE_VIEW_LABELS[view]}`,
      options?.detail || `当前模块：${PHONE_THEMES[view].modeLabel}`,
      options?.tone || 'info',
      options?.accent || view,
    );
  };

  const switchLingnetMode = (
    mode: LingnetMode,
    options?: {
      silent?: boolean;
      title?: string;
      detail?: string;
      tone?: FeedbackTone;
    },
  ) => {
    setLingnetMode(mode);
    if (options?.silent) return;
    pushFeedback(
      options?.title || `已切换到${LINGNET_MODE_LABELS[mode]}`,
      options?.detail || '灵网视图已更新',
      options?.tone || (mode === 'profile' ? 'success' : 'info'),
      'lingnet',
    );
  };

  const openProfile = (npcId: string) => {
    const npc = socialAccounts.find(item => item.id === npcId);
    setSelectedNpcId(npcId);
    switchView('lingnet', { silent: true });
    switchLingnetMode('profile', {
      title: npc ? `已打开 ${npc.name} 主页` : '已打开灵网主页',
      detail: '可继续查看动态、转账或跳转暗网',
      tone: 'success',
    });
  };

  const openDarknetProfile = (npc: NPC) => {
    setSelectedDarknetNpcId(npc.id);
    switchView('darknet', {
      title: `已打开 ${npc.name} 暗网档案`,
      detail: '终端已切到情报索引层',
      tone: 'success',
    });
  };

  const openDmThread = (npc: NPC) => {
    setSelectedThreadNpcId(npc.id);
    switchView('dm', {
      title: `已接入 ${npc.name} 私信链路`,
      detail: isMutualFollow(npc) ? '当前可继续发送消息' : '当前只有历史记录',
      tone: 'info',
      accent: 'dm',
    });
  };

  const toggleFollowWithFeedback = (npc: NPC) => {
    onToggleFollow(npc.id);
    pushFeedback(
      npc.playerFollows ? `已取消关注 ${npc.name}` : `已关注 ${npc.name}`,
      npc.playerFollows ? '账号已从灵网追踪列表移出' : '后续会优先出现在灵网和私信链路中',
      npc.playerFollows ? 'info' : 'success',
      'lingnet',
    );
  };

  const openPayment = (payload: Omit<PaymentDraft, 'amount' | 'note'> & { amount?: string; note?: string }) => {
    setPaymentDraft({
      npcId: payload.npcId,
      postId: payload.postId,
      kind: payload.kind,
      amount: payload.amount || '',
      note: payload.note || '',
    });
    setPaymentError('');
  };

  const submitPayment = () => {
    if (!paymentDraft) return;
    const amount = Number(paymentDraft.amount);
    const targetNpc = socialAccounts.find(npc => npc.id === paymentDraft.npcId);
    if (!Number.isFinite(amount) || amount <= 0) {
      pushFeedback('支付金额无效', '请输入大于 0 的数字', 'warn', 'wallet');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('金额必须大于 0。');
      return;
    }
    const result = onSpendOnNpc({
      npcId: paymentDraft.npcId,
      amount,
      kind: paymentDraft.kind,
      note: paymentDraft.note,
      postId: paymentDraft.postId,
    });
    if (!result.ok) {
      pushFeedback('支付失败', result.message || '本次交易未完成', 'warn', 'wallet');
    }
    if (!result.ok) {
      setPaymentError(result.message || '支付失败。');
      return;
    }
    setPaymentDraft(null);
    setPaymentError('');
    pushFeedback(
      '支付已完成',
      `${targetNpc?.name || '目标对象'} ${paymentDraft.kind === 'unlock' ? '内容已解锁' : paymentDraft.kind === 'tip' ? '已收到打赏' : '转账已入账'}`,
      'success',
      'wallet',
    );
  };

  const submitComment = (npcId: string, postId: string) => {
    const key = `${npcId}:${postId}`;
    const text = (commentDrafts[key] || '').trim();
    if (!text) return;
    const targetNpc = socialAccounts.find(npc => npc.id === npcId);
    onAddComment(npcId, postId, text);
    setCommentDrafts(prev => ({ ...prev, [key]: '' }));
    pushFeedback('评论已发送', `已写入 ${targetNpc?.name || '目标动态'} 的公开互动`, 'success', 'lingnet');
  };

  const submitDm = () => {
    if (!activeDmNpc) return;
    const text = dmDraft.trim();
    if (!text) return;
    if (!isMutualFollow(activeDmNpc)) {
      pushFeedback('私信链路未开放', '需要互相关注后才能继续发送', 'warn', 'dm');
      return;
    }
    onSendDm(activeDmNpc.id, text);
    setDmDraft('');
    pushFeedback('私信已送达', `当前线程：${activeDmNpc.name}`, 'success', 'dm');
  };

  const submitImport = () => {
    const payload: SocialImportDraft = {
      ...importDraft,
      localName: importDraft.localName.trim(),
      socialHandle: normalizeHandle(importDraft.socialHandle),
      socialBio: importDraft.socialBio.trim(),
      originalAuthorName: importDraft.originalAuthorName.trim(),
      originalAuthorHandle: normalizeHandle(importDraft.originalAuthorHandle),
      profileUrl: importDraft.profileUrl.trim(),
      postUrl: importDraft.postUrl.trim(),
      imageUrl: importDraft.imageUrl.trim(),
      caption: importDraft.caption.trim(),
      note: importDraft.note.trim(),
    };
    const isNewNpc = payload.targetNpcId === '__new__';
    const targetNpc = socialAccounts.find(npc => npc.id === payload.targetNpcId);
    if (!payload.imageUrl || !payload.caption) {
      pushFeedback('导入信息不完整', '图片链接和正文至少要填完整', 'warn', 'import');
      return;
    }
    if (isNewNpc && (!payload.localName || !payload.socialHandle)) {
      pushFeedback('新账号信息不足', '新建灵网账号需要名称和句柄', 'warn', 'import');
      return;
    }
    onImportPost(payload);
    setImportDraft(prev => ({
      ...prev,
      targetNpcId: '__new__',
      localName: '',
      socialHandle: '',
      socialBio: '',
      originalAuthorName: '',
      originalAuthorHandle: '',
      profileUrl: '',
      postUrl: '',
      imageUrl: '',
      caption: '',
      note: '',
    }));
    switchView('lingnet', { silent: true });
    switchLingnetMode('feed', { silent: true });
    pushFeedback(
      '导入已完成',
      isNewNpc ? `${payload.localName} 已建立灵网账号` : `内容已并入 ${targetNpc?.name || '现有账号'} 的灵网动态`,
      'success',
      'import',
    );
  };

  const renderPost = (npc: NPC, post: NPC['socialFeed'][number], motionDelayMs = 0) => {
    const key = `${npc.id}:${post.id}`;
    const locked = post.visibility === 'premium' && !post.unlockedByPlayer;
    return (
      <div
        key={key}
        style={{ animationDelay: `${motionDelayMs}ms` }}
        className="ln-card-lift animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(7,17,28,0.98),rgba(5,9,16,0.98))] shadow-[0_18px_48px_rgba(0,0,0,0.18)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={npc.avatarUrl}
              alt={npc.name}
              loading="lazy"
              decoding="async"
              className="w-11 h-11 rounded-[16px] object-cover border border-cyan-300/25"
            />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Lingnet Feed</div>
              <div className="text-sm font-semibold text-white truncate">{npc.name}</div>
              <div className="text-[11px] text-slate-400 truncate">
                {socialHandleOf(npc)} · {formatTime(post.timestamp)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openProfile(npc.id)}
            className="rounded-full border border-cyan-300/15 px-3 py-1 text-[10px] text-cyan-100/80 transition hover:border-cyan-200/30 hover:text-white"
          >
            主页
          </button>
        </div>
        <div className="px-4 pt-4 pb-3 space-y-3">
          <p className={`text-sm leading-6 ${locked ? 'text-slate-500 blur-[2px]' : 'text-slate-100'}`}>
            {post.content}
          </p>
          {post.image ? (
            <div className="relative overflow-hidden rounded-[22px] border border-cyan-400/15 bg-black">
              <img
                src={post.image}
                alt={npc.name}
                loading="lazy"
                decoding="async"
                className={`w-full aspect-[4/5] object-cover ${locked ? 'blur-lg brightness-50 scale-105' : ''}`}
              />
              {locked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/35">
                  <button
                    type="button"
                    onClick={() =>
                      openPayment({
                        npcId: npc.id,
                        postId: post.id,
                        kind: 'unlock',
                        amount: `${post.unlockPrice || 88}`,
                        note: `解锁 ${npc.name} 的私密内容`,
                      })
                    }
                    className="px-4 py-2 rounded-full bg-amber-300 text-black text-xs font-bold"
                  >
                    支付 {post.unlockPrice || 88} 灵币解锁
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() =>
                openPayment({ npcId: npc.id, postId: post.id, kind: 'tip', amount: '30', note: `打赏 ${npc.name}` })
              }
              className="rounded-[16px] border border-fuchsia-400/20 bg-fuchsia-500/8 px-3 py-2 text-fuchsia-100 transition hover:border-fuchsia-300/35 hover:text-white"
            >
              打赏
            </button>
            <button
              type="button"
              onClick={() => openPayment({ npcId: npc.id, kind: 'transfer', amount: '88', note: `转账给 ${npc.name}` })}
              className="rounded-[16px] border border-cyan-400/20 bg-cyan-500/8 px-3 py-2 text-cyan-100 transition hover:border-cyan-300/35 hover:text-white"
            >
              转账
            </button>
            <button
              type="button"
              onClick={() => toggleFollowWithFeedback(npc)}
              className={`rounded-[16px] px-3 py-2 border transition ${npc.playerFollows ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100' : 'border-white/10 text-slate-300 hover:text-white'}`}
            >
              {npc.playerFollows ? '已关注' : '关注'}
            </button>
          </div>
          <div className="space-y-2">
            {post.comments.slice(0, previewCommentLimit).map(comment => (
              <div key={comment.id} className="rounded-[18px] bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
                <span className={`font-semibold ${comment.isPlayer ? 'text-fuchsia-300' : 'text-cyan-300'}`}>
                  {comment.sender}
                </span>{' '}
                · {comment.content}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentDrafts[key] || ''}
                onChange={event => setCommentDrafts(prev => ({ ...prev, [key]: event.target.value }))}
                placeholder={`评论 ${npc.name} 的动态`}
                className="flex-1 rounded-full border border-cyan-400/15 bg-black/35 px-3 py-2 text-xs text-white outline-none placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => submitComment(npc.id, post.id)}
                className="rounded-full bg-white px-3 py-2 text-xs font-semibold text-black"
              >
                发送
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDiscoverCard = (npc: NPC, index: number) => (
    <div
      key={npc.id}
      style={getStaggerStyle(index)}
      className="ln-card-lift animate-in fade-in slide-in-from-bottom-2 duration-500 overflow-hidden rounded-[28px] border border-cyan-400/15 bg-[linear-gradient(180deg,rgba(8,18,30,0.98),rgba(5,9,16,0.98))] p-4 shadow-[0_18px_48px_rgba(0,0,0,0.16)]"
    >
      <div className="flex gap-3">
        <img
          src={npc.avatarUrl}
          alt={npc.name}
          loading="lazy"
          decoding="async"
          className="h-16 w-16 rounded-[22px] object-cover border border-cyan-300/20"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">
                {isMutualFollow(npc) ? 'Mutual Link' : npc.playerFollows ? 'Observed' : 'Suggested'}
              </div>
              <div className="truncate text-base font-semibold text-white">{npc.name}</div>
              <div className="truncate text-xs text-cyan-100/70">{socialHandleOf(npc)}</div>
            </div>
            <button
              type="button"
              onClick={() => toggleFollowWithFeedback(npc)}
              className={`rounded-full px-3 py-1.5 text-xs border transition ${npc.playerFollows ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100' : 'border-white/10 text-slate-300 hover:text-white'}`}
            >
              {npc.playerFollows ? '已关注' : '关注'}
            </button>
          </div>
          <div className="mt-3 text-sm leading-6 text-slate-200/90 line-clamp-2">
            {npc.socialBio || `${npc.affiliation} · ${npc.position}`}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-full border border-cyan-400/12 bg-black/25 px-2 py-1 text-slate-300">
              {npc.followerCount || 0} 粉丝
            </span>
            <span className="rounded-full border border-cyan-400/12 bg-black/25 px-2 py-1 text-slate-300">
              {npc.followingCount || 0} 关注
            </span>
            <span className="rounded-full border border-fuchsia-400/12 bg-black/25 px-2 py-1 text-slate-300">
              {npc.darknetProfile?.intelRecords?.length || 0} 暗网记录
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => openProfile(npc.id)}
              className="flex-1 rounded-[16px] bg-white px-3 py-2 text-xs font-semibold text-black"
            >
              查看主页
            </button>
            <button
              type="button"
              onClick={() => openDarknetProfile(npc)}
              className="rounded-[16px] border border-fuchsia-400/20 px-3 py-2 text-xs text-fuchsia-100 transition hover:border-fuchsia-300/35 hover:text-white"
            >
              暗网
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLingnetProfile = () => {
    if (!activeProfileNpc)
      return (
        <div className="rounded-[24px] border border-dashed border-white/10 px-5 py-10 text-center text-sm text-slate-400">
          当前还没有可查看的灵网账号。
        </div>
      );
    return (
      <div className="animate-in fade-in slide-in-from-right-2 duration-500 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => switchLingnetMode('feed')}
            className="text-xs uppercase tracking-[0.18em] text-cyan-200/75 transition hover:text-white"
          >
            ← 返回灵网动态
          </button>
          <button
            type="button"
            onClick={() => openDarknetProfile(activeProfileNpc)}
            className="rounded-full border border-fuchsia-500/25 px-3 py-1.5 text-[11px] text-fuchsia-100 transition hover:border-fuchsia-400 hover:text-white"
          >
            打开暗网档案
          </button>
        </div>
        <div className="overflow-hidden rounded-[30px] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.14),_transparent_28%),linear-gradient(180deg,rgba(8,18,30,0.98),rgba(6,10,18,0.98))] p-4">
          <div className="flex gap-4">
            <img
              src={activeProfileNpc.avatarUrl}
              alt={activeProfileNpc.name}
              loading="lazy"
              decoding="async"
              className="w-20 h-20 rounded-[24px] object-cover border border-cyan-300/20"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/55">Profile</div>
                  <div className="text-xl font-semibold text-white">{activeProfileNpc.name}</div>
                  <div className="text-xs text-cyan-100/70">{socialHandleOf(activeProfileNpc)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => toggleFollowWithFeedback(activeProfileNpc)}
                  className={`rounded-full px-3 py-2 text-xs border transition ${activeProfileNpc.playerFollows ? 'border-emerald-400/35 bg-emerald-500/10 text-emerald-100' : 'border-white/10 text-slate-300 hover:text-white'}`}
                >
                  {activeProfileNpc.playerFollows ? '已关注' : '关注'}
                </button>
              </div>
              <div className="mt-3 text-sm leading-6 text-slate-200">
                {activeProfileNpc.socialBio || `${activeProfileNpc.affiliation} · ${activeProfileNpc.position}`}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-300 sm:grid-cols-4">
                <div className="rounded-[16px] border border-cyan-400/10 bg-black/25 px-3 py-2">
                  {activeProfileNpc.socialFeed.length} 动态
                </div>
                <div className="rounded-[16px] border border-cyan-400/10 bg-black/25 px-3 py-2">
                  {activeProfileNpc.darknetProfile?.intelRecords?.length || 0} 暗网记录
                </div>
                <div className="rounded-[16px] border border-cyan-400/10 bg-black/25 px-3 py-2">
                  {activeProfileNpc.followerCount || 0} 粉丝
                </div>
                <div className="rounded-[16px] border border-cyan-400/10 bg-black/25 px-3 py-2">
                  {activeProfileNpc.followingCount || 0} 关注
                </div>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    openPayment({
                      npcId: activeProfileNpc.id,
                      kind: 'tip',
                      amount: '30',
                      note: `主页打赏 ${activeProfileNpc.name}`,
                    })
                  }
                  className="rounded-full border border-cyan-400/20 px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-300/35 hover:text-white"
                >
                  主页打赏
                </button>
                <button
                  type="button"
                  onClick={() => openDmThread(activeProfileNpc)}
                  className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-200 transition hover:text-white"
                >
                  打开私信
                </button>
              </div>
            </div>
          </div>
        </div>
        {visibleProfilePosts.map((post, index) => renderPost(activeProfileNpc, post, index * 55))}
        {activeProfileNpc.socialFeed.length > visibleProfilePosts.length ? (
          <button
            type="button"
            onClick={() => setVisibleProfilePostCount(count => count + profilePostBatchSize)}
            className="w-full rounded-[18px] border border-cyan-400/12 bg-black/25 px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/30 hover:text-white"
          >
            加载更多主页动态
          </button>
        ) : null}
      </div>
    );
  };

  const formFieldClass =
    'w-full rounded-[18px] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500';
  const textareaClass =
    'w-full rounded-[22px] border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500';

  const renderDmView = () => (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-4">
      <div className="ln-float-soft rounded-[26px] border border-fuchsia-400/14 bg-[radial-gradient(circle_at_top_left,_rgba(217,70,239,0.16),_transparent_28%),linear-gradient(180deg,rgba(20,10,28,0.98),rgba(10,7,16,0.98))] px-4 py-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-fuchsia-100/60">Direct Message Lane</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-slate-200 sm:grid-cols-3">
          <div>{dmAccounts.length} 个可用会话</div>
          <div>{paymentEntries.length} 笔关联转账</div>
          <div>{activeDmNpc ? `当前联系人 ${activeDmNpc.name}` : '等待新的链路'}</div>
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[210px_1fr] min-h-[500px]">
        <div className="rounded-[26px] border border-fuchsia-400/12 bg-black/25 p-2">
          <div className="px-3 pb-2 pt-1 text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/55">Threads</div>
          <div className="space-y-2">
            {dmAccounts.length === 0 ? (
              <div className="rounded-[18px] border border-dashed border-white/10 px-3 py-8 text-center text-xs text-slate-500">
                互关后才能开启私信。
              </div>
            ) : (
              visibleDmAccounts.map((npc, index) => (
                <button
                  key={npc.id}
                  type="button"
                  onClick={() => setSelectedThreadNpcId(npc.id)}
                  style={getStaggerStyle(index)}
                  className={`animate-in fade-in slide-in-from-left-2 duration-300 w-full rounded-[18px] border px-3 py-3 text-left transition ${
                    activeDmNpc?.id === npc.id
                      ? 'border-fuchsia-200/40 bg-fuchsia-100 text-black'
                      : 'ln-card-lift border-white/5 bg-white/[0.02] text-slate-300 hover:border-fuchsia-300/20 hover:text-white'
                  }`}
                >
                  <div className="truncate text-xs font-semibold">{npc.name}</div>
                  <div
                    className={`mt-1 truncate text-[10px] ${activeDmNpc?.id === npc.id ? 'text-black/70' : 'text-slate-500'}`}
                  >
                    {socialHandleOf(npc)}
                  </div>
                  <div
                    className={`mt-2 text-[10px] ${activeDmNpc?.id === npc.id ? 'text-black/60' : 'text-slate-500'}`}
                  >
                    {isMutualFollow(npc) ? '已建立直连' : '保留历史线程'}
                  </div>
                </button>
              ))
            )}
            {dmAccounts.length > visibleDmAccounts.length ? (
              <button
                type="button"
                onClick={() => setVisibleDmThreadCount(count => count + dmThreadBatchSize)}
                className="w-full rounded-[18px] border border-fuchsia-400/12 bg-black/25 px-3 py-2 text-xs text-fuchsia-100 transition hover:border-fuchsia-300/30 hover:text-white"
              >
                加载更多会话
              </button>
            ) : null}
          </div>
        </div>
        <div className="rounded-[28px] border border-fuchsia-400/12 bg-[linear-gradient(180deg,rgba(17,9,24,0.98),rgba(9,7,15,0.98))] flex flex-col min-h-0 overflow-hidden">
          {activeDmNpc ? (
            <>
              <div className="border-b border-white/10 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.2em] text-fuchsia-100/55">Private Relay</div>
                    <div className="mt-1 text-lg font-semibold text-white">{activeDmNpc.name}</div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      {isMutualFollow(activeDmNpc) ? '已互关，链路稳定。' : '当前仅保留历史记录，无法继续发送。'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      openPayment({
                        npcId: activeDmNpc.id,
                        kind: 'transfer',
                        amount: '88',
                        note: `私信转账给 ${activeDmNpc.name}`,
                      })
                    }
                    className="rounded-full border border-cyan-400/20 px-3 py-2 text-xs text-cyan-100 transition hover:border-cyan-300/35 hover:text-white"
                  >
                    转账
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
                {(activeDmNpc.dmThread || []).length === 0 ? (
                  <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                    这里还没有消息。
                  </div>
                ) : (
                  visibleDmMessages.map((message, index) => (
                    <div
                      key={message.id}
                      style={getStaggerStyle(index, 40)}
                      className={`animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-[82%] rounded-[20px] border px-3 py-2.5 text-sm ${
                        message.sender === 'player'
                          ? 'ml-auto border-fuchsia-200/20 bg-fuchsia-200 text-black'
                          : message.sender === 'npc'
                            ? 'border-white/8 bg-white/[0.04] text-slate-100'
                            : 'mx-auto border-amber-400/20 bg-amber-500/12 text-amber-100 text-xs'
                      }`}
                    >
                      <div>{message.content}</div>
                      {message.amount ? (
                        <div className="mt-2 text-[11px] opacity-75">金额：{message.amount} 灵币</div>
                      ) : null}
                    </div>
                  ))
                )}
                {(activeDmNpc.dmThread || []).length > visibleDmMessages.length ? (
                  <button
                    type="button"
                    onClick={() => setVisibleDmMessageCount(count => count + dmMessageBatchSize)}
                    className="w-full rounded-[18px] border border-fuchsia-400/12 bg-black/20 px-3 py-2 text-xs text-fuchsia-100 transition hover:border-fuchsia-300/30 hover:text-white"
                  >
                    加载更早消息
                  </button>
                ) : null}
              </div>
              <div className="border-t border-white/10 p-3">
                <div className="flex items-center gap-2 rounded-[22px] border border-fuchsia-400/12 bg-black/25 px-2 py-2">
                  <input
                    type="text"
                    value={dmDraft}
                    onChange={event => setDmDraft(event.target.value)}
                    onKeyDown={event => {
                      if (event.key === 'Enter') submitDm();
                    }}
                    disabled={!isMutualFollow(activeDmNpc)}
                    placeholder={isMutualFollow(activeDmNpc) ? '发送一条私信' : '需要互关后才能聊天'}
                    className="flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-slate-500 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={submitDm}
                    disabled={!isMutualFollow(activeDmNpc)}
                    className="rounded-full bg-white px-3 py-2 text-black transition disabled:opacity-40"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center px-6 text-sm text-slate-500">
              先去灵网关注一些账号，再把链路拉成互关。
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWalletView = () => (
    <div className="animate-in fade-in slide-in-from-top-2 duration-500 space-y-4">
      <div className="ln-float-soft rounded-[28px] border border-amber-400/15 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,rgba(24,16,8,0.98),rgba(10,8,5,0.98))] px-4 py-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-100/60">Settlement Deck</div>
        <div className="mt-2 text-sm leading-6 text-amber-50/80">
          当前月结周期：{walletSummary.cycleLabel}。钱包需要同时承担灵网支付、税务扣缴和历史欠缴情形清偿。
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Balance</div>
            <div className="mt-2 text-3xl font-semibold text-white">{playerCredits}</div>
            <div className="mt-2 text-xs text-amber-100/70">可用于打赏、转账与付费解锁。</div>
          </div>
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Locked</div>
            <div className="mt-2 text-3xl font-semibold text-white">{lockedPremiumCount}</div>
            <div className="mt-2 text-xs text-amber-100/70">当前仍待解锁的私密内容条目。</div>
          </div>
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Volume</div>
            <div className="mt-2 text-3xl font-semibold text-white">{transactionVolume}</div>
            <div className="mt-2 text-xs text-amber-100/70">已记录的关联交易总额。</div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-amber-400/12 bg-black/25">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-100/55">Transaction Ledger</div>
          <div className="mt-1 text-sm text-slate-300">最近 8 条资金流</div>
        </div>
        <div className="p-3 space-y-2">
          {paymentEntries.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
              还没有发生过灵网支付。
            </div>
          ) : (
            visiblePaymentEntries.map((entry, index) => (
              <div
                key={entry.item.id}
                style={getStaggerStyle(index, 45)}
                className="ln-card-lift animate-in fade-in slide-in-from-bottom-2 duration-500 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{entry.npc.name}</div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {entry.item.kind || 'transfer'} · {formatTime(entry.item.timestamp)}
                  </div>
                </div>
                <div className="text-sm font-semibold text-amber-200">-{entry.item.amount}</div>
              </div>
            ))
          )}
          {paymentEntries.length > visiblePaymentEntries.length ? (
            <button
              type="button"
              onClick={() => setVisiblePaymentCount(count => count + paymentBatchSize)}
              className="w-full rounded-[20px] border border-amber-300/15 bg-black/20 px-4 py-3 text-sm text-amber-100 transition hover:border-amber-200/30 hover:text-white"
            >
              加载更多流水
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  void renderWalletView;

  const renderWalletFinanceView = () => (
    <div className="animate-in fade-in slide-in-from-top-2 duration-500 space-y-4">
      <div className="ln-float-soft rounded-[28px] border border-amber-400/15 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.18),_transparent_28%),linear-gradient(180deg,rgba(24,16,8,0.98),rgba(10,8,5,0.98))] px-4 py-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-amber-100/60">Settlement Deck</div>
        <div className="mt-2 text-sm leading-6 text-amber-50/80">
          当前月结周期：{walletSummary.cycleLabel}。钱包现在同时承担灵网支付、税务扣缴和历史欠缴情形清偿。
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Balance</div>
            <div className="mt-2 text-3xl font-semibold text-white">{playerCredits}</div>
            <div className="mt-2 text-xs text-amber-100/70">可用于打赏、转账、补缴情税款与系统结算。</div>
          </div>
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Current Tax</div>
            <div className="mt-2 text-3xl font-semibold text-white">{walletSummary.currentTaxDue}</div>
            <div className="mt-2 text-xs text-amber-100/70">本轮月结待处理的基础税额，不含风险与维持扣款。</div>
          </div>
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Arrears</div>
            <div className="mt-2 text-3xl font-semibold text-white">{walletSummary.taxArrears}</div>
            <div className="mt-2 text-xs text-amber-100/70">历史欠缴情形会持续并入后续月结，直到在税务面板补缴。</div>
          </div>
          <div className="rounded-[20px] border border-amber-300/15 bg-black/20 p-4">
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-200/60">Exposure</div>
            <div className="mt-2 text-3xl font-semibold text-white">{walletSummary.settlementExposure}</div>
            <div className="mt-2 text-xs text-amber-100/70">当期税额、维持费和风险扣款合计形成的结算压力。</div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] border border-amber-300/10 bg-black/20 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-100/55">Ledger Count</div>
            <div className="mt-1 text-lg font-semibold text-white">{ledgerEntries.length}</div>
          </div>
          <div className="rounded-[18px] border border-amber-300/10 bg-black/20 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-100/55">Volume</div>
            <div className="mt-1 text-lg font-semibold text-white">{transactionVolume}</div>
          </div>
          <div className="rounded-[18px] border border-amber-300/10 bg-black/20 px-3 py-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-amber-100/55">Recent Net</div>
            <div className={`mt-1 text-lg font-semibold ${recentNetFlow >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
              {recentNetFlow >= 0 ? '+' : '-'}{Math.abs(recentNetFlow)}
            </div>
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-[28px] border border-amber-400/12 bg-black/25">
        <div className="border-b border-white/10 px-4 py-3">
          <div className="text-[10px] uppercase tracking-[0.2em] text-amber-100/55">Transaction Ledger</div>
          <div className="mt-1 text-sm text-slate-300">最近 18 条全局资金流水</div>
        </div>
        <div className="p-3 space-y-2">
          {ledgerEntries.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
              还没有记录到任何资金流。
            </div>
          ) : (
            visibleLedgerEntries.map((entry, index) => (
              <div
                key={entry.id}
                style={getStaggerStyle(index, 45)}
                className="ln-card-lift animate-in fade-in slide-in-from-bottom-2 duration-500 grid grid-cols-[1fr_auto] items-center gap-3 rounded-[20px] border border-white/5 bg-white/[0.03] px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white">{entry.title}</div>
                  <div className="mt-1 text-[11px] text-slate-500">{entry.detail}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-600">
                    {entry.kind} · {formatTime(entry.timestamp)}
                  </div>
                </div>
                <div className={`text-sm font-semibold ${entry.amount >= 0 ? 'text-emerald-300' : 'text-amber-200'}`}>
                  {entry.amount >= 0 ? '+' : '-'}{Math.abs(entry.amount)}
                </div>
              </div>
            ))
          )}
          {ledgerEntries.length > visibleLedgerEntries.length ? (
            <button
              type="button"
              onClick={() => setVisiblePaymentCount(count => count + paymentBatchSize)}
              className="w-full rounded-[20px] border border-amber-300/15 bg-black/20 px-4 py-3 text-sm text-amber-100 transition hover:border-amber-200/30 hover:text-white"
            >
              加载更多流水
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderImportView = () => (
    <div className="animate-in fade-in zoom-in-95 duration-500 space-y-4">
      <div className="ln-float-soft rounded-[28px] border border-sky-400/15 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_28%),linear-gradient(180deg,rgba(9,18,28,0.98),rgba(6,10,16,0.98))] px-4 py-4">
        <div className="text-[10px] uppercase tracking-[0.22em] text-sky-100/60">Import Mapping Desk</div>
        <div className="mt-2 text-sm leading-6 text-slate-200">
          这里只做公开图片和公开链接导入。导入后会本土化成 LN 的灵网内容，后续互动全部发生在本地系统。
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[26px] border border-sky-400/12 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-sky-100/55">Target & Source</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400">导入到</span>
                <select
                  value={importDraft.targetNpcId}
                  onChange={event => setImportDraft(prev => ({ ...prev, targetNpcId: event.target.value }))}
                  className={formFieldClass}
                >
                  <option value="__new__">新建灵网账号</option>
                  {socialAccounts.map(npc => (
                    <option key={npc.id} value={npc.id}>
                      {npc.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[11px] text-slate-400">来源平台</span>
                <select
                  value={importDraft.platform}
                  onChange={event =>
                    setImportDraft(prev => ({ ...prev, platform: event.target.value as SocialPlatform }))
                  }
                  className={formFieldClass}
                >
                  {PLATFORM_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="rounded-[26px] border border-sky-400/12 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-sky-100/55">Identity</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={importDraft.localName}
                onChange={event => setImportDraft(prev => ({ ...prev, localName: event.target.value }))}
                placeholder="世界本土化名称"
                className={formFieldClass}
              />
              <input
                type="text"
                value={importDraft.socialHandle}
                onChange={event => setImportDraft(prev => ({ ...prev, socialHandle: event.target.value }))}
                placeholder="@ln_account"
                className={formFieldClass}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                value={importDraft.originalAuthorName}
                onChange={event => setImportDraft(prev => ({ ...prev, originalAuthorName: event.target.value }))}
                placeholder="原作者名称"
                className={formFieldClass}
              />
              <input
                type="text"
                value={importDraft.originalAuthorHandle}
                onChange={event => setImportDraft(prev => ({ ...prev, originalAuthorHandle: event.target.value }))}
                placeholder="@source_handle"
                className={formFieldClass}
              />
            </div>
            <div className="mt-3">
              <textarea
                value={importDraft.socialBio}
                onChange={event => setImportDraft(prev => ({ ...prev, socialBio: event.target.value }))}
                rows={2}
                placeholder="账号简介"
                className={textareaClass}
              />
            </div>
          </div>

          <div className="rounded-[26px] border border-sky-400/12 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-sky-100/55">Links & Content</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                type="url"
                value={importDraft.profileUrl}
                onChange={event => setImportDraft(prev => ({ ...prev, profileUrl: event.target.value }))}
                placeholder="主页链接"
                className={formFieldClass}
              />
              <input
                type="url"
                value={importDraft.postUrl}
                onChange={event => setImportDraft(prev => ({ ...prev, postUrl: event.target.value }))}
                placeholder="原帖链接"
                className={formFieldClass}
              />
            </div>
            <div className="mt-3">
              <input
                type="url"
                value={importDraft.imageUrl}
                onChange={event => setImportDraft(prev => ({ ...prev, imageUrl: event.target.value }))}
                placeholder="公开图片 URL"
                className={formFieldClass}
              />
            </div>
            <div className="mt-3">
              <textarea
                value={importDraft.caption}
                onChange={event => setImportDraft(prev => ({ ...prev, caption: event.target.value }))}
                rows={4}
                placeholder="导入后的 LN 动态正文"
                className={textareaClass}
              />
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <select
                value={importDraft.gender}
                onChange={event => setImportDraft(prev => ({ ...prev, gender: event.target.value as NPC['gender'] }))}
                className={formFieldClass}
              >
                <option value="female">女性</option>
                <option value="male">男性</option>
              </select>
              <select
                value={importDraft.visibility}
                onChange={event =>
                  setImportDraft(prev => ({ ...prev, visibility: event.target.value as 'public' | 'premium' }))
                }
                className={formFieldClass}
              >
                <option value="public">公开</option>
                <option value="premium">私密付费</option>
              </select>
              <input
                type="number"
                min={1}
                value={importDraft.unlockPrice}
                onChange={event => setImportDraft(prev => ({ ...prev, unlockPrice: Number(event.target.value) || 1 }))}
                className={formFieldClass}
              />
            </div>
            <div className="mt-3">
              <textarea
                value={importDraft.note}
                onChange={event => setImportDraft(prev => ({ ...prev, note: event.target.value }))}
                rows={2}
                placeholder="备注，例如：只保留公开封面"
                className={textareaClass}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-[26px] border border-sky-400/12 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-sky-100/55">Preview</div>
            {importDraft.imageUrl ? (
              <div className="mt-3 overflow-hidden rounded-[22px] border border-sky-400/12 bg-black/20 p-3">
                <img
                  src={importDraft.imageUrl}
                  alt="preview"
                  loading="lazy"
                  decoding="async"
                  className="w-full aspect-[4/5] object-cover rounded-[18px]"
                />
              </div>
            ) : (
              <div className="mt-3 rounded-[22px] border border-dashed border-sky-400/12 px-4 py-10 text-center text-sm text-slate-500">
                填写图片 URL 后显示预览。
              </div>
            )}
            <div className="mt-3 rounded-[18px] border border-sky-400/10 bg-black/20 px-3 py-3 text-sm leading-6 text-slate-300">
              {importDraft.caption?.trim() || '这里会显示导入后的 LN 动态正文预览。'}
            </div>
          </div>
          <div className="rounded-[26px] border border-sky-400/12 bg-black/25 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-sky-100/55">Rules</div>
            <div className="mt-3 space-y-2 text-sm text-slate-300">
              <div className="rounded-[18px] border border-white/5 bg-white/[0.02] px-3 py-2">
                公开内容进灵网，来源映射与后续扩写留在暗网。
              </div>
              <div className="rounded-[18px] border border-white/5 bg-white/[0.02] px-3 py-2">
                新建账号时至少填写本土化名称和灵网句柄。
              </div>
              <div className="rounded-[18px] border border-white/5 bg-white/[0.02] px-3 py-2">
                如果选择私密付费，建议同时给出清晰备注，后续更好追踪。
              </div>
            </div>
            <button
              type="button"
              onClick={submitImport}
              className="mt-4 w-full rounded-[20px] bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-sky-100"
            >
              导入为灵网动态
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`relative h-full flex flex-col overflow-hidden rounded-[32px] border shadow-[0_24px_80px_rgba(0,0,0,0.55)] ${phoneTheme.shell} ${reduceMotion ? 'ln-motion-lite' : ''}`}
    >
      <div className={`pointer-events-none absolute inset-0 ${locationVisualTheme.phoneOverlayClass}`} />
      <div className="pointer-events-none absolute inset-0 ln-scanlines" />
      <div className={`pointer-events-none ln-hud-sweep ${phoneTheme.sweepClass}`} />
      {uiFeedback ? (
        <div
          key={`feedback-flash-${uiFeedback.id}`}
          className={`pointer-events-none absolute inset-0 z-[1] ln-shell-flash ${feedbackFlashClass}`}
        />
      ) : null}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
      <div className="px-5 pt-4 pb-3 border-b border-white/10 bg-black/30 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div>{phoneTheme.headerKicker}</div>
          <button
            type="button"
            onClick={() => setMotionMode(current => (current === 'full' ? 'lite' : 'full'))}
            className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            {reduceMotion ? '低动效' : '标准动效'}
          </button>
          <div>{currentLocation || '未知区域'}</div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold tracking-tight text-white">灵能手机</div>
            <div className="mt-1 text-[11px] text-slate-400">{phoneTheme.headerDescription}</div>
            <div className={`mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${locationVisualTheme.phoneRegionPillClass}`}>
              {locationVisualTheme.label}
            </div>
            <div
              className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.22em] ${phoneTheme.chipClass}`}
            >
              <span className={`ln-mode-dot ${phoneTheme.dotClass}`} />
              {phoneTheme.modeLabel}
            </div>
          </div>
          <div className={`ln-float-soft rounded-[22px] border px-4 py-2 text-right ${phoneTheme.walletPanel}`}>
            <div className={`text-[10px] uppercase tracking-[0.25em] ${phoneTheme.walletLabel}`}>Wallet</div>
            <div className="text-lg font-semibold text-white">{playerCredits}</div>
          </div>
        </div>
        <div className={`mt-3 rounded-[22px] border px-3 py-3 ${JURISDICTION_TONE_CLASS[jurisdiction.tone]}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-white/60">Jurisdiction Layer</div>
            <div className="text-[11px] font-semibold text-white">{jurisdiction.regionLabel}</div>
          </div>
          <div className={`mt-2 inline-flex items-center rounded-full border px-2 py-1 text-[10px] ${locationVisualTheme.phoneRegionPillClass}`}>
            {locationVisualTheme.label}
          </div>
          <div className="mt-2 text-[11px] leading-5 text-slate-200/85">{jurisdiction.summary}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {jurisdiction.chips.map(chip => (
              <div key={chip.label} className="rounded-[16px] border border-white/8 bg-black/20 px-3 py-2">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/45">{chip.label}</div>
                <div className="mt-1 text-[11px] text-white">{chip.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="px-4 pt-3">
        <div
          className={
            isCompactViewport ? '-mx-1 overflow-x-auto px-1 custom-scrollbar scrollbar-hidden' : undefined
          }
        >
          <div
            className={`gap-2 rounded-[24px] border p-1 ${phoneTheme.navWrap} ${
              isCompactViewport ? 'flex min-w-max snap-x snap-mandatory' : 'grid grid-cols-5'
            }`}
          >
            {PHONE_TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => switchView(tab.id as PhoneView)}
              className={`ln-card-lift rounded-[18px] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.99] ${
                isCompactViewport
                  ? 'min-w-[92px] shrink-0 snap-start flex-col px-3 py-3'
                  : 'flex-col px-2 py-2 sm:flex-row'
              } ${activeView === tab.id ? phoneTheme.navActive : phoneTheme.navIdle}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      </div>
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar"
        style={phoneContentInsetStyle}
      >
        {uiFeedback ? (
          <div className="sticky top-0 z-10 pointer-events-none">
            <div
              key={uiFeedback.id}
              className={`ln-feedback-card animate-in fade-in slide-in-from-top-1 duration-300 rounded-[22px] border px-4 py-3 shadow-[0_18px_48px_rgba(0,0,0,0.28)] backdrop-blur-md ${feedbackToneClass}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${feedbackDotClass}`} />
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Action Receipt</div>
                  <div className="mt-1 text-sm font-semibold text-white">{uiFeedback.title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-200/90">{uiFeedback.detail}</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {activeView === 'lingnet' && (
          <div className={`animate-in fade-in ${phoneTheme.sceneClass}`}>
            <div className="rounded-[24px] border border-cyan-400/12 bg-cyan-500/5 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-cyan-200/60">Lingnet Layer</div>
              <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-slate-200 sm:grid-cols-3">
                <div>{lingnetStats.accounts} 个活跃账号</div>
                <div>{lingnetStats.posts} 条公开动态</div>
                <div>{lingnetStats.mutuals} 个互关联系人</div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-2 rounded-full border border-cyan-400/10 bg-black/30 p-1">
                {[
                  { id: 'feed', label: '动态', icon: <Sparkles className="w-3.5 h-3.5" /> },
                  { id: 'discover', label: '发现', icon: <Search className="w-3.5 h-3.5" /> },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchLingnetMode(tab.id as LingnetMode)}
                    className={`rounded-full px-3 py-2 text-[11px] font-semibold flex items-center gap-1.5 transition ${lingnetMode === tab.id ? 'bg-white text-black' : 'text-slate-400 hover:text-cyan-100'}`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              {lingnetMode !== 'profile' && (
                <div className="min-w-[180px] flex-1 flex items-center gap-2 rounded-[22px] border border-cyan-400/12 bg-black/25 px-3 py-2">
                  <Search className="w-4 h-4 text-cyan-200/40" />
                  <input
                    type="text"
                    value={keyword}
                    onChange={event => setKeyword(event.target.value)}
                    placeholder="搜索账号、地区、标签"
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </div>
              )}
            </div>
            {lingnetMode === 'profile' ? renderLingnetProfile() : null}
            {lingnetMode === 'feed' &&
              (feedEntries.length > 0 ? (
                visibleFeedEntries.map((entry, index) => renderPost(entry.npc, entry.post, index * 55))
              ) : (
                <div className="rounded-[24px] border border-dashed border-cyan-400/12 px-5 py-10 text-center text-sm text-slate-400">
                  灵网里还没有内容，先去导入公开图片或给现有 NPC 补动态。
                </div>
              ))}
            {lingnetMode === 'feed' && feedEntries.length > visibleFeedEntries.length ? (
              <button
                type="button"
                onClick={() => setVisibleFeedCount(count => count + feedBatchSize)}
                className="mt-3 w-full rounded-[18px] border border-cyan-400/12 bg-black/25 px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/30 hover:text-white"
              >
                加载更多动态
              </button>
            ) : null}
            {lingnetMode === 'discover' &&
              (filteredAccounts.length > 0 ? (
                visibleDiscoverEntries.map((npc, index) => renderDiscoverCard(npc, index))
              ) : (
                <div className="rounded-[24px] border border-dashed border-cyan-400/12 px-5 py-10 text-center text-sm text-slate-400">
                  暂时没有符合筛选条件的灵网账号。
                </div>
              ))}
            {lingnetMode === 'discover' && filteredAccounts.length > visibleDiscoverEntries.length ? (
              <button
                type="button"
                onClick={() => setVisibleDiscoverCount(count => count + discoverBatchSize)}
                className="mt-3 w-full rounded-[18px] border border-cyan-400/12 bg-black/25 px-4 py-3 text-sm text-cyan-100 transition hover:border-cyan-300/30 hover:text-white"
              >
                加载更多账号
              </button>
            ) : null}
          </div>
        )}
        {activeView === 'darknet' && (
          <div
            className={`animate-in fade-in ${phoneTheme.sceneClass} h-full min-h-[560px] rounded-[18px] border border-emerald-500/20 bg-[linear-gradient(180deg,rgba(5,10,8,0.98),rgba(3,6,5,0.98))] p-3`}
          >
            <NpcCodexPanel
              npcs={npcs}
              playerCredits={playerCredits}
              selectedNpcId={selectedDarknetNpcId}
              onSelectNpcId={setSelectedDarknetNpcId}
              onPurchaseService={onPurchaseDarknetService}
            />
          </div>
        )}
        {activeView === 'dm' && renderDmView()}
        {activeView === 'wallet' && renderWalletFinanceView()}
        {activeView === 'import' && renderImportView()}
      </div>
      {paymentDraft ? (
        <div className="absolute inset-0 z-20 animate-in fade-in duration-200 bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div
            className={`animate-in zoom-in-95 slide-in-from-bottom-2 duration-300 w-full max-w-md rounded-[28px] border p-5 space-y-4 ${phoneTheme.walletPanel} bg-[#0c0914]`}
          >
            <div>
              <div className="text-lg font-semibold text-white">灵网支付</div>
              <div className="text-xs text-slate-400 mt-1">付款人：{playerName || '接入者'}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min={1}
                value={paymentDraft.amount}
                onChange={event => setPaymentDraft(prev => (prev ? { ...prev, amount: event.target.value } : prev))}
                className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              />
              <div className="rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-200">
                {paymentDraft.kind}
              </div>
            </div>
            <input
              type="text"
              value={paymentDraft.note}
              onChange={event => setPaymentDraft(prev => (prev ? { ...prev, note: event.target.value } : prev))}
              placeholder="备注"
              className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
            />
            {paymentError ? <div className="text-xs text-red-400">{paymentError}</div> : null}
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentDraft(null);
                  setPaymentError('');
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300"
              >
                取消
              </button>
              <button
                type="button"
                onClick={submitPayment}
                className="rounded-full bg-white text-black px-4 py-2 text-xs font-semibold"
              >
                确认支付
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LingnetPhonePanel;
