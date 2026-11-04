import { FIELDS, DEFAULT, newId, normalizeStyle, styleCss, shotInner } from "../src/shared/styles.mjs";
import { baseCss, placeholderAvatar, esc } from "../src/shared/template.mjs";
import { GENERIC_LABELS, CURATED, FONT_RE, isGoogle, familyOf, fontsUsed, loadFamily } from "../src/shared/fonts.mjs";
import { ICON_KEYS, normalizePlatform } from "../src/shared/platforms.mjs";
import { getAll, stylesFor, defaultFor, saveStyles, savePlatforms, saveDefaults } from "../src/shared/store.mjs";

const $ = (id) => document.getElementById(id);
const clamp = (n) => Math.min(100, Math.max(0, Math.round(n)));

let lib = await getAll();           // { all, custom, platforms, userPlatforms, defaults }
let filter = "*", selId = "1", sample = "tweet", platSel = "x";
const platName = (id) => (id === "*" ? "Todas as plataformas" : lib.platforms.find((p) => p.id === id)?.name || "?");
const visible = () => (filter === "*" ? lib.all : stylesFor(lib.all, filter));
const defaultInFilter = () => (filter === "*" ? (lib.all.some((s) => s.id === lib.defaults["*"]) ? lib.defaults["*"] : "1") : defaultFor(lib.all, lib.defaults, filter));
selId = defaultInFilter();
const current = () => lib.all.find((s) => s.id === selId) || lib.all[0];
const isCustom = (s) => !s.builtin;

// --- exemplos ---------------------------------------------------------------
const A = (name, handle, verified = false) => ({ name, handle, verified, avatar: placeholderAvatar(name, handle) });
const stats = [{ icon: "reply", n: "128" }, { icon: "retweet", n: "1,4 mil" }, { icon: "like", n: "9,8 mil" }];
// imagens de exemplo geradas na hora (gradientes)
const ph = (a, b) => { const c = Object.assign(document.createElement("canvas"), { width: 800, height: 600 }), x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 800, 600); g.addColorStop(0, a); g.addColorStop(1, b); x.fillStyle = g; x.fillRect(0, 0, 800, 600); x.fillStyle = "rgba(255,255,255,.35)"; x.beginPath(); x.arc(560, 200, 110, 0, 7); x.fill(); x.fillRect(80, 380, 420, 120); return c.toDataURL("image/jpeg", 0.8); };
const MEDIA = [ph("#0ea5e9", "#6366f1"), ph("#f97316", "#db2777"), ph("#10b981", "#0f766e"), ph("#eab308", "#ef4444")];
const SAMPLES = {
  tweet: { label: "Post", data: { kind: "tweet", author: A("Marina Alves", "@marinaalves", true), text: "Passei o fim de semana reescrevendo um sistema legado e descobri que 60% do código nunca era executado. 🧹\n\n#dev #refatoração", stats, time: "2026-11-04T14:32:00-03:00" } },
  media: { label: "Com imagens", data: { kind: "tweet", author: A("Marina Alves", "@marinaalves", true), text: "Fotos do fim de semana. 📸", media: MEDIA.slice(0, 3), stats, time: "2026-11-04T14:32:00-03:00" } },
  repost: { label: "Retweet", data: { kind: "repost", author: A("Lucas Torres", "@lucastorres"), text: "", stats, time: "2026-11-04T09:05:00-03:00", original: { author: A("Pedro Nunes", "@pedronunes_dev"), text: "Dica de ouro: antes de otimizar, meça. 📉 #performance" } } },
  quote: { label: "Citação", data: { kind: "quote", author: A("Marina Alves", "@marinaalves", true), text: "Concordo 100%.", stats, time: "2026-11-04T14:32:00-03:00", original: { author: A("Pedro Nunes", "@pedronunes_dev"), text: "Meça antes de otimizar. #performance", media: [MEDIA[0]] } } }
};
const sampleText = Object.values(SAMPLES).map((x) => x.data.text).join(" ");

