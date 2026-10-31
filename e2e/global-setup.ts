import { expect } from "@playwright/test";

export default async function globalSetup() {
  const response = await fetch(`${process.env.API_URL}/health`);
  expect(response.ok).toBe(true);
  expect((await response.json()).database).toBe("ok");
}
