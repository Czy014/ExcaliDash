import type { DrawingDraft } from "./draftStorage";

type Props = {
  conflict: boolean;
  resolving: boolean;
  storageError: boolean;
  drafts: DrawingDraft[];
  onLoadLatest: () => void;
  onSaveCopy: () => void;
  onRecoverDraft: (draft: DrawingDraft) => void;
  onDismissDrafts: () => void;
  onExport: () => void;
};

export const PersonalEditingNotice = ({
  conflict,
  resolving,
  storageError,
  drafts,
  onLoadLatest,
  onSaveCopy,
  onRecoverDraft,
  onDismissDrafts,
  onExport,
}: Props) => {
  if (!conflict && !storageError && drafts.length === 0 && !resolving)
    return null;
  return (
    <aside
      className="fixed bottom-4 left-4 right-4 z-30 mx-auto max-w-2xl rounded-lg border border-amber-300 bg-white p-4 text-sm text-neutral-900 shadow-lg dark:bg-neutral-900 dark:text-white"
      aria-label="Local changes"
      aria-busy={resolving}
    >
      {conflict ? (
        <div role="alert">
          <p className="font-semibold">Save conflict — unsaved changes</p>
          <p>
            Another page saved this drawing. Your canvas is kept here; saving to
            the original is paused.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              className="ui-button-secondary px-3"
              disabled={resolving}
              onClick={onLoadLatest}
            >
              Load latest version
            </button>
            <button
              className="ui-button-secondary px-3"
              disabled={resolving}
              onClick={onSaveCopy}
            >
              Save as copy
            </button>
          </div>
        </div>
      ) : null}
      {storageError ? (
        <p role="alert" className="mt-2">
          Local draft protection is unavailable. Server saving can still be
          tried; export a copy before leaving if changes are unsaved.
        </p>
      ) : null}
      {drafts.length > 0 ? (
        <div className="mt-2">
          <p>
            Unsaved local drafts are available. Recovery keeps other pages'
            drafts and does not save to the server.
          </p>
          <ul className="mt-2 max-h-36 overflow-auto">
            {drafts.map((draft) => (
              <li key={draft.pageId}>
                <button
                  className="ui-button-secondary my-1 px-3"
                  disabled={resolving}
                  onClick={() => onRecoverDraft(draft)}
                >
                  Recover draft · {new Date(draft.updatedAt).toLocaleString()}
                </button>
              </li>
            ))}
          </ul>
          <button
            className="ui-button-secondary px-3"
            disabled={resolving}
            onClick={onDismissDrafts}
          >
            Keep current scene
          </button>
        </div>
      ) : null}
      <button
        className="ui-button-secondary mt-2 px-3"
        disabled={resolving}
        onClick={onExport}
      >
        Export local drawing
      </button>
      {resolving ? (
        <p role="status">Working… the canvas is temporarily read-only.</p>
      ) : null}
    </aside>
  );
};
