const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000); // let auth resolve + GSAP entrance finish
  await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'login.png') });
  // also capture sign-up mode
  try {
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(__dirname, '..', 'shots', 'login-signup.png') });
  } catch (e) { console.log('signup toggle:', e.message); }
  console.log('done');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
