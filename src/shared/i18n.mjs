// i18n: English by default; the user picks the language on first use and can change it in Settings.
// Catalogs live in _locales/<lang>/messages.json (same format as chrome.i18n, so the manifest can use them too).
// Extension pages and the service worker load them with fetch(); in Node (mockups gallery) English is read from disk.
export const LANGS = [
  ["en", "English"], ["pt_BR", "Português (Brasil)"], ["fr", "Français"], ["es", "Español"],
  ["de", "Deutsch"], ["it", "Italiano"], ["ja", "日本語"]
];
export const DEFAULT_LANG = "en";

const fs = globalThis.process?.getBuiltinModule?.("node:fs");
let lang = DEFAULT_LANG, dict = {}, fallback = {};

const flat = (catalog) => Object.fromEntries(Object.entries(catalog).map(([k, v]) => [k, v.message]));

async function load(code) {
  if (fs) return flat(JSON.parse(fs.readFileSync(new URL(`../../_locales/${code}/messages.json`, import.meta.url), "utf8")));
  return flat(await (await fetch(chrome.runtime.getURL(`_locales/${code}/messages.json`))).json());
}

const loadSync = (code) => flat(JSON.parse(fs.readFileSync(new URL(`../../_locales/${code}/messages.json`, import.meta.url), "utf8")));

export const isSupported = (code) => LANGS.some(([c]) => c === code);

// Loads the saved language ("" when the user has not chosen one yet) plus English as fallback.
export async function initI18n() {
  const saved = fs ? "" : (await chrome.storage.local.get("lang")).lang;
  lang = isSupported(saved) ? saved : DEFAULT_LANG;
  fallback = await load(DEFAULT_LANG);
  dict = lang === DEFAULT_LANG ? fallback : await load(lang).catch(() => fallback);
  return saved || "";
}
export const setLang = (code) => chrome.storage.local.set({ lang: code });
export const getLang = () => lang;
export const getCatalog = () => ({ ...fallback, ...dict });   // sent to the injected panel (it cannot import modules)

const fill = (m, subs) => { [].concat(subs ?? []).forEach((s, i) => { m = m.replaceAll("$" + (i + 1), String(s)); }); return m; };
export function t(key, subs) {
  if (fs && !Object.keys(fallback).length) fallback = dict = loadSync(DEFAULT_LANG);   // Node: English, synchronously
  return fill(dict[key] ?? fallback[key] ?? key, subs);
}
export const uiLocale = () => lang.replace("_", "-");

// Fills static HTML: [data-i18n] -> textContent, [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria].
export function applyI18n(root = document) {
  document.documentElement.lang = lang.split("_")[0];
  root.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = t(e.dataset.i18n); });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((e) => { e.placeholder = t(e.dataset.i18nPlaceholder); });
  root.querySelectorAll("[data-i18n-title]").forEach((e) => { e.title = t(e.dataset.i18nTitle); });
  root.querySelectorAll("[data-i18n-aria]").forEach((e) => { e.setAttribute("aria-label", t(e.dataset.i18nAria)); });
}
