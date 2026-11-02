# Harden the upgrade path

## Why

This fork changes rarely; the expected upgrades are new releases of the
official `@excalidraw/excalidraw` engine. Two things make those upgrades harder
than they need to be:

- The backend image can be built without Prisma's schema engine. `npm ci`
  downloads the engine in a postinstall step, and a failed download does not
  fail the build. The missing engine only shows when a container starts:
  `prisma migrate deploy` tries to download it into the root-owned
  `node_modules` and fails. This has happened twice: once in the Homebase
  personal-editing integration (download timeout) and once in the
  `support-native-base-path` E2E run.
- No document lists what an engine upgrade must check. That knowledge is spread
  across archived changes and Homebase release records.

## What Changes

- The backend Docker build fails unless the Prisma schema engine for the
  image's platform is present after dependency installation. Containers never
  download or write Prisma engines at startup.
- Add `docs/develop/upgrading-excalidraw.md`, a checklist for upgrading the
  engine, and link it in the Develop sidebar.

## Preserved capabilities

Migrations still run at startup through `prisma migrate deploy` unless
`RUN_MIGRATIONS` disables them. The provider-specific clients, SQLite and
PostgreSQL support, data, API and frontend are unchanged.

## Exclusions

- No Excalidraw upgrade in this change.
- No vendoring of engine binaries; builds still need access to Prisma's binary
  downloads.
- No change to the frontend, the engine's glyph subsetting or the nginx
  headers.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `single-user-runtime`: backend images contain the Prisma engines their
  startup needs.

## Impact

- `backend/Dockerfile` and a new `backend/scripts/verify-prisma-engines.sh`.
- `docs/develop/upgrading-excalidraw.md` and `docs/.vitepress/config.ts`.
- No application code or database changes.
