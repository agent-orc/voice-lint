import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sha256, validateModelResponse } from './prepare-model-comparison.mjs';

export const evaluatorVersion = 'voice-writing-quality-v1';
const json = value => JSON.stringify(value);
const hashPattern = /^[a-f0-9]{64}$/;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function fields(value, names, name) {
  assert(object(value), `${name} must be an object`);
  assert.deepEqual(Object.keys(value).sort(), names.split(' ').sort(), `${name} fields must match the versioned contract`);
}
function unique(values, name) { assert.equal(new Set(values).size, values.length, `${name} must be unique`); }
function string(value, name) { assert(typeof value === 'string' && value.trim(), `${name} must be a nonempty string`); }
function hash(value, name) { assert(typeof value === 'string' && hashPattern.test(value), `${name} must be SHA-256`); }
function count(value, name) { assert(Number.isSafeInteger(value) && value >= 0, `${name} must be a nonnegative integer`); }
function nullableCount(value, name) { if (value !== null) count(value, name); }
function nullableNumber(value, name) { assert(value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0), `${name} must be null or a nonnegative finite number`); }
function nullableBool(value, name) { assert(value === null || typeof value === 'boolean', `${name} must be true, false or null`); }
function indexed(values, key, name) {
  assert(Array.isArray(values), `${name} must be an array`);
  unique(values.map(value => value[key]), `${name} IDs`);
  return new Map(values.map(value => [value[key], value]));
}
const sorted = values => [...values].sort();
const sameSet = (actual, expected, name) => assert.deepEqual(sorted(actual), sorted(expected), name);
const sum = values => values.reduce((total, value) => total + value, 0);
const ratio = (n, d) => d === 0 ? null : n / d;

export async function localEvaluatorIdentity() {
  const [evaluator, preparer] = await Promise.all([
    readFile(fileURLToPath(import.meta.url)), readFile(new URL('prepare-model-comparison.mjs', import.meta.url)),
  ]);
  return { evaluatorVersion, evaluatorSha256: sha256(evaluator), preparerSha256: sha256(preparer) };
}

/** Inert template: choose conditions and record externally obtained responses. */
export function createQualityRunTemplate(manifestBytes, identity) {
  const manifest = JSON.parse(manifestBytes);
  return { schemaVersion: 1, runId: 'replace-with-recorded-run-id', dataOrigin: 'recorded-model-responses',
    manifestSha256: sha256(manifestBytes), evaluatorVersion, evaluatorSha256: identity.evaluatorSha256,
    catalogueVersion: manifest.catalogueVersion, provenance: structuredClone(manifest.provenance),
    conditions: [], attempts: [], reviews: [] };
}

