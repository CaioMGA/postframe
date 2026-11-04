import { normalizePlatform } from "./shared/platforms.mjs";

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "sp:open") {            // dados do post -> guarda e abre a página com os estilos
    (async () => {
      const id = Date.now().toString(36);
      await chrome.storage.local.set({ [`tweet:${id}`]: msg.tweet });
      await chrome.tabs.create({
        url: chrome.runtime.getURL(`viewer/viewer.html?id=${id}`),
        index: sender.tab ? sender.tab.index + 1 : undefined
      });
      const all = await chrome.storage.local.get(null);   // mantém só os 8 mais recentes
      const old = Object.keys(all).filter((k) => k.startsWith("tweet:")).sort().slice(0, -8);
      if (old.length) await chrome.storage.local.remove(old);
    })();
  } else if (msg?.type === "sp:savePlatform") {   // configuração criada pelo seletor
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
  } else if (msg?.type === "sp:options") chrome.runtime.openOptionsPage();
});

// Ícone da barra: abre o painel (captura / configuração) na aba atual.
chrome.action.onClicked.addListener(async (tab) => {
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/page/overlay.js"] }); }
  catch { chrome.runtime.openOptionsPage(); }   // páginas restritas (chrome://, loja)
});
