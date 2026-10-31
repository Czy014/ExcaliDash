# Design

## Current state

`frontend/src/pages/editor/EditorView.tsx` renders the Share button and
`ShareModal`; `Editor.tsx` owns the modal state and `useEditorChrome.ts` keeps
the header visible while the modal is open. `App.tsx` maps `/shared/:id` to the
editor and `useEditorSceneLoader.ts` falls back to that route after a denied
owner load.

The frontend API exposes link-sharing methods in `frontend/src/api/drawings.ts`.
The backend registers `drawingSharingRoutes.ts`, and
`authz/sharing.ts` grants `view` or `edit` access from active
`DrawingLinkShare` rows. Drawing, history and file routes all use that helper.
Link lifetime settings are registered in the backend environment registry.

## Target state

The editor only renders history, export, auto-hide and theme controls;
no Share state, modal, route or API methods remain. `/shared/:id` is removed so
unknown frontend paths return to the library. A denied load is shown as an
error instead of being rewritten to a sharing route.

Drawing, history and file routes scope database reads to `WORKSPACE_USER_ID`.
The `view` and `edit` grant states and the sharing authorization helper are
removed; successful drawing reads continue to report `owner`. Existing save
queues, version guards, drafts, image handling and history transactions remain.
The link-sharing route module, token generation and TTL configuration are
removed. Existing Prisma models and migrations are retained and no cleanup
query runs.

## English interface and maintenance language

The previous language selector changed only sidebar strings and the embedded
editor, leaving Settings and other screens in English. Remove the partial
translation provider, dictionaries and language selectors. The library uses
English literals and both live and history canvases use `langCode="en"`.
Obsolete stored language preferences are ignored while theme, sort and editor
preferences keep their existing storage keys. User-created names and scene text
are not translated or modified.

Translate README, AGENTS, OpenSpec configuration, the specification index and
current specifications into English. New change artifacts use English;
historical change archives retain their original text.

## Affected callers and checks

- Frontend editor props, auto-hide hook, router, scene loader, API exports and
  sharing components/tests.
- Backend drawing route registration/context, drawing/read/list, history and
  file ownership checks, environment registry and example.
- Integration tests that create link shares are removed or rewritten to cover
  owner-only file access and 404s for retired sharing endpoints.
- Current documentation and screenshots no longer describe public links.

## Compatibility boundary

The database schema is intentionally unchanged. Existing link rows remain
available to future data migration tooling, but the application does not read
them for authorization and no longer exposes link management endpoints.
