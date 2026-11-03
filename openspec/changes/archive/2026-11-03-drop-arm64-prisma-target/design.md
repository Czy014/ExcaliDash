# Design

## Context

- Prisma is `5.22.0`. The generator in `backend/prisma/schema.prisma` lists
  `native`, `linux-musl-arm64-openssl-3.0.x` and `linux-musl-openssl-3.0.x`.
- `backend/Dockerfile` installs dependencies in the `dependencies` stage:
  `npm ci`, whose `@prisma/engines` postinstall fetches the engines for the
  build platform, followed by `scripts/verify-prisma-engines.sh`. The
  `builder` stage runs `prisma generate` twice, once for the SQLite client and
  once for the PostgreSQL client. Each run needs a query engine for every
  listed target.
- On the amd64 build host, `npx prisma version` reports
  `linux-musl-openssl-3.0.x` inside the build container. The default-network
  builds recorded in `2026-11-02-harden-upgrade-path` passed the dependency
  stage, then failed downloading the ARM64 query engine checksum in
  `prisma generate`.
- Homebase builds both images with `--platform linux/amd64` and runs them on
  amd64.

## Decision

Delete the ARM64 entry and nothing else:

```prisma
binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
```

The Dockerfile, the verification script and the entrypoint stay as they are.

## Alternatives

- `binaryTargets = ["native"]`, Prisma's default. It would also stop the amd64
  download an ARM64 build makes, but nothing here builds for ARM64 and the
  amd64 result is identical. Not taken, to limit the change to the entry that
  causes the failure.
- Keep the entry and always build with host networking. This is the current
  workaround. Plain `docker build` and the E2E Compose file do not use host
  networking, so every build needs a manual retry.
- Vendor the ARM64 engine. Adds binaries for a platform that is not used.

## Risks

- ARM64 builds lose the explicit target. They still get their own engine
  through `native`, and an ARM64 build would still download the explicit amd64
  engine. No ARM64 build is run in this change.
- If Prisma's binary host is unreachable, the build still fails in the
  existing verification step. That is intended.
