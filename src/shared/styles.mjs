// "Image style" model: plain data -> CSS. Used by the viewer, the options page and the mockups gallery.
import { baseCss, card, esc } from "./template.mjs";
import { FONT_RE, stack } from "./fonts.mjs";
import { t } from "./i18n.mjs";

// Single schema: validation, defaults and the editor form. `g` = group id, `label`/`opts` = i18n keys.
export const FIELDS = [
  { g: "text", k: "font", t: "font", label: "fd_font" },
  { g: "text", k: "fontSize", t: "range", label: "fd_fontSize", min: 16, max: 32 },
  { g: "text", k: "textWeight", t: "select", label: "fd_textWeight", opts: { 400: "o_w400", 600: "o_w600", 700: "o_w700" } },
  { g: "text", k: "fg", t: "color", label: "fd_fg" },
  { g: "text", k: "muted", t: "color", label: "fd_muted" },
  { g: "text", k: "accent", t: "color", label: "fd_accent" },

  { g: "card", k: "cardBg", t: "color", label: "fd_cardBg" },
  { g: "card", k: "cardPadding", t: "range", label: "fd_cardPadding", min: 12, max: 64 },
  { g: "card", k: "cardRadius", t: "range", label: "fd_cardRadius", min: 0, max: 48 },
  { g: "card", k: "borderWidth", t: "range", label: "fd_borderWidth", min: 0, max: 8 },
  { g: "card", k: "borderColor", t: "color", label: "fd_borderColor" },
  { g: "card", k: "topBar", t: "range", label: "fd_topBar", min: 0, max: 12 },
  { g: "card", k: "topBarColor", t: "color", label: "fd_topBarColor" },
  { g: "card", k: "quoteMark", t: "check", label: "fd_quoteMark" },
  { g: "card", k: "hideMedia", t: "check", label: "fd_hideMedia" },

  { g: "shadow", k: "shadowOpacity", t: "range", label: "fd_shadowOpacity", min: 0, max: 100 },
  { g: "shadow", k: "shadowX", t: "range", label: "fd_shadowX", min: -30, max: 30 },
  { g: "shadow", k: "shadowY", t: "range", label: "fd_shadowY", min: -30, max: 30 },
  { g: "shadow", k: "shadowBlur", t: "range", label: "fd_shadowBlur", min: 0, max: 80 },
  { g: "shadow", k: "shadowColor", t: "color", label: "fd_shadowColor" },
  { g: "shadow", k: "glowBlur", t: "range", label: "fd_glowBlur", min: 0, max: 60 },
  { g: "shadow", k: "glowColor", t: "color", label: "fd_glowColor" },

  { g: "frame", k: "framePadding", t: "range", label: "fd_framePadding", min: 0, max: 80 },
  { g: "frame", k: "frameC1", t: "color", label: "fd_frameC1" },
  { g: "frame", k: "frameC2", t: "color", label: "fd_frameC2" },
  { g: "frame", k: "frameAngle", t: "range", label: "fd_frameAngle", min: 0, max: 360 },

  { g: "inner", k: "innerBorder", t: "color", label: "fd_innerBorder" },
  { g: "inner", k: "innerBorderWidth", t: "range", label: "fd_innerBorderWidth", min: 0, max: 6 },
  { g: "inner", k: "innerRadius", t: "range", label: "fd_innerRadius", min: 0, max: 32 },
  { g: "inner", k: "innerBgOn", t: "check", label: "fd_innerBgOn" },
  { g: "inner", k: "innerBg", t: "color", label: "fd_innerBg" },

  { g: "credit", k: "creditOn", t: "check", label: "fd_creditOn" },
  { g: "credit", k: "creditText", t: "text", label: "fd_creditText", max: 40 },
  { g: "credit", k: "creditFont", t: "font", label: "fd_creditFont" },
  { g: "credit", k: "creditColor", t: "color", label: "fd_creditColor" },
  { g: "credit", k: "creditSize", t: "range", label: "fd_creditSize", min: 9, max: 28 },

  { g: "wm", k: "wmMode", t: "select", label: "fd_wmMode", opts: { none: "o_wm_none", text: "o_wm_text", image: "o_wm_image" } },
  { g: "wm", k: "wmText", t: "text", label: "fd_wmText", max: 40 },
  { g: "wm", k: "wmFont", t: "font", label: "fd_wmFont" },
  { g: "wm", k: "wmColor", t: "color", label: "fd_wmColor" },
  { g: "wm", k: "wmSize", t: "range", label: "fd_wmSize", min: 10, max: 96 },
  { g: "wm", k: "wmImage", t: "image", label: "fd_wmImage" },
  { g: "wm", k: "wmImgWidth", t: "range", label: "fd_wmImgWidth", min: 20, max: 400 },
  { g: "wm", k: "wmImgRatio", t: "range", label: "fd_wmImgRatio", min: 5, max: 2000, hidden: true },
  { g: "wm", k: "wmOpacity", t: "range", label: "fd_wmOpacity", min: 5, max: 100 },
  { g: "wm", k: "wmRotate", t: "range", label: "fd_wmRotate", min: -90, max: 90 },
  { g: "wm", k: "wmPattern", t: "check", label: "fd_wmPattern" },
  { g: "wm", k: "wmGap", t: "range", label: "fd_wmGap", min: 0, max: 200 },
  { g: "wm", k: "wmX", t: "range", label: "fd_wmX", min: 0, max: 100 },
  { g: "wm", k: "wmY", t: "range", label: "fd_wmY", min: 0, max: 100 },

  { g: "avatar", k: "avatarShape", t: "select", label: "fd_avatarShape", opts: { circle: "o_av_circle", rounded: "o_av_rounded", square: "o_av_square" } },
  { g: "avatar", k: "avatarBorderWidth", t: "range", label: "fd_avatarBorderWidth", min: 0, max: 6 },
  { g: "avatar", k: "avatarBorderColor", t: "color", label: "fd_avatarBorderColor" }
];

