
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
  chatMessageId?: number;
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
    sourceCategory?: ItemCategory;
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

export type FinanceLedgerKind =
  | 'social'
  | 'darknet'
  | 'gambling'
  | 'tax'
  | 'settlement'
  | 'task'
  | 'combat'
  | 'exchange'
  | 'penalty'
  | 'system';

export interface FinanceLedgerEntry {
  id: string;
  title: string;
  detail: string;
  amount: number;
  timestamp: string;
  kind: FinanceLedgerKind;
  counterparty?: string;
}

export type BlackRaceBetRisk = 'low' | 'medium' | 'high';

export interface BlackRaceBetOption {
  id: string;
  label: string;
  odds: number;
  risk: BlackRaceBetRisk;
  build: string;
  note: string;
}

export interface BlackRaceMarket {
  id: string;
  title: string;
  venue: string;
  locationLabel: string;
  heatLabel: string;
  generatedAt: string;
  options: BlackRaceBetOption[];
}

export interface BlackRaceBetRecord {
  id: string;
  marketId: string;
  marketTitle: string;
  venue: string;
  optionId: string;
  optionLabel: string;
  stake: number;
  odds: number;
  outcome: 'win' | 'lose';
  payout: number;
  net: number;
  resolvedAt: string;
  detail: string;
}

export interface PlayerResidenceState {
  currentResidenceId: string;
  currentResidenceLabel: string;
  unlockedResidenceIds: string[];
}

export interface ResidenceProfile {
  id: string;
  label: string;
  kind: 'official' | 'rental' | 'safehouse' | 'temporary';
  source: 'beta' | 'civic' | 'market' | 'port' | 'parish' | 'frontier' | 'industrial' | 'fallback';
  districtLabel: string;
  summary: string;
  safety: 'High' | 'Medium' | 'Low';
  privacy: 'High' | 'Medium' | 'Low';
  curfew: string;
  monthlyCost: number;
  switchCost: number;
  restMinutes: number;
  hpRestore: number;
  mpRestore: number;
  sanityRestore: number;
  note: string;
}

export interface PlayerCivilianStatus {
  citizenId: string;
  creditScore: number; // 0 - 120
  warningLevel?: 'Low' | 'Medium' | 'Purge';
  deductionHistory: DeductionRecord[];
  warnings: string[];
  taxDeadline: string;
  taxAmount: number;
  taxArrears?: number;
  betaLevel?: number;
  betaTierName?: string;
  taxOfficerUnlocked?: boolean;
  assignedDistrict?: string;
  assignedXStationId?: string;
  assignedXStationLabel?: string;
  assignedHXDormId?: string;
  assignedHXDormLabel?: string;
  taxOfficerBoundId?: string | null;
  taxOfficerName?: string;
  taxOfficeAddress?: string;
}

export interface MonthlySettlementRecord {
  id: string;
  cycleLabel: string;
  monthCount: number;
  checkpointMonthKey: string;
  processedMonthKey: string;
  baseAllowance: number;
  currentTaxDue: number;
  arrearsDue: number;
  taxDue: number;
  maintenanceCost: number;
  penaltyCost: number;
  netDelta: number;
  status: 'processed' | 'arrears';
  processedAt: string;
  notes: string[];
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
    isPlayer?: boolean;
}

export type SocialPlatform = 'native' | 'instagram' | 'x' | 'twitter' | 'rednote' | 'custom';

export interface SocialSourceMeta {
  platform: SocialPlatform;
  authorHandle?: string;
  authorName?: string;
  profileUrl?: string;
  postUrl?: string;
  importedAt?: string;
  note?: string;
}

export interface SocialPost {
  id: string;
  content: string;
  timestamp: string;
  image?: string;
  comments: SocialComment[];
  visibility?: 'public' | 'mutual' | 'premium';
  unlockPrice?: number;
  unlockedByPlayer?: boolean;
  likedByPlayer?: boolean;
  likeCount?: number;
  tipsReceived?: number;
  location?: string;
  source?: SocialSourceMeta;
}

