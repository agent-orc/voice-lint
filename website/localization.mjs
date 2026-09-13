import {JSDOM} from 'jsdom';
export const locales=['en','de'];
export const origin='https://agent-orchestrator.dev';
export const localizedRoute=(route,locale)=> (locale==='de'?'de/':'')+route;
export function localizeDocument(html,route,locale,routeCatalogue,metadata={}) {
  const base=origin+'/voice/'+route;
  const dom=new JSDOM(html,{url:base}), document=dom.window.document;
  document.documentElement.lang=locale;
  for(const element of document.querySelectorAll('[data-language]')) {
    if(element.dataset.language!==locale)element.remove(); else element.hidden=false;
  }
  for(const element of document.querySelectorAll('[data-en][data-de]'))element.textContent=element.dataset[locale];
  for(const element of document.querySelectorAll('[href],[src]')) {
    const attribute=element.hasAttribute('href')?'href':'src',value=element.getAttribute(attribute);
    if(!value||/^(data:|mailto:)/.test(value))continue;
    if(value.startsWith('#')) {
      if(value!=='#content'&&route==='writing-patterns/')element.setAttribute(attribute,'#'+locale+'-'+value.slice(1).replace(/^(en|de)-/,''));
      if(value!=='#content'&&route==='research/')element.setAttribute(attribute,'#'+(locale==='de'?'de-':'')+value.slice(1).replace(/^de-/,''));
      continue;
    }
    const url=new URL(value,base);
    if(url.origin!==origin||!url.pathname.startsWith('/voice/'))continue;
    const relative=url.pathname.slice('/voice/'.length);
    const target=routeCatalogue.includes(relative)?localizedRoute(relative,locale):relative;
    if(url.hash&&relative==='writing-patterns/')url.hash=locale+'-'+url.hash.slice(1).replace(/^(en|de)-/,'');
    if(url.hash&&relative==='research/')url.hash=(locale==='de'?'de-':'')+url.hash.slice(1).replace(/^de-/,'');
    element.setAttribute(attribute,'/voice/'+target+url.search+url.hash);
  }
  for(const button of document.querySelectorAll('[data-locale]')) {
    const selected=button.dataset.locale;
    // A normal link also works without JavaScript and exposes both languages to crawlers.
    const link=document.createElement('a');
    link.textContent=button.textContent;link.dataset.locale=selected;
    link.href='/voice/'+localizedRoute(route,selected);link.hreflang=selected;
    link.lang=selected;link.setAttribute('aria-label',selected==='de'?'Deutsch':'English');
    if(selected===locale)link.setAttribute('aria-current','true');
    button.replaceWith(link);
  }
  const canonical=origin+'/voice/'+localizedRoute(route,locale);
  document.querySelector('link[rel="canonical"]').href=canonical;
  if(metadata.title)document.title=metadata.title;
  if(metadata.description)document.querySelector('meta[name="description"]').content=metadata.description;
  for(const language of [...locales,'x-default']) {
    const link=document.createElement('link');link.rel='alternate';link.hreflang=language;
    link.href=origin+'/voice/'+localizedRoute(route,language==='x-default'?'en':language);document.head.append(link);
  }
  const description=document.querySelector('meta[name="description"]').content;
  for(const [property,content] of Object.entries({'og:type':'website','og:site_name':'Voice Lint','og:title':document.title,'og:description':description,'og:url':canonical,'og:locale':locale==='de'?'de_DE':'en_US'})) {
    const meta=document.createElement('meta');meta.setAttribute('property',property);meta.content=content;document.head.append(meta);
  }
  const schema=document.createElement('script');schema.type='application/ld+json';
  schema.textContent=JSON.stringify({'@context':'https://schema.org','@type':'WebPage',name:document.title,description,url:canonical,inLanguage:locale,isPartOf:{'@type':'WebSite',name:'Voice Lint',url:origin+'/voice/'}}).replaceAll('<','\\u003c');
  document.head.append(schema);
  if(locale==='de') {
    const labels={'Voice home':'Voice-Startseite',Main:'Hauptnavigation','Tools / Werkzeuge':'Werkzeuge','Knowledge / Wissen':'Wissen','Language / Sprache':'Sprache'};
    for(const element of document.querySelectorAll('[aria-label]'))if(labels[element.getAttribute('aria-label')])element.setAttribute('aria-label',labels[element.getAttribute('aria-label')]);
    const ecosystem=document.querySelector('.site-footer a');if(ecosystem)ecosystem.textContent='Agent-Orchestrator-Ökosystem';
  }
  const result=dom.serialize();dom.window.close();return result;
}