export const DEFAULT = {
  font: "sans", fontSize: 22, textWeight: "400", fg: "#0f1419", muted: "#536471", accent: "#1d9bf0",
  cardBg: "#ffffff", hideMedia: false, cardPadding: 32, cardRadius: 0, borderWidth: 0, borderColor: "#000000", topBar: 0, topBarColor: "#000000", quoteMark: false,
  shadowOpacity: 0, shadowX: 0, shadowY: 18, shadowBlur: 40, shadowColor: "#000000", glowBlur: 0, glowColor: "#22e6c9",
  framePadding: 0, frameC1: "#ffffff", frameC2: "#ffffff", frameAngle: 135,
  innerBorder: "#cfd9de", innerBorderWidth: 1, innerRadius: 16, innerBgOn: false, innerBg: "#f3f4f6",
  avatarShape: "circle", avatarBorderWidth: 0, avatarBorderColor: "#000000",
  creditOn: false, creditText: "Postframe", creditFont: "mono", creditColor: "#6b7280", creditSize: 13,
  wmMode: "none", wmText: "@yourhandle", wmFont: "sans", wmColor: "#808080", wmSize: 28, wmImage: "", wmImgWidth: 120, wmImgRatio: 100, wmOpacity: 60, wmRotate: 0, wmPattern: false, wmGap: 60, wmX: 88, wmY: 92
};

const mk = (id, nameKey, o) => ({ id, name: nameKey, nameKey, builtin: true, platform: "*", ...DEFAULT, ...o });
// Display name: built-in styles are translated, custom ones use the name the user typed.
export const styleName = (s) => (s.nameKey ? t(s.nameKey) : s.name);
export const BUILTINS = [
  mk("1", "st_1", {}),
  mk("2", "st_2", { fg: "#e7e9ea", muted: "#71767b", cardBg: "#000000", frameC1: "#000000", frameC2: "#000000", innerBorder: "#2f3336" }),
  mk("3", "st_3", { fontSize: 20, accent: "#b4472b", cardPadding: 28, cardRadius: 24, shadowOpacity: 28, framePadding: 36, frameC1: "#b4472b", frameC2: "#d9a441", innerBorder: "#e5e7eb" }),
  mk("4", "st_4", { font: "serif", fontSize: 23, fg: "#1f1a14", muted: "#7a6f60", accent: "#b4472b", cardBg: "#f6f0e4", cardPadding: 44, topBar: 6, topBarColor: "#1f1a14", quoteMark: true, frameC1: "#f6f0e4", frameC2: "#f6f0e4", innerBorder: "#d9cdb6", innerRadius: 4, innerBgOn: true, innerBg: "#efe6d3", avatarShape: "rounded" }),
  mk("5", "st_5", { font: "mono", fontSize: 20, fg: "#e9ecff", muted: "#8c93c4", accent: "#22e6c9", cardBg: "#10132a", cardPadding: 36, cardRadius: 20, borderWidth: 2, borderColor: "#22e6c9", glowBlur: 24, framePadding: 28, frameC1: "#0b0d1a", frameC2: "#0b0d1a", innerBorder: "#a855f7", innerBorderWidth: 2, innerBgOn: true, innerBg: "#151938", avatarBorderWidth: 2, avatarBorderColor: "#a855f7" }),
  mk("6", "st_6", { fontSize: 26, textWeight: "600", fg: "#2b1d3a", muted: "#6b5a7a", accent: "#d6336c", cardPadding: 40, cardRadius: 28, borderWidth: 3, borderColor: "#2b1d3a", shadowOpacity: 100, shadowX: 8, shadowY: 8, shadowBlur: 0, shadowColor: "#2b1d3a", framePadding: 28, frameC1: "#ffd6a5", frameC2: "#fdffb6", frameAngle: 160, creditOn: true, creditColor: "#2b1d3a", creditSize: 14, innerBorder: "#2b1d3a", innerBorderWidth: 2, innerRadius: 18, innerBgOn: true, innerBg: "#fff4e6", avatarBorderWidth: 2, avatarBorderColor: "#2b1d3a" })
];

