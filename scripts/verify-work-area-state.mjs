// Run real navigation/component methods with deferred read responses.
// No browser, backend, model, task execution or project writes are started.
import assert from 'node:assert/strict';
import { loadComponent } from './component-test-runtime.mjs';

let checks = 0;
const mutationAttempts = [];
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
const document = (id = 'a', project = 'p') => ({
  id, version: project + ':source-' + id, path: id + '.md', format: 'markdown', language: 'de',
  units: [], findings: [], feedback: [], decisions: [], reviewRevision: 0, renderedHtml: '', source: '',
});
const task = (id, status = 'queued', doc = 'a', project = 'p') => ({
  id, status, projectId: project, documentId: doc, sourceVersion: project + ':source-' + doc,
  reviewRevision: 0, revision: 1, instruction: 'Review ' + id, feedbackIds: [],
});
const ready = { configured: true, available: true };
function readOnlyApi(handler) {
  const calls = [];
  const api = async (path, method = 'GET', input) => {
    calls.push({ path, method, input });
    if (method !== 'GET') mutationAttempts.push({ path, method });
    assert.equal(method, 'GET', 'Navigation cannot start a task, apply a change, or write project metadata.');
    return handler(path);
  };
  return { api, calls };
}
function appSetup() {
  const runtime = loadComponent('app.component.ts', 'AppComponent');
  const app = new runtime.Component();
  app.connected.set(true); app.selectedProject.set({ id: 'p', name: 'Project P' });
  app.document.set(document()); app.documents.set([document(), document('b')]);
  return { ...runtime, app };
}
function taskSetup() {
  const runtime = loadComponent('source-tasks.component.ts', 'SourceTasksComponent');
  const component = new runtime.Component();
  component.projectId = 'p'; component.document = document();
  return { ...runtime, component };
}

{
  const { app, location } = appSetup();
  const { api, calls } = readOnlyApi(() => { throw new Error('Area changes need no API request.'); }); app.api = api;
  const original = app.document();
  app.navigationMode.set('focus'); app.tab.set('preview');
  check(app.focusNavigation(), 'Focus navigation is available while reviewing a website.');
  for (const area of ['tasks', 'history', 'review']) {
    app.taskDocumentActive.set(true); app.setWorkArea(area);
    const params = new URL(location.href).searchParams;
    check(app.workArea() === area && params.get('view') === area && params.get('document') === 'a', 'Area navigation keeps the selected document and updates its shareable URL: ' + area);
    check(!app.taskDocumentActive() && app.document() === original, 'Area navigation resets task detail without replacing source: ' + area);
    if (area !== 'review') check(!app.focusNavigation(), 'Tasks and history expose normal navigation rather than floating website controls.');
  }
  check(calls.length === 0, 'Switching work areas performs no reads or mutations.');
  app.createSourceTask();
  check(app.workArea() === 'tasks' && app.taskDocumentActive() && app.composingTask() && app.requestedTaskId() === null, 'Create task opens a draft for the current file without starting or saving it.');
  check(calls.length === 0, 'Opening task creation does not call task creation, start or apply APIs.');
  app.setWorkArea('history'); app.loading.set(true); app.createSourceTask();
  check(app.workArea() === 'history' && !app.taskDocumentActive(), 'Task creation cannot capture a document while a new source is loading.');
  app.loading.set(false); app.document.set(null); app.createSourceTask();
  check(app.workArea() === 'history' && !app.taskDocumentActive(), 'Task creation without a source cannot open an unbound task form.');
}

{
  const { app } = appSetup();
  let disposed = 0;
  const mountedReview = { dispose() { disposed++; } };
  app.review = mountedReview;
  app.setWorkArea('review');
  check(app.review === mountedReview && disposed === 0, 'Selecting the current review area keeps its mounted preview and selection adapter alive.');
  app.setWorkArea('history');
  check(app.review === null && disposed === 1, 'Leaving review disposes its adapter once.');
}