function validateManifest(manifest, identity) {
  assert.equal(manifest.schemaVersion, 1, 'Unsupported manifest version');
  assert.equal(manifest.id, 'voice-writing-model-comparison-pilot-v1');
  for (const key of ['fixtureSha256', 'modelResearchSha256', 'librarySha256', 'preparerSha256']) hash(manifest.provenance[key], `manifest ${key}`);
  assert.equal(manifest.provenance.preparerSha256, identity.preparerSha256, 'Frozen response validator/preparer differs; use the recorded code revision, do not rebuild the experiment');
  const sources = indexed(manifest.sources, 'sourceId', 'manifest sources');
  const requests = indexed(manifest.requests, 'requestId', 'manifest requests');
  const reviews = indexed(manifest.reviews, 'reviewId', 'manifest reviews');
  const candidates = indexed(manifest.candidates, 'candidateId', 'manifest candidates');
  const labels = indexed(manifest.reviewerOnly.cases, 'sourceId', 'manifest reviewer cases');
  for (const source of sources.values()) {
    assert.equal(sha256(json(source.source)), source.sourceSha256, 'Frozen source hash differs');
    const expected = labels.get(source.sourceId)?.expectedReview;
    assert(Array.isArray(expected), 'Every frozen source needs its authored labels');
    unique(expected.map(label => `${label.ruleId}\u0000${label.quote}`), 'Authored labels');
    for (const label of expected) {
      string(label.ruleId, 'Label rule'); string(label.quote, 'Label quote');
      assert(source.source.text.includes(label.quote), 'Authored label must quote its source');
      assert.equal(source.source.text.indexOf(label.quote), source.source.text.lastIndexOf(label.quote), 'This diagnostic requires unambiguous authored quotes');
    }
  }
  for (const request of requests.values()) {
    const source = sources.get(request.sourceId);
    assert(source, 'Request source must exist');
    assert.equal(sha256(json(request.payload)), request.payloadSha256, 'Frozen prompt payload hash differs');
    hash(request.canonicalPromptSha256, 'Canonical prompt hash');
    assert.deepEqual(request.payload.source, { sourceId: source.sourceId, sourceSha256: source.sourceSha256, ...source.source });
  }
  for (const review of reviews.values()) {
    const selected = review.requestIds.map(id => requests.get(id));
    assert(selected.every(request => request && request.reviewId === review.reviewId && request.sourceId === review.sourceId), 'Frozen review request membership differs');
    unique(selected.flatMap(request => request.ruleIds), 'Selected rules across requests');
    sameSet(selected.flatMap(request => request.ruleIds), review.ruleIds, 'Frozen review rule coverage differs');
  }
  return { sources, requests, reviews, candidates, labels };
}

/** Hash the explicitly selected final attempts before independent reviewers grade them. */
export function responseSetSha256(finalAttemptIds, attempts) {
  const byId = new Map(attempts.map(attempt => [attempt.attemptId, attempt]));
  return sha256(json(sorted(finalAttemptIds).map(id => {
    const attempt = byId.get(id);
    assert(attempt, `Unknown final attempt ${id}`);
    return { attemptId: id, requestId: attempt.requestId, payloadSha256: attempt.payloadSha256,
      effectiveModelId: attempt.effectiveModelId, response: attempt.response, status: attempt.status };
  })));
}

function inspectJudgment(record, rules, responseHash) {
  fields(record, 'reviewerId method responseSetSha256 alternativeScope factsPreserved intentPreserved harmfulChange ruleJudgments rationale', 'Human judgment');
  string(record.reviewerId, 'Reviewer ID');
  assert.equal(record.method, 'independent-human-review', 'Model judgments cannot silently become independent human labels');
  assert.equal(record.responseSetSha256, responseHash, 'Human judgment is bound to different final responses');
  assert.equal(record.alternativeScope, 'all-produced-alternatives', 'Every proposed alternative must be assessed');
  for (const key of ['factsPreserved', 'intentPreserved', 'harmfulChange']) nullableBool(record[key], key);
  assert(record.rationale === null || typeof record.rationale === 'string');
  const byRule = indexed(record.ruleJudgments, 'ruleId', 'Human rule judgments');
  sameSet([...byRule.keys()], rules, 'Human judgment must explicitly cover every selected rule; use null for unassessed values');
  for (const item of byRule.values()) {
    fields(item, 'ruleId decisionJustified missedIssueCount rationale', 'Human rule judgment');
    nullableBool(item.decisionJustified, 'decisionJustified');
    nullableCount(item.missedIssueCount, 'missedIssueCount');
    assert(item.rationale === null || typeof item.rationale === 'string');
    if (item.decisionJustified !== null || item.missedIssueCount !== null) string(item.rationale, 'Assessed rule rationale');
  }
  const complete = ['factsPreserved', 'intentPreserved', 'harmfulChange'].every(key => record[key] !== null)
    && [...byRule.values()].every(item => item.decisionJustified !== null && item.missedIssueCount !== null);
  if (complete) string(record.rationale, 'Completed human judgment rationale');
  return { complete, accepted: complete && record.factsPreserved && record.intentPreserved && !record.harmfulChange
    && [...byRule.values()].every(item => item.decisionJustified && item.missedIssueCount === 0),
    observations: { factsPreserved: record.factsPreserved, intentPreserved: record.intentPreserved, harmfulChange: record.harmfulChange,
      ...Object.fromEntries([...byRule.values()].flatMap(item => [[`${item.ruleId}/decisionJustified`, item.decisionJustified], [`${item.ruleId}/missedIssueCount`, item.missedIssueCount]])) },
    fingerprint: json({ factsPreserved: record.factsPreserved, intentPreserved: record.intentPreserved,
      harmfulChange: record.harmfulChange, rules: sorted(rules).map(ruleId => ({ ruleId,
        decisionJustified: byRule.get(ruleId).decisionJustified, missedIssueCount: byRule.get(ruleId).missedIssueCount })) }) };
}