// ===== ABAS ==================================================================
$("tabs").onclick = (e) => {
  const t = e.target.dataset.tab; if (!t) return;
  document.querySelectorAll("#tabs button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.tab === t));
  $("tab-styles").hidden = t !== "styles"; $("tab-platforms").hidden = t !== "platforms";
  if (t === "platforms") renderPlatforms(); else renderAll();
};

// ===== ESTILOS ===============================================================
function renderFilters() {
  const opts = [["*", "Todas as plataformas"], ...lib.platforms.map((p) => [p.id, p.name])];
  $("filter").innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
  $("filter").value = filter;
  $("platsel").innerHTML = opts.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join("");
}
function renderList() {
  const def = defaultInFilter();
  $("list").innerHTML = visible().map((s) => `
    <li data-id="${esc(s.id)}" aria-selected="${s.id === selId}">
      <span class="n">${esc(s.name)}</span>
      ${s.id === def ? '<span class="o-badge def">padrão</span>' : ""}
      ${filter === "*" && s.platform !== "*" ? `<span class="o-badge">${esc(platName(s.platform))}</span>` : ""}
      ${s.builtin ? '<span class="o-badge">nativo</span>' : ""}
    </li>`).join("");
}

const fontOptions = () => `<optgroup label="Sistema">${Object.entries(GENERIC_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join("")}</optgroup>
  <optgroup label="Google Fonts">${CURATED.map((f) => `<option value="g:${f}">${f}</option>`).join("")}</optgroup>
  <option value="__custom">Outra do Google Fonts…</option>`;

function buildForm() {
  const groups = [...new Set(FIELDS.map((f) => f.g))];
  const ctl = (f) => ({
    select: `<select id="f-${f.k}" data-k="${f.k}">${f.opts ? Object.entries(f.opts).map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join("") : ""}</select>`,
    range: `<input id="f-${f.k}" data-k="${f.k}" type="range" min="${f.min}" max="${f.max}"><output></output>`,
    color: `<input id="f-${f.k}" data-k="${f.k}" type="color">`,
    check: `<input id="f-${f.k}" data-k="${f.k}" type="checkbox">`,
    text: `<input id="f-${f.k}" data-k="${f.k}" type="text" maxlength="${f.max || 40}">`,
    font: `<div class="fontctl"><select id="f-${f.k}" data-k="${f.k}">${fontOptions()}</select><input type="text" data-k="${f.k}" data-fontname placeholder="Nome exato no Google Fonts" maxlength="50" hidden></div>`,
    image: `<div class="imgctl"><input type="file" accept="image/*" data-img="${f.k}"><img class="thumb" hidden alt=""><button type="button" data-imgclear="${f.k}">Remover imagem</button></div>`
  }[f.t]);
  // seções recolhíveis (<details>), todas começam fechadas
  $("form").innerHTML = groups.map((g) => `<details class="o-sec"><summary>${esc(g)}</summary><div class="o-sec-body">${
    FIELDS.filter((f) => f.g === g && !f.hidden).map((f) => `<div class="o-field"><label for="f-${f.k}">${esc(f.label)}</label><div class="ctl">${ctl(f)}</div></div>`).join("")}</div></details>`).join("");
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
  $("name").value = s.name; $("name").disabled = ro;
  $("platsel").value = s.platform; $("platsel").disabled = ro;
  $("ro").hidden = !ro; $("del").hidden = ro;
  const isDef = s.id === defaultInFilter();
  $("setdef").disabled = isDef;
  $("setdef").textContent = isDef ? "★ Estilo padrão" : `Definir como padrão${filter === "*" ? "" : " no " + platName(filter)}`;
}

// --- pré-visualização (com Google Fonts embutidas) --------------------------
let pvToken = 0;
async function renderPreview() {
  const s = current(), token = ++pvToken;
  $("pvstyle").textContent = baseCss + styleCss(s);
  $("pv").className = `shot s-${s.id}`;
  $("pv").innerHTML = shotInner(s, SAMPLES[sample].data);
  $("pv").style.zoom = Math.min(1, ($("pvwrap").parentElement.clientWidth || 600) / 600);
  $("seg").innerHTML = Object.entries(SAMPLES).map(([k, v]) => `<button data-s="${k}" aria-pressed="${k === sample}">${v.label}</button>`).join("");

  const used = [...fontsUsed(s)];
  $("fontstatus").textContent = used.length ? "Carregando fontes…" : "";
  const r = await Promise.allSettled(used.map(([f, ws]) => loadFamily(f, [...ws], /[Ā-ɏ]/.test(sampleText))));
  if (token !== pvToken) return;
  $("pvstyle").textContent = r.map((x) => x.value || "").join("\n") + baseCss + styleCss(s);
  const bad = used.filter((_, i) => r[i].status === "rejected").map(([f]) => f);
  $("fontstatus").textContent = bad.length ? `⚠ Não foi possível carregar: ${bad.join(", ")} (confira o nome ou a conexão). Será usada a fonte padrão.` : "";
}
const renderAll = () => { renderFilters(); renderList(); fillForm(); renderPreview(); };

// --- persistência -----------------------------------------------------------
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
  } catch { alert("Não foi possível usar essa imagem (tente um PNG, JPG ou WebP menor)."); }
  e.target.value = "";
});
$("form").addEventListener("click", (e) => {
  const k = e.target.dataset.imgclear; if (!k) return;
  update(k, ""); fillForm(); renderPreview();
});

