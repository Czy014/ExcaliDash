import React, { useLayoutEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api";
import { useEditorRecovery } from "../src/pages/editor/useEditorRecovery";
import { useEditorPersistence } from "../src/pages/editor/useEditorPersistence";
import { rehydrateFilesForExport } from "../src/utils/rehydrateFiles";

const { navigate } = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));
vi.mock("../src/api", () => ({
  getDrawing: vi.fn(),
  createDrawing: vi.fn(),
  updateDrawing: vi.fn(),
  isAxiosError: (e: any) => Boolean(e.response),
}));
vi.mock("../src/utils/rehydrateFiles", () => ({
  rehydrateFilesForExport: vi.fn(async (files) => files),
}));
vi.mock("../src/utils/imageCompression", () => ({
  compressExcalidrawFiles: vi.fn(async (files) => ({ files, changed: false })),
}));
vi.mock("@excalidraw/excalidraw", () => ({ exportToSvg: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const ref = <T,>(current: T) => ({ current });
const remote = {
  name: "Server drawing",
  version: 11,
  elements: [{ id: "remote" }],
  appState: {},
  files: {},
};
const deferred = () => {
  let resolve!: (data: any) => void;
  const promise = new Promise<any>((done) => {
    resolve = done;
  });
  return { resolve, promise };
};
let renderer: ReactTestRenderer;
const harness = () => {
  const refs = {
    currentDrawingVersion: ref<number | null>(10),
    hasSceneChangesSinceLoad: ref(false),
    latestElements: ref<readonly any[]>([{ id: "local" }]),
    initialSceneElements: ref<readonly any[]>([]),
    latestAppState: ref<any>({ viewBackgroundColor: "#ffffff" }),
    latestFiles: ref<any>({}),
    lastPersistedElements: ref<readonly any[]>([]),
    lastPersistedFiles: ref({}),
    lastSyncedFiles: ref({}),
    lastSyncedElementOrderSig: ref(""),
    isSyncing: ref(false),
    isUnmounting: ref(false),
    lastLocalChangeAt: ref(0),
    suspiciousBlankLoad: ref(false),
    isBootstrappingScene: ref(false),
    hasHydratedInitialScene: ref(true),
    elementVersionMap: ref(new Map()),
    saveQueue: ref(Promise.resolve()),
    uploadedRefs: ref({}),
    debouncedSave: ref(null),
    excalidrawAPI: ref<any>(null),
  };
  const editor = {
    getSceneElementsIncludingDeleted: () => refs.latestElements.current,
    getAppState: () => refs.latestAppState.current,
    getFiles: () => refs.latestFiles.current,
    resetScene: vi.fn(),
    updateScene: vi.fn(),
    addFiles: vi.fn(),
    history: { clear: vi.fn() },
  };
  refs.excalidrawAPI.current = editor;
  const drafts = {
    revision: ref(1),
    acknowledge: vi.fn(async () => {}),
    capture: vi.fn(() => {
      drafts.revision.current += 1;
    }),
    flush: vi.fn(async () => {}),
    dismiss: vi.fn(),
    ready: true,
    storageError: false,
    drafts: [] as any[],
  };
  let persistence!: ReturnType<typeof useEditorPersistence>;
  let recovery!: ReturnType<typeof useEditorRecovery>;
  function Harness({ drawingId = "drawing" }: { drawingId?: string }) {
    const nextPersistence = useEditorPersistence({
      drawingId,
      canEdit: true,
      refs,
      drafts,
      normalizeImageElementStatus: (elements = []) => elements,
      resolveSafeSnapshot: (snapshot = []) => ({
        snapshot,
        prevented: false,
        staleEmptySnapshot: false,
        staleNonRenderableSnapshot: false,
      }),
    });
    const nextRecovery = useEditorRecovery({
      drawingId,
      drawingName: "Local drawing",
      refs,
      drafts,
      persistence: nextPersistence,
      uploadedRefs: refs.uploadedRefs,
      invalidateFileLoads: vi.fn(),
      setDrawingName: vi.fn(),
      setAccessLevel: vi.fn(),
      computeElementOrderSig: () => "",
      recordElementVersion: vi.fn(),
      normalizeImageElementStatus: (elements) => elements,
    });
    useLayoutEffect(() => {
      persistence = nextPersistence;
      recovery = nextRecovery;
    });
    return null;
  }
  return {
    Harness,
    refs,
    drafts,
    editor,
    get persistence() {
      return persistence;
    },
    get recovery() {
      return recovery;
    },
  };
};
const mount = async (Component: React.ComponentType) => {
  await act(async () => {
    renderer = create(<Component />);
  });
};
const focus = async () => {
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal(
    "window",
    Object.assign(new EventTarget(), {
      confirm: vi.fn(() => true),
      setTimeout,
      clearTimeout,
    }),
  );
  vi.stubGlobal(
    "document",
    Object.assign(new EventTarget(), { visibilityState: "visible" }),
  );
  vi.mocked(api.getDrawing).mockResolvedValue(remote as never);
  vi.mocked(api.createDrawing).mockResolvedValue({ id: "copy", version: 1 });
  vi.mocked(rehydrateFilesForExport).mockImplementation(
    async (files) => files || {},
  );
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  vi.unstubAllGlobals();
});

describe("clean page refresh", () => {
  it("loads intentional deletions even while the thumbnail still shows the old scene", async () => {
    const h = harness();
    await mount(h.Harness);
    const elements = [{ id: "deleted", isDeleted: true }];
    vi.mocked(api.getDrawing).mockResolvedValueOnce({
      ...remote,
      elements,
      preview: "<svg />",
    } as never);
    await focus();
    expect(h.refs.latestElements.current).toEqual(elements);
    expect(h.refs.currentDrawingVersion.current).toBe(11);
    expect(api.updateDrawing).not.toHaveBeenCalled();
  });
  it("loads a new version without writing it back", async () => {
    const h = harness();
    await mount(h.Harness);
    await focus();
    expect(h.refs.currentDrawingVersion.current).toBe(11);
    expect(h.refs.latestElements.current).toEqual(remote.elements);
    expect(api.updateDrawing).not.toHaveBeenCalled();
  });
  it.each([
    "dirty",
    "saving",
    "conflict",
    "resolution",
    "history",
    "drafts",
    "loading-drafts",
  ])("does not read while %s", async (condition) => {
    const h = harness();
    await mount(h.Harness);
    if (condition === "dirty") h.refs.hasSceneChangesSinceLoad.current = true;
    if (condition === "saving") h.persistence.pendingSavesRef.current = 1;
    if (condition === "conflict") h.persistence.conflictRef.current = true;
    if (condition === "resolution")
      h.persistence.resolutionPendingRef.current = true;
    if (condition === "history")
      h.persistence.historyRestorePendingRef.current = true;
    if (condition === "drafts") h.drafts.drafts.push({});
    if (condition === "loading-drafts") h.drafts.ready = false;
    await focus();
    expect(api.getDrawing).not.toHaveBeenCalled();
  });
  it("discards a read when an edit begins during the request", async () => {
    const h = harness();
    await mount(h.Harness);
    const response = deferred();
    vi.mocked(api.getDrawing).mockReturnValueOnce(response.promise);
    await focus();
    await act(async () => {
      h.persistence.markChanged();
      response.resolve(remote);
    });
    expect(h.refs.latestElements.current).toEqual([{ id: "local" }]);
    expect(h.refs.currentDrawingVersion.current).toBe(10);
  });
  it("ignores an old drawing's response after navigation", async () => {
    const h = harness();
    await mount(h.Harness);
    const response = deferred();
    vi.mocked(api.getDrawing).mockReturnValueOnce(response.promise);
    await focus();
    await act(async () => {
      renderer.update(<h.Harness drawingId="other" />);
      response.resolve(remote);
    });
    expect(h.refs.latestElements.current).toEqual([{ id: "local" }]);
    expect(h.editor.resetScene).not.toHaveBeenCalled();
  });
  it("keeps the canvas and base version on a network failure", async () => {
    const h = harness();
    await mount(h.Harness);
    vi.mocked(api.getDrawing).mockRejectedValueOnce(new Error("offline"));
    await focus();
    expect(h.refs.currentDrawingVersion.current).toBe(10);
    expect(h.editor.resetScene).not.toHaveBeenCalled();
  });
});

describe("explicit recovery", () => {
  it("allows loading a scene whose elements were all intentionally deleted", async () => {
    const h = harness();
    await mount(h.Harness);
    const elements = [{ id: "deleted", isDeleted: true }];
    vi.mocked(api.getDrawing).mockResolvedValueOnce({
      ...remote,
      elements,
      preview: "<svg />",
    } as never);
    await act(async () => {
      h.persistence.enterConflict();
      await h.recovery.loadLatest();
    });
    expect(h.refs.latestElements.current).toEqual(elements);
    expect(h.persistence.conflict).toBe(false);
    expect(h.drafts.acknowledge).toHaveBeenCalled();
  });
  it("requires confirmation and preserves the draft when reading fails", async () => {
    const h = harness();
    await mount(h.Harness);
    vi.mocked(window.confirm).mockReturnValueOnce(false);
    await h.recovery.loadLatest();
    expect(api.getDrawing).not.toHaveBeenCalled();
    vi.mocked(api.getDrawing).mockRejectedValueOnce(new Error("offline"));
    await act(async () => {
      await h.recovery.loadLatest();
    });
    expect(h.editor.resetScene).not.toHaveBeenCalled();
    expect(h.drafts.acknowledge).not.toHaveBeenCalled();
  });
  it("freezes the canvas and prevents duplicate actions until a read completes", async () => {
    const h = harness();
    await mount(h.Harness);
    const response = deferred();
    vi.mocked(api.getDrawing).mockReturnValueOnce(response.promise);
    let loading!: Promise<void>;
    await act(async () => {
      loading = h.recovery.loadLatest();
    });
    expect(h.persistence.resolving).toBe(true);
    expect(h.persistence.canSave()).toBe(false);
    await h.recovery.saveCopy();
    expect(api.createDrawing).not.toHaveBeenCalled();
    await act(async () => {
      response.resolve(remote);
      await loading;
    });
    expect(h.drafts.acknowledge).toHaveBeenCalledWith(1);
    expect(h.persistence.resolving).toBe(false);
  });
  it("creates a copy from this page's scene and persisted settings", async () => {
    const h = harness();
    await mount(h.Harness);
    await act(async () => {
      h.persistence.enterConflict();
      await h.recovery.saveCopy();
    });
    expect(api.createDrawing).toHaveBeenCalledWith(
      "Local drawing (copy)",
      null,
      {
        elements: [{ id: "local" }],
        appState: { viewBackgroundColor: "#ffffff", gridSize: null },
        files: {},
      },
    );
    expect(api.updateDrawing).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/editor/copy");
  });
  it.each(["create", "image"])(
    "keeps the conflict and draft if %s fails",
    async (failure) => {
      const h = harness();
      await mount(h.Harness);
      if (failure === "create")
        vi.mocked(api.createDrawing).mockRejectedValueOnce(
          new Error("forbidden"),
        );
      else
        vi.mocked(rehydrateFilesForExport).mockRejectedValueOnce(
          new Error("missing image"),
        );
      await act(async () => {
        h.persistence.enterConflict();
        await h.recovery.saveCopy();
      });
      expect(h.refs.latestElements.current).toEqual([{ id: "local" }]);
      expect(h.persistence.conflict).toBe(true);
      expect(h.drafts.acknowledge).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    },
  );
  it("restores an outdated draft into conflict without automatically writing to the server", async () => {
    const h = harness();
    await mount(h.Harness);
    const draft = {
      baseVersion: 9,
      elements: [{ id: "draft" }],
      appState: {},
      files: { photo: { dataURL: "data:local" } },
    } as any;
    await act(async () => {
      await h.recovery.recoverDraft(draft);
    });
    expect(h.refs.latestElements.current).toEqual([{ id: "draft" }]);
    expect(h.refs.lastPersistedFiles.current).toEqual({});
    expect(h.persistence.conflict).toBe(true);
    expect(api.updateDrawing).not.toHaveBeenCalled();
  });
});
