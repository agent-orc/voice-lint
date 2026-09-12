// Holds read-only document responses to verify the loading overlay without model or source writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { readSession } from './session.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = new URL(process.env.VOICE_STUDIO_URL ?? 'http://127.0.0.1:5188/');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'Studio must remain local.');
const evidence = path.join(root, 'test-results/loading-overlay');
await fs.mkdir(evidence, { recursive: true });
const session = await readSession(root);
const liveProject = process.env.VOICE_LOADING_PROJECT ?? 'quality-website';
const markdownProject = 'markdown-handbook';
async function readDocuments(project) {
  const url = new URL('/api/projects/' + encodeURIComponent(project) + '/documents', base);
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + session.token } });
  assert.equal(response.status, 200, 'Existing project documents are readable.');
  const documents = await response.json();
  assert.ok(documents.length >= 2, 'The existing fixture has at least two source files.');
  return documents;
}
const liveDocuments = await readDocuments(liveProject);
const markdownDocuments = await readDocuments(markdownProject);
const browser = await chromium.launch({ channel: 'chrome', headless: true, timeout: 15000 });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
const page = await context.newPage();
page.setDefaultTimeout(12000);
const checks = [], samples = [], errors = [], prohibitedRequests = [];
let pending;
const check = (condition, label) => { assert.ok(condition, label); checks.push(label); };
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
page.on('pageerror', error => errors.push(error.message));
await context.route('**/api/**', async route => {
  const request = route.request();
  const url = new URL(request.url());
  const sessionRequest = /^\/api\/session\/(?:pair|resume|logout)$/.test(url.pathname);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method()) && !sessionRequest) {
    prohibitedRequests.push(request.method() + ' ' + url.pathname);
    await route.abort('blockedbyclient');
    return;
  }
  const gate = pending;
  if (request.method() === 'GET' && gate && url.origin === base.origin && (url.pathname === gate.pathname || gate.pathnames?.includes(url.pathname)) && !gate.heldPaths.has(url.pathname)) {
    gate.caught = true;
    gate.heldPaths.add(url.pathname);
    try {
      const response = await route.fetch();
      assert.equal(response.status(), 200, 'Delayed source detail is a successful read.');
      gate.started.resolve();
      await gate.release.promise;
      await route.fulfill({ response });
    } catch (error) {
      gate.error = error.message;
      gate.started.resolve();
      await route.abort('failed').catch(() => {});
    }
  } else await route.continue();
});
const settle = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
const focus = () => page.locator('voice-studio').evaluate(element => element.classList.contains('focus-navigation'));
async function navigation() {
  if (await focus() && !await page.locator('#workspace-navigation').isVisible())
    await page.locator('.focus-tools button[aria-controls="workspace-navigation"]').click();
}
async function mode(value) {
  await navigation();
  const scope = await focus() ? page.locator('#workspace-navigation') : page.locator('.studio-header');
  await scope.locator('select[aria-label="Navigation"]').selectOption(value);
  await settle();
}
async function language(value) {
  await navigation();
  const scope = await focus() ? page.locator('#workspace-navigation') : page.locator('.studio-header');
  await scope.locator('select[aria-label="Language / Sprache"]').selectOption(value);
  if (await focus() && await page.locator('#workspace-navigation').isVisible())
    await page.locator('.focus-navigation-heading button').click();
  await settle();
}
async function sidebar() {
  if (!await page.locator('#project-sidebar').isVisible()) {
    await navigation();
    await page.locator('.workspace-actions > button').first().click();
  }
  if (await page.locator('#toggle-sidebar-projects').getAttribute('aria-expanded') === 'true')
    await page.locator('#toggle-sidebar-projects').click();
  if (await page.locator('#toggle-sidebar-files').getAttribute('aria-expanded') === 'false')
    await page.locator('#toggle-sidebar-files').click();
  await expect(page.locator('#sidebar-files')).toBeVisible();
}
async function review() {
  if (await page.locator('#voice-review-panel').isVisible()) return;
  const control = await focus() ? page.locator('.focus-tools button[aria-controls="voice-review-panel"]')
    : page.locator('.workspace-actions > button').last();
  await control.click();
  await expect(page.locator('#review-splitter')).toBeVisible();
}
async function geometry(contentSelector) {
  return page.evaluate(selector => {
    const measure = query => {
      const node = document.querySelector(query);
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
    };
    return {
      scrollX, scrollY,
      workspace: measure('.document-workspace'),
      document: measure('.document-pane'),
      content: measure(selector),
      review: measure('#voice-review-panel'),
      splitter: measure('#review-splitter'),
      toolbar: measure('voice-live-browser .browser-toolbar') ?? measure('.source-toolbar') ?? measure('.preview-toolbar')
    };
  }, contentSelector);
}
function sameBounds(before, during, label) {
  check(before.scrollX === during.scrollX && before.scrollY === during.scrollY, label + ': the document scroll position is unchanged.');
  for (const name of ['workspace', 'document', 'content', 'review', 'splitter', 'toolbar']) {
    check(before[name] !== null && during[name] !== null, label + ': ' + name + ' stays mounted.');
    for (const dimension of ['x', 'y', 'width', 'height'])
      assert.ok(Math.abs(before[name][dimension] - during[name][dimension]) <= 1, label + ': loading preserves ' + name + ' ' + dimension + '.');
    checks.push(label + ': ' + name + ' bounds do not change while the response is pending.');
  }
}
async function holdFileChange({ project, documents, label, content, locale, screenshot }) {
  let activePath, next, targetFile;
  if (content === 'iframe.live-frame') {
    if (await page.locator('#project-sidebar').isVisible()) {
      if (await focus()) {
        await navigation();
        await page.locator('.focus-navigation-heading button').click();
      } else await page.locator('.workspace-actions > button').first().click();
    }
    await review();
    const element = await page.locator(content).elementHandle();
    const frame = await element.contentFrame();
    assert.ok(frame, 'The existing local website has a browsing context.');
    activePath = new URL(frame.url()).pathname.split('/').pop();
    next = documents.find(document => document.path === (activePath === 'contact.html' ? 'index.html' : 'contact.html'));
    assert.ok(next, 'The built-in website provides the navigation target.');
    targetFile = frame.locator('a[href=' + JSON.stringify(next.path) + ']').first();
    await expect(targetFile).toHaveCount(1);
    await element.dispose();
  } else {
    await sidebar(); await review();
    const breadcrumb = (await page.locator('.breadcrumb').innerText()).trim();
    activePath = [...documents].sort((a, b) => b.path.length - a.path.length).find(document => breadcrumb.endsWith(document.path))?.path;
    assert.ok(activePath, 'The current source path is identified in the existing breadcrumb.');
    next = documents.find(document => document.path !== activePath && !document.path.includes('/'));
    assert.ok(next, 'A second top-level file is available in the read-only fixture.');
    targetFile = page.locator('#sidebar-files').getByTitle(next.path, { exact: true });
    await expect(targetFile).toHaveCount(1);
    await targetFile.scrollIntoViewIfNeeded();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle();
  const contentElement = await page.locator(content).elementHandle();
  assert.ok(contentElement, 'Existing content is mounted before file selection.');
  // The previous file starts its own Git read; wait for that header before measuring the next load.
  await expect(page.locator('voice-source-context .source-context-body > button')).toBeEnabled();
  let previousGeometry, stableFrames = 0;
  await expect.poll(async () => {
    const current = await geometry(content);
    stableFrames = JSON.stringify(current) === JSON.stringify(previousGeometry) ? stableFrames + 1 : 0;
    previousGeometry = current;
    return stableFrames;
  }, { intervals: [50, 100], timeout: 5000 }).toBeGreaterThanOrEqual(3);
  const before = previousGeometry;
  const gate = { pathname: '/api/projects/' + encodeURIComponent(project) + '/documents/' + encodeURIComponent(next.id), started: deferred(), release: deferred(), caught: false, heldPaths: new Set() };
  pending = gate;
  try {
    // Keep the outer scroll position while activating an existing website link or sidebar file.
    await targetFile.evaluate(button => button.click());
    await expect.poll(() => gate.caught).toBe(true);
    await gate.started.promise;
    assert.ok(!gate.error, gate.error ?? 'Read response was captured.');
    const overlay = page.locator('.document-loading-overlay[role="status"]');
    await expect(overlay).toHaveCount(1);
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText(locale === 'de' ? 'Dateien werden eingelesen und gepr\u00fcft' : 'Reading and checking files');
    await expect(overlay.locator('.document-loading-label')).toHaveText(locale === 'de' ? 'L\u00e4dt \u2026' : 'Loading \u2026');
    const card = overlay.locator('.document-loading-message');
    assert.ok(await card.evaluate(element => element.getBoundingClientRect().height <= 80 && element.scrollWidth <= element.clientWidth), label + ': the visible loading message stays compact and fits its card.');
    await settle();
    const overlayState = await overlay.evaluate(element => {
      const surface = element.closest('.document-loading-surface');
      if (!surface) return null;
      const r = element.getBoundingClientRect(), p = surface.getBoundingClientRect();
      return {
        busyAncestor: !!element.closest('[aria-busy="true"]'), position: getComputedStyle(element).position,
        surfacePosition: getComputedStyle(surface).position,
        bounds: { x: r.x, y: r.y, width: r.width, height: r.height },
        surfaceBounds: { x: p.x, y: p.y, width: p.width, height: p.height }
      };
    });
    await expect(page.locator(content)).toHaveAttribute('aria-busy', 'true');
    check(overlayState && !overlayState.busyAncestor, label + ': status remains outside busy content so it can be announced.');
    check(overlayState.position === 'absolute' && overlayState.surfacePosition === 'relative',
      label + ': loading is an absolute overlay in the content surface.');
    for (const dimension of ['x', 'y', 'width', 'height'])
      assert.ok(Math.abs(overlayState.bounds[dimension] - overlayState.surfaceBounds[dimension]) <= 1,
        label + ': the overlay covers the content surface ' + dimension + '.');
    checks.push(label + ': the loading overlay is confined to the content surface.');
    check(await contentElement.evaluate((element, selector) => element.isConnected && element === document.querySelector(selector), content),
      label + ': the existing content node retains its identity while reading.');
    check(await contentElement.evaluate(element => element.inert || !!element.closest('[inert]')),
      label + ': stale content cannot receive input while reading.');
    const during = await geometry(content);
    try { sameBounds(before, during, label); }
    catch (error) { samples.push({ label, state: 'geometry-failure', before, during, overlay: overlayState }); throw error; }
    if (content === 'iframe.live-frame') {
      check(overlayState.bounds.y >= during.toolbar.bottom - 1, label + ': the browser toolbar stays above the overlay.');
      check(overlayState.bounds.x + overlayState.bounds.width <= during.splitter.x + 1,
        label + ': the overlay does not cover the splitter or adjacent review.');
    }
    if (screenshot) await page.screenshot({ path: path.join(evidence, screenshot), fullPage: false });
    gate.release.resolve();
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('.document-loading-surface [aria-busy="true"]')).toHaveCount(0);
    if (content === 'iframe.live-frame') await expect(page.locator('.breadcrumb')).toContainText(next.path);
    else await expect(page.locator('#sidebar-files .file-button.active[title]')).toHaveAttribute('title', next.path);
    await expect(page.locator(content)).toBeVisible();
    await settle();
    const after = await geometry(content);
    check(after.document.right <= after.splitter.x + 1 && after.splitter.right <= after.review.x + 1,
      label + ': the loaded document and review remain in adjacent columns.');
    check(await page.locator('.loading-state').count() === 0, label + ': loading leaves no document-flow placeholder.');
    samples.push({ label, viewport: page.viewportSize(), locale, source: activePath, target: next.path, before, during, after, overlay: overlayState });
  } finally {
    gate.release.resolve();
    pending = undefined;
    await contentElement.dispose();
  }
}

