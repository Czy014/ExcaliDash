type AssetPathWindow = Window & { EXCALIDRAW_ASSET_PATH?: string };

const windowWithAssetPath = window as AssetPathWindow;

if (
  typeof windowWithAssetPath.EXCALIDRAW_ASSET_PATH !== "string" ||
  windowWithAssetPath.EXCALIDRAW_ASSET_PATH.length === 0
) {
  windowWithAssetPath.EXCALIDRAW_ASSET_PATH = new URL(
    import.meta.env.BASE_URL,
    window.location.origin,
  ).toString();
}
