import type { BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Excalidraw } from "@excalidraw/excalidraw";
import type { DrawingSnapshotFull } from "../../api";
import { getHistoryPreviewAppState } from "./historyPreview";
import { validateEmbeddableUrl } from "./shared";

export const HistoryPreviewCanvas = ({
  snapshot,
  theme,
}: {
  snapshot: DrawingSnapshotFull;
  theme: string;
}) => (
  <div
    className="absolute inset-0 z-20"
    aria-label="Historical drawing preview"
  >
    {/* Keep the live canvas mounted so pending saves cannot read this preview. */}
    <Excalidraw
      key={snapshot.id}
      initialData={{
        elements: Array.isArray(snapshot.elements)
          ? (snapshot.elements as ExcalidrawElement[])
          : [],
        appState: getHistoryPreviewAppState(snapshot.appState),
        files: (snapshot.files || {}) as BinaryFiles,
        scrollToContent: true,
      }}
      theme={theme === "dark" ? "dark" : "light"}
      langCode="en"
      viewModeEnabled
      zenModeEnabled
      validateEmbeddable={validateEmbeddableUrl}
    />
  </div>
);
