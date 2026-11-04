// Fonts: generic system stacks + Google Fonts (downloaded and inlined as data URIs,
// because the renderer uses SVG-as-image, which cannot load external resources).
export const GENERIC = {
  sans: "'Noto Sans','Liberation Sans','Segoe UI',system-ui,sans-serif",
  serif: "'Noto Serif','DejaVu Serif',Georgia,serif",
  mono: "'DejaVu Sans Mono','Noto Sans Mono',Consolas,monospace"
};
export const GENERIC_LABELS = { sans: "font_sans", serif: "font_serif", mono: "font_mono" };   // i18n keys

// Curated list (no API key needed). Any other Google Fonts family can be typed in.
export const CURATED = [
  "Inter", "Roboto", "Open Sans", "Lato", "Montserrat", "Poppins", "Nunito", "Work Sans", "DM Sans", "Manrope", "Rubik", "Space Grotesk",
  "Playfair Display", "Merriweather", "Lora", "Libre Baskerville", "Crimson Text", "DM Serif Display", "Abril Fatface",
  "Bebas Neue", "Oswald", "Archivo Black", "Anton", "Righteous", "Fredoka", "Bangers", "Lobster", "Pacifico", "Caveat", "Permanent Marker",
  "Space Mono", "JetBrains Mono", "IBM Plex Mono", "Fira Code", "Roboto Mono", "Source Code Pro", "Courier Prime", "VT323", "Press Start 2P", "Comic Neue"
];

export const FONT_RE = /^(sans|serif|mono|g:[A-Za-z0-9 ]{1,50})$/;
export const isGoogle = (v) => typeof v === "string" && v.startsWith("g:");
export const familyOf = (v) => v.slice(2).trim();
export const stack = (v) => (isGoogle(v) ? `'${familyOf(v)}',${GENERIC.sans}` : GENERIC[v] || GENERIC.sans);

// Families (and weights) a style uses.
export function fontsUsed(st) {
  const used = new Map();
  const add = (v, ws) => { if (isGoogle(v)) { const f = familyOf(v); const s = used.get(f) || new Set(); ws.forEach((w) => s.add(w)); used.set(f, s); } };
  add(st.font, [400, 700, Number(st.textWeight) || 400]);
  if (st.creditOn) add(st.creditFont, [400]);
  if (st.wmMode === "text") add(st.wmFont, [700]);
  return used;
}

const cache = new Map();
const toDataUrl = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("font unavailable");
  const blob = await res.blob();
  return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
};

async function inlineCss(css, wantExt) {
  const blocks = [...css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  const keep = blocks.length ? blocks.filter((b) => b[1] === "latin" || (wantExt && b[1] === "latin-ext")).map((b) => b[2]) : [css];
  return (await Promise.all(keep.map(async (b) => {
    const urls = [...b.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((m) => m[1]);
    for (const u of urls) b = b.replace(u, await toDataUrl(u));
    return b;
  }))).join("\n");
}

// Returns @font-face CSS (data URI) for a family; throws if it does not exist.
export function loadFamily(family, weights, wantExt = false) {
  if (!/^[A-Za-z0-9 ]{1,50}$/.test(family)) return Promise.reject(new Error("invalid name"));
  const ws = [...new Set(weights)].sort((a, b) => a - b);
  const key = `${family}|${ws}|${wantExt}`;
  if (!cache.has(key)) {
    cache.set(key, (async () => {
      const fam = encodeURIComponent(family).replace(/%20/g, "+");
      for (const w of [ws, [400, 700], []]) { // missing weights return 400: retry with fewer weights
        const res = await fetch(`https://fonts.googleapis.com/css2?family=${fam}${w.length ? `:wght@${w.join(";")}` : ""}&display=swap`);
        if (res.ok) return inlineCss(await res.text(), wantExt);
      }
      throw new Error("Font not found on Google Fonts");
    })());
    cache.get(key).catch(() => cache.delete(key));
  }
  return cache.get(key);
}

// CSS for all the fonts of a style; fonts that fail fall back to the generic stack.
export async function fontFaceCss(st, sampleText = "") {
  const ext = /[Ā-ɏ]/.test(sampleText);
  const parts = await Promise.all([...fontsUsed(st)].map(([f, ws]) => loadFamily(f, [...ws], ext).catch(() => "")));
  return parts.join("\n");
}
