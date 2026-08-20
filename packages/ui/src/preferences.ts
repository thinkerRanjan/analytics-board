export const PRESET_PREF_KEY = "analytics_default_preset";

export type StoredPreset = "7d" | "28d" | "90d";

export function getStoredDefaultPreset(): StoredPreset | null {
  if (typeof window === "undefined") return null;
  const value = localStorage.getItem(PRESET_PREF_KEY);
  if (value === "7d" || value === "28d" || value === "90d") {
    return value;
  }
  return null;
}

export function setStoredDefaultPreset(preset: StoredPreset): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PRESET_PREF_KEY, preset);
}
