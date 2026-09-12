import {websiteVerificationBase,websiteVerificationDirectory,publicVerification} from './verification-target.mjs';
// Read-only QA of the already built local public website. Does not start services or models.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';
import {marked} from 'marked';
import {guides} from './guides.mjs';
import catalogue from '../packages/writing-rules/src/catalogue.json' with {type:'json'};

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=websiteVerificationBase;

const verificationSource=await fs.readFile(path.join(root,guides.find(item=>item.slug==='verification').source),'utf8');
const expectedVerificationRecords=[];marked.walkTokens(marked.lexer(verificationSource),token=>{if(token.type==='link')expectedVerificationRecords.push(token.href);});
assert(expectedVerificationRecords.length>0&&expectedVerificationRecords.every(href=>/\.json$/.test(href)),'The maintained Verification list must contain only JSON record links.');
const checks=[],errors=[],requests=[],links=new Set();
const browser=await chromium.launch({channel:'chrome',headless:true,timeout:15000});
try{
 const context=await browser.newContext({locale:'de-DE',permissions:['clipboard-read','clipboard-write']});
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',error=>errors.push(error.message));page.on('request',request=>requests.push({method:request.method(),url:request.url()}));
 const current=()=>page.locator('article:not([hidden])');
 async function language(locale){await page.getByRole('button',{name:locale.toUpperCase(),exact:true}).click();assert.equal(await page.locator('html').getAttribute('lang'),locale);}
 async function recordLinks(){for(const href of await page.locator('a[href]').evaluateAll(items=>items.map(item=>item.href)))if(href.startsWith(base))links.add(href);}
 await page.goto(new URL('writing-patterns/',base).href,{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('html').getAttribute('lang'),'en');
 for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const locale of ['en','de']){
   await language(locale);const article=current();
   await article.locator('[data-pattern-filters]:not([hidden])').waitFor();
   assert.equal(await article.locator('[data-pattern-rule]').count(),catalogue.rules.length);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Writing patterns must fit the viewport');
   await article.locator('[data-pattern-category]').selectOption('claims');
   const expected=catalogue.rules.filter(rule=>rule.category==='claims').length;
   assert.equal(await article.locator('[data-pattern-rule]:not([hidden])').count(),expected);
   await article.locator('[data-pattern-search]').fill('no-matching-writing-rule-unique');assert.equal(await article.locator('[data-pattern-rule]:not([hidden])').count(),0);
   await article.locator('[data-pattern-search]').fill('');await article.locator('[data-pattern-category]').selectOption('');
   assert.equal(await article.locator('[data-pattern-rule]:not([hidden])').count(),catalogue.rules.length);
   checks.push(`${locale} ${viewport.width}px: ${catalogue.rules.length} anti-patterns, combined search/category filtering and no horizontal page overflow.`);

   for(const rule of catalogue.rules){
    assert(rule.antiPattern?.name?.[locale]&&rule.antiPattern?.symptom?.[locale]&&rule.antiPattern?.readerCost?.[locale],'Every canonical rule needs an explicit localized anti-pattern.');
    const card=article.locator('[data-pattern-rule][id="'+locale+'-'+rule.id+'"]'),summary=card.locator(':scope > summary');
    assert((await summary.innerText()).includes(rule.antiPattern.name[locale]),'Closed summary must lead with the negative pattern name.');
    assert.equal(await summary.locator('.pattern-preview').innerText(),rule.examples[locale].before,'Concrete negative example must be visible before opening a rule.');
    if(await card.getAttribute('open')===null)await summary.click();
    const cost=card.locator('.pattern-cost');assert(await cost.isVisible());assert((await cost.innerText()).includes(rule.antiPattern.readerCost[locale]),'Reader cost must be visible after opening the anti-pattern.');
    assert((await card.locator('.pattern-remedy').innerText()).includes(rule.title[locale]),'Positive rule remains a remedy inside the details.');
    assert(await card.getByRole('heading',{name:locale==='de'?'Gegen-Prompt':'Counter-prompt',exact:true}).isVisible());
    assert.equal(await card.locator('.code-block code').first().textContent(),rule.prompt[locale],'Counter-prompt preserves the canonical full instructions.');
    await summary.click();
   }
   checks.push(locale+' '+viewport.width+'px: all '+catalogue.rules.length+' negative names and bad examples are visible upfront; opening each card reveals its reader cost, remedy and counter-prompt.');

   assert.equal(await page.locator('[data-writing-playground], [data-signal-form], [data-prompt-form], textarea, button[type=submit]').count(),0,'Public pages must not expose analysis or prompt composition controls');
   checks.push(locale+' '+viewport.width+'px: static rule reference exposes no text-analysis form or prompt-composition controls.');
   await recordLinks();
  }
 }

 await page.setViewportSize({width:1440,height:1000});await language('en');
 const chosen=catalogue.rules[0],hash='#en-'+chosen.id;
 await page.goto(new URL('writing-patterns/'+hash,base).href,{waitUntil:'domcontentloaded'});
 await page.locator(hash+'[open]').waitFor();checks.push('Initial rule hash opens the native details section.');
 const search=current().locator('[data-pattern-search]');await search.fill('no-matching-writing-rule-unique');assert(await page.locator(hash).getAttribute('hidden')!==null);
 await current().locator('.pattern-profiles details > summary').click();await current().locator(`.pattern-profile-list a[href="${hash}"]`).first().click();
 await page.locator(hash+':not([hidden])[open]').waitFor();assert.equal(await search.inputValue(),'');checks.push('Clicking the same rule hash again clears an excluding filter and reopens the requested rule.');
 const deHash='#de-'+chosen.id;await page.goto(new URL('writing-patterns/'+deHash,base).href,{waitUntil:'domcontentloaded'});await page.locator(deHash+'[open]').waitFor();assert.equal(await page.locator('html').getAttribute('lang'),'de');checks.push('A German deep link selects German even when the prior preference was English.');
 await language('en');if(await current().locator('.pattern-rule').first().getAttribute('open')===null)await current().locator('.pattern-rule').first().locator('summary').first().click();
 const firstRule=current().locator('.pattern-rule').first();await firstRule.locator('.copy-code').click();assert.equal((await page.evaluate(()=>navigator.clipboard.readText())).replaceAll('\r\n','\n'),await firstRule.locator('code').textContent());checks.push('Individual rule prompt copy preserves its full text.');

 await page.goto(new URL('guides/verification/',base).href,{waitUntil:'domcontentloaded'});await language('en');
 assert.equal(await page.locator('.guide-content img').count(),0);assert.equal(await page.locator('.guide-article a[href$=".md"]').count(),0);
 const evidenceLinks=page.locator('.guide-content a[href$=".json"]'),recordCount=await evidenceLinks.count();assert.equal(recordCount,expectedVerificationRecords.length);assert.equal(await page.locator('.guide-content a[href]:not(.heading-anchor)').count(),recordCount);await evidenceLinks.first().click();
 const dialog=page.getByRole('dialog');await dialog.locator('pre:not([hidden])').waitFor();const rendered=await dialog.locator('code').textContent();assert.equal(JSON.stringify(JSON.parse(rendered),null,2),rendered);assert(page.url().includes('/guides/verification/'));await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});checks.push('Actual Verification page lists all '+recordCount+' maintained JSON records and opens an in-place formatted dialog, without image/Markdown record links.');
 await recordLinks();

 await page.goto(new URL('studio/',base).href,{waitUntil:'domcontentloaded'});await language('en');
 const screenshots=current().locator('.studio-tour img');assert.equal(await screenshots.count(),3);
 for(const image of await screenshots.all()){
  await image.scrollIntoViewIfNeeded();await image.evaluate(img=>img.decode());const src=await image.getAttribute('src');assert(/studio-(live-review|source|focus)\.png$/.test(src));
  assert(await image.evaluate(img=>img.complete&&img.naturalWidth>0));const metadataUrl=new URL(src.replace(/\.png$/,'.capture.json'),page.url()).href;const response=await context.request.get(metadataUrl);assert.equal(response.status(),200);const metadata=await response.json();assert(metadata.realProject===true&&metadata.readOnly===true);assert.equal(await image.evaluate(img=>img.naturalWidth),metadata.width);
 }checks.push('Studio page loads all three actual review/source/mobile PNG captures with matching read-only real-project metadata.');await recordLinks();
 await page.goto(new URL('docs/',base).href,{waitUntil:'domcontentloaded'});await recordLinks();await page.goto(base,{waitUntil:'domcontentloaded'});await recordLinks();
 for(const href of links){const response=await context.request.get(href);assert.equal(response.status(),200,'Broken local link: '+new URL(href).pathname);if(new URL(href).hash&&(response.headers()['content-type']||'').includes('text/html')){const found=await response.text(),id=decodeURIComponent(new URL(href).hash.slice(1));assert(found.includes(`id="${id}"`),'Broken local section: '+new URL(href).pathname+new URL(href).hash);}}
 checks.push(`${links.size} local writing, docs, Git, Studio and verification links/section targets resolve.`);

 const noJs=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const fallback=await noJs.newPage();await fallback.goto(new URL('writing-patterns/',base).href);assert.equal(await fallback.locator('article:not([hidden]) [data-pattern-rule]').count(),catalogue.rules.length);await fallback.locator('article:not([hidden]) [data-pattern-rule] summary').first().click();assert(await fallback.locator('article:not([hidden]) [data-pattern-rule] code').first().isVisible());await noJs.close();checks.push(catalogue.rules.length+' anti-patterns and their counter-prompts remain readable on mobile without JavaScript.');
 for(const asset of ['writing-playground.js','writing-rules/index.js','writing-rules/tools.js']){
  const response=await context.request.get(new URL(asset,base).href);assert.equal(response.status(),404,'Executable writing capability must not be publicly served: '+asset);
 }
 assert(requests.every(request=>!new URL(request.url).pathname.includes('/writing-rules/')&&!request.url.includes('writing-playground')),'Public interactions must not load writing tooling');
 checks.push('Removed playground and executable writing-library routes return 404; public controls load no writing tools.');
 assert.deepEqual(errors,[]);assert(requests.every(request=>request.method==='GET'),'Public page controls must not send mutation or model requests');assert(requests.every(request=>new URL(request.url).origin===url.origin),'Public browsing loads no external resources');
 checks.push('No browser exceptions, mutation requests or external uploads occurred.');
 const info=await(await context.request.get(new URL('build-info.json',base).href)).json();
 const output=path.join(root,'test-results/'+websiteVerificationDirectory);await fs.mkdir(output,{recursive:true});await fs.writeFile(path.join(output,'writing-patterns.json'),JSON.stringify({capturedAt:new Date().toISOString(),scope:'Actual built public website in local Chrome; no Studio sessions, source edits or model calls.',checks,build:{builtAt:info.builtAt,inputs:info.inputs}},null,2)+'\n');
 console.log(`Writing patterns public UI: ${checks.length} checks passed, EN/DE at 1440/390px, static rules/hash/filter/copy, JSON dialogs and three authentic Studio captures. No model calls or project writes.`);
}finally{await browser.close();}
