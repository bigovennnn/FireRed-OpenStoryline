// Usage: node render.js <outDir> [--frames 0,90,300] [--workers 4] [--step 1]
// Renders PNG frames with headless Chromium. Each frame is a pure function of its index,
// so workers can render interleaved slices in any order.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const script = JSON.parse(fs.readFileSync(path.join(__dirname, 'script.json'), 'utf8'));
const args = process.argv.slice(2);
const outDir = args[0] || 'frames';
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const total = script.fps * script.duration;
let frames = opt('--frames') ? opt('--frames').split(',').map(Number) : [...Array(total).keys()];
const step = +(opt('--step') || 1); frames = frames.filter((_, i) => i % step === 0);
const workers = +(opt('--workers') || 4);
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const t0 = Date.now(); let done = 0;
  await Promise.all([...Array(workers).keys()].map(async w => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    page.on('pageerror', e => { console.error('PAGE ERROR', e.message); process.exitCode = 1; });
    await page.addInitScript(s => { window.__SCRIPT__ = s; }, script);
    await page.goto('file://' + path.join(__dirname, 'index.html'));
    await page.evaluate(() => window.ready);
    for (let i = w; i < frames.length; i += workers) {
      const f = frames[i];
      const b64 = await page.evaluate(f => { draw(f); return document.getElementById('c').toDataURL('image/png').slice(22); }, f);
      fs.writeFileSync(path.join(outDir, `f${String(f).padStart(5, '0')}.png`), Buffer.from(b64, 'base64'));
      if (++done % 200 === 0) console.log(`${done}/${frames.length} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  await browser.close();
  console.log(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})();
