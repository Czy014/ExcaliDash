# base-path Specification

## Purpose

Let the frontend be served at the site root or under a path prefix chosen at
build time, without a reverse proxy rewriting response bodies.

## Requirements

### Requirement: Frontend builds SHALL accept a build-time base path

The frontend build SHALL read the absolute base path from
`EXCALIDASH_BASE_PATH`, default `/`, and use it as Vite's `base`. The frontend
Docker build SHALL accept the same build argument. A value that does not start
and end with `/`, or contains an empty, `.` or `..` segment, MUST fail the
build. The API base MUST remain `VITE_API_URL`, default `/api`.

#### Scenario: Default build

- **WHEN** the frontend is built without `EXCALIDASH_BASE_PATH`
- **THEN** the built `index.html` references `/assets/` and `/favicon.svg`, as
  before

#### Scenario: Subpath build

- **WHEN** the frontend is built with `EXCALIDASH_BASE_PATH=/draw/`
- **THEN** the built `index.html` references `/draw/assets/` and
  `/draw/favicon.svg`, and API requests still go to `/api/`

#### Scenario: Invalid base path

- **WHEN** `EXCALIDASH_BASE_PATH` is `draw`, `/draw`, `/a/../b/` or an absolute
  URL
- **THEN** the build fails before producing output

### Requirement: The application SHALL work under its base path

Routes, collection views, deep links, Settings, the editor, lazy chunks,
official fonts and favicons SHALL resolve under the base path. Application
paths SHALL stay independent of the base path. Apart from the API, the
application MUST NOT request same-origin URLs outside the base path.

#### Scenario: Open a collection under a subpath

- **WHEN** a `/draw/` build is served behind a proxy that strips `/draw/`, and
  the user selects a collection in the sidebar or opens
  `/draw/collections?id=<id>`
- **THEN** the address is `/draw/collections?id=<id>`, the view title is the
  collection name, and a reload shows the same view

#### Scenario: Deep links and special views

- **WHEN** the user opens or reloads `/draw/settings`, `/draw/editor/<id>`,
  `/draw/collections?id=unorganized` or `/draw/collections?id=trash`
- **THEN** each page loads, and Unorganized and Trash show their view titles

#### Scenario: Fonts and favicons

- **WHEN** the editor renders a text element and the theme switches
- **THEN** font files load from `/draw/fonts/` with status 200, no font request
  to the engine's CDN fallback is sent over the network, and the favicon
  resolves to `/draw/favicon-light.svg` or `/draw/favicon-dark.svg`

#### Scenario: Root deployment

- **WHEN** the default build is served at `/`
- **THEN** the same checks pass with root paths

### Requirement: Engine asset initialization SHALL not use inline script

The application SHALL set `window.EXCALIDRAW_ASSET_PATH` from the base path in a
same-origin module that runs before any module importing the engine, and SHALL
keep a preset non-empty value. The built `index.html` MUST NOT contain inline
script.

#### Scenario: Configured CSP is enforced

- **WHEN** a production build is served and the policy from
  `frontend/nginx.conf.template`, including `script-src 'self'`, applies to the
  document
- **THEN** the application loads with no `script-src` violation for inline or
  external script, the engine builds font URLs from the base path, and the
  only violations are `font-src` reports for the engine's built-in CDN
  fallback URLs, whose requests are blocked without a response, and
  `script-src` `eval` reports from the engine's glyph subsetting, after which
  the engine skips subsetting
