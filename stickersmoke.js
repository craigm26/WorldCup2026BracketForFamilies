const puppeteer = require('puppeteer-core');
(async () => {
  const errs = [];
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium', headless: 'new', args: ['--no-sandbox','--disable-gpu'] });
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error') {
      const txt = m.text();
      if (txt.includes('Failed to load resource') && /favicon/i.test(txt + m.location().url)) return; // ignore the harmless favicon 404
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
