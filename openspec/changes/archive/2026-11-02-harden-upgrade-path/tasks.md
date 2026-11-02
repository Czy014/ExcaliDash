# Tasks

Run every command with Node.js 24.22.1 and npm 10.9.2 (a `node:24.22.1`
container or a local installation). Commands use POSIX `sh` syntax from the
repository root unless they start with `cd`.

## 1. Implementation

- [x] 1.1 Add `backend/scripts/verify-prisma-engines.sh` and run it in the
      `dependencies` stage of `backend/Dockerfile` right after `npm ci`
      (design section 1). It runs `npx prisma version` and requires an
      executable schema engine for the reported platform.
- [x] 1.2 Add `docs/develop/upgrading-excalidraw.md` and its Develop sidebar
      entry in `docs/.vitepress/config.ts` (design section 2).

## 2. Validation

- [x] 2.1 Build the backend image with default networking:
      `docker build --platform linux/amd64 -f backend/Dockerfile -t excalidash-backend:upgrade-path-check .`.
      If Prisma's binary host is unreachable, the build must fail in the
      verification step with its message; record that and retry with
      `--network host`. In the final image,
      `node_modules/@prisma/engines/schema-engine-*` exists and is executable.
- [x] 2.2 Negative check: build the `dependencies` stage
      (`--target dependencies`), start it with `--network none`, delete the
      schema engine and run the verification script. It must exit non-zero
      with the message.
- [x] 2.3 Fresh start: run the image as UID 1001 with an empty SQLite
      directory owned by `1001:1001` and the default `RUN_MIGRATIONS`. All
      migrations apply, `/health` returns 200, and `docker diff` lists nothing
      under `/app/node_modules`.
- [x] 2.4 `cd e2e && docker compose -f docker-compose.e2e.yml up -d --build backend`
      becomes healthy without `RUN_MIGRATIONS=false`; then
      `docker compose -f docker-compose.e2e.yml down -v`.
- [x] 2.5 `npm run docs:build` passes and the guide appears under Develop.
      `npm run check`, `git diff --check` and
      `openspec validate --all --strict --no-interactive` pass.

## 3. Completion

- [x] 3.1 Record the results below, synchronize the specification and archive
      this change only after section 2 passes.
- [x] 3.2 Commit and push `chore/upgrade-path`. Merge into `main` only when
      explicitly instructed.

## Validation

### Environment and scope

- Date: 2026-11-02. Local isolation only, based on `1ff635e` on
  `chore/upgrade-path`; no connection to keeper or changes to Homebase.
- Host commands used `/tmp/excalidash-bin`: Node.js `v24.22.1` and npm
  `10.9.2`. The dependencies image reported the same versions. The Node
  Alpine image bundled npm `11.19.1`, so the Dockerfile explicitly installs
  npm `10.9.2` before `npm ci`. The final image removes package managers as
  before.

### Image builds and the negative check

- The default-network amd64 backend build passed the new verification step:
  Prisma `5.22.0` reported `linux-musl-openssl-3.0.x`, and its executable
  schema engine was verified. A later builder step failed downloading the
  additional ARM64 query-engine checksum during `prisma generate`. This
  was not a failure of the new schema-engine verification.
- Retrying the build with `--network host` passed. The final
  `excalidash-backend:upgrade-path-check` image is
  `sha256:1814fb9254f8183f525d093d4ec8a099db11fb29cc9c7346f487e94a012fa5f4`.
  Its schema engine is executable and root-owned; its default user is UID
  1001 and Node.js is `v24.22.1`.
- Built `--target dependencies`. In a disposable `--network none`
  container, removed the schema engine and `/root/.cache/prisma` so a
  cached copy could not mask the missing engine. Running the verification
  script exited `1` and reported:
  `ERROR: Prisma schema engine verification failed; the build needs access to Prisma's binary downloads.`
  The container was removed.

### Fresh start

- Started the final image with its default UID 1001, `NODE_ENV=production`,
  `--network none` and a new empty SQLite bind directory owned by
  `1001:1001`. `RUN_MIGRATIONS` was not set.
- All 28 migrations applied. `/health` returned HTTP 200 with database
  status `ok`; `prisma migrate status` reported an up-to-date database. A
  read-only SQLite query confirmed 28 completed migrations and no failed
  migrations.
- `docker diff` contained no changes under `/app/node_modules`. The
  container and temporary SQLite directory were removed after the check.

### E2E Compose backend

- Used the existing `e2e/docker-compose.e2e.yml` with the isolated project
  name `excalidash-upgrade-path`. The first default-network build failed
  at the same additional query-engine download in `prisma generate`.
- Retried with an external temporary Compose override containing only
  `services.backend.build.network: host`; runtime settings were unchanged.
  The backend became healthy as UID 1001. Its configured environment did
  not contain `RUN_MIGRATIONS`, all 28 migrations applied, `/health`
  returned HTTP 200 and `prisma migrate status` was up to date.
- Ran `docker compose -p excalidash-upgrade-path -f docker-compose.e2e.yml down -v`.
  Confirmed no project containers, networks or volumes remained.

### Documentation and static checks

- `npm run docs:build` passed. Inspected the generated guide HTML and
  asserted that its title and Develop sidebar link were present.
- `npm run check`, `npm run build`, `sh -n backend/scripts/verify-prisma-engines.sh`
  and `git diff --check` passed.
- Before archive, `openspec validate --all --strict --no-interactive`
  passed: five specifications and this change, six items total.
- Archived as `2026-11-02-harden-upgrade-path`. The added requirement in
  `single-user-runtime` matches the change specification verbatim. After
  archive, all five main specifications passed strict validation.

### Publication

- Implementation, original proposal/design, synchronized specification and
  archive were committed and pushed on `chore/upgrade-path` as `db0f9ba`.
- `main` remains at `6418f6f`; neither implementation branch was merged.

### Not verified

- No Excalidraw dependency upgrade, full business test suite or browser
  matrix was run. No PostgreSQL or ARM64 runtime was started.
- No main merge or production deployment was performed. Builds still need
  access to Prisma's binary host; default Docker build networking could
  not reach the additional query-engine download in this environment.
