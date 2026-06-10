// Verify chats persist across reloads: send a message, reload, check Recents.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
await page.goto('http://localhost:3001/preview.html?view=app-chat', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('devtrack-ai-chats-preview'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

// Send a message (AI server may be down — the error reply still forms a thread)
await page.getByPlaceholder('How can I help you today?').fill('remember this chat please');
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);

// Reload and check the thread survived into Recents
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
const recent = await page.getByText('remember this chat please').first().isVisible().catch(() => false);
console.log('thread in Recents after reload:', recent);
await page.screenshot({ path: 'scripts/shots/persist.png' });
await browser.close();
