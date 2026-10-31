import { WORKSPACE_USER_ID } from "../../middleware/workspace";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { rewritePreviewForInternedFiles } from "../../fileProcessing";
import {
  getUserTrashCollectionId,
  isTrashCollectionId,
  toPublicTrashCollectionId,
} from "./trash";
import type { DrawingRouteContext } from "./drawingRouteContext";

export const registerDrawingDeleteDuplicateRoutes = (
  app: express.Express,
  context: DrawingRouteContext,
) => {
  const {
    prisma,
    asyncHandler,
    ensureTrashCollection,
    invalidateDrawingsCache,
    config,
    logAuditEvent,
    parseJsonField,
    cleanupS3FilesForDrawing,
    cloneS3FileReferences,
  } = context;
  app.delete(
    "/drawings/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const drawing = await prisma.drawing.findFirst({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (!drawing) return res.status(404).json({ error: "Drawing not found" });

      // Delete S3 objects (and their S3File rows) BEFORE the drawing row.
      // S3File has no FK to Drawing, so removing the row would not cascade —
      // if we deleted the row first and then crashed, the S3 objects would
      // be orphaned with no drawing left to drive re-cleanup (a permanent
      // storage leak). Doing S3 first means a failure aborts before the row
      // is removed, so the user can simply retry the delete.
      try {
        await cleanupS3FilesForDrawing(id, WORKSPACE_USER_ID);
      } catch (error) {
        console.warn("[s3] Failed to cleanup deleted drawing files", {
          drawingId: id,
          error,
        });
      }

      const deleteResult = await prisma.drawing.deleteMany({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (deleteResult.count === 0) {
        return res.status(404).json({ error: "Drawing not found" });
      }
      invalidateDrawingsCache();

      if (config.enableAuditLogging) {
        await logAuditEvent({
          userId: WORKSPACE_USER_ID,
          action: "drawing_deleted",
          resource: `drawing:${id}`,
          ipAddress: req.ip || req.connection.remoteAddress || undefined,
          userAgent: req.headers["user-agent"] || undefined,
          details: { drawingId: id, drawingName: drawing.name },
        });
      }

      return res.json({ success: true });
    }),
  );

  app.post(
    "/drawings/:id/duplicate",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const original = await prisma.drawing.findFirst({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (!original)
        return res.status(404).json({ error: "Original drawing not found" });
      let duplicatedCollectionId = original.collectionId;
      if (isTrashCollectionId(original.collectionId, WORKSPACE_USER_ID)) {
        await ensureTrashCollection(prisma, WORKSPACE_USER_ID);
        duplicatedCollectionId = getUserTrashCollectionId(WORKSPACE_USER_ID);
      }

      const newDrawingId = uuidv4();
      const originalFiles = parseJsonField<Record<string, any>>(
        original.files,
        {},
      );
      const duplicatedFiles = await cloneS3FileReferences(
        original.id,
        newDrawingId,
        WORKSPACE_USER_ID,
        originalFiles,
      );
      const duplicatedPreview = rewritePreviewForInternedFiles(
        original.preview ?? null,
        originalFiles,
        duplicatedFiles,
      );

      const newDrawing = await prisma.drawing.create({
        data: {
          id: newDrawingId,
          name: `${original.name} (Copy)`,
          elements: original.elements,
          appState: original.appState,
          files: JSON.stringify(duplicatedFiles),
          preview:
            typeof duplicatedPreview === "string"
              ? duplicatedPreview
              : original.preview,
          userId: WORKSPACE_USER_ID,
          collectionId: duplicatedCollectionId,
          version: 1,
        },
      });
      invalidateDrawingsCache();

      return res.json({
        ...newDrawing,
        collectionId: toPublicTrashCollectionId(
          newDrawing.collectionId,
          WORKSPACE_USER_ID,
        ),
        elements: parseJsonField(newDrawing.elements, []),
        appState: parseJsonField(newDrawing.appState, {}),
        files: parseJsonField(newDrawing.files, {}),
      });
    }),
  );
};
