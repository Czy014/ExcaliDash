# single-user-runtime Specification

## Purpose

Record the credential-free single-user workspace contract, including its fixed data identity, historical data retention, request protection and browser-local preferences.

## Requirements

### Requirement: Single-user runtime SHALL serve the library without credentials

The runtime SHALL use the fixed workspace identity `bootstrap-admin` for drawing, collection, file, history, import/export and settings requests without requiring login cookies, Bearer tokens or API keys. The workspace ID SHALL come directly from a constant without a request-user or multi-user principal adapter. Existing users and authentication fields MUST remain in the database and MUST NOT be automatically deleted at startup or during requests.

#### Scenario: Open the library on a fresh browser

- **WHEN** a browser without authentication cookies or local login state opens the library
- **THEN** it opens directly and requests can read and save the single user's data

#### Scenario: Ignore supplied identities

- **WHEN** a request supplies expired credentials or headers claiming another user's identity
- **THEN** it still uses the fixed workspace and cannot read or modify historical users' drawings

### Requirement: Authentication endpoints and UI SHALL be absent

The backend MUST NOT mount `/auth/*`, OIDC, password-reset, API-key, user-administration or impersonation routes. The frontend MUST NOT provide login, registration, authentication setup, account security, API-key or administrator entries.

#### Scenario: Probe a removed authentication route

- **WHEN** a client requests `/api/auth/status` or submits `/api/auth/login` with a valid CSRF cookie and token
- **THEN** the backend returns its normal not-found response and the frontend has no authentication page or redirect loop

### Requirement: Existing personal drawing protections SHALL remain

The library SHALL retain version conflicts, history snapshots, file storage and CSRF protection. Runtime drawing access SHALL be limited to the fixed workspace owner's drawings. Other historical users' data and sharing records SHALL NOT be automatically merged or exposed. Existing user, permission and link-share database tables SHALL remain.

#### Scenario: Save through the existing API

- **WHEN** a single-user page submits scene changes with its current version
- **THEN** scenes, images, history and version checks behave as before sharing removal, with stale versions still returning conflicts

#### Scenario: Preserve historical sharing data without runtime access

- **WHEN** the database contains other historical users' drawings, permissions or `DrawingLinkShare` rows
- **THEN** startup and requests leave those rows intact but drawing, history and file endpoints return not-found responses

#### Scenario: Retired sharing endpoints are absent

- **WHEN** a client requests sharing settings, creates a link or revokes a link using the retired endpoints with valid CSRF credentials
- **THEN** the backend returns its normal not-found response without changing sharing records

### Requirement: Preferences SHALL remain local to the browser

The frontend SHALL store theme, sort and editor preferences in the existing localStorage without calling account preference endpoints or clearing supported preferences because sharing or localization was removed. Obsolete language fields SHALL be ignored.

#### Scenario: Reload after changing a preference

- **WHEN** a user changes the theme or an editor preference and reloads the page
- **THEN** the preference remains effective and no account preference endpoint is requested

### Requirement: The single-user runtime SHALL not perform release update checks

The frontend and backend MUST NOT call an external release service, expose a
release update endpoint, or render update-check controls or banners. The
runtime SHALL retain local application version and build-label metadata for
identification.

#### Scenario: Open Settings without outbound release checks

- **WHEN** a user opens Settings
- **THEN** the Version row remains visible and no update endpoint or external
  release service is requested

#### Scenario: Probe the retired update endpoint

- **WHEN** a client requests `/system/update`
- **THEN** the backend returns its normal not-found response

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
