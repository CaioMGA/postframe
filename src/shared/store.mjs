// Local persistence (chrome.storage.local): styles, platforms and the default style per platform.
import { BUILTINS, normalizeStyle } from "./styles.mjs";
import { BUILTIN_PLATFORMS, normalizePlatform } from "./platforms.mjs";

export async function getAll() {
  const { styles = [], platforms = [], defaults, defaultStyle } = await chrome.storage.local.get(["styles", "platforms", "defaults", "defaultStyle"]);
  const userPlatforms = platforms.map(normalizePlatform).filter(Boolean);
  const allPlatforms = [...BUILTIN_PLATFORMS, ...userPlatforms];
  const known = new Set(allPlatforms.map((p) => p.id));
  const custom = styles.map((s) => normalizeStyle(s)).filter(Boolean).map((s) => (s.platform === "*" || known.has(s.platform) ? s : { ...s, platform: "*" }));
  const all = [...BUILTINS, ...custom];
  // migration: there used to be a single "defaultStyle"
  const defs = { ...(defaults || (defaultStyle ? { "*": defaultStyle } : {})) };
  return { all, custom, userPlatforms, platforms: allPlatforms, defaults: defs };
}
// Styles that apply to a platform ("*" = all platforms).
export const stylesFor = (all, platform) => all.filter((s) => s.platform === "*" || s.platform === platform);
export function defaultFor(all, defaults, platform) {
  const ok = (id) => id && stylesFor(all, platform).some((s) => s.id === id);
  return [defaults[platform], defaults["*"]].find(ok) || "1";
}
export const saveStyles = (custom) => chrome.storage.local.set({ styles: custom });
export const savePlatforms = (userPlatforms) => chrome.storage.local.set({ platforms: userPlatforms });
export const saveDefaults = (defaults) => chrome.storage.local.set({ defaults });
