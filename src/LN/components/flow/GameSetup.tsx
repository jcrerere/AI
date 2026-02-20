
import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, Fingerprint, Flag, ShieldAlert, Sparkles, Zap, Wrench, BookOpen, Briefcase, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CircleDot } from 'lucide-react';
import {
  MOCK_STARTER_BOARDS,
  MOCK_STARTER_CHIPS,
  MOCK_STARTER_ITEMS,
} from '../../constants';
import { CareerNode, CareerTrack, Chip, EquippedItem, GameConfig, Item, LingshuPart, Rank, Skill } from '../../types';

interface Props {
  onComplete: (config: GameConfig) => void;
}

type Step = 'identity' | 'build' | 'world';
type PickerMode = 'chip' | 'equip';
type LingshuSelectMode = 'skills' | 'equipment';
type SkillActionMode = 'auto' | 'custom' | 'delete';
type NeuralProtocol = 'none' | 'beta';
type ChipActionMode = 'auto' | 'custom' | 'delete';

interface PickerEntry {
  id: string;
  name: string;
  rank: Rank;
  description: string;
}

const NEURAL_BOARD_OPTIONS: Chip[] = [
  { id: 'board_lv1', name: '神经主板 I 型', type: 'board', rank: Rank.Lv1, description: '提供一个芯片槽位。' },
  { id: 'board_lv2', name: '神经主板 II 型', type: 'board', rank: Rank.Lv2, description: '民用增强型主板。' },
  { id: 'board_lv3', name: '神经主板 III 型', type: 'board', rank: Rank.Lv3, description: '战术级主板，支持并行回路。' },
  { id: 'board_lv4', name: '神经主板 IV 型', type: 'board', rank: Rank.Lv4, description: '高密度阵列主板。' },
  { id: 'board_lv5', name: '神经主板 V 型', type: 'board', rank: Rank.Lv5, description: '旗舰主板，极限扩展。' },
];

const levelToRank = (level: number): Rank => {
  if (level <= 1) return Rank.Lv1;
  if (level === 2) return Rank.Lv2;
  if (level === 3) return Rank.Lv3;
  if (level === 4) return Rank.Lv4;
  return Rank.Lv5;
};

const rankValue = (rank: Rank) => parseInt(rank.replace('Lv.', ''), 10);
const rankLabel = (rank: Rank) => `${rankValue(rank)}级`;

const BODY_PART_DEFS: Array<{ key: string; name: string; level: number; description: string }> = [
  { key: 'brain', name: '大脑', level: 3, description: '认知中枢与灵能感知核心。' },
  { key: 'eyes', name: '双眼', level: 3, description: '视觉神经与深度数据处理单元。' },
  { key: 'face', name: '面部', level: 2, description: '感官伪装与表情模组接口。' },
  { key: 'mouth', name: '嘴部', level: 2, description: '语音输出与能量摄入端口。' },
  { key: 'body', name: '身躯', level: 2, description: '生命维持系统主躯干。' },
  { key: 'chest', name: '胸部', level: 2, description: '循环增强与导压模块区域。' },
  { key: 'genital', name: '阴部', level: 3, description: '高敏回路与外泄控制节点。' },
  { key: 'hip', name: '臀部', level: 3, description: '核心承压与外泄缓冲区域。' },
  { key: 'l_arm', name: '左臂', level: 2, description: '精密操控与传导辅助部位。' },
  { key: 'r_arm', name: '右臂', level: 3, description: '战术强化与武装挂载部位。' },
  { key: 'l_hand', name: '左手', level: 2, description: '细粒度控制与接触感知。' },
  { key: 'r_hand', name: '右手', level: 2, description: '输出稳定与抓握强化。' },
  { key: 'l_leg', name: '左腿', level: 2, description: '位移稳定与压力承载。' },
  { key: 'r_leg', name: '右腿', level: 2, description: '速度与爆发动作支撑。' },
  { key: 'l_foot', name: '左脚', level: 1, description: '静音移动与姿态修正。' },
  { key: 'r_foot', name: '右脚', level: 1, description: '平衡与反冲缓解。' },
  { key: 'axilla', name: '腋下', level: 4, description: '敏感散热与腺体控制区域。' },
];

const DEFAULT_LINGSHU_PARTS: LingshuPart[] = BODY_PART_DEFS.map((part, index) => ({
  id: `ls_${part.key}_${index + 1}`,
  key: part.key,
  name: part.name,
  level: part.level,
  rank: levelToRank(part.level),
  description: part.description,
  equippedItem: null,
  spiritSkills: [],
}));

const DEFAULT_LINGSHU_EQUIPMENT: EquippedItem[] = [
  { id: 'lse_1', name: '共鸣束环', rank: Rank.Lv2, description: '稳定局部灵压，减少回路噪声。' },
  { id: 'lse_2', name: '灵导护片', rank: Rank.Lv3, description: '提升灵力传导效率与耐受。' },
  { id: 'lse_3', name: '折光膜片', rank: Rank.Lv1, description: '降低外界干扰与可见性。' },
  { id: 'lse_4', name: '虚轴锚点', rank: Rank.Lv4, description: '高压状态下保持稳定锚定。' },
  { id: 'lse_5', name: '声纹校准器', rank: Rank.Lv2, description: '修正声纹偏差，降低共振损耗。' },
  { id: 'lse_6', name: '导流压阀', rank: Rank.Lv4, description: '在峰值阶段控制灵压回涌。' },
];

const DEFAULT_LINGXIAN_POOL: Skill[] = [
  { id: 'lss_1', name: '灵弦：回声锁定', level: 1, description: '锁定目标灵压特征。' },
  { id: 'lss_2', name: '灵弦：镜像偏折', level: 2, description: '短时偏折感知，规避干扰。' },
  { id: 'lss_3', name: '灵弦：潮汐复位', level: 3, description: '清除噪讯，快速恢复秩序。' },
  { id: 'lss_4', name: '灵弦：静默屏障', level: 4, description: '形成短时静默域，压制外部侵扰。' },
  { id: 'lss_5', name: '灵弦：神经超载', level: 4, description: '短时间提高反应与输出。' },
  { id: 'lss_6', name: '灵弦：痛觉迟钝', level: 5, description: '抑制痛觉反馈，增强持续作战。' },
  { id: 'lss_7', name: '灵弦：震荡折返', level: 3, description: '回弹冲击并削弱目标稳定。' },
  { id: 'lss_8', name: '灵弦：温域适配', level: 2, description: '减轻高温/低温环境影响。' },
  { id: 'lss_9', name: '灵弦：相位切换', level: 5, description: '短时调整相位降低命中概率。' },
  { id: 'lss_10', name: '灵弦：脉冲净化', level: 1, description: '小幅净化杂质并修复波形。' },
];

