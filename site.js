let locale=document.documentElement.lang==='de'?'de':'en';
let review;
function setLanguage(value){
  locale=value==='de'?'de':'en';document.documentElement.lang=locale;
  document.querySelectorAll('[data-language]').forEach(el=>{el.hidden=el.dataset.language!==locale});
  document.querySelectorAll('[data-locale]').forEach(el=>{if(el.dataset.locale===locale)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current')});
  document.querySelectorAll('[data-en][data-de]').forEach(el=>el.textContent=el.dataset[locale]);
  try{localStorage.setItem('voice-site:locale',locale)}catch{}
  mountDemo();
}
document.querySelectorAll('a[data-locale]').forEach(link=>link.addEventListener('click',()=>{
  if(location.hash){
    const id=location.hash.slice(1);
    if(location.pathname.includes('/writing-patterns/'))link.hash=link.dataset.locale+'-'+id.replace(/^(en|de)-/,'');
    else if(location.pathname.includes('/research/'))link.hash=(link.dataset.locale==='de'?'de-':'')+id.replace(/^de-/,'');
    else link.hash=id;
  }
  if(['127.0.0.1','localhost'].includes(location.hostname))link.search=location.search;
}));
function mountDemo(){
  review?.dispose();review=undefined;
  const slot=document.querySelector(`[data-language="${locale}"] [data-demo-slot]`);if(!slot||!window.VoiceReview)return;
  const de=locale==='de';slot.innerHTML='';
  const root=document.createElement('section');root.className='demo';root.setAttribute('aria-label',de?'Library-Beispiel':'Library demonstration');
  root.innerHTML=`<div class="demo-controls"><label><input type="checkbox" checked data-marks> ${de?'Markierungen anzeigen':'Show marks'}</label><small>${de?'Vorgegebener Beispielbefund':'Supplied example finding'}</small></div><div class="demo-text" data-demo-text><p data-voice-unit="intro" lang="en">Our powerful tools keep review decisions beside the source.</p></div><div class="demo-findings"><button type="button">${de?'Befund: Welche konkrete Fähigkeit bedeutet „powerful“ hier?':'Finding: Which specific capability does “powerful” describe here?'}</button></div><output class="demo-output" aria-live="polite">${de?'Text im Beispiel auswählen.':'Select text in the example.'}</output><p class="demo-status" role="status"></p>`;
  slot.append(root);const textRoot=root.querySelector('[data-demo-text]');const text=textRoot.textContent;
  const finding={id:'example-capability',ruleId:'example.wording',category:'wording',severity:'info',message:'Describe the capability.',explanation:'This is a supplied demonstration finding, not an analyzer verdict.',quote:'powerful',unitId:'intro',start:4,end:12,suggestion:null,engine:'example'};
  review=VoiceReview.mountVoiceReview({root:textRoot,units:[{id:'intro',text,kind:'paragraph',language:'en',sourceSpan:{start:0,end:text.length,encoding:'utf16'}}],findings:[finding],feedback:[],onSelect:selection=>{root.querySelector('output').textContent=JSON.stringify(selection,null,2)},onFindingSelect:()=>{root.querySelector('output').textContent=de?'Beispielhinweis: Eine konkrete Fähigkeit könnte hilfreicher sein. Der Seitenkontext entscheidet.':'Example prompt: a specific capability may be more useful. The page context determines whether to change it.'}});
  root.querySelector('[data-marks]').addEventListener('change',event=>{review.update({findings:event.target.checked?[finding]:[],feedback:[]});root.querySelector('.demo-status').textContent=event.target.checked?(de?'Markierungen sichtbar.':'Marks visible.'):(de?'Markierungen ausgeblendet.':'Marks hidden.')});
  root.querySelector('button').addEventListener('click',()=>review.selectFinding(finding.id));
}
setLanguage(locale);

// Guide navigation stays compact on small screens; native details also work without JS.
const guideMenu=document.querySelector('.guide-menu');
if(guideMenu&&matchMedia('(max-width:760px)').matches)guideMenu.open=false;
document.querySelectorAll('.copy-code').forEach(button=>{
  button.hidden=false;
  button.addEventListener('click',async()=>{
    const code=button.closest('.code-block')?.querySelector('code');if(!code)return;
    try{await navigator.clipboard.writeText(code.textContent);button.textContent=locale==='de'?'Kopiert':'Copied';}
    catch{const range=document.createRange();range.selectNodeContents(code);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);button.textContent=locale==='de'?'Text ausgewählt':'Text selected';}
    setTimeout(()=>button.textContent=locale==='de'?'Kopieren':'Copy',2000);
  });
});
if('IntersectionObserver' in window){
  const sectionLinks=document.querySelectorAll('.page-outline a');
  const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){sectionLinks.forEach(a=>{if(a.hash==='#'+entry.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current')});}},{rootMargin:'-5% 0px -70% 0px'});
  document.querySelectorAll('.guide-content h2').forEach(el=>observer.observe(el));
}

// JSON remains a normal link without JavaScript; enhanced views stay on this page.
import('./json-viewer.js').then(module=>module.installJsonViewer()).catch(()=>{});


// Local, explicit HTML review integration. No model tools or credentials.
if (['127.0.0.1','localhost'].includes(location.hostname)
    && new URL(location.href).searchParams.get('voice-studio') === '1') {
  document.addEventListener('click',event=>{
    const link=event.target instanceof Element?event.target.closest('a[href]'):null;
    if(!link||link.hasAttribute('download'))return;
    const target=new URL(link.href,location.href);
    if(target.origin===location.origin&&target.pathname.startsWith('/voice/')&&target.pathname.endsWith('/')){
      target.searchParams.set('voice-studio','1');link.href=target.href;
    }
  });
  const connect = () => {
    window.voiceStudioConnection = window.VoiceReview.connectVoiceStudio({
      studioOrigin: 'http://127.0.0.1:5188',
    });
    window.addEventListener('pagehide', () => window.voiceStudioConnection?.dispose(), {once:true});
  };
  if (window.VoiceReview) connect();
  else {
    const script=document.createElement('script');
    script.src='/voice/voice-review.js';
    script.addEventListener('load',connect,{once:true});
    document.head.append(script);
  }
}
