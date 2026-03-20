import { resolveLocationJurisdiction } from './locationJurisdiction';

export interface LocationVisualTheme {
  key: string;
  label: string;
  mainClass: string;
  headerClass: string;
  asideClass: string;
  iconClass: string;
  locationPillClass: string;
  hintClass: string;
  phoneOverlayClass: string;
  phoneRegionPillClass: string;
}

const LOCATION_THEME_MAP: Record<string, LocationVisualTheme> = {
  aerila: {
    key: 'aerila',
    label: '艾瑞拉区规制层',
    mainClass:
      'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.08),_transparent_28%),linear-gradient(180deg,rgba(4,12,18,0.98),rgba(6,8,14,0.98))]',
    headerClass: 'border-white/8 bg-[linear-gradient(90deg,rgba(8,24,34,0.92),rgba(5,9,16,0.88))]',
    asideClass: 'border-cyan-500/12 bg-[linear-gradient(180deg,rgba(4,12,18,0.95),rgba(5,6,10,0.96))]',
    iconClass: 'text-cyan-300',
    locationPillClass: 'border-cyan-400/18 bg-cyan-500/12 text-cyan-50',
    hintClass: 'border-cyan-400/15 bg-cyan-500/8 text-cyan-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_30%),linear-gradient(180deg,rgba(5,14,18,0.18),transparent)]',
    phoneRegionPillClass: 'border-cyan-400/18 bg-cyan-500/10 text-cyan-100',
  },
  north: {
    key: 'north',
    label: '诺丝商业层',
    mainClass:
      'bg-[radial-gradient(circle_at_top_right,_rgba(217,70,239,0.08),_transparent_26%),linear-gradient(180deg,rgba(18,6,22,0.98),rgba(9,5,14,0.98))]',
    headerClass: 'border-white/8 bg-[linear-gradient(90deg,rgba(28,8,32,0.92),rgba(12,5,16,0.88))]',
    asideClass: 'border-fuchsia-500/12 bg-[linear-gradient(180deg,rgba(18,7,24,0.95),rgba(7,5,12,0.96))]',
    iconClass: 'text-fuchsia-300',
    locationPillClass: 'border-fuchsia-400/18 bg-fuchsia-500/12 text-fuchsia-50',
    hintClass: 'border-fuchsia-400/14 bg-fuchsia-500/8 text-fuchsia-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top_right,_rgba(217,70,239,0.12),_transparent_28%),linear-gradient(180deg,rgba(24,5,22,0.18),transparent)]',
    phoneRegionPillClass: 'border-fuchsia-400/18 bg-fuchsia-500/10 text-fuchsia-100',
  },
  borderland: {
    key: 'borderland',
    label: '交界地生存层',
    mainClass:
      'bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.09),_transparent_28%),linear-gradient(180deg,rgba(14,11,8,0.98),rgba(8,8,8,0.98))]',
    headerClass: 'border-white/8 bg-[linear-gradient(90deg,rgba(28,22,16,0.92),rgba(12,10,9,0.88))]',
    asideClass: 'border-amber-500/12 bg-[linear-gradient(180deg,rgba(18,13,8,0.95),rgba(7,6,6,0.96))]',
    iconClass: 'text-amber-200',
    locationPillClass: 'border-amber-400/18 bg-amber-500/10 text-amber-50',
    hintClass: 'border-amber-400/14 bg-amber-500/8 text-amber-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.1),_transparent_32%),linear-gradient(180deg,rgba(26,18,10,0.16),transparent)]',
    phoneRegionPillClass: 'border-amber-400/18 bg-amber-500/10 text-amber-100',
  },
  cuiling: {
    key: 'cuiling',
    label: '淬灵工业层',
    mainClass:
      'bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.08),_transparent_26%),linear-gradient(180deg,rgba(16,10,6,0.98),rgba(8,7,6,0.98))]',
    headerClass: 'border-white/8 bg-[linear-gradient(90deg,rgba(32,18,8,0.92),rgba(12,9,7,0.88))]',
    asideClass: 'border-amber-500/12 bg-[linear-gradient(180deg,rgba(20,12,6,0.95),rgba(8,6,5,0.96))]',
    iconClass: 'text-amber-300',
    locationPillClass: 'border-amber-400/18 bg-amber-500/12 text-amber-50',
    hintClass: 'border-amber-400/14 bg-amber-500/8 text-amber-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.1),_transparent_30%),linear-gradient(180deg,rgba(26,14,7,0.16),transparent)]',
    phoneRegionPillClass: 'border-amber-400/18 bg-amber-500/10 text-amber-100',
  },
  xiyu: {
    key: 'xiyu',
    label: '汐屿港区层',
    mainClass:
      'bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.08),_transparent_24%),linear-gradient(180deg,rgba(6,14,14,0.98),rgba(5,8,12,0.98))]',
    headerClass: 'border-white/8 bg-[linear-gradient(90deg,rgba(7,24,24,0.92),rgba(5,10,14,0.88))]',
    asideClass: 'border-emerald-500/12 bg-[linear-gradient(180deg,rgba(7,18,18,0.95),rgba(5,7,10,0.96))]',
    iconClass: 'text-emerald-300',
    locationPillClass: 'border-emerald-500/18 bg-emerald-500/12 text-emerald-50',
    hintClass: 'border-emerald-500/14 bg-emerald-500/8 text-emerald-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.12),_transparent_30%),linear-gradient(180deg,rgba(8,24,20,0.16),transparent)]',
    phoneRegionPillClass: 'border-emerald-500/18 bg-emerald-500/10 text-emerald-100',
  },
  holy: {
    key: 'holy',
    label: '圣教审誓层',
    mainClass:
      'bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.07),_transparent_24%),linear-gradient(180deg,rgba(18,10,12,0.98),rgba(8,7,9,0.98))]',
    headerClass: 'border-white/8 bg-[linear-gradient(90deg,rgba(30,18,12,0.92),rgba(12,9,10,0.88))]',
    asideClass: 'border-amber-500/12 bg-[linear-gradient(180deg,rgba(18,12,10,0.95),rgba(7,6,8,0.96))]',
    iconClass: 'text-amber-200',
    locationPillClass: 'border-amber-400/18 bg-amber-500/10 text-amber-50',
    hintClass: 'border-amber-400/14 bg-amber-500/8 text-amber-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.1),_transparent_30%),linear-gradient(180deg,rgba(22,14,12,0.16),transparent)]',
    phoneRegionPillClass: 'border-amber-400/18 bg-amber-500/10 text-amber-100',
  },
  default: {
    key: 'default',
    label: '未锁定区域',
    mainClass:
      'bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_28%),linear-gradient(180deg,rgba(8,4,8,0.98),rgba(8,4,8,0.98))]',
    headerClass: 'border-white/6 bg-black/40',
    asideClass: 'border-fuchsia-900/20 bg-[#050205]/95',
    iconClass: 'text-fuchsia-500',
    locationPillClass: 'border-white/10 bg-white/[0.04] text-slate-100',
    hintClass: 'border-white/10 bg-white/[0.03] text-slate-100',
    phoneOverlayClass:
      'bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.08),_transparent_30%),linear-gradient(180deg,rgba(12,10,20,0.12),transparent)]',
    phoneRegionPillClass: 'border-white/10 bg-white/[0.04] text-slate-100',
  },
};

export const resolveLocationVisualTheme = (location: string): LocationVisualTheme => {
  const jurisdiction = resolveLocationJurisdiction(location);
  return LOCATION_THEME_MAP[jurisdiction.key] || LOCATION_THEME_MAP.default;
};
