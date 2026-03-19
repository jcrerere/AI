import React, { useEffect, useMemo, useState } from 'react';
import { NPC, NpcDossierSection, NpcGalleryImage, NpcDarknetRecord } from '../../types';
import { resolveNpcCodexAccessState, resolveNpcIntelUnlockedCount } from '../../utils/npcCodex';
import CyberPanel from '../ui/CyberPanel';
import ImageLightbox from '../ui/ImageLightbox';
import { BadgeInfo, BookOpen, Globe2, Image as ImageIcon, Lock } from 'lucide-react';

interface Props {
  npc: NPC;
  onBack: () => void;
}

type CodexSection = 'clue' | 'dossier' | 'album' | 'darknet';

const GALLERY_BATCH_SIZE = 6;
const RECORD_BATCH_SIZE = 6;

const formatRecordTime = (timestamp: string): string => {
  const ms = Date.parse(timestamp);
  if (!Number.isFinite(ms)) return timestamp || '未标注时间';
  return new Date(ms).toLocaleString('zh-CN', { hour12: false });
};

const getRiskLabel = (record: NpcDarknetRecord): string => {
  if (record.risk === 'sealed') return '密封';
  if (record.risk === 'high') return '高危';
  if (record.risk === 'medium') return '中危';
  return '低危';
};

const getRiskClassName = (record: NpcDarknetRecord): string => {
  if (record.risk === 'sealed') return 'border-amber-500/30 bg-amber-950/25 text-amber-200';
  if (record.risk === 'high') return 'border-red-500/30 bg-red-950/25 text-red-200';
  if (record.risk === 'medium') return 'border-fuchsia-500/30 bg-fuchsia-950/25 text-fuchsia-200';
  return 'border-cyan-500/30 bg-cyan-950/25 text-cyan-200';
};

