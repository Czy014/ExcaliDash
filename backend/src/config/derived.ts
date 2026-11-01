/**
 * Small derived-config resolvers built on the typed env loader. Extracted from
 * config.ts to keep that module under the repo line-count limit.
 */
import { readRaw } from "./env";

/** Parse TRUST_PROXY exactly as backend/src/index.ts does today. */
export const parseTrustProxy = (): boolean | number => {
  const raw = (readRaw("TRUST_PROXY") ?? "false").trim();
  if (raw === "true") return true;
  if (raw === "false") return false;
  const hops = Number.parseInt(raw, 10);
  return Number.isFinite(hops) && hops > 0 ? hops : false;
};

export const parseDrawingsCacheTtlMs = (): number => {
  const parsed = Number(readRaw("DRAWINGS_CACHE_TTL_MS"));
  if (!Number.isFinite(parsed) || parsed <= 0) return 5_000;
  return parsed;
};
