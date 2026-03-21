
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CreditCard, Fingerprint, Flag, ShieldAlert, Sparkles, Zap, Wrench, BookOpen, Download, Upload } from 'lucide-react';
import { CareerTrack, Chip, EquippedItem, GameConfig, Item, LingshuPart, Rank, Skill } from '../../types';
import {
  buildDefaultSetupPack,
  cloneCareerTracks,
  cloneChipList,
  cloneEquipPoolMap,
  cloneItemList,
  cloneLingshuParts,
  cloneSkillPoolMap,
  LN_SETUP_PACK_LEGACY_STORAGE_KEY,
  LN_SETUP_PACK_STORAGE_KEY,
  LnSetupPackData,
  normalizeSetupPack,
} from '../../data/setupPack';
import CareerLineEditorModal from '../ui/CareerLineEditorModal';

interface Props {
  onComplete: (config: GameConfig) => void;
}

type Step = 'identity' | 'build' | 'world';
type PickerMode = 'chip' | 'equip';
type LingshuSelectMode = 'skills' | 'equipment';
type SkillActionMode = 'auto' | 'custom' | 'delete';
type NeuralProtocol = 'none' | 'beta';
type ChipActionMode = 'auto' | 'custom' | 'delete';
type BoardActionMode = 'select' | 'custom' | 'delete';
type ItemActionMode = 'select' | 'custom' | 'delete';

interface PickerEntry {
  id: string;
  name: string;
  rank: Rank;
  description: string;
}

const DEFAULT_SETUP_PACK = buildDefaultSetupPack();

const levelToRank = (level: number): Rank => {
  if (level <= 1) return Rank.Lv1;
  if (level === 2) return Rank.Lv2;
  if (level === 3) return Rank.Lv3;
  if (level === 4) return Rank.Lv4;
  return Rank.Lv5;
};

const rankValue = (rank: Rank) => parseInt(rank.replace('Lv.', ''), 10);
const rankLabel = (rank: Rank) => `${rankValue(rank)}级`;

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

