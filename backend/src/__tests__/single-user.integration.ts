import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import express from "express";
import request from "supertest";
import {
  createWorkspaceMiddleware,
  WORKSPACE_USER_ID,
} from "../middleware/workspace";
import { cleanupTestDb, getTestPrisma, setupTestDb } from "./testUtils";

describe("single-user workspace", () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let app: import("express").Express;
  let agent: ReturnType<typeof request.agent>;
  let csrf: { token: string; header: string };

  beforeAll(async () => {
    setupTestDb();
    prisma = getTestPrisma();
    ({ app } = await import("../index"));
    agent = request.agent(app);
    csrf = (await agent.get("/csrf-token")).body;
  });
  beforeEach(async () => cleanupTestDb(prisma));
  afterAll(async () => prisma.$disconnect());

  const createDrawing = () =>
    agent.post("/drawings").set(csrf.header, csrf.token).send({
      name: "Workspace drawing",
      elements: [],
      appState: {},
      files: {},
    });

  it("creates the existing disabled-mode owner on concurrent credential-free reads", async () => {
    const responses = await Promise.all(
      Array.from({ length: 3 }, () => request(app).get("/drawings")),
    );
    expect(responses.map((response) => response.status)).toEqual([
      200, 200, 200,
    ]);
    expect(await prisma.user.count({ where: { id: WORKSPACE_USER_ID } })).toBe(
      1,
    );
  });

  it("initializes once for concurrent and subsequent requests without changing existing workspace data", async () => {
    await request(app).get("/drawings").expect(200);
    await prisma.user.update({
      where: { id: WORKSPACE_USER_ID },
      data: { name: "Existing workspace" },
    });
    const upsert = vi.spyOn(prisma.user, "upsert");
    const isolated = express();
    isolated.use(createWorkspaceMiddleware(prisma));
    isolated.get("/ready", (_req, res) => res.sendStatus(200));
    try {
      const responses = await Promise.all(
        Array.from({ length: 3 }, () => request(isolated).get("/ready")),
      );
      expect(responses.map((response) => response.status)).toEqual([
        200, 200, 200,
      ]);
      await request(isolated).get("/ready").expect(200);
      expect(upsert).toHaveBeenCalledTimes(1);
      expect(
        (
          await prisma.user.findUniqueOrThrow({
            where: { id: WORKSPACE_USER_ID },
          })
        ).name,
      ).toBe("Existing workspace");
    } finally {
      upsert.mockRestore();
    }
  });

  it("retries workspace initialization after a database failure", async () => {
    const upsert = vi
      .spyOn(prisma.user, "upsert")
      .mockRejectedValueOnce(new Error("Database temporarily unavailable"));
    const isolated = express();
    isolated.use(createWorkspaceMiddleware(prisma));
    isolated.get("/ready", (_req, res) => res.sendStatus(200));
    const onError: express.ErrorRequestHandler = (_error, _req, res, _next) => {
      res.sendStatus(503);
    };
    isolated.use(onError);
    try {
      await request(isolated).get("/ready").expect(503);
      await request(isolated).get("/ready").expect(200);
      await request(isolated).get("/ready").expect(200);
      expect(upsert).toHaveBeenCalledTimes(2);
    } finally {
      upsert.mockRestore();
    }
  });

  it("invalidates cached list variants when a drawing is created", async () => {
    const paths = ["/drawings?sortField=name", "/drawings?collectionId=null"];
    for (const path of paths) {
      await agent.get(path).expect(200);
      await agent.get(path).expect("X-Cache", "HIT");
    }
    const created = await createDrawing();
    expect(created.status).toBe(200);
    for (const path of paths) {
      const response = await agent.get(path).expect("X-Cache", "MISS");
      expect(
        response.body.drawings.map((drawing: { id: string }) => drawing.id),
      ).toContain(created.body.id);
    }
  });

  it("keeps the same owner, scene version checks and history without credentials", async () => {
    await prisma.systemConfig.upsert({
      where: { id: "default" },
      update: { authEnabled: true },
      create: { id: "default", authEnabled: true },
    });
    const created = await createDrawing();
    expect(created.status).toBe(200);
    const stored = await prisma.drawing.findUniqueOrThrow({
      where: { id: created.body.id },
    });
    expect(stored.userId).toBe(WORKSPACE_USER_ID);
    await agent
      .put(`/drawings/${stored.id}`)
      .set(csrf.header, csrf.token)
      .send({ elements: [], version: stored.version })
      .expect(200);
    await agent
      .put(`/drawings/${stored.id}`)
      .set(csrf.header, csrf.token)
      .send({ elements: [], version: stored.version })
      .expect(409);
    expect(
      await prisma.drawingSnapshot.count({ where: { drawingId: stored.id } }),
    ).toBe(1);
  });

  it("does not revive removed authentication or sharing routes", async () => {
    for (const url of [
      "/auth/status",
      "/auth/me",
      "/auth/api-keys",
      "/auth/users",
      "/auth/oidc/start",
    ]) {
      await agent.get(url).expect(404);
    }
    await agent
      .post("/auth/login")
      .set(csrf.header, csrf.token)
      .send({})
      .expect(404);
    const created = await createDrawing();
    await agent.get(`/drawings/${created.body.id}/sharing`).expect(404);
    await agent
      .post(`/drawings/${created.body.id}/link-shares`)
      .set(csrf.header, csrf.token)
      .send({ permission: "edit" })
      .expect(404);
    await agent
      .delete(`/drawings/${created.body.id}/link-shares/old`)
      .set(csrf.header, csrf.token)
      .expect(404);
    await agent
      .get(`/drawings/${created.body.id}/share-resolve?q=old`)
      .expect(404);
    await agent
      .post(`/drawings/${created.body.id}/permissions`)
      .set(csrf.header, csrf.token)
      .send({})
      .expect(404);
    await agent.get("/collections/old/shares").expect(404);
  });

  it("still requires a bound CSRF token and an allowed request origin", async () => {
    await request(app).post("/drawings").send({ name: "Blocked" }).expect(403);
    await request(app)
      .post("/drawings")
      .set("Authorization", "Bearer edk_obsolete")
      .send({ name: "Blocked key bypass" })
      .expect(403);
    await request(app)
      .post("/drawings")
      .set(csrf.header, csrf.token)
      .send({ name: "Wrong browser" })
      .expect(403);
    await agent
      .post("/drawings")
      .set(csrf.header, csrf.token)
      .set("Origin", "https://untrusted.example")
      .send({ name: "Blocked origin" })
      .expect(403);
    expect(await prisma.drawing.count()).toBe(0);
    expect((await createDrawing()).status).toBe(200);
  });

  it("keeps historical user data intact and does not adopt their ACL grants", async () => {
    await request(app).get("/drawings").expect(200);
    const historical = await prisma.user.create({
      data: {
        email: "historical@test.local",
        name: "Historical",
        passwordHash: "retained",
      },
    });
    const drawing = await prisma.drawing.create({
      data: {
        userId: historical.id,
        name: "Historical drawing",
        elements: "[]",
        appState: "{}",
      },
    });
    await prisma.drawingPermission.create({
      data: {
        drawingId: drawing.id,
        granteeUserId: WORKSPACE_USER_ID,
        createdByUserId: historical.id,
        permission: "edit",
      },
    });
    await agent
      .get(`/drawings/${drawing.id}`)
      .set("Authorization", "Bearer obsolete")
      .set("Cookie", "excalidash-access-token=obsolete")
      .set("x-test-user-id", historical.id)
      .expect(404);
    const list = await agent.get("/drawings");
    expect(list.body.totalCount).toBe(0);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: historical.id } }))
        .passwordHash,
    ).toBe("retained");
    expect(
      await prisma.drawing.findUnique({ where: { id: drawing.id } }),
    ).not.toBeNull();
    expect(
      await prisma.drawingPermission.count({
        where: { drawingId: drawing.id },
      }),
    ).toBe(1);
  });

  it.each(["view", "edit"])(
    "ignores historical %s links without deleting their data",
    async (permission) => {
      await request(app).get("/drawings").expect(200);
      const historical = await prisma.user.create({
        data: {
          email: `link-${permission}-owner@test.local`,
          name: "Historical",
          passwordHash: "retained",
        },
      });
      const drawing = await prisma.drawing.create({
        data: {
          userId: historical.id,
          name: "Link drawing",
          elements: "[]",
          appState: "{}",
        },
      });
      const share = await prisma.drawingLinkShare.create({
        data: {
          drawingId: drawing.id,
          tokenHash: "legacy-hash",
          permission,
          createdByUserId: historical.id,
        },
      });
      const snapshot = await prisma.drawingSnapshot.create({
        data: {
          drawingId: drawing.id,
          version: drawing.version,
          elements: "[]",
          appState: "{}",
          files: "{}",
        },
      });
      const bytes = Buffer.from([1, 2, 3]);
      await prisma.drawingFile.create({
        data: {
          drawingId: drawing.id,
          fileId: "historical-image",
          mimeType: "image/png",
          sizeBytes: bytes.length,
          storage: "db",
          data: bytes,
        },
      });
      for (const path of [
        `/drawings/${drawing.id}`,
        `/drawings/${drawing.id}/preview`,
        `/drawings/${drawing.id}/history`,
        `/drawings/${drawing.id}/history/${snapshot.id}`,
        `/files/${drawing.id}/historical-image`,
      ]) {
        await agent.get(path).expect(404);
      }
      await agent
        .put(`/drawings/${drawing.id}`)
        .set(csrf.header, csrf.token)
        .send({ name: "Blocked" })
        .expect(404);
      await agent
        .post(`/drawings/${drawing.id}/history/${snapshot.id}/restore`)
        .set(csrf.header, csrf.token)
        .send({})
        .expect(404);
      await agent
        .put(`/drawings/${drawing.id}/files/new-image`)
        .set(csrf.header, csrf.token)
        .set("Content-Type", "image/png")
        .send(bytes)
        .expect(404);
      expect(
        await prisma.drawingLinkShare.findUnique({ where: { id: share.id } }),
      ).toEqual(share);
      expect(
        await prisma.drawing.findUnique({ where: { id: drawing.id } }),
      ).toEqual(drawing);
      expect(
        await prisma.drawingSnapshot.count({
          where: { drawingId: drawing.id },
        }),
      ).toBe(1);
      expect(
        await prisma.drawingFile.count({ where: { drawingId: drawing.id } }),
      ).toBe(1);
    },
  );
});
