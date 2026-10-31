import { test, expect } from "@playwright/test";
import { createDrawing, deleteDrawing, getDrawing } from "./helpers/api";
import {
  openEditor,
  sceneIds,
  insertElement,
  localDrafts,
  blockWrites,
  imageSize,
} from "./helpers/editor";

test.describe("personal editing", () => {
  let drawingId: string;
  test.beforeEach(async ({ request }) => {
    drawingId = (
      await createDrawing(request, { name: `Personal_${Date.now()}` })
    ).id;
  });
  test.afterEach(async ({ request }) => {
    await deleteDrawing(request, drawingId);
  });

  test("saves over HTTP without a realtime transport and refreshes a clean focused page", async ({
    context,
    request,
  }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    const realtime: string[] = [];
    context.on("request", (req) => {
      if (/socket\.io|engine\.io/.test(req.url())) realtime.push(req.url());
    });
    const recordSocket = (socket: { url: () => string }) => {
      const url = new URL(socket.url());
      // Vite's development hot reload is the only permitted WebSocket.
      if (url.pathname === "/" && url.searchParams.has("token")) return;
      realtime.push(socket.url());
    };
    a.on("websocket", recordSocket);
    b.on("websocket", recordSocket);
    await openEditor(a, drawingId);
    await openEditor(b, drawingId);
    await insertElement(a, "saved-a");
    await expect
      .poll(async () =>
        (await getDrawing(request, drawingId)).elements?.map((e: any) => e.id),
      )
      .toEqual(["saved-a"]);
    expect(await sceneIds(b)).toEqual([]);
    await b.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect.poll(() => sceneIds(b)).toEqual(["saved-a"]);
    await a.reload();
    await a.waitForFunction(() =>
      Boolean((window as any).__EXCALIDASH_EXCALIDRAW_API__),
    );
    await expect.poll(() => sceneIds(a)).toEqual(["saved-a"]);
    await expect(a.getByTestId("collaborator-avatar")).toHaveCount(0);
    expect(realtime).toEqual([]);
  });

  test("keeps a losing page intact and loads the latest only after confirmation and successful read", async ({
    context,
    request,
  }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await openEditor(a, drawingId);
    await openEditor(b, drawingId);
    await insertElement(a, "winner");
    await expect
      .poll(async () =>
        (await getDrawing(request, drawingId)).elements?.map((e: any) => e.id),
      )
      .toEqual(["winner"]);
    await insertElement(b, "loser");
    await expect(
      b.getByText("Save conflict — unsaved changes", { exact: true }),
    ).toBeVisible();
    expect(await sceneIds(b)).toEqual(["loser"]);
    await expect
      .poll(() => localDrafts(b, drawingId))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            elements: expect.arrayContaining([
              expect.objectContaining({ id: "loser" }),
            ]),
          }),
        ]),
      );
    await b.evaluate(() => window.dispatchEvent(new Event("focus")));
    expect(await sceneIds(b)).toEqual(["loser"]);
    await b.route(`**/api/drawings/${drawingId}`, (route) =>
      route.request().method() === "GET" ? route.abort() : route.continue(),
    );
    b.once("dialog", (dialog) => dialog.accept());
    await b
      .getByRole("button", { name: "Load latest version", exact: true })
      .click();
    await expect(b.getByText(/Could not complete the operation/)).toBeVisible();
    expect(await sceneIds(b)).toEqual(["loser"]);
    await b.unroute(`**/api/drawings/${drawingId}`);
    b.once("dialog", (dialog) => dialog.dismiss());
    await b
      .getByRole("button", { name: "Load latest version", exact: true })
      .click();
    expect(await sceneIds(b)).toEqual(["loser"]);
    b.once("dialog", (dialog) => dialog.accept());
    await b
      .getByRole("button", { name: "Load latest version", exact: true })
      .click();
    await expect.poll(() => sceneIds(b)).toEqual(["winner"]);
    await expect(
      b.getByText("Save conflict — unsaved changes", { exact: true }),
    ).not.toBeVisible();
    expect(
      (await getDrawing(request, drawingId)).elements?.map((e: any) => e.id),
    ).toEqual(["winner"]);
  });

  test("recovers an offline image draft after closing, without touching another page's draft", async ({
    context,
  }) => {
    const a = await context.newPage();
    const b = await context.newPage();
    await openEditor(a, drawingId);
    await openEditor(b, drawingId);
    await blockWrites(a);
    await blockWrites(b);
    await context.setOffline(true);
    await insertElement(a, "offline-image", true);
    await insertElement(b, "other-page");
    await expect.poll(() => localDrafts(a, drawingId)).toHaveLength(2);
    const original = await localDrafts(a, drawingId);
    const imageDraft = original.find((draft) =>
      draft.elements.some((e: any) => e.id === "offline-image"),
    );
    expect(imageDraft.files["file-offline-image"].dataURL).toMatch(
      /^data:image\//,
    );
    const otherDraft = original.find(
      (draft) => draft.pageId !== imageDraft.pageId,
    );
    await a.close();
    await context.setOffline(false);
    const reopened = await context.newPage();
    await blockWrites(reopened);
    await openEditor(reopened, drawingId);
    await reopened.clock.install();
    const sceneWrites: string[] = [];
    reopened.on("request", (req) => {
      if (
        req.method() === "PUT" &&
        new URL(req.url()).pathname === `/api/drawings/${drawingId}`
      )
        sceneWrites.push(req.url());
    });
    await expect(
      reopened.getByRole("button", { name: /Recover draft/ }),
    ).toHaveCount(2);
    // Drafts are newest first, choose the one containing our image by its recorded timestamp.
    const index = [...original]
      .sort((x, y) => y.updatedAt - x.updatedAt)
      .findIndex((draft) => draft.pageId === imageDraft.pageId);
    await reopened
      .getByRole("button", { name: /Recover draft/ })
      .nth(index)
      .click();
    await expect.poll(() => sceneIds(reopened)).toEqual(["offline-image"]);
    await reopened.clock.runFor(3000);
    expect(sceneWrites).toEqual([]);
    expect(
      await reopened.evaluate(
        () =>
          (window as any).__EXCALIDASH_EXCALIDRAW_API__.getFiles()[
            "file-offline-image"
          ].dataURL,
      ),
    ).toMatch(/^data:image\//);
    expect(await imageSize(reopened, "file-offline-image")).toEqual([10, 10]);
    expect(await localDrafts(reopened, drawingId)).toEqual(
      expect.arrayContaining([otherDraft]),
    );
  });
});
