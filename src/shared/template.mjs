export const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (s) => esc(s).replace(/([#@][\p{L}\p{N}_]+)/gu, '<span class="lnk">$1</span>');
const CHECK = '<svg class="ck" viewBox="0 0 24 24"><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91C2.88 9.33 2 10.57 2 12s.88 2.67 2.19 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/></svg>';

const head = (a, cls = "") => `
  <div class="head ${cls}">
    <img class="av" src="${a.avatar}">
    <div class="who"><div class="name">${esc(a.name)}${a.verified ? CHECK : ""}</div><div class="handle">${esc(a.handle)}</div></div>
  </div>`;

const ICONS = {
  reply: '<svg viewBox="0 0 24 24"><path d="M1.75 10.75c0-4.28 3.47-7.75 7.75-7.75h5c4.28 0 7.75 3.47 7.75 7.75 0 3.9-2.9 7.12-6.66 7.66v3.09c0 .3-.36.45-.57.24l-3.7-3.58H9.5c-4.28 0-7.75-3.47-7.75-7.56zm7.75-5.75a5.75 5.75 0 0 0 0 11.5h1.14c.26 0 .5.1.7.28l2.21 2.14v-1.68c0-.5.4-.9.9-.9a5.75 5.75 0 0 0-.2-11.34H9.5z"/></svg>',
  retweet: '<svg viewBox="0 0 24 24"><path d="M4.75 3.79l4.6 4.38-1.38 1.45-2.22-2.1V16c0 1.1.9 2 2 2h5.5v2h-5.5a4 4 0 0 1-4-4V7.52l-2.22 2.1L.15 8.17l4.6-4.38zm14.5 16.42l-4.6-4.38 1.38-1.45 2.22 2.1V8c0-1.1-.9-2-2-2h-5.5V4h5.5a4 4 0 0 1 4 4v8.48l2.22-2.1 1.38 1.45-4.6 4.38z"/></svg>',
  comment: null,
  like: '<svg viewBox="0 0 24 24"><path d="M16.7 4C14.9 4 13.2 4.9 12 6.4 10.8 4.9 9.1 4 7.3 4 4.2 4 1.75 6.55 1.75 9.7c0 4.7 4.6 7.9 8.4 11 .6.5 1.1.9 1.85 1.4.75-.5 1.25-.9 1.85-1.4 3.8-3.1 8.4-6.3 8.4-11C22.25 6.55 19.8 4 16.7 4zM12 19.7c-.4-.3-.8-.6-1.2-.95C7.3 15.9 3.75 13.2 3.75 9.7c0-2.05 1.55-3.7 3.55-3.7 1.4 0 2.7.8 3.4 2.1l1.3 2.4 1.3-2.4C14 6.8 15.3 6 16.7 6c2 0 3.55 1.65 3.55 3.7 0 3.5-3.55 6.2-7.05 9.05-.4.35-.8.65-1.2.95z"/></svg>'
};
ICONS.comment = ICONS.reply;
ICONS.upvote = '<svg viewBox="0 0 24 24"><path d="M12 3.2 3.6 13h5.1v7.8h6.6V13h5.1L12 3.2zm0 3.3 3.9 4.5h-2.6v7.8h-2.6V11H8.1L12 6.5z"/></svg>';
ICONS.share = '<svg viewBox="0 0 24 24"><path d="M12 2.6 7.3 7.3l1.4 1.4L11 6.4V15h2V6.4l2.3 2.3 1.4-1.4L12 2.6zM5 11v9h14v-9h-2v7H7v-7H5z"/></svg>';
ICONS.view = '<svg viewBox="0 0 24 24"><path d="M12 5C6.5 5 2.7 9.3 1.5 12c1.2 2.7 5 7 10.5 7s9.3-4.3 10.5-7C21.3 9.3 17.5 5 12 5zm0 12c-3.6 0-6.5-2.6-7.9-5 1.4-2.4 4.3-5 7.9-5s6.5 2.6 7.9 5c-1.4 2.4-4.3 5-7.9 5zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/></svg>';
const when = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return String(iso).slice(0, 40); // texto relativo ("3 h") de sites sem datetime
  return `${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · ${d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}`;
};
// Rodapé (contagens e hora): só no card externo. stats = [{ icon, n }]
const foot = (s) => {
  const st = Array.isArray(s.stats) ? s.stats.filter((x) => ICONS[x.icon]) : [], t = s.time ? when(s.time) : "";
  if (!st.length && !t) return "";
  const stat = (x) => `<span class="stat">${ICONS[x.icon]}${esc(String(x.n || "0"))}</span>`;
  return `<div class="foot">${st.length ? `<div class="stats">${st.map(stat).join("")}</div>` : "<div></div>"}<div class="time">${esc(t)}</div></div>`;
};

// Mosaico de 1 a 4 imagens (só data URI de imagem raster, gerados pelo viewer).
const media = (list) => {
  const m = (Array.isArray(list) ? list : []).filter((u) => typeof u === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u)).slice(0, 4);
  return m.length ? `<div class="media n${m.length}">${m.map((u) => `<img src="${u}" alt="">`).join("")}</div>` : "";
};
const para = (t) => (t ? `<p class="text">${rich(t)}</p>` : "");

// s = { kind: "tweet"|"repost"|"quote", author, text, original?: { author, text } }
export function card(s) {
  const body = s.original
    ? `${s.kind === "repost" ? '<div class="rt">↻ retuitou</div>' : ""}${head(s.author)}${para(s.text)}${media(s.media)}
       <div class="orig">${head(s.original.author, "sm")}${para(s.original.text)}${media(s.original.media)}</div>${foot(s)}`
    : `${head(s.author)}${para(s.text)}${media(s.media)}${foot(s)}`;
  return `<div class="card">${body}</div>`;
}

// Avatar de reserva (inicial sobre gradiente) quando a foto não está disponível.
export function placeholderAvatar(name = "?", seed = name) {
  let h = 0; for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 360;
  const letter = esc([...name.trim()][0]?.toUpperCase() || "?");
  return "data:image/svg+xml;utf8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h},70%,55%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360},70%,40%)"/></linearGradient></defs><rect width="96" height="96" fill="url(#g)"/><text x="48" y="64" font-size="46" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`);
}

// CSS estrutural, escopado em .shot (não vaza para a página que o hospeda).
// Cores, fontes e medidas vêm das variáveis geradas por styleCss() (styles.mjs).
export const baseCss = `
.shot,.shot *{box-sizing:border-box;margin:0}
.shot{width:600px;color:var(--fg);position:relative}
.shot .card{position:relative;padding:var(--pad)}
.shot .head{display:flex;align-items:center;gap:12px}
.shot .av{width:52px;height:52px;flex:none;object-fit:cover;border-radius:var(--avr);border:var(--avb)}
.shot .name{font-weight:700;font-size:17px;display:flex;align-items:center;gap:4px;line-height:1.2}
.shot .handle{color:var(--muted);font-size:15px;line-height:1.3}
.shot .ck{width:18px;height:18px;fill:var(--accent)}
.shot .text{white-space:pre-wrap;font-size:var(--fs);font-weight:var(--fw);line-height:1.45;margin-top:16px;overflow-wrap:anywhere}
.shot .lnk{color:var(--accent)}
.shot .rt{color:var(--muted);font-size:14px;font-weight:600;margin-bottom:12px}
.shot .orig{margin-top:16px;border:var(--bw) solid var(--border);border-radius:var(--ir);padding:16px;background:var(--inner)}
.shot .orig .av{width:36px;height:36px}
.shot .orig .name{font-size:15px}.shot .orig .handle{font-size:14px}
.shot .orig .text{font-size:calc(var(--fs) - 2px);margin-top:12px}
.shot .media{display:grid;gap:4px;margin-top:14px;border-radius:var(--ir);overflow:hidden}
.shot .media img{display:block;width:100%;height:100%;object-fit:cover}
.shot .media.n1 img{height:auto;max-height:460px}
.shot .media.n2,.shot .media.n3,.shot .media.n4{aspect-ratio:16/9;grid-template-columns:1fr 1fr;grid-template-rows:1fr}
.shot .media.n3,.shot .media.n4{grid-template-rows:1fr 1fr}
.shot .media.n3 img:first-child{grid-row:span 2}
.shot .orig .media{margin-top:12px}
.shot .foot{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:20px;padding-top:16px;border-top:max(var(--bw),1px) solid var(--border);color:var(--muted);font-size:15px;flex-wrap:wrap}
.shot .stats{display:flex;gap:18px;flex-wrap:wrap}
.shot .stat{display:inline-flex;align-items:center;gap:7px;white-space:nowrap}
.shot .stat svg{width:19px;height:19px;fill:currentColor}
.shot .time{white-space:nowrap}
`;
