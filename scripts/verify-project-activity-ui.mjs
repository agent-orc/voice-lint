// Exercise the actual component with fake HTTP. No backend, model, or source writes.
import assert from 'node:assert/strict';
import { loadComponent } from './component-test-runtime.mjs';

let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const normalized = value => JSON.parse(JSON.stringify(value));
const task = (id, status, extra = {}) => ({
  id, documentId: 'intro', documentPath: 'src/content/intro.md', documentTitle: 'Einführung',
  instruction: 'Einstieg verständlich machen', status,
  createdAt: '2026-10-01T09:00:00Z', updatedAt: '2026-10-02T12:00:00Z',
  proposalId: null, sourceVersion: 'before', currentVersion: 'before', sourceStatus: 'current', resolution: null,
  ...extra,
});
const change = (id, state, extra = {}) => ({
  id, documentId: 'intro', documentPath: 'src/content/intro.md', documentTitle: 'Einführung',
  before: 'Leistungsstark 🚀', after: 'Prüft die markierte Textstelle.', reason: 'Konkreten Nutzen benennen',
  state, taskId: null, createdAt: null, appliedAt: null,
  expectedVersion: 'before', resultVersion: 'after', currentVersion: 'after', sourceStatus: 'current',
  ...extra,
});
const activity = (projectId = 'project-a', extra = {}) => ({ projectId, documentCount: 4, tasks: [], changes: [], ...extra });
function setup() {
  const runtime = loadComponent('project-activity.component.ts', 'ProjectActivityComponent');
  const component = new runtime.Component();
  component.projectId = 'project-a';
  component.projectName = 'Projekt A';
  return { ...runtime, component };
}

{
  const { component, timers } = setup();
  const calls = [];
  const rows = ['queued', 'running', 'cancelling', 'ready', 'failed', 'cancelled', 'applied', 'stale', 'interrupted', 'completed', 'needs_review']
    .map(status => task(status, status));
  component.api = async (...args) => { calls.push(args); return activity('project-a', { tasks: rows }); };
  component.ngOnChanges();
  await flush();
  check(component.tasks().length === 11 && component.activeCount() === 3 && component.attentionCount() === 6 && component.finishedCount() === 2,
    'every persisted task state has an understandable overview group');
  check(component.activity().documentCount === 4, 'scope includes configured source files without tasks');
  component.taskFilter.set('attention');
  check(component.visibleTasks().length === 6, 'attention filter includes ready, clarification and interrupted or failed work');
  component.taskFilter.set('finished');
  check(component.visibleTasks().every(item => ['completed', 'applied'].includes(item.status)), 'finished does not include a merely ready result');
  component.search.set('Einstieg');
  component.changeFilter.set('all');
  component.mode = 'history';
  component.ngOnChanges();
  check(component.search() === '' && component.changeFilter() === 'applied', 'entering history clears the task search and restores the applied-changes default');
  component.search.set('specs-only-history-match');
  component.mode = 'tasks';
  component.ngOnChanges();
  check(component.search() === '' && component.taskFilter() === 'all' && component.visibleTasks().length === 11,
    'returning to tasks clears an unmatched history search and the previous task filter');
  check(calls.length === 1, 'switching overview modes only filters the already read records');
  await component.reload();
  check(calls.length === 2 && calls.every(args => args[0] === '/api/projects/project-a/activity' && args[1] === undefined && args[2] === undefined),
    'initial view and explicit refresh issue only read requests to the activity endpoint');
  check(timers.size === 0, 'viewing running tasks does not start execution or polling');
  component.ngOnDestroy();
}