function diagnostics(review, source, authored, responses) {
  const labels = authored.filter(label => review.ruleIds.includes(label.ruleId));
  const outsideScopeLabels = authored.length - labels.length;
  const findings = responses.flatMap(response => response.ruleResults.filter(result => result.decision === 'change'));
  const byRule = review.ruleIds.map(ruleId => {
    const expected = labels.filter(label => label.ruleId === ruleId);
    const predicted = findings.filter(result => result.ruleId === ruleId);
    const matched = predicted.filter(result => expected.some(label => label.quote === result.finding.quote
      && source.text.indexOf(label.quote) === result.finding.start && result.finding.end === result.finding.start + label.quote.length)).length;
    return { ruleId, expectedLabels: expected.length, predictedFindings: predicted.length, matchedLabels: matched,
      unmatchedPredictions: predicted.length - matched, missedLabels: expected.length - matched,
      labelPrecision: ratio(matched, predicted.length), labelRecall: ratio(matched, expected.length) };
  });
  const counts = Object.fromEntries(['expectedLabels', 'predictedFindings', 'matchedLabels', 'unmatchedPredictions', 'missedLabels'].map(key => [key, sum(byRule.map(item => item[key]))]));
  return { ...counts, labelPrecision: ratio(counts.matchedLabels, counts.predictedFindings), labelRecall: ratio(counts.matchedLabels, counts.expectedLabels),
    outsideScopeLabels, authoredKeepCase: authored.length === 0, findingsOnAuthoredKeepCase: authored.length === 0 ? findings.length : 0, byRule };
}

