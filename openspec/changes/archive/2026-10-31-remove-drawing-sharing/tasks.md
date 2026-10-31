# Tasks

- [x] 1.1 Remove the editor Share button, dialog, state, route and link-sharing API; update related frontend and browser tests.
- [x] 1.2 Scope drawing access to the fixed workspace owner; remove backend sharing routes, token/TTL settings and unused callers.
- [x] 1.3 Use English across the interface and editor; remove partial translations and language selectors, ignoring obsolete language preferences.
- [x] 1.4 Translate current maintenance documents and specifications, remove sharing documentation/screenshots and update the environment example. Preserve Prisma schema and historical migrations.
- [x] 2.1 Run backend Vitest, frontend unit tests, E2E type checks and related Playwright scenarios.
- [x] 2.2 Run `npm run check`, `npm run build`, `npm run docs:build` and `git diff --check`.
- [x] 2.3 Run `openspec validate --all --strict --no-interactive`.
- [x] 2.4 Check for retired runtime endpoints, sharing UI, TTL settings and partial translations; verify Prisma schema and migrations are unchanged.
- [x] 3.1 Synchronize implemented specifications and archive the change after validation.
- [x] 3.2 Commit and push the implementation branch.

## Validation

Validated on 2026-10-31 on branch `remove-drawing-sharing`, based on `4b45015`, using Node.js 24.22.1 and npm 10.9.2. Tests used isolated local SQLite databases and test files.

- `npm --prefix backend test`: 19 files, 213 tests passed. Coverage includes retired sharing endpoints, ignored historical view/edit links, preservation of historical drawings/link rows/files/history, owner-only image access, version conflicts, snapshots, imports and CSRF.
- `npm --prefix frontend run test:unit`: 6 files, 46 tests passed. History previews, live-canvas preservation, save guards, conflicts, drafts and recovery remain covered. The obsolete sharing popover test was removed; the auto-hide test now covers renaming.
- `npm --prefix e2e run check`: passed.
- `npm --prefix e2e test -- --reporter=line`: 75 passed, 1 optional screenshot-capture test skipped. Fresh browser contexts with a Chinese locale and obsolete Chinese preferences verify English library/settings/editor controls. The suite verifies absence of Share controls, old `/shared/:id` URLs returning to the library, preserved collection names, images, history, portable files and multiple-tab conflicts.
- `npm run check`: passed, including formatting, lint, version and environment-boundary checks.
- `npm run build` and `npm run docs:build`: passed.
- `openspec validate --all --strict --no-interactive`: 5/5 passed before archival and 4/4 after archival. The current specifications contain 16 requirements (15 before this change plus the English-interface contract).
- `git diff --check`: passed. Prisma schema, historical migrations, dependency lockfiles and CI configuration are unchanged. Runtime scans found no sharing endpoints, token/TTL settings, sharing UI or partial translation provider. Current source, documents, specifications and new change artifacts contain no Chinese prose; historical archives retain their original text.

Not verified: keeper deployment, Homebase reverse proxy integration, Docker image builds/startup and live PostgreSQL/S3. Existing documentation screenshots were not recaptured; the dedicated sharing screenshots were removed. No production database, uploads or secrets were accessed. Existing public links will stop resolving when this change is deployed; historical sharing rows remain stored.
