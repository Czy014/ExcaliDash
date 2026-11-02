# Design

## Current implementation

Inspected on `chore/upgrade-path`, based on `feat/native-base-path` at
`1ff635e`:

- `backend/Dockerfile` has four stages. `dependencies` runs `npm ci`, and the
  `@prisma/engines` postinstall downloads the schema engine and the query
  engine library for the build platform. `builder` runs `prisma generate` for
  SQLite and PostgreSQL and keeps both clients in `/app/prisma_clients`.
  `production-dependencies` prunes development dependencies. The final stage
  copies `node_modules` without `--chown`, so it is owned by root, and runs as
  `nodejs` (UID 1001).
- `backend/docker-entrypoint.sh` runs
  `node /app/node_modules/prisma/build/index.js migrate deploy` as `nodejs`
  when `RUN_MIGRATIONS` is true (the default). That command needs
  `node_modules/@prisma/engines/schema-engine-<target>`.
- A good image (`homebase/excalidash-backend:single-user-f422ea6`) contains
  `schema-engine-linux-musl-openssl-3.0.x` and
  `libquery_engine-linux-musl-openssl-3.0.x.so.node`, both owned by root.
- When the postinstall download fails, `npm ci` still succeeds and the image
  lacks the schema engine. At startup Prisma tries to download it into the
  root-owned directory and fails, so the container never becomes healthy.
  Recorded twice: the Homebase personal-editing integration (download timeout;
  the engine was copied in from the official 0.6.6 image) and the
  `support-native-base-path` E2E run (fresh container could not write to
  `/app/node_modules/@prisma/engines`; validation used `RUN_MIGRATIONS=false`
  and a prepared database instead).
- `prisma` and `@prisma/client` are both production dependencies at 5.22.0, so
  pruning keeps `@prisma/engines`.
- The upgrade knowledge for the engine is spread over
  `frontend/scripts/copy-excalidraw-assets.mjs`, the `base-path` specification,
  the archived `support-native-base-path` change and Homebase's Draw release
  records. `docs/develop/` contains only `index.md` (local development).

## Target implementation

### 1. Verify Prisma engines during the build

In the `dependencies` stage, right after `npm ci`, run a small script,
`backend/scripts/verify-prisma-engines.sh`. It runs `npx prisma version`; the
CLI downloads any engine that the postinstall step did not fetch and exits
non-zero if it cannot. The script then requires an executable
`node_modules/@prisma/engines/schema-engine-*` for the platform Prisma reports;
otherwise it fails with a message that the build needs access to Prisma's
binary downloads. The later stages inherit the verified directory. Keeping the
check in a script lets it be tested outside the Dockerfile.

Startup stays as it is. With the engine present, `migrate deploy` neither
downloads nor writes under `node_modules`.

Rejected:

- Making `node_modules` writable for `nodejs`: it would hide a broken image and
  let containers download code at runtime.
- Vendoring engine binaries in the repository: adds large platform-specific
  files that must track the Prisma version.

### 2. Engine upgrade guide

Add `docs/develop/upgrading-excalidraw.md` and a "Upgrading Excalidraw" entry
under Develop in `docs/.vitepress/config.ts`. The guide is a checklist:

1. Use Node.js 24.22.1 and npm 10.9.2, preferably in a container, on a new
   branch.
2. Read the engine's release notes for API, asset layout and scene-format
   changes, then update `@excalidraw/excalidraw` in `frontend/package.json`
   and its lockfile.
3. Review the files that import the engine: `pages/editor/EditorView.tsx`,
   `pages/editor/HistoryPreviewCanvas.tsx`,
   `pages/editor/useEditorPersistence.ts`, `pages/editor/useEditorGridStep.ts`,
   `pages/editor/useEditorCanvasHandlers.ts`,
   `components/drawing-card/useDrawingPreview.ts`, `utils/importHelpers.ts` and
   the CSS import in `main.tsx`.
4. Check engine assumptions:
   - the fonts directory copied by `scripts/copy-excalidraw-assets.mjs`;
   - `window.EXCALIDRAW_ASSET_PATH` handling and the esm.sh font fallback;
   - the glyph-subsetting worker and `eval` behavior that the base-path test
     allows.
5. Run unit tests, `npm run check`, `npm run build`, a `/draw/` frontend build,
   the related Playwright suites, and the base-path scenario against root and
   `/draw/` production images. Use the commands from the
   `support-native-base-path` validation.
6. Open representative drawings and their history in a local instance. Export
   them from the production app (a read-only action) and import them locally;
   never point tests at production data.
7. Record the engine version and source commit, then let the deployment
   manager build both images from that commit.

## Risks

- The verification makes builds fail where Prisma's binary host is
  unreachable. That is intended: a failed build replaces a broken image. Retry
  with network access, for example host networking.
- The schema engine file name depends on the platform. The check uses the
  target Prisma reports instead of a hard-coded name.
- The guide can go stale. It points to the base-path test and existing
  commands rather than repeating their details.
