// Reddit extractor (new web UI, the <shreddit-post> element). BETA: not checked against a real page, because Reddit blocks
// automated browsers. What is known from public scraping guides: the post's own attributes carry author, post-title,
// created-timestamp, score, comment-count, permalink and subreddit-prefixed-name. Everything else (body, media, subreddit
// icon, crossposts) is read with layered fallbacks and left out when nothing is found.
//
// The card shows the SUBREDDIT as the author line (name + icon) and the user's handle under it, then the title in bold,
// the body text, the media (images, video poster) and the counts (karma, comments, reposts).
(() => {
  const reg = (globalThis.SP_EXTRACTORS = globalThis.SP_EXTRACTORS || {});
  const norm = (t) => (t || "").replace(/[ \t]+\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  const txt = (el) => norm(el?.innerText ?? el?.textContent);
  const first = (root, selectors) => { for (const s of selectors) { try { const el = root.querySelector(s); if (el) return el; } catch { /* invalid selector */ } } return null; };
  const num = (v) => { const m = String(v ?? "").match(/\d[\d.,]*\s*[KkMm]?/); return m ? m[0].trim() : ""; };

  // one field failing must not take the whole capture down: it is simply left out
  const safe = (fn, fallback) => { try { return fn(); } catch (e) { console.warn("[postframe] reddit field skipped:", e); return fallback; } };

  reg.reddit = (post) => {
    const attr = (n) => (post.getAttribute(n) || "").trim();
    const author = attr("author");
    const subreddit = attr("subreddit-prefixed-name") || (attr("subreddit-name") ? "r/" + attr("subreddit-name") : "");

    // subreddit icon: a small image that is not post media (community icons live on styles.redditmedia.com)
    const iconEl = safe(() => first(post, ['img[src*="communityIcon"]', 'img[src*="styles.redditmedia.com"]', '[slot="credit-bar"] img', 'faceplate-img[src]', 'img[alt*="icon" i]']), null);
    const avatar = safe(() => (iconEl ? iconEl.currentSrc || iconEl.src || iconEl.getAttribute("src") || "" : ""), "");

    const title = safe(() => attr("post-title") || txt(first(post, ['[slot="title"]', "h1", "h2", "h3"])), "");
    // body text (may be empty for link, image and video posts)
    const body = safe(() => txt(first(post, ['[slot="text-body"]', '[id$="-post-rtjson-content"]', '[data-post-click-location="text-body"]', '[property="schema:articleBody"]'])), "");

    // media: images (single and gallery) and the poster of videos
    const media = safe(() => {
    const imgs = [...post.querySelectorAll('img.media-lightbox-img, [slot="post-media-container"] img, gallery-carousel img, img[src*="preview.redd.it"], img[src*="i.redd.it"]')]
      .filter((i) => i !== iconEl && (i.getBoundingClientRect().width === 0 || i.getBoundingClientRect().width >= 120));
    const posters = [...post.querySelectorAll("shreddit-player, shreddit-player-2, video")].map((v) => v.getAttribute("preview") || v.getAttribute("poster") || "");
    return [...new Set([...imgs.map((i) => i.currentSrc || i.src), ...posters].filter((u) => /^https:/.test(u)))].slice(0, 4);
    }, []);

    // counts: karma, comments and reposts (crossposts, only if the post exposes them)
    const stats = [{ icon: "upvote", n: num(attr("score")) || "0" }, { icon: "comment", n: num(attr("comment-count")) || "0" }];
    const crossAttr = safe(() => post.getAttributeNames().find((n) => /cross|repost/.test(n) && /\d/.test(post.getAttribute(n))), "");
    if (crossAttr) stats.push({ icon: "retweet", n: num(post.getAttribute(crossAttr)) });

    return {
      kind: "tweet", platform: "reddit",
      author: { name: subreddit, handle: author ? "u/" + author : "", verified: false, avatar },
      title, text: body, media, stats,
      time: attr("created-timestamp")
    };
  };
})();