export const newId = () => "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// Validates any input (storage, import): only known values ever reach the generated CSS.
export function normalizeStyle(raw, base = DEFAULT) {
  if (!raw || typeof raw !== "object") return null;
  const out = {
    id: typeof raw.id === "string" && /^[\w-]{1,24}$/.test(raw.id) ? raw.id : newId(),
    name: String(raw.name ?? "").trim().slice(0, 40) || "Untitled",
    platform: typeof raw.platform === "string" && /^(\*|[\w-]{1,24})$/.test(raw.platform) ? raw.platform : "*"
  };
  for (const f of FIELDS) {
    const v = raw[f.k], d = base[f.k];
    if (f.t === "color") out[f.k] = typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v.toLowerCase() : d;
    else if (f.t === "range") out[f.k] = typeof v !== "boolean" && v !== null && v !== "" && Number.isFinite(+v) ? Math.min(f.max, Math.max(f.min, Math.round(+v))) : d;
    else if (f.t === "font") out[f.k] = typeof v === "string" && FONT_RE.test(v) ? v : d;
    else if (f.t === "text") out[f.k] = typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").slice(0, f.max || 40) : d;
    else if (f.t === "image") out[f.k] = v === "" || (typeof v === "string" && v.length <= 450000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) ? v : d;
    else if (f.t === "select") out[f.k] = Object.hasOwn(f.opts, String(v)) ? String(v) : d;
    else out[f.k] = typeof v === "boolean" ? v : d;
  }
  return out;
}

const PAT = 1500; // side of the pattern grid (covers the image even when rotated)
const AVATAR_RADIUS = { circle: "50%", rounded: "12px", square: "0" };
const hexA = (h, a) => { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };

