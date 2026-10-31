import { expect, test } from "@playwright/test";
import { createDrawing, deleteDrawing } from "./helpers/api";

test("retired account URLs lead to the library and preferences remain local", async ({
  page,
}) => {
  const accountRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/auth/")) {
      accountRequests.push(request.url());
    }
  });
  for (const url of ["/login", "/register", "/auth/setup", "/admin"]) {
    await page.goto(url);
    await expect(page.getByPlaceholder("Search drawings...")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  }

  await page.goto("/settings");
  const theme = page.getByRole("switch", { name: "Toggle dark mode" });
  const nextTheme = (await theme.getAttribute("aria-checked")) !== "true";
  await theme.click();
  await expect(theme).toHaveAttribute("aria-checked", String(nextTheme));
  await page.reload();
  await expect(theme).toHaveAttribute("aria-checked", String(nextTheme));
  expect(accountRequests).toEqual([]);
});

test("link controls work without account invitations or a separate visitor identity", async ({
  page,
  browser,
}) => {
  const drawing = await createDrawing(page.request, {
    name: "Single-user link controls",
  });
  try {
    await page.goto(`/editor/${drawing.id}`);
    await page.getByRole("button", { name: "Share", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Share drawing" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("textbox")).toHaveCount(0);
    const access = dialog.getByRole("button", { name: "Link access" });
    await access.click();
    await page.getByRole("option", { name: "Anyone with the link" }).click();
    await expect(
      dialog.getByRole("button", { name: "Copy Link" }),
    ).toBeEnabled();
    await expect(dialog.getByRole("status")).toHaveCount(0);
    await access.click();
    await page.getByRole("option", { name: "Restricted" }).click();
    await expect(
      dialog.getByRole("button", { name: "Copy Link" }),
    ).toBeDisabled();

    const visitor = await browser.newContext();
    try {
      const otherPage = await visitor.newPage();
      await otherPage.goto(new URL(`/shared/${drawing.id}`, page.url()).href);
      await expect(
        otherPage.locator("canvas.excalidraw__canvas.interactive"),
      ).toBeVisible();
      // A revoked link cannot restrict the workspace owner's access.
      await expect(
        otherPage.getByRole("button", { name: "Share", exact: true }),
      ).toBeVisible();
    } finally {
      await visitor.close();
    }
  } finally {
    await deleteDrawing(page.request, drawing.id);
  }
});
