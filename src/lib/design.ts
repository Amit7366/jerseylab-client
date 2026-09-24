export const PATTERNS = [
  { id: "solid", label: "Solid" },
  { id: "thin-hoops", label: "Thin hoops" },
  { id: "wide-hoops", label: "Wide hoops" },
  { id: "vertical-stripes", label: "Vertical stripes" },
  { id: "pinstripes", label: "Pinstripes" },
] as const;

export const BADGES = [
  { id: "none", label: "None" },
  { id: "crest", label: "Crest" },
  { id: "star", label: "Star" },
  { id: "shield", label: "Shield" },
  { id: "ball", label: "Ball" },
  { id: "laurel", label: "Laurel" },
] as const;

export const PLACEMENTS = [
  { id: "left-chest", label: "Left chest" },
  { id: "center", label: "Center" },
  { id: "right-chest", label: "Right chest" },
] as const;

export const LOGO_SLOTS = [
  { id: "frontLeft", label: "Left" },
  { id: "frontCenter", label: "Center" },
  { id: "frontRight", label: "Right" },
  { id: "leftSleeve", label: "Left sleeve" },
  { id: "rightSleeve", label: "Right sleeve" },
] as const;

export const PALETTE = [
  { id: "white", hex: "#f4f4f5", label: "White" },
  { id: "black", hex: "#18181b", label: "Black" },
  { id: "navy", hex: "#1e3a8a", label: "Navy" },
  { id: "royal", hex: "#2563eb", label: "Royal" },
  { id: "sky", hex: "#38bdf8", label: "Sky" },
  { id: "red", hex: "#dc2626", label: "Red" },
  { id: "maroon", hex: "#7f1d1d", label: "Maroon" },
  { id: "green", hex: "#15803d", label: "Green" },
  { id: "gold", hex: "#eab308", label: "Gold" },
  { id: "orange", hex: "#ea580c", label: "Orange" },
  { id: "purple", hex: "#7e22ce", label: "Purple" },
  { id: "pink", hex: "#db2777", label: "Pink" },
] as const;

export type PatternId = (typeof PATTERNS)[number]["id"];
export type BadgeId = (typeof BADGES)[number]["id"];
export type PlacementId = (typeof PLACEMENTS)[number]["id"];
export type LogoSlotId = (typeof LOGO_SLOTS)[number]["id"];

export type Logos = Record<LogoSlotId, BadgeId>;

export type Lettering = {
  teamName: string;
  playerName: string;
  number: string;
  sponsor: string;
  color: string;
};

export type ZoneStyle = {
  color: string;
  stripeColor: string;
  pattern: PatternId;
};

export const PARTS = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "leftSleeve", label: "Left sleeve" },
  { id: "rightSleeve", label: "Right sleeve" },
  { id: "collar", label: "Collar" },
  { id: "leftCuff", label: "Left cuff" },
  { id: "rightCuff", label: "Right cuff" },
] as const;

export type PartId = (typeof PARTS)[number]["id"];

export type DesignConfig = {
  front: ZoneStyle;
  back: ZoneStyle;
  leftSleeve: ZoneStyle;
  rightSleeve: ZoneStyle;
  collar: ZoneStyle;
  leftCuff: ZoneStyle;
  rightCuff: ZoneStyle;
  logos: Logos;
  lettering: Lettering;
};

export type SavedDesign = {
  id: string;
  name: string;
  config: DesignConfig;
  createdAt: string;
  updatedAt: string;
};

export const DRAFT_KEY = "jersey-design-draft";

export const ANGLES = [
  { id: "front", label: "Front" },
  { id: "back", label: "Back" },
  { id: "left", label: "Left" },
  { id: "right", label: "Right" },
  { id: "three-quarter", label: "3/4" },
] as const;

export type AngleId = (typeof ANGLES)[number]["id"];

const NAVY: ZoneStyle = { color: "#1e3a8a", stripeColor: "#f4f4f5", pattern: "solid" };

export const DEFAULT_CONFIG: DesignConfig = {
  front: { color: "#1e3a8a", stripeColor: "#f4f4f5", pattern: "thin-hoops" },
  back: { ...NAVY },
  leftSleeve: { color: "#1e3a8a", stripeColor: "#eab308", pattern: "wide-hoops" },
  rightSleeve: { color: "#1e3a8a", stripeColor: "#eab308", pattern: "wide-hoops" },
  collar: { color: "#f4f4f5", stripeColor: "#1e3a8a", pattern: "solid" },
  leftCuff: { color: "#f4f4f5", stripeColor: "#1e3a8a", pattern: "solid" },
  rightCuff: { color: "#f4f4f5", stripeColor: "#1e3a8a", pattern: "solid" },
  logos: {
    frontLeft: "crest",
    frontCenter: "none",
    frontRight: "none",
    leftSleeve: "none",
    rightSleeve: "none",
  },
  lettering: {
    teamName: "HOME",
    playerName: "PLAYER",
    number: "10",
    sponsor: "SPONSOR",
    color: "#f4f4f5",
  },
};

type LegacyConfig = Partial<DesignConfig> & {
  sleeves?: ZoneStyle;
  trimColor?: string;
  front?: ZoneStyle;
  back?: ZoneStyle;
  badge?: { id?: BadgeId; placement?: PlacementId };
};

function asBadge(value: unknown, fallback: BadgeId): BadgeId {
  return BADGES.some((badge) => badge.id === value) ? (value as BadgeId) : fallback;
}

export function normalizeConfig(value: unknown): DesignConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as LegacyConfig;
  if (!raw.front || !raw.back) return null;
  const sleeves = raw.leftSleeve ?? raw.sleeves ?? raw.front;
  const trim = raw.trimColor ?? "#f4f4f5";
  const solid = (color: string): ZoneStyle => ({ color, stripeColor: color, pattern: "solid" });
  const logos = { ...DEFAULT_CONFIG.logos, ...raw.logos };
  if (raw.badge?.id) {
    if (raw.badge.placement === "center") logos.frontCenter = asBadge(raw.badge.id, "none");
    else if (raw.badge.placement === "right-chest") logos.frontRight = asBadge(raw.badge.id, "none");
    else logos.frontLeft = asBadge(raw.badge.id, "none");
  }
  return {
    front: raw.front,
    back: raw.back,
    leftSleeve: raw.leftSleeve ?? sleeves,
    rightSleeve: raw.rightSleeve ?? raw.sleeves ?? sleeves,
    collar: raw.collar ?? solid(trim),
    leftCuff: raw.leftCuff ?? solid(trim),
    rightCuff: raw.rightCuff ?? solid(trim),
    logos: {
      frontLeft: asBadge(logos.frontLeft, "none"),
      frontCenter: asBadge(logos.frontCenter, "none"),
      frontRight: asBadge(logos.frontRight, "none"),
      leftSleeve: asBadge(logos.leftSleeve, "none"),
      rightSleeve: asBadge(logos.rightSleeve, "none"),
    },
    lettering: {
      teamName: raw.lettering?.teamName ?? DEFAULT_CONFIG.lettering.teamName,
      playerName: raw.lettering?.playerName ?? DEFAULT_CONFIG.lettering.playerName,
      number: raw.lettering?.number ?? DEFAULT_CONFIG.lettering.number,
      sponsor: raw.lettering?.sponsor ?? DEFAULT_CONFIG.lettering.sponsor,
      color: raw.lettering?.color ?? DEFAULT_CONFIG.lettering.color,
    },
  };
}

export function isDesignConfig(value: unknown): value is DesignConfig {
  return normalizeConfig(value) !== null;
}
