import { WORKSPACE_USER_ID } from "../../middleware/workspace";
import express from "express";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "../../generated/client";
import {
  canEditDrawing,
  getDrawingAccess,
  isOwnerAccess,
} from "../../authz/sharing";
import { rewritePreviewForInternedFiles } from "../../fileProcessing";
import {
  getUserTrashCollectionId,
  isTrashCollectionId,
  toInternalTrashCollectionId,
  toPublicTrashCollectionId,
} from "./trash";
import type { DrawingRouteContext } from "./drawingRouteContext";
import { applySceneUpdateTx, isVersionConflict } from "./sceneUpdate";
import { collectRetainedDrawingFileIds } from "../storage/retainedFiles";

export const registerDrawingCreateUpdateRoutes = (
  app: express.Express,
  context: DrawingRouteContext,
) => {
  const {
    prisma,
    asyncHandler,
    validateImportedDrawing,
    drawingCreateSchema,
    drawingUpdateSchema,
    respondWithValidationErrors,
    ensureTrashCollection,
    invalidateDrawingsCache,
    config,
    internDrawingFiles,
    parseJsonField,
  } = context;

  // Compensate only failed creation under this request's unpublished UUID.
  // Failed updates keep their tracked rows for version-guarded trim: another
  // editor may be committing references to those bytes at the same time.
  const cleanupUnreferencedInternedFiles = async (
    drawingId: string,
    knownBefore: Set<string>,
    processedFiles: Record<string, unknown> | undefined,
  ): Promise<void> => {
    const candidates = Object.keys(processedFiles ?? {}).filter(
      (fileId) => !knownBefore.has(fileId),
    );
    if (candidates.length === 0) return;
    try {
      await prisma.$transaction(async (tx) => {
        const referenced = await collectRetainedDrawingFileIds(tx, drawingId);
        if (!referenced) return;
        const deletable = candidates.filter(
          (fileId) => !referenced.has(fileId),
        );
        if (deletable.length === 0) return;
        await tx.drawingFile.deleteMany({
          where: { drawingId, fileId: { in: deletable } },
        });
      });
    } catch (cleanupError) {
      // Best-effort: a failed sweep only leaves rows for a later trim pass.
      console.warn("[files] interned-file cleanup failed:", cleanupError);
    }
  };

  const listDrawingFileIds = async (
    drawingId: string,
  ): Promise<Set<string>> => {
    const rows = await prisma.drawingFile.findMany({
      where: { drawingId },
      select: { fileId: true },
    });
    return new Set(rows.map((row) => row.fileId));
  };
  app.post(
    "/drawings",
    asyncHandler(async (req, res) => {
      const isImportedDrawing = req.headers["x-imported-file"] === "true";
      if (isImportedDrawing && !validateImportedDrawing(req.body)) {
        return res.status(400).json({
          error: "Invalid imported drawing file",
          message:
            "The imported file contains potentially malicious content or invalid structure",
        });
      }

      const parsed = drawingCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return respondWithValidationErrors(res, parsed.error.issues);
      }

      const payload = parsed.data as {
        name?: string;
        collectionId?: string | null;
        elements: unknown;
        appState: Record<string, unknown>;
        preview?: string | null;
        files?: Record<string, unknown>;
      };

      const drawingName = payload.name ?? "Untitled Drawing";
      const targetCollectionIdRaw =
        payload.collectionId === undefined ? null : payload.collectionId;
      const targetCollectionId =
        toInternalTrashCollectionId(targetCollectionIdRaw, WORKSPACE_USER_ID) ??
        null;

      if (
        targetCollectionId &&
        !isTrashCollectionId(targetCollectionId, WORKSPACE_USER_ID)
      ) {
        const collection = await prisma.collection.findFirst({
          where: { id: targetCollectionId },
        });
        if (!collection)
          return res.status(404).json({ error: "Collection not found" });

        if (collection.userId !== WORKSPACE_USER_ID) {
          return res.status(404).json({ error: "Collection not found" });
        }
      } else if (targetCollectionIdRaw === "trash") {
        await ensureTrashCollection(prisma, WORKSPACE_USER_ID);
      }

      const newDrawingId = uuidv4();
      const originalFiles = payload.files ?? {};
      const knownFileIdsBefore = await listDrawingFileIds(newDrawingId);
      const processedFiles = await internDrawingFiles(
        originalFiles,
        WORKSPACE_USER_ID,
        newDrawingId,
      );
      const rewritten = rewritePreviewForInternedFiles(
        payload.preview ?? null,
        originalFiles,
        processedFiles,
      );
      const processedPreview: string | null =
        typeof rewritten === "string" ? rewritten : null;

      let newDrawing;
      try {
        newDrawing = await prisma.drawing.create({
          data: {
            id: newDrawingId,
            name: drawingName,
            elements: JSON.stringify(payload.elements),
            appState: JSON.stringify(payload.appState),
            userId: WORKSPACE_USER_ID,
            collectionId: targetCollectionId,
            preview: processedPreview,
            files: JSON.stringify(processedFiles),
          },
        });
      } catch (error) {
        await cleanupUnreferencedInternedFiles(
          newDrawingId,
          knownFileIdsBefore,
          processedFiles,
        );
        throw error;
      }
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

  app.put(
    "/drawings/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const access = await getDrawingAccess({
        prisma,
        drawingId: id,
      });
      if (!canEditDrawing(access)) {
        return res.status(404).json({
          error: "Drawing not found",
          message: "Drawing does not exist",
        });
      }

      const existingDrawing = await prisma.drawing.findUnique({
        where: { id },
      });
      if (!existingDrawing)
        return res.status(404).json({ error: "Drawing not found" });

      const parsed = drawingUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        if (config.nodeEnv === "development") {
          console.error("[API] Validation failed", {
            id,
            errors: parsed.error.issues,
          });
        }
        return respondWithValidationErrors(res, parsed.error.issues);
      }

      const payload = parsed.data as {
        name?: string;
        collectionId?: string | null;
        elements?: unknown;
        appState?: Record<string, unknown>;
        preview?: string | null;
        files?: Record<string, unknown>;
        version?: number;
      };

      const ownerUserId = existingDrawing.userId;
      const trashCollectionId = getUserTrashCollectionId(ownerUserId);
      const isSceneUpdate =
        payload.elements !== undefined ||
        payload.appState !== undefined ||
        payload.files !== undefined;

      if (
        isSceneUpdate &&
        payload.version !== undefined &&
        payload.version !== existingDrawing.version
      ) {
        return res.status(409).json({
          error: "Conflict",
          code: "VERSION_CONFLICT",
          message: "Drawing has changed since this editor state was loaded.",
          currentVersion: existingDrawing.version,
        });
      }
      // `version` is owned by applySceneUpdateTx for scene updates; do not set
      // it here.
      const data: Prisma.DrawingUpdateInput = {};

      if (payload.name !== undefined) data.name = payload.name;
      if (payload.elements !== undefined)
        data.elements = JSON.stringify(payload.elements);
      if (payload.appState !== undefined)
        data.appState = JSON.stringify(payload.appState);
      let processedFilesForUpdate: Record<string, unknown> | undefined;
      let requiredFileIdsForUpdate: string[] | undefined;
      let knownFileIdsBeforeUpdate: Set<string> | null = null;
      if (payload.files !== undefined) {
        knownFileIdsBeforeUpdate = await listDrawingFileIds(id);
        processedFilesForUpdate = await internDrawingFiles(
          payload.files,
          ownerUserId,
          id,
        );
        requiredFileIdsForUpdate = Object.entries(processedFilesForUpdate)
          .filter(([fileId, file]) => {
            const processedUrl = (file as { dataURL?: unknown } | null)
              ?.dataURL;
            const originalUrl = (
              payload.files?.[fileId] as { dataURL?: unknown } | null
            )?.dataURL;
            return (
              knownFileIdsBeforeUpdate!.has(fileId) ||
              processedUrl === `/api/files/${id}/${fileId}` ||
              (typeof originalUrl === "string" &&
                originalUrl.startsWith("data:") &&
                typeof processedUrl === "string" &&
                processedUrl !== originalUrl)
            );
          })
          .map(([fileId]) => fileId);
        // Note: data.files is not assigned here. The union merge with the
        // authoritative current state happens inside the transaction so a
        // concurrent client's files are never whole-replaced away.
      }
      if (payload.preview !== undefined) {
        const processedPreview: unknown = processedFilesForUpdate
          ? rewritePreviewForInternedFiles(
              payload.preview,
              payload.files ?? {},
              processedFilesForUpdate,
            )
          : payload.preview;
        data.preview =
          typeof processedPreview === "string" ? processedPreview : null;
      }

      if (payload.collectionId !== undefined) {
        if (!isOwnerAccess(access)) {
          return res.status(403).json({
            error: "Forbidden",
            message: "Only the owner can move drawings between collections",
          });
        }
        if (payload.collectionId === "trash") {
          await ensureTrashCollection(prisma, ownerUserId);
          (data as Prisma.DrawingUncheckedUpdateInput).collectionId =
            trashCollectionId;
        } else if (payload.collectionId) {
          const ownedCollection = await prisma.collection.findFirst({
            where: { id: payload.collectionId, userId: WORKSPACE_USER_ID },
          });
          if (!ownedCollection) {
            return res.status(404).json({ error: "Collection not found" });
          }
          (data as Prisma.DrawingUncheckedUpdateInput).collectionId =
            payload.collectionId;
        } else {
          (data as Prisma.DrawingUncheckedUpdateInput).collectionId = null;
        }
      }

      let updatedDrawing: typeof existingDrawing | null = null;

      try {
        if (isSceneUpdate) {
          const result = await applySceneUpdateTx({
            prisma,
            drawingId: id,
            parseJsonField,
            versionGuard:
              payload.version !== undefined ? payload.version : "optimistic",
            maxRetries: payload.version === undefined ? 2 : 0,
            mutate: () => ({
              data,
              incomingFiles: processedFilesForUpdate,
              requiredFileIds: requiredFileIdsForUpdate,
            }),
          });
          updatedDrawing = result.drawing;
        } else {
          const updateResult = await prisma.drawing.updateMany({
            where: { id },
            data,
          });
          if (updateResult.count === 0) {
            return res.status(404).json({ error: "Drawing not found" });
          }
          updatedDrawing = await prisma.drawing.findFirst({
            where: { id },
          });
        }
      } catch (error) {
        // Do not reclaim interned rows here. Under PostgreSQL READ COMMITTED,
        // a concurrent valid save may have checked these rows without having
        // committed its scene yet. Guarded trim reclaims unused rows and their
        // exact S3 generations after owning the drawing's version update.
        if (isVersionConflict(error)) {
          const latestDrawing = await prisma.drawing.findFirst({
            where: { id },
            select: { version: true },
          });
          if (isSceneUpdate) {
            return res.status(409).json({
              error: "Conflict",
              code: "VERSION_CONFLICT",
              message:
                "Drawing has changed since this editor state was loaded.",
              currentVersion: latestDrawing?.version ?? null,
            });
          }
        }
        throw error;
      }
      if (!updatedDrawing) {
        return res.status(404).json({ error: "Drawing not found" });
      }
      invalidateDrawingsCache();

      const savedElements = parseJsonField(updatedDrawing.elements, []);
      const savedFiles = parseJsonField(updatedDrawing.files, {});

      return res.json({
        ...updatedDrawing,
        collectionId: toPublicTrashCollectionId(
          updatedDrawing.collectionId,
          ownerUserId,
        ),
        elements: savedElements,
        appState: parseJsonField(updatedDrawing.appState, {}),
        files: savedFiles,
        accessLevel: access,
      });
    }),
  );
};
