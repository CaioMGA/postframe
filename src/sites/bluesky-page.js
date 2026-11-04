// bsky.app adapter for the on-page camera button (content.js): finds posts, where to put the button, and reads them.
// The reading itself lives in src/sites/bluesky.js (shared with the toolbar-icon capture panel).
(() => {
  globalThis.SP_SITE = {
    name: "bsky.app",
    // feed items and the posts of a post page (the focused post and its replies)
    items: () => document.querySelectorAll('[data-testid^="feedItem-by-"], [data-testid^="postThreadItem-by-"]'),
    // the row that holds the reply / repost / like buttons
    mountPoint: (item) => item.querySelector('[data-testid="replyBtn"]')?.parentElement?.parentElement || null,
    extract: (item) => globalThis.SP_EXTRACTORS.bluesky(item)
  };
})();
