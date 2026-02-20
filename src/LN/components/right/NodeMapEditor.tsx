import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CyberPanel from '../ui/CyberPanel';
import { LocationNode, MapPosition, MapRuntimeData, RegionNode, StreetNode, WorldNodeMapData } from '../../types';
import { MAP_OUTPUT_PROMPT, mergeWorldNodeMap, normalizeWorldNodeMap } from '../../utils/mapData';

interface NodeMapEditorProps {
  data: WorldNodeMapData;
  onChange: (next: WorldNodeMapData) => void;
  runtime: MapRuntimeData;
  onRuntimeChange: (next: MapRuntimeData) => void;
  onDescribe: (title: string, description: string, images?: string[]) => void;
  onImportFromChat?: (mode: 'replace' | 'merge') => { ok: boolean; message: string };
}

type ViewLevel = 'region' | 'street' | 'location';

type ContextMenuState = {
  x: number;
  y: number;
  level: ViewLevel;
  id: string;
  regionId?: string;
  streetId?: string;
};

type EditorState = {
  open: boolean;
  level: ViewLevel;
  id: string;
  regionId?: string;
  streetId?: string;
  title: string;
  summary: string;
  images: string[];
  urlDraft: string;
};

type PreviewState = {
  open: boolean;
  title: string;
  summary: string;
  images: string[];
};

const makeId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

