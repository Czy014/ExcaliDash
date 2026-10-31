import type { RequestHandler } from "express";
import type { PrismaClient } from "../generated/client";

// Keep the existing disabled-mode owner so upgrading does not hide drawings.
export const WORKSPACE_USER_ID = "bootstrap-admin";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string };
    }
  }
}

export const createWorkspaceMiddleware =
  (db: PrismaClient): RequestHandler =>
  async (req, _res, next) => {
    try {
      const existing = await db.user.findUnique({
        where: { id: WORKSPACE_USER_ID },
        select: { id: true },
      });
      req.user =
        existing ??
        (await db.user.upsert({
          where: { id: WORKSPACE_USER_ID },
          update: {},
          create: {
            id: WORKSPACE_USER_ID,
            email: "bootstrap@excalidash.local",
            passwordHash: "",
            name: "Workspace",
            isActive: false,
          },
          select: { id: true },
        }));
      next();
    } catch (error) {
      next(error);
    }
  };
