import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Request } from "@playwright/test";
import {
  createCollection,
  createDrawing,
  deleteCollection,
  deleteDrawing,
} from "./helpers/api";
import { appBasePath, appUrl } from "./helpers/paths";

type CspViolation = {
  effectiveDirective: string;
  blockedURI: string;
  sourceFile: string;
};

const cspTemplatePath = process.env.CSP_TEMPLATE_PATH;
const csp = cspTemplatePath
  ? readFileSync(resolve(process.cwd(), cspTemplatePath), "utf8").match(
      /add_header Content-Security-Policy "([^"]+)"/,
    )?.[1]
  : undefined;

if (cspTemplatePath && !csp) {
  throw new Error(`Content-Security-Policy not found in ${cspTemplatePath}`);
}

const isCdnFontUrl = (value: string) => {
  try {
    const url = new URL(value);
    return (
      url.origin === "https://esm.sh" &&
      /^\/@excalidraw\/excalidraw@[^/]+\/dist\/prod\/fonts\//.test(url.pathname)
    );
  } catch {
    return false;
  }
};

const isEngineAssetScript = (value: string) => {
  try {
    const url = new URL(value);
    const assetPrefix = `${appBasePath}assets/`;
    return (
      url.origin === new URL(appUrl()).origin &&
      url.pathname.startsWith(assetPrefix) &&
      url.pathname.endsWith(".js")
    );
  } catch {
    return false;
  }
};

const isEngineSubsetScript = (value: string) => {
  try {
    const url = new URL(value);
    const assetPrefix = `${appBasePath}assets/`;
    return (
      isEngineAssetScript(value) &&
      /^subset-shared\.chunk-[\w-]+\.js$/.test(
        url.pathname.slice(assetPrefix.length),
      )
    );
  } catch {
    return false;
  }
};

const isEngineSubsettingLog = (text: string, sourceFile: string) =>
  isEngineAssetScript(sourceFile) &&
  (text ===
    "Failed to use workers for subsetting, falling back to the main thread. ErrorEvent" ||
    text.startsWith("Skipped glyph subsetting EvalError:"));

// Playwright's response interception makes Chromium treat Docker service DNS
// names as cross-origin private-network requests. This flag keeps that browser
// transport check from masking the CSP scenario; CSP remains enforced.
test.use({
  launchOptions: { args: csp ? ["--disable-web-security"] : [] },
});

