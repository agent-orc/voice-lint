// Browser-only layout checks. The isolated context changes local UI preferences;
// project/source writes and model requests are rejected before transmission.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { readSession } from './session.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = new URL(process.env.VOICE_STUDIO_URL ?? 'http://127.0.0.1:5188/');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Studio must be local.');
const target = new URL(base);
target.searchParams.set('project', process.env.VOICE_SPLIT_PROJECT ?? 'project-f80c52d87170');
const evidence = path.join(root, 'test-results/split-layout');
await fs.mkdir(evidence, { recursive: true });
const session = await readSession(root);
const browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 15000 });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US', hasTouch: true });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const errors = [];
const prohibitedRequests = [];
const checks = [];
const visualSamples = {};
const check = (condition, description) => { assert.ok(condition, description); checks.push(description); };
page.on('pageerror', error => errors.push(error.message));
await context.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const sessionRequest = /^\/api\/session\/(?:pair|resume|logout)$/.test(url.pathname);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !sessionRequest) {
    prohibitedRequests.push(`${request.method()} ${url.pathname}`);
    await route.abort('blockedbyclient');
  } else await route.continue();
});

const settleLayout = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const splitter = () => page.locator('#review-splitter');
const panel = () => page.locator('#voice-review-panel');
const handle = () => page.locator('#focus-tools-drag');
const tools = () => page.locator('.focus-tools');
const preference = name => page.evaluate(key => localStorage.getItem(key), name);
const widthPreference = async () => Number(await preference('voice-studio:review-width'));
const focusMode = () => page.locator('voice-studio').evaluate(element => element.classList.contains('focus-navigation'));
const box = async locator => {
  const result = await locator.boundingBox();
  assert.ok(result, 'Visible element has a bounding box.');
  return result;
};
const frameReady = async () => {
  await page.locator('iframe.live-frame').waitFor();
  await page.frameLocator('iframe.live-frame').locator('body').waitFor();
};
async function authenticate() {
  await page.locator('#pairing-code').waitFor();
  await page.locator('#pairing-code').fill(session.pairingCode);
  await page.locator('#remember-browser').uncheck();
  await page.getByRole('button', { name: 'Open local Studio', exact: true }).click();
  await frameReady();
  const hideFiles = page.getByRole('button', { name: 'Hide files', exact: true });
  if (await hideFiles.isVisible()) await hideFiles.click();
}
async function review(open) {
  if (await panel().isVisible() === open) return;
  const scope = await focusMode() ? tools() : page.locator('.workspace-actions');
  await scope.getByRole('button', { name: open ? 'Open review' : 'Close review', exact: true }).click();
  if (open) await expect(panel()).toBeVisible(); else await expect(panel()).toBeHidden();
  await settleLayout();
}
async function mode(value) {
  if (await focusMode()) {
    await tools().getByRole('button', { name: /Navigation$/ }).click();
    await page.getByRole('dialog', { name: 'Navigation', exact: true }).getByRole('combobox', { name: 'Navigation', exact: true }).selectOption(value);
  } else await page.locator('.studio-header').getByRole('combobox', { name: 'Navigation', exact: true }).selectOption(value);
  await expect.poll(() => preference('voice-studio:navigation')).toBe(value);
  await frameReady();
  await settleLayout();
}
async function adjacent(label) {
  await expect(splitter()).toBeVisible();
  await expect(panel()).toBeVisible();
  const geometry = await page.evaluate(() => {
    const measure = selector => {
      const element = document.querySelector(selector);
      if (!element) throw new Error(`Missing layout element ${selector}`);
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom, position: getComputedStyle(element).position };
    };
    return {
      document: measure('.document-pane'), frame: measure('iframe.live-frame'),
      separator: measure('#review-splitter'), review: measure('#voice-review-panel'),
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth
    };
  });
  const { document: documentPane, frame, separator, review: reviewPane } = geometry;
  check(documentPane.right <= separator.x + 2 && separator.right <= reviewPane.x + 2,
    `${label}: document, separator and review occupy separate adjacent columns.`);
  check(frame.right <= reviewPane.x + 2 && frame.width >= 100 && reviewPane.width >= 170,
    `${label}: both website and review retain visible width without overlap.`);
  check(Math.min(documentPane.bottom, reviewPane.bottom) > Math.max(documentPane.y, reviewPane.y) + 100,
    `${label}: review remains beside the website, including narrow viewports.`);
  check(!['fixed', 'absolute'].includes(reviewPane.position), `${label}: review is part of the page layout.`);
  check(reviewPane.right <= geometry.viewport + 2 && geometry.documentWidth <= geometry.viewport + 2,
    `${label}: Studio has no horizontal viewport overflow.`);
  const min = Number(await splitter().getAttribute('aria-valuemin'));
  const max = Number(await splitter().getAttribute('aria-valuemax'));
  const now = Number(await splitter().getAttribute('aria-valuenow'));
  check(Number.isFinite(min) && max >= min && now >= min - 1 && now <= max + 1 && Math.abs(now - reviewPane.width) <= 2,
    `${label}: separator exposes the current width and available limits to assistive technology.`);
  assert.equal(await splitter().getAttribute('role'), 'separator');
  assert.equal(await splitter().getAttribute('aria-orientation'), 'vertical');
  assert.equal(await splitter().getAttribute('aria-controls'), 'voice-review-panel');
  return geometry;
}
async function headerControls(label) {
  const controls = await page.locator('.studio-header').evaluate(header => {
    const headerBounds = header.getBoundingClientRect();
    return [...header.querySelectorAll('select')].map(control => {
      const bounds = control.getBoundingClientRect();
      const topElement = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return { name: control.getAttribute('aria-label'), visible: bounds.width > 0 && bounds.height > 0, bottom: bounds.bottom, headerBottom: headerBounds.bottom, unobscured: topElement === control || control.contains(topElement) };
    });
  });
  check(controls.length >= 2 && controls.every(control => control.visible && control.bottom <= control.headerBottom + 2 && control.unobscured),
    label + ': language and layout controls fit within the header and remain unobscured. ' + JSON.stringify(controls));
}

