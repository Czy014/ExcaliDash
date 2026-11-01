# Design

## Current implementation

Inspected at `6418f6f`:

- `frontend/vite.config.ts` sets no `base`. The `build` script in
  `frontend/package.json` is
  `tsc -b && vite build && node scripts/copy-excalidraw-assets.mjs --dist`, so
  `npm run build -- --base=/draw/` passes the flag to the copy script, not to
  Vite.
- `frontend/Dockerfile` passes only `VITE_APP_BUILD_LABEL` into the builder
  stage.
- `frontend/src/App.tsx` mounts `BrowserRouter` without `basename`. The routes
  are `/`, `/collections`, `/settings`, `/editor/:id` and `*` (redirect to `/`).
  Dashboard, Editor and Settings are lazy chunks.
- `frontend/index.html` links `/favicon.svg` and sets
  `window.EXCALIDRAW_ASSET_PATH` from `%BASE_URL%` in an inline script that runs
  before the module entry.
- `frontend/src/main.tsx` statically imports `App`. The chain
  `App` → `context/UploadContext` → `utils/importUtils` → `utils/importHelpers`
  statically imports `exportToSvg` from `@excalidraw/excalidraw` 0.18.1, so the
  engine module evaluates inside the entry module graph.
- In 0.18.1, `ExcalidrawFontFace.createUrls` reads `window.EXCALIDRAW_ASSET_PATH`
  when the lazy `Fonts.registered` getter first runs, and always appends
  `https://esm.sh/@excalidraw/excalidraw@<version>/dist/prod/` as a second
  `src` entry of every `FontFace`. The resulting URLs are cached.
- Chromium loads only the first `src` entry when it succeeds; it fetches a later
  entry only after an earlier one fails. Under `font-src 'self' data:` it also
  reports a CSP violation for every cross-origin entry when a `FontFace` is
  constructed, and exposes it as a request that fails as blocked by CSP;
  nothing is sent. An isolated experiment with five faces confirmed this:
  without CSP there were no fallback requests; with the policy there were five
  violations, five blocked request events and no fallback hits on the server.
  The implementation's base-path run showed the same pattern: local
  `/fonts/...` returned 200, and 924 esm.sh request events (about 230 faces per
  page load) were all blocked by CSP.
- The engine's glyph subsetting (`subset-shared.chunk-*.js`, built from
  `dist/prod/chunk-EIO257PC.js`) calls `new Function`. Under
  `script-src 'self'` this raises an `eval` violation; the engine catches the
  `EvalError`, logs "Skipped glyph subsetting" and embeds the font without
  subsetting. The dashboard's `exportToSvg` text previews trigger it: the root
  production run with the template policy reported four such violations. It
  is independent of the base path and does not occur where the policy does not
  apply.
- `frontend/src/context/ThemeContext.tsx` sets the favicon to
  `/favicon-dark.svg` or `/favicon-light.svg`.
- `frontend/scripts/copy-excalidraw-assets.mjs` copies the engine fonts to
  `dist/fonts` (and `public/fonts` for development).
- `frontend/nginx.conf.template` serves the build at `/` with
  `try_files $uri $uri/ /index.html` and declares `script-src 'self'` at server
  level. `location = /index.html` and the static-asset location define their
  own `add_header`, so HTML and asset responses carry no CSP. With the
  `single-user-6418f6f` frontend image, `/`, `/index.html` and `/collections`
  return 200 without `Content-Security-Policy`. The inline script is therefore
  not blocked in current deployments; an isolated page with the same policy
  showed it would be blocked once the policy applies.
- API calls use `VITE_API_URL || "/api"` (`src/api/client.ts`). Stored image
  references are `/api/files/...` (`src/utils/rehydrateFiles.ts`).
- `e2e/playwright.config.ts` uses `BASE_URL` as `baseURL`. Tests call
  `page.goto("/...")`, which resolves against the origin and drops a subpath, so
  setting `BASE_URL` to a subpath does not test it.
- The Node.js on PATH is 24.21.0; `package.json` requires >=24.22.1.

## Target implementation

### 1. Build input

`vite.config.ts` reads `EXCALIDASH_BASE_PATH` (trimmed, default `/`) and sets
Vite's `base`. The value must be an absolute path that starts and ends with
`/`, whose segments are non-empty unreserved URL characters and are not `.` or
`..`. Other values throw during config loading, like the existing `VERSION`
check. `frontend/Dockerfile` declares `ARG EXCALIDASH_BASE_PATH=/` and exports
it in the builder stage before `npm run build`. The production stage and the
nginx template do not change: the container still serves the build at its
root, and a reverse proxy strips the prefix.

Rejected: passing `--base` through `npm run build`, which reaches the copy
script; a runtime prefix, which needs templated HTML or nginx alias handling.

### 2. Routing

`<BrowserRouter basename={import.meta.env.BASE_URL}>`. With React Router 7.18.2,
`useLocation().pathname` is `/collections` for both `/` and `/draw/` basenames,
and `useHref` produces `/collections?id=one` and `/draw/collections?id=one`.
Route definitions, `navigate()` calls, `Navigate` and `Link` targets and
pathname comparisons such as the Dashboard's `pathname === "/collections"`
remain unchanged. `useLibraryImportFromUrl` already replaces history with the
full `window.location.pathname`, which includes the prefix.

