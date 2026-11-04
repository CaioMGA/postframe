(() => {
  const SITE = globalThis.SP_SITE;

  // Texts come from the background (content scripts cannot import modules); English until they arrive.
  let M = { cs_btn_title: "Postframe: generate images of this post", cs_err_read: "could not read the post", cs_err_prefix: "Error: $1" };
  const tr = (k, sub) => String(M[k] ?? k).replace("$1", sub ?? "");
  chrome.runtime.sendMessage({ type: "sp:i18n" }).then((r) => {
    if (r?.messages) { M = r.messages; document.querySelectorAll(".sp-btn").forEach((b) => (b.title = tr("cs_btn_title"))); }
  }).catch(() => {});
  const ICON = '<svg viewBox="0 0 24 24"><path d="M9 3 7.17 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-3.17L15 3H9zm3 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/></svg>';

  function toast(text) {
    const t = document.createElement("div");
    t.className = "sp-toast"; t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
  }

  function onClick(article) {
    try {
      const tweet = SITE.extract(article);
      if (!tweet.author.name && !tweet.text) throw new Error(tr("cs_err_read"));
      chrome.runtime.sendMessage({ type: "sp:open", tweet });
    } catch (e) {
      console.error("[postframe]", e);
      toast(tr("cs_err_prefix", e.message));
    }
  }

  function inject() {
    SITE.items().forEach((article) => {
      if (article.querySelector(".sp-btn")) return;
      const mount = SITE.mountPoint(article);
      if (!mount) return;
      const btn = document.createElement("button");
      btn.className = "sp-btn";
      btn.title = tr("cs_btn_title");
      btn.innerHTML = ICON;
      btn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); onClick(article); });
      mount.appendChild(btn);
    });
  }

  let queued = false;
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; inject(); });
  }).observe(document.body, { childList: true, subtree: true });
  inject();
})();
