// Injected when the extension icon is clicked (activeTab + scripting).
// Shadow DOM panel: capture posts of this site's platform or set up its selectors.
(() => {
  if (window.__spOverlay) { window.__spOverlay.toggle(); return; }

  // Texts come from the background (this script cannot import modules). Keys are shown until they arrive.
  let M = {};
  const t = (key, subs) => { let m = M[key] ?? key; [].concat(subs ?? []).forEach((v, i) => { m = m.split("$" + (i + 1)).join(String(v)); }); return m; };

  const STAT_ICONS = { like: "icon_like", upvote: "icon_upvote", reply: "icon_reply", comment: "icon_comment", retweet: "icon_retweet", share: "icon_share", view: "icon_view" };   // i18n keys
  const STEPS = [
    { key: "name", label: "ov_step_name", req: true },
    { key: "handle", label: "ov_step_handle" },
    { key: "avatar", label: "ov_step_avatar" },
    { key: "text", label: "ov_step_text", req: true },
    { key: "media", label: "ov_step_media" },
    { key: "time", label: "ov_step_time" },
    { key: "stat0", label: "ov_step_stat0", stat: true },
    { key: "stat1", label: "ov_step_stat1", stat: true },
    { key: "stat2", label: "ov_step_stat2", stat: true }
  ];
  const FIRST_STAT = STEPS.findIndex((x) => x.stat);
  const iconFor = (i) => (i >= FIRST_STAT ? ['like', 'comment', 'share'][i - FIRST_STAT] : null);
  const GENERIC_BARE = new Set(["article", "li", "tr", "blockquote"]);
  const ATTRS = ["data-testid", "data-test", "data-test-id", "data-qa", "data-click-id", "data-e2e", "data-slot", "itemprop", "slot", "name"];

  const host = document.createElement("div");
  host.id = "sp-overlay-host";
  host.style.cssText = "all:initial;position:fixed;inset:0;z-index:2147483647;pointer-events:none";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    .hl{position:fixed;border:2px solid #b4472b;background:rgba(180,71,43,.14);border-radius:4px;pointer-events:none;box-sizing:border-box}
    .hl.sel{border-style:dashed;background:rgba(180,71,43,.08)}
    .panel{pointer-events:auto;position:fixed;top:12px;right:12px;width:320px;max-height:calc(100vh - 24px);overflow:auto;background:#f6f0e4;color:#1f1a14;border:1px solid #cfc2a8;border-radius:12px;padding:14px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 12px 40px rgba(31,26,20,.18)}
    h3{margin:0 0 4px;font-size:15px;font-family:'Iowan Old Style','Palatino Linotype',Palatino,Georgia,'Noto Serif','DejaVu Serif',serif}.sub{color:#7a6f60;margin:0 0 10px}
    button,select,input{font:inherit;color:#1f1a14;background:#efe6d3;border:1px solid #cfc2a8;border-radius:8px;padding:6px 10px;box-sizing:border-box}
    button{cursor:pointer}button:hover{background:#e5dac3}.pri{background:#b4472b;border-color:#b4472b;color:#fffaf0}
    .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.col{display:flex;flex-direction:column;gap:6px}
    input{width:100%}select{width:100%}
    ul{margin:8px 0 0;padding:0;list-style:none;color:#5c5143}li{margin:3px 0;word-break:break-word}li b{color:#1f1a14}.ok{color:#2f7a4a}.warn{color:#8a5a00}
  </style><div class="hl" hidden></div><div class="hl sel" id="selhl" hidden></div><div class="panel"></div>`;
  document.documentElement.appendChild(host);
  const hl = root.querySelector(".hl"), selhl = root.getElementById("selhl"), panel = root.querySelector(".panel");

  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) k === "class" ? (e.className = v) : k.startsWith("on") ? e.addEventListener(k.slice(2), v) : e[k] = v;
    kids.flat().forEach((c) => c != null && e.append(c));
    return e;
  };

  // ---------- state ----------
  let platform = null;                     // { id, name, hosts, sel, builtin?, extractor? }  (extractor "x" = X's own reader)
  let mode = "menu", step = 0, draft = null, cand = null, picking = null, containerEl = null;
  let lastPick = null, lastError = null;     // the last captured post and its error, for the diagnostics button
  const hostname = location.hostname.replace(/^www\./, "");
  const matchHost = (hosts) => hosts.some((x) => hostname === x || hostname.endsWith("." + x));

  // The background resolves it by host: the user's configuration wins over the built-in one.
  async function loadPlatform() {
    try { return (await chrome.runtime.sendMessage({ type: "sp:getPlatform", hostname })) || null; } catch { return null; }
  }

  // ---------- selectors ----------
  const stable = (c) => /^[a-z][a-z-]{2,29}$/.test(c) && !/^(css|sc|jsx|r)-/.test(c);
  function segs(el) {
    const t = el.localName, out = [];
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v && v.length <= 60 && !/\d{4,}/.test(v)) out.push(`${t}[${a}="${v.replace(/["\\]/g, "")}"]`); }
    if (t.includes("-")) out.push(t);
    const role = el.getAttribute("role"); if (role) out.push(`${t}[role="${role.replace(/["\\]/g, "")}"]`);
    const cls = [...el.classList].filter(stable).slice(0, 2);
    if (cls.length) { out.push(`${t}.${cls.map(CSS.escape).join(".")}`); if (cls.length > 1) out.push(`${t}.${CSS.escape(cls[0])}`); }
    out.push(t);
    return [...new Set(out)];
  }
  const qa = (scope, sel) => { try { return scope.querySelectorAll(sel); } catch { return []; } };
  const isUnique = (sel, el, scope) => { const m = qa(scope, sel); return m.length === 1 && m[0] === el; };
  function fieldSelector(el, scope) {
    const own = segs(el);
    for (const s of own) if (isUnique(s, el, scope)) return s;
    let anc = el.parentElement, d = 0;
    while (anc && anc !== scope && d < 5) {
      for (const a of segs(anc)) for (const s of own) if (isUnique(`${a} ${s}`, el, scope)) return `${a} ${s}`;
      anc = anc.parentElement; d++;
    }
    const path = []; let cur = el;
    while (cur && cur !== scope) { path.unshift(`${cur.localName}:nth-child(${[...cur.parentElement.children].indexOf(cur) + 1})`); cur = cur.parentElement; }
    return ":scope > " + path.join(" > ");
  }
  function mediaSelector(el, scope) {   // may match several images of the same post
    const ok = (sel) => { const m = qa(scope, sel); return [...m].includes(el) && m.length <= 8; };
    const good = (sel) => /[[.]/.test(sel) || sel.includes("-");
    for (const sel of segs(el)) if (good(sel) && ok(sel)) return sel;
    let anc = el.parentElement, d = 0;
    while (anc && anc !== scope && d < 5) {
      for (const a of segs(anc)) if (good(a)) for (const sel of segs(el)) if (ok(`${a} ${sel}`)) return `${a} ${sel}`;
      anc = anc.parentElement; d++;
    }
    return fieldSelector(el, scope);
  }
  function containerSelector(el) {
    const ok = (s) => { const m = qa(document, s); return [...m].includes(el) && m.length <= 300; };
    const good = (s) => /[[.]/.test(s) || GENERIC_BARE.has(s) || s.includes("-");
    for (const s of segs(el)) if (good(s) && ok(s)) return s;
    let anc = el.parentElement, d = 0;
    while (anc && anc !== document.body && d < 3) {
      for (const a of segs(anc)) for (const s of segs(el)) if (good(a) && ok(`${a} > ${s}`)) return `${a} > ${s}`;
      anc = anc.parentElement; d++;
    }
    const path = []; let cur = el;
    while (cur && cur !== document.body) { path.unshift(`${cur.localName}:nth-child(${[...cur.parentElement.children].indexOf(cur) + 1})`); cur = cur.parentElement; }
    return "body > " + path.join(" > ");
  }

  // ---------- reading values ----------
  const norm = (s) => (s || "").replace(/\s+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const txt = (el) => norm(el?.innerText ?? el?.textContent);
  const countOf = (el) => { const t = txt(el); const m = t.match(/\d[\d.,]*\s*(mil|mi|k|m|b)?\b/i); return m ? m[0].trim() : "0"; };
  const avatarUrl = (el) => {
    if (!el) return "";
    const img = el.tagName === "IMG" ? el : el.querySelector("img");
    if (img?.src) return img.currentSrc || img.src;
    const bg = getComputedStyle(el).backgroundImage.match(/url\("?(.*?)"?\)/);
    return bg ? bg[1] : "";
  };
  const timeOf = (el) => el ? (el.getAttribute?.("datetime") || el.querySelector?.("[datetime]")?.getAttribute("datetime") || txt(el)) : "";
  async function toDataUrl(url) {
    if (!url || url.startsWith("data:")) return url || "";
    try {
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 4000);
      const blob = await (await fetch(url, { credentials: "omit", signal: ctl.signal })).blob();
      if (!blob.type.startsWith("image/")) return /^https:/.test(url) ? url : "";
      return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
    } catch { return /^https:/.test(url) ? url : ""; }    // CORS: pass the URL on; the viewer tries to download it (otherwise: initial-letter avatar)
  }
  // Post images: download and shrink (≤ 800 px, JPEG). CORS-blocked images are passed on as URLs.
  async function mediaData(url) {
    try {
      if (!url) return "";
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
      const res = await fetch(url, { credentials: "omit", signal: ctl.signal }); if (!res.ok) return /^https:/.test(url) ? url : "";
      const bmp = await createImageBitmap(await res.blob()), sc = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
      const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) });
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.8);
    } catch { return /^https:/.test(url) ? url : ""; }
  }
  const q = (c, s) => { try { return !s ? null : s === ":scope" ? c : c.querySelector(s); } catch { return null; } };   // ":scope" = the container itself

  // "css" reads the text; "css@attribute" reads the attribute (e.g. "a[data-tooltip]@aria-label").
  const parseSel = (x) => { const m = (x || "").match(/^(.*\S)@([A-Za-z][\w-]*)$/); return m ? { css: m[1], attr: m[2] } : { css: x || "", attr: null }; };
  const field = (c, x, fromEl) => { const { css, attr } = parseSel(x); const el = css ? q(c, css) : null; return !el ? "" : attr ? (el.getAttribute(attr) || "") : fromEl(el); };
  const countText = (t) => { const m = String(t || "").match(/\d[\d.,]*\s*(mil|mi|k|m|b)?\b/i); return m ? m[0].trim() : "0"; };
  const normTime = (t) => String(t || "").replace(/\s+(at|às|a las)\s+/i, " ");   // "November 4, 2026 at 2:32 PM" -> parseable

  async function extract(container, p) {
    const ex = p.extractor && globalThis.SP_EXTRACTORS?.[p.extractor];   // built-in extractors (X, Instagram)
    if (ex) return ex(container);
    const s = p.sel, avEl = q(container, parseSel(s.avatar).css);
    const imgs = s.media ? [...qa(container, parseSel(s.media).css)].filter((i) => !(avEl && (i === avEl || avEl.contains(i) || i.contains(avEl)))) : [];
    const urls = [...new Set(imgs.map((i) => i.currentSrc || i.src).filter(Boolean))].slice(0, 4);
    const main = {
      author: { name: field(container, s.name, txt), handle: field(container, s.handle, txt), verified: false, avatar: await toDataUrl(avatarUrl(avEl)) },
      text: [field(container, s.text, txt), field(container, s.body, txt)].filter(Boolean).join("\n\n"),
      media: (await Promise.all(urls.map(mediaData))).filter(Boolean)
    };
    const extra = {
      platform: p.id,
      stats: (s.stats || []).map((x) => ({ icon: x.icon, n: countText(field(container, x.sel, txt)) })),
      time: normTime(field(container, s.time, timeOf))
    };
    // repost: the displayed post is the original; who reposted comes from the context element
    const rp = s.repost ? q(container, parseSel(s.repost).css) : null;
    if (rp) {
      const strip = s.repostStrip ? new RegExp("^\\s*" + s.repostStrip.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*", "i") : null;
      const name = txt(rp).replace(strip || /^$/, "").trim();
      const handle = "@" + ((rp.getAttribute("href") || "").split("/").filter(Boolean).pop() || "");
      return { kind: "repost", ...extra, author: { name, handle, verified: false, avatar: "" }, text: "", original: main };
    }
    return { kind: "tweet", ...extra, ...main };
  }

  // ---------- picking with the mouse ----------
  const inHost = (e) => e.composedPath().includes(host);
  const rectOf = (box, el) => { if (!el) { box.hidden = true; return; } const r = el.getBoundingClientRect(); Object.assign(box.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" }); box.hidden = false; };
  let origin = null;
  function onMove(e) {
    if (inHost(e)) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    cand = el && picking.accept(el); origin = cand;
    rectOf(hl, cand);
  }
  function swallow(e) { if (!inHost(e)) { e.preventDefault(); e.stopImmediatePropagation(); } }
  function onClick(e) {
    if (inHost(e)) return;
    swallow(e);
    if (!cand) return;
    const el = cand, cb = picking.onPick; stopPick(); cb(el);
  }
  function onKey(e) {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); stopPick(); setMode("menu"); }
    else if (e.key === "ArrowUp" && cand) { e.preventDefault(); const p = picking.accept(cand.parentElement || cand); if (p) { cand = p; rectOf(hl, cand); } }
    else if (e.key === "ArrowDown" && cand && origin && cand !== origin && cand.contains(origin)) {
      e.preventDefault(); let n = origin; while (n.parentElement && n.parentElement !== cand) n = n.parentElement; cand = n; rectOf(hl, cand);
    }
  }
  const EVS = ["mousedown", "mouseup", "pointerdown", "pointerup", "auxclick", "contextmenu", "dblclick"];
  function startPick(accept, onPick) {
    stopPick(); picking = { accept, onPick };
    addEventListener("mousemove", onMove, true); addEventListener("click", onClick, true); addEventListener("keydown", onKey, true);
    EVS.forEach((t) => addEventListener(t, swallow, true));
    document.documentElement.style.cursor = "crosshair";
  }
  function stopPick() {
    if (!picking) return; picking = null;
    removeEventListener("mousemove", onMove, true); removeEventListener("click", onClick, true); removeEventListener("keydown", onKey, true);
    EVS.forEach((t) => removeEventListener(t, swallow, true));
    document.documentElement.style.cursor = ""; hl.hidden = true;
  }

  // ---------- modes / interface ----------
  const matches = () => (draft?.container ? [...qa(document, draft.container)] : []);
  const short = (s, n = 40) => (s.length > n ? s.slice(0, n) + "…" : s);

  function setMode(m) {
    mode = m; stopPick(); selhl.hidden = true;
    if (m === "capture") return startCapture();
    if (m === "setup") { draft = { container: "", fields: {}, stats: [], log: [] }; step = -1; return startContainerPick(); }
    render();
  }

  async function startCapture() {
    const sel = platform.sel.container;
    render(document.querySelector(sel) ? undefined : t("ov_none_found"));
    startPick((el) => { try { return el.closest(sel); } catch { return null; } }, async (el) => {
      render(t("ov_generating")); lastPick = el; lastError = null; mode = "menu";
      try {
        const tweet = await extract(el, platform);
        // a post with nothing in it means the selectors/extractor no longer match the page: say so instead of opening an empty image
        if (!tweet?.author?.name && !tweet?.author?.handle && !tweet?.title && !tweet?.text && !tweet?.media?.length && !tweet?.original) throw new Error(t("ov_no_data"));
        chrome.runtime.sendMessage({ type: "sp:open", tweet });
        render(t("ov_opening"));
      } catch (e) {
        console.error("[postframe]", e); lastError = e;
        render(t("ov_capture_error", String(e?.message || e).slice(0, 160)));
      }
    });
  }

  function startContainerPick() {
    render();
    startPick((el) => (el === document.body || el === document.documentElement || el === host ? null : el), (el) => { containerEl = el; draft.container = containerSelector(el); render(); rectOf(selhl, containerEl); });
  }

  function startFieldPick() {
    render();
    startPick((el) => (containerEl.contains(el) && el !== containerEl ? el : null), (el) => {
      const s = STEPS[step], sel = s.key === "media" ? mediaSelector(el, containerEl) : fieldSelector(el, containerEl), all = matches();
      const found = all.filter((c) => q(c, sel)).length;
      const val = s.key === "media" ? t("ov_images_count", qa(containerEl, sel).length) : s.key === "avatar" ? avatarUrl(el) : s.key === "time" ? timeOf(el) : s.stat ? countOf(el) : txt(el);
      if (s.stat) draft.stats.push({ icon: draft.pendingIcon || "like", sel });
      else draft.fields[s.key] = sel;
      draft.log.push({ label: s.stat ? t(STAT_ICONS[draft.pendingIcon || "like"]) : t("ov_f_" + s.key), val: short(String(val || t("ov_empty"))), found, total: all.length });
      next();
    });
  }
  function next() { step++; if (step >= STEPS.length) { mode = "review"; stopPick(); render(); } else { draft.pendingIcon = iconFor(step); startFieldPick(); } }
  function back() {
    if (mode === "review") { step = STEPS.length; }
    step = Math.max(0, step - 1); mode = "setup";
    const s = STEPS[step], last = draft.log.pop();
    if (s.stat) draft.stats.pop(); else delete draft.fields[s.key];
    draft.pendingIcon = iconFor(step);
    if (!last) { /* skipped step */ }
    startFieldPick();
  }

  async function save(name) {
    const sel = { container: draft.container, ...draft.fields, stats: draft.stats };
    const res = await chrome.runtime.sendMessage({ type: "sp:savePlatform", platform: { id: platform && !platform.builtin ? platform.id : undefined, name, hosts: [hostname], sel } });
    if (res?.ok) { platform = res.platform; setMode("capture"); } else render(t("ov_save_fail"));
  }

  function render(note) {
    panel.replaceChildren();
    const close = h("button", { textContent: t("ov_close"), onclick: destroy });
    const title = (head, sub) => [h("h3", { textContent: head }), sub ? h("p", { class: "sub", textContent: sub }) : null];
    if (note) panel.append(h("p", { class: "sub", textContent: note }));

    if (mode === "menu") {
      panel.append(...title("Postframe", platform ? t("ov_platform", platform.name) : t("ov_not_configured")));
      const row = h("div", { class: "row" });
      if (platform) row.append(h("button", { class: "pri", textContent: t("ov_capture_btn"), onclick: () => setMode("capture") }));
      // built-in platforms read posts with their own extractor; only unknown sites (or the user's own platforms) can be set up
      if (!platform?.builtin) row.append(h("button", { class: platform ? "" : "pri", textContent: platform ? t("ov_reconfigure") : t("ov_configure"), onclick: () => setMode("setup") }));
      row.append(h("button", { textContent: t("ov_styles"), onclick: () => chrome.runtime.sendMessage({ type: "sp:options" }) }), close);
      if (lastPick) row.append(h("button", { textContent: t("ov_copy_diag"), onclick: copyDiagnostics }));
      panel.append(row);
    } else if (mode === "capture") {
      panel.append(...title(t("ov_capture_title"), t("ov_capture_hint")), h("div", { class: "row" }, h("button", { textContent: t("ov_cancel"), onclick: () => setMode("menu") })));
    } else if (mode === "setup" && step < 0) {
      if (!draft.container) {
        panel.append(...title(t("ov_setup_title1"), t("ov_setup_hint1")), h("div", { class: "row" }, h("button", { textContent: t("ov_cancel"), onclick: () => setMode("menu") })));
      } else {
        const n = matches().length;
        panel.append(...title(t("ov_block_title"), n === 1 ? t("ov_block_one") : t("ov_block_many", n)),
          h("p", { class: n > 1 ? "ok" : "warn", textContent: n > 1 ? t("ov_looks_list") : t("ov_only_one") }),
          h("div", { class: "row" },
            h("button", { class: "pri", textContent: t("ov_use_block"), onclick: () => { selhl.hidden = true; next(); } }),
            h("button", { textContent: t("ov_bigger"), onclick: () => { const p = containerEl.parentElement; if (p && p !== document.body) { containerEl = p; draft.container = containerSelector(p); render(); rectOf(selhl, p); } } }),
            h("button", { textContent: t("ov_pick_other"), onclick: () => { draft.container = ""; startContainerPick(); } })));
      }
    } else if (mode === "setup") {
      const s = STEPS[step];
      panel.append(...title(t("ov_setup_title_n", [step + 2, STEPS.length + 1]), t(s.label)));
      if (s.stat) { const sel = h("select", { onchange: () => (draft.pendingIcon = sel.value) }, Object.entries(STAT_ICONS).map(([k, l]) => h("option", { value: k, textContent: t(l), selected: k === draft.pendingIcon }))); panel.append(h("div", { class: "col" }, h("span", { class: "sub", textContent: t("ov_count_type") }), sel)); }
      if (draft.log.length) panel.append(logList());
      panel.append(h("div", { class: "row" },
        !s.req ? h("button", { textContent: t("ov_skip"), onclick: () => { draft.log.push({ label: s.key, val: t("ov_skipped"), found: 0, total: 0, skipped: true }); next(); } }) : null,
        h("button", { textContent: t("ov_back"), onclick: back }),
        h("button", { textContent: t("ov_cancel"), onclick: () => setMode("menu") })));
    } else if (mode === "review") {
      const name = h("input", { value: platform ? platform.name : hostname.replace(/\..*$/, "").replace(/^./, (c) => c.toUpperCase()), maxLength: 40 });
      panel.append(...title(t("ov_done"), t("ov_will_use", hostname)), h("div", { class: "col" }, h("span", { class: "sub", textContent: t("ov_platform_name") }), name), logList(),
        h("div", { class: "row" }, h("button", { class: "pri", textContent: t("ov_save_capture"), onclick: () => save(name.value || hostname) }), h("button", { textContent: t("ov_back"), onclick: back }), h("button", { textContent: t("ov_cancel"), onclick: () => setMode("menu") })));
    }
  }
  function logList() {
    return h("ul", {}, draft.log.map((l) => h("li", {}, h("b", { textContent: l.label + ": " }), l.val, l.skipped ? "" : h("span", { class: l.found === l.total ? "ok" : "warn", textContent: t("ov_log_found", [l.found, l.total]) }))));
  }

  // Structure only (names, counts, hosts): no post text and no links, so it is safe to paste in an issue.
  function diagnose(el, err) {
    const host = (u) => { try { return new URL(u).host; } catch { return ""; } };
    const q = (sel) => { try { return [...el.querySelectorAll(sel)]; } catch { return []; } };
    return JSON.stringify({
      site: location.hostname, platform: platform?.id, extractor: platform?.extractor || null, error: err ? String(err.message || err).slice(0, 200) : null,
      container: { tag: el.localName, attributes: el.getAttributeNames() },
      slots: [...new Set(q("[slot]").map((e) => e.getAttribute("slot")))],
      tags: [...new Set(q("*").map((e) => e.localName))].slice(0, 60),
      images: q("img").slice(0, 12).map((i) => ({ host: host(i.src), firstClass: String(i.className || "").split(" ")[0], width: Math.round(i.getBoundingClientRect().width) })),
      players: q("shreddit-player, shreddit-player-2, video").map((e) => ({ tag: e.localName, attributes: e.getAttributeNames() })),
      textBody: ['[slot="text-body"]', '[id$="-post-rtjson-content"]', '[data-post-click-location="text-body"]'].map((s) => [s, q(s).length]),
      testids: [...new Set(q("[data-testid]").map((e) => e.getAttribute("data-testid").replace(/did:\S+|by-.*/, "by-…")))].slice(0, 30)
    }, null, 2);
  }
  async function copyDiagnostics() {
    try { await navigator.clipboard.writeText(diagnose(lastPick, lastError)); render(t("ov_copied")); }
    catch (e) { render(t("ov_capture_error", String(e?.message || e).slice(0, 120))); }
  }

  function destroy() { stopPick(); host.remove(); delete window.__spOverlay; }
  window.__spOverlay = { toggle: () => (host.isConnected ? destroy() : (document.documentElement.appendChild(host), render())) };

  Promise.all([loadPlatform(), chrome.runtime.sendMessage({ type: "sp:i18n" }).catch(() => null)]).then(([p, i18n]) => { platform = p; M = i18n?.messages || {}; render(); });
})();