const createPartSkillPools = (parts: LingshuPart[]): Record<string, Skill[]> =>
  Object.fromEntries(parts.map(part => [part.id, DEFAULT_LINGXIAN_POOL.map(skill => ({ ...skill }))]));

const createPartEquipPools = (parts: LingshuPart[]): Record<string, EquippedItem[]> =>
  Object.fromEntries(parts.map(part => [part.id, DEFAULT_LINGSHU_EQUIPMENT.map(item => ({ ...item }))]));

const getPartSkills = (part?: Pick<LingshuPart, 'spiritSkills' | 'spiritSkill'> | null): Skill[] =>
  part?.spiritSkills ?? (part?.spiritSkill ? [part.spiritSkill] : []);

const psionicStrengthByLevel = (level: number, gender: 'male' | 'female') => {
  const lv = Math.min(5, Math.max(1, level));
  if (gender === 'male') return 5 + (lv - 1) * 6; // 5 ~ 29，发散型基础较低
  return 70 + (lv - 1) * 28; // 70 ~ 182，奇点型更易聚集
};
const absorbRateByLevel = (level: number) => 180 + level * 55;
const perceptionByLevel = (level: number) => 35 + level * 11;
const rankBorderClass = (rank: Rank) => {
  switch (rank) {
    case Rank.Lv1:
      return 'border-slate-500/80';
    case Rank.Lv2:
      return 'border-cyan-500/80';
    case Rank.Lv3:
      return 'border-purple-500/80';
    case Rank.Lv4:
      return 'border-amber-500/80';
    case Rank.Lv5:
      return 'border-red-500/80';
    default:
      return 'border-slate-700';
  }
};

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

const DEFAULT_CAREER_TRACKS: CareerTrack[] = [
  {
    id: 'career_track_core',
    name: '基础劳服线',
    entryRequirement: '开局完成身份鉴定',
    description: '默认线路，用于搭建事件节点模板。',
    nodes: [
      {
        id: 'career_node_core_root',
        name: '鉴定登记',
        unlockRequirement: '无',
        eventTask: '在登记处完成资质鉴定并领取身份标签。',
        eventReward: '开启职业线路编辑权限。',
        lineType: 'main',
        x: 0,
        y: 0,
        links: {},
      },
    ],
    rootNodeId: 'career_node_core_root',
  },
];

const LN_FACTION_OPTIONS = [
  { id: 'f_airyla', name: '艾瑞拉', location: '艾瑞拉' },
  { id: 'f_cuiling', name: '淬灵区', location: '淬灵区' },
  { id: 'f_xiyu', name: '汐屿区', location: '汐屿区' },
  { id: 'f_nuosi', name: '诺丝区', location: '诺丝区' },
  { id: 'f_qiling', name: '栖灵区', location: '栖灵区' },
  { id: 'f_shengjiao', name: '圣教区', location: '圣教区' },
];

const LN_ZONE_OPTIONS = ['艾瑞拉', '淬灵区', '汐屿区', '诺丝区', '栖灵区', '圣教区', '交界地', '南荒'];

