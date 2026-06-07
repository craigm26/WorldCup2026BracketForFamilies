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

  // --- single-player empty states for the collaborative views ---
  const clickSeg = (label) => page.evaluate((label) => {
    const el = [...document.querySelectorAll('button')].find(x => x.textContent.includes(label));
    if (el) { el.click(); return true; } return false;
  }, label);
  const hasAddPlayerControl = () => page.evaluate(() =>
    [...document.querySelectorAll('button')].some(b => /add (a )?(family member|player)/i.test(b.textContent)));

  await clickSeg('Overview'); await new Promise(r => setTimeout(r, 400));
  const overviewAdd = await hasAddPlayerControl();
  console.log('Overview (1 player) offers an add-player control:', overviewAdd);

  // Trade Matcher: the add-player card must actually WORK (add a player → matcher appears)
  await clickSeg('Trade Matcher'); await new Promise(r => setTimeout(r, 400));
  const tradeAdd = await hasAddPlayerControl();
  console.log('Trade Matcher (1 player) offers an add-player control:', tradeAdd);
  await page.type('input[placeholder*="Name"]', 'Mia');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /Add a player/i.test(x.textContent)); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 700));
  const matcherWorks = await page.evaluate(() => /perfect swap/i.test(document.body.innerText));
  console.log('after adding a player, Trade Matcher renders:', matcherWorks);

  // --- multiple books per person: independent counts + switching, on the SAME player ---
  await clickSeg('My Book'); await new Promise(r => setTimeout(r, 300));
  // active player here is "Mia" (added above); her album starts empty (0/980).
  // tap the first sticker twice -> THIS book's header becomes "You: 1/980".
  await tap(); await new Promise(r => setTimeout(r, 200));
  await tap(); await new Promise(r => setTimeout(r, 300));
  const albumHas = await page.evaluate(() => /1\/980/.test(document.body.innerText));
  console.log('active book shows 1/980 after two taps:', albumHas);
  // add a "Swaps" book -> becomes active; it must be INDEPENDENT (empty: 0/980, not 1/980).
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /＋ Book/.test(x.textContent)); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 200));
  await page.type('input[placeholder*="Book name"]', 'Swaps');
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent === 'Add'); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 400));
  const hasSwaps = await page.evaluate(() => /📗 Swaps/.test(document.body.innerText));
  console.log('second book "Swaps" added + active:', hasSwaps);
  const swapsIndependent = await page.evaluate(() => /0\/980/.test(document.body.innerText) && !/1\/980/.test(document.body.innerText));
  console.log('Swaps book is independent (empty 0/980, not 1/980):', swapsIndependent);
  // switch back to My album -> its "1/980" must still be there (switch works + data retained).
  await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /📗 My album/.test(x.textContent)); if (b) b.click(); });
  await new Promise(r => setTimeout(r, 350));
  const backRestored = await page.evaluate(() => /1\/980/.test(document.body.innerText));
  console.log('switched back to My album, its 1/980 retained:', backRestored);

  // book-to-book trading: a single person's SECOND book must appear as a trade partner
  await clickSeg('Trade Matcher'); await new Promise(r => setTimeout(r, 400));
  const bookToBook = await page.evaluate(() => {
    const rendered = /perfect swap/i.test(document.body.innerText);
    const opts = [...document.querySelectorAll('select option')].map((o) => o.textContent);
    const samePlayerSecondBook = opts.some((t) => /Mia\s*·\s*Swaps/i.test(t));
    return rendered && samePlayerSecondBook;
  });
  console.log('Trade Matcher lists same-player second book (Mia · Swaps) as a partner:', bookToBook);

  console.log('JS errors:', errs.length, errs.slice(0, 3).join(' | '));
  await browser.close();
  const ok = onBook && hasDouble && overviewAdd && tradeAdd && matcherWorks && albumHas && hasSwaps && swapsIndependent && backRestored && bookToBook && errs.length === 0;
  process.exit(ok ? 0 : 1);
})();
