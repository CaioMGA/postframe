// Modelo de "estilo de screenshot": dados puros -> CSS. Usado pelo viewer, pela página de opções e pelos mockups.
import { baseCss, card, esc } from "./template.mjs";
import { FONT_RE, stack } from "./fonts.mjs";

// Esquema único: validação, valores padrão e formulário do editor.
export const FIELDS = [
  { g: "Texto", k: "font", t: "font", label: "Fonte" },
  { g: "Texto", k: "fontSize", t: "range", label: "Tamanho do texto", min: 16, max: 32 },
  { g: "Texto", k: "textWeight", t: "select", label: "Peso do texto", opts: { 400: "Normal", 600: "Semi-negrito", 700: "Negrito" } },
  { g: "Texto", k: "fg", t: "color", label: "Cor do texto" },
  { g: "Texto", k: "muted", t: "color", label: "Cor secundária (@, hora)" },
  { g: "Texto", k: "accent", t: "color", label: "Cor de destaque (#, @, selo)" },

  { g: "Cartão", k: "cardBg", t: "color", label: "Fundo" },
  { g: "Cartão", k: "cardPadding", t: "range", label: "Espaçamento interno", min: 12, max: 64 },
  { g: "Cartão", k: "cardRadius", t: "range", label: "Cantos arredondados", min: 0, max: 48 },
  { g: "Cartão", k: "borderWidth", t: "range", label: "Espessura da borda", min: 0, max: 8 },
  { g: "Cartão", k: "borderColor", t: "color", label: "Cor da borda" },
  { g: "Cartão", k: "topBar", t: "range", label: "Faixa no topo", min: 0, max: 12 },
  { g: "Cartão", k: "topBarColor", t: "color", label: "Cor da faixa" },
  { g: "Cartão", k: "quoteMark", t: "check", label: "Aspas decorativas" },
  { g: "Cartão", k: "hideMedia", t: "check", label: "Esconder imagens do post" },

  { g: "Sombra e brilho", k: "shadowOpacity", t: "range", label: "Opacidade da sombra", min: 0, max: 100 },
  { g: "Sombra e brilho", k: "shadowX", t: "range", label: "Sombra X", min: -30, max: 30 },
  { g: "Sombra e brilho", k: "shadowY", t: "range", label: "Sombra Y", min: -30, max: 30 },
  { g: "Sombra e brilho", k: "shadowBlur", t: "range", label: "Desfoque da sombra", min: 0, max: 80 },
  { g: "Sombra e brilho", k: "shadowColor", t: "color", label: "Cor da sombra" },
  { g: "Sombra e brilho", k: "glowBlur", t: "range", label: "Brilho (0 = desligado)", min: 0, max: 60 },
  { g: "Sombra e brilho", k: "glowColor", t: "color", label: "Cor do brilho" },

  { g: "Moldura", k: "framePadding", t: "range", label: "Largura da moldura (0 = sem)", min: 0, max: 80 },
  { g: "Moldura", k: "frameC1", t: "color", label: "Cor 1" },
  { g: "Moldura", k: "frameC2", t: "color", label: "Cor 2 (igual à 1 = cor lisa)" },
  { g: "Moldura", k: "frameAngle", t: "range", label: "Ângulo do gradiente", min: 0, max: 360 },

  { g: "Tweet aninhado e rodapé", k: "innerBorder", t: "color", label: "Cor da borda / linha" },
  { g: "Tweet aninhado e rodapé", k: "innerBorderWidth", t: "range", label: "Espessura da borda", min: 0, max: 6 },
  { g: "Tweet aninhado e rodapé", k: "innerRadius", t: "range", label: "Cantos arredondados", min: 0, max: 32 },
  { g: "Tweet aninhado e rodapé", k: "innerBgOn", t: "check", label: "Usar fundo próprio" },
  { g: "Tweet aninhado e rodapé", k: "innerBg", t: "color", label: "Cor do fundo" },

  { g: "Crédito abaixo da imagem", k: "creditOn", t: "check", label: "Mostrar crédito" },
  { g: "Crédito abaixo da imagem", k: "creditText", t: "text", label: "Texto", max: 40 },
  { g: "Crédito abaixo da imagem", k: "creditFont", t: "font", label: "Fonte" },
  { g: "Crédito abaixo da imagem", k: "creditColor", t: "color", label: "Cor" },
  { g: "Crédito abaixo da imagem", k: "creditSize", t: "range", label: "Tamanho", min: 9, max: 28 },

  { g: "Marca d'água", k: "wmMode", t: "select", label: "Tipo", opts: { none: "Nenhuma", text: "Texto", image: "Imagem" } },
  { g: "Marca d'água", k: "wmText", t: "text", label: "Texto", max: 40 },
  { g: "Marca d'água", k: "wmFont", t: "font", label: "Fonte" },
  { g: "Marca d'água", k: "wmColor", t: "color", label: "Cor" },
  { g: "Marca d'água", k: "wmSize", t: "range", label: "Tamanho do texto", min: 10, max: 96 },
  { g: "Marca d'água", k: "wmImage", t: "image", label: "Imagem" },
  { g: "Marca d'água", k: "wmImgWidth", t: "range", label: "Largura da imagem", min: 20, max: 400 },
  { g: "Marca d'água", k: "wmImgRatio", t: "range", label: "Proporção da imagem", min: 5, max: 2000, hidden: true },
  { g: "Marca d'água", k: "wmOpacity", t: "range", label: "Opacidade", min: 5, max: 100 },
  { g: "Marca d'água", k: "wmRotate", t: "range", label: "Inclinação (graus)", min: -90, max: 90 },
  { g: "Marca d'água", k: "wmPattern", t: "check", label: "Repetir como padrão" },
  { g: "Marca d'água", k: "wmGap", t: "range", label: "Espaçamento do padrão (px)", min: 0, max: 200 },
  { g: "Marca d'água", k: "wmX", t: "range", label: "Posição horizontal (%)", min: 0, max: 100 },
  { g: "Marca d'água", k: "wmY", t: "range", label: "Posição vertical (%)", min: 0, max: 100 },

  { g: "Foto de perfil", k: "avatarShape", t: "select", label: "Formato", opts: { circle: "Círculo", rounded: "Arredondado", square: "Quadrado" } },
  { g: "Foto de perfil", k: "avatarBorderWidth", t: "range", label: "Espessura da borda", min: 0, max: 6 },
  { g: "Foto de perfil", k: "avatarBorderColor", t: "color", label: "Cor da borda" }
];

