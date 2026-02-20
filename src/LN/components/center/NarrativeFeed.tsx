import React, { useEffect, useRef } from 'react';
import { Message } from '../../types';
import { hasPseudoLayer, parsePseudoLayer } from '../../utils/pseudoLayer';

interface Props {
  messages: Message[];
  pseudoLayerMode?: boolean;
  focusLayerId?: string | null;
  onLayerContextMenu?: (payload: { x: number; y: number; messageId: string; sender: 'Player' | 'System' }) => void;
}

const CONTENT_REGEX = /(\*[^*]+\*|\[[^\]]+\]|\{[^}]+\}|<[^>]+>)/g;

const NarrativeFeed: React.FC<Props> = ({
  messages,
  pseudoLayerMode = false,
  focusLayerId = null,
  onLayerContextMenu,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(CONTENT_REGEX);
    return parts.map((part, index) => {
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <span key={index} className="font-bold text-fuchsia-400">
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span key={index} className="text-amber-400 font-mono font-bold mx-1">
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith('{') && part.endsWith('}')) {
        return (
          <span key={index} className="text-rose-500 font-bold mx-1">
            {part.slice(1, -1)}
          </span>
        );
      }
      if (part.startsWith('<') && part.endsWith('>')) {
        return (
          <span key={index} className="text-purple-400 italic mx-1">
            {part.slice(1, -1)}
          </span>
        );
      }
      return part;
    });
  };

  const normalizeMaintext = (text: string) => text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

  const renderParagraphs = (text: string) => {
    const normalized = normalizeMaintext(text);
    const paragraphs = normalized.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    if (paragraphs.length === 0) return <span>（空内容）</span>;
    return paragraphs.map((paragraph, index) => (
      <p key={index} className="mb-3 last:mb-0 whitespace-pre-wrap">
        {renderMessageContent(paragraph)}
      </p>
    ));
  };

  if (pseudoLayerMode) {
    const timeline = messages.filter(msg => msg.sender === 'Player' || (msg.sender === 'System' && hasPseudoLayer(msg.content)));
    if (timeline.length === 0) {
      return (
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative z-10 font-sans text-sm">
          <div className="border border-slate-800 bg-black/30 p-4 text-slate-400">暂无可显示楼层。先发送一条行动开始流程。</div>
        </div>
      );
    }

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10 font-sans text-sm">
        <div className="sticky top-0 h-6 bg-gradient-to-b from-[#080408] to-transparent pointer-events-none z-20" />
        {timeline.map(msg => {
          if (msg.sender === 'Player') {
            const openPlayerMenu = (x: number, y: number) => {
              onLayerContextMenu?.({ x, y, messageId: msg.id, sender: 'Player' });
            };
            const handlePlayerContextMenu: React.MouseEventHandler<HTMLDivElement> = e => {
              e.preventDefault();
              openPlayerMenu(e.clientX, e.clientY);
            };
            const handlePlayerTouchStart: React.TouchEventHandler<HTMLDivElement> = e => {
              const touch = e.touches[0];
              if (!touch) return;
              clearLongPressTimer();
              longPressTimerRef.current = window.setTimeout(() => {
                openPlayerMenu(touch.clientX, touch.clientY);
                clearLongPressTimer();
              }, 550);
            };
            const handlePlayerTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
              clearLongPressTimer();
            };
            return (
              <div key={msg.id} className="animate-in fade-in slide-in-from-left-2 duration-200">
                <div
                  className="flex gap-2 text-fuchsia-500 mt-2 mb-1 font-mono text-sm w-fit max-w-[95%] bg-fuchsia-950/10 p-2 rounded-lg border-l-2 border-fuchsia-500 cursor-context-menu"
                  onContextMenu={handlePlayerContextMenu}
                  onTouchStart={handlePlayerTouchStart}
                  onTouchEnd={handlePlayerTouchEnd}
                  onTouchCancel={handlePlayerTouchEnd}
                  onTouchMove={handlePlayerTouchEnd}
                >
                  <span className="font-bold select-none">{'>'}</span>
                  <span className="text-fuchsia-100 opacity-90">{renderMessageContent(msg.content)}</span>
                </div>
              </div>
            );
          }

          const parsed = hasPseudoLayer(msg.content) ? parsePseudoLayer(msg.content) : { maintext: msg.content || '', options: [], sum: '' };
          const openLayerMenu = (x: number, y: number) => {
            onLayerContextMenu?.({ x, y, messageId: msg.id, sender: 'System' });
          };
          const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = e => {
            e.preventDefault();
            openLayerMenu(e.clientX, e.clientY);
          };
          const handleTouchStart: React.TouchEventHandler<HTMLDivElement> = e => {
            const touch = e.touches[0];
            if (!touch) return;
            clearLongPressTimer();
            longPressTimerRef.current = window.setTimeout(() => {
              openLayerMenu(touch.clientX, touch.clientY);
              clearLongPressTimer();
            }, 550);
          };
          const handleTouchEnd: React.TouchEventHandler<HTMLDivElement> = () => {
            clearLongPressTimer();
          };

          return (
            <div key={msg.id} className="animate-in fade-in slide-in-from-left-2 duration-200">
              <div
                className={`border bg-[#09040c]/90 p-4 cursor-context-menu ${
                  focusLayerId === msg.id ? 'border-fuchsia-500/60' : 'border-fuchsia-900/40'
                }`}
                onContextMenu={handleContextMenu}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onTouchMove={handleTouchEnd}
              >
                <div className="text-slate-200 leading-7 whitespace-normal break-words">
                  {renderParagraphs(parsed.maintext || '（该层缺少 <maintext>）')}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative z-10 font-sans text-sm">
      <div className="sticky top-0 h-6 bg-gradient-to-b from-[#080408] to-transparent pointer-events-none z-20" />

      {messages.map(msg => (
        <div key={msg.id} className="animate-in fade-in slide-in-from-left-2 duration-200">
          {msg.sender === 'Player' && (
            <div className="flex gap-2 text-fuchsia-500 mt-4 mb-1 font-mono text-sm w-fit max-w-[90%] bg-fuchsia-950/10 p-2 rounded-lg border-l-2 border-fuchsia-500">
              <span className="font-bold select-none">{'>'}</span>
              <span className="text-fuchsia-100 opacity-90">{renderMessageContent(msg.content)}</span>
            </div>
          )}

          {(msg.sender === 'System' || msg.type === 'narrative') && (
            <div className="pl-3 border-l-2 border-slate-700 text-slate-300 leading-relaxed opacity-90 hover:opacity-100 hover:border-fuchsia-900/50 transition-colors py-1 whitespace-pre-wrap">
              {renderMessageContent(msg.content)}
            </div>
          )}

          {msg.sender === 'NPC' && (
            <div className="mt-2 mb-1 pl-3 border-l-2 border-amber-900/40 bg-amber-950/10 p-2 rounded-r">
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block mb-0.5">{msg.name || '未知'}</span>
              <div className="text-slate-200 italic opacity-90">"{renderMessageContent(msg.content)}"</div>
            </div>
          )}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default NarrativeFeed;
