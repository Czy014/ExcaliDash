import { WORKSPACE_USER_ID } from "../../middleware/workspace";
import express from "express";
import { DashboardRouteDeps } from "./types";
import { getUserTrashCollectionId, isTrashCollectionId } from "./trash";

export const registerCollectionRoutes = (
  app: express.Express,
  deps: DashboardRouteDeps,
) => {
  const {
    prisma,
    asyncHandler,
    collectionNameSchema,
    sanitizeText,
    ensureTrashCollection,
    invalidateDrawingsCache,
    config,
    logAuditEvent,
  } = deps;

  // GET /collections — workspace collections
  app.get(
    "/collections",
    asyncHandler(async (req, res) => {
      const trashCollectionId = getUserTrashCollectionId(WORKSPACE_USER_ID);
      await ensureTrashCollection(prisma, WORKSPACE_USER_ID);

      const rawCollections = await prisma.collection.findMany({
        where: { userId: WORKSPACE_USER_ID },
        orderBy: { createdAt: "desc" },
      });
      const hasInternalTrash = rawCollections.some(
        (c) => c.id === trashCollectionId,
      );
      const collections = rawCollections
        .filter(
          (collection) => !(hasInternalTrash && collection.id === "trash"),
        )
        .map((collection) => ({
          ...collection,
          id: collection.id === trashCollectionId ? "trash" : collection.id,
        }));
      return res.json(collections);
    }),
  );

  // POST /collections
  app.post(
    "/collections",
    asyncHandler(async (req, res) => {
      const parsed = collectionNameSchema.safeParse(req.body.name);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation error",
          message: "Collection name must be between 1 and 100 characters",
        });
      }

      const sanitizedName = sanitizeText(parsed.data, 100);
      const newCollection = await prisma.collection.create({
        data: { name: sanitizedName, userId: WORKSPACE_USER_ID },
      });
      return res.json(newCollection);
    }),
  );

  // PUT /collections/:id — owner only
  app.put(
    "/collections/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (isTrashCollectionId(id, WORKSPACE_USER_ID)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Trash collection cannot be renamed",
        });
      }
      const existing = await prisma.collection.findFirst({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (!existing)
        return res.status(404).json({ error: "Collection not found" });

      const parsed = collectionNameSchema.safeParse(req.body.name);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation error",
          message: "Collection name must be between 1 and 100 characters",
        });
      }

      const sanitizedName = sanitizeText(parsed.data, 100);
      await prisma.collection.updateMany({
        where: { id, userId: WORKSPACE_USER_ID },
        data: { name: sanitizedName },
      });
      const updated = await prisma.collection.findFirst({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (!updated)
        return res.status(404).json({ error: "Collection not found" });
      return res.json(updated);
    }),
  );

  // DELETE /collections/:id — owner only
  app.delete(
    "/collections/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      if (isTrashCollectionId(id, WORKSPACE_USER_ID)) {
        return res.status(400).json({
          error: "Validation error",
          message: "Trash collection cannot be deleted",
        });
      }
      const collection = await prisma.collection.findFirst({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (!collection)
        return res.status(404).json({ error: "Collection not found" });

      await prisma.$transaction([
        prisma.drawing.updateMany({
          where: { collectionId: id, userId: WORKSPACE_USER_ID },
          data: { collectionId: null },
        }),
        prisma.collectionShare.deleteMany({ where: { collectionId: id } }),
        prisma.collection.deleteMany({
          where: { id, userId: WORKSPACE_USER_ID },
        }),
      ]);
      invalidateDrawingsCache();

      if (config.enableAuditLogging) {
        await logAuditEvent({
          userId: WORKSPACE_USER_ID,
          action: "collection_deleted",
          resource: `collection:${id}`,
          ipAddress: req.ip || req.connection.remoteAddress || undefined,
          userAgent: req.headers["user-agent"] || undefined,
          details: { collectionId: id, collectionName: collection.name },
        });
      }

      return res.json({ success: true });
    }),
  );
};
