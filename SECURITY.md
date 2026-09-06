# Security policy

Voice Lint has no released package or running service yet. Security-sensitive design review is welcome, especially for configuration trust, local HTTP access, path handling, provider child processes, credential isolation, and text persistence.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting flow at <https://github.com/agent-orc/voice-lint/security/advisories/new> when it is available. Include the affected revision, platform, reproduction steps, impact, and a minimal proof of concept.

If private reporting is unavailable, do not publish exploit details or secrets. Open a minimal repository issue asking the maintainers to establish a private channel.

Do not include real credentials, confidential documents, browser data, or vendor OAuth caches in a report. Use synthetic test data.

## Supported versions

There are no supported release versions yet. This policy will gain a version-support table before the first release.

The proposed threat model is documented in [docs/privacy.md](docs/privacy.md).
