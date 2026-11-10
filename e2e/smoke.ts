/**
 * End-to-end smoke test against a running server (default http://localhost:3123).
 * Clicks on the real three.js canvas (cells are projected to screen coordinates), then checks HUD state.
 *
 *   bun run build && bun run start -p 3123 &
 *   bun run e2e
 *
 * Uses the locally installed Google Chrome (override with CHROME_PATH).
 */
import { chromium, type Page } from 'playwright-core';

const URL = process.env.E2E_URL ?? 'http://localhost:3123';
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = process.env.E2E_SHOTS ?? 'e2e/screenshots';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

const status = (page: Page) => page.getByTestId('status').innerText();
const stack = (page: Page, col: number) => page.locator(`[data-col="${col}"]`).innerText();
const cellText = (page: Page, i: number) => page.locator(`[data-cell="${i}"]`).innerText();

/** Clicks the centre of a board cell on the 3D canvas. */
async function clickCell(page: Page, i: number) {
  const box = (await page.locator('canvas.scene').boundingBox())!;
  const p = await page.evaluate((i) => (window as any).__caroScene.cellScreenPosition(i), i);
  await page.mouse.click(box.x + p.x, box.y + p.y);
  await page.waitForTimeout(120);
}

/** Clicks the top of an Ember & Tide column on the 3D canvas. */
async function clickColumn(page: Page, col: number) {
  const box = (await page.locator('canvas.scene').boundingBox())!;
  const p = await page.evaluate((c) => (window as any).__fireWaterScene.columnScreenPosition(c), col);
  await page.mouse.click(box.x + p.x, box.y + p.y);
  await page.waitForTimeout(120);
}

/** Steps through “How to play” to the end, checks navigation, closes with Escape; returns the step titles. */
async function checkHelp(page: Page, game: string, steps: number): Promise<string[]> {
  await page.getByRole('button', { name: 'How to play' }).click();
  const dialog = page.getByRole('dialog', { name: 'How to play' });
  const pos = () => dialog.locator('.help-progress > span').innerText();
  check(`${game}: help opens from “?” on step 1`, (await dialog.isVisible()) && (await pos()) === `1 / ${steps}`, await pos());
  check(`${game}: focus moves into the dialog`, await page.evaluate(() => !!document.activeElement?.closest('dialog')));
  check(`${game}: Back is inactive on step 1`, (await dialog.getByRole('button', { name: 'Back' }).getAttribute('aria-disabled')) === 'true');
  const titles: string[] = [];
  for (let i = 0; i < steps; i++) {
    titles.push(await dialog.locator('.help-slide h3').innerText());
    if (i < steps - 1) await dialog.getByRole('button', { name: 'Next' }).click();
  }
  check(`${game}: ${steps} steps, the last one offers “Got it”`, (await pos()) === `${steps} / ${steps}` && (await dialog.getByRole('button', { name: 'Got it' }).isVisible()));
  await page.keyboard.press('ArrowLeft');
  check(`${game}: ← goes back a step`, (await pos()) === `${steps - 1} / ${steps}`, await pos());
  await page.screenshot({ path: `${SHOTS}/help-${game}.png` });
  await page.keyboard.press('Escape');
  check(`${game}: Escape closes help`, !(await dialog.isVisible()));
  check(`${game}: focus returns to “?”`, await page.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'How to play'));
  await page.getByRole('button', { name: 'How to play' }).click();
  check(`${game}: reopening starts again at step 1`, (await pos()) === `1 / ${steps}`, await pos());
  await page.keyboard.press('Escape');
  return titles;
}

async function playCells(page: Page, cells: number[]) {
  for (const c of cells) await clickCell(page, c);
}

