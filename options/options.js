import { FIELDS, DEFAULT, newId, normalizeStyle, styleCss, shotInner, styleName } from "../src/shared/styles.mjs";
import { initI18n, applyI18n, t, LANGS, getLang, setLang } from "../src/shared/i18n.mjs";
import { baseCss, placeholderAvatar, esc } from "../src/shared/template.mjs";
import { GENERIC_LABELS, CURATED, FONT_RE, isGoogle, familyOf, fontsUsed, loadFamily } from "../src/shared/fonts.mjs";
import { ICON_KEYS, normalizePlatform, shadowedBuiltin } from "../src/shared/platforms.mjs";
import { getAll, defaultFor, saveStyles, savePlatforms, saveDefaults } from "../src/shared/store.mjs";

const $ = (id) => document.getElementById(id);
const savedLang = await initI18n();   // "" until the user picks a language
applyI18n();
const clamp = (n) => Math.min(100, Math.max(0, Math.round(n)));

let lib = await getAll();           // { all, custom, platforms, userPlatforms, defaults }
let selId = "1", sample = "tweet", platSel = "x";
// The general default: the style used wherever a platform has no choice of its own.
const generalId = () => (lib.all.some((s) => s.id === lib.defaults["*"]) ? lib.defaults["*"] : lib.all[0].id);
selId = generalId();
const current = () => lib.all.find((s) => s.id === selId) || lib.all[0];
const isCustom = (s) => !s.builtin;

// --- samples ---------------------------------------------------------------
const A = (name, handle, verified = false) => ({ name, handle, verified, avatar: placeholderAvatar(name, handle) });
const stats = [{ icon: "reply", n: "128" }, { icon: "retweet", n: "1.4K" }, { icon: "like", n: "9.8K" }];
// sample images generated on the fly (gradients)
const ph = (a, b) => { const c = Object.assign(document.createElement("canvas"), { width: 800, height: 600 }), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 800, 600); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 800, 600); x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.arc(560, 200, 110, 0, 7); x.fill(); x.fillRect(80, 380, 420, 120); return c.toDataURL("image/jpeg", 0.8); };
const MEDIA = [ph("#0ea5e9", "#6366f1"), ph("#f97316", "#db2777"), ph("#10b981", "#0f766e"), ph("#eab308", "#ef4444")];
const SAMPLES = {
  tweet: { label: t("op_sample_post"), data: { kind: "tweet", author: A("Marina Alves", "@marinaalves", true), text: t("op_sample_text_post"), stats, time: "2026-11-04T14:32:00-03:00" } },
  media: { label: t("op_sample_media"), data: { kind: "tweet", author: A("Marina Alves", "@marinaalves", true), text: t("op_sample_text_media"), media: MEDIA.slice(0, 3), stats, time: "2026-11-04T14:32:00-03:00" } },
  repost: { label: t("op_sample_repost"), data: { kind: "repost", author: A("Lucas Torres", "@lucastorres"), text: "", stats, time: "2026-11-04T09:05:00-03:00", original: { author: A("Pedro Nunes", "@pedronunes_dev"), text: t("op_sample_text_orig_rt") } } },
  quote: { label: t("op_sample_quote"), data: { kind: "quote", author: A("Marina Alves", "@marinaalves", true), text: t("op_sample_text_quote"), stats, time: "2026-11-04T14:32:00-03:00", original: { author: A("Pedro Nunes", "@pedronunes_dev"), text: t("op_sample_text_orig_quote"), media: [MEDIA[0]] } } }
};
const sampleText = Object.values(SAMPLES).map((x) => x.data.text).join(" ");

// ===== TABS ===================================================================
$("tabs").onclick = (e) => {
  const t = e.target.dataset.tab; if (!t) return;
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tab === t));
  $("tab-styles").hidden = t !== "styles"; $("tab-platforms").hidden = t !== "platforms"; $("tab-defaults").hidden = t !== "defaults";
  if (t === "platforms") renderPlatforms(); else if (t === "defaults") renderDefaults(); else renderAll();
};
const openTab = (name) => $("tabs").querySelector(`[data-tab="${name}"]`).click();

