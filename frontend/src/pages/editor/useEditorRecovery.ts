import { useEffect, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import * as api from "../../api";
import { rehydrateFilesForExport } from "../../utils/rehydrateFiles";
import { getPersistedAppState, getRequiredSceneFiles } from "./shared";
import type { DrawingDraft } from "./draftStorage";
import type { useEditorDrafts } from "./useEditorDrafts";
import type { useEditorPersistence } from "./useEditorPersistence";
import type { SceneLoaderRefs } from "./useEditorSceneLoader";
import type { MutableRefObject } from "react";

type RecoveryParams = {
  drawingId?: string;
  drawingName: string;
  refs: SceneLoaderRefs;
  uploadedRefs: MutableRefObject<Record<string, string>>;
  drafts: ReturnType<typeof useEditorDrafts>;
  persistence: ReturnType<typeof useEditorPersistence>;
  invalidateFileLoads: () => void;
  setDrawingName: (name: string) => void;
  setAccessLevel: (level: "none" | "owner") => void;
  computeElementOrderSig: (elements: readonly any[]) => string;
  recordElementVersion: (element: any) => void;
  normalizeImageElementStatus: (
    elements: readonly any[],
    files: Record<string, any>,
  ) => readonly any[];
};

export const useEditorRecovery = ({
  drawingId,
  drawingName,
  refs,
  drafts,
  persistence,
  invalidateFileLoads,
  uploadedRefs,
  setDrawingName,
  setAccessLevel,
  computeElementOrderSig,
  recordElementVersion,
  normalizeImageElementStatus,
}: RecoveryParams) => {
  const navigate = useNavigate();
  const sessionRef = useRef({ drawingId });
  const mounted = useRef(true);
  useLayoutEffect(() => {
    sessionRef.current = { drawingId };
  }, [drawingId]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const isCurrent = (session: object, editor: any) =>
    mounted.current &&
    sessionRef.current === session &&
    refs.excalidrawAPI.current === editor;

  const replaceScene = (scene: {
    elements: readonly any[];
    appState: Record<string, any>;
    files: Record<string, any>;
    version: number | null;
  }) => {
    invalidateFileLoads();
    const editor = refs.excalidrawAPI.current;
    const elements = normalizeImageElementStatus(scene.elements, scene.files);
    const appState = getPersistedAppState(scene.appState);
    uploadedRefs.current = {};
    refs.isSyncing.current = true;
    try {
      refs.elementVersionMap.current.clear();
      elements.forEach(recordElementVersion);
      refs.latestElements.current = elements;
      refs.initialSceneElements.current = elements;
      refs.latestFiles.current = scene.files;
      refs.latestAppState.current = appState;
      refs.lastSyncedFiles.current = scene.files;
      refs.lastPersistedFiles.current = scene.files;
      refs.lastPersistedElements.current = elements;
      refs.lastSyncedElementOrderSig.current = computeElementOrderSig(elements);
      refs.currentDrawingVersion.current = scene.version;
      refs.suspiciousBlankLoad.current = false;
      refs.hasHydratedInitialScene.current = true;
      refs.isBootstrappingScene.current = false;
      editor.resetScene();
      editor.addFiles(Object.values(scene.files));
      editor.updateScene({ elements, appState, captureUpdate: "NEVER" });
      editor.history?.clear();
    } finally {
      refs.isSyncing.current = false;
    }
    persistence.resetSaveState();
  };

  const resolve = async (
    operation: "latest" | "copy" | "draft",
    draft?: DrawingDraft,
  ) => {
    if (
      !drawingId ||
      !refs.excalidrawAPI.current ||
      persistence.resolutionPendingRef.current ||
      persistence.historyRestorePendingRef.current
    )
      return;
    if (
      operation === "latest" &&
      !window.confirm(
        "Discard this page's changes and load the latest saved version?",
      )
    )
      return;
    if (
      operation === "draft" &&
      refs.hasSceneChangesSinceLoad.current &&
      !window.confirm(
        "Replace this page's changes with the selected local draft?",
      )
    )
      return;
    const session = sessionRef.current;
    const editor = refs.excalidrawAPI.current;
    const discardedRevision = drafts.revision.current;
    persistence.setResolutionPending(true);
    try {
      await refs.saveQueue.current.catch(() => undefined);
      await drafts.flush();
      if (!isCurrent(session, editor)) return;
      if (operation === "copy") {
        const elements = structuredClone(
          Array.from(editor.getSceneElementsIncludingDeleted()),
        );
        const appState = getPersistedAppState(editor.getAppState());
        const files = await rehydrateFilesForExport(
          getRequiredSceneFiles(elements, {
            ...refs.latestFiles.current,
            ...editor.getFiles(),
          }),
          drawingId,
        );
        if (!isCurrent(session, editor)) return;
        const copy = await api.createDrawing(`${drawingName} (copy)`, null, {
          elements,
          appState,
          files,
        });
        if (!isCurrent(session, editor)) return;
        if (typeof copy.version !== "number")
          throw new Error("Created drawing has no version");
        await drafts.acknowledge(discardedRevision);
        if (!isCurrent(session, editor)) return;
        // Keep original writes paused until the new drawing gets its own refs.
        navigate(`/editor/${copy.id}`);
        return;
      }
      if (operation === "draft" && draft) {
        const serverVersion = refs.currentDrawingVersion.current;
        replaceScene({ ...draft, version: draft.baseVersion });
        refs.lastPersistedFiles.current = {};
        drafts.dismiss();
        persistence.markChanged();
        if (draft.baseVersion === null || draft.baseVersion !== serverVersion)
          persistence.enterConflict();
        return;
      }
      const latest = await api.getDrawing(drawingId);
      if (typeof latest.version !== "number")
        throw new Error("Drawing has no version");
      const files = await rehydrateFilesForExport(
        latest.files || {},
        drawingId,
      );
      if (!isCurrent(session, editor)) return;
      if (latest.elements.length === 0 && latest.preview)
        throw new Error("Blank scene has an existing preview");
      replaceScene({ ...latest, files });
      setDrawingName(latest.name);
      if (latest.accessLevel) setAccessLevel(latest.accessLevel);
      await drafts.acknowledge(discardedRevision);
    } catch {
      if (isCurrent(session, editor))
        toast.error(
          "Could not complete the operation. Your local changes are still available; you can export them.",
        );
    } finally {
      if (isCurrent(session, editor)) persistence.setResolutionPending(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let refreshing = false;
    const clean = () =>
      !cancelled &&
      drafts.ready &&
      drafts.drafts.length === 0 &&
      !refs.hasSceneChangesSinceLoad.current &&
      refs.currentDrawingVersion.current !== null &&
      persistence.pendingSavesRef.current === 0 &&
      !persistence.conflictRef.current &&
      !persistence.resolutionPendingRef.current &&
      !persistence.historyRestorePendingRef.current;
    const refresh = async () => {
      if (!drawingId || refreshing || !clean() || !refs.excalidrawAPI.current)
        return;
      refreshing = true;
      const session = sessionRef.current;
      const editor = refs.excalidrawAPI.current;
      const revision = drafts.revision.current;
      try {
        const latest = await api.getDrawing(drawingId);
        if (
          latest.version === refs.currentDrawingVersion.current ||
          typeof latest.version !== "number"
        )
          return;
        const files = await rehydrateFilesForExport(
          latest.files || {},
          drawingId,
        );
        if (
          !clean() ||
          !isCurrent(session, editor) ||
          drafts.revision.current !== revision
        )
          return;
        if (latest.elements.length === 0 && latest.preview) return;
        replaceScene({ ...latest, files });
        setDrawingName(latest.name);
        if (latest.accessLevel) setAccessLevel(latest.accessLevel);
      } catch {
        // A failed refresh leaves the loaded scene and its base version intact.
      } finally {
        refreshing = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  });

  return {
    loadLatest: () => resolve("latest"),
    saveCopy: () => resolve("copy"),
    recoverDraft: (draft: DrawingDraft) => resolve("draft", draft),
  };
};