for (const action of ['area', 'task']) {
  const { app, location } = appSetup(), initialFile = deferred();
  location.href = 'http://127.0.0.1:5188/?project=p&view=history&document=deep-link';
  location.search = new URL(location.href).search;
  const documents = [document('initial'), document('chosen'), document('deep-link')];
  const { api, calls } = readOnlyApi(path => {
    if (path === '/api/projects') return [{ id: 'p', name: 'Project P' }];
    if (path === '/api/projects/p/documents') return documents;
    if (path === '/api/projects/p/report') return { documents };
    if (path.endsWith('/proposals') || path.endsWith('/requests')) return [];
    if (path.endsWith('/documents/initial')) return initialFile.promise;
    if (path.endsWith('/documents/chosen')) return document('chosen');
    if (path.endsWith('/documents/deep-link')) return document('deep-link');
    throw new Error('Unexpected fixture route: ' + path);
  });
  app.api = api;
  const opening = app.loadSessionProjects(); await flush();
  check(app.loading() && app.workArea() === 'history', 'The requested initial area is visible while the first source is loading: ' + action);
  if (action === 'area') app.setWorkArea('tasks');
  else await app.openActivityDocument({ documentId: 'chosen', taskId: 'chosen-task' });
  initialFile.resolve(document('initial')); await opening;
  check(app.workArea() === 'tasks', 'Completing initial session loading cannot restore an old URL area over the user choice: ' + action);
  check(!calls.some(call => call.path.endsWith('/documents/deep-link')), 'An initial deep-linked document is not loaded after the user has navigated elsewhere: ' + action);
  if (action === 'task') {
    check(app.document()?.id === 'chosen' && app.taskDocumentActive() && app.requestedTaskId() === 'chosen-task', 'The task chosen during startup retains its file, exact task ID and detail view.');
  } else {
    check(!app.taskDocumentActive(), 'A startup area change remains at the project task overview.');
  }
  check(!app.loading(), 'Initial navigation races leave loading cleared: ' + action);
}

{
  const { app, location } = appSetup();
  location.href = 'http://127.0.0.1:5188/?project=p&view=history&document=deep-link';
  location.search = new URL(location.href).search;
  const documents = [document('initial'), document('deep-link')];
  const { api } = readOnlyApi(path => {
    if (path === '/api/projects') return [{ id: 'p', name: 'Project P' }];
    if (path === '/api/projects/p/documents') return documents;
    if (path === '/api/projects/p/report') return { documents };
    if (path.endsWith('/proposals') || path.endsWith('/requests')) return [];
    return path.endsWith('/documents/deep-link') ? document('deep-link') : document('initial');
  });
  app.api = api; await app.loadSessionProjects();
  check(app.document()?.id === 'deep-link' && app.workArea() === 'history', 'Without a later user action, the initial URL still restores its requested document and area.');
}

{
  const { app } = appSetup();
  const proposal = { id: 'historical', documentId: 'b', expectedVersion: 'old-source', state: 'applied', replacement: 'Previous wording' };
  const { api, calls } = readOnlyApi(path => path.endsWith('/proposals') ? [proposal] : path.endsWith('/requests') ? [] : document('b'));
  app.api = api;
  await app.openActivityDocument({ documentId: 'b', taskId: 'specific-task' });
  check(app.document().id === 'b' && app.workArea() === 'tasks' && app.taskDocumentActive() && app.requestedTaskId() === 'specific-task' && !app.composingTask(), 'An activity task opens its owning file and passes the exact requested task ID.');
  await app.openActivityDocument({ documentId: 'b', proposalId: 'historical' });
  check(app.workArea() === 'review' && app.reviewOpen() && app.proposal()?.id === 'historical', 'Historical activity opens the stored proposal for inspection.');
  check(!app.canApplyProposal(), 'An already applied historical change is never offered as a fresh source write.');
  check(calls.length === 6 && calls.every(call => call.method === 'GET'), 'Activity navigation only loads the document and its saved records.');
}

