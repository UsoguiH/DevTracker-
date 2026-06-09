const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  for (const [view, file] of [['projects', 'page-projects.png'], ['kanban', 'page-kanban.png']]) {
    await page.goto(`http://localhost:3001/preview.html?view=${view}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', file) });
    console.log('shot:', file);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
