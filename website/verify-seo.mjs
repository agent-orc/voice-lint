// Verify an existing static website. No build, deployment, indexing request or model call.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {JSDOM} from 'jsdom';
import {chromium} from '@playwright/test';
import {guides} from './guides.mjs';
import {pages} from './site.mjs';
import {websiteVerificationBase as base,websiteVerificationDirectory,publicVerification} from './verification-target.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const productionBase='https://agent-orchestrator.dev/voice/';
const routeNames=[...pages.map(page=>page.slug?page.slug+'/':''),...guides.map(guide=>'guides/'+guide.slug+'/')];
assert.equal(new Set(routeNames).size,routeNames.length,'The publication catalogue must not duplicate a route');
const routeFor=(route,locale)=>(locale==='de'?'de/':'')+route;
const sha=value=>createHash('sha256').update(value).digest('hex');
const fetched=new Map(),assetCache=new Map(),checks=[],records=[];
const report={capturedAt:new Date().toISOString(),target:base,scope:'Static HTML and technical crawl checks, plus mobile Chrome without JavaScript. No Search Console access, indexing/ranking claim, field Core Web Vitals or model evaluation.',status:'running',checks,routes:records};
const output=path.join(root,'test-results',websiteVerificationDirectory,'seo.json');
let browser;
const effectiveLanguage=element=>element.closest('[lang]')?.getAttribute('lang')?.split('-')[0];
const meta=(doc,name,attribute='name')=>{
 const matches=doc.querySelectorAll('meta['+attribute+'="'+name+'"]');
 assert.equal(matches.length,1,'Expected one '+name+' meta tag');
 const value=matches[0].getAttribute('content')?.trim();assert.ok(value,'Empty '+name+' meta tag');return value;
};
async function get(url,options){const response=await fetch(url,options);assert.equal(response.status,200,'GET '+url);return response;}
async function imageSize(url){
 if(!assetCache.has(url))assetCache.set(url,(async()=>{
  const response=await get(url),bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};
  return null;
 })());
 return assetCache.get(url);
}
try{
 report.build=await(await get(new URL('build-info.json',base))).json();
 for(const route of routeNames)for(const locale of ['en','de']){
  const relative=routeFor(route,locale),url=new URL(relative,base),canonical=new URL(relative,productionBase).href;
  const response=await get(url,{headers:{'Accept-Language':locale==='en'?'de-DE,de;q=0.9':'en-US,en;q=0.9'}});
  assert.match(response.headers.get('content-type')??'',/text\/html/,'Content pages must be HTML');
  assert.ok(!/noindex/i.test(response.headers.get('x-robots-tag')??''),'A content page must not send noindex');
  const html=await response.text(),dom=new JSDOM(html,{url:url.href}),doc=dom.window.document;
  assert.equal(doc.documentElement.lang,locale,'The URL must determine the HTML language');
  assert.equal(doc.querySelectorAll('article').length,1,'A static route must contain one localized article');
  const article=doc.querySelector('article');assert.equal(effectiveLanguage(article),locale);
  assert.ok(!article.closest('[hidden],[aria-hidden="true"]'),'The article must be available without scripts');
  assert.equal(doc.querySelectorAll('h1').length,1,'A content page needs one h1');
  assert.ok(doc.querySelector('h1').textContent.trim());assert.ok(!doc.querySelector('h1').closest('[hidden],[aria-hidden="true"]'));
  if(route.startsWith('guides/'))assert.equal(effectiveLanguage(doc.querySelector('.guide-content')),locale,'Guide language must follow its URL');
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length,1);assert.equal(doc.querySelector('link[rel="canonical"]').href,canonical);
  assert.ok(![...doc.querySelectorAll('meta[name="robots"]')].some(node=>/noindex/i.test(node.content)),'A content page must be indexable');
  const title=doc.title.trim(),description=meta(doc,'description');assert.ok(title);
  const expectedAlternates={en:new URL(route,productionBase).href,de:new URL('de/'+route,productionBase).href,'x-default':new URL(route,productionBase).href};
  const alternates=[...doc.querySelectorAll('link[rel="alternate"][hreflang]')];assert.equal(alternates.length,3);
  for(const [language,target]of Object.entries(expectedAlternates)){
   const alternate=alternates.filter(link=>link.hreflang===language);assert.equal(alternate.length,1);assert.equal(alternate[0].href,target);
  }
  for(const language of ['en','de']){
   const links=doc.querySelectorAll('a[data-locale="'+language+'"]');assert.equal(links.length,1,'Language selection must use a normal link');
   assert.equal(new URL(links[0].href).pathname,new URL(expectedAlternates[language]).pathname);
   assert.equal(links[0].getAttribute('aria-label'),language==='de'?'Deutsch':'English');
  }
  assert.equal(meta(doc,'og:title','property'),title);assert.equal(meta(doc,'og:description','property'),description);assert.equal(meta(doc,'og:url','property'),canonical);
  assert.equal(meta(doc,'og:locale','property').split('_')[0],locale);meta(doc,'og:type','property');meta(doc,'og:site_name','property');
  const structured=[...doc.querySelectorAll('script[type="application/ld+json"]')];assert.ok(structured.length,'Provide structured page metadata');
  for(const script of structured){const value=JSON.parse(script.textContent);assert.equal(value['@context'],'https://schema.org');const nodes=value['@graph']??[value];assert.ok(Array.isArray(nodes)&&nodes.length);for(const node of nodes)assert.ok(node['@type'],'Structured data needs a type');const pageNodes=nodes.filter(node=>node.url===canonical||node['@id']===canonical);assert.ok(pageNodes.length,'Structured data must identify the current page');for(const node of pageNodes)if(node.inLanguage)assert.equal(node.inLanguage,locale);}
  for(const image of doc.querySelectorAll('img')){
   assert.ok(image.hasAttribute('alt'),'Image alternative text must be explicit');
   assert.ok(image.alt.trim()||image.getAttribute('role')==='presentation'||image.getAttribute('aria-hidden')==='true','An informative image needs alternative text');
   const source=new URL(image.getAttribute('src'),url);assert.equal(source.origin,url.origin,'Review images must be served with the static website');
   const size=await imageSize(source.href);
   if(size){const width=Number(image.getAttribute('width')),height=Number(image.getAttribute('height'));assert.ok(width>0&&height>0,'Known PNG dimensions must reserve layout space: '+source.pathname);assert.ok(Math.abs(width/height-size.width/size.height)<0.01,'Declared image aspect ratio must match its file: '+source.pathname);}
  }
  const record={route:url.pathname,locale,title,description,canonical,htmlSha256:sha(html),status:response.status};records.push(record);fetched.set(url.pathname,{doc,dom,record});
 }
 assert.equal(new Set(records.map(record=>record.title)).size,records.length,'Each localized page needs a distinct title');
 assert.equal(new Set(records.map(record=>record.description)).size,records.length,'Each localized page needs a distinct description');
 checks.push(records.length+' static content URLs expose one localized article/h1, unique metadata, reciprocal EN/DE/x-default links, Open Graph and valid structured page JSON.');
 let guideLinks=0;
 for(const {doc,record}of fetched.values())for(const link of doc.querySelectorAll('a[href]')){
  const target=new URL(link.href);if(!target.pathname.startsWith('/voice/')||!target.pathname.includes('/guides/'))continue;
  if(target.origin!==new URL(base).origin&&target.origin!==new URL(productionBase).origin)continue;
  const targetLocale=target.pathname.startsWith('/voice/de/')?'de':'en';
  if(!link.hasAttribute('data-locale'))assert.equal(targetLocale,record.locale,'Guide navigation must preserve language: '+record.route+' → '+target.pathname);
  const destination=fetched.get(target.pathname);assert.ok(destination,'Guide link must name a published HTML route: '+target.pathname);
  if(target.hash)assert.ok(destination.doc.getElementById(decodeURIComponent(target.hash.slice(1))),'Missing guide anchor: '+target.pathname+target.hash);
  guideLinks++;
 }
 checks.push(guideLinks+' guide links preserve the selected language and resolve to published routes and section IDs.');
 let contentAnchors=0;
 for(const {doc,record}of fetched.values())for(const link of doc.querySelectorAll('a[href]')){
  const target=new URL(link.href);
  if(!target.hash||!target.pathname.startsWith('/voice/')||(target.origin!==new URL(base).origin&&target.origin!==new URL(productionBase).origin))continue;
  const destination=fetched.get(target.pathname);
  assert.ok(destination,'Internal content anchor must name a published page: '+record.route+' → '+target.pathname+target.hash);
  assert.ok(destination.doc.getElementById(decodeURIComponent(target.hash.slice(1))),'Missing internal content anchor: '+record.route+' → '+target.pathname+target.hash);
  contentAnchors++;
 }
 checks.push(contentAnchors+' internal content anchors resolve across every product and guide page, including locale-specific research and rule IDs.');
 const sitemapText=await(await get(new URL('sitemap.xml',base))).text();
 const sitemap=new JSDOM(sitemapText,{contentType:'application/xml'});
 const locations=[...sitemap.window.document.querySelectorAll('url > loc')].map(node=>node.textContent);
 assert.equal(new Set(locations).size,locations.length);assert.deepEqual(locations.sort(),records.map(record=>record.canonical).sort(),'Sitemap must contain exactly the current EN/DE content URLs');sitemap.window.close();
 for(const locale of ['en','de']){
  const relative=routeFor('project-reviews/',locale),response=await get(new URL(relative,base)),dom=new JSDOM(await response.text(),{url:new URL(relative,base).href});
  assert.match(meta(dom.window.document,'robots'),/\bnoindex\b/);assert.equal(dom.window.document.querySelector('link[rel="canonical"]').href,new URL(routeFor('',locale),productionBase).href);assert.ok(dom.window.document.querySelector('meta[http-equiv="refresh"]'));
  assert.ok(!locations.includes(new URL(relative,productionBase).href));dom.window.close();
 }
 checks.push('The sitemap exactly lists content routes; both legacy project-review redirects are noindex and canonicalize to their localized homepages.');
 browser=await chromium.launch({channel:'chrome',headless:true,timeout:15000});
 const context=await browser.newContext({javaScriptEnabled:false,locale:'de-DE',viewport:{width:390,height:844},storageState:{cookies:[],origins:[{origin:new URL(base).origin,localStorage:[{name:'voice-site:locale',value:'de'}]}]}});
 const page=await context.newPage();page.setDefaultTimeout(12000);const browserErrors=[];page.on('pageerror',error=>browserErrors.push(error.message));
 await page.goto(new URL('guides/writing-tools/',base).href,{waitUntil:'load'});
 for(const locale of ['en','de','en']){
  const target=new URL(routeFor('guides/writing-tools/',locale),base).href;
  if(page.url()!==target)await Promise.all([page.waitForURL(target,{waitUntil:'load'}),page.locator('a[data-locale="'+locale+'"]').click()]);
  assert.equal(await page.locator('html').getAttribute('lang'),locale);assert.equal(await page.locator('article').count(),1);assert.ok(await page.getByRole('heading',{level:1}).isVisible());
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No-JavaScript guide must fit a mobile viewport');
 }
 assert.deepEqual(browserErrors,[]);await context.close();
 checks.push('Chrome without JavaScript opens the English guide despite German browser/saved preference, follows EN→DE→EN links and fits a 390px viewport.');
 if(publicVerification){const robots=await(await get('https://agent-orchestrator.dev/robots.txt')).text();assert.ok(robots.includes('Sitemap: https://agent-orchestrator.dev/voice/sitemap.xml'));checks.push('The public root robots.txt advertises the Voice sitemap.');}
 report.status='passed';console.log('Voice technical SEO: '+records.length+' content URLs and '+checks.length+' check groups passed. Indexing, rankings and field Core Web Vitals were not measured.');
}catch(error){report.status='failed';report.error=error.stack??String(error);process.exitCode=1;console.error(error);}
finally{if(browser)await browser.close();for(const {dom}of fetched.values())dom.window.close();await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');}
