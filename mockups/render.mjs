import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { samples } from "./samples.mjs";
import { BUILTINS as designs, page, styleName } from "../src/shared/styles.mjs";
// Requires `npm i playwright-core` (or PLAYWRIGHT_CORE=/path/to/playwright-core).
const { chromium } = await import(process.env.PLAYWRIGHT_CORE || "playwright-core");

fs.mkdirSync("images", { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 600, height: 800 }, deviceScaleFactor: 1 });
const out = [];
for (const d of designs) for (const s of samples) {
  const p = await ctx.newPage();
  await p.setContent(page(d, s));
  await p.evaluate(() => document.fonts.ready);
  const file = `images/${d.id}-${s.id}.png`;
  await p.locator(".shot").screenshot({ path: file });
  await p.close();
  // lossless optimization; if it goes over 350KB, fall back to color quantization
  execFileSync("optipng", ["-quiet", "-o2", file]);
  let size = fs.statSync(file).size;
  if (size > 350 * 1024) { execFileSync("magick", [file, "-colors", "256", "PNG8:" + file]); size = fs.statSync(file).size; }
  const [w, h] = execFileSync("magick", ["identify", "-format", "%w %h", file]).toString().split(" ").map(Number);
  out.push({ design: d.id, name: styleName(d), sample: s.id, sampleLabel: s.label, file, w, h, kb: +(size / 1024).toFixed(1) });
}
await browser.close();
fs.writeFileSync("data.js", "window.MOCKUPS = " + JSON.stringify(out, null, 1) + ";");
console.table(out.map(({ file, w, h, kb }) => ({ file, w, h, kb })));
