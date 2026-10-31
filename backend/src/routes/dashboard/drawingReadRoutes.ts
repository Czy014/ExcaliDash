import { WORKSPACE_USER_ID } from "../../middleware/workspace";
import express from "express";
import { toPublicTrashCollectionId } from "./trash";
import type { DrawingRouteContext } from "./drawingRouteContext";

export const registerDrawingReadRoutes = (
  app: express.Express,
  context: DrawingRouteContext,
) => {
  const { prisma, asyncHandler, parseJsonField } = context;
  app.get(
    "/drawings/:id",
    asyncHandler(async (req, res) => {
      const { id } = req.params;
      const drawing = await prisma.drawing.findFirst({
        where: { id, userId: WORKSPACE_USER_ID },
      });
      if (!drawing) {
        return res.status(404).json({
          error: "Drawing not found",
          message: "Drawing does not exist",
        });
      }

      return res.json({
        ...drawing,
        collectionId: toPublicTrashCollectionId(
          drawing.collectionId,
          WORKSPACE_USER_ID,
        ),
        elements: parseJsonField(drawing.elements, []),
        appState: parseJsonField(drawing.appState, {}),
        files: parseJsonField(drawing.files, {}),
        accessLevel: "owner",
      });
    }),
  );
};
