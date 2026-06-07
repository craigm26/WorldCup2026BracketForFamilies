const puppeteer = require('puppeteer-core');
(async () => {
  const errs = [];
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  // track benign 404s (favicon etc.) so we don't count them as JS errors
  const benign404s = new Set();
  page.on('response', r => { if (r.status() === 404) benign404s.add(r.url()); });
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const txt = m.text();
      // skip "Failed to load resource" when the URL is a known benign 404 (e.g. favicon)
      if (txt.includes('Failed to load resource')) return;
      errs.push('CONSOLE: ' + txt);
    }
  });
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto('http://localhost:8088/?tab=stickers', { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3500));

  const onBook = await page.evaluate(() => document.body.innerText.includes('My Book'));
  console.log('Stickers tab rendered:', onBook);

  // tap the first sticker slot twice -> should show a ×2 doubles badge
  const tap = () => page.evaluate(() => { const el = document.querySelector('[title]'); if (el) { el.click(); return true; } return false; });
  await tap(); await new Promise(r => setTimeout(r, 200));
  await tap(); await new Promise(r => setTimeout(r, 300));
  const hasDouble = await page.evaluate(() => /×2/.test(document.body.innerText));
  console.log('double badge after two taps:', hasDouble);

  await page.screenshot({ path: '/tmp/stickers_book.png' });
  console.log('JS errors:', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})();
