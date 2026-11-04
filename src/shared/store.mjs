// Local persistence (chrome.storage.local): styles, platforms and which style each platform uses.
//
// - defaults: { "*": defaultStyleId, "<platformId>": styleId }
//   Every style is available on every platform; `defaults` only decides which one is used where.
//   "*" is the default for platforms without a choice of their own.
import { BUILTINS, normalizeStyle } from "./styles.mjs";
import { BUILTIN_PLATFORMS, normalizePlatform, cleanStoredPlatforms } from "./platforms.mjs";

export async function getAll() {
  await cleanStoredPlatforms();   // copies of built-in platforms (made by "Reconfigure this site") are dropped
  const { styles = [], platforms = [], defaults, defaultStyle } = await chrome.storage.local.get(["styles", "platforms", "defaults", "defaultStyle"]);
  const userPlatforms = platforms.map(normalizePlatform).filter(Boolean);
  const custom = styles.map((s) => normalizeStyle(s)).filter(Boolean);
  const all = [...BUILTINS, ...custom];
  // migration: there used to be a single "defaultStyle"
  const defs = { ...(defaults || (defaultStyle ? { "*": defaultStyle } : {})) };
  return { all, custom, userPlatforms, platforms: [...BUILTIN_PLATFORMS, ...userPlatforms], defaults: defs };
}

// The style used on a platform: its own choice, else the general default, else the first style.
export function defaultFor(all, defaults, platform) {
  const ok = (id) => id && all.some((s) => s.id === id);
  return [defaults[platform], defaults["*"]].find(ok) || all[0]?.id || "1";
}

export const saveStyles = (custom) => chrome.storage.local.set({ styles: custom });
export const savePlatforms = (userPlatforms) => chrome.storage.local.set({ platforms: userPlatforms });
export const saveDefaults = (defaults) => chrome.storage.local.set({ defaults });
