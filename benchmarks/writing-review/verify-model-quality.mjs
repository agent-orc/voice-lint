import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareFromWorkspace, sha256 } from './prepare-model-comparison.mjs';
import { createQualityRunTemplate, evaluateModelQuality, localEvaluatorIdentity, responseSetSha256 } from './evaluate-model-quality.mjs';

// Every response and human judgment below is synthetic contract-test data.
// This suite performs no provider, CLI, Runner or model calls.
const manifest = await prepareFromWorkspace();
const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2) + '\n');
const identity = await localEvaluatorIdentity();
const sourceFor = fixture => manifest.sources.find(source => source.fixtureId === fixture);
const requestFor = (fixture, cohort = 'public-docs-six', strategy = 'bundled') => manifest.requests.find(request =>
  request.sourceId === sourceFor(fixture).sourceId && request.cohortId === cohort && request.strategyId === strategy);

function base(fixtures = ['en-meta']) {
  const run = createQualityRunTemplate(manifestBytes, identity);
  run.runId = 'synthetic-quality-contract'; run.dataOrigin = 'synthetic-contract-test';
  const parameters = { max_output_tokens: 1000, temperature: 0 };
  run.conditions.push({ conditionId: 'synthetic-bundle', candidateId: manifest.candidates[0].candidateId,
    cohortId: 'public-docs-six', strategyId: 'bundled', sourceIds: fixtures.map(fixture => sourceFor(fixture).sourceId),
    repetitions: [1], provider: 'synthetic-test-provider', requestedModelId: 'synthetic-requested', effectiveModelId: 'synthetic-returned-1',
    parameters, parametersSha256: sha256(JSON.stringify(parameters)),
    executionSettings: { adapterVersion: 'synthetic-adapter-1', runtimeVersion: process.version, reasoning: null,
      maxOutputTokens: 1000, concurrency: 1, retryPolicy: { maximumAttempts: 3 }, cacheMode: 'cold',
      ordering: 'fixed', orderSeed: null, providerBatch: false } });
  return run;
}
function answer(fixture = 'en-meta', change = true) {
  const request = requestFor(fixture);
  const labels = manifest.reviewerOnly.cases.find(item => item.sourceId === request.sourceId).expectedReview;
  return { sourceId: request.sourceId, sourceSha256: request.payload.source.sourceSha256,
    ruleResults: request.ruleIds.map(ruleId => {
      const label = labels.find(item => item.ruleId === ruleId);
      if (!change || !label) return { ruleId, decision: 'keep', reason: 'Synthetic justified keep for a contract test.' };
      const start = request.payload.source.text.indexOf(label.quote);
      return { ruleId, decision: 'change', reason: 'Synthetic authored-label match for a contract test.',
        finding: { quote: label.quote, start, end: start + label.quote.length, encoding: 'utf16', alternatives: ['Synthetic alternative, not model output.'] } };
    }) };
}
function addAttempt(run, { fixture = 'en-meta', response = answer(fixture), cost = 0.1, retryOf = null, status = 'response' } = {}) {
  const condition = run.conditions[0]; const request = requestFor(fixture);
  const previous = run.attempts.find(attempt => attempt.attemptId === retryOf);
  const attempt = { attemptId: `attempt-${run.attempts.length + 1}`, reviewRunId: `${condition.conditionId}/${request.sourceId}/r1`,
    requestId: request.requestId, sequence: previous ? previous.sequence + 1 : 1, retryOf,
    requestedModelId: condition.requestedModelId, effectiveModelId: status === 'response' ? condition.effectiveModelId : null,
    parametersSha256: condition.parametersSha256, payloadSha256: request.payloadSha256, canonicalPromptSha256: request.canonicalPromptSha256,
    sourceSha256: request.payload.source.sourceSha256, status, response: status === 'response' ? response : null,
    error: status === 'error' ? 'Synthetic error' : null, actualCostUsd: cost, usage: null, latencyMs: null };
  run.attempts.push(attempt); return attempt;
}
function addReview(run, attempt, accepted = true) {
  const request = manifest.requests.find(item => item.requestId === attempt.requestId);
  const responseHash = responseSetSha256([attempt.attemptId], run.attempts);
  const record = { reviewRunId: attempt.reviewRunId, finalAttemptIds: [attempt.attemptId],
    humanJudgments: [{ reviewerId: 'synthetic-editor-a', method: 'independent-human-review', responseSetSha256: responseHash,
      alternativeScope: 'all-produced-alternatives', factsPreserved: true, intentPreserved: true, harmfulChange: false,
      ruleJudgments: request.ruleIds.map(ruleId => ({ ruleId, decisionJustified: accepted, missedIssueCount: accepted ? 0 : 1,
        rationale: 'Synthetic reviewer assertion for a contract test, not empirical evidence.' })),
      rationale: 'Synthetic complete judgment for a contract test.' }], adjudication: null };
  run.reviews.push(record); return record;
}
const score = run => evaluateModelQuality({ manifestBytes, runBytes: Buffer.from(JSON.stringify(run)), identity });