const GameSetup: React.FC<Props> = ({ onComplete }) => {
  const packFileInputRef = useRef<HTMLInputElement | null>(null);
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

  const [availableBoards, setAvailableBoards] = useState<Chip[]>(() => cloneChipList(DEFAULT_SETUP_PACK.boardOptions));
  const [selectedBoard, setSelectedBoard] = useState<Chip>(() => ({ ...DEFAULT_SETUP_PACK.boardOptions[0] }));
  const [availableChips, setAvailableChips] = useState<Chip[]>(() => cloneChipList(DEFAULT_SETUP_PACK.availableChips));
  const [selectedChipIds, setSelectedChipIds] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<Item[]>(() => cloneItemList(DEFAULT_SETUP_PACK.availableItems));
  const [selectedStarterItemIds, setSelectedStarterItemIds] = useState<string[]>(() => [...DEFAULT_SETUP_PACK.selectedStarterItemIds]);

  const [lingshuParts, setLingshuParts] = useState<LingshuPart[]>(() => cloneLingshuParts(DEFAULT_SETUP_PACK.lingshuParts));
  const [partSkillPools, setPartSkillPools] = useState<Record<string, Skill[]>>(() => cloneSkillPoolMap(DEFAULT_SETUP_PACK.partSkillPools));
  const [partEquipPools, setPartEquipPools] = useState<Record<string, EquippedItem[]>>(() => cloneEquipPoolMap(DEFAULT_SETUP_PACK.partEquipPools));
  const [lingshuOpen, setLingshuOpen] = useState(false);
  const [activeLingshuId, setActiveLingshuId] = useState<string>(DEFAULT_SETUP_PACK.lingshuParts[0]?.id || '');
  const [lingshuSelectMode, setLingshuSelectMode] = useState<LingshuSelectMode>('skills');
  const [lingshuEquipFilter, setLingshuEquipFilter] = useState<'all' | Rank>('all');
  const [lingshuSkillFilter, setLingshuSkillFilter] = useState<'all' | Rank>('all');

  const [zoneOptions, setZoneOptions] = useState<string[]>(() => [...DEFAULT_SETUP_PACK.zoneOptions]);
  const [startingLocation, setStartingLocation] = useState<string>(DEFAULT_SETUP_PACK.zoneOptions[0] || '');

  const [neuralOpen, setNeuralOpen] = useState(false);
  const [boardActionMode, setBoardActionMode] = useState<BoardActionMode>('select');
  const [boardActionMenuOpen, setBoardActionMenuOpen] = useState(false);
  const [pendingDeleteBoard, setPendingDeleteBoard] = useState<Chip | null>(null);
  const [chipRankFilter, setChipRankFilter] = useState<'all' | Rank>('all');
  const [chipSortDir, setChipSortDir] = useState<'desc' | 'asc'>('desc');
  const [chipActionMode, setChipActionMode] = useState<ChipActionMode>('auto');
  const [chipActionMenuOpen, setChipActionMenuOpen] = useState(false);
  const [pendingDeleteChip, setPendingDeleteChip] = useState<Chip | null>(null);
  const [itemActionMode, setItemActionMode] = useState<ItemActionMode>('select');
  const [itemActionMenuOpen, setItemActionMenuOpen] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<Item | null>(null);
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [customName, setCustomName] = useState('');
  const [customDesc, setCustomDesc] = useState('');
  const [customRank, setCustomRank] = useState<Rank>(Rank.Lv1);
  const [customBoardName, setCustomBoardName] = useState('');
  const [customBoardDesc, setCustomBoardDesc] = useState('');
  const [customBoardRank, setCustomBoardRank] = useState<Rank>(Rank.Lv1);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemDesc, setCustomItemDesc] = useState('');
  const [customItemRank, setCustomItemRank] = useState<Rank>(Rank.Lv1);
  const [customItemCategory, setCustomItemCategory] = useState<Item['category']>('consumable');
  const [customItemQuantity, setCustomItemQuantity] = useState<number>(1);
  const [customItemIcon, setCustomItemIcon] = useState('🎒');
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
  const [careerTracks, setCareerTracks] = useState<CareerTrack[]>(() => cloneCareerTracks(DEFAULT_SETUP_PACK.careerTracks));
  const [newZoneOption, setNewZoneOption] = useState('');

  const starterItems = useMemo(
    () => availableItems.filter(item => selectedStarterItemIds.includes(item.id)),
    [availableItems, selectedStarterItemIds],
  );

  const conversionRange = gender === 'male' ? { min: 15, max: 30 } : { min: 80, max: 120 };
  const recoveryRange = gender === 'male' ? { min: 70, max: 200 } : { min: 10, max: 40 };

  const applySetupPackState = (pack: LnSetupPackData) => {
    setAvailableBoards(pack.boardOptions);
    setSelectedBoard(pack.boardOptions[0] ? { ...pack.boardOptions[0] } : { ...DEFAULT_SETUP_PACK.boardOptions[0] });
    setAvailableChips(pack.availableChips);
    setSelectedChipIds([]);
    setAvailableItems(pack.availableItems);
    setSelectedStarterItemIds(pack.selectedStarterItemIds);
    setZoneOptions(pack.zoneOptions);
    setStartingLocation(pack.zoneOptions[0] || '');
    setLingshuParts(pack.lingshuParts);
    setPartSkillPools(pack.partSkillPools);
    setPartEquipPools(pack.partEquipPools);
    setActiveLingshuId(pack.lingshuParts[0]?.id || '');
    setCareerTracks(pack.careerTracks);
  };

  const buildCurrentSetupPack = (): LnSetupPackData => ({
    version: 2,
    boardOptions: cloneChipList(availableBoards),
    availableChips: cloneChipList(availableChips),
    availableItems: cloneItemList(availableItems),
    selectedStarterItemIds: [...selectedStarterItemIds],
    zoneOptions: [...zoneOptions],
    lingshuParts: cloneLingshuParts(lingshuParts),
    partSkillPools: cloneSkillPoolMap(partSkillPools),
    partEquipPools: cloneEquipPoolMap(partEquipPools),
    careerTracks: cloneCareerTracks(careerTracks),
  });

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

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(LN_SETUP_PACK_STORAGE_KEY) ||
        window.localStorage.getItem(LN_SETUP_PACK_LEGACY_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<LnSetupPackData>;
      applySetupPackState(normalizeSetupPack(parsed));
    } catch (error) {
      console.warn('读取本地开局包失败:', error);
    }
  }, []);

  useEffect(() => {
    setSelectedStarterItemIds(prev => prev.filter(id => availableItems.some(item => item.id === id)));
  }, [availableItems]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LN_SETUP_PACK_STORAGE_KEY, JSON.stringify(buildCurrentSetupPack()));
      window.localStorage.removeItem(LN_SETUP_PACK_LEGACY_STORAGE_KEY);
    } catch (error) {
      console.warn('写入本地开局包失败:', error);
    }
  }, [availableBoards, availableChips, availableItems, selectedStarterItemIds, zoneOptions, lingshuParts, partSkillPools, partEquipPools, careerTracks]);

  useEffect(() => {
    if (availableBoards.length === 0) return;
    setSelectedBoard(prev => availableBoards.find(board => board.id === prev.id) || { ...availableBoards[0] });
  }, [availableBoards]);

  useEffect(() => {
    if (lingshuParts.length === 0) return;
    if (!lingshuParts.some(part => part.id === activeLingshuId)) {
      setActiveLingshuId(lingshuParts[0].id);
    }
  }, [activeLingshuId, lingshuParts]);

  useEffect(() => {
    if (zoneOptions.length === 0) return;
    if (!startingLocation.trim()) {
      setStartingLocation(zoneOptions[0]);
    }
  }, [startingLocation, zoneOptions]);

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
    setSelectedChipIds(prev =>
      prev
        .filter(id => availableChips.some(chip => chip.id === id))
        .slice(0, maxChipSlots),
    );
  }, [availableChips, maxChipSlots]);

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

  const addCustomBoard = () => {
    if (!customBoardName.trim() || !customBoardDesc.trim()) return;
    const board: Chip = {
      id: `custom_board_${Date.now()}`,
      name: customBoardName.trim(),
      rank: customBoardRank,
      description: customBoardDesc.trim(),
      type: 'board',
    };
    setAvailableBoards(prev => [board, ...prev]);
    setSelectedBoard(board);
    setCustomBoardName('');
    setCustomBoardDesc('');
    setCustomBoardRank(Rank.Lv1);
  };

  const requestDeleteBoard = (board: Chip) => setPendingDeleteBoard(board);

  const confirmDeleteBoard = () => {
    if (!pendingDeleteBoard || availableBoards.length <= 1) return;
    setAvailableBoards(prev => prev.filter(board => board.id !== pendingDeleteBoard.id));
    if (selectedBoard.id === pendingDeleteBoard.id) {
      const fallback = availableBoards.find(board => board.id !== pendingDeleteBoard.id);
      if (fallback) setSelectedBoard({ ...fallback });
    }
    setPendingDeleteBoard(null);
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

  const toggleStarterItem = (itemId: string) => {
    setSelectedStarterItemIds(prev => (prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]));
  };

  const addCustomStarterItem = () => {
    if (!customItemName.trim()) return;
    const item: Item = {
      id: `custom_item_${Date.now()}`,
      name: customItemName.trim(),
      quantity: Math.max(1, customItemQuantity),
      icon: customItemIcon.trim() || '🎒',
      description: customItemDesc.trim() || '自定义开局物品。',
      category: customItemCategory,
      rank: customItemRank,
    };
    setAvailableItems(prev => [item, ...prev]);
    setSelectedStarterItemIds(prev => (prev.includes(item.id) ? prev : [item.id, ...prev]));
    setCustomItemName('');
    setCustomItemDesc('');
    setCustomItemRank(Rank.Lv1);
    setCustomItemCategory('consumable');
    setCustomItemQuantity(1);
    setCustomItemIcon('🎒');
  };

  const requestDeleteItem = (item: Item) => setPendingDeleteItem(item);

  const confirmDeleteItem = () => {
    if (!pendingDeleteItem) return;
    setAvailableItems(prev => prev.filter(item => item.id !== pendingDeleteItem.id));
    setSelectedStarterItemIds(prev => prev.filter(id => id !== pendingDeleteItem.id));
    setPendingDeleteItem(null);
  };

  const addZoneOption = () => {
    const nextZone = newZoneOption.trim();
    if (!nextZone) return;
    setZoneOptions(prev => (prev.includes(nextZone) ? prev : [...prev, nextZone]));
    setStartingLocation(nextZone);
    setNewZoneOption('');
  };

  const removeZoneOption = (zoneName: string) => {
    setZoneOptions(prev => {
      if (prev.length <= 1) return prev;
      const next = prev.filter(name => name !== zoneName);
      if (next.length === 0) return prev;
      if (startingLocation === zoneName) {
        setStartingLocation(next[0]);
      }
      return next;
    });
  };

  const exportSetupPack = () => {
    const pack = buildCurrentSetupPack();
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ln-setup-pack-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const restoreDefaultSetupPack = () => {
    applySetupPackState(buildDefaultSetupPack());
  };

  const applyImportedSetupPack = (pack: Partial<LnSetupPackData>) => {
    applySetupPackState(normalizeSetupPack(pack));
  };

  const importSetupPackFromFile = async (file: File | null | undefined) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<LnSetupPackData>;
      applyImportedSetupPack(parsed);
    } catch (error) {
      console.warn('导入开局包失败:', error);
      window.alert('导入开局包失败，请检查 JSON 格式。');
    }
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
    const normalizedLocation = startingLocation.trim() || zoneOptions[0] || DEFAULT_SETUP_PACK.zoneOptions[0];
    const finalFactionName = normalizedLocation;
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
      name: name.trim() || '未命名接入者',
      gender,
      citizenId: `NC-${Math.floor(Math.random() * 1000000)}`,
      startCredits: credits,
      startPsionicRank: psionicRank,
      installBetaChip: neuralProtocol === 'beta',
      selectedBoard: { ...selectedBoard },
      selectedChips: cloneChipList(selectedChips),
      availableChipPool: cloneChipList(availableChips),
      selectedItems: cloneItemList(starterItems),
      factionName: finalFactionName,
      startingLocation: normalizedLocation,
      startRecoveryRate: recoveryRate,
      startConversionRate: conversionRate,
      startSixDim: { ...sixDim, freePoints: sixDimFreePoints, cap: 99 },
      hasRedString: false,
      selectedLingshu: cloneLingshuParts(normalizedLingshu),
      neuralProtocol,
      careerTracks: cloneCareerTracks(careerTracks),
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportSetupPack}
              className="border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> 导出开局包
            </button>
            <button
              type="button"
              onClick={() => packFileInputRef.current?.click()}
              className="border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:text-white flex items-center gap-1"
            >
              <Upload className="w-3.5 h-3.5" /> 导入开局包
            </button>
            <button
              type="button"
              onClick={restoreDefaultSetupPack}
              className="border border-slate-700 px-2 py-1 text-[11px] text-slate-300 hover:text-white"
            >
              恢复默认
            </button>
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
          </div>
        </div>
        <input
          ref={packFileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async e => {
            await importSetupPackFromFile(e.target.files?.[0]);
            e.currentTarget.value = '';
          }}
        />

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
                <div className="flex justify-between text-xs mb-2"><span className="text-slate-400 flex items-center gap-1"><CreditCard className="w-3 h-3" />灵能币</span><span className="text-yellow-400">{credits.toLocaleString()} 灵能币</span></div>
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
            <div className="text-xs font-bold uppercase text-green-400 flex items-center gap-2"><Flag className="w-4 h-4" /> 开局区域</div>
            <input
              className="w-full bg-black border border-slate-700 p-2 text-sm text-white"
              value={startingLocation}
              onChange={e => setStartingLocation(e.target.value)}
              list="ln-world-zones"
              placeholder="可直接输入自定义开局区域"
            />
            <datalist id="ln-world-zones">
              {zoneOptions.map(name => <option key={name} value={name} />)}
            </datalist>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                className="w-full bg-black border border-slate-700 p-2 text-sm text-white"
                value={newZoneOption}
                onChange={e => setNewZoneOption(e.target.value)}
                placeholder="添加到作者默认地区列表"
              />
              <button
                type="button"
                onClick={addZoneOption}
                className="px-3 py-2 text-xs border border-emerald-700 text-emerald-300 hover:bg-emerald-900/20"
              >
                添加地区
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {zoneOptions.map(zone => (
                <div
                  key={zone}
                  className={`flex items-center gap-2 rounded border px-2 py-1 text-[11px] ${
                    startingLocation === zone ? 'border-cyan-500 text-cyan-200 bg-cyan-900/20' : 'border-slate-700 text-slate-300 bg-black/30'
                  }`}
                >
                  <button type="button" onClick={() => setStartingLocation(zone)} className="text-left">
                    {zone}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeZoneOption(zone)}
                    disabled={zoneOptions.length <= 1}
                    className="text-slate-500 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <div className="border border-amber-900/40 rounded p-3 bg-[#090705]/70 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-amber-300">职业线模板</div>
                  <div className="text-[10px] text-slate-500 mt-1">作者包会把职业线模板一起导出、导入，并作为新档默认内容。</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCareerEditorOpen(true)}
                  className="px-3 py-2 text-xs border border-amber-700 text-amber-300 hover:bg-amber-900/20"
                >
                  编辑职业线
                </button>
              </div>
              <div className="space-y-2">
                {careerTracks.map(track => (
                  <div key={track.id} className="border border-slate-800 rounded px-3 py-2 bg-black/30">
                    <div className="text-xs text-slate-100">{track.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">{track.entryRequirement || '未填写准入条件'}</div>
                    <div className="text-[10px] text-amber-300 mt-1">节点数：{track.nodes.length}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-slate-500">
              势力将自动按开局区域推导，不再单独选择。
            </div>
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
                  <div className="flex items-center justify-between gap-2 mb-2 relative">
                    <div className="text-xs text-slate-400">芯片主板（总槽位：{maxChipSlots}）</div>
                    <button
                      type="button"
                      onClick={() => setBoardActionMenuOpen(prev => !prev)}
                      className={`border px-2 py-1 text-xs transition-colors ${boardActionMenuOpen ? 'border-cyan-500 text-cyan-200 bg-cyan-900/20' : 'border-slate-700 text-slate-300 hover:text-white'}`}
                    >
                      操作：{boardActionMode === 'select' ? '选择' : boardActionMode === 'custom' ? '自定义' : '删除'}
                    </button>
                    {boardActionMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-28 border border-slate-700 bg-black/95 rounded">
                        <button type="button" onClick={() => { setBoardActionMode('select'); setBoardActionMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 text-xs ${boardActionMode === 'select' ? 'text-cyan-300 bg-cyan-900/20' : 'text-slate-300 hover:bg-white/5'}`}>选择</button>
                        <button type="button" onClick={() => { setBoardActionMode('custom'); setBoardActionMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 text-xs ${boardActionMode === 'custom' ? 'text-purple-300 bg-purple-900/20' : 'text-slate-300 hover:bg-white/5'}`}>自定义</button>
                        <button type="button" onClick={() => { setBoardActionMode('delete'); setBoardActionMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 text-xs ${boardActionMode === 'delete' ? 'text-red-300 bg-red-900/20' : 'text-slate-300 hover:bg-white/5'}`}>删除</button>
                      </div>
                    )}
                  </div>
                  {boardActionMode === 'custom' && (
                    <div className="mb-3 border border-slate-800 rounded p-3 bg-black/40">
                      <div className="text-xs text-slate-400 mb-2">自定义主板</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input value={customBoardName} onChange={e => setCustomBoardName(e.target.value)} placeholder="主板名称" className="bg-black border border-slate-700 px-2 py-1 text-xs text-white" />
                        <select value={customBoardRank} onChange={e => setCustomBoardRank(e.target.value as Rank)} className="bg-black border border-slate-700 px-2 py-1 text-xs text-white">
                          {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                        </select>
                      </div>
                      <textarea value={customBoardDesc} onChange={e => setCustomBoardDesc(e.target.value)} placeholder="主板描述" rows={2} className="w-full mt-2 bg-black border border-slate-700 px-2 py-1 text-xs text-white" />
                      <button onClick={addCustomBoard} className="w-full mt-2 border border-cyan-700 text-cyan-300 hover:bg-cyan-900/20 text-xs py-1.5">添加并设为默认主板</button>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                    {availableBoards.map(board => (
                      <button
                        key={board.id}
                        onClick={() => {
                          if (boardActionMode === 'delete') {
                            requestDeleteBoard(board);
                            return;
                          }
                          setSelectedBoard({ ...board });
                        }}
                        className={`text-left border rounded p-2 transition-colors ${selectedBoard.id === board.id ? 'border-cyan-500 bg-cyan-900/20' : 'border-slate-700 hover:border-slate-500'}`}
                      >
                        <div className="text-xs text-cyan-300 font-bold">{board.name}</div>
                        <div className="text-[10px] text-slate-500 mt-1">等级：{rankLabel(board.rank)}</div>
                        <div className="text-[10px] text-slate-500">插槽：{board.rank === Rank.Lv1 ? 1 : board.rank === Rank.Lv2 ? 3 : board.rank === Rank.Lv3 ? 6 : board.rank === Rank.Lv4 ? 9 : 12}</div>
                        {boardActionMode === 'delete' && <div className="text-[10px] text-red-300 mt-2">点击删除（将二次确认）</div>}
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

              <div className="border border-emerald-900/40 rounded p-3 bg-[#04090a]/70">
                <div className="flex items-center justify-between gap-2 mb-3 relative">
                  <div className="text-xs text-emerald-300 font-bold">开局物品（已选 {starterItems.length}/{availableItems.length}）</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setItemActionMenuOpen(prev => !prev)}
                      className={`border px-2 py-1 text-xs transition-colors ${itemActionMenuOpen ? 'border-emerald-500 text-emerald-200 bg-emerald-900/20' : 'border-slate-700 text-slate-300 hover:text-white'}`}
                    >
                      操作：{itemActionMode === 'select' ? '选择' : itemActionMode === 'custom' ? '自定义' : '删除'}
                    </button>
                    {itemActionMenuOpen && (
                      <div className="absolute right-0 top-8 z-20 w-28 border border-slate-700 bg-black/95 rounded">
                        <button
                          type="button"
                          onClick={() => {
                            setItemActionMode('select');
                            setItemActionMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs ${itemActionMode === 'select' ? 'text-emerald-300 bg-emerald-900/20' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          选择
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemActionMode('custom');
                            setItemActionMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs ${itemActionMode === 'custom' ? 'text-cyan-300 bg-cyan-900/20' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          自定义
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setItemActionMode('delete');
                            setItemActionMenuOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1.5 text-xs ${itemActionMode === 'delete' ? 'text-red-300 bg-red-900/20' : 'text-slate-300 hover:bg-white/5'}`}
                        >
                          删除
                        </button>
                      </div>
                    )}
                    <div className="text-[10px] text-slate-500">导入/导出的开局包会携带默认开局物品清单</div>
                  </div>
                </div>
                {itemActionMode === 'custom' && (
                  <div className="mb-3 border border-slate-800 rounded p-3 bg-black/40">
                    <div className="text-xs text-slate-400 mb-2">自定义开局物品</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input
                        value={customItemName}
                        onChange={e => setCustomItemName(e.target.value)}
                        placeholder="物品名称"
                        className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                      />
                      <input
                        value={customItemIcon}
                        onChange={e => setCustomItemIcon(e.target.value)}
                        placeholder="图标字符"
                        className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                      />
                      <select
                        value={customItemRank}
                        onChange={e => setCustomItemRank(e.target.value as Rank)}
                        className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                      >
                        {Object.values(Rank).map(rank => <option key={rank} value={rank}>{rankLabel(rank)}</option>)}
                      </select>
                      <select
                        value={customItemCategory}
                        onChange={e => setCustomItemCategory(e.target.value as Item['category'])}
                        className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                      >
                        <option value="consumable">consumable</option>
                        <option value="equipment">equipment</option>
                        <option value="material">material</option>
                        <option value="quest">quest</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-2 mt-2">
                      <textarea
                        value={customItemDesc}
                        onChange={e => setCustomItemDesc(e.target.value)}
                        rows={2}
                        placeholder="物品描述"
                        className="w-full bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                      />
                      <input
                        type="number"
                        min="1"
                        value={customItemQuantity}
                        onChange={e => setCustomItemQuantity(Math.max(1, parseInt(e.target.value || '1', 10) || 1))}
                        className="bg-black border border-slate-700 px-2 py-1 text-xs text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addCustomStarterItem}
                      className="w-full mt-2 border border-emerald-700 text-emerald-300 hover:bg-emerald-900/20 text-xs py-1.5"
                    >
                      添加并加入默认开局
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availableItems.map(item => {
                    const selected = selectedStarterItemIds.includes(item.id);
                    const inDeleteMode = itemActionMode === 'delete';
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (inDeleteMode) {
                            requestDeleteItem(item);
                            return;
                          }
                          toggleStarterItem(item.id);
                        }}
                        className={`min-h-[140px] border rounded p-3 text-left transition-colors ${
                          selected ? 'border-emerald-500 bg-emerald-900/20' : 'border-slate-700 bg-black/30 hover:bg-white/5'
                        } ${
                          inDeleteMode ? 'hover:border-red-400/80 hover:bg-red-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm text-slate-100 leading-5">{item.name}</div>
                          <div className="text-lg leading-none">{item.icon}</div>
                        </div>
                        <div className="text-xs text-emerald-300 mt-2">{rankLabel(item.rank)} · {item.category}</div>
                        <div className="text-[11px] text-slate-400 mt-2 leading-5">{item.description}</div>
                        <div className="text-[10px] text-slate-500 mt-2">数量：x{item.quantity}</div>
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

      <CareerLineEditorModal
        open={careerEditorOpen}
        onClose={() => setCareerEditorOpen(false)}
        tracks={careerTracks}
        onChangeTracks={tracks => setCareerTracks(cloneCareerTracks(tracks))}
      />

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

      {pendingDeleteBoard && (
        <div className="fixed inset-0 z-[142] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md border border-red-900/60 rounded bg-[#080408] p-4">
            <div className="text-sm font-bold text-red-300">确认删除主板</div>
            <div className="text-xs text-slate-300 mt-2">
              确认删除主板「{pendingDeleteBoard.name}」？至少需要保留一张主板。
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button type="button" onClick={() => setPendingDeleteBoard(null)} className="border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:text-white">取消</button>
              <button type="button" onClick={confirmDeleteBoard} className="border border-red-700 px-3 py-1.5 text-xs text-red-300 hover:bg-red-900/20">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameSetup;