// ===== STYLES =================================================================
function renderList() {
  const def = generalId();
  $("list").innerHTML = lib.all.map((s) => `
    <li data-id="${esc(s.id)}" aria-selected="${s.id === selId}">
      <span class="n">${esc(styleName(s))}</span>
      ${s.id === def ? `<span class="o-badge def">${esc(t("op_badge_default"))}</span>` : ""}
      ${s.builtin ? `<span class="o-badge">${esc(t("op_badge_builtin"))}</span>` : ""}
    </li>`).join("");
}

const fontOptions = () => `<optgroup label="${esc(t("op_font_group_system"))}">${Object.entries(GENERIC_LABELS).map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join("")}</optgroup>
  <optgroup label="${esc(t("op_font_group_google"))}">${CURATED.map((f) => `<option value="g:${f}">${f}</option>`).join("")}</optgroup>
  <option value="__custom">${esc(t("op_font_other"))}</option>`;

function buildForm() {
  const groups = [...new Set(FIELDS.map((f) => f.g))];
  const ctl = (f) => ({
    select: `<select id="f-${f.k}" data-k="${f.k}">${f.opts ? Object.entries(f.opts).map(([v, l]) => `<option value="${v}">${esc(t(l))}</option>`).join("") : ""}</select>`,
    range: `<input id="f-${f.k}" data-k="${f.k}" type="range" min="${f.min}" max="${f.max}"><output></output>`,
    color: `<input id="f-${f.k}" data-k="${f.k}" type="color">`,
    check: `<input id="f-${f.k}" data-k="${f.k}" type="checkbox">`,
    text: `<input id="f-${f.k}" data-k="${f.k}" type="text" maxlength="${f.max || 40}">`,
    font: `<div class="fontctl"><select id="f-${f.k}" data-k="${f.k}">${fontOptions()}</select><input type="text" data-k="${f.k}" data-fontname placeholder="${esc(t("op_font_placeholder"))}" maxlength="50" hidden></div>`,
    image: `<div class="imgctl"><input type="file" accept="image/*" data-img="${f.k}"><img class="thumb" hidden alt=""><button type="button" data-imgclear="${f.k}">${esc(t("op_remove_image"))}</button></div>`
  }[f.t]);
  // collapsible sections (<details>), all start collapsed
  $("form").innerHTML = groups.map((g) => `<details class="o-sec"><summary>${esc(t("gr_" + g))}</summary><div class="o-sec-body">${
    FIELDS.filter((f) => f.g === g && !f.hidden).map((f) => `<div class="o-field"><label for="f-${f.k}">${esc(t(f.label))}</label><div class="ctl">${ctl(f)}</div></div>`).join("")}</div></details>`).join("");
}
function fillForm() {
  const s = current(), ro = !isCustom(s);
  $("form").toggleAttribute("data-ro", ro);
  for (const f of FIELDS) {
    if (f.hidden) continue;
    const el = $(`f-${f.k}`), v = s[f.k];
    if (f.t === "check") el.checked = !!v;
    else if (f.t === "image") {
      const box = el ? null : document.querySelector(`[data-img="${f.k}"]`).closest(".imgctl");
      const th = box.querySelector(".thumb"); th.hidden = !v; if (v) th.src = v;
    } else if (f.t === "font") {
      const inp = el.parentElement.querySelector("[data-fontname]");
      if (v in GENERIC_LABELS || CURATED.includes(familyOf(v))) { el.value = v; inp.hidden = true; }
      else { el.value = "__custom"; inp.hidden = false; inp.value = familyOf(v); }
      inp.disabled = ro;
    } else el.value = v;
    if (el) el.disabled = ro;
    if (f.t === "range") el.nextElementSibling.textContent = v;
  }
  document.querySelectorAll("#form [data-img],#form [data-imgclear]").forEach((e) => (e.disabled = ro));
  $("name").value = styleName(s); $("name").disabled = ro;
  $("ro").hidden = !ro; $("del").hidden = ro;
  const isDef = s.id === generalId();
  $("setdef").disabled = isDef;
  $("setdef").textContent = isDef ? t("op_is_default") : t("op_set_default");
}