async function connect(project) {
  const url = new URL(base); url.searchParams.set('project', project);
  await page.goto(url.href);
  const currentSession = await readSession(root);
  await page.locator('#pairing-code').fill(currentSession.pairingCode);
  await page.locator('#remember-browser').uncheck();
  await page.locator('.pair-card form button').click();
}

async function initialProjectLoading() {
  const gate = {
    pathnames: ['/api/projects/' + liveProject + '/documents', '/api/projects/' + liveProject + '/report'],
    started: deferred(), release: deferred(), caught: false, heldPaths: new Set()
  };
  pending = gate;
  try {
    await connect(liveProject);
    await expect.poll(() => gate.heldPaths.size).toBe(2);
    await gate.started.promise;
    assert.ok(!gate.error, gate.error ?? 'Initial fixture reads were captured.');
    const overlay = page.locator('.document-loading-overlay[role="status"]');
    await expect(overlay).toBeVisible();
    const initial = await overlay.evaluate(element => {
      const surface = element.closest('.document-loading-surface');
      return { height: surface?.getBoundingClientRect().height ?? 0, busyAncestor: !!element.closest('[aria-busy="true"]') };
    });
    check(initial.height >= 160 && !initial.busyAncestor, 'Initial document loading reserves a visible area with an announcable status.');
    await page.locator('.view-tabs button').last().click();
    await expect(page.locator('.document-loading-surface.initial-document-surface')).toBeVisible();
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('Dateien werden eingelesen und gepr\u00fcft');
    const report = await overlay.evaluate(element => {
      const surface = element.closest('.document-loading-surface');
      const bounds = element.getBoundingClientRect(), surfaceBounds = surface.getBoundingClientRect();
      return { height: surfaceBounds.height, overlayHeight: bounds.height, top: bounds.top, bottom: bounds.bottom, viewport: innerHeight,
        absolute: getComputedStyle(element).position === 'absolute', busyAncestor: !!element.closest('[aria-busy="true"]') };
    });
    check(report.height >= 160 && Math.abs(report.height - report.overlayHeight) <= 1 && report.absolute,
      'Switching to the project report before its first response preserves a real overlay surface.');
    check(report.bottom > 0 && report.top < report.viewport && !report.busyAncestor,
      'The initial project-report status remains visible and outside aria-busy ancestors.');
    gate.release.resolve();
    await expect(overlay).toHaveCount(0);
    await expect(page.locator('.project-report')).toBeVisible();
    check(await page.locator('.initial-document-surface').count() === 0, 'The initial reserved area yields to the loaded project report.');
    samples.push({ label: 'initial-document-and-project-report', initial, report });
  } finally { gate.release.resolve(); pending = undefined; }
}

