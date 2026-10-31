import type { PrismaClient } from "../generated/client";
import crypto from "crypto";
import { WORKSPACE_USER_ID } from "../middleware/workspace";

export type DrawingPermission = "view" | "edit";
export type DrawingAccess = "none" | DrawingPermission | "owner";

export const normalizeDrawingPermission = (
  input: unknown,
): DrawingPermission | null => {
  if (input === "view" || input === "edit") return input;
  return null;
};

export const buildShareLinkToken = (): string =>
  crypto.randomBytes(24).toString("base64url");

export const hashShareLinkToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const getDrawingAccess = async (params: {
  prisma: PrismaClient;
  drawingId: string;
  now?: Date;
}): Promise<DrawingAccess> => {
  const nowMs = (params.now ?? new Date()).getTime();

  const drawing = await params.prisma.drawing.findUnique({
    where: { id: params.drawingId },
    select: { userId: true },
  });
  if (!drawing) return "none";
  if (drawing.userId === WORKSPACE_USER_ID) return "owner";

  // Active links grant access to historical drawings outside this workspace.
  const linkPolicy = await getActiveLinkShareAccess({
    prisma: params.prisma,
    drawingId: params.drawingId,
    nowMs,
  });
  return linkPolicy ?? "none";
};

export const canViewDrawing = (
  access: DrawingAccess,
): access is Exclude<DrawingAccess, "none"> => access !== "none";

export const canEditDrawing = (
  access: DrawingAccess,
): access is Extract<DrawingAccess, "edit" | "owner"> =>
  access === "edit" || access === "owner";

export const isOwnerAccess = (access: DrawingAccess): boolean =>
  access === "owner";

const getActiveLinkShareAccess = async (params: {
  prisma: PrismaClient;
  drawingId: string;
  nowMs: number;
}): Promise<DrawingPermission | null> => {
  const linkShare = await params.prisma.drawingLinkShare.findFirst({
    where: {
      drawingId: params.drawingId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(params.nowMs) } }],
    },
    orderBy: { createdAt: "desc" },
    select: { permission: true },
  });
  return normalizeDrawingPermission(linkShare?.permission);
};
