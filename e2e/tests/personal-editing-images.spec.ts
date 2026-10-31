import { test, expect } from "@playwright/test";
import {
  createDrawing,
  deleteDrawing,
  getDrawing,
  API_URL,
} from "./helpers/api";
import {
  openEditor,
  sceneIds,
  insertElement,
  imageSize,
} from "./helpers/editor";

test("creates a complete local conflict copy whose images survive deletion of the original", async ({
  context,
  request,
}) => {
  const original = await createDrawing(request, {
    name: `Personal_Image_${Date.now()}`,
  });
  let copyId: string | undefined;
  try {
    const a = await context.newPage();
    const b = await context.newPage();
    await openEditor(a, original.id);
    await openEditor(b, original.id);
    await insertElement(a, "winner");
    await expect
      .poll(async () =>
        (await getDrawing(request, original.id)).elements?.map(
          (e: any) => e.id,
        ),
      )
      .toEqual(["winner"]);
    await insertElement(b, "copy-image", true);
    await expect(
      b.getByText("Save conflict — unsaved changes", { exact: true }),
    ).toBeVisible();
    await b.route("**/api/drawings", (route) =>
      route.request().method() === "POST" ? route.abort() : route.continue(),
    );
    await b.getByRole("button", { name: "Save as copy", exact: true }).click();
    await expect(b.getByText(/Could not complete the operation/)).toBeVisible();
    expect(await sceneIds(b)).toEqual(["copy-image"]);
    await b.unroute("**/api/drawings");
    await b.getByRole("button", { name: "Save as copy", exact: true }).click();
    await expect(b).not.toHaveURL(new RegExp(`/editor/${original.id}$`));
    copyId = new URL(b.url()).pathname.split("/").pop()!;
    await expect.poll(() => sceneIds(b)).toEqual(["copy-image"]);
    expect(
      (await getDrawing(request, original.id)).elements?.map((e: any) => e.id),
    ).toEqual(["winner"]);
    await deleteDrawing(request, original.id);
    const copy = await getDrawing(request, copyId);
    expect(copy.collectionId).toBeNull();
    expect(copy.elements?.map((e: any) => e.id)).toEqual(["copy-image"]);
    const image = await request.get(
      `${API_URL}/files/${copyId}/file-copy-image`,
    );
    expect(image.ok()).toBe(true);
    expect(image.headers()["content-type"]).toContain("image/png");
    expect((await image.body()).length).toBeGreaterThan(0);
    await b.reload();
    await b.waitForFunction(() => {
      const files = (window as any).__EXCALIDASH_EXCALIDRAW_API__?.getFiles();
      return files?.["file-copy-image"]?.dataURL?.startsWith("data:");
    });
    await expect.poll(() => sceneIds(b)).toEqual(["copy-image"]);
    expect(await imageSize(b, "file-copy-image")).toEqual([10, 10]);
  } finally {
    if (copyId) await deleteDrawing(request, copyId);
    await deleteDrawing(request, original.id).catch(() => undefined);
  }
});