try {
  await connect(liveProject);
  await page.locator('iframe.live-frame').waitFor();
  await page.frameLocator('iframe.live-frame').locator('body').waitFor();
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    for (const layout of ['full', 'compact', 'focus']) {
      await mode(layout);
      const locale = viewport.name === 'desktop' ? 'en' : 'de';
      await language(locale);
      await holdFileChange({
        project: liveProject, documents: liveDocuments, label: 'live-' + layout + '-' + viewport.name,
        content: 'iframe.live-frame', locale,
        screenshot: layout === 'full' && viewport.name === 'desktop' ? 'full-desktop-loading.png'
          : layout === 'compact' && viewport.name === 'desktop' ? 'compact-desktop-loading.png'
          : layout === 'focus' && viewport.name === 'mobile' ? 'live-focus-mobile-pending.png' : undefined
      });
    }
  }
  await mode('full');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await language('en');
  await page.locator('.view-tabs button').nth(1).click();
  await expect(page.locator('.source-view')).toBeVisible();
  await holdFileChange({ project: liveProject, documents: liveDocuments, label: 'source-desktop', content: '.source-view', locale: 'en' });
  await connect(markdownProject);
  await expect(page.locator('.document-pane iframe')).toBeVisible();
  await language('de');
  await holdFileChange({
    project: markdownProject, documents: markdownDocuments, label: 'markdown-desktop',
    content: '.document-pane iframe', locale: 'de', screenshot: 'markdown-pending.png'
  });
  await initialProjectLoading();
  check(errors.length === 0, 'The loading scenarios produce no browser exceptions.');
  check(prohibitedRequests.length === 0, 'No project mutation or model request was attempted.');
  await fs.writeFile(path.join(evidence, 'loading-overlay.json'), JSON.stringify({
    status: 'passed', checkedAt: new Date().toISOString(), checkCount: checks.length, checks, samples, errors, prohibitedRequests,
    boundary: 'Existing local fixtures; delayed successful GET responses; temporary isolated browser pairing; no project/model writes.'
  }, null, 2));
  console.log('Loading overlay: ' + checks.length + ' checks passed across six live layouts, source, Markdown and initial document/report loading; no project/model writes.');
} catch (error) {
  await page.screenshot({ path: path.join(evidence, 'failure.png'), fullPage: false }).catch(() => {});
  await fs.writeFile(path.join(evidence, 'loading-overlay-failure.json'), JSON.stringify({ status: 'failed', error: error.message, checks, samples, errors, prohibitedRequests }, null, 2));
  throw error;
} finally {
  pending?.release.resolve();
  await context.close();
  await browser.close();
}
