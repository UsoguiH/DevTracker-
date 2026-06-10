// Screenshot the Claude.ai-style AI Manager chat (hero + conversation).
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 }, deviceScaleFactor: 2 });

await page.goto('http://localhost:3001/preview.html', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: 'scripts/shots/chat-hero.png' });

await page.goto('http://localhost:3001/preview.html?state=convo', { waitUntil: 'networkidle' });
await page.waitForTimeout(900);
await page.screenshot({ path: 'scripts/shots/chat-convo.png' });
console.log('saved chat-hero.png, chat-convo.png');

await browser.close();
