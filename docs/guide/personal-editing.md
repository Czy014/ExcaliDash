# Personal editing

ExcaliDash keeps the drawing library and Excalidraw editor. Each page edits its own scene over HTTP; there are no live collaborators, shared cursors or scene broadcasts.

## Saving in multiple pages

You can open a drawing in more than one tab. Each save includes the version that page loaded. If another page saves first, the stale page stops saving to the original and shows **Save conflict — unsaved changes**. It keeps your canvas and local draft instead of automatically merging or overwriting.

- **Load latest version** asks you to discard this page's changes. The canvas is replaced only after the latest scene and its images have been read successfully.
- **Save as copy** creates a new, unorganized drawing from this page's complete scene, including images and canvas settings. The original stays as saved by the other page. The copy owns its image references.
- **Export local drawing** downloads a portable `.excalidraw` file. This remains available when saving or creating a copy fails.

The canvas is temporarily read-only during conflict resolution. A failed operation keeps your scene and draft. Autosave, manual save, navigation, pending queues and unload saves all respect the same conflict pause. Unknown scene versions cannot be saved.

## Local drafts

As you edit, drafts are stored in this browser's IndexedDB, including image bytes that have not reached the server. Drafts are isolated by service address, account, drawing and page instance. Duplicating a tab creates a separate draft identity. Saving to the server only removes this page's confirmed edits; newer edits and other pages' drafts remain.

Reopen a drawing and choose **Recover draft** to load an available local draft. Recovery does not automatically save it to the server. A draft based on an older version enters conflict resolution. **Keep current scene** hides the recovery offer for this visit without deleting those drafts.

If local storage is unavailable or full, the editor shows that local draft protection is unavailable. You can still try normal versioned server saves or export before leaving. Local protection covers transactions that finished successfully; clearing browser data, changing browsers and abrupt shutdown before a transaction completes can lose local changes. Drafts are not synchronized between devices. On a shared browser, clearing site data also clears local drafts.

## Returning to a clean page

A page with no unsaved edits, queued saves, conflicts or recovery offers checks the server when it regains focus or becomes visible. It applies the newer scene only if the page remains clean throughout that request. A failed read leaves the current canvas intact. Pages with local edits keep them and use normal version checks when saving again.

## Scope of this fork

The drawing library, collections, trash, images, assets, import/export and history remain. The library and editor use English. All visitors use a single workspace identity without sign-in; see [single-user access](/guide/authentication). Public drawing links and sharing controls are removed.
