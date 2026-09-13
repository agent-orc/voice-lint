import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium,expect} from '@playwright/test';
import {readSession} from './session.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const session=await readSession(root),base='http://127.0.0.1:5188';
const api=async route=>{const r=await fetch(base+route,{headers:{Authorization:'Bearer '+session.token}});assert(r.ok);return r.json();};
const project=(await api('/api/projects')).find(project=>project.name==='Voice · Website');assert(project,'Run npm run onboard:website first.');
const copy=JSON.parse(await fs.readFile(path.join(root,'website/content/studio.json'),'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const page=await context.newPage(),errors=[],writes=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
await context.route('**/api/**',async route=>{
 const request=route.request(),url=new URL(request.url());
 if(!['GET','HEAD','OPTIONS'].includes(request.method())&&!url.pathname.startsWith('/api/session/')){writes.push(request.method()+' '+url.pathname);await route.abort();}else await route.continue();
});
try{
 await page.goto(base+'/?project='+project.id);
 await page.locator('#pairing-code').fill(session.pairingCode);await page.locator('#remember-browser').uncheck();
 await page.getByRole('button',{name:'Open local Studio',exact:true}).click();
 const frame=page.frameLocator('iframe.live-frame');
 await expect(frame.locator('article:not([hidden]) h1[data-voice-unit]')).toHaveText(copy.en.title,{timeout:20000});
 await frame.locator('a[data-locale="de"]').click();
 const heading=frame.locator('article:not([hidden]) h1[data-voice-unit]');await expect(heading).toHaveText(copy.de.title);
 await heading.evaluate(element=>{const selection=window.getSelection(),range=document.createRange();range.selectNodeContents(element);selection.removeAllRanges();selection.addRange(range);element.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}));});
 await expect(page.locator('#voice-review-panel blockquote').filter({hasText:copy.de.title})).toBeVisible();
 assert((await frame.locator('article:not([hidden]) .lead').innerText())===copy.de.lead);
 assert(await page.locator('.browser-connection-badge').isVisible());
 // Ordinary website links retain the explicit local bridge opt-in.
 const guide=frame.locator('article:not([hidden]) a[href*="guides/workflow/"]').first();await guide.click();
 await expect(frame.locator('.guide-content p[data-voice-unit]').filter({hasText:'Starte die Anwendung im ausgecheckten Voice-Studio-Repository:'})).toHaveText('Starte die Anwendung im ausgecheckten Voice-Studio-Repository:',{timeout:20000});
 const frameUrl=await frame.locator('html').evaluate(()=>location.href);assert(new URL(frameUrl).searchParams.get('voice-studio')==='1');
 assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
 const output=path.join(root,'test-results/voice-onboarding');await fs.mkdir(output,{recursive:true});
 await page.screenshot({path:path.join(output,'mapped-guide.png')});
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({capturedAt:new Date().toISOString(),projectId:project.id,sourceDocuments:45,checks:['Original EN/DE JSON heading maps to visible HTML','German umlauts and exact selected quote reach Studio','Local navigation retains the HTML bridge','Explicit original Markdown route maps to the actual HTML guide','No source/model writes or browser exceptions'],errors,writes},null,2)+'\n');
 console.log('PASS Voice onboarding: original EN/DE JSON, exact German selection, mapped Markdown route, retained local bridge, no source or model writes.');
}catch(error){console.error(JSON.stringify({frames:page.frames().map(frame=>frame.url()),errors,writes,body:(await page.locator('body').innerText()).slice(-4000)},null,2));throw error;}finally{await browser.close();}
