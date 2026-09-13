import {JSDOM} from 'jsdom';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const artifact=path.join(root,'website/dist/voice');
const base='https://agent-orchestrator.dev/voice/';
const files=[];
async function collect(directory){
 for(const entry of await fs.readdir(directory,{withFileTypes:true})){
  assert(!entry.isSymbolicLink(),'Deployment artifact must not contain symlinks.');
  const absolute=path.join(directory,entry.name);
  if(entry.isDirectory())await collect(absolute);
  else{assert(entry.isFile());files.push(path.relative(artifact,absolute).replaceAll('\\','/'));}
 }
}
await collect(artifact);
const info=JSON.parse(await fs.readFile(path.join(artifact,'build-info.json'),'utf8'));
assert.equal(info.deploymentTarget,base);
assert(info.git.available&&/^[a-f0-9]{40}$/.test(info.git.commit));
assert.equal(info.git.workingTreeDirty,false,'Publish and compare a clean committed build.');
const checked=[];
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const request=url=>fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000)});
for(let offset=0;offset<files.length;offset+=6){
 await Promise.all(files.slice(offset,offset+6).map(async relative=>{
  const response=await request(new URL(relative,base));assert.equal(response.status,200,relative);
  const expected=await fs.readFile(path.join(artifact,relative));
  const received=Buffer.from(await response.arrayBuffer());
  assert.equal(hash(received),hash(expected),'Hosted bytes differ: '+relative);
  const type=response.headers.get('content-type')??'';
  if(relative.endsWith('.html'))assert(type.startsWith('text/html'),relative+' MIME');
  if(relative.endsWith('.json'))assert(type.includes('application/json'),relative+' MIME');
  if(relative.endsWith('.css'))assert(type.startsWith('text/css'),relative+' MIME');
  if(relative.endsWith('.js')||relative.endsWith('.mjs'))assert(type.includes('javascript'),relative+' MIME');
  if(relative.endsWith('.png'))assert(type.startsWith('image/png'),relative+' MIME');
  checked.push({path:relative,sha256:hash(received),contentType:type});
 }));
}
for(const route of info.routes){
 const response=await request(new URL(route,base));assert.equal(response.status,200,route);
 assert((response.headers.get('content-type')??'').startsWith('text/html'),route);
}
const bare=await request('https://agent-orchestrator.dev/voice');assert.equal(bare.status,308);
assert.equal(new URL(bare.headers.get('location'),'https://agent-orchestrator.dev').href,base);
for(const route of ['not-a-voice-route/','api/session','writing-playground.js','writing-playground.mjs','voice-writing-rules.js','de/not-a-voice-route/','de/api/session','de/voice-writing-rules.js']){
 assert.equal((await request(new URL(route,base))).status,404,route+' must not be served');
}
const home=await request('https://agent-orchestrator.dev/');assert.equal(home.status,200);
const html=await home.text();
const hub=new JSDOM(html).window.document;
assert.equal(hub.querySelector('#voice h3')?.textContent.trim(),'Voice Lint');
assert.equal(hub.querySelector('#voice')?.getAttribute('href'),'/voice/','The Voice Lint project card must link to its website.');
assert.match(home.headers.get('cache-control')??'',/no-cache/,'Hub HTML must revalidate.');
assert(/href=["']\/voice\/["']/.test(html),'Ecosystem homepage must link to Voice.');
const output=path.join(root,'test-results/voice-deployment');await fs.mkdir(output,{recursive:true});
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify({verifiedAt:new Date().toISOString(),base,sourceCommit:info.git.commit,buildTime:info.builtAt,files:checked.sort((a,b)=>a.path.localeCompare(b.path)),routes:info.routes.length,bareRedirect:308,unknownAndPrivateRoutes:404,ecosystemLink:true},null,2)+'\n');
console.log(`PASS public deployment: ${checked.length} exact artifact files, ${info.routes.length} HTML routes, MIME types, 308 redirect, real 404s and ecosystem link. Source ${info.git.commit}.`);