test.describe("native base path", () => {
  let drawingId: string;
  let collectionId: string;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.addEventListener("securitypolicyviolation", (event) => {
        console.warn(
          `__base_path_csp__${JSON.stringify({
            effectiveDirective: event.effectiveDirective,
            blockedURI: event.blockedURI,
            sourceFile: event.sourceFile,
          })}`,
        );
      });
    });

    // Routing disables the browser cache, so reloads also verify font responses.
    await page.route("**/*", async (route) => {
      if (!csp || route.request().resourceType() !== "document") {
        await route.continue();
        return;
      }
      const response = await route.fetch();
      await route.fulfill({
        response,
        headers: { ...response.headers(), "content-security-policy": csp },
      });
    });
  });

  test.afterEach(async ({ request }) => {
    if (drawingId) await deleteDrawing(request, drawingId);
    if (collectionId) await deleteCollection(request, collectionId);
    drawingId = "";
    collectionId = "";
  });

  test("keeps routes, assets, fonts and favicons under the configured path", async ({
    page,
    request,
  }) => {
    const collection = await createCollection(
      request,
      `Base path ${Date.now()}`,
    );
    collectionId = collection.id;
    const drawing = await createDrawing(request, {
      name: `Base path drawing ${Date.now()}`,
      collectionId,
      elements: [
        {
          id: "base-path-text",
          type: "text",
          x: 0,
          y: 0,
          width: 120,
          height: 30,
          angle: 0,
          strokeColor: "#1e1e1e",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 1,
          opacity: 100,
          groupIds: [],
          frameId: null,
          roundness: null,
          seed: 1,
          version: 1,
          versionNonce: 1,
          isDeleted: false,
          boundElements: null,
          updated: Date.now(),
          link: null,
          locked: false,
          text: "Base path",
          fontSize: 20,
          fontFamily: 1,
          textAlign: "left",
          verticalAlign: "top",
          baseline: 22,
          containerId: null,
          originalText: "Base path",
          autoResize: true,
          lineHeight: 1.25,
        },
      ],
    });
    drawingId = drawing.id;

    const sameOriginOutsideBase: string[] = [];
    const failedRequests: string[] = [];
    const consoleErrors: { text: string; sourceFile: string }[] = [];
    const fontRequests: Request[] = [];
    const cdnFontRequests: Request[] = [];
    const cspViolations: CspViolation[] = [];
    const navigationCancelled = new Set<Request>();
    let navigating = false;
    const navigate = async (action: () => Promise<unknown>) => {
      await page.waitForLoadState("networkidle");
      navigating = true;
      try {
        await action();
        await page.waitForLoadState("networkidle");
      } finally {
        navigating = false;
      }
    };
    page.on("request", (requestEvent) => {
      const url = new URL(requestEvent.url());
      if (isCdnFontUrl(url.href)) {
        cdnFontRequests.push(requestEvent);
        return;
      }
      if (url.origin !== new URL(appUrl()).origin) return;
      if (
        url.pathname.startsWith("/fonts/") ||
        url.pathname.startsWith(`${appBasePath}fonts/`)
      ) {
        fontRequests.push(requestEvent);
      }
      if (
        !url.pathname.startsWith(appBasePath) &&
        !url.pathname.startsWith("/api/")
      ) {
        sameOriginOutsideBase.push(url.pathname);
      }
    });
    page.on("requestfailed", (requestEvent) => {
      if (isCdnFontUrl(requestEvent.url())) return;
      if (
        navigating &&
        requestEvent.failure()?.errorText === "net::ERR_ABORTED"
      ) {
        navigationCancelled.add(requestEvent);
        return;
      }
      failedRequests.push(requestEvent.url());
    });
    page.on("console", (message) => {
      const text = message.text();
      if (text.startsWith("__base_path_csp__")) {
        cspViolations.push(
          JSON.parse(text.slice("__base_path_csp__".length)) as CspViolation,
        );
      } else if (message.type() === "error") {
        consoleErrors.push({ text, sourceFile: message.location().url });
      }
    });

    await navigate(() => page.goto(appUrl("/")));
    await expect(
      page.getByRole("heading", { name: "All Drawings" }),
    ).toBeVisible();
    await navigate(() =>
      page
        .getByRole("navigation")
        .getByRole("button", { name: collection.name, exact: true })
        .click(),
    );
    await expect(page).toHaveURL(appUrl(`/collections?id=${collectionId}`));
    await expect(
      page.getByRole("heading", { name: collection.name }),
    ).toBeVisible();
    await navigate(() => page.reload());
    await expect(
      page.getByRole("heading", { name: collection.name }),
    ).toBeVisible();
    for (const [path, title] of [
      ["/collections?id=unorganized", "Unorganized"],
      ["/collections?id=trash", "Trash"],
      ["/settings", "Settings"],
    ] as const) {
      await navigate(() => page.goto(appUrl(path)));
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
      await navigate(() => page.reload());
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }

    const favicon = page.locator("link[rel~='icon']");
    const themeToggle = page.getByRole("switch", { name: "Toggle dark mode" });
    const wasDark = (await themeToggle.getAttribute("aria-checked")) === "true";
    const initialFavicon = `${appBasePath}favicon-${wasDark ? "dark" : "light"}.svg`;
    await expect(favicon).toHaveAttribute("href", initialFavicon);
    expect(
      (await request.get(new URL(initialFavicon, appUrl()).href)).status(),
    ).toBe(200);
    await themeToggle.click();
    const switchedFavicon = `${appBasePath}favicon-${wasDark ? "light" : "dark"}.svg`;
    await expect(favicon).toHaveAttribute("href", switchedFavicon);
    expect(
      (await request.get(new URL(switchedFavicon, appUrl()).href)).status(),
    ).toBe(200);

    await navigate(() => page.goto(appUrl(`/editor/${drawingId}`)));
    await expect(
      page.locator("canvas.excalidraw__canvas").first(),
    ).toBeVisible();
    await navigate(() => page.reload());
    await expect(
      page.locator("canvas.excalidraw__canvas").first(),
    ).toBeVisible();

    await page.waitForLoadState("networkidle");
    const completedFontRequests = fontRequests.filter(
      (fontRequest) => !navigationCancelled.has(fontRequest),
    );
    expect(completedFontRequests.length).toBeGreaterThan(0);
    for (const fontRequest of completedFontRequests) {
      expect(
        new URL(fontRequest.url()).pathname.startsWith(`${appBasePath}fonts/`),
      ).toBe(true);
      expect((await fontRequest.response())?.status(), fontRequest.url()).toBe(
        200,
      );
    }
    if (!csp) {
      expect(cdnFontRequests).toEqual([]);
      expect(cspViolations).toEqual([]);
    }
    for (const cdnRequest of cdnFontRequests) {
      expect(cdnRequest.failure()?.errorText, cdnRequest.url()).toBe("csp");
      expect(await cdnRequest.response(), cdnRequest.url()).toBeNull();
      expect(
        cspViolations.some(
          ({ effectiveDirective, blockedURI }) =>
            effectiveDirective === "font-src" &&
            blockedURI === cdnRequest.url(),
        ),
      ).toBe(true);
    }
    const skippedSubsettingErrors = consoleErrors.filter(
      ({ text, sourceFile }) =>
        text.startsWith("Skipped glyph subsetting EvalError:") &&
        isEngineSubsetScript(sourceFile),
    );
    const allowedEngineLogs = consoleErrors.filter(({ text, sourceFile }) =>
      isEngineSubsettingLog(text, sourceFile),
    );
    for (const violation of cspViolations) {
      const { effectiveDirective, blockedURI, sourceFile } = violation;
      const fontFallback =
        effectiveDirective === "font-src" && isCdnFontUrl(blockedURI);
      const glyphSubsetting =
        effectiveDirective === "script-src" &&
        blockedURI === "eval" &&
        isEngineSubsetScript(sourceFile);
      expect(fontFallback || glyphSubsetting, JSON.stringify(violation)).toBe(
        true,
      );
      if (glyphSubsetting) {
        expect(
          skippedSubsettingErrors.some(
            (error) => error.sourceFile === sourceFile,
          ),
        ).toBe(true);
      }
    }
    expect(sameOriginOutsideBase).toEqual([]);
    expect(failedRequests).toEqual([]);
    expect(
      consoleErrors.filter(
        (error) =>
          !csp ||
          !(
            allowedEngineLogs.includes(error) ||
            (error.text.includes("font-src") &&
              cdnFontRequests.some((cdnRequest) =>
                error.text.includes(cdnRequest.url()),
              ))
          ),
      ),
    ).toEqual([]);
    console.info("Base path validation:", {
      basePath: appBasePath,
      cspEnforced: Boolean(csp),
      localFontResponses: completedFontRequests.length,
      blockedFallbackEvents: cdnFontRequests.length,
      glyphSubsettingEvalReports: cspViolations.filter(
        ({ blockedURI }) => blockedURI === "eval",
      ).length,
      navigationCancelledRequests: navigationCancelled.size,
    });
  });
});
