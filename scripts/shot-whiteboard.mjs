// Screenshot the full Space (whiteboard) with the Claude panel opened via the pill.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 });

await page.goto('http://localhost:3001/preview.html?view=whiteboard', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.screenshot({ path: 'scripts/shots/space-closed.png' });

await page.getByRole('button', { name: 'Claude' }).click();
await page.waitForTimeout(700); // panel entry animation
await page.screenshot({ path: 'scripts/shots/space-open.png' });
console.log('saved space-closed.png, space-open.png');

await browser.close();