{
  const { component } = setup();
  const manual = change('manual-applied', 'applied');
  const linked = change('task-applied', 'applied', { taskId: 'task-one', documentId: 'about', documentPath: 'src/about.html', documentTitle: 'Über uns', appliedAt: '2026-10-03T12:00:00Z', sourceStatus: 'changed' });
  const pending = change('pending', 'pending', { after: 'Beschreibt die aktuelle Funktion.' });
  component.api = async () => activity('project-a', {
    tasks: [task('task-one', 'applied', { proposalId: 'task-applied', documentId: 'about' })],
    changes: [manual, pending, linked],
  });
  component.ngOnChanges();
  await flush();
  check(component.appliedCount() === 2 && component.pendingCount() === 1, 'manual and linked applied proposals both count in history');
  check(component.visibleChanges().length === 2 && component.visibleChanges()[0].id === 'task-applied',
    'history initially shows applied records with known dates ahead of undated legacy records');
  check(component.formatDate(manual.appliedAt) === 'Datum nicht gespeichert', 'legacy history never invents an apply date');
  component.changeFilter.set('all');
  component.search.set('  LEISTUNGSSTARK  🚀 ');
  check(component.visibleChanges().length === 3, 'history search finds exact original Unicode text across files');
  component.search.set('über about');
  check(component.visibleChanges().length === 1 && component.visibleChanges()[0].id === 'task-applied', 'search terms match document title and source path together');
  component.changeFilter.set('pending');
  component.search.set('aktuelle Funktion');
  check(component.visibleChanges().length === 1 && component.visibleChanges()[0].id === 'pending', 'pending filter and replacement-text search combine');
  component.resetFilters();
  check(component.visibleChanges().length === 3 && component.search() === '', 'reset exposes all stored suggestions and changes');
  component.openChange(manual);
  component.openChange(linked);
  component.openTask(component.tasks()[0]);
  assert.deepEqual(normalized(component.openDocument.values), [
    { documentId: 'intro', proposalId: 'manual-applied' },
    { documentId: 'about', proposalId: 'task-applied', taskId: 'task-one' },
    { documentId: 'about', taskId: 'task-one', proposalId: 'task-applied' },
  ]);
  checks++;
  check(component.tasks()[0].status === 'applied' && component.changes().find(item => item.id === linked.id).sourceStatus === 'changed',
    'opening a record preserves both its historic applied status and source-change warning');
  component.ngOnDestroy();
}

{
  const { component } = setup();
  const oldProject = deferred();
  const newProject = deferred();
  component.api = path => path.includes('project-a') ? oldProject.promise : newProject.promise;
  component.ngOnChanges();
  component.search.set('old search');
  component.projectId = 'project/b';
  component.ngOnChanges();
  check(component.activity() === null && component.search() === '' && component.loading(), 'project switch clears old records and filters immediately');
  oldProject.resolve(activity('project-a', { tasks: [task('old', 'ready')] }));
  await flush();
  check(component.activity() === null && component.loading(), 'old response and finally cannot populate or finish a new project load');
  newProject.resolve(activity('project/b', { tasks: [task('new', 'queued')] }));
  await flush();
  check(component.tasks()[0].id === 'new' && !component.loading() && !component.error(), 'new project response owns the visible records');
  component.ngOnDestroy();
}

{
  const { component } = setup();
  const slow = deferred(), fresh = deferred();
  let calls = 0;
  component.api = () => ++calls === 1 ? slow.promise : fresh.promise;
  component.ngOnChanges();
  const refreshing = component.reload();
  fresh.resolve(activity('project-a', { tasks: [task('fresh', 'ready')] }));
  await refreshing;
  slow.reject(new Error('Old request failed'));
  await flush();
  check(component.tasks()[0].id === 'fresh' && !component.error() && !component.loading(), 'a stale refresh failure cannot replace the successful newer view');
  component.api = async () => { throw new Error('Temporarily unavailable'); };
  await component.reload();
  check(component.tasks()[0].id === 'fresh' && !!component.error(), 'failed refresh preserves historical rows with an explicit error');
  component.api = async () => activity('other-project');
  await component.reload();
  check(component.activity().projectId === 'project-a' && !!component.error(), 'wrong-project API data is rejected without mixing project histories');
  component.api = async () => ({});
  await component.reload();
  check(component.tasks()[0].id === 'fresh' && component.error().includes('Projektübersicht'), 'legacy API fallback is rejected instead of looking like empty history');
  component.ngOnDestroy();
}

{
  const { component } = setup();
  const pending = deferred();
  component.api = () => pending.promise;
  component.ngOnChanges();
  component.ngOnDestroy();
  pending.resolve(activity('project-a', { tasks: [task('late', 'running')] }));
  await flush();
  check(component.activity() === null && component.loadedAt() === null, 'a destroyed overview never accepts a late response');
}

{
  const { component } = setup();
  component.api = async () => activity();
  component.ngOnChanges();
  await flush();
  check(component.tasks().length === 0 && component.changes().length === 0 && !component.error(), 'an empty project is a successful empty state');
  component.projectId = '';
  component.ngOnChanges();
  check(component.activity() === null && !component.loading(), 'clearing project selection cancels the overview');
  check(component.taskLabel(task('manual', 'completed', { resolution: 'manual' })) !== component.taskLabel(task('agent', 'completed', { resolution: 'agent_no_changes' })),
    'manual completion stays distinct from the agent no-change outcome');
  check(component.taskNextStep(task('applied', 'applied')).includes('Prüfung und Veröffentlichung'), 'applied result copy does not imply verification or publication');
}

console.log(`Project activity UI: ${checks} checks passed; fake HTTP only, no backend, source writes or inference.`);
