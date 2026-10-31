import type { EnvVarSpec } from "./types";

export const updateCheckEnv: readonly EnvVarSpec[] = [
  {
    name: "UPDATE_CHECK_OUTBOUND",
    group: "Update check",
    kind: "boolean",
    default: "true",
    doc: "Allow outbound requests to GitHub to check for new releases.",
  },
  {
    name: "UPDATE_CHECK_GITHUB_TOKEN",
    group: "Update check",
    kind: "string",
    secret: true,
    aliases: ["GITHUB_TOKEN"],
    doc: "GitHub token used to raise the update-check API rate limit.",
  },
];
