// x.com adapter: finds tweets, the button position and extracts the data.
(() => {
  // Text with emojis (X renders them as <img alt="😀">) and line breaks.
  const textOf = (root) => {
    let out = "";
    const walk = (n) => {
      if (n.nodeType === 3) out += n.nodeValue;
      else if (n.nodeType === 1) {
        if (n.tagName === "IMG") out += n.alt || "";
        else if (n.tagName === "BR") out += "\n";
        else n.childNodes.forEach(walk);
      }
    };
    if (root) walk(root);
    return out.trim();
  };

  const bigAvatar = (src) => (src || "").replace(/_(normal|bigger|mini)\./, "_200x200.");
  const avatarIn = (root) => bigAvatar(root?.querySelector('img[src*="profile_images"]')?.src);

  const parseUser = (userNameEl, avatarRoot) => ({
    name: textOf(userNameEl?.firstElementChild),
    handle: [...(userNameEl?.querySelectorAll("span") || [])]
      .map((s) => s.textContent.trim()).find((t) => /^@\w+$/.test(t)) || "",
    verified: !!userNameEl?.querySelector('[data-testid="icon-verified"]'),
    avatar: avatarIn(avatarRoot)
  });

  // Post images (and video/GIF posters) at medium size; `outside` excludes the quoted tweet.
  const mediaIn = (root, outside) => [...new Set(
    [...(root?.querySelectorAll('[data-testid="tweetPhoto"] img, video[poster]') || [])]
      .filter((e) => !outside?.contains(e))
      .map((e) => (e.tagName === "VIDEO" ? e.poster : e.src))
      .filter((u) => /\/\/pbs\.twimg\.com\//.test(u))
      .map((u) => u.replace(/([?&]name=)\w+/, "$1medium"))
  )].slice(0, 4);

  globalThis.SP_SITE = {
    name: "x.com",
    items: () => document.querySelectorAll('article[data-testid="tweet"]'),
    // The action bar (reply, repost, like...) is the last role=group.
    mountPoint: (article) => {
      const groups = article.querySelectorAll('div[role="group"]');
      return groups[groups.length - 1] || null;
    },

    // -> { kind: "tweet"|"repost"|"quote", author, text, original? }
    extract(article) {
      const names = [...article.querySelectorAll('[data-testid="User-Name"]')];
      const quoteBox = names[1]?.closest('div[role="link"]') || null;
      const texts = [...article.querySelectorAll('[data-testid="tweetText"]')];
      const mainText = texts.find((t) => !quoteBox?.contains(t));

      const count = (id) => {
        const t = textOf(article.querySelector(`[data-testid="${id}"]`));
        return /\d/.test(t) ? t : "0";
      };
      const timeEl = [...article.querySelectorAll("time")].find((t) => !quoteBox?.contains(t));
      const extra = {
        platform: "x",
        stats: [
          { icon: "reply", n: count("reply") },
          { icon: "retweet", n: count("retweet") !== "0" ? count("retweet") : count("unretweet") },
          { icon: "like", n: count("like") !== "0" ? count("like") : count("unlike") }
        ],
        time: timeEl?.getAttribute("datetime") || ""
      };

      const main = {
        author: parseUser(names[0], article.querySelector('[data-testid="Tweet-User-Avatar"]') || article),
        text: textOf(mainText),
        media: mediaIn(article, quoteBox)
      };

      // Repost: the displayed article is the original; who reposted comes from socialContext.
      const ctx = article.querySelector('[data-testid="socialContext"]');
      const ctxLink = ctx?.closest("a[href]") || ctx?.querySelector("a[href]");   // on the real X the block sits INSIDE the profile link
      if (ctx && ctxLink && /repost|retweet|retuit|retwit|reteue|reposte/i.test(ctx.textContent)) {
        const name = textOf(ctx).replace(/\s+\S+$/, "");
        const handle = "@" + (ctxLink.getAttribute("href") || "").replace(/^\/+/, "").split("/")[0];
        const { stats, time, platform } = extra; // counts and time stay on the outer card; the nested original has no footer
        return { kind: "repost", author: { name, handle, verified: false, avatar: "" }, text: "", platform, stats, time, original: main };
      }

      if (quoteBox) {
        return {
          kind: "quote",
          ...main,
          ...extra,
          original: {
            author: parseUser(names[1], quoteBox),
            text: textOf(quoteBox.querySelector('[data-testid="tweetText"]')),
            media: mediaIn(quoteBox)
          }
        };
      }
      return { kind: "tweet", ...main, ...extra };
    }
  };
  (globalThis.SP_EXTRACTORS = globalThis.SP_EXTRACTORS || {}).x = (a) => globalThis.SP_SITE.extract(a);
})();
