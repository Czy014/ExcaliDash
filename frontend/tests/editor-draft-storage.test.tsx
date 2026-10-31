import { beforeEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import {
  clearConfirmedDraft,
  listDrafts,
  writeDraft,
  type DrawingDraft,
} from "../src/pages/editor/draftStorage";

const draft = (extra: Partial<DrawingDraft> = {}): DrawingDraft => ({
  formatVersion: 1,
  service: "https://draw.example/api",
  account: "alice",
  drawingId: "drawing",
  pageId: crypto.randomUUID(),
  baseVersion: 10,
  revision: 1,
  updatedAt: Date.now(),
  elements: [{ id: "image", type: "image", fileId: "photo" }],
  appState: { viewBackgroundColor: "#ffffff" },
  files: { photo: { id: "photo", dataURL: "data:image/png;base64,AA==" } },
  ...extra,
});

beforeEach(() => {
  vi.stubGlobal("indexedDB", new IDBFactory());
});

describe("local draft transactions", () => {
  it("keeps two independent page drafts and image bytes after reopening", async () => {
    const a = draft();
    const b = draft();
    await Promise.all([writeDraft(a), writeDraft(b)]);
    const recovered = await listDrafts(a);
    expect(recovered).toHaveLength(2);
    expect(recovered).toEqual(expect.arrayContaining([a, b]));
    await clearConfirmedDraft(a, a.revision);
    expect(await listDrafts(a)).toEqual([b]);
  });

  it("isolates services, accounts and drawings", async () => {
    const a = draft();
    await Promise.all([
      writeDraft(a),
      writeDraft(draft({ account: "bob" })),
      writeDraft(draft({ service: "https://other.example/api" })),
      writeDraft(draft({ drawingId: "other" })),
    ]);
    expect(await listDrafts(a)).toEqual([a]);
  });

  it("never overwrites or clears a newer edit with an older acknowledgement", async () => {
    const a = draft({ revision: 2 });
    await writeDraft(a);
    await writeDraft({ ...a, revision: 1, elements: [] });
    await clearConfirmedDraft(a, 1);
    expect(await listDrafts(a)).toEqual([a]);
    await clearConfirmedDraft(a, 2);
    expect(await listDrafts(a)).toEqual([]);
  });

  it("reports unavailable storage instead of claiming persistence", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(writeDraft(draft())).rejects.toThrow();
    await expect(listDrafts(draft())).rejects.toThrow();
  });
});