export const DEFAULT = {
  font: "sans", fontSize: 22, textWeight: "400", fg: "#0f1419", muted: "#536471", accent: "#1d9bf0",
  cardBg: "#ffffff", hideMedia: false, cardPadding: 32, cardRadius: 0, borderWidth: 0, borderColor: "#000000", topBar: 0, topBarColor: "#000000", quoteMark: false,
  shadowOpacity: 0, shadowX: 0, shadowY: 18, shadowBlur: 40, shadowColor: "#000000", glowBlur: 0, glowColor: "#22e6c9",
  framePadding: 0, frameC1: "#ffffff", frameC2: "#ffffff", frameAngle: 135,
  innerBorder: "#cfd9de", innerBorderWidth: 1, innerRadius: 16, innerBgOn: false, innerBg: "#f3f4f6",
  avatarShape: "circle", avatarBorderWidth: 0, avatarBorderColor: "#000000",
  creditOn: false, creditText: "Postframe", creditFont: "mono", creditColor: "#6b7280", creditSize: 13,
  wmMode: "none", wmText: "@seuusuario", wmFont: "sans", wmColor: "#808080", wmSize: 28, wmImage: "", wmImgWidth: 120, wmImgRatio: 100, wmOpacity: 60, wmRotate: 0, wmPattern: false, wmGap: 60, wmX: 88, wmY: 92
};

