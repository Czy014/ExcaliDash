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
