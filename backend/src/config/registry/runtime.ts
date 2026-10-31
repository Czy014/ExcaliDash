import type { EnvVarSpec } from "./types";

export const runtimeEnv: readonly EnvVarSpec[] = [
  {
    name: "AUTH_MODE",
    group: "Server",
    kind: "enum",
    values: ["disabled"],
    default: "disabled",
    doc: "Single-user workspace; authentication is removed. Only disabled is supported.",
  },
  {
    name: "ENABLE_AUDIT_LOGGING",
    group: "Security",
    kind: "boolean",
    default: "false",
    doc: "Write audit-log entries for workspace operations.",
  },
];
