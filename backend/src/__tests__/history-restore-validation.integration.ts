import { WORKSPACE_USER_ID } from "../middleware/workspace";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { PrismaClient } from "../generated/client";
import { encodeSnapshotField } from "../snapshots/snapshotCodec";
import { cleanupTestDb, getTestPrisma, setupTestDb } from "./testUtils";

describe("history restore validation", () => {
  let prisma: PrismaClient;
  let app: any;
  let agent: any;
  let ownerId: string;
  let csrfHeader: string;
  let csrfToken: string;
  const userAgent = "vitest-history-validation";

  beforeAll(async () => {
    setupTestDb();
    prisma = getTestPrisma();
    ({ app } = await import("../index"));
    const owner = await prisma.user.create({
      data: {
        id: WORKSPACE_USER_ID,
        email: "history-validation@test.local",
        passwordHash: "unused-test-hash",
        name: "History owner",
        isActive: true,
      },
    });
    ownerId = owner.id;
    agent = request.agent(app);
    const csrf = await agent.get("/csrf-token").set("User-Agent", userAgent);
    csrfHeader = csrf.body.header;
    csrfToken = csrf.body.token;
  });

  beforeEach(async () => cleanupTestDb(prisma));
  afterAll(async () => prisma.$disconnect());

  it.each([
    ["elements", "not-json"],
    ["elements", "{}"],
    ["elements", "null"],
    ["appState", "not-json"],
    ["appState", "[]"],
    ["appState", "null"],
    ["files", "not-json"],
    ["files", "[]"],
    ["files", "null"],
    ["elements", encodeSnapshotField(`{"padding":"${"x".repeat(2000)}"}`)],
  ])(
    "rejects invalid %s without changing live data or history (%s)",
    async (field, raw) => {
      const drawing = await prisma.drawing.create({
        data: {
          userId: ownerId,
          name: "Keep this scene",
          elements: JSON.stringify([
            { id: "keep", type: "rectangle", version: 2 },
          ]),
          appState: JSON.stringify({ viewBackgroundColor: "#abcdef" }),
          files: JSON.stringify({
            image: { dataURL: "data:image/png;base64,AAAA" },
          }),
          version: 7,
        },
      });
      const snapshot = await prisma.drawingSnapshot.create({
        data: {
          drawingId: drawing.id,
          version: 1,
          elements: "[]",
          appState: "{}",
          files: "{}",
          [field]: raw,
        },
      });
      const response = await agent
        .post(`/drawings/${drawing.id}/history/${snapshot.id}/restore`)
        .set("User-Agent", userAgent)
        .set(csrfHeader, csrfToken);

      expect(response.status).toBe(400);
      expect(
        await prisma.drawing.findUniqueOrThrow({ where: { id: drawing.id } }),
      ).toEqual(drawing);
      expect(
        await prisma.drawingSnapshot.findMany({
          where: { drawingId: drawing.id },
        }),
      ).toEqual([snapshot]);
    },
  );
});
