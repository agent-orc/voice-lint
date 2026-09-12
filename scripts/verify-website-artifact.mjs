#!/usr/bin/env node
// Read-only release validation. The output inventory is derived from the public
// catalogues and evidence manifests; local runtime state is never required.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {JSDOM} from 'jsdom';
import {pages} from '../website/site.mjs';
import {guides,downloads} from '../website/guides.mjs';
import {studioImages} from '../website/studio-tour.mjs';

const args=process.argv.slice(2);
if(args.includes('--help')){
  console.log('Usage: npm run website:verify-artifact -- [--allow-dirty]\nChecks the current website/dist/voice build without writing files or making network/model requests.\nThe default requires matching Git HEAD and clean Voice sources at build and verification time.\n--allow-dirty permits local preparation; HEAD, source hashes and artifact checks still apply.');
  process.exit(0);
}
if(args.some(arg=>arg!=='--allow-dirty'))throw new Error('Only --allow-dirty and --help are supported.');
const allowDirty=args.includes('--allow-dirty');
if(allowDirty&&process.env.CI)throw new Error('--allow-dirty is for local preparation and is not allowed in CI.');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'website/dist/voice');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
const expectedFiles=new Set(),expectedInputs=new Set(),copies=new Map();
const safeRelative=value=>typeof value==='string'&&value.length>0&&!value.includes('\\')&&!value.startsWith('/')&&path.posix.normalize(value)===value&&!value.split('/').includes('..');
function expectFile(relative){if(!safeRelative(relative))throw new Error('Invalid publication path in a catalogue.');expectedFiles.add(relative);}
function expectInput(source){if(!safeRelative(source))throw new Error('Invalid publication source in a catalogue.');expectedInputs.add(source);}
function expectCopy(source,target){expectInput(source);expectFile(target);copies.set(target,source);}
async function readSource(source){
  if(!safeRelative(source))throw new Error('Invalid source input path.');
  const absolute=path.join(root,source);
  if(await fs.realpath(absolute)!==absolute||(await fs.lstat(absolute)).isSymbolicLink())throw new Error('Source input uses filesystem indirection: '+source);
  return fs.readFile(absolute);
}
async function readJson(source){try{return JSON.parse((await readSource(source)).toString('utf8'));}catch{throw new Error('Cannot read valid source JSON: '+source);}}
async function readOutputJson(file){try{return JSON.parse(await fs.readFile(path.join(output,file),'utf8'));}catch{throw new Error('Cannot read valid artifact JSON: '+file);}}

