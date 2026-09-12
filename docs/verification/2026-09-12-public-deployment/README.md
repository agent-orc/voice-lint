# Public website verification — 12 September 2026

[Voice](https://agent-orchestrator.dev/voice/) was verified over HTTPS at 2026-09-12T21:57:43.793Z. The static release 12fabf4ec02d504ce7502d2c8b7eb40e1fe19d71 on agent-orc/voice-lint deploy was built from clean source 7360a67e255656d4a3d38f04afa2e7db377409ec. The four-file ecosystem integration is published through agent-orc/website eeee6eff3d2cd7b6a6ddfbfe14f8a9c0d7b5e339.

The maintained command `npm run website:verify-deployment` fetched all 99 artifact files and compared their SHA-256 hashes and content types with the local build. All 24 HTML routes returned 200, /voice redirected with 308, and unknown/private routes returned 404. The ecosystem homepage links to Voice and includes English and German card text. Five existing ecosystem subsites retained byte-identical public HTML; a separate hosted application was also checked unchanged.

This records this release at its verification time. It does not run browser interactions, qualify a model, or publish the Studio backend. Repeat the command against the exact artifact before claiming that a later deployment matches.

- [HTTP and file verification](deployment.json)
- [Source and artifact identity](release.json)
- [Evidence hashes](manifest.json)
