export const PRESET_COLORS = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
] as const;

export type PresetColor = (typeof PRESET_COLORS)[number];

export const isPresetColor = (value: string): value is PresetColor =>
  (PRESET_COLORS as readonly string[]).includes(value.toLowerCase());

export const nextPresetColor = (used: readonly string[]): PresetColor => {
  const taken = new Set(used.map((c) => c.toLowerCase()));
  return (
    PRESET_COLORS.find((c) => !taken.has(c)) ??
    PRESET_COLORS[used.length % PRESET_COLORS.length] ??
    "#3987e5"
  );
};
