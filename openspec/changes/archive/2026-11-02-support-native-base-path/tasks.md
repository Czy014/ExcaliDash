# Tasks

Run every command with Node.js 24.22.1 and npm 10.9.2 (a `node:24.22.1`
container or a local installation). Commands use POSIX `sh` syntax from the
repository root unless they start with `cd`.

## 1. Implementation

- [x] 1.1 Read `EXCALIDASH_BASE_PATH` in `frontend/vite.config.ts`, validate it
      and set `base` (design section 1). Declare `ARG EXCALIDASH_BASE_PATH=/`
      in the builder stage of `frontend/Dockerfile` and export it before
      `npm run build`.
- [x] 1.2 Pass `import.meta.env.BASE_URL` as the `BrowserRouter` basename in
      `frontend/src/App.tsx` without changing route paths or navigation calls.
- [x] 1.3 Add `frontend/src/bootstrap/excalidrawAssetPath.ts`, import it first
      in `frontend/src/main.tsx`, and remove the inline script from
      `frontend/index.html` (design section 3).
- [x] 1.4 Resolve the `index.html` favicon and the `ThemeContext` favicons
      under the base path, and update the comment in
      `frontend/scripts/copy-excalidraw-assets.mjs`.
- [x] 1.5 Document `EXCALIDASH_BASE_PATH` in `docs/deploy/docker.md`: the
      default, an example `/draw/` build, that the proxy strips the prefix
      before the frontend, and that `/api/` stays routed at the origin root.

## 2. Tests

- [x] 2.1 Add `e2e/tests/helpers/paths.ts` and `e2e/tests/base-path.spec.ts`
      (design section 5). The spec enforces the CSP from the file named by
      `CSP_TEMPLATE_PATH` only when that variable is set.
- [x] 2.2 In `e2e/docker-compose.e2e.yml`, mount
      `../frontend/nginx.conf.template` read-only into the Playwright service
      and set `CSP_TEMPLATE_PATH`. Add `e2e/docker-compose.base-path.yml` and
      `e2e/fixtures/base-path-proxy.conf` with a pinned official nginx image
      such as `nginx:1.30.6-alpine`.

## 3. Validation

- [x] 3.1 `npm --prefix frontend run test:unit`, `npm run check` and
      `npm --prefix e2e run check` pass.
- [x] 3.2 `npm run build` passes and `frontend/dist/index.html` references
      `/assets/` and `/favicon.svg` and contains no inline script. Then
      `EXCALIDASH_BASE_PATH=/draw/ npm --prefix frontend run build` references
      `/draw/assets/` and `/draw/favicon.svg`. Each of
      `EXCALIDASH_BASE_PATH=draw`, `/draw`, `/a/../b/` and `https://x/draw/`
      fails the build.
- [x] 3.3 Root development browser checks pass against the Vite development
      server, with `CSP_TEMPLATE_PATH` unset so the policy is not enforced:
      `npm --prefix e2e test -- tests/base-path.spec.ts tests/theme-toggle.spec.ts tests/dashboard-workflows.spec.ts tests/drawing-crud.spec.ts tests/search-and-sort.spec.ts`.
- [x] 3.4 Root production images pass the base-path spec with the template
      CSP enforced:
      `cd e2e && docker compose -f docker-compose.e2e.yml run --rm --build playwright npx playwright test tests/base-path.spec.ts --reporter=list`,
      then `docker compose -f docker-compose.e2e.yml down -v`.
- [x] 3.5 Subpath production images pass the base-path spec with the template
      CSP enforced:
      `cd e2e && docker compose -f docker-compose.e2e.yml -f docker-compose.base-path.yml up --build --abort-on-container-exit --exit-code-from playwright`,
      then `docker compose -f docker-compose.e2e.yml -f docker-compose.base-path.yml down -v`.
- [x] 3.6 Record the response headers of `/`, `/index.html`, `/collections`,
      one asset and one font for the root and subpath production runs,
      including whether `Content-Security-Policy` is present.
- [x] 3.7 `git diff --check` and
      `openspec validate --all --strict --no-interactive` pass.

## 4. Completion

- [x] 4.1 Record the results below, synchronize the `base-path` specification
      and archive this change only after section 3 passes.
- [x] 4.2 Commit and push `feat/native-base-path`. Merge into `main` only when
      explicitly instructed, then record the commit for Homebase.

## Validation

### Environment and scope

- Validated on 2026-11-01/02 with Node.js 24.22.1 and npm 10.9.2.
  The local installation was selected with `/tmp/excalidash-bin` in `PATH`.
- All browser checks used isolated SQLite test databases and fresh browser
  contexts. Only local test containers were created or recreated. The E2E
  Compose containers and network were removed with `down -v` after both runs.
- No Homebase code, keeper service, production data, engine distribution or
  nginx security policy was changed. Integration, main merge and keeper
  deployment remain subject to separate authorization.

### Unit tests and static checks

- `npm --prefix frontend run test:unit`: 50 tests passed in 7 files, including
  four bootstrap cases covering an absent, empty, invalid or preset asset path.
- `npm run check`: passed formatting, lint, version and environment checks.
- `npm --prefix e2e run check`: passed.
- `git diff --check`: passed.
- `openspec validate --all --strict --no-interactive`: 5 items passed before
  archive (4 current specifications and this change).
- Archived as `2026-11-02-support-native-base-path`; all three added
  requirements match the synchronized `base-path` specification. Strict
  validation after archive passed all 5 current specifications.
- Implementation and archive commit `377b8b1` was pushed to
  `origin/feat/native-base-path`. Task 4.2's authorized branch publication is
  complete. No main merge is authorized yet; its eventual merge commit must be
  recorded for Homebase before integration or deployment.

