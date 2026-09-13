# Voice bilingual release · 13 September 2026

Status: published and verified at https://agent-orchestrator.dev/voice/.

Source **68f224dd3d285c6d87476269c1064fda9087e487** produced artifact **a074139716dc6d7273146428e391f33514f23642**. The artifact contains 142 static files, 48 content routes (24 in each language) and two compatibility redirects. Studio and its backend remain local.

## Build from the repository

A fresh HTTPS GitHub clone of the published source passed on Windows with Node 24.18.0 and .NET SDK 10.0.301:

```sh
git clone https://github.com/agent-orc/voice-lint.git
cd voice-lint
git checkout 68f224dd3d285c6d87476269c1064fda9087e487
npm ci
npm run build
npm run website:build
npm run website:verify-artifact
```

No existing project files, dependencies or private runtime data were copied into the clone. npm and NuGet performed their normal restores. The resulting source tree was clean. All 141 content/asset files match the release build byte for byte; build-info.json records the same source, input hashes and routes with its own build timestamp.

## Verified behavior

- Public HTTPS: all 142 file hashes and MIME types, 48 HTML routes, the bare-path redirect and missing/private-route 404s.
- Public browser: 96 desktop/mobile language views, 282 links/assets/fragments, actual HTML-library annotations and selection, exact code copy and navigation without JavaScript.
- Public SEO: every localized route, canonical/hreflang, unique titles/descriptions, sitemap discovery, all internal anchors, image dimensions, Open Graph and JSON-LD.
- Public hub: visible Voice Lint links and the correct language destination at 1440, 390 and 320 pixels.
- Local Studio: 45 configured original sources, German JSON selection and navigation to the actual German Markdown source; no source writes.
- Local specialist checks: 22 writing-pattern, 16 research and 12 JSON-dialog checks. Writing-rules tests passed 33 cases; offline benchmark-contract checks passed without evaluating models.
- Hosting isolation: the five sibling sites and the unrelated hosted application retained their public HTML. The unrelated virtual-host configuration block is unchanged.

## Repository retirement

Normal Devspace commit 53188edb930d1fd8c81e32e9a83573cfd55cdc80 removes the 299 obsolete Voice files and adds VOICE-MOVED.md. All 227 other tree entries and existing history are preserved. The active dirty Devspace checkout and its earlier local backups were not reset or changed. Product source is maintained only in agent-orc/voice-lint.

## Evidence and limits

The JSON files retain capture times, source hashes and their local or public scope. The manifest hashes these curated records. Local checkout paths, the temporary project identifier and the unrelated application hostname were omitted where they do not help reproduce the checks. Historical records in earlier dated directories are unchanged.

These checks do not reproduce cited studies, qualify model review quality or establish AI authorship. They do not measure Google indexing, search rankings or field Core Web Vitals. No model call, paid inference, Search Console submission or Studio backend deployment was performed.

The final documentation commit records this release after publication; the deployed source revision is the explicit 68f224d snapshot above.