export function styleCss(st) {
  const s = `.shot.s-${st.id}`;
  const shadows = [];
  if (st.shadowOpacity > 0) shadows.push(`${st.shadowX}px ${st.shadowY}px ${st.shadowBlur}px ${hexA(st.shadowColor, st.shadowOpacity / 100)}`);
  if (st.glowBlur > 0) shadows.push(`0 0 ${st.glowBlur}px ${hexA(st.glowColor, 0.6)}`, `inset 0 0 ${st.glowBlur}px ${hexA(st.glowColor, 0.15)}`);
  return `
${s}{--fg:${st.fg};--muted:${st.muted};--accent:${st.accent};--border:${st.innerBorder};--bw:${st.innerBorderWidth}px;
  --fs:${st.fontSize}px;--fw:${st.textWeight};--pad:${st.cardPadding}px;--ir:${st.innerRadius}px;
  --inner:${st.innerBgOn ? st.innerBg : "transparent"};--avr:${AVATAR_RADIUS[st.avatarShape]};
  --avb:${st.avatarBorderWidth}px solid ${st.avatarBorderColor};
  font-family:${stack(st.font)};padding:${st.framePadding}px;background:linear-gradient(${st.frameAngle}deg,${st.frameC1},${st.frameC2})}
${s} .card{background:${st.cardBg};border-radius:${st.cardRadius}px;border:${st.borderWidth}px solid ${st.borderColor};box-shadow:${shadows.join(",") || "none"}}
${st.topBar > 0 ? `${s} .card::after{content:"";position:absolute;left:0;right:0;top:0;height:${st.topBar}px;background:${st.topBarColor};border-radius:${st.cardRadius}px ${st.cardRadius}px 0 0}` : ""}
${st.creditOn && st.creditText ? `${s} .credit{margin-top:18px;text-align:center;font-family:${stack(st.creditFont)};font-size:${st.creditSize}px;color:${st.creditColor};letter-spacing:.04em}` : ""}
${st.wmMode !== "none" ? `${s} .wm{position:absolute;left:${st.wmX}%;top:${st.wmY}%;transform:translate(-50%,-50%) rotate(${st.wmRotate}deg);opacity:${st.wmOpacity / 100};white-space:nowrap;z-index:2}
${s} .wm-t{font-family:${stack(st.wmFont)};font-size:${st.wmSize}px;line-height:1.3;color:${st.wmColor};font-weight:700;white-space:nowrap}
${s} .wm-i{width:${st.wmImgWidth}px;height:auto;display:block}
${s} .wm-pat{position:absolute;inset:0;overflow:hidden;z-index:2;pointer-events:none;opacity:${st.wmOpacity / 100}}
${s} .wm-grid{position:absolute;left:50%;top:50%;width:${PAT}px;height:${PAT}px;transform:translate(-50%,-50%) rotate(${st.wmRotate}deg);display:flex;flex-direction:column;justify-content:center;gap:${st.wmGap}px}
${s} .wm-row{display:flex;justify-content:center;gap:${st.wmGap}px}
${s} .wm-tile{display:block;flex:none}
${st.wmMode === "image" && st.wmImage ? `${s} .wm-img{width:${st.wmImgWidth}px;height:${Math.max(1, Math.round(st.wmImgWidth * st.wmImgRatio / 100))}px;background:url("${st.wmImage}") center/100% 100% no-repeat}` : ""}` : ""}
${st.quoteMark ? `${s} .card::before{content:"\\201C";position:absolute;right:32px;top:12px;font-size:96px;line-height:1;color:${hexA(st.muted, 0.35)};font-family:${stack("serif")}}` : ""}`;
}

// Brick pattern on a rotated grid. Counts are underestimated on purpose; the overflow is clipped.
function patternHtml(st) {
  let tile, w, h;
  if (st.wmMode === "text" && st.wmText) { tile = `<span class="wm-tile wm-t">${esc(st.wmText)}</span>`; w = Math.max(8, [...st.wmText].length * st.wmSize * 0.45); h = st.wmSize * 1.3 * 0.9; }
  else if (st.wmMode === "image" && st.wmImage) { tile = '<i class="wm-tile wm-img"></i>'; w = st.wmImgWidth; h = Math.max(1, st.wmImgWidth * st.wmImgRatio / 100); }
  else return "";
  // Bricks: even rows have k items and odd rows k+1, all centered. Since every item has the same width,
  // each row is shifted by exactly half a period from its neighbor and aligned with the row two lines away.
  const k = Math.ceil(PAT / (w + st.wmGap));
  const rows = Math.min(Math.ceil(PAT / (h + st.wmGap)), Math.max(1, Math.floor(1500 / (k + 1))));
  const html = Array.from({ length: rows }, (_, i) => `<div class="wm-row">${tile.repeat(i % 2 ? k + 1 : k)}</div>`).join("");
  return `<div class="wm-pat"><div class="wm-grid">${html}</div></div>`;
}

// Full markup of one image (style + post): this is what becomes the PNG.
export function shotHtml(st, tweet, extraCss = "") {
  if (st.hideMedia) tweet = { ...tweet, media: [], original: tweet.original && { ...tweet.original, media: [] } };
  const credit = st.creditOn && st.creditText ? `<div class="credit">${esc(st.creditText)}</div>` : "";
  const wm = st.wmPattern ? patternHtml(st)
    : st.wmMode === "text" && st.wmText ? `<div class="wm wm-t">${esc(st.wmText)}</div>`
    : st.wmMode === "image" && st.wmImage ? `<img class="wm wm-i" src="${st.wmImage}" alt="">` : "";
  return `<style>${extraCss}${baseCss}${styleCss(st)}</style><div class="shot s-${st.id}">${card(tweet)}${credit}${wm}</div>`;
}
// Inner content of .shot (used by the preview, which keeps the <style> separate).
export function shotInner(st, tweet) {
  return shotHtml(st, tweet).replace(/^<style>[\s\S]*?<\/style><div class="shot[^"]*">/, "").replace(/<\/div>$/, "");
}

export const page = (st, tweet) => `<!doctype html><meta charset="utf-8">${shotHtml(st, tweet)}`;
