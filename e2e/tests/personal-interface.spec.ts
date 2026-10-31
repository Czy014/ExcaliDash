import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { createCollection, deleteCollection } from "./helpers/api";

const expectPersonalNavigation = async (page: Page) => {
  await expect(page.getByText("Beta", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /profile picture/ })).toHaveCount(
    0,
  );
  await expect(
    page.locator("aside").getByText(/^(Profile|Shared with me)$/),
  ).toHaveCount(0);
};

test.use({ locale: "zh-CN" });

for (const language of ["en", "zh-CN"]) {
  for (const width of [1280, 390]) {
    test(`English navigation keeps tools at ${width}px with stored ${language}`, async ({
      page,
      request,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((language) => {
        if (!localStorage.getItem("excalidash-preferences")) {
          localStorage.setItem(
            "excalidash-preferences",
            JSON.stringify({ language, compactSidebar: true }),
          );
        }
      }, language);
      const sharedRequests: string[] = [];
      page.on("request", (request) => {
        if (
          new URL(request.url()).pathname === "/api/drawings/shared" ||
          new URL(request.url()).pathname.startsWith("/api/auth/")
        )
          sharedRequests.push(request.url());
      });
      const openSidebar = async () => {
        if (width === 390) {
          await page
            .getByRole("button", { name: "Open menu", exact: true })
            .click();
        }
      };
      const collection = await createCollection(
        request,
        `Personal UI ${language} ${width} \u7ed8\u56fe`,
      );
      try {
        await page.goto("/");
        await expect(page.getByPlaceholder("Search drawings...")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute("lang", "en");
        await openSidebar();
        await expectPersonalNavigation(page);
        const sidebar = page.locator("aside");
        await sidebar
          .getByRole("button", { name: collection.name, exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: collection.name, exact: true }),
        ).toBeVisible();
        await openSidebar();
        await sidebar
          .getByRole("button", {
            name: "Workspace menu",
            exact: true,
          })
          .click();
        await sidebar
          .getByRole("button", {
            name: "Settings",
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("heading", { name: "Settings", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("region", { name: "Account security", exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: "API keys", exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByText("Authentication off", { exact: true }),
        ).toHaveCount(0);
        await expect(page.getByLabel("New email", { exact: true })).toHaveCount(
          0,
        );
        await expect(
          page.getByLabel("Current Password", { exact: true }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("combobox", { name: "Language", exact: true }),
        ).toHaveCount(0);
        await page.reload();
        await expect(
          page.getByRole("heading", { name: "Settings", exact: true }),
        ).toBeVisible();
        const compact = page.getByRole("switch", {
          name: "Toggle compact sidebar",
        });
        await expect(compact).toHaveAttribute("aria-checked", "true");
        await compact.click();
        await expect(compact).toHaveAttribute("aria-checked", "false");
        await openSidebar();
        await expectPersonalNavigation(page);
        await sidebar
          .getByRole("button", {
            name: "Trash",
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("heading", { name: "Trash", exact: true }),
        ).toBeVisible();
        expect(sharedRequests).toEqual([]);
      } finally {
        await deleteCollection(request, collection.id);
      }
    });
  }
}
