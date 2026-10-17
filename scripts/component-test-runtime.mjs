// Minimal Angular/browser boundary; component and layout behavior run from real source.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

export function loadComponent(file, name, globals = {}) {
  const timers = new Map(), storage = new Map(), urls = [];
  let nextTimer = 0;
  const signal = initial => {
    let value = initial;
    const get = () => value;
    get.set = next => { value = next; };
    get.update = change => { value = change(value); };
    return get;
  };
  const decorator = () => value => value;
  const core = {
    Component: decorator, Input: decorator, Output: decorator, ViewChild: decorator, HostListener: decorator,
    EventEmitter: class { values = []; emit(value) { this.values.push(value); } }, signal, computed: fn => fn,
    inject: () => ({ run: fn => fn(), runOutsideAngular: fn => fn(), bypassSecurityTrustHtml: value => value,
      locale: () => 'de', t: value => value }), NgZone: class {},
  };
  const location = { origin: 'http://127.0.0.1:5188', search: '', href: 'http://127.0.0.1:5188/' };
  const history = {
    state: null,
    replaceState(state, title, value) {
      const url = new URL(value, location.href);
      location.href = url.href; location.search = url.search;
      urls.push(url.href);
    },
  };
  const modules = new Map();
  function load(file) {
    if (modules.has(file)) return modules.get(file);
    const compiled = ts.transpileModule(fs.readFileSync(new URL('../frontend/src/app/' + file, import.meta.url), 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, experimentalDecorators: true },
      reportDiagnostics: true,
    });
    assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0, file + ' TypeScript syntax');
    const module = { exports: {} };
    modules.set(file, module.exports);
    vm.runInNewContext(compiled.outputText, {
      exports: module.exports,
      require: id => id === '@angular/core' ? core : id === './workspace-layout' ? load('workspace-layout.ts') : {},
      crypto: webcrypto, URLSearchParams, URL, location, history, console,
      localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
      setTimeout: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
      clearTimeout: id => timers.delete(id), clearInterval: id => timers.delete(id),
      requestAnimationFrame: callback => { const id = ++nextTimer; timers.set(id, callback); return id; },
      cancelAnimationFrame: id => timers.delete(id),
      window: { location, innerWidth: 1440, innerHeight: 1000, addEventListener() {}, removeEventListener() {} },
      ...globals,
    }, { filename: file });
    return module.exports;
  }
  return {
    Component: load(file)[name], timers, urls, location, storage,
    fire: () => {
      const entry = timers.entries().next().value;
      assert.ok(entry, 'timer exists');
      timers.delete(entry[0]); entry[1]();
    },
  };
}
