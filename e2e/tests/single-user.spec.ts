import { expect, test } from "@playwright/test";
import { createDrawing, deleteDrawing } from "./helpers/api";

test.use({ locale: "zh-CN" });

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

test("the editor omits sharing and retired shared URLs return to the library", async ({
  page,
}) => {
  const drawing = await createDrawing(page.request, {
    name: "Single-user drawing controls",
  });
  const sharingRequests: string[] = [];
  page.on("request", (request) => {
    if (/\/(sharing|link-shares)(\/|$)/.test(new URL(request.url()).pathname)) {
      sharingRequests.push(request.url());
    }
  });
  try {
    await page.addInitScript(() => {
      localStorage.setItem("excalidash-lang", "zh-CN");
      localStorage.setItem(
        "excalidash-preferences",
        JSON.stringify({ language: "zh-CN" }),
      );
    });
    await page.goto(`/editor/${drawing.id}`);
    await expect(
      page.locator("canvas.excalidraw__canvas.interactive"),
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(
      page.locator('label:has([data-testid="toolbar-rectangle"])'),
    ).toHaveAttribute("title", /Rectangle/);
    await expect(
      page.getByRole("button", { name: "Share", exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Version History", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Export drawing", exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("dialog", { name: "Share drawing" }),
    ).toHaveCount(0);
    await page.goto(`/shared/${drawing.id}`);
    await expect(page.getByPlaceholder("Search drawings...")).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.locator("canvas.excalidraw__canvas.interactive"),
    ).toHaveCount(0);
    expect(sharingRequests).toEqual([]);
  } finally {
    await deleteDrawing(page.request, drawing.id);
  }
});
