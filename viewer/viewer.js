import { placeholderAvatar } from "../src/shared/template.mjs";
import { initI18n, applyI18n, t } from "../src/shared/i18n.mjs";
import { shotHtml, styleName } from "../src/shared/styles.mjs";
import { fontFaceCss, fontsUsed } from "../src/shared/fonts.mjs";
import { getAll, stylesFor, defaultFor, saveDefaults } from "../src/shared/store.mjs";

const MAX_BYTES = 350 * 1024;
const WIDTH = 600;
const $ = (id) => document.getElementById(id);
await initI18n();
applyI18n();

// --- data ---------------------------------------------------------------
const id = new URLSearchParams(location.search).get("id");
const stored = await chrome.storage.local.get(`tweet:${id}`);
const tweet = stored[`tweet:${id}`];
if (!tweet) {
  $("msg").textContent = t("vw_not_found");
  throw new Error("sem dados");
}

const platform = tweet.platform || "x";
const lib = await getAll();
const designs = stylesFor(lib.all, platform);        // styles of the platform + the ones that apply to "all platforms"
let defaultId = defaultFor(lib.all, lib.defaults, platform);
const sampleText = [tweet.text, tweet.original?.text, tweet.author?.name].join(" ");

const toDataUrl = async (url) => {
  const res = await fetch(url);
  const blob = await res.blob();
  if (!res.ok || !blob.type.startsWith("image/")) throw new Error("avatar unavailable");
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result); r.onerror = rej;
    r.readAsDataURL(blob);
  });
};
// Pictures become data URIs (required to render inside the SVG), with a fallback on failure.
const prepareAuthor = async (a) => {
  let avatar = "";
  if (a.avatar) { try { avatar = await toDataUrl(a.avatar); } catch {} }
  return { ...a, avatar: avatar || placeholderAvatar(a.name.replace(/^[^\p{L}\p{N}]+/u, "") || a.handle.slice(1), a.handle) };
};
// Post images: download and shrink (max 1000 px, JPEG) so they fit the final image size limit.
const prepareMedia = async (list = []) => (await Promise.all(list.slice(0, 4).map(async (u) => {
  try {
    if (u.startsWith("data:")) return u;
    const res = await fetch(u); if (!res.ok) return "";
    const bmp = await createImageBitmap(await res.blob()), sc = Math.min(1, 1000 / Math.max(bmp.width, bmp.height));
    const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) });
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } catch { return ""; }
}))).filter(Boolean);

const data = { ...tweet, author: await prepareAuthor(tweet.author), media: await prepareMedia(tweet.media) };
if (tweet.original) data.original = { ...tweet.original, author: await prepareAuthor(tweet.original.author), media: await prepareMedia(tweet.original.media) };

// --- rendering: DOM -> SVG foreignObject -> canvas -> image ---------------
const canvasBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));

// Quick toggles (apply to every version and are remembered): credit, watermark and images.
const stored2 = (await chrome.storage.local.get("toggles")).toggles || {};
const bool = (v) => (typeof v === "boolean" ? v : undefined);
const ov = { credit: bool(stored2.credit), wm: stored2.wm === false ? false : undefined, media: bool(stored2.media) };
const eff = (d) => ({ ...d, creditOn: ov.credit ?? d.creditOn, wmMode: ov.wm === false ? "none" : d.wmMode, hideMedia: ov.media === undefined ? d.hideMedia : !ov.media });
const saveToggles = () => chrome.storage.local.set({ toggles: { credit: ov.credit, wm: ov.wm, media: ov.media } });
const hasMedia = !!(data.media?.length || data.original?.media?.length);

async function render(design) {
  const d = eff(design);
  const host = document.createElement("div");
  host.style.cssText = `position:fixed;left:-10000px;top:0;width:${WIDTH}px`;
  const faces = await fontFaceCss(d, sampleText);       // Google Fonts embutidas (data URI)
  host.innerHTML = `<div>${shotHtml(d, data, faces)}</div>`;
  document.body.appendChild(host);
  try {
    await Promise.all([...fontsUsed(d)].flatMap(([f, ws]) => [...ws].map((w) => document.fonts.load(`${w} 16px "${f}"`).catch(() => {}))));
    await document.fonts.ready;
    await Promise.all([...host.querySelectorAll("img")].map((i) => i.decode().catch(() => {})));
    const h = Math.ceil(host.querySelector(".shot").getBoundingClientRect().height);
    const xml = new XMLSerializer().serializeToString(host.firstElementChild);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${h}"><foreignObject x="0" y="0" width="${WIDTH}" height="${h}">${xml}</foreignObject></svg>`;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const canvas = Object.assign(document.createElement("canvas"), { width: WIDTH, height: h });
    canvas.getContext("2d").drawImage(img, 0, 0);

    let blob = await canvasBlob(canvas, "image/png");
    let ext = "png";
    for (let q = 0.92; blob.size > MAX_BYTES && q > 0.4; q -= 0.1) { // reserva: JPEG
      blob = await canvasBlob(canvas, "image/jpeg", q); ext = "jpg";
    }
    return { design, blob, ext, w: WIDTH, h, url: URL.createObjectURL(blob) };
  } finally { host.remove(); }
}