// --- preview (with Google Fonts inlined) --------------------------
let pvToken = 0;
async function renderPreview() {
  const s = current(), token = ++pvToken;
  $("pvstyle").textContent = baseCss + styleCss(s);
  $("pv").className = `shot s-${s.id}`;
  $("pv").innerHTML = shotInner(s, SAMPLES[sample].data);
  $("pv").style.zoom = Math.min(1, ($("pvwrap").parentElement.clientWidth || 600) / 600);
  $("seg").innerHTML = Object.entries(SAMPLES).map(([k, v]) => `<button data-s="${k}" aria-pressed="${k === sample}">${v.label}</button>`).join("");

  const used = [...fontsUsed(s)];
  $("fontstatus").textContent = used.length ? t("op_loading_fonts") : "";
  const r = await Promise.allSettled(used.map(([f, ws]) => loadFamily(f, [...ws], /[Ā-ɏ]/.test(sampleText))));
  if (token !== pvToken) return;
  $("pvstyle").textContent = r.map((x) => x.value || "").join("\n") + baseCss + styleCss(s);
  const bad = used.filter((_, i) => r[i].status === "rejected").map(([f]) => f);
  $("fontstatus").textContent = bad.length ? t("op_font_warn", bad.join(", ")) : "";
}
const renderAll = () => { renderList(); fillForm(); renderPreview(); };

// --- persistence -----------------------------------------------------------
let timer;
const persist = () => { clearTimeout(timer); timer = setTimeout(() => saveStyles(lib.custom), 250); };
const replaceCurrent = (next) => {
  lib.custom = lib.custom.map((s) => (s.id === next.id ? next : s));
  lib.all = lib.all.map((s) => (s.id === next.id ? next : s));
  persist();
};
function update(k, v) {
  const s = current(); if (!isCustom(s)) return;
  const next = normalizeStyle({ ...s, [k]: v }, DEFAULT);
  replaceCurrent(next);
  const f = FIELDS.find((x) => x.k === k);
  if (f?.t === "range") $(`f-${k}`).nextElementSibling.textContent = next[k];
  return next;
}

const onField = (e) => {
  const t = e.target, k = t.dataset.k; if (!k || t.type === "file") return;
  const f = FIELDS.find((x) => x.k === k); if (!f) return;
  let v;
  if (f.t === "check") v = t.checked;
  else if (f.t === "font") {
    const wrap = t.closest(".fontctl"), sel = wrap.querySelector("select"), inp = wrap.querySelector("input");
    if (t === sel) { if (sel.value === "__custom") { inp.hidden = false; inp.focus(); return; } inp.hidden = true; v = sel.value; }
    else { const n = inp.value.trim().replace(/\s+/g, " "); if (!/^[A-Za-z0-9 ]{1,50}$/.test(n)) return; v = "g:" + n; }
  } else v = t.value;
  update(k, v);
  if (f.t === "font" && t.matches("[data-fontname]")) { clearTimeout(onField.t); onField.t = setTimeout(renderPreview, 500); } else renderPreview();
};
$("form").addEventListener("input", onField);
$("form").addEventListener("change", async (e) => {
  const k = e.target.dataset.img; if (!k || !e.target.files[0]) return;
  try {
    const { url, ratio } = await shrinkImage(e.target.files[0]);
    update(k, url); update("wmImgRatio", ratio); if (current().wmMode === "none") update("wmMode", "image");
    fillForm(); renderPreview();
  } catch { alert(t("op_bad_image")); }
  e.target.value = "";
});
$("form").addEventListener("click", (e) => {
  const k = e.target.dataset.imgclear; if (!k) return;
  update(k, ""); fillForm(); renderPreview();
});

// shrinks the image (max 400px) and keeps it within the size the validator accepts
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file), sc = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  for (const [type, q] of [["image/png"], ["image/webp", 0.9], ["image/webp", 0.7]]) {
    const u = c.toDataURL(type, q); if (u.length <= 450000 && u.startsWith(`data:${type}`)) return { url: u, ratio: Math.max(5, Math.min(2000, Math.round((c.height / c.width) * 100))) };
  }
  throw new Error("grande demais");
}

