// Browser acceptance checks against the local Studio. No source writes or model starts.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect as baseExpect } from '@playwright/test';
import { readSession } from './session.mjs';
const root = new URL('../', import.meta.url).pathname.replace(/^\/(\w:)/, '$1');
const evidence = new URL('../docs/verification/2026-10-04-studio-orientation/', import.meta.url);
await fs.mkdir(evidence, { recursive: true });
const session = await readSession(root);
const projectId = 'project-f80c52d87170';
const expect = baseExpect.configure({ timeout: 45000 });
const base = 'http://127.0.0.1:5188';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1080 }, locale: 'de-DE' });
await context.addInitScript(() => {
  if (window !== window.top) return;
  localStorage.setItem('voice-studio:locale', 'de');
  localStorage.setItem('voice-studio:navigation', 'compact');
});
const page = await context.newPage();
page.setDefaultTimeout(30000);
const errors = [], blocked = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
await context.route('**/api/**', async route => {
  const request = route.request(), path = new URL(request.url()).pathname;
  if (request.method() !== 'GET' && !/^\/api\/session\/(pair|resume|logout)$/.test(path)) {
    blocked.push(request.method() + ' ' + path); await route.abort();
  } else await route.continue();
});
const shot = name => page.screenshot({ path: new URL(name + '.png', evidence).pathname.replace(/^\/(\w:)/, '$1'), fullPage: false });
async function pair() {
  await page.locator('#pairing-code').fill(session.pairingCode);
  await page.locator('#remember-browser').uncheck();
  await page.getByRole('button', { name: 'Lokales Studio öffnen', exact: true }).click();
}
try {
  if (process.argv.includes('--tasks-only')) {
    await page.goto(base + '/?project=' + projectId + '&view=tasks');
    await pair();
    await expect(page.locator('.task-card').first()).toBeVisible();
    const title = await page.locator('.task-card h2').first().innerText();
    assert.ok(!/^\[[^\]]+\]$/.test(title), 'Task title describes work instead of only an import reference');
    await page.locator('voice-project-activity h1').click();
    await shot('tasks-desktop');
    assert.deepEqual(errors, []);
    assert.deepEqual(blocked, []);
    console.log('PASS: task title and refreshed task screenshot.');
  } else {
  await page.goto(base + '/?project=' + projectId + '&view=history');
  await pair();
  await expect(page.locator('voice-project-activity h1')).toHaveText('Änderungsverlauf');
  await expect(page.getByRole('combobox', { name: 'Aktuelles Projekt', exact: true })).toHaveValue(projectId);
  await expect(page.locator('.workspace-context')).toContainText('Projektweiter Überblick');
  await page.locator('#project-activity-search').fill('specs are a powerful context system');
  const change = page.locator('.change-card');
  await expect(change).toHaveCount(1);
  await expect(change.locator('.text-comparison')).toContainText('specs provide context for development');
  await expect(change).toContainText('Ohne Aufgabenverknüpfung');
  await expect(change.locator('.source-warning')).toContainText('frühere Fassung');
  await expect(change.locator('details')).toHaveAttribute('open', '');
  await shot('history-desktop');
  checks.push('Requested project and history restored after pairing; legacy manual applied change found by old text with before/after and historical source warning.');
  await page.locator('.studio-header').getByRole('combobox', { name: 'Language / Sprache' }).selectOption('en');
  await expect(page.locator('voice-project-activity h1')).toHaveText('Change history');
  await expect(change).toContainText('No linked task');
  await page.locator('.studio-header').getByRole('combobox', { name: 'Language / Sprache' }).selectOption('de');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('combobox', { name: 'Aktuelles Projekt', exact: true })).toBeVisible();
  assert.ok(await page.locator('.activity-refresh').evaluate(element => parseFloat(getComputedStyle(element).fontSize) >= 12), 'Mobile refresh label remains readable');
  await shot('history-mobile');
  await change.scrollIntoViewIfNeeded();
  await shot('history-mobile-detail');
  checks.push('German/English labels switch without changing source text; compact mobile history preserves project context and fits viewport.');
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: 'Aufgaben', exact: true }).click();
  await expect(page.locator('voice-project-activity h1')).toHaveText('Aufgaben im Projekt');
  await page.locator('#project-activity-search').fill('');
  await expect(page.locator('.task-card').first()).toBeVisible();
  await shot('tasks-desktop');
  const taskButton = page.locator('.task-card').first().getByRole('button');
  await taskButton.click();
  await expect(page.locator('.task-workspace voice-source-tasks')).toBeVisible();
  await expect(page.locator('.workspace-context')).toContainText('Aktuelle Datei');
  await expect(page.getByRole('button', { name: '← Alle Aufgaben im Projekt', exact: true })).toBeVisible();
  checks.push('Project tasks open in their file workspace with a return path and current file context.');
  await page.getByRole('button', { name: '← Alle Aufgaben im Projekt', exact: true }).click();
  await page.getByRole('button', { name: 'Hinweise prüfen', exact: true }).click();
  await page.getByRole('button', { name: /^Dateibericht/ }).click();
  const projectsResponse = await fetch(base + '/api/projects', { headers: { Authorization: 'Bearer ' + session.token } });
  const projects = await projectsResponse.json();
  const voice = projects.find(item => item.name === 'Voice · Website');
  assert.ok(voice, 'Known Voice project available');
  await page.getByRole('combobox', { name: 'Aktuelles Projekt', exact: true }).selectOption(voice.id);
  await expect(page.getByRole('combobox', { name: 'Aktuelles Projekt', exact: true })).toBeEnabled();
  const docsResponse = await fetch(base + '/api/projects/' + voice.id + '/documents', { headers: { Authorization: 'Bearer ' + session.token } });
  const documents = await docsResponse.json();
  const report = documents.find(item => item.path === 'backend/CHECKS.md');
  assert.ok(report, 'Original confusing document is registered');
  await page.goto(base + '/?project=' + voice.id + '&document=' + report.id);
  await pair();
  await expect(page.locator('.workspace-context')).toContainText('backend/CHECKS.md');
  await page.getByRole('button', { name: /^Dateibericht/ }).click();
  await page.locator('.finding-card').first().click();
  await expect(page.locator('.selection-card mark')).toBeVisible();
  const quote = await page.locator('.selection-card mark').innerText();
  const passage = await page.locator('.selection-card blockquote').innerText();
  assert.ok(passage.length > quote.length, 'Selected finding shows complete paragraph context');
  assert.equal(await page.locator('.coverage-disclosure').getAttribute('open'), null);
  await shot('review-desktop');
  checks.push('Original screenshot context now names its exact file and shows full paragraph with marked phrase; technical coverage starts collapsed.');
  await page.getByRole('button', { name: 'Aufgabe erstellen', exact: true }).click();
  await expect(page.locator('.task-workspace voice-source-tasks textarea').first()).toBeVisible();
  checks.push('Create-task navigation opens composition without saving or executing a task.');
  assert.deepEqual(blocked, [], 'No source/model mutations attempted');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  await fs.writeFile(new URL('results.json', evidence), JSON.stringify({ checks, browserErrors: errors, prohibitedRequests: blocked }, null, 2) + '\n');
  console.log('PASS: ' + checks.length + ' browser acceptance scenarios; screenshots saved to docs/verification/2026-10-04-studio-orientation.');
  }
} catch (error) {
  await shot('failure');
  console.error('Browser errors:', errors);
  throw error;
} finally { await browser.close(); }