test('correct supplied result has exact label diagnostics and separate human acceptance', () => {
  const run = base(); addReview(run, addAttempt(run)); const report = score(run);
  assert.equal(report.dataOrigin, 'synthetic-contract-test');
  assert.equal(report.comparisons[0].diagnostic.matchedLabels, 1);
  assert.equal(report.comparisons[0].diagnostic.labelPrecision, 1);
  assert.equal(report.comparisons[0].acceptedCompleteReviews, 1);
  assert.equal(report.comparisons[0].costPerAcceptedCompleteReviewUsd, 0.1);
  assert.equal(report.execution.providerRequestsSentByEvaluator, 0);
  assert.deepEqual(score(run), report, 'Offline scoring is deterministic for frozen bytes');
});

test('wrong keep misses authored label and can be rejected by independent judgment', () => {
  const run = base(); addReview(run, addAttempt(run, { response: answer('en-meta', false) }), false);
  const result = score(run).comparisons[0];
  assert.equal(result.diagnostic.missedLabels, 1); assert.equal(result.diagnostic.labelRecall, 0);
  assert.equal(result.humanRejected, 1); assert.equal(result.costPerAcceptedCompleteReviewUsd, null);
});

test('missing responses remain in the planned source/repetition denominator', () => {
  const run = base(['en-meta', 'en-history']); addReview(run, addAttempt(run));
  const report = score(run); const result = report.comparisons[0];
  assert.equal(result.plannedReviews, 2); assert.equal(result.reviewsWithNoAttempts, 1);
  assert.equal(result.incompleteReviews, 1); assert.equal(result.humanUnassessed, 1);
  assert.equal(result.acceptedCompleteReviewRate, 0.5); assert.equal(result.diagnostic.expectedLabels, 2);
  assert.equal(result.diagnostic.missedLabels, 1);
});

test('correct keep is an accepted review and no-label precision/recall remain undefined', () => {
  const run = base(['en-clean']); addReview(run, addAttempt(run, { fixture: 'en-clean' }));
  const result = score(run).comparisons[0];
  assert.equal(result.acceptedCompleteReviews, 1); assert.equal(result.diagnostic.expectedLabels, 0);
  assert.equal(result.diagnostic.labelRecall, null); assert.equal(result.diagnostic.labelPrecision, null);
});

test('missing or partial human judgments cannot be inferred from matching fixture labels', () => {
  const run = base(); const record = addReview(run, addAttempt(run)); record.humanJudgments = [];
  assert.equal(score(run).comparisons[0].humanUnassessed, 1);
  assert.equal(score(run).comparisons[0].acceptedCompleteReviews, 0);
  record.humanJudgments = [{ reviewerId: 'incomplete-editor', method: 'independent-human-review',
    responseSetSha256: responseSetSha256(record.finalAttemptIds, run.attempts), alternativeScope: 'all-produced-alternatives',
    factsPreserved: null, intentPreserved: null, harmfulChange: null,
    ruleJudgments: requestFor('en-meta').ruleIds.map(ruleId => ({ ruleId, decisionJustified: null, missedIssueCount: null, rationale: null })), rationale: null }];
  assert.equal(score(run).comparisons[0].acceptedCompleteReviews, 0);
});

test('invalid quote and stale response source are counted as response failures', () => {
  for (const mutate of [response => { response.ruleResults.find(item => item.finding).finding.quote = 'absent'; },
    response => { response.sourceSha256 = '0'.repeat(64); }]) {
    const run = base(); const response = answer(); mutate(response); addReview(run, addAttempt(run, { response }));
    const report = score(run); assert.equal(report.comparisons[0].invalidResponses, 1);
    assert.equal(report.comparisons[0].acceptedCompleteReviews, 0);
    assert.equal(report.comparisons[0].diagnostic.missedLabels, 1);
    assert(report.attemptValidation[0].validationError);
  }
});

test('broader valid quotes do not falsely claim exact authored label agreement', () => {
  const run = base(); const response = answer(); const finding = response.ruleResults.find(item => item.finding).finding;
  finding.quote = requestFor('en-meta').payload.source.text; finding.start = 0; finding.end = finding.quote.length;
  addReview(run, addAttempt(run, { response })); const result = score(run).comparisons[0];
  assert.equal(result.diagnostic.unmatchedPredictions, 1); assert.equal(result.diagnostic.missedLabels, 1);
  assert.equal(result.acceptedCompleteReviews, 1, 'Human quality can accept a broader finding independently');
});

test('exact manifest bytes, provenance, evaluator version, settings and model identity are enforced', () => {
  const run = base(); addReview(run, addAttempt(run));
  assert.throws(() => evaluateModelQuality({ manifestBytes: Buffer.concat([manifestBytes, Buffer.from('\n')]), runBytes: Buffer.from(JSON.stringify(run)), identity }), /manifest byte hash/);
  for (const mutate of [value => { value.provenance.fixtureSha256 = '0'.repeat(64); },
    value => { value.evaluatorSha256 = '0'.repeat(64); },
    value => { value.attempts[0].parametersSha256 = '0'.repeat(64); },
    value => { value.attempts[0].effectiveModelId = 'another-model'; },
    value => { value.attempts[0].payloadSha256 = '0'.repeat(64); },
    value => { value.attempts[0].sourceSha256 = '0'.repeat(64); }]) {
    const mutated = structuredClone(run); mutate(mutated); assert.throws(() => score(mutated));
  }
});

