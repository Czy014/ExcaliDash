import React, { useLayoutEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { useEditorDrafts } from "../src/pages/editor/useEditorDrafts";
import { listDrafts } from "../src/pages/editor/draftStorage";

vi.mock("../src/api", () => ({ API_URL: "/api" }));
const renderers: ReactTestRenderer[] = [];
const scope = {
  service: "https://example.test/api",
  account: "alice",
  drawingId: "drawing",
};
const harness = (account = scope.account) => {
  const refs = {
    currentDrawingVersion: { current: 10 },
    latestElements: {
      current: [{ id: "image", type: "image", fileId: "photo" }],
    },
    latestAppState: { current: { viewBackgroundColor: "#ffffff" } },
    latestFiles: {
      current: {
        photo: { id: "photo", dataURL: "data:image/png;base64,AA==" },
      },
    },
  };
  let drafts!: ReturnType<typeof useEditorDrafts>;
  function Harness() {
    const next = useEditorDrafts({ ...scope, account, refs });
    useLayoutEffect(() => {
      drafts = next;
    });
    return null;
  }
  return {
    refs,
    Harness,
    get drafts() {
      return drafts;
    },
  };
};
const mount = async (Component: React.ComponentType) => {
  await act(async () => {
    renderers.push(create(<Component />));
  });
};
beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
  vi.stubGlobal("window", {
    location: { href: "https://example.test/editor/drawing" },
  });
  vi.stubGlobal("sessionStorage", { getItem: () => "inherited-tab-id" });
});
afterEach(async () => {
  await act(async () => {
    renderers.splice(0).forEach((r) => r.unmount());
  });
  vi.unstubAllGlobals();
});
describe("editor draft lifecycle", () => {
  it("creates separate page identities on HTTP origins without randomUUID", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: crypto.getRandomValues.bind(crypto),
    });
    const a = harness();
    const b = harness();
    await mount(a.Harness);
    await mount(b.Harness);
    await act(async () => {
      a.drafts.capture();
      b.drafts.capture();
      await Promise.all([a.drafts.flush(), b.drafts.flush()]);
    });
    const stored = await listDrafts(scope);
    expect(stored).toHaveLength(2);
    expect(stored[0].pageId).not.toBe(stored[1].pageId);
  });

  it("offers only the current account's drafts after an account switch", async () => {
    const alice = harness();
    await mount(alice.Harness);
    await act(async () => {
      alice.drafts.capture();
      await alice.drafts.flush();
    });
    const bob = harness("bob");
    await mount(bob.Harness);
    await vi.waitFor(() => expect(bob.drafts.ready).toBe(true));
    expect(bob.drafts.drafts).toEqual([]);
    await act(async () => {
      bob.drafts.capture();
      await bob.drafts.flush();
    });
    const aliceReopened = harness();
    await mount(aliceReopened.Harness);
    await vi.waitFor(() => expect(aliceReopened.drafts.ready).toBe(true));
    expect(aliceReopened.drafts.drafts).toHaveLength(1);
    expect(aliceReopened.drafts.drafts[0].account).toBe("alice");
  });

  it("gives copied tabs different identities and restores their independently committed drafts", async () => {
    const a = harness();
    const b = harness();
    await mount(a.Harness);
    await mount(b.Harness);
    await act(async () => {
      a.drafts.capture();
      b.drafts.capture();
      await Promise.all([a.drafts.flush(), b.drafts.flush()]);
    });
    const stored = await listDrafts(scope);
    expect(stored).toHaveLength(2);
    expect(stored[0].pageId).not.toBe(stored[1].pageId);
    const reopened = harness();
    await mount(reopened.Harness);
    await vi.waitFor(() => expect(reopened.drafts.ready).toBe(true));
    expect(reopened.drafts.drafts).toHaveLength(2);
    expect(reopened.drafts.drafts[0].files.photo.dataURL).toBe(
      "data:image/png;base64,AA==",
    );
  });

  it("retains a new edit made while a server save was pending", async () => {
    const h = harness();
    await mount(h.Harness);
    await act(async () => {
      h.drafts.capture();
      await h.drafts.flush();
      const savingRevision = h.drafts.revision.current;
      h.drafts.capture();
      await h.drafts.flush();
      await h.drafts.acknowledge(savingRevision);
    });
    expect((await listDrafts(scope))[0].revision).toBe(2);
    await act(async () => {
      await h.drafts.acknowledge(2);
    });
    expect(await listDrafts(scope)).toEqual([]);
  });

  it("reports failed storage while retaining the scene and revision", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const h = harness();
    await mount(h.Harness);
    await act(async () => {
      h.drafts.capture();
      await h.drafts.flush();
    });
    expect(h.drafts.storageError).toBe(true);
    expect(h.drafts.revision.current).toBe(1);
    expect(h.refs.latestFiles.current.photo.dataURL).toBe(
      "data:image/png;base64,AA==",
    );
  });
});
