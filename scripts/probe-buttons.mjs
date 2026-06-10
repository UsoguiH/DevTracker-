// Probe why the chat top-bar buttons are unclickable after collapsing the sidebar.
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
await page.goto('http://localhost:3001/preview.html?view=app-chat', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Collapse the chat sidebar
await page.getByTitle('Close sidebar').click();
await page.waitForTimeout(400);

// Where are the open-sidebar / new-chat buttons, and what's on top of them?
for (const title of ['Open sidebar', 'New chat']) {
  const btn = page.getByTitle(title).first();
  const box = await btn.boundingBox();
  if (!box) { console.log(`${title}: NOT FOUND/no box`); continue; }
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const top = await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y);
    const desc = (e) => e ? `${e.tagName}.${(e.className?.toString() || '').slice(0, 80)}` : 'null';
    return { top: desc(el), chain: el ? [el, el.parentElement, el.parentElement?.parentElement].map(desc) : [] };
  }, [cx, cy]);
  console.log(`${title} @ (${Math.round(cx)},${Math.round(cy)})`, JSON.stringify(top, null, 1));
}

// Try clicking "Open sidebar" and see if the sidebar comes back
await page.getByTitle('Open sidebar').click({ timeout: 3000 }).catch(e => console.log('click failed:', e.message.split('\n')[0]));
await page.waitForTimeout(400);
const sidebarVisible = await page.getByText('Search chats').isVisible().catch(() => false);
console.log('sidebar visible after click:', sidebarVisible);
await page.screenshot({ path: 'scripts/shots/probe.png' });
await browser.close();
