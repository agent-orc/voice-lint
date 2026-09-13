function revealResearchNote(scroll = false) {
  let requestedId;
  try { requestedId = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (!requestedId) return;
  const baseId = requestedId.startsWith('de-') ? requestedId.slice(3) : requestedId;
  const localizedId = (document.documentElement.lang === 'de' ? 'de-' : '') + baseId;
  const localizedTarget = document.getElementById(localizedId);
  const target = localizedTarget?.closest('.research-content') ? localizedTarget : document.getElementById(requestedId);
  if (!target?.closest('.research-content')) return;
  if (target.id !== requestedId) history.replaceState(null, '', '#' + encodeURIComponent(target.id));
  let details = target.closest('details');
  while (details) {
    details.open = true;
    details = details.parentElement?.closest('details');
  }
  if (scroll || target.id !== requestedId) target.scrollIntoView({block: 'start'});
}
window.addEventListener('hashchange', () => revealResearchNote(true));
document.addEventListener('click', event => {
  const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
  if (link && link.hash === location.hash) revealResearchNote(true);
});
new MutationObserver(() => revealResearchNote(true)).observe(document.documentElement, {attributes: true, attributeFilter: ['lang']});
revealResearchNote();