test('all retry, failure and invalid-output costs count exactly once', () => {
  const run = base(); const first = addAttempt(run, { status: 'error', cost: 0.1 });
  const second = addAttempt(run, { retryOf: first.attemptId, response: '{invalid-json', cost: 0.2 });
  const third = addAttempt(run, { retryOf: second.attemptId, cost: 0.3 }); addReview(run, third);
  const result = score(run).comparisons[0];
  assert.equal(result.attemptedRequests, 3); assert.equal(result.failedAttempts, 2); assert.equal(result.invalidResponses, 1);
  assert(Math.abs(result.totalAttemptCostUsd - 0.6) < 1e-12);
  assert(Math.abs(result.costPerAcceptedCompleteReviewUsd - 0.6) < 1e-12);
  const duplicate = structuredClone(run); duplicate.attempts.push(structuredClone(first));
  assert.throws(() => score(duplicate), /Attempts IDs must be unique/);
});

test('unknown cost does not block quality and is never treated as zero', () => {
  const run = base(); addReview(run, addAttempt(run, { cost: null })); const result = score(run).comparisons[0];
  assert.equal(result.acceptedCompleteReviews, 1); assert.equal(result.unknownCostAttempts, 1);
  assert.equal(result.totalAttemptCostUsd, null); assert.equal(result.costPerAcceptedCompleteReviewUsd, null);
  assert.equal(run.attempts[0].usage, null);
});

test('justified needs-evidence can pass editorial quality while the review remains incomplete', () => {
  const run = base(['en-history']); const response = answer('en-history', false);
  response.ruleResults.find(item => item.ruleId === 'process-history').decision = 'needs-evidence';
  addReview(run, addAttempt(run, { fixture: 'en-history', response })); const result = score(run).comparisons[0];
  assert.equal(result.humanQualityAccepted, 1); assert.equal(result.acceptedCompleteReviews, 0);
  assert.equal(result.incompleteReviews, 1); assert.equal(result.costPerAcceptedCompleteReviewUsd, null);
});

test('disagreement stays visible; a separate recorded adjudicator can resolve it', () => {
  const run = base(); const record = addReview(run, addAttempt(run));
  const other = structuredClone(record.humanJudgments[0]); other.reviewerId = 'synthetic-editor-b'; other.harmfulChange = true;
  record.humanJudgments.push(other);
  assert.equal(score(run).comparisons[0].humanDisputed, 1); assert.equal(score(run).comparisons[0].acceptedCompleteReviews, 0);
  record.adjudication = structuredClone(record.humanJudgments[0]); record.adjudication.reviewerId = 'synthetic-adjudicator';
  assert.equal(score(run).comparisons[0].acceptedCompleteReviews, 1);
  assert.equal(score(run).comparisons[0].reviewerDisagreements, 1);
});

test('changed final responses invalidate earlier human judgments', () => {
  const run = base(); addReview(run, addAttempt(run));
  run.attempts[0].response.ruleResults[0].reason = 'Changed after grading';
  assert.throws(() => score(run), /bound to different final responses/);
});

test('all proposed alternatives must be judged and harmful unselected alternatives can reject quality', () => {
  const run = base(); const record = addReview(run, addAttempt(run));
  record.humanJudgments[0].harmfulChange = true;
  assert.equal(score(run).comparisons[0].humanRejected, 1);
  record.humanJudgments[0].alternativeScope = 'selected-alternative-only';
  assert.throws(() => score(run), /Every proposed alternative/);
});

test('language cohorts stay separate and empty planned results are visible', () => {
  const run = base(['en-meta', 'de-meta']);
  const result = score(run); assert.equal(result.comparisons.length, 2);
  assert.deepEqual(result.comparisons.map(item => item.locale), ['de', 'en']);
  assert(result.comparisons.every(item => item.plannedReviews === 1 && item.incompleteReviews === 1));
  assert(result.comparisons.every(item => item.costPerAcceptedCompleteReviewUsd === null));
});

test('unplanned records and reused attempts across independent repetitions are rejected', () => {
  const run = base(); const attempt = addAttempt(run); const record = addReview(run, attempt);
  run.conditions[0].repetitions.push(2);
  const reused = structuredClone(record); reused.reviewRunId = reused.reviewRunId.replace('/r1', '/r2'); run.reviews.push(reused);
  assert.throws(() => score(run), /Final attempts must belong/);
  const unplanned = base(); unplanned.attempts.push({ ...attempt, reviewRunId: 'unplanned' });
  assert.throws(() => score(unplanned), /outside the planned/);
});
