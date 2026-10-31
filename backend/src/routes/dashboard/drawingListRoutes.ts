import { WORKSPACE_USER_ID } from "../../middleware/workspace";
import express from "express";
import { Prisma } from "../../generated/client";
import { canViewDrawing, getDrawingAccess } from "../../authz/sharing";
import { getUserTrashCollectionId, toPublicTrashCollectionId } from "./trash";
import { SortDirection, SortField } from "./types";
import type { DrawingRouteContext } from "./drawingRouteContext";

// Server-side page size applied when a client omits `limit`, so the list
// endpoints can never return an unbounded payload (previously every drawing,
// with inline previews, was serialized into a single response).
const DEFAULT_PAGE_SIZE = 50;

export const registerDrawingListRoutes = (
  app: express.Express,
  context: DrawingRouteContext,
) => {
  const {
    prisma,
    asyncHandler,
    parseJsonField,
    buildDrawingsCacheKey,
    getCachedDrawingsBody,
    cacheDrawingsResponse,
    MAX_PAGE_SIZE,
  } = context;

  const clampLimit = (raw: string | undefined): number => {
    const parsed = raw ? Number.parseInt(raw, 10) : undefined;
    if (parsed === undefined || !Number.isFinite(parsed))
      return DEFAULT_PAGE_SIZE;
    return Math.min(Math.max(parsed, 1), MAX_PAGE_SIZE);
  };
  const clampOffset = (raw: string | undefined): number => {
    const parsed = raw ? Number.parseInt(raw, 10) : undefined;
    if (parsed === undefined || !Number.isFinite(parsed)) return 0;
    return Math.max(parsed, 0);
  };

  app.get(
    "/drawings",
    asyncHandler(async (req, res) => {
      const trashCollectionId = getUserTrashCollectionId(WORKSPACE_USER_ID);
      const {
        search,
        collectionId,
        includeData,
        limit,
        offset,
        sortField,
        sortDirection,
      } = req.query;
      const where: Prisma.DrawingWhereInput = { userId: WORKSPACE_USER_ID };
      const searchTerm =
        typeof search === "string" && search.trim().length > 0
          ? search.trim()
          : undefined;

      if (searchTerm) {
        where.name = { contains: searchTerm };
      }

      let collectionFilterKey = "default";
      if (collectionId === "null") {
        where.collectionId = null;
        collectionFilterKey = "null";
      } else if (collectionId) {
        const normalizedCollectionId = String(collectionId);
        if (normalizedCollectionId === "trash") {
          where.collectionId = { in: [trashCollectionId, "trash"] };
          collectionFilterKey = "trash";
        } else {
          const collection = await prisma.collection.findFirst({
            where: { id: normalizedCollectionId },
          });
          if (!collection) {
            return res.status(404).json({ error: "Collection not found" });
          }

          if (collection.userId !== WORKSPACE_USER_ID) {
            return res.status(404).json({ error: "Collection not found" });
          }

          where.collectionId = normalizedCollectionId;
          collectionFilterKey = `id:${normalizedCollectionId}`;
        }
      } else {
        where.OR = [
          { collectionId: { notIn: [trashCollectionId, "trash"] } },
          { collectionId: null },
        ];
      }

      const shouldIncludeData =
        typeof includeData === "string"
          ? includeData.toLowerCase() === "true" || includeData === "1"
          : false;
      const parsedSortField: SortField =
        sortField === "name" ||
        sortField === "createdAt" ||
        sortField === "updatedAt"
          ? sortField
          : "updatedAt";
      const parsedSortDirection: SortDirection =
        sortDirection === "asc" || sortDirection === "desc"
          ? sortDirection
          : parsedSortField === "name"
            ? "asc"
            : "desc";

      const parsedLimit = clampLimit(limit as string | undefined);
      const parsedOffset = clampOffset(offset as string | undefined);

      const cacheKey =
        buildDrawingsCacheKey({
          searchTerm: searchTerm ?? "",
          collectionFilter: collectionFilterKey,
          includeData: shouldIncludeData,
          sortField: parsedSortField,
          sortDirection: parsedSortDirection,
        }) + `:${parsedLimit}:${parsedOffset}`;

      const cachedBody = getCachedDrawingsBody(cacheKey);
      if (cachedBody) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("Content-Type", "application/json");
        return res.send(cachedBody);
      }

      // Previews are intentionally excluded from list responses; they are served
      // per-drawing from GET /drawings/:id/preview (ETag-cacheable).
      const summarySelect: Prisma.DrawingSelect = {
        id: true,
        name: true,
        collectionId: true,
        version: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: { select: { id: true, name: true } },
      };

      const orderBy: Prisma.DrawingOrderByWithRelationInput =
        parsedSortField === "name"
          ? { name: parsedSortDirection }
          : parsedSortField === "createdAt"
            ? { createdAt: parsedSortDirection }
            : { updatedAt: parsedSortDirection };

      const queryOptions: Prisma.DrawingFindManyArgs = {
        where,
        orderBy,
        take: parsedLimit,
        skip: parsedOffset,
      };
      if (shouldIncludeData) {
        queryOptions.include = { user: { select: { name: true } } };
      } else {
        queryOptions.select = summarySelect;
      }

      const [drawings, totalCount] = await Promise.all([
        prisma.drawing.findMany(queryOptions),
        prisma.drawing.count({ where }),
      ]);

      let responsePayload: any[] = drawings as any[];
      if (shouldIncludeData) {
        responsePayload = (drawings as any[]).map((d: any) => ({
          ...d,
          collectionId: toPublicTrashCollectionId(
            d.collectionId,
            WORKSPACE_USER_ID,
          ),
          elements: parseJsonField(d.elements, []),
          appState: parseJsonField(d.appState, {}),
          files: parseJsonField(d.files, {}),
          creatorName: d.user?.name ?? null,
          user: undefined,
        }));
      } else {
        responsePayload = (drawings as any[]).map((d: any) => ({
          ...d,
          collectionId: toPublicTrashCollectionId(
            d.collectionId,
            WORKSPACE_USER_ID,
          ),
          creatorName: d.user?.name ?? null,
          user: undefined,
        }));
      }

      const finalResponse = {
        drawings: responsePayload,
        totalCount,
        limit: parsedLimit,
        offset: parsedOffset,
      };

      const body = cacheDrawingsResponse(cacheKey, finalResponse);
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Content-Type", "application/json");
      return res.send(body);
    }),
  );

  // Per-drawing preview: small, ETag-cacheable, revalidates against updatedAt.
  // Registered before `/drawings/:id` so previews aren't treated as an id.
  app.get(
    "/drawings/:id/preview",
    asyncHandler(async (req, res) => {
      const { id } = req.params;

      const access = await getDrawingAccess({
        prisma,
        drawingId: id,
      });
      if (!canViewDrawing(access)) {
        return res.status(404).json({
          error: "Drawing not found",
          message: "Drawing does not exist",
        });
      }

      const drawing = await prisma.drawing.findUnique({
        where: { id },
        select: { preview: true, updatedAt: true },
      });
      if (!drawing) {
        return res.status(404).json({
          error: "Drawing not found",
          message: "Drawing does not exist",
        });
      }

      const updatedAtMs = new Date(drawing.updatedAt).getTime();
      const etag = `W/"preview-${id}-${updatedAtMs}"`;
      res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
      res.setHeader("ETag", etag);
      if (req.headers["if-none-match"] === etag) {
        return res.status(304).end();
      }

      return res.json({
        preview: drawing.preview ?? null,
        updatedAt: updatedAtMs,
      });
    }),
  );
};
