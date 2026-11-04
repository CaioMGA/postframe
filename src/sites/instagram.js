// Extrator do Instagram (feed). BETA: o DOM não tem ganchos estáveis (sem <header>/<h1>, classes ofuscadas,
// textos de acessibilidade localizados), então usa heurísticas. Contagens de curtidas não aparecem no DOM.
(() => {
  const reg = (globalThis.SP_EXTRACTORS = globalThis.SP_EXTRACTORS || {});
  const norm = (t) => (t || "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const txt = (el) => norm(el?.innerText ?? el?.textContent);
  const RESERVED = new Set(["explore", "reels", "reel", "direct", "accounts", "p", "stories", "tv", "about", "legal"]);

  reg.instagram = (article) => {
    // autor: primeiro link para um perfil que tenha texto
    const prof = [...article.querySelectorAll("a[href]")].map((a) => ({ a, m: a.pathname.match(/^\/([A-Za-z0-9_.]{1,30})\/?$/) }))
      .find((x) => x.m && !RESERVED.has(x.m[1]) && txt(x.a));
    const username = prof ? prof.m[1] : "";

    // imagens pelo tamanho renderizado: pequena = foto de perfil, grande = mídia do post
    const imgs = [...article.querySelectorAll("img")].map((i) => ({ i, w: i.getBoundingClientRect().width })).filter((x) => x.w > 0);
    const avatar = imgs.find((x) => x.w <= 64)?.i;
    const urls = imgs.filter((x) => x.w >= 200).map((x) => x.i.currentSrc || x.i.src);
    const posters = [...article.querySelectorAll("video[poster]")].map((v) => v.poster);
    const media = [...new Set([...urls, ...posters].filter((u) => /^https:/.test(u)))].slice(0, 4);

    // legenda: o maior texto (span[dir=auto]) fora de links e botões
    const caps = [...article.querySelectorAll('span[dir="auto"]')].filter((s) => !s.closest('a, button, [role="button"]'))
      .map((s) => txt(s)).filter((t) => t.length >= 3).sort((a, b) => b.length - a.length);
    let text = caps[0] || "";
    if (username && text.toLowerCase().startsWith(username.toLowerCase())) text = text.slice(username.length).trim();

    return {
      kind: "tweet", platform: "instagram",
      author: { name: username, handle: username ? "@" + username : "", verified: !!article.querySelector('svg[aria-label="Verified"]'), avatar: avatar ? avatar.currentSrc || avatar.src : "" },
      text, media, stats: [],
      time: article.querySelector("time[datetime]")?.getAttribute("datetime") || ""
    };
  };
})();
