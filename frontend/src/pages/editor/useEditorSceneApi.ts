import { useCallback, useLayoutEffect, useRef } from "react";
import type { MutableRefObject } from "react";

type UseEditorSceneApiParams = {
  canEdit: boolean;
  excalidrawAPIRef: MutableRefObject<any>;
  isSyncing: MutableRefObject<boolean>;
  latestFilesRef: MutableRefObject<any>;
  recordLocalChanges: (
    elements: readonly any[],
    files?: Record<string, any>,
  ) => void;
  scanFileUploads: () => void;
  setIsReady: (ready: boolean) => void;
};

/** Register the canvas API and observe files inserted without onChange. */
export const useEditorSceneApi = ({
  canEdit,
  excalidrawAPIRef,
  isSyncing,
  latestFilesRef,
  recordLocalChanges,
  scanFileUploads,
  setIsReady,
}: UseEditorSceneApiParams) => {
  const patchedAddFilesApisRef = useRef<WeakSet<object>>(new WeakSet());
  const canEditRef = useRef(canEdit);
  useLayoutEffect(() => {
    canEditRef.current = canEdit;
  }, [canEdit]);

  const setExcalidrawAPI = useCallback(
    (api: any) => {
      excalidrawAPIRef.current = api;
      if (import.meta.env.DEV) {
        (window as any).__EXCALIDASH_EXCALIDRAW_API__ = api;
      }
      if (
        api &&
        typeof api.addFiles === "function" &&
        !patchedAddFilesApisRef.current.has(api as object)
      ) {
        patchedAddFilesApisRef.current.add(api as object);
        const originalAddFiles = api.addFiles.bind(api);
        api.addFiles = (filesInput: Record<string, any> | any[]) => {
          const normalizedFiles = Array.isArray(filesInput)
            ? filesInput
            : Object.values(filesInput || {});
          originalAddFiles(normalizedFiles);
          if (!canEditRef.current || isSyncing.current) return;
          const nextFiles = api.getFiles?.() || {};
          latestFilesRef.current = nextFiles;
          recordLocalChanges(api.getSceneElementsIncludingDeleted(), nextFiles);
          // Upload any freshly inserted image right away so the debounced save
          // 1s later can ship a ref instead of inline bytes.
          void scanFileUploads();
        };
      }
      setIsReady(true);
    },
    [
      recordLocalChanges,
      excalidrawAPIRef,
      isSyncing,
      latestFilesRef,
      scanFileUploads,
      setIsReady,
    ],
  );

  return { setExcalidrawAPI };
};
