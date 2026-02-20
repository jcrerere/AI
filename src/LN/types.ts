
export enum Rank {
  Lv1 = 'Lv.1',
  Lv2 = 'Lv.2',
  Lv3 = 'Lv.3',
  Lv4 = 'Lv.4',
  Lv5 = 'Lv.5'
}

export enum FormStatus {
  Stable = '稳定',
  Warning = '警告',
  Danger = '危险',
  Critical = '濒死',
  Collapsed = '微缩形态'
}

export interface Chip {
  id: string;
  name: string;
  type: 'active' | 'passive' | 'process' | 'board' | 'beta';
  rank: Rank;
  description: string;
}

export type ItemCategory = 'consumable' | 'equipment' | 'material' | 'quest';

export interface Item {
  id: string;
  name: string;
  quantity: number;
  icon: string;
  description?: string;
  category: ItemCategory;
  rank: Rank;
}

export interface Message {
  id: string;
  sender: 'System' | 'Player' | 'NPC';
  name?: string;
  content: string;
  timestamp: string;
  type?: 'narrative' | 'dialogue' | 'action';
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  description: string;
  effectLines?: string[];
  sixDimBonuses?: Partial<Record<'力量' | '敏捷' | '体质' | '感知' | '意志' | '魅力', number>>;
  conversionRateBonus?: number;
  recoveryRateBonus?: number;
  rank?: Rank;
  isCustom?: boolean;
  rankColor?: 'red' | 'gold' | 'purple' | 'blue' | 'white'; // Added for special highlighting
}

export interface EquippedItem {
    id: string;
    name: string;
    description: string;
    imageUrl?: string;
    sourceItemId?: string;
    conversionRateBonus?: number;
    recoveryRateBonus?: number;
    rank?: Rank; // Optional override, otherwise inherits body part rank
}

export interface RuntimeAffix {
  id: string;
  name: string;
  description: string;
  type?: 'buff' | 'debuff' | 'neutral';
  source?: string;
  stacks?: number;
}

export interface CapturedSoul {
    id: string;
    originalName: string;
    rank: Rank;
    efficiency: number; // How much MP it generates
    retainedSkills: Skill[];
    status: 'intact' | 'draining' | 'depleted';
}

export interface BodyPart {
  id: string;
  name: string; 
  key: string; // e.g., 'left_arm', 'eyes'
  rank: Rank;
  strengthProgress?: number;
  description: string;
  skills: Skill[];
  equippedItems: EquippedItem[]; // Changed to array for multiple slots
  statusAffixes?: RuntimeAffix[];
  capturedSouls?: CapturedSoul[]; // Female Core specific: Imprisoned male souls
  maxSkillSlots?: number; // Dynamic slot capacity based on consumed souls
  maxEquipSlots?: number;
  reserveMp?: { current: number; max: number }; // Spirit Core Space specific reserve mana
}

export interface DeductionRecord {
    id: string;
    reason: string;
    amount: number;
    timestamp: string;
    type: 'fine' | 'shame'; // Type of deduction
}

export interface PlayerCivilianStatus {
  citizenId: string;
  creditScore: number; // 0 - 100
  warningLevel?: 'Low' | 'Medium' | 'Purge';
  deductionHistory: DeductionRecord[];
  warnings: string[];
  taxDeadline: string;
  taxAmount: number;
  betaLevel?: number;
  betaTierName?: string;
  taxOfficerName?: string;
  taxOfficeAddress?: string;
}

export interface BetaTask {
  id: string;
  title: string;
  detail: string;
  scoreReward: number;
  creditReward: number;
  done: boolean;
}

export interface PsionicStats {
    level: Rank; 
    xp: number; 
    maxXp: number;
    conversionRate: number; // % Efficiency (0-300)
    recoveryRate: number; // Natural recovery per tick (35-200)
}

export interface SixDimStats {
  力量: number;
  敏捷: number;
  体质: number;
  感知: number;
  意志: number;
  魅力: number;
  freePoints?: number;
  cap?: number;
}

export interface PlayerStats {
  hp: { current: number; max: number };
  mp: { current: number; max: number };
  formStability: number;
  formStatus: FormStatus;
  psionic: PsionicStats;
  sixDim: SixDimStats;
  sanity: { current: number; max: number };
  charisma: { current: number; max: number };
  credits: number; // Renamed to Psionic Coins in UI
  gasMask: { current: number; max: number }; // New Gas Mask Durability
}

export interface SocialComment {
    id: string;
    sender: string;
    content: string;
    timestamp: string;
}

export interface NPC {
  id: string;
  name: string;
  gender: 'female' | 'male';
  group: string; // Contact group name
  position: string; // Job title
  affiliation: string;
  location: string;
  
  // New Property for Contact System
  isContact?: boolean; // True if in "Marked Characters", False if just "Nearby"
  temporaryStatus?: string; // e.g. "Recently Removed"

  // Stats
  stats: PlayerStats;
  
  // Female specific
  affection?: number;
  bodyParts?: BodyPart[]; // Only females have Spirit Nexus
  
  // Male specific
  trust?: number;
  spiritSkills?: Skill[]; // Male/Divergent Spirit Core Skills

  // General
  chips?: Chip[]; // Male NPCs use standard chips
  avatarUrl: string;
  status: 'online' | 'busy' | 'offline';
  inventory: Item[];
  socialFeed: {
    id: string;
    content: string;
    timestamp: string;
    image?: string;
    comments: SocialComment[];
  }[];
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  objectives: string[];
  issuer: string;
  reward: string;
  difficulty: Rank;
  status: 'active' | 'completed';
  deadline?: string;
}