{
  const { app } = appSetup(), delayed = deferred();
  const { api } = readOnlyApi(path => {
    if (path.endsWith('/proposals') || path.endsWith('/requests')) return [];
    return path.endsWith('/documents/a') ? delayed.promise : document('b');
  });
  app.api = api;
  const oldClick = app.openActivityDocument({ documentId: 'a', taskId: 'old-task' });
  await app.openDocument('b', 'source');
  delayed.resolve(document()); await oldClick;
  check(app.document().id === 'b' && app.tab() === 'source' && app.workArea() === 'review', 'A late activity response cannot replace a newer file or its explicitly chosen source tab.');
  check(!app.taskDocumentActive() && app.requestedTaskId() === null && !app.loading(), 'A cancelled activity navigation cannot select its task or leave loading behind.');
}

{
  const { app } = appSetup(), delayed = deferred();
  const { api } = readOnlyApi(path => {
    if (path.endsWith('/proposals') || path.endsWith('/requests')) return [];
    if (path === '/api/projects/other/documents') return [document('a', 'other')];
    if (path === '/api/projects/other/report') return { documents: [document('a', 'other')] };
    if (path === '/api/projects/other/documents/a') return document('a', 'other');
    if (path === '/api/projects/p/documents/a') return delayed.promise;
    throw new Error('Unexpected fixture route: ' + path);
  });
  app.api = api;
  const oldClick = app.openActivityDocument({ documentId: 'a', taskId: 'foreign-task' });
  await app.openProject({ id: 'other', name: 'Other project' });
  delayed.resolve(document('a', 'p')); await oldClick;
  check(app.selectedProject().id === 'other' && app.document().version === 'other:source-a', 'A delayed activity response cannot cross projects even when their document IDs are identical.');
  check(!app.taskDocumentActive() && app.requestedTaskId() === null && app.proposal() === null, 'Previous-project task and proposal selections stay cleared.');
}

{
  const { app } = appSetup(), delayed = deferred();
  const { api } = readOnlyApi(path => path.endsWith('/proposals') || path.endsWith('/requests') ? [] : delayed.promise); app.api = api;
  const oldClick = app.openActivityDocument({ documentId: 'b', taskId: 'old-task' });
  app.setWorkArea('history'); delayed.resolve(document('b')); await oldClick;
  check(app.workArea() === 'history' && !app.taskDocumentActive() && app.requestedTaskId() === null, 'Choosing history while an activity file loads prevents the late task click from reopening task detail.');
}

{
  const { app } = appSetup();
  app.setWorkArea('history');
  const { api } = readOnlyApi(() => { throw new Error('File is unavailable'); }); app.api = api;
  await app.openActivityDocument({ documentId: 'missing', taskId: 'missing-task' });
  check(app.document().id === 'a' && app.workArea() === 'history' && !app.taskDocumentActive() && app.requestedTaskId() === null, 'A failed file read cannot present a task against the previously selected file.');
  check(!app.loading() && !!app.error(), 'A failed activity read exits loading and presents a failure.');
}

{
  const { app } = appSetup();
  const text = '🧪 Immer prüfen.\nPräzise e\u0301-Wörter: immer im Kontext — 日本語 bleibt erhalten.';
  app.document.set({ ...document(), units: [{ id: 'paragraph', text }] });
  const quote = 'immer', start = text.indexOf(quote);
  const parts = app.passageParts({ unitId: 'paragraph', start, end: start + quote.length, quote });
  check(parts.before + parts.quote + parts.after === text && parts.before === text.slice(0, start) && parts.quote === quote && parts.after.includes('日本語'), 'Full multilingual paragraph context preserves emoji, combining marks, line breaks and the exact UTF-16 occurrence.');
  const unavailable = app.passageParts({ unitId: 'missing', start: 0, end: 5, quote });
  check(unavailable.before === '' && unavailable.quote === quote && unavailable.after === '', 'An unavailable source unit shows the captured quote without inventing surrounding context.');
  const stale = app.passageParts({ unitId: 'paragraph', start, end: start + quote.length, quote: 'never' });
  check(stale.before === '' && stale.after === '' && stale.quote === 'never', 'An outdated quote cannot receive a misleading current-source highlight.');
  for (const selection of [
    { start: -9, end: text.length, quote: text.slice(-9) },
    { start: 0, end: text.length + 3, quote: text },
    { start: 0.2, end: 2.8, quote: text.slice(0, 2) },
  ]) {
    const invalid = app.passageParts({ unitId: 'paragraph', ...selection });
    check(invalid.before === '' && invalid.after === '' && invalid.quote === selection.quote, 'Invalid UTF-16 boundaries cannot attach context through JavaScript slice coercion.');
  }
}

