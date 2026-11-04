// Local persistence (chrome.storage.local): styles, platforms, the default style per platform and where each style applies.
//
// - defaults: { "*": generalDefaultStyleId, "<platformId>": styleId }   ("*" is the fallback for platforms without their own default)
// - scopes:   { "<styleId>": ["x", "bluesky", ...] }  platforms a style is available on; absent = all platforms.
//   Works for built-in styles too. Every style in `all` gets `platforms` (null = all platforms).
import { BUILTINS, normalizeStyle } from "./styles.mjs";
import { BUILTIN_PLATFORMS, normalizePlatform } from "./platforms.mjs";

export async function getAll() {
  const { styles = [], platforms = [], defaults, defaultStyle, scopes = {} } = await chrome.storage.local.get(["styles", "platforms", "defaults", "defaultStyle", "scopes"]);
  const userPlatforms = platforms.map(normalizePlatform).filter(Boolean);
  const allPlatforms = [...BUILTIN_PLATFORMS, ...userPlatforms];
  const known = new Set(allPlatforms.map((p) => p.id));
  const custom = styles.map((s) => normalizeStyle(s)).filter(Boolean);

  // migration: a custom style used to carry a single `platform`; it becomes a one-platform scope
  const sc = {};
  for (const [id, list] of Object.entries(scopes)) {
    const ok = (Array.isArray(list) ? list : []).filter((p) => known.has(p));
    if (ok.length) sc[id] = [...new Set(ok)];       // a scope whose platforms are all gone falls back to "all"
  }
  for (const s of custom) if (!(s.id in sc) && s.platform && s.platform !== "*" && known.has(s.platform)) sc[s.id] = [s.platform];

  const all = [...BUILTINS, ...custom].map((s) => ({ ...s, platforms: sc[s.id] ?? null }));
  // migration: there used to be a single "defaultStyle"
  const defs = { ...(defaults || (defaultStyle ? { "*": defaultStyle } : {})) };
  return { all, custom: all.filter((s) => !s.builtin), userPlatforms, platforms: allPlatforms, defaults: defs, scopes: sc };
}

// Does the style apply to this platform? ("*" = the "all platforms" view, where everything shows)
export const appliesTo = (s, platform) => platform === "*" || !s.platforms || s.platforms.includes(platform);
export const stylesFor = (all, platform) => all.filter((s) => appliesTo(s, platform));

// The default for a platform: its own default, else the general one, else the first style that applies there.
export function defaultFor(all, defaults, platform) {
  const ok = (id) => id && stylesFor(all, platform).some((s) => s.id === id);
  return [defaults[platform], defaults["*"]].find(ok) || stylesFor(all, platform)[0]?.id || "1";
}

export const saveStyles = (custom) => chrome.storage.local.set({ styles: custom.map(({ platforms, ...s }) => s) });
export const savePlatforms = (userPlatforms) => chrome.storage.local.set({ platforms: userPlatforms });
export const saveDefaults = (defaults) => chrome.storage.local.set({ defaults });
export const saveScopes = (scopes) => chrome.storage.local.set({ scopes });
