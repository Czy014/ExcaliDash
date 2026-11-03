# Drop the ARM64 Prisma engine target

## Why

`backend/prisma/schema.prisma` lists three `binaryTargets`: `native`,
`linux-musl-arm64-openssl-3.0.x` and `linux-musl-openssl-3.0.x`. This fork is
built and run only on Linux amd64. There, `native` and
`linux-musl-openssl-3.0.x` name the same engine, which `npm ci` already
installs, so the ARM64 entry is the only one that makes `prisma generate`
download anything. In this environment that download fails under default
Docker build networking: both default-network builds recorded in
`2026-11-02-harden-upgrade-path` failed on the ARM64 query engine and had to
be retried with `--network host`.

## What Changes

- Remove `linux-musl-arm64-openssl-3.0.x` from `binaryTargets`.
- An amd64 backend image build no longer downloads an ARM64 engine. When
  Prisma's binary host is reachable, default Docker build networking is enough.

## Preserved capabilities

- `native` still resolves to the platform of the container that runs
  `prisma generate`, so an image built for ARM64 still gets its own engine.
- The build-time engine verification, the SQLite and PostgreSQL clients,
  migrations, data, API and frontend are unchanged.

## Exclusions

- `linux-musl-openssl-3.0.x` stays. On amd64 it is the same engine as `native`
  and costs no download.
- No multi-architecture builds, no Prisma upgrade, no vendored engine binaries.
- No change to the Dockerfile, the verification script or the entrypoint.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `single-user-runtime`: amd64 backend image builds download no ARM64 Prisma
  engine.

## Impact

- One line in `backend/prisma/schema.prisma`.
- No application code, data or API changes. Existing images are unaffected
  until they are rebuilt.