// reduz a imagem (máx. 400px) e garante ficar dentro do limite aceito pelo validador
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file), sc = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
  const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) });
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  for (const [type, q] of [["image/png"], ["image/webp", 0.9], ["image/webp", 0.7]]) {
    const u = c.toDataURL(type, q); if (u.length <= 450000 && u.startsWith(`data:${type}`)) return { url: u, ratio: Math.max(5, Math.min(2000, Math.round((c.height / c.width) * 100))) };
  }
  throw new Error("grande demais");
}

// --- arrastar a marca d'água na pré-visualização ----------------------------
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

// --- barra / lista ----------------------------------------------------------
$("name").addEventListener("input", () => {
  const s = current(); if (!isCustom(s)) return;
  replaceCurrent({ ...s, name: $("name").value.slice(0, 40) || "Sem nome" }); renderList();
});
$("platsel").onchange = () => {
  const s = current(); if (!isCustom(s)) return;
  replaceCurrent({ ...s, platform: $("platsel").value });
  filter = $("platsel").value;           // mantém o estilo visível na lista
  renderAll();
};
$("filter").onchange = () => { filter = $("filter").value; if (!visible().some((s) => s.id === selId)) selId = defaultInFilter(); renderAll(); };
$("list").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { selId = li.dataset.id; renderAll(); } });
$("seg").addEventListener("click", (e) => { if (e.target.dataset.s) { sample = e.target.dataset.s; renderPreview(); } });
$("new").onclick = async () => {
  const s = current();
  const copy = normalizeStyle({ ...s, id: newId(), name: `Cópia de ${s.name}`.slice(0, 40) }, DEFAULT);
  if (copy.platform === "*" && filter !== "*") copy.platform = filter;
  lib.custom.push(copy); lib.all.push(copy); selId = copy.id;
  await saveStyles(lib.custom); renderAll(); $("name").focus(); $("name").select();
};
$("setdef").onclick = async () => { lib.defaults[filter] = selId; await saveDefaults(lib.defaults); renderAll(); };
$("del").onclick = async () => {
  const s = current();
  if (!isCustom(s) || !confirm(`Excluir o estilo “${s.name}”?`)) return;
  lib.custom = lib.custom.filter((x) => x.id !== s.id); lib.all = lib.all.filter((x) => x.id !== s.id);
  for (const k of Object.keys(lib.defaults)) if (lib.defaults[k] === s.id) delete lib.defaults[k];
  await Promise.all([saveStyles(lib.custom), saveDefaults(lib.defaults)]);
  selId = defaultInFilter(); renderAll();
};
$("export").onclick = () => {
  const blob = new Blob([JSON.stringify({ app: "postframe", styles: lib.custom, platforms: lib.userPlatforms }, null, 2)], { type: "application/json" });
  Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: "postframe.json" }).click();
};
$("import").onclick = () => $("file").click();
$("file").onchange = async () => {
  try {
    const data = JSON.parse(await $("file").files[0].text());
    const idMap = {}, plats = (Array.isArray(data.platforms) ? data.platforms : []).slice(0, 30)
      .map((r) => { const p = normalizePlatform({ ...r, id: undefined }); if (p && r?.id) idMap[r.id] = p.id; return p; }).filter(Boolean);
    const list = (Array.isArray(data) ? data : data.styles || []).slice(0, 50);
    const added = list.map((r) => normalizeStyle({ ...r, id: newId(), platform: r?.platform === "*" || r?.platform === "x" ? r.platform : idMap[r?.platform] || "*" }, DEFAULT)).filter(Boolean);
    if (!added.length && !plats.length) throw new Error("vazio");
    lib.userPlatforms.push(...plats); lib.platforms.push(...plats);
    lib.custom.push(...added); lib.all.push(...added);
    if (added.length) selId = added[0].id;
    await Promise.all([savePlatforms(lib.userPlatforms), saveStyles(lib.custom)]);
    renderAll();
  } catch { alert("Arquivo inválido. Use um JSON exportado por esta extensão."); }
  $("file").value = "";
};
addEventListener("resize", () => !$("tab-styles").hidden && renderPreview());

// ===== PLATAFORMAS ===========================================================
const SEL_FIELDS = [["container", "Container do post"], ["avatar", "Foto do perfil"], ["name", "Nome"], ["handle", "@usuário"], ["text", "Texto"], ["time", "Hora"], ["media", "Imagens do post"]];
const curPlat = () => lib.platforms.find((p) => p.id === platSel) || lib.platforms[0];