// --- Immersive Map Types ---

export type ServiceType = 'food' | 'gear' | 'clinic' | 'entertainment' | 'transport' | 'intel';

export interface ServicePoint {
    id: string;
    name: string;
    type: ServiceType;
    description: string;
    quality: Rank;
    isAvailable: boolean;
}

export interface Landmark {
  id: string;
  name: string;
  type: string;
  description: string;
  imageUrl?: string; // Player/System uploaded image
  coordinates: { x: number; y: number }; // Relative to SVG 350x350
  services: ServicePoint[]; // "Eat, Wear, Live, Play"
  dangerLevel: number;
}

export interface Zone {
  id: string;
  name: string;
  controller: string;
  developmentLevel: number; // 0-100
  combatPower: number;
  leader: string;
  members: string[]; // Key members
  dangerLevel: number;
  description: string;
  imageUrl?: string; // Zone overview image
  svgPath: string; // For the visual map
  landmarks: Landmark[];
  color: string;
}

// --- Node Map Types (Region -> Street -> Location) ---

export interface NodeLinks {
  up: string | null;
  down: string | null;
  left: string | null;
  right: string | null;
}

export interface LocationNode {
  id: string;
  name: string;
  type: string;
  summary: string;
  links: NodeLinks;
  imageUrls?: string[];
}

export interface StreetNode {
  id: string;
  name: string;
  summary: string;
  entryLocationId: string;
  links: NodeLinks;
  locations: LocationNode[];
  imageUrls?: string[];
}

export interface RegionNode {
  id: string;
  name: string;
  summary: string;
  entryStreetId: string;
  links: NodeLinks;
  streets: StreetNode[];
  imageUrls?: string[];
}

export interface WorldNodeMapData {
  map: {
    regions: RegionNode[];
  };
}

export type MapNodeLevel = 'region' | 'street' | 'location';

export interface MapPosition {
  level: MapNodeLevel;
  regionId: string;
  streetId: string | null;
  locationId: string | null;
}

export interface MapRuntimeData {
  viewed: MapPosition | null;
  playerPosition: MapPosition | null;
  elapsedMinutes: number;
  logs: string[];
}

// --- Faction System Types ---

export interface FactionLog {
    id: string;
    content: string;
    timestamp: string;
    type: 'alert' | 'info' | 'success';
}

export interface FactionIndustry {
    id: string;
    name: string;
    type: string;
    level: number;
    output: number; // Weekly income
    upkeep: number; // Weekly cost
    status: 'active' | 'damaged' | 'upgrading';
}

export interface FactionTask {
    id: string;
    title: string;
    description: string;
    reward: number;
    status: 'open' | 'assigned' | 'completed';
    assignedTo?: string; // Member ID or Group ID
    targetAudience: 'internal' | 'external';
}

export interface FactionGroup {
    id: string;
    name: string;
    leaderId?: string;
    memberIds: string[];
}

export interface FactionMember {
    id: string;
    name: string;
    role: string; // Class/Job
    status: 'idle' | 'task' | 'combat';
    loyalty: number;
    groupId?: string;
}

export interface FactionEconomy {
    monthlyIncome: number;
    monthlyUpkeep: number;
    treasury: number;
    sources: { name: string; amount: number }[];
}

export interface FactionRelation {
    zoneId: string;
    standing: number; // -100 to 100
    status: 'Hostile' | 'Neutral' | 'Friendly' | 'Allied';
}

export interface PlayerFaction {
    name: string;
    level: number;
    headquarters: string;
    economy: FactionEconomy;
    members: FactionMember[];
    groups: FactionGroup[];
    relations: FactionRelation[];
    industries: FactionIndustry[];
    postedTasks: FactionTask[];
    logs: FactionLog[];
}

// --- Game Setup Types ---

export type CareerLineType = 'main' | 'side' | 'hidden';

export interface CareerNode {
    id: string;
    name: string;
    unlockRequirement: string;
    eventTask: string;
    eventReward: string;
    lineType: CareerLineType;
    x: number;
    y: number;
    links: {
        up?: string;
        down?: string;
        left?: string;
        right?: string;
    };
}

export interface CareerTrack {
    id: string;
    name: string;
    entryRequirement: string;
    description: string;
    nodes: CareerNode[];
    rootNodeId?: string;
}

export interface GameConfig {
    name: string;
    gender: 'male' | 'female';
    citizenId: string;
    startCredits: number;
    startPsionicRank: Rank;
    installBetaChip: boolean;
    selectedBoard: Chip; // The motherboard determining capacity
    selectedChips: Chip[];
    selectedItems: Item[];
    factionName: string;
    startingLocation: string; // Specific Zone or Landmark
    // New Params
    startConversionRate: number;
    startRecoveryRate: number;
    hasRedString: boolean; // Special Male Trait
    startSixDim?: SixDimStats;
    selectedLingshu: LingshuPart[];
    neuralProtocol?: 'none' | 'beta';
    careerTracks?: CareerTrack[];
}

export interface LingshuPart {
    id: string;
    key?: string;
    name: string;
    rank: Rank;
    strengthProgress?: number;
    level?: number;
    description: string;
    equippedItem?: EquippedItem | null;
    equippedItems?: EquippedItem[];
    spiritSkill?: Skill | null;
    spiritSkills?: Skill[];
    statusAffixes?: RuntimeAffix[];
    maxSkillSlots?: number;
    maxEquipSlots?: number;
}
