// End-to-end test of the Claude-styled AI Manager: chat (real AI round trip),
// persistence, sidebar toggles, and the three tool views with live Claude calls.
import { chromium } from 'playwright';

const results = [];
const ok = (name, pass, note = '') => { results.push({ name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
page.setDefaultTimeout(8000);

// ── 1. Chat: hero renders ───────────────────────────────────────────────────
await page.goto('http://localhost:3001/preview.html?view=app-chat', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.removeItem('devtrack-ai-chats-preview'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
ok('chat hero greeting', await page.getByText('What can I help you ship?').isVisible().catch(() => false));
ok('chat composer placeholder', await page.getByPlaceholder('How can I help you today?').isVisible().catch(() => false));

// ── 2. Chat: real AI round trip via claude -p ───────────────────────────────
await page.getByPlaceholder('How can I help you today?').fill('Say hello in one short sentence. Do not create tasks.');
await page.keyboard.press('Enter');
let aiReplied = false;
try {
  // serif AI prose appears (and is not the connection-error message)
  await page.waitForFunction(() => {
    const els = [...document.querySelectorAll('div')];
    return els.some(e => e.style.fontFamily.includes('Source Serif') && e.textContent.length > 5);
  }, { timeout: 90000 });
  const text = await page.evaluate(() => {
    const els = [...document.querySelectorAll('div')].filter(e => e.style.fontFamily.includes('Source Serif'));
    return els.map(e => e.textContent).join(' ');
  });
  aiReplied = !text.includes('connection error');
  ok('chat: live Claude reply', aiReplied, text.slice(0, 90));
} catch { ok('chat: live Claude reply', false, 'timed out after 90s'); }

// ── 3. Persistence after reload ─────────────────────────────────────────────
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(800);
ok('chat persisted to Recents', await page.getByText('Say hello in one short').first().isVisible().catch(() => false));

// ── 4. Sidebar collapse / reopen ────────────────────────────────────────────
await page.getByTitle('Close sidebar').click();
await page.waitForTimeout(300);
await page.getByTitle('Open sidebar').click();
await page.waitForTimeout(300);
ok('sidebar collapse/reopen', await page.getByText('Search chats').isVisible().catch(() => false));

// ── 5. Tool views with live Claude calls ────────────────────────────────────
await page.goto('http://localhost:3001/preview.html?view=app-hub', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Risk Radar
await page.getByText('Risk Radar', { exact: true }).first().click();
await page.waitForTimeout(600);
ok('risk: serif header + gauge', await page.getByText('How healthy is Cafe App?').isVisible().catch(() => false));
await page.getByText('Overdue', { exact: true }).click();
await page.waitForTimeout(400);
ok('risk: card expands', await page.getByText('Past their end date and not done').isVisible().catch(() => false));
await page.getByText('Ask Claude for recommendations').click();
try {
  await page.waitForSelector("text=Claude's recommendations", { timeout: 90000 });
  const recText = await page.evaluate(() => document.body.innerText);
  ok('risk: live recommendations', !recText.includes('Could not reach Claude'));
} catch { ok('risk: live recommendations', false, 'timed out'); }
await page.getByText('AI hub', { exact: true }).click();
await page.waitForTimeout(500);

// Sprint Planning
await page.getByText('Sprint Planning', { exact: true }).first().click();
await page.waitForTimeout(600);
ok('planning: serif header + composer', await page.getByPlaceholder('Anything this sprint should focus on? (optional)').isVisible().catch(() => false));
await page.getByPlaceholder('Anything this sprint should focus on? (optional)').fill('polish the drive-thru ordering flow');
await page.getByText('Draft sprint').click();
try {
  await page.waitForSelector('text=Proposed sprint', { timeout: 120000 });
  ok('planning: live sprint draft', true);
  ok('planning: commit button', await page.getByText('Commit sprint').isVisible().catch(() => false));
} catch {
  const err = await page.evaluate(() => document.body.innerText.includes('Could not reach Claude') || document.body.innerText.includes('did not propose'));
  ok('planning: live sprint draft', false, err ? 'error state shown (graceful)' : 'timed out');
}
await page.getByText('AI hub', { exact: true }).click();
await page.waitForTimeout(500);

// Daily Briefing
await page.getByText('Daily Briefing', { exact: true }).first().click();
await page.waitForTimeout(600);
ok('briefing: serif greeting', await page.locator('h1').filter({ hasText: ', You.' }).isVisible().catch(() => false));
ok('briefing: focus list', await page.getByText("Today's focus").isVisible().catch(() => false));
await page.getByText('Have Claude write your standup').click();
try {
  await page.waitForSelector('text=Daily standup', { timeout: 90000 });
  const t = await page.evaluate(() => document.body.innerText);
  ok('briefing: live standup', !t.includes('Could not reach Claude'));
} catch { ok('briefing: live standup', false, 'timed out'); }

// ── 6. Other tabs keep their padding (Layout regression) ────────────────────
await page.goto('http://localhost:3001/preview.html?view=layout', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
const padded = await page.evaluate(() => {
  const scroller = document.querySelector('main > div.flex-1.overflow-y-auto');
  return scroller ? getComputedStyle(scroller).padding : 'missing';
});
ok('layout: non-AI tabs keep p-8', padded === '32px', `padding=${padded}`);

await browser.close();
const fails = results.filter(r => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