export interface DirectMessage {
  id: string;
  sender: 'player' | 'npc' | 'system';
  content: string;
  timestamp: string;
  amount?: number;
  kind?: 'text' | 'transfer' | 'tip' | 'unlock';
}

export interface NpcGalleryImage {
  id: string;
  src: string;
  title?: string;
  caption?: string;
  sourceLabel?: string;
  unlockLevel?: number;
}

export interface NpcDossierSection {
  id: string;
  title: string;
  content: string;
  unlockLevel?: number;
}

export type NpcDarknetRisk = 'low' | 'medium' | 'high' | 'sealed';

export type NpcDarknetRecordKind = 'intel' | 'leak' | 'transaction' | 'sighting' | 'contract';

export type NpcDarknetServiceKind = 'intel' | 'medical' | 'rewrite' | 'smuggling' | 'bounty';

export interface NpcDarknetRecord {
  id: string;
  title: string;
  content: string;
  timestamp: string;
  source?: string;
  location?: string;
  risk?: NpcDarknetRisk;
  kind?: NpcDarknetRecordKind;
  unlockLevel?: number;
  tags?: string[];
  image?: string;
}

export interface NpcDarknetService {
  id: string;
  title: string;
  summary: string;
  price: number;
  kind: NpcDarknetServiceKind;
  unlockLevel?: number;
  risk?: NpcDarknetRisk;
  availability?: string;
  delivery?: string;
  tags?: string[];
}

export interface NpcDarknetProfile {
  handle?: string;
  alias?: string;
  summary?: string;
  accessTier?: string;
  marketVector?: string;
  riskRating?: number;
  bounty?: string;
  tags?: string[];
  knownAssociates?: string[];
  lastSeen?: string;
  intelRecords?: NpcDarknetRecord[];
  services?: NpcDarknetService[];
}

export interface NpcUnlockState {
  dossierLevel?: number;
  albumUnlockedCount?: number;
  socialUnlocked?: boolean;
  darknetLevel?: number;
  darknetUnlocked?: boolean;
  intelUnlockedCount?: number;
}

export interface NpcAiPromptBlock {
  label: string;
  lines: string[];
}

export interface NpcAiDirectorCard {
  enabled?: boolean;
  lookupTokens?: string[];
  summary?: string;
  publicMask?: string[];
  hiddenTruths?: string[];
  voiceGuide?: string[];
  motivations?: string[];
  taboos?: string[];
  relationHooks?: string[];
  sceneHooks?: string[];
  doNotReveal?: string[];
  improvNotes?: string[];
  customBlocks?: NpcAiPromptBlock[];
  keepAliveTurns?: number;
}

