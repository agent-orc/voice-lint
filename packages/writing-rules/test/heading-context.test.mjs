import test from 'node:test';
import assert from 'node:assert/strict';
import { writingCatalogue, getWritingRule, composeWritingReviewPrompt, findWritingSignals } from '../dist/index.js';

test('heading review carries context and keep cases without turning them into lexical verdicts', () => {
  const ruleIds = ['meta-framing', 'format-fit', 'word-choice'];
  for (const language of ['en', 'de']) {
    const result = composeWritingReviewPrompt({
      audience: 'Developers comparing review models',
      goal: 'Explain model selection and prompt structure without claiming an unmeasured winner',
      language, ruleIds,
    });
    assert.equal(result.catalogueVersion, 'voice-writing-rules/0.2.2');
    assert.deepEqual(result.ruleIds, ruleIds);
    for (const id of ruleIds) {
      const rule = getWritingRule(id);
      assert.ok(result.prompt.includes(rule.prompt[language]), `${id}: contextual criteria reach the host prompt`);
      assert.ok(result.prompt.includes(rule.examples[language].keep), `${id}: legitimate original reaches the host prompt`);
      assert.ok(result.prompt.includes(rule.examples[language].condition), `${id}: example assumptions reach the host prompt`);
    }
    assert.match(result.prompt, language === 'en' ? /concrete description/ : /konkreten Beschreibung/);
    assert.match(result.prompt, language === 'en' ? /result promises before evidence/ : /Ergebnisversprechen, bevor Belege/);
    assert.match(result.prompt, language === 'en' ? /genuine reader questions/ : /echte Leserfragen/);
    assert.match(result.prompt, language === 'en' ? /explanatory metaphors/ : /erklärende Metaphern/);
    assert.match(result.prompt, language === 'en' ? /accepted positioning/ : /akzeptierte Positionierung/);

    for (const text of [
      getWritingRule('word-choice').examples[language].before,
      getWritingRule('word-choice').examples[language].keep,
      getWritingRule('format-fit').examples[language].keep,
    ]) {
      const local = findWritingSignals(text, { language, ruleIds });
      assert.deepEqual(local.signals, []);
      assert.equal(local.coverage.semanticReviewRequired, true);
      assert.ok(local.coverage.unscannedRuleIds.includes('format-fit'));
    }
  }
});

test('heading criteria distinguish research context from editorial derivation', () => {
  const expected = [
    ['word-choice', 'chakrabarty-writing-edits-2025', 'research', 'editorial-derivation'],
    ['format-fit', 'shaib-slop-2025', 'research', 'research-context'],
    ['meta-framing', 'furze-problem-patterns', 'editorial-guidance', 'editorial-derivation'],
  ];
  for (const [ruleId, sourceId, kind, relation] of expected) {
    const source = writingCatalogue.sources.find(item => item.id === sourceId);
    assert.ok(source?.locator && source?.supports && source?.limits);
    assert.equal(source.kind, kind);
    assert.ok(getWritingRule(ruleId).evidence.some(item => item.sourceId === sourceId && item.relation === relation));
  }
});