const NpcCodexEntryPanel: React.FC<Props> = ({ npc, onBack }) => {
  const [activeSection, setActiveSection] = useState<CodexSection>('clue');
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string; subtitle?: string } | null>(null);
  const [visibleGalleryCount, setVisibleGalleryCount] = useState(GALLERY_BATCH_SIZE);
  const [visibleRecordCount, setVisibleRecordCount] = useState(RECORD_BATCH_SIZE);

  const access = useMemo(() => resolveNpcCodexAccessState(npc), [npc]);
  const darkProfile = npc.darknetProfile;
  const darknetRecords = darkProfile?.intelRecords || [];

  const clueNotes = useMemo(() => {
    if ((npc.clueNotes || []).length > 0) return npc.clueNotes || [];
    const notes = [
      npc.location ? `线索定位：${npc.location}` : '线索定位尚未稳定。',
      npc.affiliation ? `疑似隶属：${npc.affiliation}` : '来源组织尚未核实。',
      npc.position ? `外显身份：${npc.position}` : '公开身份仍不明朗。',
    ];
    if (access.dossierLevel <= 1) notes.push('继续接触、关注、交易或解锁事件后，可获取更多暗网条目。');
    return notes;
  }, [access.dossierLevel, npc]);

  const dossierSections = useMemo<NpcDossierSection[]>(() => {
    if ((npc.dossierSections || []).length > 0) return npc.dossierSections || [];
    return [
      {
        id: 'baseline',
        title: '公开身份',
        content: `${npc.name} 以“${npc.position || '待识别身份'}”身份出现在 ${npc.location || '未知区域'}，对外关联多指向 ${npc.affiliation || '未知势力'}。`,
        unlockLevel: 2,
      },
      {
        id: 'darknet_summary',
        title: '暗网画像',
        content:
          darkProfile?.summary?.trim()
          || `${npc.name} 当前只建立了基础暗网索引，未形成完整画像。继续接触、交易或推进剧情后，可补齐更深层的节点记录。`,
        unlockLevel: 3,
      },
      {
        id: 'vector',
        title: '接触面',
        content: `接入层级：${darkProfile?.accessTier || '未标注'}。主要流向：${darkProfile?.marketVector || npc.position || '人物观察'}。已记录 ${darknetRecords.length} 条地下节点。`,
        unlockLevel: 4,
      },
    ];
  }, [darkProfile?.accessTier, darkProfile?.marketVector, darkProfile?.summary, darknetRecords.length, npc]);

  const galleryItems = useMemo<NpcGalleryImage[]>(() => {
    const dedup = new Map<string, NpcGalleryImage>();
    const pushItem = (item: NpcGalleryImage) => {
      const src = `${item.src || ''}`.trim();
      if (!src || dedup.has(src)) return;
      dedup.set(src, item);
    };

    pushItem({
      id: `${npc.id}_portrait`,
      src: npc.avatarUrl,
      title: `${npc.name} 头像`,
      caption: '当前暗网条目封面',
      sourceLabel: '头像',
      unlockLevel: 1,
    });

    (npc.gallery || []).forEach((item, index) => {
      pushItem({
        ...item,
        id: item.id || `${npc.id}_gallery_${index + 1}`,
        unlockLevel: item.unlockLevel || 2,
      });
    });

    darknetRecords.forEach((record, index) => {
      if (!record.image) return;
      pushItem({
        id: `${npc.id}_darknet_${record.id || index + 1}`,
        src: record.image,
        title: record.title || `${npc.name} 暗网影像`,
        caption: record.content,
        sourceLabel: record.source || '暗网记录',
        unlockLevel: record.unlockLevel || 2,
      });
    });

    return [...dedup.values()];
  }, [darknetRecords, npc.avatarUrl, npc.gallery, npc.id, npc.name]);

  const unlockedGalleryCount = useMemo(() => {
    if (npc.unlockState?.albumUnlockedCount) return Math.min(galleryItems.length, npc.unlockState.albumUnlockedCount);
    if (access.dossierLevel >= 4) return galleryItems.length;
    if (access.dossierLevel === 3) return Math.min(galleryItems.length, 4);
    if (access.dossierLevel === 2) return Math.min(galleryItems.length, 1);
    return 0;
  }, [access.dossierLevel, galleryItems.length, npc.unlockState?.albumUnlockedCount]);

  const isGalleryUnlocked = (item: NpcGalleryImage, index: number) => {
    if (access.dossierLevel >= (item.unlockLevel || 1)) return true;
    return index < unlockedGalleryCount;
  };

  const unlockedIntelCount = useMemo(() => resolveNpcIntelUnlockedCount(npc, darknetRecords.length), [darknetRecords.length, npc]);
  const visibleGalleryItems = useMemo(
    () => galleryItems.slice(0, visibleGalleryCount),
    [galleryItems, visibleGalleryCount],
  );
  const visibleDarknetRecords = useMemo(
    () => darknetRecords.slice(0, visibleRecordCount),
    [darknetRecords, visibleRecordCount],
  );

  const isIntelUnlocked = (record: NpcDarknetRecord, index: number) => {
    if (access.darknetLevel >= (record.unlockLevel || 1)) return true;
    return index < unlockedIntelCount;
  };

  useEffect(() => {
    setVisibleGalleryCount(GALLERY_BATCH_SIZE);
  }, [npc.id, galleryItems.length]);

  useEffect(() => {
    setVisibleRecordCount(RECORD_BATCH_SIZE);
  }, [npc.id, darknetRecords.length]);

  const maskedCitizenId = access.dossierLevel >= 3 ? npc.citizenId || '未登记' : '信息未解锁';
  const maskedSocialHandle = access.socialUnlocked ? npc.socialHandle || '未绑定账号' : '需提升关系后解锁';
  const maskedDarknetHandle = access.darknetUnlocked ? darkProfile?.handle || '未登记句柄' : '需建立接入权限后解锁';

  return (
    <div className="relative h-full flex flex-col animate-in slide-in-from-right-4 duration-300 font-mono">
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <button onClick={onBack} className="text-xs uppercase tracking-[0.2em] text-emerald-300/80 transition hover:text-emerald-200">
          &larr; 返回暗网目录
        </button>
        <span className="rounded-sm border border-emerald-500/20 bg-emerald-500/8 px-2 py-1 text-[11px] uppercase tracking-[0.22em] text-emerald-300">
          Locked Index
        </span>
      </div>

      <div className="relative mb-4 overflow-hidden rounded-md border border-emerald-500/20 bg-[linear-gradient(135deg,rgba(6,12,10,0.98),rgba(4,8,7,0.98)),repeating-linear-gradient(180deg,rgba(255,255,255,0.03)_0,rgba(255,255,255,0.03)_1px,transparent_1px,transparent_10px)] p-4 shrink-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/50 to-transparent" />
        <div className="flex gap-4 items-start">
          <button
            type="button"
            onClick={() => setLightboxImage({ src: npc.avatarUrl, title: npc.name, subtitle: access.dossierLevel <= 1 ? '当前仅开放外观线索' : npc.position })}
            className="relative w-24 h-32 overflow-hidden rounded-sm border border-emerald-500/20 bg-black shrink-0"
          >
            <img
              src={npc.avatarUrl}
              alt={npc.name}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover ${access.dossierLevel <= 1 ? 'grayscale blur-[1px] opacity-75' : ''}`}
            />
          </button>

          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/55">Restricted Subject</div>
            <div className="mt-1 truncate text-2xl font-bold text-white">{access.dossierLevel <= 1 ? '未识别人形' : npc.name}</div>
            <div className="mt-1 truncate text-sm font-semibold text-emerald-200">{access.dossierLevel <= 1 ? '仅开放外观线索' : npc.position}</div>
            <div className="mt-2 inline-flex max-w-full items-center rounded-sm border border-emerald-500/15 bg-black/35 px-2 py-1 text-[11px] text-slate-300">
              {access.dossierLevel <= 1 ? '来源待确认' : npc.affiliation}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-sm border border-emerald-500/15 bg-black/35 p-2">
                <div className="uppercase tracking-[0.18em] text-emerald-300/45">Access</div>
                <div className="mt-1 text-white">人物 Lv.{access.dossierLevel} / 暗网 Lv.{access.darknetLevel}</div>
              </div>
              <div className="rounded-sm border border-emerald-500/15 bg-black/35 p-2">
                <div className="uppercase tracking-[0.18em] text-emerald-300/45">Tier</div>
                <div className="mt-1 text-white">{access.darknetUnlocked ? darkProfile?.accessTier || '已开放' : '未开放'}</div>
              </div>
              <div className="rounded-sm border border-emerald-500/15 bg-black/35 p-2">
                <div className="uppercase tracking-[0.18em] text-emerald-300/45">Citizen</div>
                <div className="mt-1 text-white">{maskedCitizenId}</div>
              </div>
              <div className="rounded-sm border border-emerald-500/15 bg-black/35 p-2">
                <div className="uppercase tracking-[0.18em] text-emerald-300/45">Handle</div>
                <div className="mt-1 text-white">{maskedDarknetHandle}</div>
              </div>
            </div>
            <div className="mt-3 rounded-sm border border-emerald-500/15 bg-black/30 px-3 py-2 text-[11px] text-slate-400">
              灵网账号：<span className="text-slate-200">{maskedSocialHandle}</span>
              <span className="mx-2 text-slate-600">/</span>
              最后观测：<span className="text-slate-200">{darkProfile?.lastSeen || npc.location || '未知区域'}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(darkProfile?.tags || []).slice(0, 6).map(tag => (
                <span key={tag} className="rounded-sm border border-emerald-500/15 bg-black/30 px-2 py-1 text-[10px] text-slate-300">
                  {tag}
                </span>
              ))}
              {darkProfile?.riskRating ? (
                <span className="rounded-sm border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-[10px] text-amber-200">
                  风险评级 {darkProfile.riskRating}/5
                </span>
              ) : null}
              {darkProfile?.bounty ? (
                <span className="rounded-sm border border-cyan-500/30 bg-cyan-950/20 px-2 py-1 text-[10px] text-cyan-200">
                  {darkProfile.bounty}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-4 shrink-0 overflow-x-auto custom-scrollbar">
        <div className="flex gap-2 min-w-max">
          {[
            { id: 'clue', label: '线索', icon: <BadgeInfo className="w-3 h-3" /> },
            { id: 'dossier', label: '档案', icon: <BookOpen className="w-3 h-3" /> },
            { id: 'album', label: '相册', icon: <ImageIcon className="w-3 h-3" /> },
            { id: 'darknet', label: '暗网', icon: <Globe2 className="w-3 h-3" /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as CodexSection)}
              className={`px-3 py-2 text-[10px] font-bold uppercase tracking-[0.2em] border transition-all flex items-center justify-center gap-2 rounded-sm ${
                activeSection === tab.id
                  ? 'bg-emerald-500/10 border-emerald-300 text-emerald-200'
                  : 'bg-black/40 border-emerald-500/15 text-slate-500 hover:text-emerald-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {activeSection === 'clue' && (
          <CyberPanel title="线索摘录" variant="terminal" className="p-4 space-y-3">
            {clueNotes.map(note => (
              <div key={note} className="rounded-sm border border-emerald-500/15 bg-black/30 px-3 py-2 text-sm leading-6 text-slate-300">
                {note}
              </div>
            ))}
          </CyberPanel>
        )}

        {activeSection === 'dossier' && (
          <CyberPanel title="暗网档案" variant="terminal" className="p-4 space-y-3">
            <div className="rounded-sm border border-emerald-500/15 bg-emerald-500/5 p-3 text-sm leading-6 text-slate-300">
              {darkProfile?.summary || '当前仅建立了最基础的暗网索引，未形成稳定画像。'}
            </div>
            {dossierSections.map(section => {
              const locked = access.dossierLevel < (section.unlockLevel || 1);
              return (
                <div key={section.id} className="rounded-sm border border-emerald-500/15 bg-black/30 p-3">
                  <div className="text-sm font-bold uppercase tracking-[0.16em] text-white">{section.title}</div>
                  <div className={`mt-2 text-sm leading-6 ${locked ? 'text-slate-600 blur-[2px] select-none' : 'text-slate-300'}`}>
                    {locked ? '该条目尚未解锁。' : section.content}
                  </div>
                </div>
              );
            })}
          </CyberPanel>
        )}

        {activeSection === 'album' && (
          <CyberPanel title="人物相册" variant="terminal" className="p-4">
            {galleryItems.length === 0 ? (
              <div className="text-sm text-slate-500">当前还没有为这个人物配置图片。</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {visibleGalleryItems.map((item, index) => {
                  const unlocked = isGalleryUnlocked(item, index);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => unlocked && setLightboxImage({ src: item.src, title: item.title || npc.name, subtitle: item.caption || item.sourceLabel })}
                      className="relative overflow-hidden rounded-sm border border-emerald-500/15 bg-black text-left disabled:cursor-not-allowed"
                    >
                      <img
                        src={item.src}
                        alt={item.title || npc.name}
                        loading="lazy"
                        decoding="async"
                        className={`aspect-[4/5] w-full object-cover ${unlocked ? '' : 'blur-md brightness-50 scale-105'}`}
                      />
                      {!unlocked && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35">
                          <Lock className="w-5 h-5 text-amber-300" />
                          <div className="text-[10px] text-amber-100">继续解锁后可查看</div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {galleryItems.length > visibleGalleryItems.length ? (
              <button
                type="button"
                onClick={() => setVisibleGalleryCount(count => count + GALLERY_BATCH_SIZE)}
                className="mt-3 w-full rounded-sm border border-emerald-500/15 bg-black/30 px-3 py-3 text-sm text-emerald-200 transition hover:border-emerald-300/35 hover:bg-black/40"
              >
                加载更多相册
              </button>
            ) : null}
          </CyberPanel>
        )}

        {activeSection === 'darknet' && (
          <CyberPanel title="暗网记录" variant="terminal" className="p-4 space-y-3">
            {!access.darknetUnlocked ? (
              <div className="rounded-sm border border-dashed border-emerald-500/15 bg-black/20 px-4 py-6 text-center text-sm text-slate-500">
                当前还无法查看该人物的暗网节点。
              </div>
            ) : darknetRecords.length === 0 ? (
              <div className="rounded-sm border border-dashed border-emerald-500/15 bg-black/20 px-4 py-6 text-center text-sm text-slate-500">
                当前没有可显示的暗网记录。
              </div>
            ) : (
              visibleDarknetRecords.map((record, index) => {
                const unlocked = isIntelUnlocked(record, index);
                return (
                  <div key={record.id} className="overflow-hidden rounded-md border border-emerald-500/15 bg-[linear-gradient(180deg,rgba(5,10,8,0.98),rgba(3,7,6,0.98))]">
                    <div className="flex items-start justify-between gap-3 px-3 py-3 border-b border-emerald-500/10">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold uppercase tracking-[0.12em] text-white truncate">{unlocked ? record.title : '未解锁记录'}</div>
                        <div className="mt-1 text-[11px] text-slate-500 truncate">
                          {unlocked
                            ? `${record.source || '匿名源'} · ${record.location || darkProfile?.lastSeen || '暗网节点'} · ${formatRecordTime(record.timestamp)}`
                            : `需要暗网等级 Lv.${record.unlockLevel || 2} 或继续推进关系后解锁`}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] ${getRiskClassName(record)}`}>
                        {getRiskLabel(record)}
                      </span>
                    </div>

                    {record.image ? (
                      <button
                        type="button"
                        disabled={!unlocked}
                        onClick={() => unlocked && setLightboxImage({ src: record.image!, title: record.title, subtitle: record.content })}
                        className="block w-full disabled:cursor-not-allowed"
                      >
                        <img
                          src={record.image}
                          alt={record.title}
                          loading="lazy"
                          decoding="async"
                          className={`aspect-[16/9] w-full object-cover ${unlocked ? '' : 'blur-md brightness-50 scale-105'}`}
                        />
                      </button>
                    ) : null}

                    <div className="p-3">
                      <div className={`text-sm leading-6 ${unlocked ? 'text-slate-200' : 'text-slate-600 blur-[2px] select-none'}`}>
                        {unlocked ? record.content : '该条记录已经入库，但正文仍处于加密/折叠状态。'}
                      </div>
                      {(record.tags || []).length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {(record.tags || []).map(tag => (
                            <span key={tag} className={`rounded-sm border px-2 py-1 text-[10px] ${unlocked ? 'border-emerald-500/15 bg-black/20 text-slate-300' : 'border-slate-900 bg-black/30 text-slate-600'}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
            {darknetRecords.length > visibleDarknetRecords.length ? (
              <button
                type="button"
                onClick={() => setVisibleRecordCount(count => count + RECORD_BATCH_SIZE)}
                className="w-full rounded-sm border border-emerald-500/15 bg-black/30 px-3 py-3 text-sm text-emerald-200 transition hover:border-emerald-300/35 hover:bg-black/40"
              >
                加载更多情报记录
              </button>
            ) : null}
          </CyberPanel>
        )}
      </div>

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          title={lightboxImage.title}
          subtitle={lightboxImage.subtitle}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
};

export default NpcCodexEntryPanel;
