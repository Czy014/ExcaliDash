// Test-only identities, seeded solely into the dedicated auth-e2e.db database.
export const owner = {
  id: "auth-e2e-admin",
  email: "auth-e2e@example.test",
  password: "Auth-E2E-Password-123!",
};
export const viewer = {
  id: "e2e-viewer",
  email: "e2e-viewer@example.test",
  password: "Viewer-E2E-Password-123!",
  name: "E2E Viewer",
};

export const credentialUser = {
  id: "e2e-credentials",
  email: "e2e-credentials@example.test",
  password: "Credential-E2E-Password-123!",
  name: "E2E Credentials",
};
