# Support native base path

## Why

ExcaliDash builds assume the site root. Serving the application under a path
such as `/draw/` currently needs a reverse proxy that rewrites HTML, JavaScript
and CSS bodies and injects a history shim. Those rewrites match minified
strings and must be rechecked on every upgrade. Vite already provides a base
path and React Router a basename, but the frontend uses neither, links its
favicons with root-absolute paths, and sets the engine asset path in an inline
script.

## What Changes

- Add the build-time input `EXCALIDASH_BASE_PATH` (default `/`). The frontend
  Docker build passes it to Vite's standard `base`; invalid values fail the
  build. The base path is an absolute URL path chosen at build time; there is no
  runtime prefix configuration.
- Use `import.meta.env.BASE_URL` as the React Router basename. Application
  paths such as `/collections`, `/settings` and `/editor/:id` stay unchanged.
- Replace the inline `EXCALIDRAW_ASSET_PATH` script in `frontend/index.html`
  with a same-origin module that `frontend/src/main.tsx` imports first, so the
  official fonts load from `<base>fonts/` without inline script.
- Resolve the HTML favicon and the theme favicons under the base path.
- Add a Playwright base-path scenario and a test-only prefix-stripping proxy to
  verify root and subpath production builds under the configured CSP.
- Document the build argument and the reverse-proxy expectations.

## Preserved capabilities

Root deployments keep identical URLs. `VITE_API_URL` keeps its `/api` default,
which stays at the origin root. Backend routes, stored `/api/files/...`
references, the database and migrations, `AUTH_MODE=disabled`, version checks,
drafts, history, images and CSRF protection are unchanged.

## Exclusions

- No runtime base path, API path migration, or rewriting of stored data.
- No change to the nginx security headers. `frontend/nginx.conf.template`
  defines `add_header` in `location = /index.html` and in the static-asset
  location, so those responses do not inherit the server-level headers,
  including the CSP. This existing issue is left unhandled.
- No CSP compatibility work for the engine's glyph subsetting. It calls
  `new Function`, which `script-src 'self'` blocks; the engine then embeds the
  font without subsetting. This also stays unhandled.
- No Homebase, keeper or deployment changes. Homebase builds and routes the
  application in its Draw plugin.

## Capabilities

### New Capabilities

- `base-path`: build-time base path for pages, routes, assets, fonts and
  favicons.

### Modified Capabilities

None.

## Impact

- Frontend: `vite.config.ts`, `Dockerfile`, `index.html`, `src/main.tsx`, a
  new `src/bootstrap/excalidrawAssetPath.ts`, `src/App.tsx`,
  `src/context/ThemeContext.tsx`, and the comment in
  `scripts/copy-excalidraw-assets.mjs`.
- Tests: `e2e/tests/helpers/paths.ts`, `e2e/tests/base-path.spec.ts`, a
  template mount in `e2e/docker-compose.e2e.yml`,
  `e2e/docker-compose.base-path.yml`, `e2e/fixtures/base-path-proxy.conf`.
- Documentation: `docs/deploy/docker.md`.
- Backend: none.
