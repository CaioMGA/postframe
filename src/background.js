import { normalizePlatform, BUILTIN_PLATFORMS, hostMatches } from "./shared/platforms.mjs";
import { initI18n, getCatalog, getLang, isSupported } from "./shared/i18n.mjs";

// The user must pick a language on first use. Until then the extension only opens the settings page.
const hasLang = async () => isSupported((await chrome.storage.local.get("lang")).lang);

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") chrome.runtime.openOptionsPage();   // first run: language picker
  chrome.storage.local.remove("scopes");                        // leftover of a removed feature (per-style platform restrictions)
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "sp:open") {            // post data -> store it and open the page with the styles
    (async () => {
      if (!(await hasLang())) return chrome.runtime.openOptionsPage();
      const id = Date.now().toString(36);
      await chrome.storage.local.set({ [`tweet:${id}`]: msg.tweet });
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`viewer/viewer.html?id=${id}`),
        index: sender.tab ? sender.tab.index + 1 : undefined
      });
      const all = await chrome.storage.local.get(null);   // keep only the 8 most recent posts
      const old = Object.keys(all).filter((k) => k.startsWith("tweet:")).sort().slice(0, -8);
      if (old.length) await chrome.storage.local.remove(old);
    })();
  } else if (msg?.type === "sp:savePlatform") {   // configuration created by the element picker
    (async () => {
      const p = normalizePlatform(msg.platform);
      if (!p || !p.hosts.length || !p.sel.container) return sendResponse({ ok: false });
      const { platforms = [] } = await chrome.storage.local.get("platforms");
      const i = platforms.findIndex((x) => x.id === p.id);
      i >= 0 ? (platforms[i] = p) : platforms.push(p);
      await chrome.storage.local.set({ platforms });
      sendResponse({ ok: true, platform: p });
    })();
    return true;
  } else if (msg?.type === "sp:getPlatform") {     // the injected panel cannot import modules: it asks for the site's platform
    (async () => {
      const { platforms = [] } = await chrome.storage.local.get("platforms");
      const host = String(msg.hostname || "");
      const user = platforms.map(normalizePlatform).filter(Boolean).find((p) => hostMatches(host, p.hosts));
      sendResponse(user || BUILTIN_PLATFORMS.find((p) => hostMatches(host, p.hosts)) || null);   // the user's configuration takes precedence
    })();
    return true;
  } else if (msg?.type === "sp:i18n") {            // texts for the injected panel and the on-page button
    (async () => { await initI18n(); sendResponse({ lang: getLang(), messages: getCatalog() }); })();
    return true;
  } else if (msg?.type === "sp:options") chrome.runtime.openOptionsPage();
});

// Toolbar icon: opens the capture / setup panel in the current tab.
chrome.action.onClicked.addListener(async (tab) => {
  if (!(await hasLang())) return chrome.runtime.openOptionsPage();
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/sites/instagram.js", "src/sites/bluesky.js", "src/page/overlay.js"] }); }
  catch { chrome.runtime.openOptionsPage(); }   // restricted pages (chrome://, web store)
});
