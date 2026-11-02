## ADDED Requirements

### Requirement: Backend images SHALL contain the Prisma engines needed at startup

The backend Docker build SHALL verify, after installing dependencies, that the
Prisma schema engine for the image's platform is present and executable, and
SHALL fail otherwise. Containers MUST NOT download or write Prisma engines when
they start.

#### Scenario: Engine download fails during the build

- **WHEN** the schema engine is missing after `npm ci` and cannot be downloaded
- **THEN** the backend image build fails with a message about Prisma's binary
  downloads, and no image is produced

#### Scenario: Fresh container start

- **WHEN** a built backend image starts as UID 1001 with an empty SQLite
  directory owned by UID 1001 and the default `RUN_MIGRATIONS`
- **THEN** all migrations apply, `/health` returns 200, and the container's
  file changes include nothing under `/app/node_modules`
