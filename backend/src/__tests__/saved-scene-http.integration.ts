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
import { z } from "zod";
import type { PrismaClient } from "../generated/client";
import { registerDrawingCreateUpdateRoutes } from "../routes/dashboard/drawingCreateUpdateRoutes";
import type { DrawingRouteContext } from "../routes/dashboard/drawingRouteContext";
import { cleanupTestDb, getTestPrisma, setupTestDb } from "./testUtils";

describe("HTTP scene persistence", () => {
  let prisma: PrismaClient;
  let ownerId: string;
  let app: express.Express;

  beforeAll(async () => {
    setupTestDb();
    prisma = getTestPrisma();
    const owner = await prisma.user.create({
      data: {
        email: "saved-scene@test.local",
        passwordHash: "unused",
        name: "Owner",
      },
    });
    ownerId = owner.id;
    const auth: express.RequestHandler = (req, _res, next) => {
      req.user = { id: ownerId } as express.Request["user"];
      next();
    };
    app = express();
    app.use(express.json());
    registerDrawingCreateUpdateRoutes(app, {
      prisma,
      workspace: auth,
      asyncHandler: (handler) => (req, res, next) => {
        void handler(req, res, next).catch(next);
      },
      parseJsonField: (raw, fallback) => (raw ? JSON.parse(raw) : fallback),
      drawingUpdateSchema: z.object({
        elements: z.array(z.any()).optional(),
        files: z.record(z.string(), z.any()).optional(),
        preview: z.string().optional(),
        version: z.number().optional(),
      }),
      getRequestPrincipal: async () => ({ kind: "user", userId: ownerId }),
      invalidateDrawingsCache: vi.fn(),
      config: { nodeEnv: "test" },
      internDrawingFiles: async (files) => files,
    } as DrawingRouteContext);
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await cleanupTestDb(prisma);
  });
  afterAll(async () => prisma.$disconnect());

  const createDrawing = () =>
    prisma.drawing.create({
      data: {
        userId: ownerId,
        name: "Saved scene",
        elements: JSON.stringify([{ id: "earlier", version: 1 }]),
        appState: "{}",
        files: JSON.stringify({
          earlierImage: { dataURL: "https://example.test/earlier.png" },
        }),
        version: 3,
      },
    });

  it("returns the committed scene and merged files without a collaboration server", async () => {
    const drawing = await createDrawing();
    const elements = [
      { id: "earlier", version: 1 },
      { id: "new", version: 1 },
    ];
    const response = await request(app)
      .put(`/drawings/${drawing.id}`)
      .send({
        elements,
        files: { newImage: { dataURL: "https://example.test/new.png" } },
        version: 3,
      });
    expect(response.status).toBe(200);
    expect(response.body.version).toBe(4);
    expect(response.body.elements).toEqual(elements);
    const saved = await prisma.drawing.findUniqueOrThrow({
      where: { id: drawing.id },
    });
    expect(JSON.parse(saved.elements)).toEqual(elements);
    expect(response.body.files).toHaveProperty("earlierImage");
    expect(response.body.files).toHaveProperty("newImage");
  });

  it("rejects a stale version without changing the saved scene", async () => {
    const drawing = await createDrawing();
    await request(app)
      .put(`/drawings/${drawing.id}`)
      .send({ elements: [{ id: "stale" }], version: 2 })
      .expect(409);
    const saved = await prisma.drawing.findUniqueOrThrow({
      where: { id: drawing.id },
    });
    expect(saved.version).toBe(3);
    expect(JSON.parse(saved.elements)).toEqual([{ id: "earlier", version: 1 }]);
  });

  it("does not change the scene version for preview-only updates", async () => {
    const drawing = await createDrawing();
    await request(app)
      .put(`/drawings/${drawing.id}`)
      .send({ preview: "<svg></svg>" })
      .expect(200);
    const saved = await prisma.drawing.findUniqueOrThrow({
      where: { id: drawing.id },
    });
    expect(saved.version).toBe(3);
    expect(saved.preview).toBe("<svg></svg>");
  });
  it("allows at most one of two simultaneous saves based on the same version", async () => {
    const drawing = await createDrawing();
    const responses = await Promise.all(
      ["a", "b"].map((id) =>
        request(app)
          .put(`/drawings/${drawing.id}`)
          .send({ elements: [{ id }], version: 3 }),
      ),
    );
    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);
    const winner = responses.find((response) => response.status === 200)!;
    const loser = responses.find((response) => response.status === 409)!;
    expect(loser.body.code).toBe("VERSION_CONFLICT");
    const saved = await prisma.drawing.findUniqueOrThrow({
      where: { id: drawing.id },
    });
    expect(JSON.parse(saved.elements)).toEqual(winner.body.elements);
    expect(saved.version).toBe(4);
  });
});