/** Deterministic offline scoring. The caller supplies frozen manifest/run bytes; no model or current manifest is generated. */
export function evaluateModelQuality({ manifestBytes, runBytes, identity }) {
  const manifest = JSON.parse(manifestBytes);
  const run = JSON.parse(runBytes);
  fields(run, 'schemaVersion runId dataOrigin manifestSha256 evaluatorVersion evaluatorSha256 catalogueVersion provenance conditions attempts reviews', 'Run');
  assert.equal(run.schemaVersion, 1);
  assert.equal(run.evaluatorVersion, evaluatorVersion);
  assert.equal(identity.evaluatorVersion, evaluatorVersion);
  assert.equal(run.evaluatorSha256, identity.evaluatorSha256, 'Evaluator code hash differs; use the recorded evaluator');
  assert.equal(run.manifestSha256, sha256(manifestBytes), 'Exact frozen manifest byte hash differs; do not regenerate it for scoring');
  assert.equal(run.catalogueVersion, manifest.catalogueVersion, 'Catalogue version differs');
  assert.deepEqual(run.provenance, manifest.provenance, 'Fixture, Library, research or preparer provenance differs');
  string(run.runId, 'Run ID');
  assert(['recorded-model-responses', 'synthetic-contract-test'].includes(run.dataOrigin), 'Data origin must identify real records or synthetic tests');
  const frozen = validateManifest(manifest, identity);
  const conditions = indexed(run.conditions, 'conditionId', 'Conditions');
  const attempts = indexed(run.attempts, 'attemptId', 'Attempts');
  const reviewRecords = indexed(run.reviews, 'reviewRunId', 'Review records');
  const planned = new Map();
  for (const condition of conditions.values()) {
    fields(condition, 'conditionId candidateId cohortId strategyId sourceIds repetitions provider requestedModelId effectiveModelId parameters parametersSha256 executionSettings', 'Condition');
    for (const key of ['conditionId', 'provider', 'requestedModelId', 'effectiveModelId']) string(condition[key], key);
    assert(frozen.candidates.has(condition.candidateId), 'Candidate must belong to the frozen manifest');
    assert(object(condition.parameters), 'Record the exact provider parameters object');
    assert.equal(condition.parametersSha256, sha256(json(condition.parameters)), 'Provider parameter hash differs');
    fields(condition.executionSettings, 'adapterVersion runtimeVersion reasoning maxOutputTokens concurrency retryPolicy cacheMode ordering orderSeed providerBatch', 'Execution settings');
    for (const key of ['adapterVersion', 'runtimeVersion', 'cacheMode', 'ordering']) string(condition.executionSettings[key], key);
    assert(condition.executionSettings.reasoning === null || typeof condition.executionSettings.reasoning === 'string');
    nullableCount(condition.executionSettings.maxOutputTokens, 'maxOutputTokens');
    count(condition.executionSettings.concurrency, 'concurrency');
    assert(condition.executionSettings.concurrency > 0);
    assert(object(condition.executionSettings.retryPolicy));
    assert(condition.executionSettings.orderSeed === null || typeof condition.executionSettings.orderSeed === 'string');
    assert(typeof condition.executionSettings.providerBatch === 'boolean');
    assert(Array.isArray(condition.sourceIds) && condition.sourceIds.length, 'Plan explicit source IDs before generation');
    assert(Array.isArray(condition.repetitions) && condition.repetitions.length, 'Plan explicit repetitions before generation');
    unique(condition.sourceIds, 'Condition sources'); unique(condition.repetitions, 'Condition repetitions');
    for (const sourceId of condition.sourceIds) {
      assert(frozen.sources.has(sourceId), 'Planned source must be frozen');
      const review = frozen.reviews.get(`${sourceId}/${condition.cohortId}/${condition.strategyId}`);
      assert(review, 'Condition must select an existing coverage/strategy review');
      for (const repetition of condition.repetitions) {
        count(repetition, 'Repetition'); assert(repetition > 0);
        const id = `${condition.conditionId}/${sourceId}/r${repetition}`;
        planned.set(id, { reviewRunId: id, condition, review, repetition });
      }
    }
  }
  for (const record of reviewRecords.values()) assert(planned.has(record.reviewRunId), 'Review record is outside planned sources/repetitions');
  const inspectedAttempts = new Map();
  for (const attempt of attempts.values()) {
    fields(attempt, 'attemptId reviewRunId requestId sequence retryOf requestedModelId effectiveModelId parametersSha256 payloadSha256 canonicalPromptSha256 sourceSha256 status response error actualCostUsd usage latencyMs', 'Attempt');
    string(attempt.attemptId, 'Attempt ID');
    const plan = planned.get(attempt.reviewRunId);
    assert(plan, 'Attempt is outside the planned review matrix');
    const request = frozen.requests.get(attempt.requestId);
    assert(request && plan.review.requestIds.includes(attempt.requestId), 'Attempt request must belong to its planned review');
    assert.equal(attempt.requestedModelId, plan.condition.requestedModelId, 'Requested model changed inside a condition');
    assert(attempt.effectiveModelId === null || attempt.effectiveModelId === plan.condition.effectiveModelId, 'Effective model changed inside a condition');
    assert.equal(attempt.parametersSha256, plan.condition.parametersSha256, 'Attempt settings differ');
    for (const key of ['payloadSha256', 'canonicalPromptSha256']) assert.equal(attempt[key], request[key], `Attempt ${key} differs`);
    assert.equal(attempt.sourceSha256, request.payload.source.sourceSha256, 'Attempt source differs');
    count(attempt.sequence, 'Attempt sequence'); assert(attempt.sequence > 0);
    assert(['response', 'error', 'cancelled', 'not-completed'].includes(attempt.status), 'Unknown attempt status');
    nullableNumber(attempt.actualCostUsd, 'actualCostUsd'); nullableNumber(attempt.latencyMs, 'latencyMs');
    if (attempt.usage !== null) {
      fields(attempt.usage, 'inputTokens outputTokens cacheReadTokens cacheWriteTokens reasoningTokens', 'Usage');
      for (const [key, value] of Object.entries(attempt.usage)) nullableCount(value, key);
    }
    assert(attempt.error === null || typeof attempt.error === 'string');
    let response = null, validation = null, validationError = null;
    if (attempt.status === 'response') {
      assert.equal(attempt.effectiveModelId, plan.condition.effectiveModelId, 'A recorded response requires its exact returned model identity');
      try {
        response = typeof attempt.response === 'string' ? JSON.parse(attempt.response) : attempt.response;
        validation = validateModelResponse(request, response);
      } catch (error) { validationError = error.message; response = null; }
    } else {
      assert.equal(attempt.response, null, 'Non-response attempts cannot carry a selected answer');
    }
    inspectedAttempts.set(attempt.attemptId, { attempt, response, validation, validationError });
  }
  for (const attempt of attempts.values()) {
    if (attempt.retryOf === null) assert.equal(attempt.sequence, 1, 'The initial attempt has sequence 1');
    else {
      const previous = attempts.get(attempt.retryOf);
      assert(previous && previous.reviewRunId === attempt.reviewRunId && previous.requestId === attempt.requestId, 'Retry must link an attempt of the same request and review');
      assert.equal(attempt.sequence, previous.sequence + 1, 'Retry sequences must be contiguous');
    }
  }
  unique([...attempts.values()].map(attempt => `${attempt.reviewRunId}\u0000${attempt.requestId}\u0000${attempt.sequence}`), 'Attempt sequence within a request');
  const evaluated = [];
  for (const plan of planned.values()) {
    const { reviewRunId, condition, review, repetition } = plan;
    const record = reviewRecords.get(reviewRunId) ?? { reviewRunId, finalAttemptIds: [], humanJudgments: [], adjudication: null };
    fields(record, 'reviewRunId finalAttemptIds humanJudgments adjudication', 'Review record');
    assert(Array.isArray(record.finalAttemptIds)); unique(record.finalAttemptIds, 'Selected final attempts');
    const selected = record.finalAttemptIds.map(id => {
      const entry = inspectedAttempts.get(id);
      assert(entry && entry.attempt.reviewRunId === reviewRunId, 'Final attempts must belong to this planned review');
      return entry;
    });
    unique(selected.map(entry => entry.attempt.requestId), 'One final attempt per request');
    const allAttempts = [...inspectedAttempts.values()].filter(entry => entry.attempt.reviewRunId === reviewRunId);
    const responseHash = responseSetSha256(record.finalAttemptIds, run.attempts);
    assert(Array.isArray(record.humanJudgments)); unique(record.humanJudgments.map(item => item.reviewerId), 'Independent reviewers');
    const judged = record.humanJudgments.map(item => inspectJudgment(item, review.ruleIds, responseHash));
    const disagreement = judged.length > 1 && Object.keys(judged[0].observations).some(key =>
      new Set(judged.map(item => item.observations[key]).filter(value => value !== null)).size > 1);
    let resolved = null;
    if (record.adjudication !== null) {
      assert(judged.length >= 2, 'Adjudication requires the original reviewer records');
      assert(!record.humanJudgments.some(item => item.reviewerId === record.adjudication.reviewerId), 'Adjudicator must have a distinct identity');
      resolved = inspectJudgment(record.adjudication, review.ruleIds, responseHash);
    } else if (judged.length && judged.every(item => item.complete) && !disagreement) resolved = judged[0];
    const humanQuality = disagreement && !(resolved?.complete) ? 'disputed'
      : !resolved?.complete ? 'unassessed' : resolved.accepted ? 'accepted' : 'rejected';
    const sourceAndResponseValid = selected.length === review.requestIds.length && selected.every(entry => entry.validation?.valid);
    const responseComplete = sourceAndResponseValid && selected.every(entry => entry.validation.complete);
    const validResponses = selected.filter(entry => entry.validation?.valid).map(entry => entry.response);
    const costKnown = allAttempts.every(entry => entry.attempt.actualCostUsd !== null);
    const authored = frozen.labels.get(review.sourceId);
    evaluated.push({ reviewRunId, conditionId: condition.conditionId, candidateId: condition.candidateId,
      requestedModelId: condition.requestedModelId, effectiveModelId: condition.effectiveModelId,
      cohortId: review.cohortId, strategyId: review.strategyId, locale: frozen.sources.get(review.sourceId).source.language,
      sourceId: review.sourceId, pairId: review.pairId, repetition, selectedRuleIds: review.ruleIds,
      attempts: allAttempts.length, failedAttempts: allAttempts.filter(entry => !entry.validation?.valid).length,
      invalidResponses: allAttempts.filter(entry => entry.validationError !== null).length,
      missingFinalRequests: review.requestIds.filter(id => !selected.some(entry => entry.attempt.requestId === id)),
      selectedFinalAttemptIds: record.finalAttemptIds, responseSetSha256: responseHash,
      sourceAndResponseValid, responseComplete, needsEvidenceRules: validResponses.flatMap(response => response.ruleResults.filter(result => result.decision === 'needs-evidence').map(result => result.ruleId)),
      humanQuality, reviewerCount: judged.length, reviewerDisagreement: disagreement,
      adjudicated: record.adjudication !== null && resolved.complete,
      factsPreserved: resolved?.complete ? (record.adjudication ?? record.humanJudgments[0]).factsPreserved : null,
      intentPreserved: resolved?.complete ? (record.adjudication ?? record.humanJudgments[0]).intentPreserved : null,
      harmfulChange: resolved?.complete ? (record.adjudication ?? record.humanJudgments[0]).harmfulChange : null,
      humanRuleJudgments: resolved?.complete ? (record.adjudication ?? record.humanJudgments[0]).ruleJudgments : null,
      acceptedEditorialReview: sourceAndResponseValid && humanQuality === 'accepted',
      acceptedCompleteReview: responseComplete && humanQuality === 'accepted',
      knownAttemptCostUsd: sum(allAttempts.map(entry => entry.attempt.actualCostUsd ?? 0)),
      unknownCostAttempts: allAttempts.filter(entry => entry.attempt.actualCostUsd === null).length,
      totalAttemptCostUsd: costKnown ? sum(allAttempts.map(entry => entry.attempt.actualCostUsd)) : null,
      diagnostic: diagnostics(review, frozen.sources.get(review.sourceId).source, authored.expectedReview, validResponses),
    });
  }
  const comparisons = [];
  for (const condition of conditions.values()) {
    const locales = sorted(new Set(condition.sourceIds.map(id => frozen.sources.get(id).source.language)));
    for (const locale of locales) {
      const rows = evaluated.filter(row => row.conditionId === condition.conditionId && row.locale === locale);
      const accepted = rows.filter(row => row.acceptedCompleteReview).length;
      const unknownCosts = sum(rows.map(row => row.unknownCostAttempts));
      const knownCost = sum(rows.map(row => row.knownAttemptCostUsd));
      const byRule = rows[0].selectedRuleIds.map(ruleId => {
        const ruleRows = rows.map(row => row.diagnostic.byRule.find(item => item.ruleId === ruleId));
        const counts = Object.fromEntries(['expectedLabels', 'predictedFindings', 'matchedLabels', 'unmatchedPredictions', 'missedLabels'].map(key => [key, sum(ruleRows.map(item => item[key]))]));
        return { ruleId, ...counts, labelPrecision: ratio(counts.matchedLabels, counts.predictedFindings), labelRecall: ratio(counts.matchedLabels, counts.expectedLabels) };
      });
      const semantic = {
        factsPreservation: { preserved: rows.filter(row => row.factsPreserved === true).length, violated: rows.filter(row => row.factsPreserved === false).length, unassessed: rows.filter(row => row.factsPreserved === null).length },
        intentPreservation: { preserved: rows.filter(row => row.intentPreserved === true).length, violated: rows.filter(row => row.intentPreserved === false).length, unassessed: rows.filter(row => row.intentPreserved === null).length },
        harmfulChanges: { present: rows.filter(row => row.harmfulChange === true).length, absent: rows.filter(row => row.harmfulChange === false).length, unassessed: rows.filter(row => row.harmfulChange === null).length },
        ruleJudgments: rows[0].selectedRuleIds.map(ruleId => {
          const judgments = rows.map(row => row.humanRuleJudgments?.find(item => item.ruleId === ruleId) ?? null);
          return { ruleId, plannedJudgments: rows.length, assessedJudgments: judgments.filter(Boolean).length,
            justifiedDecisions: judgments.filter(item => item?.decisionJustified === true).length, unjustifiedDecisions: judgments.filter(item => item?.decisionJustified === false).length,
            independentlyReportedMissedIssues: judgments.some(item => item === null) ? null : sum(judgments.map(item => item.missedIssueCount)),
            knownMissedIssues: sum(judgments.filter(Boolean).map(item => item.missedIssueCount)), unassessedJudgments: judgments.filter(item => item === null).length };
        }),
      };
      const diag = Object.fromEntries(['expectedLabels', 'predictedFindings', 'matchedLabels', 'unmatchedPredictions', 'missedLabels', 'outsideScopeLabels', 'findingsOnAuthoredKeepCase'].map(key => [key, sum(rows.map(row => row.diagnostic[key]))]));
      comparisons.push({ conditionId: condition.conditionId, candidateId: condition.candidateId,
        requestedModelId: condition.requestedModelId, effectiveModelId: condition.effectiveModelId,
        parametersSha256: condition.parametersSha256, executionSettings: condition.executionSettings,
        cohortId: condition.cohortId, strategyId: condition.strategyId, locale,
        sourceIds: rows.filter(row => row.repetition === condition.repetitions[0]).map(row => row.sourceId), repetitions: condition.repetitions,
        plannedReviews: rows.length, reviewsWithNoAttempts: rows.filter(row => row.attempts === 0).length,
        validResponseReviews: rows.filter(row => row.sourceAndResponseValid).length,
        incompleteReviews: rows.filter(row => !row.responseComplete).length,
        humanQualityAccepted: rows.filter(row => row.acceptedEditorialReview).length,
        humanRejected: rows.filter(row => row.humanQuality === 'rejected').length,
        humanUnassessed: rows.filter(row => row.humanQuality === 'unassessed').length,
        humanDisputed: rows.filter(row => row.humanQuality === 'disputed').length,
        reviewerDisagreements: rows.filter(row => row.reviewerDisagreement).length,
        acceptedCompleteReviews: accepted, acceptedCompleteReviewRate: ratio(accepted, rows.length),
        attemptedRequests: sum(rows.map(row => row.attempts)), failedAttempts: sum(rows.map(row => row.failedAttempts)), invalidResponses: sum(rows.map(row => row.invalidResponses)),
        knownAttemptCostUsd: knownCost, unknownCostAttempts: unknownCosts, totalAttemptCostUsd: unknownCosts ? null : knownCost,
        costPerAcceptedCompleteReviewUsd: unknownCosts || accepted === 0 ? null : knownCost / accepted,
        semantic,
        diagnostic: { ...diag, labelPrecision: ratio(diag.matchedLabels, diag.predictedFindings), labelRecall: ratio(diag.matchedLabels, diag.expectedLabels), byRule },
      });
    }
  }
  return { schemaVersion: 1, evaluatorVersion, evaluatorSha256: identity.evaluatorSha256,
    manifestSha256: sha256(manifestBytes), runSha256: sha256(runBytes), runId: run.runId, dataOrigin: run.dataOrigin,
    catalogueVersion: manifest.catalogueVersion, provenance: manifest.provenance,
    execution: { providerRequestsSentByEvaluator: 0, runnerExecutions: 0, suppliedAttempts: attempts.size,
      suppliedResponsesValidated: [...inspectedAttempts.values()].filter(entry => entry.attempt.status === 'response').length },
    method: { matching: 'Exact selected rule ID, authored quote and unambiguous UTF-16 span. No fuzzy or overlap matching. Sparse authored labels produce pilot diagnostics, not independent semantic precision/recall.',
      coverage: 'Every planned source/repetition remains in its condition and locale denominator. Only selected rules contribute expected labels. Missing and invalid final results leave labels unmatched.',
      humanQuality: 'Independent human judgments assess facts, intent, justified decisions, missed issues and every produced alternative. Null stays unassessed; unresolved disagreement cannot accept a review. A justified needs-evidence answer may have accepted editorial quality while remaining incomplete.',
      cost: 'Every globally unique supplied attempt is charged once, including failed, unselected and retried attempts. Unknown costs stay null. Cost does not determine human quality. Zero accepted complete reviews yields no cost ratio.',
      repeatability: 'The exact manifest, run and evaluator bytes determine this offline report. Model generation is not claimed deterministic. Use the recorded source revision if validator/preparer differs.',
      scope: 'Authored development pilot, not held-out production qualification. No overall writing score, ranking threshold or automatic model qualification is produced.' },
    comparisons, reviews: evaluated,
    attemptValidation: [...inspectedAttempts.values()].map(entry => ({ attemptId: entry.attempt.attemptId, status: entry.attempt.status,
      responseSha256: entry.attempt.response === null ? null : sha256(typeof entry.attempt.response === 'string' ? entry.attempt.response : json(entry.attempt.response)),
      valid: entry.validation?.valid ?? false, complete: entry.validation?.complete ?? false, validationError: entry.validationError })),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const allowed = new Set(['--manifest', '--run', '--output', '--init']);
  const options = {};
  for (let i = 0; i < args.length; i++) {
    assert(allowed.has(args[i]) && !Object.hasOwn(options, args[i]), 'Use --manifest PATH --run PATH --output PATH, or --manifest PATH --init --output PATH');
    if (args[i] === '--init') options[args[i]] = true;
    else { assert(args[i + 1] && !args[i + 1].startsWith('--'), 'Argument path is missing'); options[args[i]] = args[++i]; }
  }
  assert(options['--manifest'] && options['--output'] && (options['--init'] ? !options['--run'] : options['--run']), 'Explicit frozen manifest, run and output paths are required');
  const identity = await localEvaluatorIdentity();
  const manifestBytes = await readFile(resolve(options['--manifest']));
  const result = options['--init'] ? createQualityRunTemplate(manifestBytes, identity)
    : evaluateModelQuality({ manifestBytes, runBytes: await readFile(resolve(options['--run'])), identity });
  const output = resolve(options['--output']);
  assert(output !== resolve(options['--manifest']) && (!options['--run'] || output !== resolve(options['--run'])), 'Do not overwrite frozen inputs');
  await writeFile(output, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ output, operation: options['--init'] ? 'inert-template-created' : 'offline-quality-evaluated',
    ...(options['--init'] ? {} : { plannedReviews: result.reviews.length, ...result.execution }) }, null, 2));
}