const browser = await chromium.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const warnings: string[] = [];
  page.on('console', (m) => {
    // Vercel Analytics / Speed Insights scripts are only served on Vercel; locally they 404 by design.
    if (m.type() === 'error' && !m.location().url.includes('/_vercel/')) errors.push(m.text());
    if (/too many active webgl contexts/i.test(m.text())) warnings.push(m.text());
  });

  await page.goto(`${URL}/lantern-line`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => !!(window as any).__caroScene, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SHOTS}/1-start.png` });

  check('page title', (await page.title()).includes('Lantern Line'));
  check('WebGL scene mounted (no fallback message)', (await page.locator('.nogl').count()) === 0);
  check('initial status', (await status(page)).includes('Player X’s turn'), await status(page));
  const tttSteps = await checkHelp(page, 'lantern-line', 5);
  check('lantern-line help describes the vanishing rule, not a full-board draw', tttSteps.some((t) => t.includes('Only 3 marks each')) && !tttSteps.some((t) => t.includes('Full board')), tttSteps.join(' | '));

  // --- PvP: placing and the vanishing rule, by clicking the 3D canvas
  await clickCell(page, 4);
  check('click on canvas places X in the centre', (await cellText(page, 4)) === 'X');
  check('turn passes to O', (await status(page)).includes('Player O’s turn'));
  await clickCell(page, 4);
  check('occupied cell is ignored', (await status(page)).includes('Player O’s turn'));

  await page.getByRole('button', { name: 'New game' }).click();
  // New game → O starts (starter alternates). Sequence: O0 X5 O8 X6 O1 X7 → O has 3 pieces.
  check('unfinished round: the starter alternates', (await status(page)).includes('Player O’s turn'), await status(page));
  await playCells(page, [0, 5, 8, 6, 1, 7]);
  const hint = await status(page);
  check('no vanish hint in 2-player mode', !hint.includes('vanishes'), hint);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/2-vanishing-hint.png` });
  await clickCell(page, 3);
  check('4th piece removes the oldest one', (await cellText(page, 0)) === '·' && (await cellText(page, 3)) === 'O');
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/3-vanishing-anim.png` });

  // --- PvP win
  await page.getByRole('button', { name: 'New game' }).click(); // X starts
  await playCells(page, [0, 3, 1, 4, 2]);
  check('X wins with a row', (await status(page)).includes('Player X wins'), await status(page));
  check('X score incremented', (await page.getByTestId('score-x').innerText()) === '1');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS}/4-win.png` });
  await clickCell(page, 5);
  check('board locked after a win', (await cellText(page, 5)) === '·');
  await page.getByRole('button', { name: 'New game' }).click();
  check('the loser (O) starts the next round', (await status(page)).includes('Player O’s turn'), await status(page));

  // --- vs computer
  await page.getByRole('button', { name: 'vs Computer' }).click();
  check('mode switch resets scores', (await page.getByTestId('score-x').innerText()) === '0');
  check('difficulty selector visible', await page.getByRole('button', { name: 'Khó' }).isVisible());
  await clickCell(page, 4);
  check('AI thinking status', (await status(page)).includes('Computer is thinking'), await status(page));
  await page.waitForFunction(() => document.querySelector('[data-testid=status]')!.textContent!.includes('Your turn'), null, { timeout: 5000 });
  const oCount = await page.locator('[data-cell]').evaluateAll((els) => els.filter((e) => e.textContent === 'O').length);
  check('AI answered with one O', oCount === 1);

  // Keyboard path: the accessible grid works without the canvas.
  const freeCell = await page.locator('[data-cell]:not([disabled])').first().getAttribute('data-cell');
  await page.locator(`[data-cell="${freeCell}"]`).focus();
  await page.keyboard.press('Enter');
  check('keyboard grid places a piece', (await cellText(page, Number(freeCell))) === 'X', `cell ${freeCell}`);
  await page.waitForTimeout(900);

  // Let the hard AI play out against random clicks: it must never lose.
  await page.getByRole('button', { name: 'Reset score' }).click();
  let hintChecks = 0, hintMissing = 0;
  for (let turn = 0; turn < 60; turn++) {
    const s = await status(page);
    if (s.includes('win') || s.includes('Draw')) break;
    if (s.includes('Your turn')) {
      const xCount = await page.locator('[data-cell]').evaluateAll((els) => els.filter((e) => e.textContent === 'X').length);
      if (xCount === 3) { hintChecks++; if (!s.includes('vanishes')) hintMissing++; }
      const free = await page.locator('[data-cell]:not([disabled])').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.cell)));
      await clickCell(page, free[Math.floor(Math.random() * free.length)]);
    } else {
      await page.waitForTimeout(250);
    }
  }
  const final = await status(page);
  check('hard AI does not lose to random play', !final.includes('You win'), final);
  // Easy AI lets games run long enough for X to hold 3 pieces; the hint must then name the vanishing piece.
  await page.getByRole('button', { name: 'Dễ' }).click();
  for (let turn = 0; turn < 200 && hintChecks < 3; turn++) {
    const s = await status(page);
    if (s.includes('win') || s.includes('Draw')) { await page.getByRole('button', { name: 'New game' }).click(); continue; }
    if (s.includes('Your turn')) {
      const xCount = await page.locator('[data-cell]').evaluateAll((els) => els.filter((e) => e.textContent === 'X').length);
      if (xCount === 3) { hintChecks++; if (!s.includes('vanishes')) hintMissing++; }
      const free = await page.locator('[data-cell]:not([disabled])').evaluateAll((els) => els.map((e) => Number((e as HTMLElement).dataset.cell)));
      await clickCell(page, free[Math.floor(Math.random() * free.length)]);
    } else {
      await page.waitForTimeout(250);
    }
  }
  check('vs computer: vanish hint shown whenever X has 3 pieces', hintChecks > 0 && hintMissing === 0, `${hintChecks} turn(s) checked`);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${SHOTS}/5-vs-ai.png` });

  // --- Mobile layout
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await phone.goto(`${URL}/lantern-line`, { waitUntil: 'networkidle' });
  await phone.waitForTimeout(1000);
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no horizontal scroll at 390px', !overflow);
  // The top HUD (back · scoreboard · help) must stay on one row on narrow phones, against the computer too.
  await phone.getByRole('button', { name: 'Settings' }).click();
  await phone.getByRole('button', { name: 'vs Computer' }).click();
  for (const width of [390, 375, 360, 320]) {
    await phone.setViewportSize({ width, height: 700 });
    await phone.waitForTimeout(150);
    const tops = await Promise.all(['.title-back', '.scoreboard', '.help-btn'].map((sel) => phone.locator(sel).evaluate((e) => Math.round(e.getBoundingClientRect().top))));
    const fits = !(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
    check(`phone ${width}px: back, score and help share one row`, Math.max(...tops) - Math.min(...tops) <= 12 && fits, tops.join(','));
  }
  await phone.setViewportSize({ width: 375, height: 667 });
  await phone.screenshot({ path: `${SHOTS}/6b-mobile-vs-ai.png` });
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.screenshot({ path: `${SHOTS}/6-mobile.png` });

  // --- Lobby
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${SHOTS}/7-lobby.png`, fullPage: true });
  check('lobby title', (await page.title()) === 'Verdant – Free 3D Board Games in Your Browser');
  check('lobby lists all three games', (await page.locator('.game-card').count()) === 3);
  check('lobby: call to action with the mascot', await page.getByRole('heading', { name: 'Interested in working with me?' }).isVisible() && (await page.locator('.lobby-cta-art img').evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)));
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'About' }).click();
  // Anchor links scroll smoothly; wait for the glide to bring the About section to the top.
  await page.waitForFunction(() => { const t = document.querySelector('#about')!.getBoundingClientRect().top; return t >= 0 && t < 120; }, null, { timeout: 4000 }).catch(() => {});
  const aboutTop = await page.locator('#about').evaluate((e) => e.getBoundingClientRect().top);
  check('About scrolls to the About section', aboutTop >= 0 && aboutTop < 120, `section top at ${Math.round(aboutTop)}px`);
  check('About section introduces the site', (await page.locator('#about p').count()) >= 3);
  await page.screenshot({ path: `${SHOTS}/7b-lobby-about.png` });
  check('lobby: no feature cards, no “Coming soon” nav link', (await page.locator('.feature').count()) === 0 && (await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Coming soon' }).count()) === 0);
  const firstVisit = await browser.newPage();
  await firstVisit.goto(URL, { waitUntil: 'networkidle' });
  check('first visit: Play buttons go to the default game', (await firstVisit.getByTestId('play-recent-hero').innerText()).includes('Play Lantern Line') && (await firstVisit.getByTestId('play-recent-nav').getAttribute('href')) === '/lantern-line');
  for (const [from, to] of [['/tic-tac-toe', '/lantern-line'], ['/fire-and-water', '/ember-and-tide']]) {
    const res = await firstVisit.request.get(URL + from, { maxRedirects: 0 });
    check(`old address ${from} redirects to ${to}`, res.status() === 308 && (res.headers().location ?? '').endsWith(to), `${res.status()} ${res.headers().location}`);
  }
  await firstVisit.close();
  check('footer: 3 social links and 2 legal links', (await page.getByRole('navigation', { name: 'Social media' }).getByRole('link').count()) === 3 && (await page.locator('.footer-social a[href="#"]').count()) === 0 && (await page.getByRole('navigation', { name: 'Legal and site links' }).getByRole('link').count()) === 2);
  const sitemapXml = await (await page.request.get(`${URL}/sitemap.xml`)).text();
  check('sitemap.xml lists every public page', ['/lantern-line', '/ember-and-tide', '/tidepool', '/privacy', '/terms', '/sitemap'].every((p) => sitemapXml.includes(`${p}</loc>`)));
  const robots = await (await page.request.get(`${URL}/robots.txt`)).text();
  check('robots.txt allows crawling and points to the sitemap', robots.includes('Allow: /') && /Sitemap: https?:\/\/\S+\/sitemap\.xml/.test(robots), robots.replace(/\n/g, ' | '));
  await page.getByRole('navigation', { name: 'Legal and site links' }).getByRole('link', { name: 'Privacy Policy' }).click();
  await page.waitForURL('**/privacy');
  check('privacy policy page', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Privacy Policy');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.getByRole('navigation', { name: 'Legal and site links' }).getByRole('link', { name: 'Terms of Service' }).click();
  await page.waitForURL('**/terms');
  check('terms of service page', (await page.getByRole('heading', { level: 1 }).innerText()) === 'Terms of Service');
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.locator('.footer-sitemap').click();
  await page.waitForURL('**/sitemap');
  check('sitemap page: 3 sections, no placeholder links', (await page.locator('.sitemap-card').count()) === 3 && (await page.locator('.sitemap a[href="#"]').count()) === 0 && (await page.locator('.sitemap-card a[href="/ember-and-tide"]').count()) === 1);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await phone.goto(URL, { waitUntil: 'networkidle' });
  check('lobby: no horizontal scroll at 390px', !(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await phone.screenshot({ path: `${SHOTS}/8-lobby-mobile.png`, fullPage: true });

  // --- Ember & Tide
  await page.getByRole('link', { name: /Ember & Tide/ }).click();
  await page.waitForURL('**/ember-and-tide');
  await page.waitForFunction(() => !!(window as any).__fireWaterScene, null, { timeout: 15000 });
  await page.waitForTimeout(800);
  check('ember & tide title', (await page.title()).includes('Ember & Tide'));
  check('ember & tide: Fire starts', (await status(page)).includes('Fire’s turn'), await status(page));
  await checkHelp(page, 'ember-and-tide', 7);
  await page.getByRole('button', { name: 'How to play' }).click();
  for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');
  await page.getByRole('button', { name: 'Got it' }).click();
  check('ember & tide: “Got it” on the last step closes help', !(await page.getByRole('dialog', { name: 'How to play' }).isVisible()));
  await clickColumn(page, 12);
  check('click on canvas drops a piece', (await stack(page, 12)) === '1');
  check('turn passes to Water', (await status(page)).includes('Water’s turn'));
  await clickColumn(page, 12);
  check('second piece stacks when clicking the stack itself', (await stack(page, 12)) === '2', await stack(page, 12));

  await page.getByRole('button', { name: 'New game' }).click(); // Water starts
  check('ember & tide: new board', (await stack(page, 12)) === '0');
  await page.getByRole('button', { name: 'Reset score' }).click(); // Fire starts
  // Fire stacks a vertical line in one column while Water plays far away.
  for (const c of [12, 0, 12, 4, 12, 20]) await clickColumn(page, c);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/9-fire-water.png` });
  await clickColumn(page, 12);
  check('fire wins with a vertical line', (await status(page)).includes('Fire wins'), await status(page));
  check('fire score incremented', (await page.getByTestId('score-x').innerText()) === '1');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SHOTS}/10-fire-water-win.png` });
  await clickColumn(page, 6);
  check('ember & tide: board locked after a win', (await stack(page, 6)) === '0');

  await page.getByRole('button', { name: 'vs Computer' }).click();
  for (const label of ['Dễ', 'Trung bình', 'Khó']) check(`ember & tide: difficulty ${label} visible`, await page.getByRole('button', { name: label }).isVisible());
  check('ember & tide: Khó is the default', (await page.getByRole('button', { name: 'Khó' }).getAttribute('aria-pressed')) === 'true');
  await page.getByRole('button', { name: 'Trung bình' }).click();
  check('ember & tide: difficulty can be changed', (await page.getByRole('button', { name: 'Trung bình' }).getAttribute('aria-pressed')) === 'true');
  await page.screenshot({ path: `${SHOTS}/12-fire-water-difficulty.png` });
  await page.getByRole('button', { name: 'Khó' }).click();
  await clickColumn(page, 12);
  check('computer thinking status', (await status(page)).includes('thinking'), await status(page));
  await page.waitForFunction(() => document.querySelector('[data-testid=status]')!.textContent!.includes('Your turn'), null, { timeout: 5000 });
  const pieces = await page.locator('[data-col]').evaluateAll((els) => els.reduce((n, e) => n + Number(e.textContent), 0));
  check('computer answered with one piece', pieces === 2, `${pieces} pieces`);
  const freeCol = await page.locator('[data-col]:not([disabled])').first().getAttribute('data-col');
  const before = Number(await stack(page, Number(freeCol)));
  await page.locator(`[data-col="${freeCol}"]`).focus();
  await page.keyboard.press('Enter');
  check('keyboard grid drops a piece', Number(await stack(page, Number(freeCol))) === before + 1, `column ${freeCol}`);

  // One 3D scene at a time: software-rendering two at once starves the browser and actions time out.
  await page.goto('about:blank');
  await phone.goto(`${URL}/ember-and-tide`, { waitUntil: 'networkidle' });
  check('phone: toolbar hidden until Settings is tapped', !(await phone.getByRole('button', { name: 'vs Computer' }).isVisible()));
  await phone.getByRole('button', { name: 'Settings' }).click();
  await phone.getByRole('button', { name: 'vs Computer' }).click();
  await phone.waitForTimeout(1000);
  check('ember & tide: no horizontal scroll at 390px', !(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await phone.screenshot({ path: `${SHOTS}/11-fire-water-mobile.png` });
  await phone.getByRole('button', { name: 'How to play' }).click();
  const helpBox = (await phone.locator('dialog.help-dialog').boundingBox())!;
  check('help fits a 390px screen', helpBox.width <= 390 && !(await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  await phone.screenshot({ path: `${SHOTS}/help-mobile.png` });

  await phone.close();
  await page.goto(`${URL}/ember-and-tide`, { waitUntil: 'networkidle' });

  // --- The lobby's Play buttons return to the game played last
  await page.getByRole('link', { name: '← Verdant' }).click();
  await page.waitForURL(URL + '/');
  const hero = page.getByTestId('play-recent-hero');
  check('Play buttons go to the game played last', (await hero.innerText()).includes('Play Ember & Tide') && (await hero.getAttribute('href')) === '/ember-and-tide' && (await page.getByTestId('play-recent-nav').getAttribute('href')) === '/ember-and-tide', await hero.innerText());
  await hero.click();
  await page.waitForURL('**/ember-and-tide');

  // --- Repeated client-side navigation must not exhaust WebGL contexts (L1.5)
  for (let i = 0; i < 24; i++) {
    await page.getByRole('link', { name: '← Verdant' }).click();
    await page.waitForURL(URL + '/');
    await page.getByRole('link', { name: i % 2 ? /Ember & Tide/ : /Lantern Line/ }).click();
    await page.waitForURL(i % 2 ? '**/ember-and-tide' : '**/lantern-line');
    await page.waitForSelector('canvas.scene');
    await page.waitForTimeout(150);
  }
  check('no WebGL context warnings after navigating', warnings.length === 0, warnings.join(' | '));

  check('no console / page errors', errors.length === 0, errors.join(' | '));
} finally {
  await browser.close();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nAll E2E checks passed');
process.exit(failures ? 1 : 0);