const NodeMapEditor: React.FC<NodeMapEditorProps> = ({ data, onChange, runtime, onRuntimeChange, onDescribe, onImportFromChat }) => {
  const [viewLevel, setViewLevel] = useState<ViewLevel>('region');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedStreetId, setSelectedStreetId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    level: 'region',
    id: '',
    title: '',
    summary: '',
    images: [],
    urlDraft: '',
  });
  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    title: '',
    summary: '',
    images: [],
  });
  const [toolNotice, setToolNotice] = useState('');

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const regions = data.map.regions;
  const selectedRegion = useMemo(() => regions.find(r => r.id === selectedRegionId) || null, [regions, selectedRegionId]);
  const selectedStreet = useMemo(
    () => selectedRegion?.streets.find(s => s.id === selectedStreetId) || null,
    [selectedRegion, selectedStreetId],
  );
  const selectedLocation = useMemo(
    () => selectedStreet?.locations.find(l => l.id === selectedLocationId) || null,
    [selectedStreet, selectedLocationId],
  );

  const updateRegions = (updater: (prev: RegionNode[]) => RegionNode[]) => {
    onChange({ ...data, map: { ...data.map, regions: updater(data.map.regions) } });
  };

  useEffect(() => {
    if (selectedRegionId && !regions.some(r => r.id === selectedRegionId)) {
      setSelectedRegionId('');
      setSelectedStreetId('');
      setSelectedLocationId('');
      setViewLevel('region');
    }
  }, [regions, selectedRegionId]);

  useEffect(() => {
    if (!selectedRegion && selectedStreetId) {
      setSelectedStreetId('');
      setSelectedLocationId('');
      return;
    }
    if (selectedRegion && selectedStreetId && !selectedRegion.streets.some(s => s.id === selectedStreetId)) {
      setSelectedStreetId('');
      setSelectedLocationId('');
    }
  }, [selectedRegion, selectedStreetId]);

  useEffect(() => {
    if (!selectedStreet && selectedLocationId) {
      setSelectedLocationId('');
      return;
    }
    if (selectedStreet && selectedLocationId && !selectedStreet.locations.some(l => l.id === selectedLocationId)) {
      setSelectedLocationId('');
    }
  }, [selectedStreet, selectedLocationId]);

  useEffect(() => () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const findRegion = (regionId: string) => regions.find(r => r.id === regionId) || null;
  const findStreet = (regionId: string, streetId: string) => findRegion(regionId)?.streets.find(s => s.id === streetId) || null;
  const findLocation = (regionId: string, streetId: string, locationId: string) =>
    findStreet(regionId, streetId)?.locations.find(l => l.id === locationId) || null;

  const openPreview = (title: string, summary: string, images: string[]) => {
    setPreview({ open: true, title, summary: summary || '暂无描述', images: images || [] });
  };

  const emitAndPreviewRegion = (region: RegionNode) => {
    const title = `区域：${region.name}`;
    const summary = region.summary || '该区域暂无描述。';
    const images = region.imageUrls || [];
    onDescribe(title, summary, images);
    openPreview(title, summary, images);
  };

  const emitAndPreviewStreet = (region: RegionNode, street: StreetNode) => {
    const title = `街区：${region.name} / ${street.name}`;
    const summary = street.summary || '该街区暂无描述。';
    const images = street.imageUrls || [];
    onDescribe(title, summary, images);
    openPreview(title, summary, images);
  };

  const emitAndPreviewLocation = (region: RegionNode, street: StreetNode, location: LocationNode) => {
    const title = `地点：${region.name} / ${street.name} / ${location.name}`;
    const summary = location.summary || '该地点暂无描述。';
    const images = location.imageUrls || [];
    onDescribe(title, summary, images);
    openPreview(title, summary, images);
  };

  const selectRegion = (regionId: string) => {
    const region = findRegion(regionId);
    if (!region) return;
    setSelectedRegionId(regionId);
    setSelectedStreetId('');
    setSelectedLocationId('');
    emitAndPreviewRegion(region);
  };

  const selectStreet = (streetId: string) => {
    if (!selectedRegion) return;
    const street = findStreet(selectedRegion.id, streetId);
    if (!street) return;
    setSelectedStreetId(streetId);
    setSelectedLocationId('');
    emitAndPreviewStreet(selectedRegion, street);
  };

  const selectLocation = (locationId: string) => {
    if (!selectedRegion || !selectedStreet) return;
    const location = findLocation(selectedRegion.id, selectedStreet.id, locationId);
    if (!location) return;
    setSelectedLocationId(locationId);
    emitAndPreviewLocation(selectedRegion, selectedStreet, location);
  };

  const getTargetPosition = (): MapPosition | null => {
    if (viewLevel === 'region') {
      if (!selectedRegion) return null;
      return { level: 'region', regionId: selectedRegion.id, streetId: null, locationId: null };
    }
    if (viewLevel === 'street') {
      if (!selectedRegion || !selectedStreet) return null;
      return { level: 'street', regionId: selectedRegion.id, streetId: selectedStreet.id, locationId: null };
    }
    if (!selectedRegion || !selectedStreet || !selectedLocation) return null;
    return {
      level: 'location',
      regionId: selectedRegion.id,
      streetId: selectedStreet.id,
      locationId: selectedLocation.id,
    };
  };

  const resolveName = (pos: MapPosition | null): string => {
    if (!pos) return '未设置';
    const region = findRegion(pos.regionId);
    if (!region) return '未知';
    if (pos.level === 'region') return `区域: ${region.name}`;
    const street = findStreet(pos.regionId, pos.streetId || '');
    if (!street) return `区域: ${region.name}`;
    if (pos.level === 'street') return `街区: ${region.name} / ${street.name}`;
    const location = findLocation(pos.regionId, pos.streetId || '', pos.locationId || '');
    return location ? `地点: ${region.name} / ${street.name} / ${location.name}` : `街区: ${region.name} / ${street.name}`;
  };

  const calcTravelMinutes = (from: MapPosition | null, to: MapPosition): number => {
    if (!from) {
      if (to.level === 'region') return 60;
      if (to.level === 'street') return 90;
      return 105;
    }
    if (from.level === to.level && from.regionId === to.regionId && from.streetId === to.streetId && from.locationId === to.locationId) {
      return 0;
    }

    let minutes = 0;
    const hasStreetDimension = from.level !== 'region' || to.level !== 'region';
    const hasLocationDimension = from.level === 'location' || to.level === 'location';

    const regionChanged = from.regionId !== to.regionId;
    if (regionChanged) {
      minutes += 60;
      if (hasStreetDimension) minutes += 30;
      if (hasLocationDimension) minutes += 15;
      return minutes;
    }

    const streetChanged = hasStreetDimension && (from.streetId || '') !== (to.streetId || '');
    if (streetChanged) {
      minutes += 30;
      if (hasLocationDimension) minutes += 15;
      return minutes;
    }

    const locationChanged = hasLocationDimension && (from.locationId || '') !== (to.locationId || '');
    if (locationChanged) {
      minutes += 15;
    }
    return minutes;
  };

  const targetPosition = getTargetPosition();
  const estimatedMinutes = targetPosition ? calcTravelMinutes(runtime.playerPosition, targetPosition) : 0;

  const handleTravel = () => {
    if (!targetPosition) return;
    const cost = calcTravelMinutes(runtime.playerPosition, targetPosition);
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    const logLine = `${timestamp} 前往 ${resolveName(targetPosition)}，耗时 ${cost} 分钟`;
    onRuntimeChange({
      ...runtime,
      viewed: targetPosition,
      playerPosition: targetPosition,
      elapsedMinutes: (runtime.elapsedMinutes || 0) + cost,
      logs: [logLine, ...(runtime.logs || [])].slice(0, 30),
    });
  };

  const canViewNext = (viewLevel === 'region' && !!selectedRegion) || (viewLevel === 'street' && !!selectedStreet);
  const viewNextLabel = viewLevel === 'region' ? '查看街道' : viewLevel === 'street' ? '查看地点' : '已是末级';
  const canGoBack = (viewLevel === 'street' && !!selectedRegion) || (viewLevel === 'location' && !!selectedStreet);

  const handleViewNext = () => {
    if (viewLevel === 'region') {
      if (!selectedRegion) return;
      setViewLevel('street');
      setPreview(prev => ({ ...prev, open: false }));
      return;
    }
    if (viewLevel === 'street') {
      if (!selectedStreet) return;
      setViewLevel('location');
      setPreview(prev => ({ ...prev, open: false }));
    }
  };
  const handleGoBack = () => {
    if (viewLevel === 'location') {
      setViewLevel('street');
      setSelectedLocationId('');
      return;
    }
    if (viewLevel === 'street') {
      setViewLevel('region');
      setSelectedStreetId('');
      setSelectedLocationId('');
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const startLongPress = (event: React.TouchEvent, level: ViewLevel, id: string, regionId?: string, streetId?: string) => {
    const touch = event.touches[0];
    if (!touch) return;
    clearLongPress();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      setContextMenu({ x: touch.clientX, y: touch.clientY, level, id, regionId, streetId });
    }, 450);
  };

  const runCardClick = (action: () => void) => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    action();
  };

  const openContextMenu = (event: React.MouseEvent, level: ViewLevel, id: string, regionId?: string, streetId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({ x: event.clientX, y: event.clientY, level, id, regionId, streetId });
  };

  const addSiblingFromContext = () => {
    if (!contextMenu) return;
    const { level, regionId, streetId } = contextMenu;

    if (level === 'region') {
      const next: RegionNode = {
        id: makeId('R'),
        name: `新区域 ${regions.length + 1}`,
        summary: '',
        entryStreetId: '',
        links: { up: null, down: null, left: null, right: null },
        streets: [],
        imageUrls: [],
      };
      updateRegions(prev => [...prev, next]);
      setContextMenu(null);
      return;
    }

    if (level === 'street' && regionId) {
      const region = findRegion(regionId);
      if (!region) return;
      const nextStreet: StreetNode = {
        id: makeId('S'),
        name: `新街道 ${region.streets.length + 1}`,
        summary: '',
        entryLocationId: '',
        links: { up: null, down: null, left: null, right: null },
        locations: [],
        imageUrls: [],
      };
      updateRegions(prev =>
        prev.map(item =>
          item.id === regionId
            ? { ...item, streets: [...item.streets, nextStreet], entryStreetId: item.entryStreetId || nextStreet.id }
            : item,
        ),
      );
      setContextMenu(null);
      return;
    }

    if (level === 'location' && regionId && streetId) {
      const street = findStreet(regionId, streetId);
      if (!street) return;
      const nextLocation: LocationNode = {
        id: makeId('L'),
        name: `新地点 ${street.locations.length + 1}`,
        type: '未分类',
        summary: '',
        links: { up: null, down: null, left: null, right: null },
        imageUrls: [],
      };
      updateRegions(prev =>
        prev.map(region => {
          if (region.id !== regionId) return region;
          return {
            ...region,
            streets: region.streets.map(streetItem =>
              streetItem.id !== streetId
                ? streetItem
                : {
                    ...streetItem,
                    locations: [...streetItem.locations, nextLocation],
                    entryLocationId: streetItem.entryLocationId || nextLocation.id,
                  },
            ),
          };
        }),
      );
      setContextMenu(null);
    }
  };

  const openEditorFromContext = () => {
    if (!contextMenu) return;
    const { level, id, regionId, streetId } = contextMenu;

    if (level === 'region') {
      const region = findRegion(id);
      if (!region) return;
      setEditor({ open: true, level, id, title: region.name, summary: region.summary || '', images: [...(region.imageUrls || [])], urlDraft: '' });
    }

    if (level === 'street' && regionId) {
      const street = findStreet(regionId, id);
      if (!street) return;
      setEditor({ open: true, level, id, regionId, title: street.name, summary: street.summary || '', images: [...(street.imageUrls || [])], urlDraft: '' });
    }

    if (level === 'location' && regionId && streetId) {
      const location = findLocation(regionId, streetId, id);
      if (!location) return;
      setEditor({ open: true, level, id, regionId, streetId, title: location.name, summary: location.summary || '', images: [...(location.imageUrls || [])], urlDraft: '' });
    }

    setContextMenu(null);
  };

  const deleteFromContext = () => {
    if (!contextMenu) return;
    const { level, id, regionId, streetId } = contextMenu;

    if (level === 'region') {
      updateRegions(prev => prev.filter(region => region.id !== id));
      if (selectedRegionId === id) {
        setSelectedRegionId('');
        setSelectedStreetId('');
        setSelectedLocationId('');
        setViewLevel('region');
      }
    }

    if (level === 'street' && regionId) {
      updateRegions(prev =>
        prev.map(region => {
          if (region.id !== regionId) return region;
          const nextStreets = region.streets.filter(street => street.id !== id);
          const nextEntry = region.entryStreetId === id ? nextStreets[0]?.id || '' : region.entryStreetId;
          return { ...region, streets: nextStreets, entryStreetId: nextEntry };
        }),
      );
      if (selectedStreetId === id) {
        setSelectedStreetId('');
        setSelectedLocationId('');
      }
    }

    if (level === 'location' && regionId && streetId) {
      updateRegions(prev =>
        prev.map(region => {
          if (region.id !== regionId) return region;
          return {
            ...region,
            streets: region.streets.map(street => {
              if (street.id !== streetId) return street;
              const nextLocations = street.locations.filter(location => location.id !== id);
              const nextEntry = street.entryLocationId === id ? nextLocations[0]?.id || '' : street.entryLocationId;
              return { ...street, locations: nextLocations, entryLocationId: nextEntry };
            }),
          };
        }),
      );
      if (selectedLocationId === id) setSelectedLocationId('');
    }

    setContextMenu(null);
  };

  const saveEditor = () => {
    if (!editor.open) return;

    if (editor.level === 'region') {
      updateRegions(prev => prev.map(region => (region.id === editor.id ? { ...region, summary: editor.summary, imageUrls: editor.images } : region)));
    }

    if (editor.level === 'street' && editor.regionId) {
      updateRegions(prev =>
        prev.map(region => {
          if (region.id !== editor.regionId) return region;
          return {
            ...region,
            streets: region.streets.map(street =>
              street.id === editor.id ? { ...street, summary: editor.summary, imageUrls: editor.images } : street,
            ),
          };
        }),
      );
    }

    if (editor.level === 'location' && editor.regionId && editor.streetId) {
      updateRegions(prev =>
        prev.map(region => {
          if (region.id !== editor.regionId) return region;
          return {
            ...region,
            streets: region.streets.map(street => {
              if (street.id !== editor.streetId) return street;
              return {
                ...street,
                locations: street.locations.map(location =>
                  location.id === editor.id ? { ...location, summary: editor.summary, imageUrls: editor.images } : location,
                ),
              };
            }),
          };
        }),
      );
    }

    setEditor(prev => ({ ...prev, open: false }));
  };

  const addEditorImageByUrl = () => {
    const url = editor.urlDraft.trim();
    if (!url) return;
    setEditor(prev => ({ ...prev, images: [...prev.images, url], urlDraft: '' }));
  };

  const onUploadEditorImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!nextUrl) return;
      setEditor(prev => ({ ...prev, images: [...prev.images, nextUrl] }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const notifyTool = (message: string) => {
    setToolNotice(message);
    window.setTimeout(() => {
      setToolNotice(prev => (prev === message ? '' : prev));
    }, 1800);
  };

  const exportMapJson = async () => {
    const text = JSON.stringify(data, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      notifyTool('地图 JSON 已复制');
    } catch {
      notifyTool('复制失败，请检查浏览器权限');
    }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(MAP_OUTPUT_PROMPT);
      notifyTool('AI 地图提示词已复制');
    } catch {
      notifyTool('复制失败，请检查浏览器权限');
    }
  };

  const importMapFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      if (!text) {
        notifyTool('读取文件失败');
        return;
      }
      try {
        const parsed = JSON.parse(text);
        const normalized = normalizeWorldNodeMap(parsed);
        if (!normalized) {
          notifyTool('地图 JSON 结构不合法');
          return;
        }
        onChange(normalized);
        notifyTool('地图已从文件导入');
      } catch {
        notifyTool('JSON 解析失败');
      }
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  };

  const importFromChat = (mode: 'replace' | 'merge') => {
    if (!onImportFromChat) {
      notifyTool('当前未接入聊天导入');
      return;
    }
    const result = onImportFromChat(mode);
    notifyTool(result.message);
  };

  const mergeJsonPrompt = () => {
    const raw = window.prompt('粘贴 AI 生成的地图 JSON（支持 {"map":{"regions":[]}}）');
    if (!raw?.trim()) return;
    try {
      const normalized = normalizeWorldNodeMap(JSON.parse(raw));
      if (!normalized) {
        notifyTool('地图 JSON 结构不合法');
        return;
      }
      onChange(mergeWorldNodeMap(data, normalized));
      notifyTool('JSON 已合并到当前地图');
    } catch {
      notifyTool('JSON 解析失败');
    }
  };

  const currentCards = useMemo(() => {
    if (viewLevel === 'region') {
      return regions.map(region => ({
        id: region.id,
        level: 'region' as const,
        label: region.name,
        selected: selectedRegionId === region.id,
        onClick: () => selectRegion(region.id),
      }));
    }

    if (viewLevel === 'street') {
      if (!selectedRegion) return [] as Array<{ id: string; level: ViewLevel; label: string; selected: boolean; onClick: () => void }>;
      return selectedRegion.streets.map(street => ({
        id: street.id,
        level: 'street' as const,
        label: street.name,
        selected: selectedStreetId === street.id,
        onClick: () => selectStreet(street.id),
      }));
    }

    if (!selectedStreet) return [] as Array<{ id: string; level: ViewLevel; label: string; selected: boolean; onClick: () => void }>;
    return selectedStreet.locations.map(location => ({
      id: location.id,
      level: 'location' as const,
      label: location.name,
      selected: selectedLocationId === location.id,
      onClick: () => selectLocation(location.id),
    }));
  }, [viewLevel, regions, selectedRegion, selectedStreet, selectedRegionId, selectedStreetId, selectedLocationId]);

  const selectedName = selectedLocation?.name || selectedStreet?.name || selectedRegion?.name || '未选择';
  const panelTitle =
    viewLevel === 'region'
      ? '地图【区】'
      : viewLevel === 'street'
      ? '地图【区/街区】'
      : '地图【区/街区/街道/地点】';

  return (
    <div className="h-full p-2" onClick={() => setContextMenu(null)}>
      <CyberPanel title={panelTitle} className="h-full">
        <div className="h-full flex flex-col min-h-0">
          <div className="text-sm text-fuchsia-300 mb-2">当前选中：{selectedName}</div>
          <div className="mb-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={exportMapJson} className="px-2 py-1 text-xs border border-cyan-700 text-cyan-300">导出JSON</button>
              <button type="button" onClick={copyPrompt} className="px-2 py-1 text-xs border border-cyan-700 text-cyan-300">复制AI提示词</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => importFromChat('merge')} className="px-2 py-1 text-xs border border-fuchsia-700 text-fuchsia-300">从聊天合并</button>
              <button type="button" onClick={() => importFromChat('replace')} className="px-2 py-1 text-xs border border-fuchsia-700 text-fuchsia-300">从聊天替换</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={mergeJsonPrompt} className="px-2 py-1 text-xs border border-amber-700 text-amber-300">粘贴JSON合并</button>
              <label className="px-2 py-1 text-center text-xs border border-amber-700 text-amber-300 cursor-pointer">
                导入JSON文件
                <input type="file" accept=".json,application/json" onChange={importMapFile} className="hidden" />
              </label>
            </div>
            <div className="text-[11px] text-slate-400 border border-slate-800 bg-black/20 p-2">
              耗时规则：跨区域=60分钟，跨街区=30分钟，跨地点=15分钟，按层级差异累加。
            </div>
            {!!toolNotice && <div className="text-[11px] text-emerald-300">{toolNotice}</div>}
          </div>

          <div className="flex-1 overflow-auto pr-1">
            <div className="border border-slate-800 bg-black/30 p-3">
              {currentCards.length === 0 ? (
                <div className="text-xs text-slate-500 py-4 text-center">
                  {viewLevel === 'region'
                    ? '暂无区域'
                    : viewLevel === 'street'
                    ? '请先选择区域，再查看街区'
                    : '请先选择街区，再查看地点'}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {currentCards.map(card => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => runCardClick(card.onClick)}
                      onContextMenu={e =>
                        openContextMenu(
                          e,
                          card.level,
                          card.id,
                          card.level === 'region' ? undefined : selectedRegion?.id,
                          card.level === 'location' ? selectedStreet?.id : undefined,
                        )
                      }
                      onTouchStart={e =>
                        startLongPress(
                          e,
                          card.level,
                          card.id,
                          card.level === 'region' ? undefined : selectedRegion?.id,
                          card.level === 'location' ? selectedStreet?.id : undefined,
                        )
                      }
                      onTouchEnd={clearLongPress}
                      onTouchMove={clearLongPress}
                      onTouchCancel={clearLongPress}
                      className={`h-16 text-sm border ${card.selected ? 'border-fuchsia-500 text-fuchsia-300 bg-fuchsia-900/20' : 'border-slate-700 text-slate-300'} hover:border-fuchsia-400`}
                    >
                      {card.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CyberPanel>

      {contextMenu &&
        createPortal(
          <div
            className="fixed z-[9999] min-w-[140px] border border-slate-700 bg-[#0b0912]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={e => e.stopPropagation()}
          >
            <button type="button" onClick={addSiblingFromContext} className="w-full text-left px-3 py-2 text-xs text-cyan-300 hover:bg-slate-800">
              新增同级
            </button>
            <button type="button" onClick={openEditorFromContext} className="w-full text-left px-3 py-2 text-xs text-slate-200 hover:bg-slate-800 border-t border-slate-800">
              编辑
            </button>
            <button type="button" onClick={deleteFromContext} className="w-full text-left px-3 py-2 text-xs text-rose-300 hover:bg-slate-800 border-t border-slate-800">
              删除
            </button>
          </div>,
          document.body,
        )}

      {preview.open &&
        createPortal(
          <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-3" onClick={() => setPreview(prev => ({ ...prev, open: false }))}>
            <div className="w-[min(960px,92vw)] h-[min(78vh,760px)] border border-slate-700 bg-[#0b0912] flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="shrink-0 h-10 border-b border-slate-800 px-3 flex items-center justify-between">
                <div className="text-sm text-cyan-300 truncate">{preview.title}</div>
                <button type="button" onClick={() => setPreview(prev => ({ ...prev, open: false }))} className="px-2 py-0.5 text-xs border border-slate-700 text-slate-300">
                  X
                </button>
              </div>

              <div className="flex-1 overflow-auto p-3 space-y-2">
                <div className="border border-slate-700 bg-black/40 p-2">
                  {preview.images.length > 0 ? (
                    <img src={preview.images[0]} alt="preview" className="w-full h-60 object-cover" />
                  ) : (
                    <div className="w-full h-60 border border-slate-700 flex items-center justify-center text-slate-500">暂无图片</div>
                  )}
                  <div className="mt-2 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{preview.summary}</div>
                </div>
              </div>

              <div className="shrink-0 border-t border-slate-800 p-3">
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleGoBack}
                    disabled={!canGoBack}
                    className="px-2 py-2 text-sm border border-slate-700 text-slate-300 disabled:opacity-40"
                  >
                    返回上一级
                  </button>
                  <button
                    type="button"
                    onClick={handleViewNext}
                    disabled={!canViewNext}
                    className="px-2 py-2 text-sm border border-cyan-700 text-cyan-300 disabled:opacity-40"
                  >
                    {viewNextLabel}
                  </button>
                  <button
                    type="button"
                    onClick={handleTravel}
                    disabled={!targetPosition}
                    className="px-2 py-2 text-sm border border-amber-700 text-amber-300 disabled:opacity-40"
                  >
                    前往（消耗 {estimatedMinutes} 分钟）
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {editor.open &&
        createPortal(
          <div className="fixed inset-0 z-[10001] bg-black/60 flex items-end md:items-center justify-center" onClick={() => setEditor(prev => ({ ...prev, open: false }))}>
            <div className="w-full md:w-[560px] border border-slate-700 bg-[#0b0912] p-3 space-y-2" onClick={e => e.stopPropagation()}>
              <div className="text-sm text-cyan-300">编辑：{editor.title}</div>
              <div className="flex gap-2">
                <input value={editor.urlDraft} onChange={e => setEditor(prev => ({ ...prev, urlDraft: e.target.value }))} placeholder="输入图片 URL" className="flex-1 bg-black/50 border border-slate-700 px-2 py-1 text-xs text-slate-200" />
                <button type="button" onClick={addEditorImageByUrl} className="px-2 py-1 text-xs border border-cyan-700 text-cyan-300">插入</button>
                <label className="px-2 py-1 text-xs border border-amber-700 text-amber-300 cursor-pointer">上传<input type="file" accept="image/*" onChange={onUploadEditorImage} className="hidden" /></label>
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-40 overflow-auto">
                {editor.images.map((img, idx) => (
                  <div key={`${img}_${idx}`} className="border border-slate-700 bg-black/40 p-1">
                    <img src={img} alt={`edit-img-${idx}`} className="w-full h-24 object-cover" />
                    <button type="button" onClick={() => setEditor(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))} className="w-full mt-1 text-[11px] text-rose-300 border border-rose-900/60">删除图片</button>
                  </div>
                ))}
              </div>
              <textarea rows={5} value={editor.summary} onChange={e => setEditor(prev => ({ ...prev, summary: e.target.value }))} className="w-full bg-black/50 border border-slate-700 px-2 py-2 text-slate-200" />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setEditor(prev => ({ ...prev, open: false }))} className="px-2 py-1 border border-slate-700 text-slate-300">取消</button>
                <button type="button" onClick={saveEditor} className="px-2 py-1 border border-cyan-700 text-cyan-300">确认</button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};

export default NodeMapEditor;

