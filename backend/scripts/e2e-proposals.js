// Headless-browser check: freelancer clicks "View" on a proposal -> detail page.
// Requires puppeteer-core installed somewhere; run with:
//   NODE_PATH=..\.puppet\node_modules node scripts/e2e-proposals.js
const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  await page.type('#email', 'e2e-freelancer@test.dev');
  await page.type('#password', 'Password@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null),
    page.click('button[type=submit]'),
  ]);
  console.log('logged in ->', page.url());

  await page.goto('http://localhost:5173/freelancer/proposals', { waitUntil: 'networkidle2' });
  await new Promise((r) => setTimeout(r, 1500));
  const viewLinks = await page.$$eval('a', (as) => as.filter((a) => a.textContent.trim() === 'View').map((a) => a.getAttribute('href')));
  console.log('View links:', JSON.stringify(viewLinks));
  if (!viewLinks.length) { console.log('FAIL: no View link'); process.exit(1); }
  await page.click(`a[href="${viewLinks[0]}"]`);
  await new Promise((r) => setTimeout(r, 2500));
  console.log('detail URL:', page.url());
  const text = await page.$eval('body', (b) => b.innerText.slice(0, 500));
  console.log('detail page:', text.replace(/\n+/g, ' | '));
  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error('DRIVER FAIL:', e.message); process.exit(1); });
