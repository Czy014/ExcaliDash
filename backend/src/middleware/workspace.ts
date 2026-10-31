import type { RequestHandler } from "express";
import type { PrismaClient } from "../generated/client";

// Keep the existing disabled-mode owner so upgrading does not hide drawings.
export const WORKSPACE_USER_ID = "bootstrap-admin";

export const createWorkspaceMiddleware = (db: PrismaClient): RequestHandler => {
  let ready: Promise<{ id: string }> | undefined;
  return async (_req, _res, next) => {
    try {
      await (ready ??= Promise.resolve(
        db.user.upsert({
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
        }),
      ));
      next();
    } catch (error) {
      ready = undefined;
      next(error);
    }
  };
};
