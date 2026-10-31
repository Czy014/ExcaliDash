import React, { useLayoutEffect, useState } from "react";
import ShallowRenderer from "react-test-renderer/shallow";
import { Editor } from "../src/pages/Editor";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "../src/api";
import { useEditorPersistence } from "../src/pages/editor/useEditorPersistence";
const { route } = vi.hoisted(() => ({ route: { id: "drawing" } }));
vi.mock("react-router-dom", () => ({
  useParams: () => route,
  useNavigate: vi.fn(),
  useLocation: vi.fn(),
}));
vi.mock("@excalidraw/excalidraw", () => ({ exportToSvg: vi.fn() }));
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));
vi.mock("../src/api", () => ({
  getDrawing: vi.fn(),
  updateDrawing: vi.fn(),
  isAxiosError: (error: any) => Boolean(error.response),
}));
vi.mock("../src/utils/imageCompression", () => ({
  compressExcalidrawFiles: vi.fn(async (files) => ({ files, changed: false })),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
const ref = <T,>(current: T) => ({ current });
const element = (id: string, version = 1, extra = {}) => ({
  id,
  type: "rectangle",
  version,
  versionNonce: version,
  updated: version,
  ...extra,
});
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
};
const appState = { viewBackgroundColor: "#ffffff" };
let renderer: ReactTestRenderer | undefined;
const makeHarness = (initial = [element("local")]) => {
  let live: any[] = initial;
  const editor = {
    getSceneElementsIncludingDeleted: () => live,
    getFiles: () => ({}),
    getAppState: () => appState,
    addFiles: vi.fn(),
    updateScene: vi.fn(({ elements }) => {
      live = elements;
    }),
  };
  const refs = {
    hasSceneChangesSinceLoad: ref(true),
    currentDrawingVersion: ref<number | null>(1),
    debouncedSave: ref(null),
    excalidrawAPI: ref<any>(editor),
    isSyncing: ref(false),
    isUnmounting: ref(false),
    lastLocalChangeAt: ref(1),
    lastPersistedElements: ref<readonly any[]>(initial),
    lastPersistedFiles: ref({}),
    lastSyncedFiles: ref({}),
    latestAppState: ref(appState),
    latestElements: ref<readonly any[]>(initial),
    latestFiles: ref<any>({}),
    saveQueue: ref(Promise.resolve()),
    suspiciousBlankLoad: ref(false),
    uploadedRefs: ref({}),
  };
  const drafts = {
    revision: ref(1),
    acknowledge: vi.fn(),
    capture: vi.fn(() => {
      drafts.revision.current += 1;
    }),
  };
  let persistence!: ReturnType<typeof useEditorPersistence>;
  function Harness({
    drawingId = "drawing",
    canEdit = true,
  }: {
    drawingId?: string;
    canEdit?: boolean;
  }) {
    const nextPersistence = useEditorPersistence({
      drawingId,
      canEdit,
      refs,
      user: null,
      drafts,
      normalizeImageElementStatus: (elements = []) => elements,
      resolveSafeSnapshot: (snapshot = []) => ({
        snapshot,
        prevented: false,
        staleEmptySnapshot: false,
        staleNonRenderableSnapshot: false,
      }),
    });
    useLayoutEffect(() => {
      persistence = nextPersistence;
    });
    return null;
  }
  return {
    refs,
    editor,
    drafts,
    Harness,
    setLive: (elements: any[]) => {
      live = elements;
      refs.latestElements.current = elements;
    },
    get persistence() {
      return persistence;
    },
  };
};
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.mocked(api.updateDrawing).mockResolvedValue({ version: 2 } as never);
});
afterEach(async () => {
  await act(async () => renderer?.unmount());
  renderer = undefined;
  vi.useRealTimers();
});
const mount = async (Harness: React.ComponentType) => {
  await act(async () => {
    renderer = create(<Harness />);
  });
};
describe("serialized saves", () => {
  it("pauses queued and debounced saves after the first conflict without merging or retrying", async () => {
    const h = makeHarness();
    await mount(h.Harness);
    const firstSave = deferred<any>();
    vi.mocked(api.updateDrawing).mockReturnValueOnce(firstSave.promise);
    const first = h.persistence.enqueueSceneSave("drawing", [], appState, {});
    await act(async () => {});
    h.setLive([element("local", 2)]);
    const second = h.persistence.enqueueSceneSave("drawing", [], appState, {});
    h.persistence.debouncedSave("drawing", [], appState, {});
    firstSave.reject({ response: { status: 409 } });
    await act(async () => {
      await first;
      await second;
      await vi.advanceTimersByTimeAsync(31000);
    });
    expect(api.updateDrawing).toHaveBeenCalledOnce();
    expect(api.getDrawing).not.toHaveBeenCalled();
    expect(h.persistence.conflict).toBe(true);
    expect(h.persistence.unsaved).toBe(true);
    expect(h.refs.currentDrawingVersion.current).toBe(1);
    expect(h.refs.latestElements.current).toEqual([element("local", 2)]);
    expect(h.drafts.acknowledge).not.toHaveBeenCalled();
    await act(async () => renderer!.unmount());
    await h.refs.saveQueue.current;
    expect(api.updateDrawing).toHaveBeenCalledOnce();
  });
  it("finishes the old drawing's newest unsaved edit after direct navigation without borrowing the next drawing's state or permission", async () => {
    const sessions = new Map<string, ReturnType<typeof makeHarness>>();
    function DrawingSession({ id, canEdit }: { id: string; canEdit: boolean }) {
      const [h] = useState(() => makeHarness());
      useLayoutEffect(() => {
        sessions.set(id, h);
      });
      return <h.Harness drawingId={id} canEdit={canEdit} />;
    }
    // Use the actual route component's boundary key: removing it makes this
    // regression reuse A's hook state and lose the queued save on navigation.
    const shallow = new ShallowRenderer();
    route.id = "drawing";
    shallow.render(<Editor />);
    const firstKey = shallow.getRenderOutput().key;
    await act(async () => {
      renderer = create(<DrawingSession key={firstKey} id="drawing" canEdit />);
    });
    const a = sessions.get("drawing")!;
    const response = deferred<any>();
    vi.mocked(api.updateDrawing).mockReturnValueOnce(response.promise);
    const pending = a.persistence.enqueueSceneSave(
      "drawing",
      [element("local")],
      appState,
      {},
    );
    await act(async () => {});
    const finalEdit = [element("local", 5)];
    a.setLive(finalEdit);
    a.persistence.debouncedSave("drawing", finalEdit, appState, {});
    route.id = "other";
    shallow.render(<Editor />);
    await act(async () => {
      renderer!.update(
        <DrawingSession
          key={shallow.getRenderOutput().key}
          id="other"
          canEdit={false}
        />,
      );
    });
    const b = sessions.get("other")!;
    b.setLive([element("other", 10)]);
    b.refs.currentDrawingVersion.current = 10;
    b.refs.lastPersistedElements.current = [element("other", 10)];
    response.resolve({ version: 2 });
    await act(async () => {
      await pending;
      await a.refs.saveQueue.current;
    });
    expect(api.updateDrawing).toHaveBeenLastCalledWith(
      "drawing",
      expect.objectContaining({ elements: finalEdit, version: 2 }),
    );
    expect(
      vi.mocked(api.updateDrawing).mock.calls.every(([id]) => id === "drawing"),
    ).toBe(true);
    expect(b.refs.currentDrawingVersion.current).toBe(10);
    expect(b.refs.lastPersistedElements.current).toEqual([
      element("other", 10),
    ]);
    expect(b.refs.latestElements.current).toEqual([element("other", 10)]);
    expect(b.editor.updateScene).not.toHaveBeenCalled();
  });
  it("does not let an old drawing's response change another drawing's refs", async () => {
    const h = makeHarness();
    await mount(h.Harness);
    const response = deferred<any>();
    vi.mocked(api.updateDrawing).mockReturnValueOnce(response.promise);
    const save = h.persistence.enqueueSceneSave(
      "drawing",
      [element("local")],
      appState,
      {},
    );
    await act(async () => {});
    await act(async () => {
      renderer!.update(<h.Harness drawingId="other" />);
    });
    h.setLive([element("other")]);
    h.refs.currentDrawingVersion.current = 10;
    h.refs.lastPersistedElements.current = [element("other")];
    response.resolve({ version: 2 });
    await act(async () => {
      await save;
    });
    expect(h.refs.currentDrawingVersion.current).toBe(10);
    expect(h.refs.lastPersistedElements.current).toEqual([element("other")]);
    expect(h.editor.updateScene).not.toHaveBeenCalled();
  });
});
describe("save acknowledgements", () => {
  it("never sends an unknown version", async () => {
    const h = makeHarness();
    await mount(h.Harness);
    h.refs.currentDrawingVersion.current = null;
    await h.persistence.enqueueSceneSave("drawing", [], appState, {});
    expect(api.updateDrawing).not.toHaveBeenCalled();
    expect(h.persistence.canSave()).toBe(false);
    expect(h.drafts.acknowledge).not.toHaveBeenCalled();
  });
  it("confirms only the captured revision when the user edits during the request", async () => {
    const h = makeHarness();
    await mount(h.Harness);
    const response = deferred<any>();
    vi.mocked(api.updateDrawing).mockReturnValueOnce(response.promise);
    const save = h.persistence.enqueueSceneSave("drawing", [], appState, {});
    await act(async () => {});
    await act(async () => {
      h.setLive([element("local", 2)]);
      h.persistence.markChanged();
      response.resolve({ version: 2 });
      await save;
    });
    expect(h.drafts.acknowledge).toHaveBeenCalledWith(1);
    expect(h.refs.hasSceneChangesSinceLoad.current).toBe(true);
    expect(h.persistence.unsaved).toBe(true);
    expect(h.refs.currentDrawingVersion.current).toBe(2);
  });
});