{
  const { component } = taskSetup();
  const tasks = [task('running', 'running'), task('ready', 'ready'), task('requested', 'applied')];
  const { api, calls } = readOnlyApi(path => path.endsWith('/status') ? ready : path.endsWith('/tasks') ? tasks : []);
  component.api = api; component.requestedTaskId = 'requested'; component.ngOnChanges(); await flush();
  check(component.selectedTask()?.id === 'requested' && !component.composeOpen(), 'An explicit historical task wins over unrelated running or ready tasks in the same file.');
  component.requestedTaskId = 'ready'; component.ngOnChanges(); await flush();
  check(component.selectedTask()?.id === 'ready', 'Changing only the requested task input opens that task without requiring a file change.');
  component.startComposing = true; component.ngOnChanges(); await flush();
  check(component.composeOpen() && component.selectedTask()?.id === 'ready', 'An input-only request to compose opens a new draft while retaining task context.');
  component.startComposing = false; component.ngOnChanges(); await flush();
  check(!component.composeOpen(), 'Returning from draft mode restores the task view.');
  component.selectedTask.set(tasks[2]); component.document = { ...component.document }; component.ngOnChanges(); await flush();
  check(component.selectedTask()?.id === 'requested', 'Refreshing the source preserves the user-selected task when no new requested ID arrives.');
  check(calls.every(call => call.method === 'GET'), 'Task selection and composing shortcuts never create, start, resolve or apply a task.');
  component.ngOnDestroy();
}

{
  const { component } = taskSetup(), delayed = deferred();
  const { api } = readOnlyApi(path => {
    if (path.endsWith('/status')) return ready;
    if (path.endsWith('/requests')) return [];
    return path.includes('/projects/p/') ? delayed.promise : [task('other-project-task', 'queued', 'a', 'other')];
  });
  component.api = api; component.requestedTaskId = 'old-project-task'; component.ngOnChanges();
  component.projectId = 'other'; component.document = document('a', 'other'); component.requestedTaskId = 'other-project-task'; component.ngOnChanges(); await flush();
  delayed.resolve([task('old-project-task', 'running')]); await flush();
  check(component.selectedTask()?.id === 'other-project-task' && component.tasks().every(item => item.projectId === 'other'), 'Late task list responses cannot overwrite the same file ID in another project.');
  check(!component.loading() && !component.hasActiveTask(), 'Old task loading and active states cannot leak into the new project.');
  component.ngOnDestroy();
}

{
  const { component } = taskSetup(), delayed = deferred();
  let reads = 0;
  const tasks = [task('first'), task('second')];
  const { api } = readOnlyApi(path => path.endsWith('/status') ? ready : path.endsWith('/requests') ? [] : ++reads === 1 ? delayed.promise : tasks);
  component.api = api; component.requestedTaskId = 'first'; component.ngOnChanges();
  component.requestedTaskId = 'second'; component.ngOnChanges(); await flush();
  delayed.resolve(tasks); await flush();
  check(component.selectedTask()?.id === 'second' && !component.loading(), 'The most recent explicit task wins when an older list request for the same document arrives last.');
  component.ngOnDestroy();
}

check(mutationAttempts.length === 0, 'Every navigation fixture completed without attempting a project, task, source or model mutation.');
console.log('Work areas: ' + checks + ' checks passed; real component methods, deferred read-only fixtures, no service or model calls.');
