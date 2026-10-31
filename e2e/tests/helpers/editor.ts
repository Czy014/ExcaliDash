import { expect, type Page } from "@playwright/test";

export const IMAGE_DATA =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGElEQVR4nGM8oKDwn4EIwESMolGF1FMIAD7VAhNSv8CwAAAAAElFTkSuQmCC";

export async function openEditor(page: Page, id: string) {
  await page.goto(`/editor/${id}`);
  await expect(
    page.locator("canvas.excalidraw__canvas.interactive"),
  ).toBeVisible();
  await page.waitForFunction(() =>
    Boolean((window as any).__EXCALIDASH_EXCALIDRAW_API__),
  );
}

export const sceneIds = (page: Page) =>
  page.evaluate(
    () =>
      (window as any).__EXCALIDASH_EXCALIDRAW_API__
        .getSceneElements()
        .map((element: any) => element.id) as string[],
  );

export const imageSize = (page: Page, fileId: string) =>
  page.evaluate(async (id) => {
    const image = new Image();
    image.src = (window as any).__EXCALIDASH_EXCALIDRAW_API__.getFiles()[
      id
    ].dataURL;
    await image.decode();
    return [image.naturalWidth, image.naturalHeight];
  }, fileId);

export async function insertElement(page: Page, id: string, image = false) {
  await page.evaluate(
    ({ id, image, dataURL }) => {
      const editor = (window as any).__EXCALIDASH_EXCALIDRAW_API__;
      const fileId = `file-${id}`;
      if (image)
        editor.addFiles([
          { id: fileId, dataURL, mimeType: "image/png", created: Date.now() },
        ]);
      editor.updateScene({
        elements: [
          ...editor.getSceneElementsIncludingDeleted(),
          {
            id,
            type: image ? "image" : "rectangle",
            x: 200,
            y: 200,
            width: 100,
            height: 100,
            angle: 0,
            strokeColor: "#1e1e1e",
            backgroundColor: "transparent",
            fillStyle: "solid",
            strokeWidth: 1,
            strokeStyle: "solid",
            roundness: null,
            roughness: 0,
            opacity: 100,
            groupIds: [],
            frameId: null,
            seed: 100,
            version: 1,
            versionNonce: 100,
            isDeleted: false,
            boundElements: null,
            link: null,
            locked: false,
            updated: Date.now(),
            ...(image
              ? { fileId, status: "saved", scale: [1, 1], crop: null }
              : {}),
          },
        ],
      });
    },
    { id, image, dataURL: IMAGE_DATA },
  );
  await expect.poll(() => sceneIds(page)).toContain(id);
}

export const localDrafts = (page: Page, drawingId: string) =>
  page.evaluate(
    (id) =>
      new Promise<any[]>((resolve, reject) => {
        const request = indexedDB.open("excalidash-drafts", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("drafts", "readonly");
          const read = transaction.objectStore("drafts").getAll();
          transaction.oncomplete = () => {
            database.close();
            resolve(read.result.filter((draft) => draft.drawingId === id));
          };
          transaction.onerror = () => {
            database.close();
            reject(transaction.error);
          };
        };
      }),
    drawingId,
  );

export async function blockWrites(page: Page) {
  await page.route("**/api/drawings/**", (route) =>
    route.request().method() === "PUT" ? route.abort() : route.continue(),
  );
}