async function viewportCoverage(label) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleLayout();
  await expect.poll(async () => {
    const frame = await box(page.locator('iframe.live-frame'));
    return Math.abs(frame.y + frame.height - page.viewportSize().height);
  }).toBeLessThanOrEqual(2);
  const frame = await box(page.locator('iframe.live-frame'));
  check(frame.height > 150, label + ': the live website fills the remaining viewport down to its bottom edge.');
}

async function connectionDetails(label) {
  const live = page.locator('voice-live-browser');
  const badge = live.locator('.browser-connection-badge');
  const details = page.locator('#browser-connection-details');
  await expect(badge).toBeVisible();
  await expect(details).toBeHidden();
  check(await live.locator('.browser-status:visible').count() === 0 && await live.locator('.mapping-note:visible').count() === 0 && await live.locator('.bridge-help').count() === 0,
    label + ': connection details do not occupy persistent rows or a bottom help block.');
  const before = await box(page.locator('iframe.live-frame'));
  await badge.click();
  await expect(details).toBeVisible();
  await expect(badge).toHaveAttribute('aria-expanded', 'true');
  const after = await box(page.locator('iframe.live-frame'));
  check(JSON.stringify(before) === JSON.stringify(after), label + ': opening connection details preserves the website dimensions.');
  check(await details.locator('#browser-source').count() === 1 && await details.locator('.mapping-note').count() === 1,
    label + ': the connection popover contains source mapping and connection details.');
  await page.keyboard.press('Escape');
  await expect(details).toBeHidden();
  await expect(badge).toHaveAttribute('aria-expanded', 'false');
  const toolbarFits = await live.locator('.browser-toolbar').evaluate(element => element.scrollWidth <= element.clientWidth + 2);
  check(toolbarFits, label + ': the compact toolbar fits the available website column.');
}

