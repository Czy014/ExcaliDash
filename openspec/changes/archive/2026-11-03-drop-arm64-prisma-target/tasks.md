# Tasks

Run every command with Node.js 24.22.1 and npm 10.9.2 (a `node:24.22.1`
container or a local installation). Commands use POSIX `sh` syntax from the
repository root unless they start with `cd`.

## 1. Implementation

- [x] 1.1 Remove `linux-musl-arm64-openssl-3.0.x` from `binaryTargets` in
      `backend/prisma/schema.prisma` (design, Decision). Verify that
      `rg -n 'linux-musl-arm64' --glob '!openspec/changes/archive/**' --glob '!openspec/changes/drop-arm64-prisma-target/**' --glob '!**/package-lock.json' .`
      prints nothing.

## 2. Validation

- [x] 2.1 Build with default networking, without `--network host`:
      `docker build --platform linux/amd64 -f backend/Dockerfile -t excalidash-backend:arm64-target-check .`.
      Keep the build log. The build must succeed and the log must not mention
      `linux-musl-arm64`. If it fails, record the failing step and message and
      stop; do not fall back to host networking.
- [x] 2.2 List `libquery_engine-*` files under `/app/prisma_clients` in the
      image. Each of the two clients contains only the
      `linux-musl-openssl-3.0.x` engine.
- [x] 2.3 Fresh start: run the image as UID 1001 with an empty SQLite
      directory owned by `1001:1001` and the default `RUN_MIGRATIONS`. All
      migrations apply, `/health` returns 200, and `docker diff` lists nothing
      under `/app/node_modules`.
- [x] 2.4 With an isolated project name,
      `cd e2e && docker compose -p excalidash-arm64-target -f docker-compose.e2e.yml up -d --build backend`
      builds with default networking and becomes healthy. Then run
      `docker compose -p excalidash-arm64-target -f docker-compose.e2e.yml down -v`
      and confirm no project containers, networks or volumes remain.
- [x] 2.5 `npm run check`, `git diff --check` and
      `openspec validate --all --strict --no-interactive` pass.

## 3. Completion

- [x] 3.1 Record the results under Validation below: image ID, the engine
      file list, the build log check and anything not verified.
- [x] 3.2 Remove the `excalidash-backend:arm64-target-check` image after
      recording its ID. Do not remove other images.
- [x] 3.3 Archive the change (syncs `single-user-runtime`) and commit on
      `chore/drop-arm64-prisma-target`. Fast-forward `main`, push `main`, then
      delete the branch locally and on `origin`.

Homebase is not touched: the running Draw images stay as they are until the
next image update.

## Validation

Validated locally on 2026-11-03 with Node.js `24.22.1` and npm `10.9.2`
from `/tmp/excalidash-bin`. The backend Dockerfile uses the same versions.

- Implementation: removed only the ARM64 entry from `binaryTargets`. The
  required repository search produced no matches outside the excluded change,
  historical archives and lock files. No Dockerfile, entrypoint, verification
  script, dependency, application or migration changes were made.
- Default-network image build: passed with the exact task 2.1 command and no
  network override. Both Prisma client generation steps ran successfully.
  The retained log `/tmp/excalidash-drop-arm64-build.log` contains no
  `linux-musl-arm64` references. The dependency stage verified Prisma `5.22.0`
  and its executable `linux-musl-openssl-3.0.x` schema engine.
- Test image: `excalidash-backend:arm64-target-check`, Linux amd64,
  `sha256:92eb898e2a85b2ab46655ab393eec72ffc6ad77228d52f934dc6ef000f40f07e`.
  The complete query-engine file list under `/app/prisma_clients` was:

  ```text
  /app/prisma_clients/postgresql/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
  /app/prisma_clients/sqlite/client/libquery_engine-linux-musl-openssl-3.0.x.so.node
  ```

- Fresh SQLite startup: passed as UID `1001:1001` with `RUN_MIGRATIONS`
  unset. Before startup, the SQLite volume was empty, owned by `1001:1001`,
  and mounted with `volume-nocopy` to prevent Docker from populating it.
  All 28 migrations applied, `/health` returned HTTP 200, and `docker diff`
  showed no changes at or below `/app/node_modules`. Startup and filesystem
  evidence remain in `/tmp/excalidash-drop-arm64-fresh-start.log` and
  `/tmp/excalidash-drop-arm64-fresh-diff.log`. The container and volume were
  removed after validation. An earlier host-directory preparation could not
  change ownership as the host user; the isolated Docker volume provided the
  required ownership without changing application files.
- E2E Compose backend: the exact task 2.4 command passed with default build
  networking and the same build layers, producing image
  `sha256:f640dd9272f0f61cc053b378806d16af12366cf42fec013ac79bd4b307154803`.
  `RUN_MIGRATIONS` was not disabled, all 28 migrations applied, the backend
  became healthy, and `/health` returned HTTP 200. Logs remain in
  `/tmp/excalidash-drop-arm64-e2e.log` and
  `/tmp/excalidash-drop-arm64-e2e-startup.log`; the build log contains no
  `linux-musl-arm64` references. `down -v` completed, and project-label queries
  confirmed no containers, networks or volumes remained. The Compose image
  was retained as required by the image cleanup scope.
- Repository checks: `npm run check`, `git diff --check` and
  `openspec validate --all --strict --no-interactive` passed (six items before
  archival). No new tests were added for this single configuration deletion.
- Image cleanup: removed only `excalidash-backend:arm64-target-check` after
  recording its ID. A before-and-after image inventory confirmed that all
  other image tags were unchanged.
- Not verified: ARM64 builds, PostgreSQL database startup, the full business
  or browser test suites, and production operation. Both generated database
  clients were inspected, but runtime validation used isolated SQLite only.
  Homebase and keeper were neither accessed nor modified.
