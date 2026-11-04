// Plataformas: onde cada estilo se aplica e como ler os posts de cada site.
export const ICON_KEYS = { reply: "Resposta", comment: "Comentário", retweet: "Repost", like: "Curtida", upvote: "Voto", share: "Compartilhar", view: "Visualizações" };

export const X_PLATFORM = { id: "x", name: "X (Twitter)", builtin: true, hosts: ["x.com", "twitter.com"], sel: null };

const sel = (v) => (typeof v === "string" ? v.trim().slice(0, 300) : "");
const host = (h) => (typeof h === "string" ? h.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "") : "");

export function normalizePlatform(raw) {
  if (!raw || typeof raw !== "object") return null;
  const s = raw.sel || {};
  return {
    id: typeof raw.id === "string" && /^[\w-]{1,24}$/.test(raw.id) && raw.id !== "x" ? raw.id : "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
    name: String(raw.name ?? "").trim().slice(0, 40) || "Sem nome",
    hosts: (Array.isArray(raw.hosts) ? raw.hosts : []).map(host).filter((h) => /^[a-z0-9.-]{3,80}$/.test(h)).slice(0, 10),
    sel: {
      container: sel(s.container), avatar: sel(s.avatar), name: sel(s.name), handle: sel(s.handle), text: sel(s.text), time: sel(s.time), media: sel(s.media),
      stats: (Array.isArray(s.stats) ? s.stats : []).slice(0, 3).map((x) => ({ icon: Object.hasOwn(ICON_KEYS, x?.icon) ? x.icon : "like", sel: sel(x?.sel) })).filter((x) => x.sel)
    }
  };
}

export const hostMatches = (hostname, hosts) => hosts.some((h) => hostname === h || hostname.endsWith("." + h));
export const findPlatform = (platforms, hostname) => platforms.find((p) => hostMatches(hostname, p.hosts));
