// Bluesky extractor. The web app renders a post in three different shapes, so selectors alone are not enough:
//  - feed item:      author name and @handle are two separate links (with or without a spacer between them)
//  - thread, focused post: name and @handle are two <div dir=auto> inside ONE profile link, the date is a plain div
//  - thread, replies: like a feed item
// Checked against real bsky.app pages (logged-in home feed, profile feed and a post page).
(() => {
  const reg = (globalThis.SP_EXTRACTORS = globalThis.SP_EXTRACTORS || {});
  const norm = (t) => (t || "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const txt = (el) => norm(el?.innerText ?? el?.textContent);
  const isProfileLink = (a) => !(a.getAttribute("href") || "").includes("/post/");
  const DATE = /(\d{1,2}:\d{2}|\b[AP]M\b).*\d{4}|\d{4}.*(\d{1,2}:\d{2}|\b[AP]M\b)/i;
  const count = (item, id) => { const m = txt(item.querySelector(`[data-testid="${id}"]`)).match(/\d[\d.,]*\s*[KkMm]?/); return m ? m[0].trim() : "0"; };
  // "Reposted by Name" in any language: drop the label up to the connecting word ("by", "por", "par", "von", "da"...)
  const stripLabel = (t) => t.replace(/^.*?\b(?:by|por|par|von|da|di|door|av|przez)\s+/iu, "").trim();

  reg.bluesky = (item) => {
    const avatarEl = item.querySelector('[data-testid="userAvatarImage"]');
    const links = [...item.querySelectorAll('a[role="link"][href^="/profile/"]')].filter(isProfileLink);
    // repost context: a profile link WITH text that comes before the avatar (works in any UI language)
    const ctxLink = avatarEl ? links.find((a) => txt(a) && a.compareDocumentPosition(avatarEl) & Node.DOCUMENT_POSITION_FOLLOWING) : null;
    const rest = links.filter((a) => a !== ctxLink && !a.contains(avatarEl));

    let name = "", handle = "";
    const textLinks = rest.filter((a) => a.getAttribute("dir") === "auto" && !a.children.length && txt(a));
    if (textLinks.length >= 2) { name = txt(textLinks[0]); handle = txt(textLinks[1]); }
    else {
      const one = rest.find((a) => a.querySelectorAll('div[dir="auto"]').length >= 2);
      if (one) { const d = one.querySelectorAll('div[dir="auto"]'); name = txt(d[0]); handle = txt(d[d.length - 1]); }
    }
    if (!handle) handle = (item.getAttribute("data-testid") || "").replace(/^.*?-by-/, "");   // the handle is in the container's data-testid
    if (handle && !handle.startsWith("@")) handle = "@" + handle;

    const tip = item.querySelector("a[data-tooltip]");
    const dateEl = [...item.querySelectorAll('div[dir="auto"]')].find((e) => !e.children.length && DATE.test(txt(e)));
    const time = (tip?.getAttribute("aria-label") || tip?.getAttribute("data-tooltip") || txt(dateEl)).replace(/\s+(at|às|a las|à|um|alle)\s+/i, " ").replace(/\s*·\s*/, " ");   // "November 4, 2026 at 2:32 PM" and "11:42 AM · Nov 4, 2026"

    const imgs = [...item.querySelectorAll('img[src*="/feed_thumbnail/"], img[src*="/feed_fullsize/"]')];
    const main = {
      author: { name, handle, verified: false, avatar: avatarEl?.querySelector("img")?.src || "" },
      text: txt(item.querySelector("[data-word-wrap]")),
      media: [...new Set(imgs.map((i) => i.currentSrc || i.src))].slice(0, 4)
    };
    const extra = {
      platform: "bluesky", time,
      stats: [{ icon: "reply", n: count(item, "replyBtn") }, { icon: "retweet", n: count(item, "repostCount") }, { icon: "like", n: count(item, "likeCount") }]
    };
    if (ctxLink) {
      const who = (ctxLink.getAttribute("href") || "").split("/").filter(Boolean).pop() || "";
      return { kind: "repost", ...extra, author: { name: stripLabel(txt(ctxLink)), handle: "@" + who, verified: false, avatar: "" }, text: "", original: main };
    }
    return { kind: "tweet", ...extra, ...main };
  };
})();
