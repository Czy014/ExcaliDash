---
title: Upgrading Excalidraw
description: A checklist for upgrading the official Excalidraw engine in ExcaliDash.
---

# Upgrading Excalidraw

Keep the official `@excalidraw/excalidraw` engine. Use this checklist when
upgrading it; application releases and deployment remain separate steps.

## Prepare the upgrade

- [ ] Create a new branch. Use Node.js 24.22.1 and npm 10.9.2 for all checks,
      including container test runners. Verify both versions: a Node image
      can bundle a different npm version.
- [ ] Read the engine's release notes for API, asset layout and scene-format
      changes.
- [ ] Update `@excalidraw/excalidraw` in `frontend/package.json` and its
      lockfile together. Keep the existing dependency overrides under review.

## Review the integration

Check these engine imports for API changes (paths are under `frontend/src/`):

- `pages/editor/EditorView.tsx`
- `pages/editor/HistoryPreviewCanvas.tsx`
- `pages/editor/useEditorPersistence.ts`
- `pages/editor/useEditorGridStep.ts`
- `pages/editor/useEditorCanvasHandlers.ts`
- `components/drawing-card/useDrawingPreview.ts`
- `utils/importHelpers.ts`
- the engine CSS import in `main.tsx`

Also check the asset and browser assumptions:

- [ ] `frontend/scripts/copy-excalidraw-assets.mjs` still copies the engine's
      fonts into the expected public and build directories.
- [ ] `frontend/src/bootstrap/excalidrawAssetPath.ts` sets
      `window.EXCALIDRAW_ASSET_PATH` before loading the engine, for both `/`
      and `/draw/` builds. Keep `/api/` at the origin root.
- [ ] Local fonts load successfully. Without CSP there must be no `esm.sh`
      fallback request. With the template CSP, Chromium may report blocked
      fallback events, but those events must have no response.
- [ ] Review the known glyph-subsetting worker fallback and `eval` behavior
      in `e2e/tests/base-path.spec.ts`. Its exceptions are specific to engine
      resources; do not allow unrelated errors or add `unsafe-eval` to make an
      upgrade pass.

## Run the checks

Use isolated test databases and uploads. Run the unit tests and normal checks:

```bash
npm --prefix frontend run test:unit
npm run test:integration
npm run check
npm --prefix e2e run check
npm run build
EXCALIDASH_BASE_PATH=/draw/ npm --prefix frontend run build
npm run docs:build
```

- [ ] Inspect root and `/draw/` HTML, assets, fonts and favicon paths. Built
      HTML must contain no inline script.
- [ ] Run the relevant editor, history, import/export and personal-editing
      Playwright suites against a local instance.
- [ ] Run the base-path scenario at root against the development server
      without `CSP_TEMPLATE_PATH`:

```bash
npm --prefix e2e test -- tests/base-path.spec.ts tests/theme-toggle.spec.ts tests/dashboard-workflows.spec.ts tests/drawing-crud.spec.ts tests/search-and-sort.spec.ts
```

- [ ] Run the base-path scenario against root and `/draw/` production images
      with the template CSP. From `e2e/`, using a runner with the required
      Node/npm versions:

```bash
docker compose -f docker-compose.e2e.yml run --rm --build playwright \
  npx playwright test tests/base-path.spec.ts --reporter=list --retries=0
docker compose -f docker-compose.e2e.yml down -v

docker compose -f docker-compose.e2e.yml -f docker-compose.base-path.yml \
  up --build --abort-on-container-exit --exit-code-from playwright
docker compose -f docker-compose.e2e.yml -f docker-compose.base-path.yml down -v
```

The full commands and interpretation of CSP reports are recorded in
`openspec/changes/archive/2026-11-02-support-native-base-path/tasks.md`.
Record actual response headers separately from the policy injected by the
test. The historical `RUN_MIGRATIONS=false` workaround in that record must not
replace a fresh backend startup check: the built image must contain its
Prisma schema engine and complete migrations without writing `node_modules`.
Remove temporary containers, networks and test data after each run.

## Check representative scenes and publish

- [ ] Export representative drawings from the production app as a read-only
      action, then import the copies into an isolated local instance. Never
      point automated tests at production data or make production edits for
      this check.
- [ ] Open those drawings and their history locally. Check images, text,
      previews, import/export and save conflicts across two tabs.
- [ ] Record the engine version, exact source commit, checks and unresolved
      issues. Give the deployment manager the reviewed commit so it can build
      both images from that source, with the intended base path. Deployment
      and merging `main` require their own authorization.
