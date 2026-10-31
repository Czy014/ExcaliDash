import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import debounce from "lodash/debounce";
import { API_URL } from "../../api";
import { rehydrateFilesForExport } from "../../utils/rehydrateFiles";
import { uuidv4 } from "../../utils/uuid";
import { getPersistedAppState, getRequiredSceneFiles } from "./shared";
import {
  clearConfirmedDraft,
  listDrafts,
  writeDraft,
  type DrawingDraft,
} from "./draftStorage";

type DraftRefs = {
  currentDrawingVersion: MutableRefObject<number | null>;
  latestElements: MutableRefObject<readonly any[]>;
  latestAppState: MutableRefObject<any>;
  latestFiles: MutableRefObject<Record<string, any>>;
};

export const useEditorDrafts = ({
  drawingId,
  account,
  refs,
}: {
  drawingId?: string;
  account: string;
  refs: DraftRefs;
}) => {
  // A copied tab inherits sessionStorage, so each mounted editor needs a fresh ID.
  const [pageId] = useState(uuidv4);
  const scope = useMemo(
    () => ({
      service: new URL(API_URL, window.location.href).href,
      account,
      drawingId: drawingId ?? "",
      pageId,
    }),
    [account, drawingId, pageId],
  );
  const revision = useRef(0);
  const confirmedRevision = useRef(0);
  const queue = useRef(Promise.resolve());
  const [drafts, setDrafts] = useState<DrawingDraft[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listDrafts(scope)
      .then((found) => {
        if (!cancelled) setDrafts(found.filter((d) => d.pageId !== pageId));
      })
      .catch(() => {
        if (!cancelled) setStorageError(true);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [pageId, scope]);

  const persist = useCallback(() => {
    if (!drawingId || revision.current <= confirmedRevision.current) return;
    let draft: DrawingDraft;
    try {
      const files = getRequiredSceneFiles(
        refs.latestElements.current,
        refs.latestFiles.current,
      );
      draft = structuredClone({
        ...scope,
        formatVersion: 1,
        baseVersion: refs.currentDrawingVersion.current,
        revision: revision.current,
        updatedAt: Date.now(),
        elements: Array.from(refs.latestElements.current),
        appState: getPersistedAppState(refs.latestAppState.current),
        files,
      });
    } catch {
      setStorageError(true);
      return;
    }
    queue.current = queue.current.then(async () => {
      if (draft.revision <= confirmedRevision.current) return;
      try {
        for (const file of Object.values(draft.files)) {
          if (file.dataURL.startsWith("blob:")) {
            const response = await fetch(file.dataURL);
            if (!response.ok) throw new Error("Image bytes are unavailable");
            const blob = await response.blob();
            file.dataURL = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = () => reject(reader.error);
              reader.readAsDataURL(blob);
            });
          }
        }
        draft.files = await rehydrateFilesForExport(draft.files, drawingId);
        if (draft.revision <= confirmedRevision.current) return;
        await writeDraft(draft);
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
    });
  }, [drawingId, refs, scope]);

  const scheduledPersist = useMemo(() => debounce(persist, 150), [persist]);
  const capture = useCallback(() => {
    revision.current += 1;
    scheduledPersist();
  }, [scheduledPersist]);

  const acknowledge = useCallback(
    (savedRevision: number) => {
      confirmedRevision.current = Math.max(
        confirmedRevision.current,
        savedRevision,
      );
      queue.current = queue.current.then(async () => {
        try {
          await clearConfirmedDraft(scope, savedRevision);
        } catch {
          setStorageError(true);
        }
      });
      return queue.current;
    },
    [scope],
  );
  const flush = useCallback(() => {
    scheduledPersist.flush();
    return queue.current;
  }, [scheduledPersist]);

  useEffect(() => {
    return () => {
      scheduledPersist.flush();
    };
  }, [scheduledPersist]);

  return {
    revision,
    drafts,
    ready,
    storageError,
    capture,
    acknowledge,
    flush,
    dismiss: () => setDrafts([]),
  };
};
