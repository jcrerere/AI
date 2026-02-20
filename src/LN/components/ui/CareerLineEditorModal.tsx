import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Briefcase, CircleDot, Plus, Trash2 } from 'lucide-react';
import { CareerNode, CareerTrack } from '../../types';

interface Props {
  open: boolean;
  onClose: () => void;
  tracks: CareerTrack[];
  onChangeTracks: (tracks: CareerTrack[]) => void;
}

const GRID_STEP = 180;

const createNode = (x: number, y: number, lineType: CareerNode['lineType'] = 'main'): CareerNode => ({
  id: `career_node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  name: '未命名事件',
  unlockRequirement: '待填写',
  eventTask: '待填写',
  eventReward: '待填写',
  lineType,
  x,
  y,
  links: {},
});

const CAREER_LINE_TYPE_LABEL: Record<CareerNode['lineType'], string> = {
  main: '主线',
  side: '支线',
  hidden: '隐藏线',
};

const CAREER_LINE_TYPE_CLASS: Record<CareerNode['lineType'], string> = {
  main: 'border-cyan-500/70 bg-cyan-950/25',
  side: 'border-amber-500/70 bg-amber-950/20',
  hidden: 'border-fuchsia-500/70 bg-fuchsia-950/20',
};

const oppositeDirection: Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const CareerLineEditorModal: React.FC<Props> = ({ open, onClose, tracks, onChangeTracks }) => {
  const [activeTrackId, setActiveTrackId] = useState<string>(tracks[0]?.id || '');
  const [selectedNodeId, setSelectedNodeId] = useState<string>(tracks[0]?.rootNodeId || tracks[0]?.nodes[0]?.id || '');
  const [newTrackName, setNewTrackName] = useState('');
  const [showAddNodeDirections, setShowAddNodeDirections] = useState(false);
  const [pendingDeleteNode, setPendingDeleteNode] = useState(false);

  const activeCareerTrack = useMemo(() => tracks.find(track => track.id === activeTrackId) || tracks[0], [tracks, activeTrackId]);
  const selectedCareerNode = useMemo(
    () => activeCareerTrack?.nodes.find(node => node.id === selectedNodeId) || activeCareerTrack?.nodes[0],
    [activeCareerTrack, selectedNodeId],
  );

  const updateActiveTrack = (patch: Partial<CareerTrack>) => {
    if (!activeCareerTrack) return;
    onChangeTracks(tracks.map(track => (track.id === activeCareerTrack.id ? { ...track, ...patch } : track)));
  };

  const updateSelectedCareerNode = (patch: Partial<CareerNode>) => {
    if (!activeCareerTrack || !selectedCareerNode) return;
    onChangeTracks(
      tracks.map(track => {
        if (track.id !== activeCareerTrack.id) return track;
        return {
          ...track,
          nodes: track.nodes.map(node => (node.id === selectedCareerNode.id ? { ...node, ...patch } : node)),
        };
      }),
    );
  };

  const addCareerTrack = () => {
    const name = newTrackName.trim();
    if (!name) return;
    const root = createNode(0, 0, 'main');
    root.name = '起始事件';
    root.unlockRequirement = '通过开局鉴定';
    root.eventTask = '完成该职业的首次登记。';
    root.eventReward = '解锁后续节点。';
    const track: CareerTrack = {
      id: `career_track_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name,
      description: '待填写职业线路描述。',
      entryRequirement: '待填写职业准入条件。',
      nodes: [root],
      rootNodeId: root.id,
    };
    onChangeTracks([...tracks, track]);
    setActiveTrackId(track.id);
    setSelectedNodeId(root.id);
    setNewTrackName('');
  };

  const deleteActiveTrack = () => {
    if (!activeCareerTrack || tracks.length <= 1) return;
    const nextTracks = tracks.filter(track => track.id !== activeCareerTrack.id);
    const fallback = nextTracks[0];
    onChangeTracks(nextTracks);
    setActiveTrackId(fallback.id);
    setSelectedNodeId(fallback.rootNodeId || fallback.nodes[0]?.id || '');
  };

  const addNodeInDirection = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!activeCareerTrack || !selectedCareerNode) return;
    if (selectedCareerNode.links[direction]) {
      setSelectedNodeId(selectedCareerNode.links[direction]!);
      return;
    }
    const nextX = direction === 'left' ? selectedCareerNode.x - GRID_STEP : direction === 'right' ? selectedCareerNode.x + GRID_STEP : selectedCareerNode.x;
    const nextY = direction === 'up' ? selectedCareerNode.y - GRID_STEP : direction === 'down' ? selectedCareerNode.y + GRID_STEP : selectedCareerNode.y;
    const occupied = activeCareerTrack.nodes.find(node => node.x === nextX && node.y === nextY);
    if (occupied) {
      setSelectedNodeId(occupied.id);
      return;
    }
    const newNode = createNode(nextX, nextY, 'side');
    const reverseDirection = oppositeDirection[direction];
    onChangeTracks(
      tracks.map(track => {
        if (track.id !== activeCareerTrack.id) return track;
        return {
          ...track,
          nodes: [
            ...track.nodes.map(node => {
              if (node.id === selectedCareerNode.id) return { ...node, links: { ...node.links, [direction]: newNode.id } };
              return node;
            }),
            { ...newNode, links: { ...newNode.links, [reverseDirection]: selectedCareerNode.id } },
          ],
        };
      }),
    );
    setSelectedNodeId(newNode.id);
  };

  const removeSelectedNode = () => {
    if (!activeCareerTrack || !selectedCareerNode || activeCareerTrack.nodes.length <= 1) return;
    onChangeTracks(
      tracks.map(track => {
        if (track.id !== activeCareerTrack.id) return track;
        const remainingNodes = track.nodes.filter(node => node.id !== selectedCareerNode.id);
        const cleanedNodes = remainingNodes.map(node => ({
          ...node,
          links: Object.fromEntries(Object.entries(node.links).filter(([, nodeId]) => nodeId !== selectedCareerNode.id)),
        })) as CareerNode[];
        const nextRoot = track.rootNodeId === selectedCareerNode.id ? cleanedNodes[0]?.id : track.rootNodeId;
        return { ...track, nodes: cleanedNodes, rootNodeId: nextRoot };
      }),
    );
    const fallbackNodeId = activeCareerTrack.nodes.find(node => node.id !== selectedCareerNode.id)?.id;
    if (fallbackNodeId) setSelectedNodeId(fallbackNodeId);
    setPendingDeleteNode(false);
  };

  const careerCanvasBounds = useMemo(() => {
    if (!activeCareerTrack || activeCareerTrack.nodes.length === 0) {
      return { width: 1200, height: 700, minX: -300, minY: -200 };
    }
    const xValues = activeCareerTrack.nodes.map(node => node.x);
    const yValues = activeCareerTrack.nodes.map(node => node.y);
    const minX = Math.min(...xValues) - GRID_STEP;
    const maxX = Math.max(...xValues) + GRID_STEP;
    const minY = Math.min(...yValues) - GRID_STEP;
    const maxY = Math.max(...yValues) + GRID_STEP;
    return { width: maxX - minX + 320, height: maxY - minY + 280, minX, minY };
  }, [activeCareerTrack]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-[95vw] max-w-[1400px] border border-amber-900/50 bg-[#070507] rounded-lg overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-12 border-b border-amber-900/40 flex items-center justify-between px-4 shrink-0">
          <div className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Briefcase className="w-4 h-4" /> 职业线路编辑器（管制协议）
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">关闭</button>
        </div>

        <div className="p-4 overflow-auto scrollbar-hidden">
          <div className="grid grid-cols-1 xl:grid-cols-[240px_minmax(0,1fr)_280px] gap-4">
            <div className="border border-slate-800 rounded p-3 bg-black/30 space-y-3">
              <div className="text-xs font-bold text-amber-300">职业列表</div>
              <div className="space-y-2 max-h-[46vh] overflow-y-auto scrollbar-hidden pr-1">
                {tracks.map(track => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setActiveTrackId(track.id);
                      setSelectedNodeId(track.rootNodeId || track.nodes[0]?.id || '');
                    }}
                    className={`w-full text-left border rounded p-2 transition-colors ${
                      activeCareerTrack?.id === track.id ? 'border-amber-500 bg-amber-900/20' : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-sm text-slate-100 font-bold truncate">{track.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1 truncate">准入：{track.entryRequirement || '待填写'}</div>
                    <div className="text-[10px] text-slate-600 mt-1">节点：{track.nodes.length}</div>
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-800 pt-3 space-y-2">
                <input value={newTrackName} onChange={e => setNewTrackName(e.target.value)} placeholder="新增职业名" className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" />
                <button onClick={addCareerTrack} className="w-full border border-emerald-700 text-emerald-300 text-xs py-1.5 hover:bg-emerald-900/20 flex items-center justify-center gap-1">
                  <Plus className="w-3 h-3" /> 新增职业
                </button>
                <button onClick={deleteActiveTrack} disabled={tracks.length <= 1} className="w-full border border-red-800 text-red-300 text-xs py-1.5 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                  <Trash2 className="w-3 h-3" /> 删除当前职业
                </button>
              </div>
            </div>

            <div className="border border-slate-800 rounded p-3 bg-black/20 space-y-3 min-h-[520px]">
              {activeCareerTrack && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={activeCareerTrack.name} onChange={e => updateActiveTrack({ name: e.target.value })} className="bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="职业名称" />
                    <input value={activeCareerTrack.entryRequirement} onChange={e => updateActiveTrack({ entryRequirement: e.target.value })} className="bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="职业准入条件" />
                  </div>
                  <textarea value={activeCareerTrack.description} onChange={e => updateActiveTrack({ description: e.target.value })} rows={2} className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="职业描述" />
                </>
              )}

              <div className="border border-slate-800 rounded bg-[#050305] overflow-auto scrollbar-hidden max-h-[520px]">
                <div className="relative" style={{ width: `${careerCanvasBounds.width}px`, height: `${careerCanvasBounds.height}px` }}>
                  <svg className="absolute inset-0 pointer-events-none" width={careerCanvasBounds.width} height={careerCanvasBounds.height}>
                    {(activeCareerTrack?.nodes || []).flatMap(node => {
                      const sx = node.x - careerCanvasBounds.minX + 120;
                      const sy = node.y - careerCanvasBounds.minY + 100;
                      return Object.values(node.links)
                        .filter((targetId): targetId is string => typeof targetId === 'string' && targetId.length > 0)
                        .map(targetId => {
                          const target = activeCareerTrack?.nodes.find(n => n.id === targetId);
                          if (!target) return null;
                          if (node.id > target.id) return null;
                          const tx = target.x - careerCanvasBounds.minX + 120;
                          const ty = target.y - careerCanvasBounds.minY + 100;
                          return <line key={`${node.id}_${target.id}`} x1={sx} y1={sy} x2={tx} y2={ty} stroke="rgba(148,163,184,0.5)" strokeWidth="2" />;
                        })
                        .filter(Boolean);
                    })}
                  </svg>

                  {(activeCareerTrack?.nodes || []).map(node => {
                    const left = node.x - careerCanvasBounds.minX + 40;
                    const top = node.y - careerCanvasBounds.minY + 55;
                    const selected = selectedCareerNode?.id === node.id;
                    return (
                      <button
                        type="button"
                        key={node.id}
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`absolute w-[160px] min-h-[90px] border rounded-md p-2 text-left transition-colors ${selected ? 'ring-2 ring-cyan-400/80' : ''} ${CAREER_LINE_TYPE_CLASS[node.lineType]}`}
                        style={{ left, top }}
                      >
                        <div className="text-[11px] text-slate-100 font-bold truncate">{node.name || '未命名事件'}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{CAREER_LINE_TYPE_LABEL[node.lineType]}</div>
                        <div className="text-[10px] text-slate-500 mt-1 truncate">要求：{node.unlockRequirement || '待填写'}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="text-[10px] text-slate-500">提示：支持上下左右新增支点，后续可继续做技能树风格美化。</div>
            </div>

            <div className="border border-slate-800 rounded p-3 bg-black/30 space-y-3">
              <div className="text-xs font-bold text-cyan-300">节点编辑</div>
              {selectedCareerNode ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddNodeDirections(prev => !prev)}
                      className="border border-emerald-800 text-emerald-300 text-xs py-1.5 hover:bg-emerald-900/20"
                    >
                      新增节点
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteNode(true)}
                      disabled={(activeCareerTrack?.nodes.length || 0) <= 1}
                      className="border border-red-800 text-red-300 text-xs py-1.5 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      删除节点
                    </button>
                  </div>

                  {showAddNodeDirections && (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => addNodeInDirection('up')} className="border border-slate-700 text-slate-200 text-xs py-1.5 flex items-center justify-center gap-1 hover:bg-white/5"><ArrowUp className="w-3 h-3" /> 上</button>
                      <button type="button" onClick={() => addNodeInDirection('down')} className="border border-slate-700 text-slate-200 text-xs py-1.5 flex items-center justify-center gap-1 hover:bg-white/5"><ArrowDown className="w-3 h-3" /> 下</button>
                      <button type="button" onClick={() => addNodeInDirection('left')} className="border border-slate-700 text-slate-200 text-xs py-1.5 flex items-center justify-center gap-1 hover:bg-white/5"><ArrowLeft className="w-3 h-3" /> 左</button>
                      <button type="button" onClick={() => addNodeInDirection('right')} className="border border-slate-700 text-slate-200 text-xs py-1.5 flex items-center justify-center gap-1 hover:bg-white/5"><ArrowRight className="w-3 h-3" /> 右</button>
                    </div>
                  )}

                  {pendingDeleteNode && (
                    <div className="border border-red-900/60 rounded p-2 bg-red-950/20 space-y-2">
                      <div className="text-[11px] text-red-300">确认删除当前选中节点？删除后不可恢复。</div>
                      <div className="flex gap-2">
                        <button type="button" onClick={removeSelectedNode} className="flex-1 border border-red-700 text-red-200 text-xs py-1.5 hover:bg-red-900/30">
                          确认删除
                        </button>
                        <button type="button" onClick={() => setPendingDeleteNode(false)} className="flex-1 border border-slate-700 text-slate-300 text-xs py-1.5 hover:bg-white/5">
                          取消
                        </button>
                      </div>
                    </div>
                  )}

                  <input value={selectedCareerNode.name} onChange={e => updateSelectedCareerNode({ name: e.target.value })} className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="事件名" />
                  <select value={selectedCareerNode.lineType} onChange={e => updateSelectedCareerNode({ lineType: e.target.value as CareerNode['lineType'] })} className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white">
                    <option value="main">主线节点</option>
                    <option value="side">支线节点</option>
                    <option value="hidden">隐藏线节点</option>
                  </select>
                  <textarea value={selectedCareerNode.unlockRequirement} onChange={e => updateSelectedCareerNode({ unlockRequirement: e.target.value })} rows={2} className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="解锁要求" />
                  <textarea value={selectedCareerNode.eventTask} onChange={e => updateSelectedCareerNode({ eventTask: e.target.value })} rows={3} className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="事件任务" />
                  <textarea value={selectedCareerNode.eventReward} onChange={e => updateSelectedCareerNode({ eventReward: e.target.value })} rows={3} className="w-full bg-black border border-slate-700 px-2 py-1.5 text-xs text-white" placeholder="事件奖励 / 完成后可做什么" />
                  <div className="text-[10px] text-slate-500 flex items-center gap-1"><CircleDot className="w-3 h-3" /> 节点结构固定为：名称、解锁要求、任务、奖励。</div>
                </>
              ) : (
                <div className="text-xs text-slate-500">请先选择一个节点。</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CareerLineEditorModal;