// --- interface ----------------------------------------------------------------
let results = [], idx = 0;
const kb = (n) => (n / 1024).toFixed(1);

function show() {
  const r = results[idx];
  $("img").src = r.url;
  $("cap").innerHTML = `<b>${idx + 1}/${results.length} · ${styleName(r.design).replace(/[<&]/g, '')}</b><br>${r.w}×${r.h}px · ${kb(r.blob.size)} KB`;
  $("thumbs").innerHTML = results.map((x, i) =>
    `<button data-i="${i}" ${i === idx ? 'aria-current="true"' : ""}><img src="${x.url}" alt=""><span>${i + 1} · ${styleName(x.design).replace(/[<&]/g, "")}</span></button>`).join("");
  history.replaceState(null, "", `#${idx + 1}`);
  const pname = lib.platforms.find((p) => p.id === platform)?.name;
  $("title").textContent = t("vw_title", results.length) + (pname ? " · " + pname : "");
  const isDef = r.design.id === defaultId;
  $("def").textContent = isDef ? t("vw_is_default") : t("vw_set_default");
  $("def").disabled = isDef;
  const e = eff(r.design);
  $("tgCredit").checked = !!e.creditOn;
  $("tgWm").checked = e.wmMode !== "none";
  $("tgWm").disabled = r.design.wmMode === "none";     // no watermark in this style: set one up in Styles
  $("tgMedia").checked = !e.hideMedia;
  $("tgMedia").disabled = !hasMedia;                    // post without images: nothing to hide
  $("tgMedia").parentElement.title = hasMedia ? "" : t("vw_no_images");
  $("tgWm").parentElement.title = $("tgWm").disabled ? t("vw_no_wm") : "";
}
const go = (d) => { idx = (idx + d + results.length) % results.length; show(); };

const fileName = () => {
  const r = results[idx];
  return `tweet-${(tweet.author.handle || "x").replace("@", "")}-${r.design.id}.${r.ext}`;
};

$("def").onclick = async () => {
  defaultId = results[idx].design.id;
  lib.defaults[platform] = defaultId;
  await saveDefaults(lib.defaults); show();
};
$("styles").onclick = () => chrome.runtime.openOptionsPage();
$("prev").onclick = () => go(-1);
$("next").onclick = () => go(1);
$("thumbs").onclick = (e) => { const b = e.target.closest("button"); if (b) { idx = +b.dataset.i; show(); } };
$("download").onclick = () => Object.assign(document.createElement("a"), { href: results[idx].url, download: fileName() }).click();
$("copy").onclick = async () => {
  const r = results[idx];
  try {
    // The clipboard accepts PNG; a JPEG fallback is converted back.
    let blob = r.blob;
    if (r.ext !== "png") {
      const bmp = await createImageBitmap(blob);
      const c = Object.assign(document.createElement("canvas"), { width: bmp.width, height: bmp.height });
      c.getContext("2d").drawImage(bmp, 0, 0);
      blob = await canvasBlob(c, "image/png");
    }
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    $("copy").textContent = t("vw_copied");
  } catch { $("copy").textContent = t("vw_failed"); }
  setTimeout(() => ($("copy").textContent = t("vw_copy")), 1500);
};
addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "ArrowRight") go(1);
});

async function generate() {
  $("msg").textContent = t("vw_generating");
  const old = results;
  results = await Promise.all(designs.map(render));
  old.forEach((r) => URL.revokeObjectURL(r.url));
  $("msg").textContent = "";
  show();
}
$("tgCredit").onchange = async () => { ov.credit = $("tgCredit").checked; await saveToggles(); generate(); };
$("tgWm").onchange = async () => { ov.wm = $("tgWm").checked ? undefined : false; await saveToggles(); generate(); };
$("tgMedia").onchange = async () => { ov.media = $("tgMedia").checked; await saveToggles(); generate(); };

await generate();
// open on the user's default style
idx = Math.max(0, results.findIndex((r) => r.design.id === defaultId));
show();
