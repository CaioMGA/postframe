// Platforms: where each style applies and how to read the posts of each site.
export const ICON_KEYS = { reply: "icon_reply", comment: "icon_comment", retweet: "icon_retweet", like: "icon_like", upvote: "icon_upvote", share: "icon_share", view: "icon_view" };   // i18n keys

// Built-in platforms. Plain data: X has its own extractor (`extractor`), the others are just selectors.
// Selector syntax: "css" reads the element text; "css@attribute" reads an attribute (e.g. "a[data-tooltip]@aria-label").
export const X_PLATFORM = { id: "x", name: "X (Twitter)", builtin: true, extractor: "x", hosts: ["x.com", "twitter.com"], sel: { container: 'article[data-testid="tweet"]' } };

// Own extractor (src/sites/bluesky.js): the web app renders posts in several shapes (feed item, focused post, reply).
// The container covers the feeds and the post page. Quote posts are not read; reposts are.
export const BLUESKY_PLATFORM = {
  id: "bluesky", name: "Bluesky", builtin: true, extractor: "bluesky", hosts: ["bsky.app"],
  sel: { container: '[data-testid^="feedItem-by-"], [data-testid^="postThreadItem-by-"]' }
};

// BETA. Only the feed `article` was checked against a real (logged-in) page; the rest is heuristics in src/sites/instagram.js.
export const INSTAGRAM_PLATFORM = { id: "instagram", name: "Instagram", builtin: true, beta: true, extractor: "instagram", hosts: ["instagram.com"], sel: { container: "article" } };

// BETA, UNVERIFIED on a real page (Reddit blocks automated browsers). Own extractor in src/sites/reddit.js: the author line is
// the subreddit (name + icon) with the user's handle under it, plus title, body, media, karma, comments and reposts.
export const REDDIT_PLATFORM = {
  id: "reddit", name: "Reddit", builtin: true, beta: true, extractor: "reddit", hosts: ["reddit.com"],
  sel: { container: "shreddit-post" }
};

export const BUILTIN_PLATFORMS = [X_PLATFORM, BLUESKY_PLATFORM, REDDIT_PLATFORM, INSTAGRAM_PLATFORM];
export const BUILTIN_IDS = new Set(BUILTIN_PLATFORMS.map((p) => p.id));

const sel = (v) => (typeof v === "string" ? v.trim().slice(0, 300) : "");
const host = (h) => (typeof h === "string" ? h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") : "");

export function normalizePlatform(raw) {
  if (!raw || typeof raw !== "object") return null;
  const s = raw.sel || {};
  return {
    id: typeof raw.id === "string" && /^[\w-]{1,24}$/.test(raw.id) && !BUILTIN_IDS.has(raw.id) ? raw.id : "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: String(raw.name ?? "").trim().slice(0, 40) || "Untitled",
    hosts: (Array.isArray(raw.hosts) ? raw.hosts : []).map(host).filter((h) => /^[a-z0-9.-]{3,80}$/.test(h)).slice(0, 10),
    sel: {
      container: sel(s.container), avatar: sel(s.avatar), name: sel(s.name), handle: sel(s.handle), text: sel(s.text), time: sel(s.time), media: sel(s.media), repost: sel(s.repost), repostStrip: sel(s.repostStrip), body: sel(s.body),
      stats: (Array.isArray(s.stats) ? s.stats : []).slice(0, 3).map((x) => ({ icon: Object.hasOwn(ICON_KEYS, x?.icon) ? x.icon : "like", sel: sel(x?.sel) })).filter((x) => x.sel)
    }
  };
}

export const hostMatches = (hostname, hosts) => hosts.some((h) => hostname === h || hostname.endsWith("." + h));
export const findPlatform = (platforms, hostname) => platforms.find((p) => hostMatches(hostname, p.hosts));

// Makes sure the normalizer does not silently drop any field of a built-in (e.g. a selector over 300 characters).
export function builtinProblems() {
  const bad = [];
  for (const b of BUILTIN_PLATFORMS) {
    const n = normalizePlatform({ ...b, id: "check" });
    for (const [k, v] of Object.entries(b.sel)) {
      if (JSON.stringify(n.sel[k]) !== JSON.stringify(v)) bad.push(`${b.id}.${k}`);
    }
    if (n.hosts.join() !== b.hosts.join()) bad.push(`${b.id}.hosts`);
  }
  return bad;
}

// A user platform "shadows" a built-in when they share a site. Built-ins read posts with their own extractors, so a
// copy made from the capture panel's "Reconfigure this site" only makes capture worse (the user's config takes precedence).
const sameSite = (a, b) => a === b || a.endsWith("." + b) || b.endsWith("." + a);
export const shadowedBuiltin = (p) => BUILTIN_PLATFORMS.find((b) => b.hosts.some((h) => (p.hosts || []).some((ph) => sameSite(ph, h))));

// One-time cleanup of stored copies. The default style chosen for a dropped copy moves to the built-in it shadowed.
export async function cleanStoredPlatforms() {
  const { platforms = [], defaults } = await chrome.storage.local.get(["platforms", "defaults"]);
  const user = platforms.map(normalizePlatform).filter(Boolean);
  const dropped = user.filter(shadowedBuiltin);
  if (!dropped.length) return [];
  const defs = { ...(defaults || {}) };
  for (const p of dropped) {
    const b = shadowedBuiltin(p);
    if (defs[p.id]) { if (!defs[b.id]) defs[b.id] = defs[p.id]; delete defs[p.id]; }
  }
  const patch = { platforms: user.filter((p) => !shadowedBuiltin(p)) };
  if (defaults || Object.keys(defs).length) patch.defaults = defs;   // do not create `defaults` if only the legacy `defaultStyle` exists
  await chrome.storage.local.set(patch);
  return dropped;
}
