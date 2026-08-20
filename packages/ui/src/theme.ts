export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "analytics_theme";

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

/**
 * Runs before paint so the correct palette is applied without a flash of the
 * wrong theme. Kept as a string because it is injected into the document head.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"&&p!=="system"){p="system";}var m=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=p==="system"?m:p;}catch(e){document.documentElement.dataset.theme="light";}})();`;