// --- drag the watermark in the preview ----------------------------
$("pv").addEventListener("pointerdown", (e) => {
  const w = e.target.closest(".wm"); if (!w || !isCustom(current())) return;
  e.preventDefault(); w.setPointerCapture(e.pointerId);
  let x, y;
  const move = (ev) => {
    const r = $("pv").getBoundingClientRect();
    x = clamp(((ev.clientX - r.left) / r.width) * 100); y = clamp(((ev.clientY - r.top) / r.height) * 100);
    w.style.left = x + "%"; w.style.top = y + "%";
    $("f-wmX").value = x; $("f-wmX").nextElementSibling.textContent = x;
    $("f-wmY").value = y; $("f-wmY").nextElementSibling.textContent = y;
  };
  const up = () => { w.removeEventListener("pointermove", move); w.removeEventListener("pointerup", up); if (x !== undefined) { update("wmX", x); update("wmY", y); } };
  w.addEventListener("pointermove", move); w.addEventListener("pointerup", up);
});

// --- toolbar / list ----------------------------------------------------------
$("name").addEventListener("input", () => {
  const s = current(); if (!isCustom(s)) return;
  replaceCurrent({ ...s, name: $("name").value.slice(0, 40) || "Untitled" }); renderList();
});
$("list").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { selId = li.dataset.id; renderAll(); } });
$("seg").addEventListener("click", (e) => { if (e.target.dataset.s) { sample = e.target.dataset.s; renderPreview(); } });
$("new").onclick = async () => {
  const s = current();
  const copy = normalizeStyle({ ...s, id: newId(), name: t("op_copy_of", styleName(s)).slice(0, 40) }, DEFAULT);
  lib.custom.push(copy); lib.all.push(copy); selId = copy.id;
  await saveStyles(lib.custom); renderAll(); $("name").focus(); $("name").select();
};
$("setdef").onclick = async () => { lib.defaults["*"] = selId; await saveDefaults(lib.defaults); renderAll(); };
$("del").onclick = async () => {
  const s = current();
  if (!isCustom(s) || !confirm(t("op_confirm_delete_style", styleName(s)))) return;
  lib.custom = lib.custom.filter((x) => x.id !== s.id); lib.all = lib.all.filter((x) => x.id !== s.id);
  for (const k of Object.keys(lib.defaults)) if (lib.defaults[k] === s.id) delete lib.defaults[k];
  await Promise.all([saveStyles(lib.custom), saveDefaults(lib.defaults)]);
  selId = generalId(); renderAll();
};
$("export").onclick = () => {
  const blob = new Blob([JSON.stringify({ app: "postframe", styles: lib.custom, platforms: lib.userPlatforms }, null, 2)], { type: "application/json" });
  Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "postframe.json" }).click();
};
$("import").onclick = () => $("file").click();
$("file").onchange = async () => {
  try {
    const data = JSON.parse(await $("file").files[0].text());
    const plats = (Array.isArray(data.platforms) ? data.platforms : []).slice(0, 30).map((r) => normalizePlatform({ ...r, id: undefined })).filter(Boolean);
    const list = (Array.isArray(data) ? data : data.styles || []).slice(0, 50);
    const added = list.map((r) => normalizeStyle({ ...r, id: newId() }, DEFAULT)).filter(Boolean);
    if (!added.length && !plats.length) throw new Error("vazio");
    lib.userPlatforms.push(...plats); lib.platforms.push(...plats);
    lib.custom.push(...added); lib.all.push(...added);
    if (added.length) selId = added[0].id;
    await Promise.all([savePlatforms(lib.userPlatforms), saveStyles(lib.custom)]);
    renderAll();
  } catch { alert(t("op_bad_file")); }
  $("file").value = "";
};
addEventListener("resize", () => !$("tab-styles").hidden && renderPreview());

// ===== PLATFORMS ===============================================================
const SEL_FIELDS = ["container", "avatar", "name", "handle", "text", "time", "media", "body", "repost", "repostStrip"];   // labels: sf_<key>
const curPlat = () => lib.platforms.find((p) => p.id === platSel) || lib.platforms[0];