const oppositeDirection: Record<'up' | 'down' | 'left' | 'right', 'up' | 'down' | 'left' | 'right'> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const GameSetup: React.FC<Props> = ({ onComplete }) => {
  const [step, setStep] = useState<Step>('identity');
  const [name, setName] = useState('测试体-V');
  const [gender, setGender] = useState<'male' | 'female'>('male');

  const [psionicRank, setPsionicRank] = useState<Rank>(Rank.Lv1);
  const [credits, setCredits] = useState<number>(1000);
  const [neuralProtocol, setNeuralProtocol] = useState<NeuralProtocol>('none');
  const [recoveryRate, setRecoveryRate] = useState<number>(120);
  const [conversionRate, setConversionRate] = useState<number>(15);
  const [sixDim, setSixDim] = useState<{ 力量: number; 敏捷: number; 体质: number; 感知: number; 意志: number; 魅力: number }>({
    力量: 10,
    敏捷: 9,
    体质: 10,
    感知: 8,
    意志: 9,
    魅力: 7,
  });
  const [sixDimFreePoints, setSixDimFreePoints] = useState<number>(18);

  const [selectedBoard, setSelectedBoard] = useState<Chip>(NEURAL_BOARD_OPTIONS[0]);
  const [availableChips, setAvailableChips] = useState<Chip[]>(MOCK_STARTER_CHIPS);
  const [selectedChipIds, setSelectedChipIds] = useState<string[]>([]);

  const [lingshuParts, setLingshuParts] = useState<LingshuPart[]>(DEFAULT_LINGSHU_PARTS);
  const [partSkillPools, setPartSkillPools] = useState<Record<string, Skill[]>>(() => createPartSkillPools(DEFAULT_LINGSHU_PARTS));
  const [partEquipPools, setPartEquipPools] = useState<Record<string, EquippedItem[]>>(() => createPartEquipPools(DEFAULT_LINGSHU_PARTS));
  const [lingshuOpen, setLingshuOpen] = useState(false);
  const [activeLingshuId, setActiveLingshuId] = useState<string>(DEFAULT_LINGSHU_PARTS[0].id);
  const [lingshuSelectMode, setLingshuSelectMode] = useState<LingshuSelectMode>('skills');
  const [lingshuEquipFilter, setLingshuEquipFilter] = useState<'all' | Rank>('all');
  const [lingshuSkillFilter, setLingshuSkillFilter] = useState<'all' | Rank>('all');

  const [selectedFactionId, setSelectedFactionId] = useState<string>(LN_FACTION_OPTIONS[0].id);
  const [customFactionName, setCustomFactionName] = useState<string>(LN_FACTION_OPTIONS[0].name);
  const [startingLocation, setStartingLocation] = useState<string>(LN_FACTION_OPTIONS[0].location);

  const [neuralOpen, setNeuralOpen] = useState(false);
  const [chipRankFilter, setChipRankFilter] = useState<'all' | Rank>('all');
  const [chipSortDir, setChipSortDir] = useState<'desc' | 'asc'>('desc');
  const [chipActionMode, setChipActionMode] = useState<ChipActionMode>('auto');
  const [chipActionMenuOpen, setChipActionMenuOpen] = useState(false);
  const [pendingDeleteChip, setPendingDeleteChip] = useState<Chip | null>(null);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customRank, setCustomRank] = useState<Rank>(Rank.Lv1);
  const [customLingshuSkillName, setCustomLingshuSkillName] = useState('');
  const [customLingshuSkillDesc, setCustomLingshuSkillDesc] = useState('');
  const [customLingshuSkillLevel, setCustomLingshuSkillLevel] = useState<number>(1);
  const [customLingshuEquipName, setCustomLingshuEquipName] = useState('');
  const [customLingshuEquipDesc, setCustomLingshuEquipDesc] = useState('');
  const [customLingshuEquipRank, setCustomLingshuEquipRank] = useState<Rank>(Rank.Lv1);
  const [showCustomEquipForm, setShowCustomEquipForm] = useState(false);
  const [skillActionMode, setSkillActionMode] = useState<SkillActionMode>('auto');
  const [skillActionMenuOpen, setSkillActionMenuOpen] = useState(false);
  const [pendingDeleteSkill, setPendingDeleteSkill] = useState<Skill | null>(null);
  const [careerEditorOpen, setCareerEditorOpen] = useState(false);
  const [careerTracks, setCareerTracks] = useState<CareerTrack[]>(DEFAULT_CAREER_TRACKS);
  const [activeTrackId, setActiveTrackId] = useState<string>(DEFAULT_CAREER_TRACKS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(DEFAULT_CAREER_TRACKS[0].rootNodeId || DEFAULT_CAREER_TRACKS[0].nodes[0].id);
  const [newTrackName, setNewTrackName] = useState('');

  const conversionRange = gender === 'male' ? { min: 15, max: 30 } : { min: 80, max: 120 };
  const recoveryRange = gender === 'male' ? { min: 70, max: 200 } : { min: 10, max: 40 };

  useEffect(() => {
    if (gender === 'female') {
      setSixDim({ 力量: 9, 敏捷: 10, 体质: 8, 感知: 11, 意志: 9, 魅力: 12 });
      setSixDimFreePoints(18);
      return;
    }
    setSixDim({ 力量: 10, 敏捷: 9, 体质: 10, 感知: 8, 意志: 9, 魅力: 7 });
    setSixDimFreePoints(18);
  }, [gender]);

  useEffect(() => {
    setConversionRate(prev => Math.min(conversionRange.max, Math.max(conversionRange.min, prev)));
    setRecoveryRate(prev => Math.min(recoveryRange.max, Math.max(recoveryRange.min, prev)));
  }, [gender]);

  const maxChipSlots = useMemo(() => {
    switch (selectedBoard.rank) {
      case Rank.Lv1:
        return 1;
      case Rank.Lv2:
        return 3;
      case Rank.Lv3:
        return 6;
      case Rank.Lv4:
        return 9;
      case Rank.Lv5:
        return 12;
      default:
        return 1;
    }
  }, [selectedBoard.rank]);

  useEffect(() => {
    setSelectedChipIds(prev => prev.slice(0, maxChipSlots));
  }, [maxChipSlots]);

  const selectedChips = useMemo(() => availableChips.filter(chip => selectedChipIds.includes(chip.id)), [availableChips, selectedChipIds]);

  const filteredChipEntries = useMemo(() => {
    const entries = availableChips.map(chip => ({ id: chip.id, name: chip.name, rank: chip.rank, description: chip.description }));
    const base = chipRankFilter === 'all' ? entries : entries.filter(item => item.rank === chipRankFilter);
    return [...base].sort((a, b) => {
      const diff = rankValue(a.rank) - rankValue(b.rank);
      return chipSortDir === 'asc' ? diff : -diff;
    });
  }, [availableChips, chipRankFilter, chipSortDir]);

  const activePart = useMemo(() => lingshuParts.find(p => p.id === activeLingshuId) || lingshuParts[0], [lingshuParts, activeLingshuId]);

  const activeSkillPool = useMemo(() => {
    if (!activePart) return [];
    return partSkillPools[activePart.id] || [];
  }, [activePart, partSkillPools]);

  const activeEquipPool = useMemo(() => {
    if (!activePart) return [];
    return partEquipPools[activePart.id] || [];
  }, [activePart, partEquipPools]);

  const lingshuFilteredEquip = useMemo(() => {
    const base = lingshuEquipFilter === 'all' ? activeEquipPool : activeEquipPool.filter(i => i.rank === lingshuEquipFilter);
    return [...base].sort((a, b) => {
      const diff = rankValue(a.rank || Rank.Lv1) - rankValue(b.rank || Rank.Lv1);
      return sortDir === 'asc' ? diff : -diff;
    });
  }, [activeEquipPool, lingshuEquipFilter, sortDir]);

  const lingshuFilteredSkills = useMemo(() => {
    const base = lingshuSkillFilter === 'all' ? activeSkillPool : activeSkillPool.filter(s => levelToRank(s.level) === lingshuSkillFilter);
    return [...base].sort((a, b) => (sortDir === 'asc' ? a.level - b.level : b.level - a.level));
  }, [activeSkillPool, lingshuSkillFilter, sortDir]);

  const activeCareerTrack = useMemo(() => careerTracks.find(track => track.id === activeTrackId) || careerTracks[0], [careerTracks, activeTrackId]);
  const selectedCareerNode = useMemo(
    () => activeCareerTrack?.nodes.find(node => node.id === selectedNodeId) || activeCareerTrack?.nodes[0],
    [activeCareerTrack, selectedNodeId],
  );

  const updateActiveTrack = (patch: Partial<CareerTrack>) => {
    if (!activeCareerTrack) return;
    setCareerTracks(prev => prev.map(track => (track.id === activeCareerTrack.id ? { ...track, ...patch } : track)));
  };

  const updateSelectedCareerNode = (patch: Partial<CareerNode>) => {
    if (!activeCareerTrack || !selectedCareerNode) return;
    setCareerTracks(prev =>
      prev.map(track => {
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
    setCareerTracks(prev => [...prev, track]);
    setActiveTrackId(track.id);
    setSelectedNodeId(root.id);
    setNewTrackName('');
  };

  const deleteActiveTrack = () => {
    if (!activeCareerTrack) return;
    if (careerTracks.length <= 1) return;
    const nextTracks = careerTracks.filter(track => track.id !== activeCareerTrack.id);
    const fallback = nextTracks[0];
    setCareerTracks(nextTracks);
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
    setCareerTracks(prev =>
      prev.map(track => {
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
    if (!activeCareerTrack || !selectedCareerNode) return;
    if (activeCareerTrack.nodes.length <= 1) return;
    setCareerTracks(prev =>
      prev.map(track => {
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

  const updateActivePart = (patch: Partial<LingshuPart>) => {
    if (!activePart) return;
    setLingshuParts(prev => prev.map(p => (p.id === activePart.id ? { ...p, ...patch } : p)));
  };

  const setPartLevel = (level: number) => {
    updateActivePart({ level, rank: levelToRank(level) });
  };

  const toggleSkill = (skill: Skill) => {
    if (!activePart) return;
    const selected = getPartSkills(activePart);
    const exists = selected.some(s => s.id === skill.id);

    if (exists) {
      updateActivePart({ spiritSkills: selected.filter(s => s.id !== skill.id) });
      return;
    }

    if (selected.length >= 3) return;
    updateActivePart({ spiritSkills: [...selected, skill] });
  };

  const chooseEquipment = (item: EquippedItem) => {
    updateActivePart({ equippedItem: item });
  };

  const requestDeleteSkill = (skill: Skill) => {
    setPendingDeleteSkill(skill);
  };

  const confirmDeleteSkill = () => {
    if (!activePart) return;
    if (!pendingDeleteSkill) return;

    setPartSkillPools(prev => ({
      ...prev,
      [activePart.id]: (prev[activePart.id] || []).filter(s => s.id !== pendingDeleteSkill.id),
    }));
    setLingshuParts(prev =>
      prev.map(p =>
        p.id === activePart.id ? { ...p, spiritSkills: getPartSkills(p).filter(s => s.id !== pendingDeleteSkill.id) } : p,
      ),
    );
    setPendingDeleteSkill(null);
  };

  const isPartConfigured = (part: LingshuPart) => !!part.equippedItem && getPartSkills(part).length > 0;

  const isChipSelected = (id: string) => selectedChipIds.includes(id);

  const toggleChipSelect = (id: string) => {
    setSelectedChipIds(prev => {
      if (prev.includes(id)) return prev.filter(v => v !== id);
      if (prev.length >= maxChipSlots) return prev;
      return [...prev, id];
    });
  };

  const addCustomChip = () => {
    if (!customName.trim() || !customDesc.trim()) return;
    const id = `custom_chip_${Date.now()}`;
    const chip: Chip = { id, name: customName.trim(), rank: customRank, description: customDesc.trim(), type: 'process' };
    setAvailableChips(prev => [chip, ...prev]);
    setSelectedChipIds(prev => (prev.includes(id) ? prev : [...prev, id].slice(0, maxChipSlots)));

    setCustomName('');
    setCustomDesc('');
    setCustomRank(Rank.Lv1);
  };

  const requestDeleteChip = (chip: Chip) => setPendingDeleteChip(chip);

  const confirmDeleteChip = () => {
    if (!pendingDeleteChip) return;
    setAvailableChips(prev => prev.filter(chip => chip.id !== pendingDeleteChip.id));
    setSelectedChipIds(prev => prev.filter(id => id !== pendingDeleteChip.id));
    setPendingDeleteChip(null);
  };

  const addCustomLingshuSkill = () => {
    if (!activePart || !customLingshuSkillName.trim() || !customLingshuSkillDesc.trim()) return;
    const level = Math.min(5, Math.max(1, customLingshuSkillLevel));
    const skill: Skill = {
      id: `custom_lingshu_skill_${Date.now()}`,
      name: customLingshuSkillName.trim().startsWith('灵弦：')
        ? customLingshuSkillName.trim()
        : `灵弦：${customLingshuSkillName.trim()}`,
      level,
      description: customLingshuSkillDesc.trim(),
      isCustom: true,
    };
    setPartSkillPools(prev => ({
      ...prev,
      [activePart.id]: [skill, ...(prev[activePart.id] || [])],
    }));
    if (getPartSkills(activePart).length < 3) {
      toggleSkill(skill);
    }
    setCustomLingshuSkillName('');
    setCustomLingshuSkillDesc('');
    setCustomLingshuSkillLevel(1);
  };

  const addCustomLingshuEquip = () => {
    if (!activePart || !customLingshuEquipName.trim() || !customLingshuEquipDesc.trim()) return;
    const equip: EquippedItem = {
      id: `custom_lingshu_equip_${Date.now()}`,
      name: customLingshuEquipName.trim(),
      rank: customLingshuEquipRank,
      description: customLingshuEquipDesc.trim(),
    };
    setPartEquipPools(prev => ({
      ...prev,
      [activePart.id]: [equip, ...(prev[activePart.id] || [])],
    }));
    chooseEquipment(equip);
    setCustomLingshuEquipName('');
    setCustomLingshuEquipDesc('');
    setCustomLingshuEquipRank(Rank.Lv1);
  };

  const canGoBuild = name.trim().length > 0;
  const sixDimCapAtStart = 30;
  const sixDimKeys: Array<keyof typeof sixDim> = ['力量', '敏捷', '体质', '感知', '意志', '魅力'];

  const adjustSixDim = (key: keyof typeof sixDim, delta: 1 | -1) => {
    setSixDim(prev => {
      const current = prev[key];
      if (delta > 0) {
        if (sixDimFreePoints <= 0 || current >= sixDimCapAtStart) return prev;
        setSixDimFreePoints(points => points - 1);
        return { ...prev, [key]: current + 1 };
      }
      const genderBase = gender === 'female'
        ? ({ 力量: 9, 敏捷: 10, 体质: 8, 感知: 11, 意志: 9, 魅力: 12 } as const)
        : ({ 力量: 10, 敏捷: 9, 体质: 10, 感知: 8, 意志: 9, 魅力: 7 } as const);
      if (current <= genderBase[key]) return prev;
      setSixDimFreePoints(points => points + 1);
      return { ...prev, [key]: current - 1 };
    });
  };

  const handleComplete = () => {
    const finalFactionName = customFactionName.trim() || LN_FACTION_OPTIONS.find(f => f.id === selectedFactionId)?.name || '未知势力';
    const normalizedLingshu = lingshuParts.map(part => {
      const normalizedSkills = getPartSkills(part);
      return {
        ...part,
        level: part.level || rankValue(part.rank),
        rank: part.rank,
        spiritSkills: normalizedSkills,
      };
    });

    const config: GameConfig = {
      name: name.trim(),
      gender,
      citizenId: `NC-${Math.floor(Math.random() * 1000000)}`,
      startCredits: credits,
      startPsionicRank: psionicRank,
      installBetaChip: neuralProtocol === 'beta',
      selectedBoard,
      selectedChips: selectedChips,
      selectedItems: [],
      factionName: finalFactionName,
      startingLocation,
      startRecoveryRate: recoveryRate,
      startConversionRate: conversionRate,
      startSixDim: { ...sixDim, freePoints: sixDimFreePoints, cap: 99 },
      hasRedString: false,
      selectedLingshu: normalizedLingshu,
      neuralProtocol,
    };
    onComplete(config);
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar scrollbar-hidden bg-black p-4 md:p-8">
      <div className="max-w-5xl mx-auto border border-slate-800 bg-slate-950/85 backdrop-blur-xl p-5 md:p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">角色初始化</h2>
            <p className="text-xs text-slate-500 mt-1">先选性别与姓名，再进入差异化配置界面</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className={`px-2 py-1 border ${step === 'identity' ? 'border-cyan-500 text-cyan-300' : 'border-slate-700 text-slate-500'}`}>1. 身份</div>
          <div className={`px-2 py-1 border ${step === 'build' ? 'border-cyan-500 text-cyan-300' : 'border-slate-700 text-slate-500'}`}>2. 配置</div>
          <div className={`px-2 py-1 border ${step === 'world' ? 'border-cyan-500 text-cyan-300' : 'border-slate-700 text-slate-500'}`}>3. 世界</div>
        </div>

        {step === 'identity' && (
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase text-cyan-400 flex items-center gap-2">
              <Fingerprint className="w-4 h-4" /> 姓名与性别
            </div>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-black border border-slate-700 p-3 text-white focus:border-cyan-500 outline-none"
              placeholder="输入名字..."
            />
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setGender('male')} className={`border p-3 text-sm font-bold ${gender === 'male' ? 'border-cyan-500 bg-cyan-900/20 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>男性</button>
              <button type="button" onClick={() => setGender('female')} className={`border p-3 text-sm font-bold ${gender === 'female' ? 'border-pink-500 bg-pink-900/20 text-pink-300' : 'border-slate-700 text-slate-400'}`}>女性</button>
            </div>
          </section>
        )}

        {step === 'build' && (
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase text-purple-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 差异化配置（{gender === 'male' ? '男性' : '女性'})
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="border border-slate-800 p-3">
                <div className="flex justify-between text-xs mb-2"><span className="text-slate-400">灵能等级</span><span className="text-slate-200">{rankLabel(psionicRank)}</span></div>
                <input type="range" min="1" max="5" value={rankValue(psionicRank)} onChange={e => setPsionicRank(`Lv.${e.target.value}` as Rank)} className="w-full accent-purple-500" />
              </div>
              <div className="border border-slate-800 p-3">
                <div className="flex justify-between text-xs mb-2"><span className="text-slate-400 flex items-center gap-1"><CreditCard className="w-3 h-3" />灵能币</span><span className="text-yellow-400">¥ {credits.toLocaleString()}</span></div>
                <input type="range" min="0" max="50000" step="1000" value={credits} onChange={e => setCredits(parseInt(e.target.value, 10))} className="w-full accent-yellow-500" />
              </div>
              <div className="border border-slate-800 p-3">
                <div className="flex justify-between text-xs mb-2"><span className="text-slate-400">转化率</span><span className="text-amber-400">{conversionRate}%</span></div>
                <input type="range" min={conversionRange.min} max={conversionRange.max} step="5" value={conversionRate} onChange={e => setConversionRate(parseInt(e.target.value, 10))} className="w-full accent-amber-500" />
                <div className="text-[10px] text-slate-500 mt-1">范围：{conversionRange.min}% - {conversionRange.max}%</div>
              </div>
              <div className="border border-slate-800 p-3">
                <div className="flex justify-between text-xs mb-2"><span className="text-slate-400">恢复率</span><span className="text-green-400">{recoveryRate}%</span></div>
                <input type="range" min={recoveryRange.min} max={recoveryRange.max} step="5" value={recoveryRate} onChange={e => setRecoveryRate(parseInt(e.target.value, 10))} className="w-full accent-green-500" />
                <div className="text-[10px] text-slate-500 mt-1">范围：{recoveryRange.min}% - {recoveryRange.max}%</div>
              </div>
            </div>

            <div className="border border-slate-800 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-slate-300 font-bold">六维分配</div>
                <div className="text-[10px] text-cyan-300 font-mono">可分配点 {sixDimFreePoints}</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {sixDimKeys.map(key => (
                  <div key={key} className="border border-slate-800 bg-black/30 p-2 rounded">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300">{key}</span>
                      <span className="text-white font-mono">{sixDim[key]}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <button type="button" onClick={() => adjustSixDim(key, -1)} className="flex-1 border border-slate-700 text-slate-300 hover:text-white text-[10px] py-0.5">-</button>
                      <button type="button" onClick={() => adjustSixDim(key, 1)} className="flex-1 border border-cyan-800 text-cyan-300 hover:text-white text-[10px] py-0.5">+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 mt-2">开局单项上限 {sixDimCapAtStart}，后续可通过灵弦/装备/遗迹突破。</div>
            </div>

            <div className="space-y-3 border border-slate-800 p-3">
              <div className="text-xs text-slate-300 font-bold">统一模块：先天灵枢 + 神经协议</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <button onClick={() => setLingshuOpen(true)} className="text-left border border-fuchsia-800 px-3 py-3 hover:bg-fuchsia-900/20">
                  <div className="text-sm text-fuchsia-300 flex items-center gap-1"><Sparkles className="w-4 h-4" /> 先天灵枢</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    按部位配置：等级、灵能强度、{gender === 'male' ? '感知强度' : '吸收速率'}、装备、灵弦（上限 3）
                  </div>
                </button>
                <button onClick={() => setNeuralOpen(true)} className="text-left border border-cyan-800 px-3 py-3 hover:bg-cyan-900/20">
                  <div className="text-sm text-cyan-300 flex items-center gap-1"><ShieldAlert className="w-4 h-4" /> 神经协议</div>
                  <div className="text-[10px] text-slate-500 mt-1">协议、主板、芯片卡池、排序、自定义、删除</div>
                </button>
              </div>
            </div>
          </section>
        )}

        {step === 'world' && (
          <section className="space-y-4">
            <div className="text-xs font-bold uppercase text-green-400 flex items-center gap-2"><Flag className="w-4 h-4" /> 势力与出生点</div>
            <select className="w-full bg-black border border-slate-700 p-2 text-sm text-white" value={selectedFactionId} onChange={e => { const id = e.target.value; setSelectedFactionId(id); const picked = LN_FACTION_OPTIONS.find(f => f.id === id); if (picked) { setCustomFactionName(picked.name); setStartingLocation(picked.location); } }}>
              {LN_FACTION_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <input
              className="w-full bg-black border border-slate-700 p-2 text-sm text-white"
              value={customFactionName}
              onChange={e => setCustomFactionName(e.target.value)}
              placeholder="可直接输入自定义势力名"
            />
            <input
              className="w-full bg-black border border-slate-700 p-2 text-sm text-white"
              value={startingLocation}
              onChange={e => setStartingLocation(e.target.value)}
              list="ln-world-zones"
              placeholder="可直接输入自定义开局地点"
            />
            <datalist id="ln-world-zones">
              {LN_ZONE_OPTIONS.map(name => <option key={name} value={name} />)}
            </datalist>
          </section>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button onClick={() => setStep(prev => (prev === 'world' ? 'build' : prev === 'build' ? 'identity' : 'identity'))} disabled={step === 'identity'} className="px-4 py-2 text-xs border border-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed">上一步</button>
          {step !== 'world' ? (
            <button onClick={() => { if (step === 'identity') { if (!canGoBuild) return; setStep('build'); } else { setStep('world'); } }} className="px-4 py-2 text-xs border border-cyan-700 text-cyan-300 hover:bg-cyan-900/20">下一步</button>
          ) : (
            <button onClick={handleComplete} className="px-5 py-2 text-xs bg-cyan-600 hover:bg-cyan-500 text-black font-bold transition-colors">确认并进入</button>
          )}
        </div>
      </div>

      {neuralOpen && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl border border-cyan-900/60 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.08),transparent_45%),#080408] rounded-lg overflow-hidden max-h-[86vh] flex flex-col">
            <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4">
              <div className="text-sm font-bold text-cyan-300">神经协议配置界面</div>
              <button onClick={() => setNeuralOpen(false)} className="text-slate-400 hover:text-white">关闭</button>
            </div>
            <div className="p-4 overflow-y-auto scrollbar-hidden space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="border border-slate-800 rounded p-3 bg-black/30">
                  <div className="text-xs text-slate-400 mb-2">神经协议</div>
                  <div className="grid grid-cols-2 gap-2">
                    {(['none', 'beta'] as NeuralProtocol[]).map(protocol => (
                      <button
                        key={protocol}
                        onClick={() => setNeuralProtocol(protocol)}
                        className={`border px-2 py-1.5 text-xs font-bold transition-colors ${
                          neuralProtocol === protocol
                            ? protocol === 'none'
                              ? 'border-slate-500 text-slate-200 bg-slate-900/30'
                              : 'border-red-500 text-red-300 bg-red-900/20'
                            : 'border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {protocol === 'none' ? 'NULL' : 'BETA 协议'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-800 rounded p-3 bg-black/30 lg:col-span-2">
                  <div className="text-xs text-slate-400 mb-2">芯片主板（总槽位：{maxChipSlots}）</div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {NEURAL_BOARD_OPTIONS.map(board => (
                      <button
                        key={board.id}
                        onClick={() => setSelectedBoard(board)}
                        className={`text-left border rounded p-2 transition-colors ${selectedBoard.id === board.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 hover:border-slate-500'}`}
                      >
                        <div className="text-xs text-cyan-300 font-bold">{board.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1">等级：{rankLabel(board.rank)}</div>
                        <div className="text-[10px] text-slate-500">插槽：{board.rank === Rank.Lv1 ? 1 : board.rank === Rank.Lv2 ? 3 : board.rank === Rank.Lv3 ? 6 : board.rank === Rank.Lv4 ? 9 : 12}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-cyan-900/40 rounded p-3 bg-[#05070a]/70">
                <div className="flex items-center justify-between gap-2 mb-3 relative">
                  <div className="text-xs text-cyan-300 font-bold">芯片卡池（已选 {selectedChipIds.length}/{maxChipSlots}）</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setChipActionMenuOpen(prev => !prev)}
                      className={`border px-2 py-1 text-xs transition-colors ${chipActionMenuOpen ? 'border-cyan-500 text-cyan-200 bg-cyan-900/20' : 'border-slate-700 text-slate-300 hover:text-white'}`}
                    >
                      操作：{chipActionMode === 'auto' ? '自动' : chipActionMode === 'custom' ? '自定义' : '删除'}
                    </button>
                    {chipActionMenuOpen && (
                      <div className="absolute right-[88px] top-8 z-20 w-28 border border-slate-700 bg-black/95 rounded">
                        <button type="button" onClick={() => { setChipActionMode('auto'); setChipActionMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 text-xs ${chipActionMode === 'auto' ? 'text-cyan-300 bg-cyan-900/20' : 'text-slate-300 hover:bg-white/5'}`}>自动</button>
                        <button type="button" onClick={() => { setChipActionMode('custom'); setChipActionMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 text-xs ${chipActionMode === 'custom' ? 'text-purple-300 bg-purple-900/20' : 'text-slate-300 hover:bg-white/5'}`}>自定义</button>
                        <button type="button" onClick={() => { setChipActionMode('delete'); setChipActionMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 text-xs ${chipActionMode === 'delete' ? 'text-red-300 bg-red-900/20' : 'text-slate-300 hover:bg-white/5'}`}>删除</button>
                      </div>
                    )}
                    <select value={chipRankFilter} onChange={e => setChipRankFilter(e.target.value as 'all' | Rank)} className="bg-black border border-slate-700 px-2 py-1 text-xs text-white">
                      <option value="all">全部等级</option>
                      {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                    </select>
                    <button onClick={() => setChipSortDir(prev => (prev === 'asc' ? 'desc' : 'asc'))} className="border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:text-white">
                      排序：{chipSortDir === 'asc' ? '低->高' : '高->低'}
                    </button>
                  </div>
                </div>

                {chipActionMode === 'custom' && (
                  <div className="mb-3 border border-slate-800 rounded p-3 bg-black/40">
                    <div className="text-xs text-slate-400 mb-2">自定义芯片</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="芯片名称" className="bg-black border border-slate-700 px-2 py-1 text-xs text-white" />
                      <select value={customRank} onChange={e => setCustomRank(e.target.value as Rank)} className="bg-black border border-slate-700 px-2 py-1 text-xs text-white">
                        {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                      </select>
                    </div>
                    <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="芯片效果" rows={2} className="w-full mt-2 bg-black border border-slate-700 px-2 py-1 text-xs text-white" />
                    <button onClick={addCustomChip} className="w-full mt-2 border border-cyan-700 text-cyan-300 hover:bg-cyan-900/20 text-xs py-1.5">添加并选中</button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredChipEntries.map(entry => {
                    const inDeleteMode = chipActionMode === 'delete';
                    const selected = isChipSelected(entry.id);
                    const full = !selected && selectedChipIds.length >= maxChipSlots;
                    const chipObj = availableChips.find(chip => chip.id === entry.id);
                    return (
                      <button
                        key={entry.id}
                        disabled={!inDeleteMode && full}
                        onClick={() => {
                          if (!chipObj) return;
                          if (inDeleteMode) {
                            requestDeleteChip(chipObj);
                            return;
                          }
                          toggleChipSelect(entry.id);
                        }}
                        className={`min-h-[140px] border rounded p-3 text-left transition-colors ${rankBorderClass(entry.rank)} ${
                          selected ? 'bg-cyan-900/20' : 'bg-black/30 hover:bg-white/5'
                        } ${!inDeleteMode && full ? 'opacity-40 cursor-not-allowed' : ''} ${inDeleteMode ? 'hover:border-red-400/80 hover:bg-red-900/20' : ''}`}
                      >
                        <div className="text-sm text-slate-100 leading-5">{entry.name}</div>
                        <div className="text-xs text-cyan-300 mt-2">{rankLabel(entry.rank)}</div>
                        <div className="text-[11px] text-slate-400 mt-2 leading-5">{entry.description}</div>
                        {inDeleteMode && <div className="text-[10px] text-red-300 mt-2">点击删除（将二次确认）</div>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {lingshuOpen && (
        <div className="fixed inset-0 z-[125] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-6xl border border-slate-700 bg-[#080408] rounded-lg overflow-hidden max-h-[85vh] flex flex-col">
            <div className="h-12 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
              <div className="text-sm font-bold text-fuchsia-300">
                {gender === 'male' ? '男性灵枢配置' : '女性灵枢配置'}（{gender === 'male' ? '发散型' : '奇点型'}）
              </div>
              <button onClick={() => setLingshuOpen(false)} className="text-slate-400 hover:text-white">关闭</button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 overflow-y-auto scrollbar-hidden">
              <div className="border border-slate-800 rounded p-3 bg-black/20 md:col-span-1">
                <div className="text-xs text-slate-400 mb-2">灵枢部位（{lingshuParts.length}）</div>
                <div className="space-y-2 max-h-[58vh] overflow-y-auto scrollbar-hidden pr-1">
                  {lingshuParts.map(part => (
                    <button
                      key={part.id}
                      onClick={() => setActiveLingshuId(part.id)}
                      className={`w-full text-left border rounded p-2 ${activePart?.id === part.id ? 'border-fuchsia-500 bg-fuchsia-900/20' : 'border-slate-700 bg-black/30'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-100 truncate">{part.name}</span>
                        <span className="text-[10px] text-fuchsia-400">{rankLabel(part.rank)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">装备：{part.equippedItem?.name || '空'}</div>
                      <div className="text-[10px] text-slate-500 truncate">灵弦：{getPartSkills(part).length}/3</div>
                      <div className={`text-[10px] mt-1 ${isPartConfigured(part) ? 'text-green-400' : 'text-slate-600'}`}>
                        {isPartConfigured(part) ? '已完成' : '待配置'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-800 rounded p-3 bg-black/20 md:col-span-2 space-y-3">
                {activePart && (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <div className="text-sm text-fuchsia-300 font-bold">{activePart.name}</div>
                        <div className="text-[10px] text-slate-500">{activePart.description}</div>
                      </div>
                      <div className="text-xs text-slate-400">状态：{isPartConfigured(activePart) ? '已配置' : '待配置'}</div>
                    </div>

                    <div className="border border-slate-800 rounded p-3 bg-black/30">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-400">灵枢等级</span>
                        <span className="text-fuchsia-300">{rankLabel(activePart.rank)}</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={activePart.level || rankValue(activePart.rank)}
                        onChange={e => setPartLevel(parseInt(e.target.value, 10))}
                        className="w-full accent-fuchsia-500"
                      />
                      <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="border border-slate-800 rounded p-2 bg-black/40">
                          <div className="text-slate-500">灵能强度</div>
                          <div className="text-fuchsia-300 font-bold">{psionicStrengthByLevel(activePart.level || rankValue(activePart.rank), gender)}</div>
                        </div>
                        <div className="border border-slate-800 rounded p-2 bg-black/40">
                          <div className="text-slate-500">{gender === 'male' ? '感知强度' : '吸收速率'}</div>
                          <div className="text-cyan-300 font-bold">
                            {gender === 'male'
                              ? perceptionByLevel(activePart.level || rankValue(activePart.rank))
                              : `${absorbRateByLevel(activePart.level || rankValue(activePart.rank))} / s`}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <button
                        onClick={() => setLingshuSelectMode('skills')}
                        className={`border rounded p-3 text-left transition-colors ${lingshuSelectMode === 'skills' ? 'border-purple-500 bg-purple-900/20' : 'border-purple-800 hover:bg-purple-900/10'}`}
                      >
                        <div className="text-xs text-purple-300 flex items-center gap-1"><BookOpen className="w-3 h-3" /> 灵弦卡池（独立）</div>
                        <div className="text-[10px] text-slate-500 mt-1">已选 {getPartSkills(activePart).length}/3</div>
                        <div className="text-[10px] text-slate-400 truncate mt-1">{getPartSkills(activePart).map(s => s.name).join(' / ') || '未选择'}</div>
                      </button>

                      <button
                        onClick={() => setLingshuSelectMode('equipment')}
                        className={`border rounded p-3 text-left transition-colors ${lingshuSelectMode === 'equipment' ? 'border-cyan-500 bg-cyan-900/20' : 'border-cyan-800 hover:bg-cyan-900/10'}`}
                      >
                        <div className="text-xs text-cyan-300 flex items-center gap-1"><Wrench className="w-3 h-3" /> 装备卡池（独立）</div>
                        <div className="text-[10px] text-slate-500 mt-1">当前：{activePart.equippedItem?.name || '未选择'}</div>
                      </button>
                    </div>

                    {lingshuSelectMode === 'skills' ? (
                      <div className="border border-purple-900/40 rounded p-3 bg-[#070309]/70">
                        <div className="flex items-center justify-between gap-2 mb-3 relative">
                          <div className="text-xs text-purple-300 font-bold">灵弦选择：{activePart.name}（{getPartSkills(activePart).length}/3）</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSkillActionMenuOpen(prev => !prev)}
                              className={`border px-2 py-1 text-xs transition-colors ${skillActionMenuOpen ? 'border-purple-500 text-purple-200 bg-purple-900/20' : 'border-slate-700 text-slate-300 hover:text-white'}`}
                            >
                              操作：{skillActionMode === 'auto' ? '自动' : skillActionMode === 'custom' ? '自定义' : '删除'}
                            </button>
                            {skillActionMenuOpen && (
                              <div className="absolute right-[88px] top-8 z-20 w-28 border border-slate-700 bg-black/95 rounded">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSkillActionMode('auto');
                                    setSkillActionMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-xs ${skillActionMode === 'auto' ? 'text-cyan-300 bg-cyan-900/20' : 'text-slate-300 hover:bg-white/5'}`}
                                >
                                  自动
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSkillActionMode('custom');
                                    setSkillActionMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-xs ${skillActionMode === 'custom' ? 'text-purple-300 bg-purple-900/20' : 'text-slate-300 hover:bg-white/5'}`}
                                >
                                  自定义
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSkillActionMode('delete');
                                    setSkillActionMenuOpen(false);
                                  }}
                                  className={`w-full text-left px-2 py-1.5 text-xs ${skillActionMode === 'delete' ? 'text-red-300 bg-red-900/20' : 'text-slate-300 hover:bg-white/5'}`}
                                >
                                  删除
                                </button>
                              </div>
                            )}
                            <select value={lingshuSkillFilter} onChange={e => setLingshuSkillFilter(e.target.value as 'all' | Rank)} className="bg-black border border-slate-700 px-2 py-1 text-xs text-white">
                              <option value="all">全部等级</option>
                              {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                            </select>
                          </div>
                        </div>
                        {skillActionMode === 'custom' && (
                        <div className="mb-3 border border-slate-800 rounded p-3 bg-black/40">
                          <div className="text-xs text-slate-400 mb-2">自定义灵弦（仅当前部位卡池）</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              value={customLingshuSkillName}
                              onChange={e => setCustomLingshuSkillName(e.target.value)}
                              placeholder="灵弦名称"
                              className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                            />
                            <select
                              value={customLingshuSkillLevel}
                              onChange={e => setCustomLingshuSkillLevel(parseInt(e.target.value, 10))}
                              className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                            >
                              {[1, 2, 3, 4, 5].map(level => (
                                <option key={level} value={level}>{level}级</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            value={customLingshuSkillDesc}
                            onChange={e => setCustomLingshuSkillDesc(e.target.value)}
                            rows={2}
                            placeholder="灵弦效果描述"
                            className="w-full mt-2 bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={addCustomLingshuSkill}
                            className="w-full mt-2 border border-purple-700 text-purple-300 hover:bg-purple-900/20 text-xs py-1.5"
                          >
                            添加到当前部位灵弦卡池
                          </button>
                        </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {lingshuFilteredSkills.map(skill => {
                            const selectedSkills = getPartSkills(activePart);
                            const chosen = selectedSkills.some(s => s.id === skill.id);
                            const full = !chosen && selectedSkills.length >= 3;
                            const skillRank = levelToRank(skill.level);
                            const inDeleteMode = skillActionMode === 'delete';
                            return (
                              <button
                                key={skill.id}
                                disabled={!inDeleteMode && full}
                                onClick={() => {
                                  if (inDeleteMode) {
                                    requestDeleteSkill(skill);
                                    return;
                                  }
                                  toggleSkill(skill);
                                }}
                                className={`min-h-[140px] border rounded p-3 text-left transition-colors ${rankBorderClass(skillRank)} ${
                                  chosen ? 'bg-purple-900/20' : 'bg-black/30 hover:bg-white/5'
                                } ${!inDeleteMode && full ? 'opacity-40 cursor-not-allowed' : ''} ${inDeleteMode ? 'hover:border-red-400/80 hover:bg-red-900/20' : ''}`}
                              >
                                <div className="text-sm text-slate-100 leading-5">{skill.name}</div>
                                <div className="text-xs text-purple-300 mt-2">{rankLabel(skillRank)}</div>
                                <div className="text-[11px] text-slate-400 mt-2 leading-5">{skill.description}</div>
                                {inDeleteMode && <div className="text-[10px] text-red-300 mt-2">点击删除（将二次确认）</div>}
                              </button>
                            );
                          })}
                        </div>

                      </div>
                    ) : (
                      <div className="border border-cyan-900/40 rounded p-3 bg-[#05070a]/70">
                        <div className="flex items-center justify-between gap-2 mb-3 relative">
                          <div className="text-xs text-cyan-300 font-bold">装备选择：{activePart.name}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setShowCustomEquipForm(prev => !prev)}
                              className={`border px-2 py-1 text-xs transition-colors ${showCustomEquipForm ? 'border-cyan-500 text-cyan-200 bg-cyan-900/20' : 'border-slate-700 text-slate-300 hover:text-white'}`}
                            >
                              自定义
                            </button>
                            <select value={lingshuEquipFilter} onChange={e => setLingshuEquipFilter(e.target.value as 'all' | Rank)} className="bg-black border border-slate-700 px-2 py-1 text-xs text-white">
                              <option value="all">全部等级</option>
                              {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                            </select>
                          </div>
                        </div>
                        {showCustomEquipForm && (
                        <div className="mb-3 border border-slate-800 rounded p-3 bg-black/40">
                          <div className="text-xs text-slate-400 mb-2">自定义装备（仅当前部位卡池）</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <input
                              value={customLingshuEquipName}
                              onChange={e => setCustomLingshuEquipName(e.target.value)}
                              placeholder="装备名称"
                              className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                            />
                            <select
                              value={customLingshuEquipRank}
                              onChange={e => setCustomLingshuEquipRank(e.target.value as Rank)}
                              className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                            >
                              {Object.values(Rank).map(rank => (
                                <option key={rank} value={rank}>{rankLabel(rank)}</option>
                              ))}
                            </select>
                          </div>
                          <textarea
                            value={customLingshuEquipDesc}
                            onChange={e => setCustomLingshuEquipDesc(e.target.value)}
                            rows={2}
                            placeholder="装备效果描述"
                            className="w-full mt-2 bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                          />
                          <button
                            onClick={addCustomLingshuEquip}
                            className="w-full mt-2 border border-cyan-700 text-cyan-300 hover:bg-cyan-900/20 text-xs py-1.5"
                          >
                            添加到当前部位装备卡池
                          </button>
                        </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {lingshuFilteredEquip.map(item => {
                            const itemRank = item.rank || Rank.Lv1;
                            return (
                              <button
                                key={item.id}
                                onClick={() => chooseEquipment(item)}
                                className={`min-h-[140px] border rounded p-3 text-left transition-colors ${rankBorderClass(itemRank)} ${
                                  activePart.equippedItem?.id === item.id ? 'bg-cyan-900/20' : 'bg-black/30 hover:bg-white/5'
                                }`}
                              >
                                <div className="text-sm text-slate-100 leading-5">{item.name}</div>
                                <div className="text-xs text-cyan-300 mt-2">{rankLabel(itemRank)}</div>
                                <div className="text-[11px] text-slate-400 mt-2 leading-5">{item.description}</div>
                              </button>
                            );
                          })}
                        </div>

                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteSkill && (
        <div className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-red-900/60 rounded bg-[#080408] p-4">
            <div className="text-sm font-bold text-red-300">确认删除灵弦</div>
            <div className="text-xs text-slate-300 mt-2">
              确认删除灵弦「{pendingDeleteSkill.name}」？删除后无法恢复。
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setPendingDeleteSkill(null)}
                className="border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={confirmDeleteSkill}
                className="border border-red-700 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingDeleteChip && (
        <div className="fixed inset-0 z-[141] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-red-900/60 rounded bg-[#080408] p-4">
            <div className="text-sm font-bold text-red-300">确认删除芯片</div>
            <div className="text-xs text-slate-300 mt-2">
              确认删除芯片「{pendingDeleteChip.name}」？删除后无法恢复。
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button type="button" onClick={() => setPendingDeleteChip(null)} className="border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white">取消</button>
              <button type="button" onClick={confirmDeleteChip} className="border border-red-700 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSetup;
