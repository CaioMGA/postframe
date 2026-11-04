// Injetado ao clicar no ícone da extensão (activeTab + scripting).
// Painel em Shadow DOM: capturar posts da plataforma deste site ou configurar os seletores.
(() => {
  if (window.__spOverlay) { window.__spOverlay.toggle(); return; }

  const STAT_ICONS = { like: "Curtida", upvote: "Voto", reply: "Resposta", comment: "Comentário", retweet: "Repost", share: "Compartilhar", view: "Visualizações" };
  const STEPS = [
    { key: "name", label: "Clique no NOME do autor", req: true },
    { key: "handle", label: "Clique no @usuário (ou pule)" },
    { key: "avatar", label: "Clique na FOTO de perfil (ou pule)" },
    { key: "text", label: "Clique no TEXTO do post", req: true },
    { key: "media", label: "Clique em uma IMAGEM do post (ou pule)" },
    { key: "time", label: "Clique na hora/data (ou pule)" },
    { key: "stat0", label: "Clique em uma CONTAGEM (curtidas, comentários…) ou pule", stat: true },
    { key: "stat1", label: "Outra contagem (ou pule)", stat: true },
    { key: "stat2", label: "Mais uma contagem (ou pule)", stat: true }
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
    .hl{position:fixed;border:2px solid #8b7cff;background:rgba(139,124,255,.15);border-radius:4px;pointer-events:none;box-sizing:border-box}
    .hl.sel{border-style:dashed;background:rgba(139,124,255,.08)}
    .panel{pointer-events:auto;position:fixed;top:12px;right:12px;width:320px;max-height:calc(100vh - 24px);overflow:auto;background:#16181d;color:#e8e9ee;border:1px solid #333845;border-radius:12px;padding:14px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.5)}
    h3{margin:0 0 4px;font-size:14px}.sub{color:#9aa0ae;margin:0 0 10px}
    button,select,input{font:inherit;color:#e8e9ee;background:#23262e;border:1px solid #333845;border-radius:8px;padding:6px 10px;box-sizing:border-box}
    button{cursor:pointer}button:hover{background:#2c303a}.pri{background:#6d5efc;border-color:#6d5efc;color:#fff}
    .row{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}.col{display:flex;flex-direction:column;gap:6px}
    input{width:100%}select{width:100%}
    ul{margin:8px 0 0;padding:0;list-style:none;color:#b9bfd0}li{margin:3px 0;word-break:break-word}li b{color:#fff}.ok{color:#7ee0a0}.warn{color:#e6c46a}
  </style><div class="hl" hidden></div><div class="hl sel" id="selhl" hidden></div><div class="panel"></div>`;
  document.documentElement.appendChild(host);
  const hl = root.querySelector(".hl"), selhl = root.getElementById("selhl"), panel = root.querySelector(".panel");

  const h = (tag, props = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) k === "class" ? (e.className = v) : k.startsWith("on") ? e.addEventListener(k.slice(2), v) : e[k] = v;
    kids.flat().forEach((c) => c != null && e.append(c));
    return e;
  };

  // ---------- estado ----------
  let platform = null;                     // { id, name, hosts, sel } | { id:"x", builtin:true }
  let mode = "menu", step = 0, draft = null, cand = null, picking = null, containerEl = null;
  const hostname = location.hostname.replace(/^www\./, "");
  const matchHost = (hosts) => hosts.some((x) => hostname === x || hostname.endsWith("." + x));

  async function loadPlatform() {
    const { platforms = [] } = await chrome.storage.local.get("platforms");
    const user = platforms.find((p) => matchHost(p.hosts || []));
    if (user) return user;
    if (globalThis.SP_SITE && matchHost(["x.com", "twitter.com"])) return { id: "x", name: "X (Twitter)", builtin: true, hosts: ["x.com", "twitter.com"] };
    return null;
  }

  // ---------- seletores ----------
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
  function mediaSelector(el, scope) {   // pode casar várias imagens do mesmo post
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

  // ---------- leitura de valores ----------
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
      if (!blob.type.startsWith("image/")) return "";
      return await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });
    } catch { return ""; }    // CORS/bloqueio: a imagem final usa um avatar com a inicial
  }
  // Imagens do post: baixa e reduz (≤ 800 px, JPEG). Sites que bloqueiam por CORS ficam sem a imagem.
  async function mediaData(url) {
    try {
      if (!url) return "";
      const ctl = new AbortController(); setTimeout(() => ctl.abort(), 6000);
      const res = await fetch(url, { credentials: "omit", signal: ctl.signal }); if (!res.ok) return "";
      const bmp = await createImageBitmap(await res.blob()), sc = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
      const c = Object.assign(document.createElement("canvas"), { width: Math.round(bmp.width * sc), height: Math.round(bmp.height * sc) });
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      return c.toDataURL("image/jpeg", 0.8);
    } catch { return ""; }
  }
  const q = (c, s) => { try { return s ? c.querySelector(s) : null; } catch { return null; } };

  async function extract(container, p) {
    if (p.builtin) return globalThis.SP_SITE.extract(container);
    const s = p.sel, avEl = q(container, s.avatar);
    const imgs = s.media ? [...qa(container, s.media)].filter((i) => !(avEl && (i === avEl || avEl.contains(i) || i.contains(avEl)))) : [];
    const urls = [...new Set(imgs.map((i) => i.currentSrc || i.src).filter(Boolean))].slice(0, 4);
    return {
      kind: "tweet", platform: p.id,
      author: { name: txt(q(container, s.name)), handle: txt(q(container, s.handle)), verified: false, avatar: await toDataUrl(avatarUrl(q(container, s.avatar))) },
      text: txt(q(container, s.text)),
      media: (await Promise.all(urls.map(mediaData))).filter(Boolean),
      stats: (s.stats || []).map((x) => ({ icon: x.icon, n: countOf(q(container, x.sel)) })),
      time: timeOf(q(container, s.time))
    };
  }

  // ---------- seleção com o mouse ----------
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

  // ---------- modos / interface ----------
  const matches = () => (draft?.container ? [...qa(document, draft.container)] : []);
  const short = (s, n = 40) => (s.length > n ? s.slice(0, n) + "…" : s);

  function setMode(m) {
    mode = m; stopPick(); selhl.hidden = true;
    if (m === "capture") return startCapture();
    if (m === "setup") { draft = { container: "", fields: {}, stats: [], log: [] }; step = -1; return startContainerPick(); }
    render();
  }

  async function startCapture() {
    const sel = platform.builtin ? 'article[data-testid="tweet"]' : platform.sel.container;
    render();
    startPick((el) => { try { return el.closest(sel); } catch { return null; } }, async (el) => {
      render("Gerando…");
      try { chrome.runtime.sendMessage({ type: "sp:open", tweet: await extract(el, platform) }); } catch (e) { console.error("[postframe]", e); }
      mode = "menu"; render("Abrindo as imagens em uma nova aba…");
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
      const val = s.key === "media" ? `${qa(containerEl, sel).length} imagem(ns)` : s.key === "avatar" ? avatarUrl(el) : s.key === "time" ? timeOf(el) : s.stat ? countOf(el) : txt(el);
      if (s.stat) draft.stats.push({ icon: draft.pendingIcon || "like", sel });
      else draft.fields[s.key] = sel;
      draft.log.push({ label: s.stat ? `${STAT_ICONS[draft.pendingIcon || "like"]}` : s.key, val: short(String(val || "(vazio)")), found, total: all.length });
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
    if (!last) { /* passo pulado */ }
    startFieldPick();
  }

  async function save(name) {
    const sel = { container: draft.container, ...draft.fields, stats: draft.stats };
    const res = await chrome.runtime.sendMessage({ type: "sp:savePlatform", platform: { id: platform && !platform.builtin ? platform.id : undefined, name, hosts: [hostname], sel } });
    if (res?.ok) { platform = res.platform; setMode("capture"); } else render("Não foi possível salvar.");
  }

  function render(note) {
    panel.replaceChildren();
    const close = h("button", { textContent: "Fechar", onclick: destroy });
    const title = (t, sub) => [h("h3", { textContent: t }), sub ? h("p", { class: "sub", textContent: sub }) : null];
    if (note) panel.append(h("p", { class: "sub", textContent: note }));

    if (mode === "menu") {
      panel.append(...title("Postframe", platform ? `Plataforma: ${platform.name}` : "Este site ainda não está configurado."));
      const row = h("div", { class: "row" });
      if (platform) row.append(h("button", { class: "pri", textContent: "Capturar um post", onclick: () => setMode("capture") }));
      if (!platform?.builtin) row.append(h("button", { class: platform ? "" : "pri", textContent: platform ? "Reconfigurar este site" : "Configurar este site", onclick: () => setMode("setup") }));
      row.append(h("button", { textContent: "Estilos…", onclick: () => chrome.runtime.sendMessage({ type: "sp:options" }) }), close);
      panel.append(row);
    } else if (mode === "capture") {
      panel.append(...title("Capturar post", "Passe o mouse e clique no post. Esc para voltar."), h("div", { class: "row" }, h("button", { textContent: "Cancelar", onclick: () => setMode("menu") })));
    } else if (mode === "setup" && step < 0) {
      if (!draft.container) {
        panel.append(...title("Configurar este site · 1", "Clique em um post inteiro (o bloco que contém foto, nome e texto). ↑ aumenta a seleção, ↓ diminui."), h("div", { class: "row" }, h("button", { textContent: "Cancelar", onclick: () => setMode("menu") })));
      } else {
        const n = matches().length;
        panel.append(...title("Bloco do post", `${n} ${n === 1 ? "bloco encontrado" : "blocos encontrados"} nesta página.`),
          h("p", { class: n > 1 ? "ok" : "warn", textContent: n > 1 ? "Parece uma lista de posts." : "Só 1 bloco: se a página tem vários posts, aumente a seleção." }),
          h("div", { class: "row" },
            h("button", { class: "pri", textContent: "Usar este bloco", onclick: () => { selhl.hidden = true; next(); } }),
            h("button", { textContent: "↑ Maior", onclick: () => { const p = containerEl.parentElement; if (p && p !== document.body) { containerEl = p; draft.container = containerSelector(p); render(); rectOf(selhl, p); } } }),
            h("button", { textContent: "Escolher outro", onclick: () => { draft.container = ""; startContainerPick(); } })));
      }
    } else if (mode === "setup") {
      const s = STEPS[step];
      panel.append(...title(`Configurar este site · ${step + 2}/${STEPS.length + 1}`, s.label));
      if (s.stat) { const sel = h("select", { onchange: () => (draft.pendingIcon = sel.value) }, Object.entries(STAT_ICONS).map(([k, l]) => h("option", { value: k, textContent: l, selected: k === draft.pendingIcon }))); panel.append(h("div", { class: "col" }, h("span", { class: "sub", textContent: "Tipo da contagem:" }), sel)); }
      if (draft.log.length) panel.append(logList());
      panel.append(h("div", { class: "row" },
        !s.req ? h("button", { textContent: "Pular", onclick: () => { draft.log.push({ label: s.key, val: "— pulado", found: 0, total: 0, skipped: true }); next(); } }) : null,
        h("button", { textContent: "← Voltar", onclick: back }),
        h("button", { textContent: "Cancelar", onclick: () => setMode("menu") })));
    } else if (mode === "review") {
      const name = h("input", { value: platform && !platform.builtin ? platform.name : hostname.replace(/\..*$/, "").replace(/^./, (c) => c.toUpperCase()), maxLength: 40 });
      panel.append(...title("Pronto!", `Será usado em ${hostname}`), h("div", { class: "col" }, h("span", { class: "sub", textContent: "Nome da plataforma:" }), name), logList(),
        h("div", { class: "row" }, h("button", { class: "pri", textContent: "Salvar e capturar", onclick: () => save(name.value || hostname) }), h("button", { textContent: "← Voltar", onclick: back }), h("button", { textContent: "Cancelar", onclick: () => setMode("menu") })));
    }
  }
  function logList() {
    return h("ul", {}, draft.log.map((l) => h("li", {}, h("b", { textContent: l.label + ": " }), l.val, l.skipped ? "" : h("span", { class: l.found === l.total ? "ok" : "warn", textContent: `  (${l.found}/${l.total} posts)` }))));
  }

  function destroy() { stopPick(); host.remove(); delete window.__spOverlay; }
  window.__spOverlay = { toggle: () => (host.isConnected ? destroy() : (document.documentElement.appendChild(host), render())) };

  loadPlatform().then((p) => { platform = p; render(); });
})();
