// Plataformas: onde cada estilo se aplica e como ler os posts de cada site.
export const ICON_KEYS = { reply: "Resposta", comment: "Comentário", retweet: "Repost", like: "Curtida", upvote: "Voto", share: "Compartilhar", view: "Visualizações" };

// Plataformas que já vêm prontas. Dados puros: o X tem extrator próprio (`extractor`), as demais são só seletores.
// Sintaxe dos seletores: "css" lê o texto do elemento; "css@atributo" lê o atributo (ex.: "a[data-tooltip]@aria-label").
export const X_PLATFORM = { id: "x", name: "X (Twitter)", builtin: true, extractor: "x", hosts: ["x.com", "twitter.com"], sel: { container: 'article[data-testid="tweet"]' } };

// Verificado em página real (bsky.app, sem login). Quote tweets não são lidos; reposts sim.
export const BLUESKY_PLATFORM = {
  id: "bluesky", name: "Bluesky", builtin: true, hosts: ["bsky.app"],
  sel: {
    container: '[data-testid^="feedItem-by-"]',
    avatar: '[data-testid="userAvatarImage"] img',
    name: 'a[role="link"][dir="auto"]:has(+ div + a[role="link"][dir="auto"])',
    handle: 'a[role="link"][dir="auto"] + div + a[role="link"][dir="auto"]',
    text: '[data-testid="postText"]',
    media: 'img[src*="/feed_thumbnail/"]',
    time: 'a[data-tooltip]@aria-label',
    repost: 'a[aria-label^="Reposted by"]', repostStrip: "Reposted by",
    stats: [{ icon: "reply", sel: '[data-testid="replyBtn"]' }, { icon: "retweet", sel: '[data-testid="repostCount"]' }, { icon: "like", sel: '[data-testid="likeCount"]' }]
  }
};

// BETA, verificado em página real (logado): só o `article` do feed; o resto é heurística em src/sites/instagram.js.
export const INSTAGRAM_PLATFORM = { id: "instagram", name: "Instagram", builtin: true, beta: true, extractor: "instagram", hosts: ["instagram.com"], sel: { container: "article" } };

// BETA NÃO VERIFICADO: o Reddit bloqueia navegador automatizado, então estes atributos de <shreddit-post>
// vêm da documentação/memória, não de uma página real. Se falhar, duplique e ajuste ou use "Reconfigurar este site".
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
    name: String(raw.name ?? "").trim().slice(0, 40) || "Sem nome",
    hosts: (Array.isArray(raw.hosts) ? raw.hosts : []).map(host).filter((h) => /^[a-z0-9.-]{3,80}$/.test(h)).slice(0, 10),
    sel: {
      container: sel(s.container), avatar: sel(s.avatar), name: sel(s.name), handle: sel(s.handle), text: sel(s.text), time: sel(s.time), media: sel(s.media), repost: sel(s.repost), repostStrip: sel(s.repostStrip), body: sel(s.body),
      stats: (Array.isArray(s.stats) ? s.stats : []).slice(0, 3).map((x) => ({ icon: Object.hasOwn(ICON_KEYS, x?.icon) ? x.icon : "like", sel: sel(x?.sel) })).filter((x) => x.sel)
    }
  };
}

export const hostMatches = (hostname, hosts) => hosts.some((h) => hostname === h || hostname.endsWith("." + h));
export const findPlatform = (platforms, hostname) => platforms.find((p) => hostMatches(hostname, p.hosts));

// Garante que nenhum campo de um embutido seja descartado em silêncio pelo normalizador (ex.: seletor > 300 caracteres).
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
