// Screenshot harness for the Claude canvas copilot panel redesign.
// Usage: node scripts/shot-board-panel.mjs [outDir]
import { chromium } from 'playwright';

const out = process.argv[2] ?? 'scripts/shots';
const base = 'http://localhost:3001/preview.html?view=space';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2 });

const shots = [
  { url: `${base}&state=empty`, name: 'panel-empty' },
  { url: base, name: 'panel-convo' },
  { url: `${base}&state=busy`, name: 'panel-busy' },
];

for (const { url, name } of shots) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900); // fonts + entry animation
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(`saved ${out}/${name}.png`);
}

await browser.close();