async function mouseDrag(locator, deltaX, deltaY = 0) {
  const bounds = await box(locator);
  const viewport = page.viewportSize();
  const start = { x: bounds.x + bounds.width / 2, y: Math.min(bounds.y + bounds.height / 2, viewport.height - 30) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 10 });
  await page.mouse.up();
  await settleLayout();
}
async function touchDrag(locator, deltaX, deltaY = 0) {
  const bounds = await box(locator);
  const viewport = page.viewportSize();
  const start = { x: bounds.x + bounds.width / 2, y: Math.min(bounds.y + bounds.height / 2, viewport.height - 40) };
  const cdp = await context.newCDPSession(page);
  const point = (x, y) => [{ x, y, radiusX: 5, radiusY: 5, force: 1, id: 1 }];
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(start.x, start.y) });
    for (let step = 1; step <= 6; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(start.x + deltaX * step / 6, start.y + deltaY * step / 6) });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally { await cdp.detach(); }
  await settleLayout();
}
async function toolsWithinViewport(label) {
  await expect.poll(async () => {
    const bounds = await box(tools());
    const viewport = page.viewportSize();
    return bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1;
  }).toBe(true);
  check(true, `${label}: all floating controls remain within the viewport.`);
  return box(tools());
}

try {
  await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await authenticate();

  const sidebar = page.locator('#project-sidebar');
  const sidebarSplitter = page.locator('#sidebar-splitter');
  const projectsToggle = page.locator('#toggle-sidebar-projects');
  const filesToggle = page.locator('#toggle-sidebar-files');
  const openFiles = () => page.locator('.workspace-actions').getByRole('button', { name: 'Projects and files', exact: true }).click();
  await openFiles();
  await expect(sidebarSplitter).toBeVisible();
  assert.equal(await sidebarSplitter.getAttribute('role'), 'separator');
  assert.equal(await sidebarSplitter.getAttribute('aria-orientation'), 'vertical');
  assert.equal(await sidebarSplitter.getAttribute('aria-controls'), 'project-sidebar');
  await sidebarSplitter.focus();
  await page.keyboard.press('Home');
  await settleLayout();
  const sidebarMinimum = (await box(sidebar)).width;
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await box(sidebar)).width).toBeGreaterThan(sidebarMinimum + 10);
  const sidebarBeforeDrag = (await box(sidebar)).width;
  await mouseDrag(sidebarSplitter, 70);
  await expect.poll(async () => (await box(sidebar)).width).toBeGreaterThan(sidebarBeforeDrag + 50);
  check(true, 'The left sidebar resizes with the keyboard and pointer.');
  const sideBounds = await box(sidebar);
  const workspaceBounds = await box(page.locator('.workspace'));
  check(sideBounds.x + sideBounds.width <= workspaceBounds.x + 2, 'The sidebar remains beside the workspace after resizing.');
  const storedSidebarWidth = Number(await preference('voice-studio:sidebar-width'));
  check(Number.isFinite(storedSidebarWidth) && Math.abs(storedSidebarWidth - sideBounds.width) <= 2,
    'The sidebar stores its chosen width as a browser preference.');
  await projectsToggle.click();
  await expect(projectsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#sidebar-projects')).toBeHidden();
  await expect(page.locator('#sidebar-files')).toBeVisible();
  check(true, 'Projects collapse independently while the file tree remains visible.');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await authenticate();
  await openFiles();
  await expect.poll(async () => (await box(sidebar)).width).toBeCloseTo(sideBounds.width, 0);
  await expect(projectsToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(filesToggle).toHaveAttribute('aria-expanded', 'true');
  check(Number(await preference('voice-studio:sidebar-width')) === storedSidebarWidth,
    'Sidebar width and independent section choices survive reload.');
  await filesToggle.click();
  await projectsToggle.click();
  await expect(filesToggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#sidebar-files')).toBeHidden();
  await expect(page.locator('#sidebar-projects')).toBeVisible();
  check(true, 'Files collapse independently while project navigation remains visible.');
  await filesToggle.click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await settleLayout();
  for (const folder of ['src/', 'app/', 'content/']) {
    const folderButton = page.locator('#sidebar-files').getByRole('button', { name: folder, exact: true });
    if (!await folderButton.isVisible()) break;
    await folderButton.click();
    await settleLayout();
  }
  await expect(page.locator('#sidebar-files .file-button:not(.folder-button)').first()).toBeVisible();
  visualSamples.sidebar = await page.evaluate(() => {
    const measure = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const { x, y, width, height, bottom, right } = element.getBoundingClientRect();
      return { x, y, width, height, bottom, right, scrollHeight: element.scrollHeight };
    };
    return {
      viewport: { width: innerWidth, height: innerHeight },
      sidebar: measure('#project-sidebar'), projects: measure('#sidebar-projects'), files: measure('#sidebar-files'), tree: measure('.file-list'),
      projectRowHeights: [...document.querySelectorAll('.project-button')].map(element => element.getBoundingClientRect().height)
    };
  });
  check(visualSamples.sidebar.sidebar.bottom <= visualSamples.sidebar.viewport.height + 2,
    'The open Studio sidebar ends within the visible viewport below the header.');
  check(visualSamples.sidebar.tree.bottom <= visualSamples.sidebar.viewport.height + 2,
    'The file tree keeps its lower scroll boundary inside the visible viewport.');
  await fs.writeFile(path.join(evidence, 'sidebar-geometry.json'), JSON.stringify(visualSamples.sidebar, null, 2) + '\n');
  const fileTree = page.locator('#sidebar-files .file-list');
  await fileTree.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await settleLayout();
  const lastFile = await box(fileTree.locator('.file-button').last());
  const treeBounds = await box(fileTree);
  check(lastFile.y >= treeBounds.y - 2 && lastFile.y + lastFile.height <= Math.min(treeBounds.y + treeBounds.height, page.viewportSize().height) + 2,
    'The last file remains reachable by scrolling the file tree within the viewport.');
  await fileTree.evaluate(element => { element.scrollTop = 0; });
  await settleLayout();
  await page.screenshot({ path: path.join(evidence, 'sidebar-open-desktop.png') });
  check(await page.locator('#sidebar-projects').isVisible() && await page.locator('#sidebar-files').isVisible(),
    'A desktop visual sample shows the Studio sidebar with both projects and files expanded.');
  await page.getByRole('button', { name: 'Hide files', exact: true }).click();

  for (const layout of ['full', 'compact', 'focus']) {
    await mode(layout);
    await review(false);
    const closedFrame = await box(page.locator('iframe.live-frame'));
    await review(true);
    const opened = await adjacent(`Desktop ${layout}`);
    check(opened.frame.width < closedFrame.width - 100, `Desktop ${layout}: opening review allocates width from the website.`);
    await splitter().focus();
    await page.keyboard.press('Home');
  await settleLayout();
    await expect.poll(async () => Number(await splitter().getAttribute('aria-valuenow')) - Number(await splitter().getAttribute('aria-valuemin'))).toBe(0);
    const narrow = await box(panel());
    await page.keyboard.press('ArrowLeft');
    await expect.poll(async () => (await box(panel())).width).toBeGreaterThan(narrow.width + 10);
    const beforeDrag = await box(panel());
    await mouseDrag(splitter(), -80);
    await expect.poll(async () => (await box(panel())).width).toBeGreaterThan(beforeDrag.width + 60);
    check(true, `Desktop ${layout}: keyboard and pointer resize the review, including pointer travel across the iframe.`);
    await adjacent(`Desktop ${layout} after resizing`);
    if (layout !== 'focus') { await connectionDetails(`Desktop ${layout}`); await viewportCoverage(`Desktop ${layout}`); }
    await page.screenshot({ path: path.join(evidence, `${layout}-desktop.png`) });
  }

  await splitter().focus();
  await page.keyboard.press('End');
  await expect.poll(async () => Number(await splitter().getAttribute('aria-valuenow')) - Number(await splitter().getAttribute('aria-valuemax'))).toBe(0);
  check(true, 'End reaches the available review width; Home reaches its minimum.');
  await page.keyboard.press('Home');
  await settleLayout();
  for (let index = 0; index < 8; index++) await page.keyboard.press('ArrowLeft');
  await settleLayout();
  const savedWidth = await widthPreference();
  const beforeReload = (await box(panel())).width;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await authenticate();
  check(await focusMode(), 'The navigation mode survives reload in the isolated browser.');
  await review(true);
  await expect.poll(async () => (await box(panel())).width).toBeCloseTo(beforeReload, 0);
  check(await widthPreference() === savedWidth, 'The desired review width survives reload.');

  await review(false);
  await handle().focus();
  await page.keyboard.press('Home');
  await settleLayout();
  const initialTools = await box(tools());
  await mouseDrag(handle(), 470, 240);
  const movedTools = await toolsWithinViewport('Mouse move');
  check(movedTools.x > initialTools.x + 400 && movedTools.y > initialTools.y + 200, 'Dragging the dedicated handle moves the floating controls.');
  check(await page.getByRole('dialog', { name: 'Navigation', exact: true }).isVisible() === false,
    'Moving the handle does not activate navigation or review.');
  await handle().focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Shift+ArrowDown');
  await settleLayout();
  const keyboardTools = await box(tools());
  check(keyboardTools.x >= movedTools.x + 9 && keyboardTools.y >= movedTools.y + 39, 'Arrow keys move the handle; Shift increases the step.');
  const savedPosition = JSON.parse(await preference('voice-studio:focus-tools-position'));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await authenticate();
  const restoredTools = await toolsWithinViewport('Reload');
  check(Math.abs(restoredTools.x - savedPosition.x) <= 2 && Math.abs(restoredTools.y - savedPosition.y) <= 2,
    'The floating position survives reload.');

  await page.setViewportSize({ width: 390, height: 844 });
  await toolsWithinViewport('Narrow viewport');
  await review(true);
  await adjacent('Mobile focus after desktop resize');
  check(await widthPreference() === savedWidth, 'A narrow viewport clamps the visible panel without overwriting the saved desktop width.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect.poll(async () => (await box(panel())).width).toBeCloseTo(beforeReload, 0);
  check(true, 'Returning to a wide viewport restores the desired review width.');
  await page.setViewportSize({ width: 390, height: 844 });

  for (const layout of ['full', 'compact', 'focus']) {
    await mode(layout);
    await review(true);
    await splitter().focus();
    await page.keyboard.press('Home');
  await settleLayout();
    await page.keyboard.press('ArrowLeft');
    await settleLayout();
    const beforeTouch = (await box(panel())).width;
    await touchDrag(splitter(), 14);
    await expect.poll(async () => (await box(panel())).width).toBeLessThan(beforeTouch - 5);
    check(true, `Mobile ${layout}: real touch input resizes the separator.`);
    await adjacent(`Mobile ${layout}`);
    if (layout !== 'focus') { await connectionDetails(`Mobile ${layout}`); await viewportCoverage(`Mobile ${layout}`); await headerControls(`Mobile ${layout}`); }
    await page.screenshot({ path: path.join(evidence, `${layout}-mobile.png`) });
  }

  await review(false);
  await handle().focus();
  await page.keyboard.press('Home');
  await settleLayout();
  const beforeTouch = await box(tools());
  await touchDrag(handle(), 35, 110);
  const afterTouch = await toolsWithinViewport('Touch move');
  check(afterTouch.x > beforeTouch.x + 10 && afterTouch.y > beforeTouch.y + 80, 'Real touch input moves the floating controls. ' + JSON.stringify({beforeTouch,afterTouch}));
  await handle().focus();
  await page.keyboard.press('End');
  await toolsWithinViewport('End key');
  await page.setViewportSize({ width: 320, height: 568 });
  await toolsWithinViewport('Smaller viewport after End');
  const collapsedFrame = await box(page.locator('iframe.live-frame'));
  check(collapsedFrame.x <= 1 && collapsedFrame.y <= 1 && collapsedFrame.width >= 319 && collapsedFrame.height >= 567,
    'Closing review in focus mode returns the full small viewport to the website.');
  await tools().getByRole('button', { name: /Navigation$/ }).click();
  await page.getByRole('dialog', { name: 'Navigation', exact: true }).waitFor();
  const navigationFrame = await box(page.locator('iframe.live-frame'));
  check(JSON.stringify(navigationFrame) === JSON.stringify(collapsedFrame), 'The optional navigation dialog leaves the website viewport unchanged.');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Navigation', exact: true })).toBeHidden();
  check(true, 'Escape closes the optional navigation dialog.');
  assert.deepEqual(prohibitedRequests, [], 'No project/source mutations or model requests were attempted.');
  assert.deepEqual(errors, [], 'No browser runtime errors.');
  await fs.writeFile(path.join(evidence, 'split-layout.json'), `${JSON.stringify({ checks, visualSamples, browserErrors: errors, prohibitedRequests }, null, 2)}\n`);
  console.log(`Split layout: ${checks.length} checks passed across full, compact and focus layouts; desktop, touch, keyboard, persistence and viewport clamping.`);
} finally {
  await context.close();
  await browser.close();
}
