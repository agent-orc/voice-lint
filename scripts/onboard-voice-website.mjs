import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {readSession} from './session.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await fs.readFile(path.join(root,'voice.config.json'),'utf8'));
const base='http://127.0.0.1:5188',session=await readSession(root);
async function api(route,method='GET',body){
  const response=await fetch(base+route,{method,headers:{Authorization:'Bearer '+session.token,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});
  assert(response.ok,method+' '+route+' failed: '+response.status+' '+(response.ok?'':await response.text()));
  return response.status===204?null:response.json();
}
const project=await api('/api/projects/register','POST',{path:root,name:'Voice · Website'});
if(project.liveUrl!==config.liveUrl)await api('/api/projects/'+project.id+'/browser','PATCH',{url:config.liveUrl});
const documents=await api('/api/projects/'+project.id+'/documents');
const studio=documents.find(document=>document.path==='website/content/studio.json');
assert(studio?.format==='json','The running backend must support configured JSON source files.');
const detail=await api('/api/projects/'+project.id+'/documents/'+studio.id);
const currentCopy=JSON.parse(await fs.readFile(path.join(root,'website/content/studio.json'),'utf8'));
assert(detail.units.some(unit=>unit.text===currentCopy.de.title),'Current German Studio heading must be mapped.');
const result={projectId:project.id,studioUrl:base+'/?project='+project.id,websiteUrl:config.liveUrl,sourceDocuments:documents.length,studioDocumentId:studio.id,studioMappedUnits:detail.units.length,modelCalls:0,sourceWrites:0};
console.log(JSON.stringify(result,null,2));