function renderPlatforms() {
  $("plist").innerHTML = lib.platforms.map((p) => `<li data-id="${esc(p.id)}" aria-selected="${p.id === platSel}"><span class="n">${esc(p.name)}</span>${p.builtin ? '<span class="o-badge">nativo</span>' : ""}</li>`).join("");
  const p = curPlat(), ro = !!p.builtin;
  $("pro").hidden = !ro; $("pdel").hidden = ro;
  const sel = p.sel || {}, stats = sel.stats || [];
  const row = (label, id, val, ph = "") => `<div class="o-field"><label for="${id}">${label}</label><div class="ctl"><input type="text" id="${id}" value="${esc(val || "")}" placeholder="${esc(ph)}" ${ro ? "disabled" : ""}></div></div>`;
  $("pform").className = "o-form o-plat";
  $("pform").innerHTML = `<fieldset><legend>Plataforma</legend>
      ${row("Nome", "p-name", p.name)}
      ${row("Sites (domínios)", "p-hosts", p.hosts.join(", "), "reddit.com, bsky.app")}
    </fieldset>
    ${ro ? '<p class="o-hint">O X lê os posts com um extrator embutido (não usa seletores).</p>' : `<fieldset><legend>Seletores CSS</legend>
      ${SEL_FIELDS.map(([k, l]) => row(l, `p-${k}`, sel[k], k === "container" ? "ex.: article, shreddit-post" : "relativo ao container")).join("")}
      ${[0, 1, 2].map((i) => `<div class="o-statrow"><select id="p-si${i}">${Object.entries(ICON_KEYS).map(([v, l]) => `<option value="${v}" ${stats[i]?.icon === v ? "selected" : ""}>${l}</option>`).join("")}</select><input type="text" id="p-ss${i}" value="${esc(stats[i]?.sel || "")}" placeholder="seletor da contagem ${i + 1} (opcional)"></div>`).join("")}
    </fieldset>`}`;
}
let ptimer;
$("pform").addEventListener("input", () => {
  const p = curPlat(); if (p.builtin) return;
  const v = (id) => $(id)?.value || "";
  const next = normalizePlatform({
    id: p.id, name: v("p-name"), hosts: v("p-hosts").split(/[\s,]+/),
    sel: { ...Object.fromEntries(SEL_FIELDS.map(([k]) => [k, v(`p-${k}`)])), stats: [0, 1, 2].map((i) => ({ icon: v(`p-si${i}`), sel: v(`p-ss${i}`) })) }
  });
  next.id = p.id;
  lib.userPlatforms = lib.userPlatforms.map((x) => (x.id === p.id ? next : x));
  lib.platforms = lib.platforms.map((x) => (x.id === p.id ? next : x));
  $("plist").querySelector(`[aria-selected=true] .n`).textContent = next.name;
  clearTimeout(ptimer); ptimer = setTimeout(() => savePlatforms(lib.userPlatforms), 300);
});
$("plist").addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { platSel = li.dataset.id; renderPlatforms(); } });
$("pnew").onclick = async () => {
  const p = normalizePlatform({ name: "Nova plataforma", hosts: [], sel: {} });
  lib.userPlatforms.push(p); lib.platforms.push(p); platSel = p.id;
  await savePlatforms(lib.userPlatforms); renderPlatforms(); $("p-name").select();
};
$("pdel").onclick = async () => {
  const p = curPlat();
  if (p.builtin || !confirm(`Excluir a plataforma “${p.name}”? Seus estilos passam a valer para todas as plataformas.`)) return;
  lib.userPlatforms = lib.userPlatforms.filter((x) => x.id !== p.id); lib.platforms = lib.platforms.filter((x) => x.id !== p.id);
  lib.custom = lib.custom.map((s) => (s.platform === p.id ? { ...s, platform: "*" } : s));
  lib.all = [...lib.all.filter((s) => s.builtin), ...lib.custom];
  delete lib.defaults[p.id];
  await Promise.all([savePlatforms(lib.userPlatforms), saveStyles(lib.custom), saveDefaults(lib.defaults)]);
  platSel = "x"; if (filter === p.id) filter = "*"; renderPlatforms();
};

const setFold = (open) => document.querySelectorAll("#form details").forEach((d) => (d.open = open));
$("foldAll").onclick = () => setFold(false);
$("unfoldAll").onclick = () => setFold(true);

buildForm();
renderAll();