function renderPlatforms() {
  $("plist").innerHTML = lib.platforms.map((p) => `<li data-id="${esc(p.id)}" aria-selected="${p.id === platSel}"><span class="n">${esc(p.name)}</span>${p.beta ? `<span class="o-badge">${esc(t("op_badge_beta"))}</span>` : ""}${p.builtin ? `<span class="o-badge">${esc(t("op_badge_builtin"))}</span>` : ""}</li>`).join("");
  const p = curPlat(), ro = !!p.builtin;
  $("pro").hidden = !ro; $("pdel").hidden = ro;
  $("pdup").hidden = !ro || !!p.extractor;      // X has its own reader; the other built-ins can be duplicated
  const sel = p.sel || {}, stats = sel.stats || [];
  const row = (label, id, val, ph = "") => `<div class="o-field"><label for="${id}">${label}</label><div class="ctl"><input type="text" id="${id}" value="${esc(val || "")}" placeholder="${esc(ph)}" ${ro ? "disabled" : ""}></div></div>`;
  $("pform").className = "o-form o-plat";
  $("pform").innerHTML = `<fieldset><legend>${esc(t("op_plat_legend"))}</legend>
      ${row(esc(t("op_plat_name")), "p-name", p.name)}
      ${row(esc(t("op_plat_hosts")), "p-hosts", p.hosts.join(", "), "reddit.com, bsky.app")}
      <p class="o-hint" id="p-warn" hidden></p>
    </fieldset>
    ${p.extractor ? `<p class="o-hint">${esc(t("op_extractor_note"))}</p>` : `<fieldset><legend>${esc(t("op_selectors_legend"))}</legend>
      ${SEL_FIELDS.map((k) => row(esc(t("sf_" + k)), `p-${k}`, sel[k], k === "container" ? t("sf_container_ph") : t("sf_relative_ph"))).join("")}
      ${[0, 1, 2].map((i) => `<div class="o-statrow"><select id="p-si${i}" ${ro ? "disabled" : ""}>${Object.entries(ICON_KEYS).map(([v, l]) => `<option value="${v}" ${stats[i]?.icon === v ? "selected" : ""}>${esc(t(l))}</option>`).join("")}</select><input type="text" id="p-ss${i}" ${ro ? "disabled" : ""} value="${esc(stats[i]?.sel || "")}" placeholder="${esc(t("op_stat_ph", i + 1))}"></div>`).join("")}
    </fieldset>`}`;
}
let ptimer;
$("pform").addEventListener("input", () => {
  const p = curPlat(); if (p.builtin) return;
  const v = (id) => $(id)?.value || "";
  const next = normalizePlatform({
    id: p.id, name: v("p-name"), hosts: v("p-hosts").split(/[\s,]+/),
    sel: { ...Object.fromEntries(SEL_FIELDS.map((k) => [k, v(`p-${k}`)])), stats: [0, 1, 2].map((i) => ({ icon: v(`p-si${i}`), sel: v(`p-ss${i}`) })) }
  });
  next.id = p.id;
  const taken = shadowedBuiltin(next);        // a built-in site cannot be set up again: warn and do not save
  $("p-warn").hidden = !taken;
  if (taken) { $("p-warn").textContent = t("op_plat_taken", [next.hosts.find((h) => shadowedBuiltin({ hosts: [h] })) || next.hosts[0], taken.name]); return; }
  lib.userPlatforms = lib.userPlatforms.map((x) => (x.id === p.id ? next : x));
  lib.platforms = lib.platforms.map((x) => (x.id === p.id ? next : x));
  $("plist").querySelector(`[aria-selected=true] .n`).textContent = next.name;
  clearTimeout(ptimer); ptimer = setTimeout(() => savePlatforms(lib.userPlatforms), 300);
});
$("plist").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { platSel = li.dataset.id; renderPlatforms(); } });
$("pnew").onclick = async () => {
  const p = normalizePlatform({ name: t("op_new_platform_name"), hosts: [], sel: {} });
  lib.userPlatforms.push(p); lib.platforms.push(p); platSel = p.id;
  await savePlatforms(lib.userPlatforms); renderPlatforms(); $("p-name").select();
};
$("pdup").onclick = async () => {
  const p = curPlat();
  const copy = normalizePlatform({ ...p, id: undefined, name: t("op_copy_of", p.name).slice(0, 40) });
  lib.userPlatforms.push(copy); lib.platforms.push(copy); platSel = copy.id;
  await savePlatforms(lib.userPlatforms); renderPlatforms(); $("p-name").select();
};
$("pdel").onclick = async () => {
  const p = curPlat();
  if (p.builtin || !confirm(t("op_confirm_delete_platform", p.name))) return;
  lib.userPlatforms = lib.userPlatforms.filter((x) => x.id !== p.id); lib.platforms = lib.platforms.filter((x) => x.id !== p.id);
  delete lib.defaults[p.id];
  await Promise.all([savePlatforms(lib.userPlatforms), saveDefaults(lib.defaults)]);
  platSel = "x"; renderPlatforms();
};

