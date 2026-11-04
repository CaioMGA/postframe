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

// BETA, UNVERIFIED: Reddit blocks automated browsers, so these <shreddit-post> attributes come from
// documentation/memory, not from a real page. If it fails, duplicate and adjust it, or use "Reconfigure this site".
export const REDDIT_PLATFORM = {
  id: "reddit", name: "Reddit", builtin: true, beta: true, hosts: ["reddit.com"],
  sel: {
    container: "shreddit-post",
    name: ":scope@author", handle: ":scope@subreddit-prefixed-name",
    text: ":scope@post-title", body: '[slot="text-body"]',
    media: '[slot="post-media-container"] img',
    time: ":scope@created-timestamp",
    stats: [{ icon: "upvote", sel: ":scope@score" }, { icon: "comment", sel: ":scope@comment-count" }]
  }
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
