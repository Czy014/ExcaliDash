import { useCallback } from "react";
import type { MutableRefObject } from "react";
import { getFilesDelta } from "./shared";

type UseEditorLocalChangesParams = {
  drawingId: string | undefined;
  excalidrawAPI: MutableRefObject<any>;
  lastLocalChangeAtRef: MutableRefObject<number>;
  lastSyncedElementOrderSigRef: MutableRefObject<string>;
  lastSyncedFilesRef: MutableRefObject<Record<string, any>>;
  latestAppStateRef: MutableRefObject<any>;
  latestFilesRef: MutableRefObject<any>;
  latestElementsRef: MutableRefObject<readonly any[]>;
  debouncedSave: (
    drawingId: string,
    elements: readonly any[],
    appState: any,
    files?: Record<string, any>,
  ) => void;
  debouncedSavePreview: (drawingId: string) => void;
  computeElementOrderSig: (elements: readonly any[]) => string;
  hasElementChanged: (element: any) => boolean;
  normalizeImageElementStatus: (
    elements?: readonly any[],
    files?: Record<string, any> | null,
  ) => readonly any[];
  recordElementVersion: (element: any) => void;
  setHasSceneChangesSinceLoad: () => void;
};

export const useEditorLocalChanges = ({
  drawingId,
  excalidrawAPI,
  lastLocalChangeAtRef,
  lastSyncedElementOrderSigRef,
  lastSyncedFilesRef,
  latestAppStateRef,
  latestFilesRef,
  latestElementsRef,
  debouncedSave,
  debouncedSavePreview,
  computeElementOrderSig,
  hasElementChanged,
  normalizeImageElementStatus,
  recordElementVersion,
  setHasSceneChangesSinceLoad,
}: UseEditorLocalChangesParams) => {
  const recordLocalChanges = useCallback(
    (
      elements: readonly any[],
      currentFiles?: Record<string, any>,
      appStateChanged = false,
    ) => {
      if (!drawingId) return;
      const changes: any[] = [];
      const nextFiles = currentFiles || excalidrawAPI.current?.getFiles() || {};
      const normalizedElements = normalizeImageElementStatus(
        elements,
        nextFiles,
      );
      const nextOrderSig = computeElementOrderSig(normalizedElements);
      const shouldSyncOrder =
        nextOrderSig !== lastSyncedElementOrderSigRef.current;
      if (shouldSyncOrder) {
        lastSyncedElementOrderSigRef.current = nextOrderSig;
      }
      normalizedElements.forEach((el) => {
        if (hasElementChanged(el)) {
          changes.push(el);
          recordElementVersion(el);
        }
      });
      const filesDelta = getFilesDelta(lastSyncedFilesRef.current, nextFiles);
      const shouldSyncFiles = Object.keys(filesDelta).length > 0;
      if (Object.keys(nextFiles || {}).length > 0) {
        latestFilesRef.current = nextFiles;
      }
      if (shouldSyncFiles) {
        lastSyncedFilesRef.current = nextFiles;
      }
      const appState = latestAppStateRef.current;
      if (
        changes.length > 0 ||
        shouldSyncFiles ||
        shouldSyncOrder ||
        appStateChanged
      ) {
        latestElementsRef.current = normalizedElements;
        setHasSceneChangesSinceLoad();
        lastLocalChangeAtRef.current = new Date().getTime();
        if (appState) {
          debouncedSave(drawingId, normalizedElements, appState, nextFiles);
          debouncedSavePreview(drawingId);
        }
      }
    },
    [
      computeElementOrderSig,
      debouncedSave,
      debouncedSavePreview,
      drawingId,
      excalidrawAPI,
      hasElementChanged,
      lastLocalChangeAtRef,
      lastSyncedElementOrderSigRef,
      lastSyncedFilesRef,
      latestAppStateRef,
      latestFilesRef,
      latestElementsRef,
      normalizeImageElementStatus,
      recordElementVersion,
      setHasSceneChangesSinceLoad,
    ],
  );

  return recordLocalChanges;
};