const setFold = (open) => document.querySelectorAll("#form details").forEach((d) => (d.open = open));
$("foldAll").onclick = () => setFold(false);
$("unfoldAll").onclick = () => setFold(true);


// ===== DEFAULTS (the style used on each platform) =====================================
// Row 1 is the general "Default" (no "Default" option: it feeds all the others). Then one row per platform,
// whose dropdown starts on "Default". Every dropdown ends with "Create new style...".
function renderDefaults() {
  const generalId = lib.all.some((x) => x.id === lib.defaults["*"]) ? lib.defaults["*"] : lib.all[0].id;
  const generalName = styleName(lib.all.find((x) => x.id === generalId));
  const rows = [{ id: "*", name: t("op_df_default") }, ...lib.platforms.map((p) => ({ id: p.id, name: p.name }))];
  $("deflist").innerHTML = rows.map((r) => {
    const list = lib.all;
    const cur = r.id === "*" ? generalId : lib.defaults[r.id], has = list.some((x) => x.id === cur);
    return `<li class="${r.id === "*" ? "o-df-general" : ""}"><label for="df-${esc(r.id)}">${esc(r.name)}</label>
      <div class="o-df-ctl"><select id="df-${esc(r.id)}" data-def="${esc(r.id)}">
        ${r.id === "*" ? "" : `<option value="" ${has ? "" : "selected"}>${esc(t("op_df_default"))}</option>`}
        ${list.map((x) => `<option value="${esc(x.id)}" ${has && cur === x.id ? "selected" : ""}>${esc(styleName(x))}</option>`).join("")}
        <option value="__new">${esc(t("op_df_create"))}</option></select>
        ${r.id !== "*" && !has ? `<span class="o-df-hint">→ ${esc(generalName)}</span>` : ""}</div></li>`;
  }).join("");
}

// "Create new style...": a copy of the style the row currently resolves to, set as that row's choice, opened for editing.
async function createStyleFor(rowId) {
  const base = lib.all.find((x) => x.id === (rowId === "*" ? (lib.defaults["*"] || lib.all[0].id) : defaultFor(lib.all, lib.defaults, rowId))) || lib.all[0];
  const copy = normalizeStyle({ ...base, id: newId(), name: t("op_copy_of", styleName(base)).slice(0, 40) }, DEFAULT);
  lib.custom.push(copy); lib.all.push(copy); lib.defaults[rowId] = copy.id;
  await Promise.all([saveStyles(lib.custom), saveDefaults(lib.defaults)]);
  selId = copy.id; openTab("styles"); $("name").focus(); $("name").select();
}

$("deflist").addEventListener("change", async (e) => {
  const row = e.target.dataset.def; if (row === undefined) return;
  if (e.target.value === "__new") return createStyleFor(row);
  e.target.value ? (lib.defaults[row] = e.target.value) : delete lib.defaults[row];
  await saveDefaults(lib.defaults); renderDefaults();
});

// ===== LANGUAGE ==============================================================
// First use: the picker below blocks the page until a language is chosen. Later it lives in the header.
const chooseLang = async (code) => { await setLang(code); location.reload(); };
$("lang").innerHTML = LANGS.map(([c, name]) => `<option value="${c}">${esc(name)}</option>`).join("");
$("lang").value = getLang();
$("lang").onchange = () => chooseLang($("lang").value);
if (!savedLang) {
  $("welcome-list").innerHTML = LANGS.map(([c, name]) => `<button data-lang="${c}">${esc(name)}</button>`).join("");
  $("welcome-list").onclick = (e) => { if (e.target.dataset.lang) chooseLang(e.target.dataset.lang); };
  $("welcome").hidden = false;
}

// ===== THEME =================================================================
$("theme").innerHTML = ["light", "dark", "system"].map((v) => `<option value="${v}">${esc(t(`op_theme_${v}`))}</option>`).join("");
$("theme").value = getTheme();
$("theme").onchange = () => setTheme($("theme").value);

buildForm();
renderAll();