### Builds

- `npm run build`: passed for backend and frontend at `/`.
- `EXCALIDASH_BASE_PATH=/draw/ npm --prefix frontend run build`: passed.
- Asserted that the root HTML references `/assets/` and `/favicon.svg`, and
  the subpath HTML references `/draw/assets/` and `/draw/favicon.svg`.
  Both built documents contain external scripts only, with no inline script.
- Builds rejected each of `draw`, `/draw`, `/a/../b/` and `https://x/draw/`
  with `Invalid EXCALIDASH_BASE_PATH` before producing output.
- A local build initially encountered root-owned files left by a previous
  container build in `frontend/dist`. Restored ownership of that generated
  directory only and reran the build successfully.

### Browser checks

- Task 3.3's five suites passed against Vite without `CSP_TEMPLATE_PATH`:
  28 passed. The final base-path scenario also passed separately with
  5 local font responses at 200, zero CDN fallback events and zero CSP reports.
- Task 3.4's root production scenario passed with template CSP enforced:
  1 passed, retries disabled; 8 local font responses at 200, 1,380 CDN
  fallback events, all blocked with `failure().errorText === "csp"` and no
  response, and 4 glyph-subsetting `eval` reports.
- Task 3.5's `/draw/` production scenario passed with template CSP enforced:
  1 passed, retries disabled; 8 local font responses at 200, 1,380 blocked CDN
  fallback events with no response, and 4 glyph-subsetting `eval` reports.
- Both production runs required each `eval` report to have `blockedURI=eval`
  and a same-origin `sourceFile` under the configured base's assets matching
  `subset-shared.chunk-*.js`. The engine logged `Skipped glyph subsetting
EvalError` and its worker-to-main-thread fallback. No inline or external
  script CSP violation, other CSP violation, unexpected console error or
  unexpected failed request was accepted.
- Before navigation the test waits for in-flight requests. Each final run
  recorded one request cancelled by navigation (`net::ERR_ABORTED`), excluded
  from failures and from completed-font assertions. Earlier test attempts
  exposed these cancellations and cache revalidation (304); the final spec
  disables browser caching through routing and verifies completed fonts at 200.
  An earlier subpath attempt passed only on retry; the final run above passed
  on its first attempt with retries disabled.

The local production-image commands used the committed Compose files plus
two validation-only overrides outside the repository:

- `/tmp/excalidash-e2e-db.yml` mounts `/tmp/excalidash-e2e.db` at
  `/app/prisma/e2e-test.db` and sets `RUN_MIGRATIONS=false`. This isolated
  database already has the test schema. An unmodified fresh-container start
  failed before the browser ran because Prisma could not write to
  `/app/node_modules/@prisma/engines`; this existing backend image issue was
  recorded rather than changed in this frontend change.
- `/tmp/excalidash-base-path-validation.yml` mounts the Node.js 24.22.1/npm
  10.9.2 toolchain and current test sources read-only into Playwright, sets its
  `PATH`, and runs the base-path spec with `--reporter=list --retries=0`.
  Both final production logs print the required Node/npm versions. The
  Playwright base image's bundled Node version does not satisfy this project's
  engine requirement.

The production scenarios inject the unmodified template policy into document
responses through Playwright. Chromium uses `--disable-web-security` for this
interception scenario to avoid its Docker-DNS private-network transport check;
the observed blocked font events and `eval` reports confirm that CSP remains
enforced. This does not change the application image or its nginx policy.

### Actual production-image response headers

Captured directly from nginx, without Playwright's injected policy. In the
subpath column, paths are requested through the prefix-stripping test proxy.
All ten responses returned 200 and had **no Content-Security-Policy header**.
HTML also had `Expires` in the past; assets and fonts expire after one year.

| Root path                            | Subpath path                              | Content-Type             | Cache-Control values                                                           |
| ------------------------------------ | ----------------------------------------- | ------------------------ | ------------------------------------------------------------------------------ |
| `/`                                  | `/draw/`                                  | `text/html`              | `no-cache`; `no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0` |
| `/index.html`                        | `/draw/index.html`                        | `text/html`              | Same as `/`                                                                    |
| `/collections`                       | `/draw/collections`                       | `text/html`              | Same as `/`                                                                    |
| `/assets/index-Dbal_1o6.js`          | `/draw/assets/index-BDDysOdp.js`          | `application/javascript` | `max-age=31536000`; `public, immutable`                                        |
| `/fonts/Virgil/Virgil-Regular.woff2` | `/draw/fonts/Virgil/Virgil-Regular.woff2` | `font/woff2`             | `max-age=31536000`; `public, immutable`                                        |

### Evidence and limitations

Local evidence is retained outside Git in `/tmp/`:
`excalidash-native-base-path-unit.log`, `excalidash-native-base-path-check.log`,
`excalidash-native-base-path-build.log`,
`excalidash-native-base-path-subpath-build.log`,
`excalidash-native-base-path-dev.log`,
`excalidash-native-base-path-dev-final.log`,
`excalidash-native-base-path-root-final.log`,
`excalidash-native-base-path-subpath-final.log`, and
`excalidash-native-base-path-{root,subpath}-headers.json`.

These are local production-image checks, not keeper production validation.
Homebase integration/deployment belongs to `use-native-draw-subpath`.
The existing nginx header inheritance, engine glyph-subsetting CSP
compatibility and backend image's fresh SQLite migration startup were not
fixed or claimed as passing. The backend integration suite was not rerun;
backend application code and data formats were unchanged.