try{
  if(await fs.realpath(output)!==output||(await fs.lstat(output)).isSymbolicLink())throw new Error('Website output must be the local directory without indirection.');
  const deployment=await readJson('website/deployment-manifest.json');
  const target=new URL(deployment.target);
  check(target.protocol==='https:'&&target.hostname==='agent-orchestrator.dev'&&target.pathname==='/voice/','Deployment target must be https://agent-orchestrator.dev/voice/.');
  check(deployment.mountPath==='/voice/'&&deployment.artifactDirectory==='website/dist/voice','Deployment mount and artifact directory must match the Voice build.');
  check(deployment.runtimeRequired===false&&deployment.publishApplicationBackend===false,'Deployment must remain a static site without the Studio backend.');

  for(const asset of ['site.css','docs.css','product.css','site.js','json-viewer.js','json-viewer.css','writing-patterns.css','writing-patterns.js','research.css','research.js'])expectCopy('website/'+asset,asset);
  for(const name of ['practice','studies','strategies','libraries','review-economics'])expectCopy(`website/research/${name}.json`,`sources/research/${name}.json`);
  for(const name of ['practice','studies','strategies','libraries','economics-sources'])expectCopy(`website/research/de/${name}.json`,`sources/research/de/${name}.json`);
  for(const name of ['studio-review',...studioImages])for(const extension of ['png','capture.json'])expectCopy(`website/assets/${name}.${extension}`,`assets/${name}.${extension}`);
  expectCopy('packages/review/dist/voice-review.js','voice-review.js');
  expectCopy('packages/writing-rules/src/catalogue.json','sources/writing-rules/catalogue.json');
  for(const source of downloads)expectCopy(source,'sources/repository/'+source);
  for(const name of ['stored-source-task.example.json','stored-selection-decision.example.json'])expectCopy('docs/examples/'+name,'sources/examples/'+name);
  expectCopy('docs/verification/2026-09-12-browser-and-website/website.json','sources/verification-follow-up/website.json');

  const writingRoot='docs/verification/2026-09-12-writing-rules-and-docs';
  const writingEvidence=await readJson(writingRoot+'/manifest.json');
  if(!Array.isArray(writingEvidence.files))throw new Error('Writing evidence needs a file catalogue.');
  for(const entry of writingEvidence.files){
    if(!['README.md','website.json','writing-patterns.json','json-viewer.json'].includes(entry.path))throw new Error('Unexpected writing evidence input.');
    const source=writingRoot+'/'+entry.path;expectInput(source);
    const bytes=await readSource(source);
    check(bytes.length===entry.bytes&&sha(bytes)===entry.sha256,'Curated writing evidence changed: '+entry.path);
    if(entry.path.endsWith('.json'))expectCopy(source,'sources/verification-writing/'+entry.path);
  }
  expectCopy(writingRoot+'/manifest.json','sources/verification-writing/manifest.json');
  const evidenceRoot='docs/verification/2026-09-12';
  const evidence=await readJson(evidenceRoot+'/manifest.json');
  if(!Array.isArray(evidence.files))throw new Error('Verification evidence needs a file catalogue.');
  for(const entry of evidence.files){
    const relative=entry.path??entry.file;
    if(!safeRelative(relative))throw new Error('Invalid curated evidence path.');
    const source=evidenceRoot+'/'+relative,bytes=await readSource(source);
    check(bytes.length===entry.bytes&&sha(bytes)===entry.sha256,'Curated verification evidence changed: '+relative);
    expectCopy(source,'sources/verification/'+relative);
  }
  expectCopy(evidenceRoot+'/manifest.json','sources/verification/manifest.json');

  const routes=[...guides.map(guide=>`guides/${guide.slug}/`),...pages.map(page=>page.slug?page.slug+'/':'')];
  check(new Set(routes).size===routes.length,'Public route catalogue contains duplicates.');
  for(const guide of guides){expectCopy(guide.source,`sources/${guide.slug}.md`);expectFile(`guides/${guide.slug}/index.html`);}
  for(const page of pages)expectFile((page.slug?page.slug+'/':'')+'index.html');
  for(const name of ['project-reviews/index.html','build-info.json','sitemap.xml'])expectFile(name);
  for(const source of ['website/site.mjs','website/content/studio.json','website/research.mjs','website/review-economics.mjs','website/library-analysis.mjs','website/tooling-library.mjs','website/writing-patterns.mjs','website/studio-tour.mjs','website/docs-index.mjs','website/build.mjs','website/guides.mjs','website/render-guide.mjs','website/template.mjs','package-lock.json'])expectInput(source);

  const files=[];
  async function walk(directory,prefix=''){
    for(const entry of await fs.readdir(directory,{withFileTypes:true})){
      const relative=prefix+entry.name;
      if(entry.isSymbolicLink()){failures.push('Artifact contains a symlink: '+relative);continue;}
      if(entry.isDirectory())await walk(path.join(directory,entry.name),relative+'/');
      else if(entry.isFile())files.push(relative);
      else failures.push('Artifact contains a non-file entry: '+relative);
    }
  }
  await walk(output);
  for(const file of files)check(expectedFiles.has(file),'Unexpected artifact file: '+file);
  for(const file of expectedFiles)check(files.includes(file),'Missing artifact file: '+file);
  const build=await readOutputJson('build-info.json');
  check(build.schemaVersion===1&&build.product==='Voice public website','Unknown website build record.');
  check(build.deploymentTarget===target.href&&build.published===false,'Build record must identify this static target as a locally built artifact.');
  check(typeof build.builtAt==='string'&&Number.isFinite(Date.parse(build.builtAt)),'Build timestamp is missing or invalid.');
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',timeout:5000,windowsHide:true}).trim();
  const head=git(['rev-parse','HEAD']),sourcePath=git(['rev-parse','--show-prefix']);
  const currentlyDirty=!!git(['status','--porcelain','--untracked-files=normal','--','.']);
  check(build.git?.available===true&&build.git.commit===head,'Build record does not match current Git HEAD; rebuild from the intended source revision.');
  check(build.git?.sourcePath===sourcePath,'Build record identifies a different source directory.');
  check(typeof build.git?.workingTreeDirty==='boolean','Build record needs an explicit scoped dirty flag.');
  if(!allowDirty){
    check(build.git?.workingTreeDirty===false,'Build was created with dirty Voice sources; commit the intended changes and rebuild.');
    check(!currentlyDirty,'Current Voice sources are dirty; use --allow-dirty only for local preparation.');
  }
  if(!build.inputs||typeof build.inputs!=='object'||Array.isArray(build.inputs))throw new Error('Build record has no publication input hashes.');
  for(const source of Object.keys(build.inputs))check(expectedInputs.has(source),'Unexpected build input record: '+source);
  for(const source of expectedInputs){
    const recorded=build.inputs[source];
    check(typeof recorded==='string'&&/^[a-f0-9]{64}$/.test(recorded),'Missing or invalid build input hash: '+source);
    const bytes=await readSource(source);
    check(sha(bytes)===recorded,'Build input changed after build: '+source);
  }
  for(const [file,source] of copies){
    if(!files.includes(file))continue;
    check(sha(await fs.readFile(path.join(output,file)))===sha(await readSource(source)),'Copied artifact differs from its source: '+file);
  }
  const sameSet=(left,right)=>Array.isArray(left)&&left.length===right.length&&new Set(left).size===left.length&&left.every(value=>right.includes(value));
  check(sameSet(build.routes,routes),'Build routes differ from the product and guide catalogues.');
  check(sameSet(deployment.routes,routes.map(route=>'/voice/'+route)),'Deployment routes differ from the product and guide catalogues.');
  check(deployment.publicPageCount===pages.length&&deployment.htmlGuideCount===guides.length,'Deployment page counts differ from the catalogues.');
  const sitemapText=await fs.readFile(path.join(output,'sitemap.xml'),'utf8');
  const sitemap=new JSDOM(sitemapText,{contentType:'application/xml'});
  check(sameSet([...sitemap.window.document.querySelectorAll('loc')].map(element=>element.textContent),routes.map(route=>target.href+route)),'Sitemap differs from the public content routes.');
  sitemap.window.close();

  // Optional local comparison never prints or exports credentials. CI skips it.
  let localSecrets=[];
  if(!process.env.CI){
    try{
      const location=JSON.parse(await fs.readFile(path.join(root,'.voice-studio/session-location.json'),'utf8'));
      if(path.isAbsolute(location.sessionFile)){
        const session=JSON.parse(await fs.readFile(location.sessionFile,'utf8'));
        localSecrets=Object.entries(session).filter(([key,value])=>/(?:token|pairingCode)$/i.test(key)&&typeof value==='string'&&value.length>=5).map(([,value])=>value);
      }
    }catch{ /* Public artifact verification needs no running local Studio. */ }
  }
  const allowedRuntimeScripts=new Set(['site.js','voice-review.js','writing-patterns.js','research.js','json-viewer.js']);
  const executableTooling=/\b(?:createWritingToolDispatcher|writingReviewTools|composeWritingReviewPrompt|findWritingSignals|GoogleGenerativeAI)\b|https:\/\/(?:api\.openai\.com|api\.anthropic\.com|generativelanguage\.googleapis\.com)/;
  const privateCredential=/\bsk-[A-Za-z0-9_-]{24,}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/;
  const artifactDigest=createHash('sha256');
  let htmlCount=0;
  for(const file of files.sort()){
    const bytes=await fs.readFile(path.join(output,file));
    artifactDigest.update(file+'\0').update(bytes);
    check(!/(?:^|\/)(?:\.env(?:\.[^/]*)?|session(?:-location)?\.json|.*\.(?:pem|key)|AGENTS\.md)$/.test(file)&&!/(?:^|\/)(?:\.voice-studio|\.git|node_modules|test-results|artifacts|bin|obj)\//.test(file),'Private runtime file in artifact: '+file);
    check(!localSecrets.some(secret=>bytes.includes(Buffer.from(secret))),'Local credential found in artifact: '+file);
    if(file.endsWith('.png'))continue;
    const text=bytes.toString('utf8');
    check(!privateCredential.test(text),'Private credential pattern found in artifact: '+file);
    if(allowedRuntimeScripts.has(file))check(!executableTooling.test(text),'Executable writing/model tooling found in a public runtime script: '+file);
    if(!file.endsWith('.html'))continue;
    htmlCount++;
    const pageUrl=new URL(file,target);
    const dom=new JSDOM(text,{url:pageUrl.href});
    const document=dom.window.document;
    for(const element of document.querySelectorAll('textarea,[contenteditable]:not([contenteditable="false"]),iframe,object,embed'))failures.push('Executable input or embedded application in public HTML: '+file+' ('+element.tagName.toLowerCase()+')');
    for(const form of document.querySelectorAll('form')){
      const controls=[...form.querySelectorAll('input,button,select')];
      check(form.matches('form.pattern-filters[role="search"]')&&!form.hasAttribute('action')&&controls.every(control=>control.matches('input[type="search"],select')),'Public form is not a read-only catalogue filter: '+file);
    }
    for(const element of document.querySelectorAll('*'))check(![...element.attributes].some(attribute=>/^on/i.test(attribute.name)),'Inline executable handler in public HTML: '+file);
    for(const script of document.querySelectorAll('script')){
      const src=script.getAttribute('src');
      if(src){
        const url=new URL(src,pageUrl),relative=url.pathname.slice(target.pathname.length);
        check(url.origin===target.origin&&url.pathname.startsWith(target.pathname)&&allowedRuntimeScripts.has(relative),'Unapproved public script asset: '+file);
      }else check(script.getAttribute('type')==='application/ld+json','Inline executable script in public HTML: '+file);
    }
    const canonical=document.querySelector('link[rel="canonical"]')?.getAttribute('href');
    const route=file==='project-reviews/index.html'?'':file.slice(0,-'index.html'.length);
    check(canonical===target.href+route,'Canonical URL differs from its route: '+file);
    for(const element of document.querySelectorAll('[href],[src]')){
      const raw=element.getAttribute('href')??element.getAttribute('src');
      if(!raw||raw.startsWith('#')||raw.startsWith('data:'))continue;
      let url;try{url=new URL(raw,pageUrl);}catch{failures.push('Invalid public link in '+file);continue;}
      check(!['file:','javascript:'].includes(url.protocol),'Non-public link scheme in '+file);
      if(['localhost','127.0.0.1','[::1]'].includes(url.hostname))check(file==='studio/index.html'&&url.href==='http://127.0.0.1:5188/','Unexpected development-server link in '+file);
      if(url.origin!==target.origin||!url.pathname.startsWith(target.pathname))continue;
      const relative=decodeURIComponent(url.pathname.slice(target.pathname.length));
      const destination=!relative||relative.endsWith('/')?relative+'index.html':relative;
      check(expectedFiles.has(destination),'Link targets an unpublished file from '+file+': '+destination);
    }
    if(file==='project-reviews/index.html'){
      check(document.querySelector('meta[name="robots"]')?.content==='noindex','Legacy redirect must remain noindex.');
      check(document.querySelector('meta[http-equiv="refresh"]')?.content==='0;url=../','Legacy project-review route must redirect to the homepage.');
    }
    dom.window.close();
  }
  check(htmlCount===routes.length+1,'Artifact HTML count does not match content routes plus the legacy redirect.');
  if(failures.length){
    console.error('Website artifact verification failed:\n'+[...new Set(failures)].map(message=>' - '+message).join('\n'));
    process.exitCode=1;
  }else{
    console.log(`Website artifact verified: ${files.length} files, ${routes.length} content routes + 1 redirect, ${expectedInputs.size} current input hashes; Git ${head}${allowDirty?' (local dirty preparation allowed)':''}.`);
    console.log('Artifact SHA-256: '+artifactDigest.digest('hex'));
  }
}catch(error){
  console.error('Website artifact verification failed: '+(error instanceof Error?error.message:'Unknown error'));
  process.exitCode=1;
}
