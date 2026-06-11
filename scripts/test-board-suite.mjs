// E2E test of the Miro-grade Space board: one-shot tools, blue dots, frames,
// templates, prototype play mode, voting, timer, minimap, persistence.
import { chromium } from 'playwright';

const results = [];
const ok = (name, pass, note = '') => { results.push({ name, pass }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${note ? ' — ' + note : ''}`); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 860 } });
page.setDefaultTimeout(6000);

const BASE = process.env.BASE || 'http://localhost:3002';
await page.goto(`${BASE}/preview.html?view=whiteboard`, { waitUntil: 'networkidle', timeout: 60000 });
await page.evaluate(() => localStorage.removeItem('devtracker-board-p1'));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);

// ── 1. One-shot sticky: create, type, tool reverts to select ────────────────
await page.getByTitle('Sticky note (N)').click();
await page.mouse.click(980, 620); // away from the empty-state CTA
await page.waitForTimeout(250);
await page.keyboard.type('First idea');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
ok('sticky created via tool', await page.getByText('First idea').isVisible().catch(() => false));
const selectActive = await page.getByTitle('Select (V)').evaluate(el => el.className.includes('D97757'));
ok('one-shot: tool reverted to Select', selectActive);

// ── 2. Blue dots: click east dot → connected twin + connector ───────────────
await page.getByText('First idea').click();
await page.waitForTimeout(200);
const dots = page.locator('[title="Click: add connected copy · Drag: connect"]');
ok('blue dots appear on selection', await dots.count() === 4);
await dots.nth(1).click(); // 'e' dot (n,e,s,w order)
await page.waitForTimeout(300);
await page.keyboard.type('Connected idea');
await page.keyboard.press('Escape');
await page.waitForTimeout(250);
const lineCount = await page.locator('svg line[marker-end]').count();
ok('blue dot spawned connected twin', await page.getByText('Connected idea').isVisible().catch(() => false) && lineCount >= 1, `${lineCount} connector(s)`);

// ── 3. Frame via keyboard F + drag, frames panel lists it ───────────────────
await page.keyboard.press('Escape');
await page.keyboard.press('f');
await page.mouse.move(380, 250);
await page.mouse.down();
await page.mouse.move(660, 520, { steps: 5 });
await page.mouse.up();
await page.waitForTimeout(300);
await page.getByTitle('Frames', { exact: true }).click();
await page.waitForTimeout(300);
ok('frame created + listed in panel', await page.getByText('Frame 1').first().isVisible().catch(() => false));
// presentation mode from panel
await page.getByTitle('Present', { exact: true }).click();
await page.waitForTimeout(500);
ok('presentation mode shows slide controls', await page.getByText('1/1').isVisible().catch(() => false));
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

// ── 4. Templates: stamp the kanban template ─────────────────────────────────
await page.getByTitle('Templates').click();
await page.waitForTimeout(400);
ok('templates modal opens', await page.getByText('All templates').isVisible().catch(() => false) || await page.getByPlaceholder('Search templates').isVisible().catch(() => false));
await page.getByText('Kanban board', { exact: true }).click();
await page.waitForTimeout(500);
ok('kanban template stamped', await page.getByText('In progress', { exact: true }).isVisible().catch(() => false));

// ── 5. Kanban interaction: add a card ───────────────────────────────────────
await page.getByText('+ Card').first().click();
await page.waitForTimeout(200);
await page.keyboard.type('Try the board');
await page.keyboard.press('Enter');
await page.waitForTimeout(250);
ok('kanban card added + edited', await page.getByText('Try the board').isVisible().catch(() => false));

// ── 6. Prototype template + play mode with hotspot navigation ───────────────
await page.getByTitle('Templates').click();
await page.waitForTimeout(300);
await page.getByText('Mobile app prototype').click();
await page.waitForTimeout(500);
ok('prototype screens stamped', await page.getByText('Welcome aboard').isVisible().catch(() => false));
await page.getByTitle('Play prototype').click();
await page.waitForTimeout(400);
ok('play mode opens', await page.getByText('Prototype ·').isVisible().catch(() => false));
// click the "Sign in" hotspot → should navigate to the Log in screen
await page.getByRole('button', { name: 'Sign in', exact: true }).click();
await page.waitForTimeout(300);
ok('hotspot navigates to linked screen', await page.getByText('Prototype · Log in').isVisible().catch(() => false));
await page.locator('button').filter({ hasText: /^Log in$/ }).click();
await page.waitForTimeout(300);
ok('second hotspot reaches Home', await page.getByText('Prototype · Home').isVisible().catch(() => false));
await page.keyboard.press('Escape');
await page.locator('[data-board-ui] >> text=Prototype ·').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
// close via X if Escape didn't (modal has its own close)
if (await page.getByText('Prototype ·').isVisible().catch(() => false)) {
  await page.locator('div[data-board-ui] button').filter({ has: page.locator('svg') }).last().click().catch(() => {});
}
await page.waitForTimeout(300);

// ── 7. Voting mode adds a vote badge ────────────────────────────────────────
await page.getByTitle('Voting mode — click items to vote (Alt-click removes)').click();
await page.getByText('First idea').click();
await page.waitForTimeout(250);
const voteBadge = await page.locator('text="1"').first().isVisible().catch(() => false);
ok('voting mode adds vote badge', voteBadge);
await page.keyboard.press('Escape');

// ── 8. Timer starts and shows countdown ─────────────────────────────────────
await page.getByTitle('Timer').click();
await page.getByText('1 minute', { exact: true }).click();
await page.waitForTimeout(1600); // let at least one tick elapse
const timerText = await page.locator('.font-mono').filter({ hasText: ':' }).first().textContent().catch(() => '');
ok('timer counts down', /^0:5\d$/.test((timerText || '').trim()), timerText || 'no timer');

// ── 9. Minimap + grid toggle ────────────────────────────────────────────────
ok('minimap visible', await page.getByTitle('Minimap', { exact: true }).isVisible().catch(() => false));
await page.getByTitle('Grid', { exact: true }).click();
await page.waitForTimeout(200);
const gridOff = await page.evaluate(() => {
  const canvas = document.querySelector('.bg-canvas.select-none');
  return canvas ? getComputedStyle(canvas).backgroundImage === 'none' : false;
});
ok('grid toggles off', gridOff);

// ── 10. Persistence across reload ───────────────────────────────────────────
await page.waitForTimeout(700); // let the debounced save fire
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
ok('board persists after reload', await page.getByText('First idea').isVisible().catch(() => false)
    && await page.getByText('Welcome aboard').isVisible().catch(() => false));

await page.screenshot({ path: 'scripts/shots/board-final.png', fullPage: false });
await browser.close();
const fails = results.filter(r => !r.pass);
console.log(`\n${results.length - fails.length}/${results.length} passed`);
process.exit(fails.length ? 1 : 0);