export interface NPC {
  id: string;
  name: string;
  gender: 'female' | 'male';
  race?: string; // e.g. 人类 / 灵族_花妖 / 灵族_史莱姆
  raceClass?: string; // e.g. 灵族-植物种 / 灵族-液态种
  statusTags?: string[]; // e.g. ['催眠侵入', '灵核游移']
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
  socialHandle?: string;
  socialBio?: string;
  playerFollows?: boolean;
  followsPlayer?: boolean;
  followerCount?: number;
  followingCount?: number;
  walletTag?: string;
  citizenId?: string;
  chipSummary?: string[];
  clueNotes?: string[];
  dossierSections?: NpcDossierSection[];
  gallery?: NpcGalleryImage[];
  darknetProfile?: NpcDarknetProfile;
  unlockState?: NpcUnlockState;
  aiDirectorCard?: NpcAiDirectorCard;
  dmThread?: DirectMessage[];
  socialFeed: SocialPost[];
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

export type CityAnchorKind =
  | 'shop'
  | 'station'
  | 'residence'
  | 'institution'
  | 'service'
  | 'checkpoint'
  | 'venue'
  | 'street'
  | 'unknown';

export type CityAnchorStatus = 'active' | 'vacant' | 'sealed' | 'destroyed';

export type CityTenantKind = 'shop' | 'institution' | 'service' | 'public';

export type RuntimeShopType = 'clothing' | 'chip' | 'clinic' | 'drug' | 'service' | 'restaurant' | 'general';

export type RuntimeShopTier = 'street' | 'standard' | 'premium' | 'elite';

export type RuntimeTodoCategory = 'commission' | 'meeting' | 'pickup' | 'travel' | 'bet' | 'custom';

export type RuntimeTodoStatus = 'active' | 'ready' | 'completed' | 'failed' | 'cancelled';

export type TransportLayerMode = 'metro' | 'expressway' | 'bridge' | 'ferry' | 'rail';

export type TransportAssetStatus = 'planned' | 'building' | 'active' | 'closed' | 'damaged' | 'destroyed';

export interface DistrictGridProfile {
  id: string;
  regionKey: string;
  regionLabel: string;
  districtLabel: string;
  regionCode: number;
  districtCode: number;
  width: number;
  height: number;
  transportModes: TransportLayerMode[];
  notes?: string;
}

export interface CityCellRecord {
  id: string;
  regionKey: string;
  regionLabel: string;
  districtId: string;
  districtLabel: string;
  x: number;
  y: number;
  discoveredAt: number;
  anchorIds: string[];
}

export interface CityAnchorRecord {
  id: string;
  cellId: string;
  districtId: string;
  label: string;
  kind: CityAnchorKind;
  status: CityAnchorStatus;
  signature: string;
  tenantId: string | null;
  discoveredAt: number;
  tags: string[];
  legacyAliases?: string[];
}

export interface CityTenantRecord {
  id: string;
  anchorId: string;
  label: string;
  kind: CityTenantKind;
  status: CityAnchorStatus;
  createdAt: number;
  notes?: string;
}

export interface RuntimeShopRecord {
  id: string;
  anchorId: string;
  districtId: string;
  name: string;
  type: RuntimeShopType;
  tier: RuntimeShopTier;
  signatureStyle: string[];
  hasBackroom: boolean;
  refreshSeed: string;
  refreshEpoch: number;
  loyalty: number;
  discountTier: number;
  soldItemKeys: string[];
  firstSeenAt: number;
  status: CityAnchorStatus;
}

export interface RuntimeTodoRecord {
  id: string;
  title: string;
  category: RuntimeTodoCategory;
  status: RuntimeTodoStatus;
  sourceType: 'shop' | 'npc' | 'system' | 'scene' | 'lingnet';
  sourceId: string;
  locationLabel: string;
  dueAtMinutes: number | null;
  createdAtMinutes: number;
  summary: string;
  detail: string;
  unread: boolean;
  routeHint: string | null;
}

export interface TransportStopRecord {
  id: string;
  districtId: string;
  label: string;
  cellId: string;
  anchorId: string | null;
  x: number;
  y: number;
  lineIds: string[];
  status: TransportAssetStatus;
}

export interface TransportLineRecord {
  id: string;
  mode: TransportLayerMode;
  label: string;
  regionKey: string;
  districtIds: string[];
  stopIds: string[];
  status: TransportAssetStatus;
  summary: string;
}

export interface TransportProjectRecord {
  id: string;
  districtId: string;
  mode: TransportLayerMode;
  label: string;
  status: TransportAssetStatus;
  summary: string;
}

export interface CityRuntimeData {
  version: 1;
  currentDistrictId: string;
  currentCellId: string;
  currentAnchorId: string;
  cells: CityCellRecord[];
  anchors: CityAnchorRecord[];
  tenants: CityTenantRecord[];
  shops: RuntimeShopRecord[];
  todos: RuntimeTodoRecord[];
  transportStops: TransportStopRecord[];
  transportLines: TransportLineRecord[];
  transportProjects: TransportProjectRecord[];
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
    availableChipPool?: Chip[];
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
