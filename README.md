<p align="center">
  <img src="icons/icon-512.png" width="128" height="128" alt="Postframe icon: two hands forming a framing rectangle">
</p>

# Postframe

A Chrome extension that turns a post (**X, Bluesky, Reddit, Instagram**, or any site you set up) into a **standardized image**: profile picture, name, handle, full text, images in a mosaic, counts and time, inside a style you control.

The image is not a screen crop: it is **built from the post's data**, so it always comes out 600 px wide, up to 350 KB, with the same look.

> ⚠️ **Beta.** Postframe is under active development. Expect bugs, and sites change their HTML often, which can break post reading. Only **X.com** has been tested and is OK; see the [platform checklist](#platforms).

| Classic light | Gradient frame | Pastel poster (repost) |
|---|---|---|
| ![](mockups/images/1-tweet.png) | ![](mockups/images/3-tweet.png) | ![](mockups/images/6-retweet.png) |

## Features

- **Post data:** profile picture, name, handle, full text, time and counts (replies, reposts, likes…). For reposts and quotes, the original post appears inside the card.
- **Post images in a mosaic** (1, 2, 3 or 4), with an option to hide them.
- **6 ready-made styles and your own:** font, colors, card, borders, shadow and glow, gradient frame, picture shape, top bar and more. Duplicate any style and edit it.
- **Google Fonts:** pick a font from the list or type any Google Fonts family.
- **Watermark** (text or image), draggable, with tilt and an option to **repeat it as a brick pattern** with adjustable spacing.
- Optional **credit line** below the image.
- **Per-platform styles:** the X style can differ from another site's, and you can duplicate a style and change its platform. The default style is per platform too.
- **Any site:** a point-and-click picker lets you select the post, name, handle, picture, text, images, time and counts. The setup is saved per site.
- **Export and import** styles and platforms as JSON.
- Quick toggles for **Credit**, **Watermark** and **Images** on the result page.
- **Languages:** English (default), Português (Brasil), Français, Español, Deutsch, Italiano and 日本語. You choose the language the first time you use the extension and can change it any time in Settings.

## Platforms

### Support checklist (beta)

Only X.com has been tested and is OK. The other platforms are implemented but not yet validated.

- **X.com**
  - [x] Tested
  - [x] OK
- **Bluesky**
  - [ ] Tested
  - [ ] OK
- **Reddit**
  - [ ] Tested
  - [ ] OK
- **Instagram**
  - [ ] Tested
  - [ ] OK
- **Any other site** (point-and-click picker)
  - [ ] Tested
  - [ ] OK

### What each platform reads

| Platform | Status | Posts | Images | Counts | Repost / quote |
|---|---|---|---|---|---|
| **X** | tested and OK | ✅ | ✅ (and video posters) | ✅ | ✅ repost and quote |
| **Bluesky** | beta, not yet validated | ✅ | ✅ | ✅ | ✅ repost · ❌ quote |
| **Instagram** | **beta**: heuristic extractor, not yet validated | ✅ | ✅ | ❌ (not in the DOM) | — |
| **Reddit** | **beta**, not yet validated | ✅ | ✅ | ✅ | — |
| **Any site** | beta, not yet validated | ✅ | ✅ | ✅ | ❌ |

- **Beta** means the site may change or there are cases we do not cover yet. If something fails, use **Reconfigure this site** on the site itself: your configuration takes precedence over the built-in one.
- On **Instagram** the DOM has no stable hooks (no `<header>`, obfuscated classes), so the caption is "the longest text outside links and buttons" and sponsored posts may come out without a time. Videos without a poster come out without an image.
- **Reddit** was written from the documented attributes of `<shreddit-post>`, without a real page (Reddit blocks automated browsers). If you have Reddit open, the "Help validate Reddit" section below takes a minute.
- Only **X** has the camera button inside the post. On the other platforms, click the extension icon and choose **Capture a post**.

## Install (developer mode)

1. Download or clone this repository.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the project folder.
4. A settings page opens: choose your language.

## Usage

**On X:** hover a tweet and click the camera icon in its action bar. A new tab opens with the images in the available styles (starting with your default). Download or copy the one you like.

**Bluesky, Reddit, Instagram:** open the site, click the extension icon, choose **Capture a post** and click the post you want.

**Any other site:** open the site, click the extension icon and choose **Set up this site**. Click a whole post, then the fields you want (name, text, images…). Save it and use **Capture a post**.

**Styles, platforms and language:** right-click the icon → *Options* (or **Styles…** on the result page).

## Privacy and permissions

- Styles, platforms and preferences are stored in `chrome.storage.local`, in your browser. There are no accounts, no own server and no analytics.
- The extension only uses the network to:
  - **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`), when you use a Google font, to download it;
  - **image CDNs** (`pbs.twimg.com`, `cdn.bsky.app`, `*.cdninstagram.com`, `*.fbcdn.net`, `i.redd.it`, `preview.redd.it`, `external-preview.redd.it`), only when a site blocks direct download of the post images and profile pictures that go into the image.
- `storage`: keep your settings. `activeTab` and `scripting`: open the capture/setup panel only on the tab where you click the icon (the extension has no permanent access to all sites). Automatic scripts run only on `x.com` and `twitter.com`.

## Limitations

- Sites change their HTML often: the built-in selectors may break (see [Platforms](#platforms)).
- On sites set up with the picker, pictures blocked by CORS fall back to an initial-letter avatar, and blocked images are left out.
- Videos appear only as their poster. The picker cannot see closed shadow DOM or cross-origin iframes.
- Postframe is not affiliated with X Corp. "X" and "Twitter" are trademarks of their owners.

## Help validate Reddit

On a Reddit page (logged in or not), open the browser console (F12) and run the code below. It copies **only the structure** (attribute names and counts), with no text or links. Paste the result in an issue.

```js
const p = document.querySelector('shreddit-post');
copy(JSON.stringify({
  posts: document.querySelectorAll('shreddit-post').length,
  attributes: p && p.getAttributeNames(),
  slots: p && [...p.querySelectorAll('[slot]')].map(e => e.getAttribute('slot')),
  images: p && p.querySelectorAll('[slot="post-media-container"] img').length
}));
```

## Development

Plain JavaScript (Manifest V3), no build step.

```
manifest.json
_locales/       UI texts, one messages.json per language (en is the source of truth)
src/            background, content scripts, picker panel and shared modules
options/        styles, platforms and language settings page
viewer/         page that generates and shows the images
mockups/        gallery of the built-in styles
```

**Translations:** every UI text is an i18n key. Add or fix a language by editing `_locales/<lang>/messages.json` (same keys as `en`; keep `$1`, `$2` placeholders). To add a language, create its folder and add it to `LANGS` in `src/shared/i18n.mjs`.

To regenerate the gallery (`mockups/`):

```sh
npm install
npx playwright-core install chromium
npm run mockups
```

## License

[MIT](LICENSE)
