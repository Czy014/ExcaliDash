import { afterEach, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([
  [undefined, "http://localhost/draw/"],
  ["", "http://localhost/draw/"],
  [42, "http://localhost/draw/"],
  ["/custom/", "/custom/"],
])("initializes the engine asset path from %s", async (preset, expected) => {
  vi.resetModules();
  vi.stubEnv("BASE_URL", "/draw/");
  const browserWindow = {
    location: { origin: "http://localhost" },
    EXCALIDRAW_ASSET_PATH: preset,
  };
  vi.stubGlobal("window", browserWindow);

  await import("../src/bootstrap/excalidrawAssetPath");

  expect(browserWindow.EXCALIDRAW_ASSET_PATH).toBe(expected);
});