### 3. Engine asset path

Delete the inline script. Add `frontend/src/bootstrap/excalidrawAssetPath.ts`:
it keeps a preset non-empty string, otherwise it sets
`window.EXCALIDRAW_ASSET_PATH = new URL(import.meta.env.BASE_URL, window.location.origin).href`.
`main.tsx` imports it as its first import, so ES module evaluation runs it
before `App` and therefore before the engine module. The engine additionally
creates font URLs only on the first `Fonts.registered` access at runtime. The
module is a same-origin script and needs no CSP change.

Rejected: keeping the inline script, which needs `unsafe-inline` or a hash once
the policy applies; setting the path in `App` or just before render, which runs
after the engine module evaluates and relies on its lazy font registration.

The engine's esm.sh fallback stays. Removing it would mean patching the
official engine's distribution, and it would only silence the CSP reports:
with local fonts available, no request reaches esm.sh. Adding esm.sh to
`font-src` would loosen the policy and is also rejected.

The glyph-subsetting `eval` reports also stay. Adding `'unsafe-eval'` would
loosen the policy, patching the engine is out of scope, and the engine's
`skipInliningFonts` option would change how SVG exports embed fonts. Making
glyph subsetting CSP-compatible is left to a separate change.

### 4. Favicons and fonts

The built `index.html` links `<base>favicon.svg`, through Vite's base-aware HTML
handling or `%BASE_URL%`. `ThemeContext` uses `import.meta.env.BASE_URL` with
`favicon-dark.svg` and `favicon-light.svg`. The copy script keeps copying fonts
to `dist/fonts`; only its comment, which says the path is set to `/` in
`index.html`, changes. The UI font in `src/index.css` is a relative URL that
Vite already resolves under `base`.

### 5. Verification

- `e2e/tests/helpers/paths.ts` provides `appUrl(path)`, which resolves an
  application path against the full `BASE_URL`, including its path.
- `e2e/tests/base-path.spec.ts` seeds data through the existing API helpers and
  checks the dashboard; a collection opened by sidebar click and by
  `collections?id=`; Unorganized and Trash; a reload on each deep link;
  Settings; an editor containing a text element; lazy chunk loads; font
  requests under `<base>fonts/` that return 200; the favicon before and after a
  theme switch; no same-origin request outside `<base>` other than `/api/`; and
  no console error or failed request. Before each navigation it waits for
  in-flight requests, so requests cancelled by its own navigation are not
  counted as failures.
- The spec enforces the CSP only when `CSP_TEMPLATE_PATH` is set. It then
  applies the policy from that template to document responses through
  Playwright request interception and also checks:
  - no `script-src` violation for inline or external script;
  - no other CSP violation except `font-src` reports for the esm.sh fallback
    and `eval` reports whose source is the engine's `subset-shared.chunk-*.js`;
  - every request event for the fallback fails as blocked by CSP without a
    response.

  Without the policy it checks that no request for the fallback occurs at all.

- Production-image runs enforce the policy: the Playwright service in
  `e2e/docker-compose.e2e.yml` mounts the template and sets
  `CSP_TEMPLATE_PATH`. Development runs leave it unset, because Vite's
  development server injects inline scripts (the React Refresh preamble) that
  the policy blocks; production builds contain no inline script.
- Root: run the spec and the related existing suites against the Vite
  development server, then run the spec against the root production images
  from `e2e/docker-compose.e2e.yml`.
- Subpath: `e2e/docker-compose.base-path.yml` extends
  `docker-compose.e2e.yml`. It builds the production frontend image with
  `EXCALIDASH_BASE_PATH=/draw/` and adds a pinned official nginx proxy using
  `e2e/fixtures/base-path-proxy.conf`, which strips `/draw/` before forwarding
  to the frontend and forwards `/api/` to the backend. It adds the proxy origin
  to the backend's `FRONTEND_URL` and runs the spec with
  `BASE_URL=http://proxy:8080/draw/`.
- Record the actual response headers of HTML, assets and fonts for both builds.
- Run all checks with Node.js 24.22.1 and npm 10.9.2, in a container or a local
  installation. The Node.js 24.21.0 on PATH does not satisfy the engines field,
  and checks run on it do not count as validation.

## Risks

- A later bundling change could evaluate the engine before the bootstrap
  module. The base-path spec's font request assertions detect this.
- If a local font file is missing, the browser falls back to esm.sh: blocked
  under the configured CSP, but sent where the policy does not apply (today's
  HTML responses). The spec requires every local font request to return 200.
- A mistyped base path is rejected when the build loads its config.
- A proxy that does not strip the prefix or route `/api/` at the root breaks
  the deployment; `docs/deploy/docker.md` states both requirements.

## Dependency order with Homebase

1. Implement and validate this change on `feat/native-base-path`, archive it,
   merge into `main` only when explicitly instructed, and record the commit.
2. Homebase's `use-native-draw-subpath` change then builds both images from
   that commit, the frontend with `EXCALIDASH_BASE_PATH=/draw/`, and replaces
   its rewriting route. This repository contains no Homebase-specific
   configuration.
