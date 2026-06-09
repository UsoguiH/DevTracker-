// Screenshot the AI Chat preview AND exercise its buttons to prove they work.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const out = path.join(__dirname, '..', 'shots');
  fs.mkdirSync(out, { recursive: true });
  const shot = (f) => page.screenshot({ path: path.join(out, f) });

  // ── 1. Empty hero state ────────────────────────────────────────────────
  await page.goto('http://localhost:3001/preview.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await shot('chat-empty.png');

  // ── 2. Model switcher opens ────────────────────────────────────────────
  await page.getByRole('button', { name: /DevTracker PM/ }).first().click();
  await page.waitForTimeout(300);
  await shot('chat-model-menu.png');
  const modelMenu = await page.getByText('Smarter — deeper reasoning').isVisible();
  await page.mouse.click(640, 760); // click away

  // ── 3. Tools menu opens ────────────────────────────────────────────────
  await page.getByRole('button', { name: 'Tools' }).click();
  await page.waitForTimeout(300);
  await shot('chat-tools-menu.png');
  const toolsMenu = await page.getByText('Find blockers').isVisible();
  await page.mouse.click(200, 200);

  // ── 4. Conversation state + message hover actions ──────────────────────
  await page.goto('http://localhost:3001/preview.html?state=convo', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  await page.getByText('The login endpoint is the riskiest').hover();
  await page.waitForTimeout(300);
  await shot('chat-convo.png');

  // ── 5. Sidebar search filters threads ──────────────────────────────────
  await page.getByRole('button', { name: 'Search chats' }).click();
  await page.getByPlaceholder('Search chats').fill('login');
  await page.waitForTimeout(300);
  await shot('chat-search.png');

  // ── 6. New chat resets to empty hero ───────────────────────────────────
  await page.getByRole('button', { name: 'New chat' }).first().click();
  await page.waitForTimeout(300);
  const heroBack = await page.getByText('What can I help you ship?').isVisible();

  console.log(JSON.stringify({
    modelMenuOpens: modelMenu,
    toolsMenuOpens: toolsMenu,
    newChatResets: heroBack,
  }));

  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
