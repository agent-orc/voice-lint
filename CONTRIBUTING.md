# Contributing to Voice Lint

Voice Lint is currently a design repository. There is no working build yet, so early contributions should reduce ambiguity before adding broad implementation.

## Useful early contributions

- review and reconcile the proposed JSON contracts;
- add consented, license-compatible German or English fixtures;
- propose a narrowly defined rule with positive and negative examples;
- test Unicode and Markdown source-position conventions;
- spike cross-platform packaging, Vale, or LanguageTool integration;
- improve privacy, threat-model, calibration, or provider documentation.

Before starting a large change, open an issue describing the problem, intended contract impact, and evaluation plan.

## Rule proposal checklist

A built-in rule proposal includes:

1. a stable rule ID and named category;
2. supported language and formats;
3. a concrete explanation that does not rely on “sounds like AI”;
4. at least one positive and one negative fixture initially;
5. likely false positives and suppression guidance;
6. proposed default severity;
7. source and license attribution for adapted material.

Typography alone is not acceptable evidence of AI authorship or SLOP.

## Contract changes

Changes to a public shape must update the canonical schema, generated types, example fixtures, compatibility notes, and affected documentation together. Until schemas exist, keep all design examples marked `design-0` and proposed.

Scoring changes require language-specific evaluation. Uncalibrated heuristics remain raw measurements and must not be published as 0–100 scores.

## Safety requirements

Preserve the invariants in [AGENTS.md](AGENTS.md), especially:

- repository profiles cannot grant runtime capabilities;
- the `strict_offline` CLI process opens no sockets; when analysis is hosted by
  the local API, its already-open authenticated loopback listener is the only
  socket and analyzers/providers open no additional sockets;
- input text and text-derived hashes are absent from default logs and cache;
- personal subscriptions stay local and single-user;
- AI-origin output never becomes policy evidence in `0.x`.

## Source and license hygiene

Prefer primary sources. Record the upstream URL, revision, license, copyright notice, and whether material was copied, adapted, or independently implemented. Do not paste proprietary style guides, private client text, or model outputs without permission. Update [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) before distributing third-party code, rules, binaries, models, or data.

Contributions are submitted under the repository's [Apache License 2.0](LICENSE) unless a separately identified compatible license applies to a particular asset.

## Definition of done

A change is complete when its tests and fixtures cover German and English where applicable, source spans survive relevant Unicode/Markdown cases, documentation distinguishes planned from shipped behavior, and privacy/license effects are recorded.
