// Screenshot the Claude-styled Risk Radar / Sprint Planning / Daily Briefing views.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 });
await page.goto('http://localhost:3001/preview.html?view=app-hub', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const open = async (card, name, extra) => {
  await page.getByText(card, { exact: true }).first().click();
  await page.waitForTimeout(800);
  if (extra) await extra();
  await page.screenshot({ path: `scripts/shots/${name}.png` });
  await page.getByText('AI hub', { exact: true }).click();
  await page.waitForTimeout(500);
};

await open('Risk Radar', 'tool-risk', async () => {
  await page.getByText('Overdue', { exact: true }).click(); // expand a risk card
  await page.waitForTimeout(500);
});
await open('Sprint Planning', 'tool-planning');
await open('Daily Briefing', 'tool-briefing');

console.log('saved tool-risk.png, tool-planning.png, tool-briefing.png');
await browser.close();
