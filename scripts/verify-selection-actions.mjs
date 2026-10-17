// Verify the review panel's navigation shortcuts without services or source writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const signal = initial => {
  let value = initial;
  const read = () => value;
  read.set = next => { value = next; };
  read.update = change => { value = change(value); };
  return read;
};
const decorator = () => value => value;
const core = {
  Component: decorator, Input: decorator, Output: decorator, signal,
  EventEmitter: class { values = []; emit(value) { this.values.push(value); } },
  inject: () => ({}), NgZone: class {},
};
const source = fs.readFileSync(new URL('../frontend/src/app/selection-review.component.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
  reportDiagnostics: true,
});
assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
const module = { exports: {} };
vm.runInNewContext(compiled.outputText, {
  exports: module.exports,
  require: id => id === '@angular/core' ? core : {},
});

let checks = 0;
for (const [text, quote] of [
  ['Our tools always help.', 'always'],
  ['Unsere Werkzeuge helfen immer.', 'immer'],
  ['🧪 Präzise Wörter helfen.', 'Präzise Wörter'],
]) {
  const component = new module.exports.SelectionReviewComponent();
  component.document = { units: [{ id: 'paragraph', text }] };
  const start = text.indexOf(quote);
  component.selection = { unitId: 'paragraph', start, end: start + quote.length, quote };
  component.api = () => { throw new Error('Navigation must not send an API request.'); };

  component.requestEdit(); component.requestTask();
  assert.equal(component.editRequested.values.length, 1, 'A valid passage can open the text editor.');
  assert.equal(component.taskRequested.values.length, 1, 'A valid passage can open task creation.');
  checks += 2;

  component.disabled = true;
  component.requestEdit(); component.requestTask();
  component.disabled = false; component.busy.set(true);
  component.requestEdit(); component.requestTask();
  component.busy.set(false);
  component.document = { units: [{ id: 'paragraph', text: 'The source has changed.' }] };
  component.requestEdit(); component.requestTask();
  component.document = { units: [] };
  component.requestEdit(); component.requestTask();
  assert.equal(component.editRequested.values.length, 1, 'Disabled, busy, changed and missing passages cannot open an editable draft.');
  assert.equal(component.taskRequested.values.length, 1, 'Disabled, busy, changed and missing passages cannot open a task with an invalid selection.');
  checks += 2;
}
console.log('Selection actions: ' + checks + ' checks passed; English, German and Unicode passages, no API or source writes.');
