import test from 'node:test';
import assert from 'node:assert/strict';
import {writingCatalogue,composeWritingReviewPrompt,findWritingSignals} from '../dist/index.js';

test('evaluative-modifier review requires a criterion and preserves technical meanings in both languages',()=>{
 const examples={en:{before:'Rules, counter-prompts and valid exceptions.',keep:'The endpoint accepts valid JSON.',criterion:/stated criterion/,technical:/syntax validity from schema validation/},de:{before:'Regeln, Gegen-Prompts und berechtigte Ausnahmen.',keep:'Der Endpunkt akzeptiert gültiges JSON.',criterion:/genanntes Kriterium/,technical:/Schema-Prüfung/}};
 for(const [language,example]of Object.entries(examples)){
  const review=composeWritingReviewPrompt({language,profile:'product-copy',audience:'Readers choosing a review rule',goal:'Identify when the rule applies and when to keep the text'});
  assert.equal(review.catalogueVersion,'voice-writing-rules/0.2.2');
  assert.match(review.prompt,example.criterion);
  assert.match(review.prompt,example.technical);
  assert.ok(review.prompt.includes(language==='en'?'cases where the text should stay':'Fälle, in denen der Text bleiben sollte'));
  for(const text of [example.before,example.keep]){
   const scan=findWritingSignals(text,{language,ruleIds:['claims-evidence']});
   assert.deepEqual(scan.signals,[],'an adjective is not a lexical defect verdict');
   assert.equal(scan.coverage.semanticReviewRequired,true);
  }
 }
 const rule=writingCatalogue.rules.find(r=>r.id==='claims-evidence');
 assert.ok(rule.evidence.some(e=>e.sourceId==='microsoft-words'&&e.relation==='editorial-derivation'));
});
