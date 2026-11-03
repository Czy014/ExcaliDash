## ADDED Requirements

### Requirement: amd64 backend image builds SHALL NOT download ARM64 Prisma engines

The Prisma generator SHALL NOT list an ARM64 engine target. Building the
backend image for Linux amd64 MUST NOT download any ARM64 Prisma engine, and
the generated clients in the image MUST contain query engines only for
`linux-musl-openssl-3.0.x`.

#### Scenario: Build with default Docker networking

- **WHEN** the backend image is built with
  `docker build --platform linux/amd64 -f backend/Dockerfile .` using default
  build networking, and Prisma's binary host is reachable
- **THEN** both `prisma generate` runs complete without downloading an ARM64
  engine and the build succeeds

#### Scenario: Engines in the built image

- **WHEN** the query engine files under `/app/prisma_clients` of the built
  image are listed
- **THEN** each client contains only `linux-musl-openssl-3.0.x` engines
