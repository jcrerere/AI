import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import CyberPanel from '../ui/CyberPanel';
import { Message, Zone } from '../../types';

interface Props {
  zones: Zone[];
  messages: Message[];
  currentLocation?: string;
}

interface MapRect {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

interface MapLink {
  id: string;
  from: string;
  to: string;
  name: string;
}

interface ContextMenuState {
  open: boolean;
  screenX: number;
  screenY: number;
  canvasX: number;
  canvasY: number;
  targetRectId: string | null;
}

type EditLevel = 'region' | 'building';

const CANVAS_WIDTH = 1400;
const CANVAS_HEIGHT = 900;
const MIN_SIZE = 40;
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 2.4;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const createRect = (index: number, label: '区域' | '建筑'): MapRect => ({
  id: `rect_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: `${label} ${index + 1}`,
  x: 220 + ((index * 60) % 520),
  y: 180 + ((index * 60) % 320),
  width: 210,
  height: 130,
  rotation: 0,
});

const GeoMap: React.FC<Props> = ({ zones, messages, currentLocation }) => {
  const initialRegions = useMemo<MapRect[]>(() => {
    if (!zones?.length) return [createRect(0, '区域')];
    return zones.slice(0, 6).map((zone, index) => ({
      ...createRect(index, '区域'),
      name: zone.name || `区域 ${index + 1}`,
    }));
  }, [zones]);

  const [regions, setRegions] = useState<MapRect[]>(initialRegions);
  const [selectedRegionId, setSelectedRegionId] = useState<string>(initialRegions[0]?.id || '');
  const [regionLinks, setRegionLinks] = useState<MapLink[]>([]);
  const [buildingsByRegion, setBuildingsByRegion] = useState<Record<string, MapRect[]>>({});
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');

  const [editLevel, setEditLevel] = useState<EditLevel>('region');
  const [draggingRectId, setDraggingRectId] = useState<string | null>(null);
  const [linkStartRegionId, setLinkStartRegionId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorZoom, setEditorZoom] = useState(1.25);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    open: false,
    screenX: 0,
    screenY: 0,
    canvasX: 0,
    canvasY: 0,
    targetRectId: null,
  });

  const topDoc = (() => {
    try {
      return window.top?.document || document;
    } catch {
      return document;
    }
  })();

  const isBuildingLevel = editLevel === 'building';
  const activeRegion = regions.find(r => r.id === selectedRegionId) || null;
  const activeBuildings = buildingsByRegion[selectedRegionId] || [];
  const activeRects = isBuildingLevel ? activeBuildings : regions;
  const selectedRect = isBuildingLevel
    ? activeBuildings.find(rect => rect.id === selectedBuildingId) || null
    : regions.find(rect => rect.id === selectedRegionId) || null;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, open: false }));
        setLinkStartRegionId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedRegionId && regions.length > 0) {
      setSelectedRegionId(regions[0].id);
    }
  }, [regions, selectedRegionId]);

  useEffect(() => {
    if (!isBuildingLevel) return;
    if (!selectedRegionId) {
      setEditLevel('region');
      return;
    }
    const list = buildingsByRegion[selectedRegionId] || [];
    if (list.length === 0) {
      setSelectedBuildingId('');
      return;
    }
    const exists = list.some(item => item.id === selectedBuildingId);
    if (!exists) setSelectedBuildingId(list[0].id);
  }, [buildingsByRegion, isBuildingLevel, selectedBuildingId, selectedRegionId]);

  useEffect(() => {
    if (!isEditorOpen) {
      setEditorZoom(1.25);
      setContextMenu(prev => ({ ...prev, open: false }));
      setDraggingRectId(null);
      setLinkStartRegionId(null);
    }
  }, [isEditorOpen]);

  useEffect(() => {
    const onFsChange = () => {
      if (!topDoc.fullscreenElement && isEditorOpen) {
        setEditorZoom(1.25);
      }
    };
    topDoc.addEventListener('fullscreenchange', onFsChange);
    return () => topDoc.removeEventListener('fullscreenchange', onFsChange);
  }, [isEditorOpen, topDoc]);

  const setRectsByLevel = (updater: (prev: MapRect[]) => MapRect[]) => {
    if (isBuildingLevel) {
      if (!selectedRegionId) return;
      setBuildingsByRegion(prev => ({ ...prev, [selectedRegionId]: updater(prev[selectedRegionId] || []) }));
      return;
    }
    setRegions(updater);
  };

  const setSelectedIdByLevel = (id: string) => {
    if (isBuildingLevel) {
      setSelectedBuildingId(id);
      return;
    }
    setSelectedRegionId(id);
  };

  const getCanvasPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const ratioX = CANVAS_WIDTH / bounds.width;
    const ratioY = CANVAS_HEIGHT / bounds.height;
    return {
      x: (event.clientX - bounds.left) * ratioX,
      y: (event.clientY - bounds.top) * ratioY,
    };
  };

  const rectCenter = (id: string) => {
    const rect = regions.find(r => r.id === id);
    if (!rect) return null;
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  };

  const patchRect = (rectId: string, patch: Partial<MapRect>) => {
    setRectsByLevel(prev => prev.map(rect => (rect.id === rectId ? { ...rect, ...patch } : rect)));
  };

  const patchSelectedRect = (patch: Partial<MapRect>) => {
    if (!selectedRect) return;
    patchRect(selectedRect.id, patch);
  };

  const addRectAt = (canvasX: number, canvasY: number, name?: string) => {
    const label: '区域' | '建筑' = isBuildingLevel ? '建筑' : '区域';
    const next = createRect(activeRects.length, label);
    const placed: MapRect = {
      ...next,
      name: name?.trim() || next.name,
      x: clamp(canvasX - next.width / 2, 0, CANVAS_WIDTH - next.width),
      y: clamp(canvasY - next.height / 2, 0, CANVAS_HEIGHT - next.height),
    };
    setRectsByLevel(prev => [...prev, placed]);
    setSelectedIdByLevel(placed.id);
  };

  const deleteRect = (rectId: string) => {
    if (isBuildingLevel) {
      const nextBuildings = activeBuildings.filter(rect => rect.id !== rectId);
      setBuildingsByRegion(prev => ({ ...prev, [selectedRegionId]: nextBuildings }));
      if (selectedBuildingId === rectId) setSelectedBuildingId(nextBuildings[0]?.id || '');
      return;
    }

    const nextRegions = regions.filter(rect => rect.id !== rectId);
    setRegions(nextRegions);
    setRegionLinks(prev => prev.filter(link => link.from !== rectId && link.to !== rectId));
    setLinkStartRegionId(prev => (prev === rectId ? null : prev));
    const removedBuildings = buildingsByRegion[rectId];
    if (removedBuildings) {
      const { [rectId]: _, ...rest } = buildingsByRegion;
      setBuildingsByRegion(rest);
    }
    if (selectedRegionId === rectId) {
      setSelectedRegionId(nextRegions[0]?.id || '');
      setSelectedBuildingId('');
    }
  };

  const createRegionLink = (fromId: string, toId: string) => {
    if (!fromId || !toId || fromId === toId) return;
    const exists = regionLinks.some(
      link => (link.from === fromId && link.to === toId) || (link.from === toId && link.to === fromId),
    );
    if (exists) return;
    const name = window.prompt('请输入连接名称', '通道');
    if (name === null) return;
    setRegionLinks(prev => [
      ...prev,
      {
        id: `link_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        from: fromId,
        to: toId,
        name: name.trim() || '未命名通道',
      },
    ]);
    setLinkStartRegionId(null);
  };

  const onCanvasContextMenu = (event: React.MouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    const point = getCanvasPoint(event);
    setContextMenu({
      open: true,
      screenX: event.clientX,
      screenY: event.clientY,
      canvasX: point.x,
      canvasY: point.y,
      targetRectId: null,
    });
  };

  const onRectContextMenu = (event: React.MouseEvent<SVGGElement>, rectId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const point = getCanvasPoint(event as unknown as React.MouseEvent<SVGSVGElement>);
    setSelectedIdByLevel(rectId);
    setContextMenu({
      open: true,
      screenX: event.clientX,
      screenY: event.clientY,
      canvasX: point.x,
      canvasY: point.y,
      targetRectId: rectId,
    });
  };

  const closeContextMenu = () => setContextMenu(prev => ({ ...prev, open: false }));

  const rotateRect = (rectId: string, delta: number) => {
    const target = activeRects.find(rect => rect.id === rectId);
    if (!target) return;
    patchRect(rectId, { rotation: target.rotation + delta });
  };

  const renameRect = (rectId: string) => {
    const target = activeRects.find(rect => rect.id === rectId);
    if (!target) return;
    const title = isBuildingLevel ? '请输入建筑名称' : '请输入区域名称';
    const nextName = window.prompt(title, target.name);
    if (nextName === null) return;
    patchRect(rectId, { name: nextName.trim() || target.name });
  };

  const updateRectNumberField = (key: 'x' | 'y' | 'width' | 'height' | 'rotation', value: string) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    if (key === 'width' || key === 'height') {
      patchSelectedRect({ [key]: Math.max(MIN_SIZE, num) } as Partial<MapRect>);
      return;
    }
    if (key === 'x') {
      patchSelectedRect({ x: clamp(num, 0, CANVAS_WIDTH - (selectedRect?.width || 0)) });
      return;
    }
    if (key === 'y') {
      patchSelectedRect({ y: clamp(num, 0, CANVAS_HEIGHT - (selectedRect?.height || 0)) });
      return;
    }
    patchSelectedRect({ rotation: num });
  };

  const startBuildingEdit = () => {
    if (!selectedRegionId) return;
    setEditLevel('building');
    const list = buildingsByRegion[selectedRegionId] || [];
    setSelectedBuildingId(list[0]?.id || '');
    setLinkStartRegionId(null);
  };

  const backToRegionLevel = () => {
    setEditLevel('region');
    setSelectedBuildingId('');
    setLinkStartRegionId(null);
  };

  const requestNativeFullscreen = async () => {
    try {
      if (!topDoc.fullscreenElement) {
        await topDoc.documentElement.requestFullscreen();
      }
    } catch (error) {
      console.error('进入系统全屏失败:', error);
    }
  };

  const exitNativeFullscreen = async () => {
    try {
      if (topDoc.fullscreenElement) {
        await topDoc.exitFullscreen();
      }
    } catch (error) {
      console.error('退出系统全屏失败:', error);
    }
  };

  const mapSvg = (
    <svg
      viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      style={{
        width: '100%',
        height: '100%',
        transform: isEditorOpen ? `scale(${editorZoom})` : 'none',
        transformOrigin: 'center center',
        transition: draggingRectId ? 'none' : 'transform 120ms ease-out',
      }}
      onContextMenu={onCanvasContextMenu}
      onMouseUp={() => setDraggingRectId(null)}
      onMouseLeave={() => setDraggingRectId(null)}
      onMouseMove={event => {
        if (!draggingRectId) return;
        const svg = event.currentTarget;
        const bounds = svg.getBoundingClientRect();
        const ratioX = CANVAS_WIDTH / bounds.width;
        const ratioY = CANVAS_HEIGHT / bounds.height;
        const x = (event.clientX - bounds.left) * ratioX;
        const y = (event.clientY - bounds.top) * ratioY;
        setRectsByLevel(prev =>
          prev.map(rect => {
            if (rect.id !== draggingRectId) return rect;
            return {
              ...rect,
              x: clamp(x - rect.width / 2, 0, CANVAS_WIDTH - rect.width),
              y: clamp(y - rect.height / 2, 0, CANVAS_HEIGHT - rect.height),
            };
          }),
        );
      }}
      onClick={closeContextMenu}
    >
      <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="#07090f" />
      <defs>
        <pattern id="mapGrid" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
        </pattern>
      </defs>
      <rect x="0" y="0" width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#mapGrid)" />

      {!isBuildingLevel &&
        regionLinks.map(link => {
          const from = rectCenter(link.from);
          const to = rectCenter(link.to);
          if (!from || !to) return null;
          const cx = (from.x + to.x) / 2;
          const cy = (from.y + to.y) / 2;
          return (
            <g key={link.id}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="rgba(34,211,238,0.9)" strokeWidth="4" />
              <rect x={cx - 58} y={cy - 14} width={116} height={28} rx={6} fill="rgba(2,6,23,0.88)" stroke="rgba(56,189,248,0.6)" />
              <text x={cx} y={cy + 5} textAnchor="middle" fill="#67e8f9" fontSize="14" fontWeight="700">
                {link.name}
              </text>
            </g>
          );
        })}

      {activeRects.map(rect => {
        const isSelected = rect.id === (isBuildingLevel ? selectedBuildingId : selectedRegionId);
        const cx = rect.x + rect.width / 2;
        const cy = rect.y + rect.height / 2;
        return (
          <g
            key={rect.id}
            transform={`rotate(${rect.rotation} ${cx} ${cy})`}
            onMouseDown={() => setDraggingRectId(rect.id)}
            onClick={event => {
              event.stopPropagation();
              setSelectedIdByLevel(rect.id);
              closeContextMenu();
            }}
            onContextMenu={event => onRectContextMenu(event, rect.id)}
          >
            <rect
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              rx="10"
              fill={isSelected ? 'rgba(56,189,248,0.28)' : 'rgba(15,23,42,0.82)'}
              stroke={isSelected ? '#22d3ee' : '#64748b'}
              strokeWidth={isSelected ? 4 : 2}
              style={{ cursor: 'move' }}
            />
            <text x={cx} y={cy} textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700">
              {rect.name}
            </text>
          </g>
        );
      })}
    </svg>
  );

  const contextMenuNode =
    contextMenu.open && isEditorOpen ? (
      <div
        className="fixed z-[2147483647] min-w-[180px] border border-slate-700 bg-[#05080f] shadow-[0_10px_30px_rgba(0,0,0,0.6)] text-xs"
        style={{ left: contextMenu.screenX, top: contextMenu.screenY }}
      >
        {!contextMenu.targetRectId && (
          <button
            onClick={() => {
              const defaultName = `${isBuildingLevel ? '建筑' : '区域'} ${activeRects.length + 1}`;
              const promptText = isBuildingLevel ? '请输入新建筑名称' : '请输入新区域名称';
              const name = window.prompt(promptText, defaultName);
              if (name !== null) addRectAt(contextMenu.canvasX, contextMenu.canvasY, name);
              closeContextMenu();
            }}
            className="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800/60"
          >
            {isBuildingLevel ? '在此创建建筑' : '在此创建区域'}
          </button>
        )}

        {contextMenu.targetRectId && (
          <>
            {!isBuildingLevel &&
              (linkStartRegionId && linkStartRegionId !== contextMenu.targetRectId ? (
                <button
                  onClick={() => {
                    createRegionLink(linkStartRegionId, contextMenu.targetRectId as string);
                    closeContextMenu();
                  }}
                  className="block w-full text-left px-3 py-2 text-cyan-300 hover:bg-slate-800/60"
                >
                  连接到此区域
                </button>
              ) : (
                <button
                  onClick={() => {
                    setLinkStartRegionId(contextMenu.targetRectId);
                    closeContextMenu();
                  }}
                  className="block w-full text-left px-3 py-2 text-cyan-300 hover:bg-slate-800/60"
                >
                  从此区域发起连接
                </button>
              ))}

            <button
              onClick={() => {
                renameRect(contextMenu.targetRectId as string);
                closeContextMenu();
              }}
              className="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800/60"
            >
              重命名{isBuildingLevel ? '建筑' : '区域'}
            </button>
            <button
              onClick={() => {
                rotateRect(contextMenu.targetRectId as string, 15);
                closeContextMenu();
              }}
              className="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800/60"
            >
              顺时针旋转 15°
            </button>
            <button
              onClick={() => {
                rotateRect(contextMenu.targetRectId as string, -15);
                closeContextMenu();
              }}
              className="block w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800/60"
            >
              逆时针旋转 15°
            </button>
            <button
              onClick={() => {
                deleteRect(contextMenu.targetRectId as string);
                closeContextMenu();
              }}
              className="block w-full text-left px-3 py-2 text-rose-300 hover:bg-slate-800/60"
            >
              删除{isBuildingLevel ? '建筑' : '区域'}
            </button>
          </>
        )}

        {!isBuildingLevel && linkStartRegionId && (
          <button
            onClick={() => {
              setLinkStartRegionId(null);
              closeContextMenu();
            }}
            className="block w-full text-left px-3 py-2 text-amber-300 hover:bg-slate-800/60 border-t border-slate-800"
          >
            取消连接发起
          </button>
        )}
      </div>
    ) : null;

  const overlayNode =
    isEditorOpen &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[2147483646] bg-black/92 backdrop-blur-sm flex items-center justify-center p-0"
          onClick={() => setIsEditorOpen(false)}
        >
          <div
            className="w-screen h-screen border border-slate-700 bg-[#05080f] overflow-hidden flex flex-col"
            onClick={event => event.stopPropagation()}
          >
            <div className="h-11 shrink-0 border-b border-slate-800 px-3 flex items-center justify-between bg-black/50 gap-2">
              <div className="text-xs text-slate-200 font-semibold truncate">
                地图编辑（居中放大）
                {isBuildingLevel && activeRegion ? ` · 建筑层：${activeRegion.name}` : ''}
                {!isBuildingLevel && linkStartRegionId ? ' · 已发起连接，请右键目标区域' : ''}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditorZoom(prev => clamp(prev - 0.1, MIN_ZOOM, MAX_ZOOM))}
                  className="px-2 py-1 text-xs border border-slate-700 text-slate-200 hover:border-slate-400"
                >
                  缩小
                </button>
                <button
                  onClick={() => setEditorZoom(1.25)}
                  className="px-2 py-1 text-xs border border-slate-700 text-slate-200 hover:border-slate-400"
                >
                  重置缩放
                </button>
                <button
                  onClick={() => setEditorZoom(prev => clamp(prev + 0.1, MIN_ZOOM, MAX_ZOOM))}
                  className="px-2 py-1 text-xs border border-slate-700 text-slate-200 hover:border-slate-400"
                >
                  放大
                </button>
                {!topDoc.fullscreenElement ? (
                  <button
                    onClick={requestNativeFullscreen}
                    className="px-2 py-1 text-xs border border-fuchsia-700 text-fuchsia-300 hover:text-white hover:border-fuchsia-500"
                  >
                    系统全屏
                  </button>
                ) : (
                  <button
                    onClick={exitNativeFullscreen}
                    className="px-2 py-1 text-xs border border-fuchsia-700 text-fuchsia-300 hover:text-white hover:border-fuchsia-500"
                  >
                    退出系统全屏
                  </button>
                )}
                <button
                  onClick={() => setIsEditorOpen(false)}
                  className="px-2 py-1 text-xs border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500"
                >
                  关闭
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-2">
              <div className="w-full h-full border border-slate-800 bg-black/60 overflow-hidden">{mapSvg}</div>
            </div>
          </div>
        </div>
        {contextMenuNode}
      </>,
      document.body,
    );

  const selectedRegionName = activeRegion?.name || '未选中区域';

  return (
    <div className="flex flex-col h-full space-y-3">
      <CyberPanel title="地图编辑器（区域 / 建筑）" noPadding>
        <div className="p-2 border-b border-slate-800 bg-black/30 flex items-center gap-2 text-[11px]">
          <button
            onClick={() => setIsEditorOpen(true)}
            className="px-2 py-1 border border-slate-700 text-fuchsia-300 hover:text-white hover:border-fuchsia-500"
          >
            地图全屏编辑
          </button>
          {!isBuildingLevel ? (
            <button
              onClick={startBuildingEdit}
              disabled={!selectedRegionId}
              className="px-2 py-1 border border-cyan-700 text-cyan-300 hover:text-white hover:border-cyan-500 disabled:opacity-40"
            >
              编辑选中区域建筑
            </button>
          ) : (
            <button
              onClick={backToRegionLevel}
              className="px-2 py-1 border border-amber-700 text-amber-300 hover:text-white hover:border-amber-500"
            >
              返回区域层
            </button>
          )}
          <div className="text-slate-500">
            {isBuildingLevel ? `当前建筑层：${selectedRegionName}` : '右键空白创建区域，右键区域发起/完成连接'}
          </div>
        </div>
        <div className="w-full min-h-[320px] h-[48vh] bg-black/40 border-t border-slate-800 overflow-hidden">{mapSvg}</div>
      </CyberPanel>

      <div className="px-2 py-2 border border-slate-800 bg-black/30 text-[11px] text-slate-300 space-y-1">
        <div>
          <span className="text-slate-100 font-bold">当前层级:</span> {isBuildingLevel ? `建筑层（${selectedRegionName}）` : '区域层'}
        </div>
        <div>
          <span className="text-slate-100 font-bold">当前位置:</span> {currentLocation || '未知'}
        </div>
        <div>
          <span className="text-slate-100 font-bold">对话数:</span> {messages.length}
        </div>
        <div>
          <span className="text-slate-100 font-bold">区域 / 建筑:</span> {regions.length} / {Object.values(buildingsByRegion).reduce((sum, list) => sum + list.length, 0)}
        </div>
        <div>
          <span className="text-slate-100 font-bold">区域连接:</span> {regionLinks.length}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <CyberPanel title={isBuildingLevel ? '建筑属性' : '区域属性'} className="space-y-2">
          {selectedRect ? (
            <>
              <div className="text-[11px] text-slate-400">选中 ID: {selectedRect.id}</div>
              <label className="space-y-1 block">
                <span className="text-slate-500 text-xs">{isBuildingLevel ? '建筑名' : '区域名'}</span>
                <input
                  value={selectedRect.name}
                  onChange={e => patchSelectedRect({ name: e.target.value })}
                  className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-xs text-slate-200"
                  placeholder={isBuildingLevel ? '建筑名' : '区域名'}
                />
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="space-y-1">
                  <span className="text-slate-500">X</span>
                  <input type="number" value={Math.round(selectedRect.x)} onChange={e => updateRectNumberField('x', e.target.value)} className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-slate-200" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Y</span>
                  <input type="number" value={Math.round(selectedRect.y)} onChange={e => updateRectNumberField('y', e.target.value)} className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-slate-200" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">宽度</span>
                  <input type="number" value={Math.round(selectedRect.width)} onChange={e => updateRectNumberField('width', e.target.value)} className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-slate-200" />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">高度</span>
                  <input type="number" value={Math.round(selectedRect.height)} onChange={e => updateRectNumberField('height', e.target.value)} className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-slate-200" />
                </label>
                <label className="space-y-1 col-span-2">
                  <span className="text-slate-500">旋转角度</span>
                  <input type="number" value={Math.round(selectedRect.rotation)} onChange={e => updateRectNumberField('rotation', e.target.value)} className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-slate-200" />
                </label>
              </div>
            </>
          ) : (
            <div className="text-xs text-slate-500">{isBuildingLevel ? '先在当前区域创建并选中一个建筑。' : '先右键创建并选中一个区域。'}</div>
          )}
        </CyberPanel>

        {!isBuildingLevel ? (
          <CyberPanel title="区域连接列表" className="space-y-2">
            <div className="max-h-52 overflow-auto space-y-1 text-xs">
              {regionLinks.length === 0 ? (
                <div className="text-slate-500">暂无连接</div>
              ) : (
                regionLinks.map(link => {
                  const from = regions.find(r => r.id === link.from)?.name || link.from;
                  const to = regions.find(r => r.id === link.to)?.name || link.to;
                  return (
                    <div key={link.id} className="border border-slate-800 bg-black/30 p-2 space-y-1">
                      <div className="text-slate-300">
                        {from} -&gt; {to}
                      </div>
                      <input
                        value={link.name}
                        onChange={e => setRegionLinks(prev => prev.map(item => (item.id === link.id ? { ...item, name: e.target.value } : item)))}
                        className="w-full bg-black/40 border border-slate-700 px-2 py-1 text-slate-200"
                      />
                      <button onClick={() => setRegionLinks(prev => prev.filter(item => item.id !== link.id))} className="text-rose-300 hover:text-rose-200">
                        删除连接
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </CyberPanel>
        ) : (
          <CyberPanel title="当前区域建筑清单" className="space-y-2">
            {!activeRegion ? (
              <div className="text-xs text-slate-500">未选中区域。</div>
            ) : (
              <div className="space-y-1 max-h-52 overflow-auto text-xs">
                {activeBuildings.length === 0 ? (
                  <div className="text-slate-500">暂无建筑。可在画布右键创建建筑。</div>
                ) : (
                  activeBuildings.map(building => (
                    <button
                      key={building.id}
                      type="button"
                      onClick={() => setSelectedBuildingId(building.id)}
                      className={`w-full text-left px-2 py-1 border ${selectedBuildingId === building.id ? 'border-cyan-500 bg-cyan-900/20 text-cyan-200' : 'border-slate-700 text-slate-300 hover:bg-slate-900/40'}`}
                    >
                      {building.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </CyberPanel>
        )}
      </div>

      {overlayNode}
    </div>
  );
};

export default GeoMap;
