# ExcaliDash fork development conventions

- This repository is `Czy014/ExcaliDash`, forked from `ZimengXiong/ExcaliDash`. Keep using the official `@excalidraw/excalidraw` drawing engine.
- Make code and documentation changes on separate branches, never directly on `main`. Merge into `main` only when explicitly instructed. Never push to `upstream`.
- Use this repository's own `openspec/`, independently of the parent workspace and Homebase. Run OpenSpec commands from this repository root.
- Before implementing a nontrivial behavior change, write its proposal, design, specs and tasks. Use English for code, UI, current documentation and new OpenSpec artifacts. Historical archives keep their original text. Preserve OpenSpec headings and SHALL/MUST keywords.
- `openspec/specs/` records implemented contracts; planned behavior belongs in `openspec/changes/`. Synchronize specifications and archive only after implementation and validation.
- The product is a single-user drawing library without real-time collaboration, authentication or link sharing. Only `AUTH_MODE=disabled` is supported. Preserve version checks, images, history, workspace data boundaries and CSRF protection. Do not remove historical database tables as part of simplification.
- Keep this repository independent of Homebase. Routing, backup and deployment assembly belong in Homebase's Draw plugin, not in application code here.
- Retain upstream copyright notices and the LGPLv3 license. Record the source commit and build instructions when publishing a modified version.
- Use isolated test databases and files. Do not connect tests to keeper's production database, uploads, secrets or backups. Never record secret values in logs or specifications.
- Follow the runtime versions in `package.json`: Node.js >=24.22.1 and npm 10.9.2. Reuse the existing React, Express, Prisma, Vitest and Playwright structures.
- Validate behavior changes with related unit/integration tests, `npm run check`, `npm run build` and relevant Playwright scenarios. Record checks that were skipped or failed; specification validation does not verify runtime behavior.
- Before committing, run `git diff --check` and `openspec validate --all --strict --no-interactive`. Specification-only changes do not require application startup or the full business test suite.