const mk = (id, name, o) => ({ id, name, builtin: true, platform: "*", ...DEFAULT, ...o });
export const BUILTINS = [
  mk("1", "Claro clássico", {}),
  mk("2", "Escuro", { fg: "#e7e9ea", muted: "#71767b", cardBg: "#000000", frameC1: "#000000", frameC2: "#000000", innerBorder: "#2f3336" }),
  mk("3", "Moldura gradiente", { fontSize: 20, accent: "#7c3aed", cardPadding: 28, cardRadius: 24, shadowOpacity: 28, framePadding: 36, frameC1: "#6d5efc", frameC2: "#c084fc", innerBorder: "#e5e7eb" }),
  mk("4", "Editorial", { font: "serif", fontSize: 23, fg: "#1f1a14", muted: "#7a6f60", accent: "#b4472b", cardBg: "#f6f0e4", cardPadding: 44, topBar: 6, topBarColor: "#1f1a14", quoteMark: true, frameC1: "#f6f0e4", frameC2: "#f6f0e4", innerBorder: "#d9cdb6", innerRadius: 4, innerBgOn: true, innerBg: "#efe6d3", avatarShape: "rounded" }),
  mk("5", "Neon", { font: "mono", fontSize: 20, fg: "#e9ecff", muted: "#8c93c4", accent: "#22e6c9", cardBg: "#10132a", cardPadding: 36, cardRadius: 20, borderWidth: 2, borderColor: "#22e6c9", glowBlur: 24, framePadding: 28, frameC1: "#0b0d1a", frameC2: "#0b0d1a", innerBorder: "#a855f7", innerBorderWidth: 2, innerBgOn: true, innerBg: "#151938", avatarBorderWidth: 2, avatarBorderColor: "#a855f7" }),
  mk("6", "Pôster pastel", { fontSize: 26, textWeight: "600", fg: "#2b1d3a", muted: "#6b5a7a", accent: "#d6336c", cardPadding: 40, cardRadius: 28, borderWidth: 3, borderColor: "#2b1d3a", shadowOpacity: 100, shadowX: 8, shadowY: 8, shadowBlur: 0, shadowColor: "#2b1d3a", framePadding: 28, frameC1: "#ffd6a5", frameC2: "#fdffb6", frameAngle: 160, creditOn: true, creditColor: "#2b1d3a", creditSize: 14, innerBorder: "#2b1d3a", innerBorderWidth: 2, innerRadius: 18, innerBgOn: true, innerBg: "#fff4e6", avatarBorderWidth: 2, avatarBorderColor: "#2b1d3a" })
];

export const newId = () => "c-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

// Valida qualquer entrada (storage, importação) — só valores conhecidos chegam ao CSS.
export function normalizeStyle(raw, base = DEFAULT) {
  if (!raw || typeof raw !== "object") return null;
  const out = {
    id: typeof raw.id === "string" && /^[\w-]{1,24}$/.test(raw.id) ? raw.id : newId(),
    name: String(raw.name ?? "").trim().slice(0, 40) || "Sem nome",
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

const PAT = 1500; // lado da grade do padrão (cobre a imagem mesmo girada)
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

// Padrão em tijolos numa grade girada. As quantidades são estimadas por baixo; o excedente é cortado.
function patternHtml(st) {
  let tile, w, h;
  if (st.wmMode === "text" && st.wmText) { tile = `<span class="wm-tile wm-t">${esc(st.wmText)}</span>`; w = Math.max(8, [...st.wmText].length * st.wmSize * 0.45); h = st.wmSize * 1.3 * 0.9; }
  else if (st.wmMode === "image" && st.wmImage) { tile = '<i class="wm-tile wm-img"></i>'; w = st.wmImgWidth; h = Math.max(1, st.wmImgWidth * st.wmImgRatio / 100); }
  else return "";
  // Tijolos: linhas pares com k itens e ímpares com k+1, todas centralizadas. Como os itens têm a mesma
  // largura, cada linha fica deslocada exatamente meio período da vizinha e alinhada com a de 2 linhas.
  const k = Math.ceil(PAT / (w + st.wmGap));
  const rows = Math.min(Math.ceil(PAT / (h + st.wmGap)), Math.max(1, Math.floor(1500 / (k + 1))));
  const html = Array.from({ length: rows }, (_, i) => `<div class="wm-row">${tile.repeat(i % 2 ? k + 1 : k)}</div>`).join("");
  return `<div class="wm-pat"><div class="wm-grid">${html}</div></div>`;
}

// Markup completo de uma imagem (estilo + tweet) — o que vira PNG.
export function shotHtml(st, tweet, extraCss = "") {
  if (st.hideMedia) tweet = { ...tweet, media: [], original: tweet.original && { ...tweet.original, media: [] } };
  const credit = st.creditOn && st.creditText ? `<div class="credit">${esc(st.creditText)}</div>` : "";
  const wm = st.wmPattern ? patternHtml(st)
    : st.wmMode === "text" && st.wmText ? `<div class="wm wm-t">${esc(st.wmText)}</div>`
    : st.wmMode === "image" && st.wmImage ? `<img class="wm wm-i" src="${st.wmImage}" alt="">` : "";
  return `<style>${extraCss}${baseCss}${styleCss(st)}</style><div class="shot s-${st.id}">${card(tweet)}${credit}${wm}</div>`;
}
// Conteúdo interno do .shot (usado pela pré-visualização, que mantém o <style> à parte).
export function shotInner(st, tweet) {
  return shotHtml(st, tweet).replace(/^<style>[\s\S]*?<\/style><div class="shot[^"]*">/, "").replace(/<\/div>$/, "");
}

export const page = (st, tweet) => `<!doctype html><meta charset="utf-8">${shotHtml(st, tweet)}`;
