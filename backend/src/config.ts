/**
 * Configuration validation and environment variable management
 */
import dotenv from "dotenv";
import path from "path";
import {
  resolveFileUploadMaxMb,
  validateS3Configuration,
} from "./config/storageValidation";
import {
  readBoolean,
  readNumber,
  readOptionalString,
  readRaw,
  readString,
} from "./config/env";
import {
  type UpdateCheckConfig,
  parseDrawingsCacheTtlMs,
  parseTrustProxy,
  resolveUpdateCheckConfig,
} from "./config/derived";
dotenv.config();

interface S3Config {
  bucket: string | null;
  region: string;
  endpoint: string | null;
  publicUrl: string | null;
  forcePathStyle: boolean;
  keyPrefix: string;
  accessKeyId: string | null;
  secretAccessKey: string | null;
}

interface BackupConfig {
  schedule: string | null;
  dir: string;
  retentionDays: number;
}

interface Config {
  port: number;
  listenHost: string;
  nodeEnv: string;
  buildLabel: string | null;
  isDev: boolean;
  isProduction: boolean;
  databaseUrl?: string;
  frontendUrl?: string;
  trustProxy: boolean | number;
  drawingsCacheTtlMs: number;
  rateLimitMaxRequests: number;
  rateLimitWindowMs: number;
  csrfMaxRequests: number;
  csrfRateLimitWindowMs: number;
  snapshotRetentionMs: number;
  uploadMaxBytes: number;
  bodyLimitMb: number;
  fileUploadMaxMb: number;
  fileUploadMaxBytes: number;
  csrfSecret: string | null;
  debugCsrf: boolean;
  enableAuditLogging: boolean;
  enforceHttpsRedirect: boolean;
  backups: BackupConfig;
  s3: S3Config;
  updateCheck: UpdateCheckConfig;
}

const parseFrontendUrl = (raw: string | undefined): string | undefined => {
  if (!raw || raw.trim().length === 0) return undefined;
  const normalized = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .join(",");
  return normalized.length > 0 ? normalized : undefined;
};

const resolveDatabaseUrl = (rawUrl?: string) => {
  const backendRoot = path.resolve(__dirname, "../");
  const defaultDbPath = path.resolve(backendRoot, "prisma/dev.db");

  if (!rawUrl || rawUrl.trim().length === 0) {
    return `file:${defaultDbPath}`;
  }

  if (!rawUrl.startsWith("file:")) {
    return rawUrl;
  }

  const filePath = rawUrl.replace(/^file:/, "");
  const prismaDir = path.resolve(backendRoot, "prisma");
  const normalizedRelative = filePath.replace(/^\.\/?/, "");
  const hasLeadingPrismaDir =
    normalizedRelative === "prisma" || normalizedRelative.startsWith("prisma/");

  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(
        hasLeadingPrismaDir ? backendRoot : prismaDir,
        normalizedRelative,
      );

  return `file:${absolutePath}`;
};

process.env.DATABASE_URL = resolveDatabaseUrl(process.env.DATABASE_URL);

const authMode = readString("AUTH_MODE", "disabled").trim().toLowerCase();
if (authMode !== "disabled") {
  throw new Error(
    "Authentication has been removed. AUTH_MODE must be disabled or unset.",
  );
}

const resolveBackupConfig = (): BackupConfig => {
  const backupDir =
    readOptionalString("BACKUP_DIR") || path.resolve(__dirname, "../backups");
  return {
    schedule: readOptionalString("BACKUP_SCHEDULE"),
    dir: backupDir,
    retentionDays: readNumber("BACKUP_RETENTION_DAYS", 14),
  };
};

const resolvedNodeEnv = readString("NODE_ENV", "development");
validateS3Configuration();
const fileUploadMaxMb = resolveFileUploadMaxMb();

const resolveS3Config = (): S3Config => ({
  bucket: readOptionalString("S3_BUCKET"),
  region: readString("S3_REGION", "us-east-1"),
  endpoint: readOptionalString("S3_ENDPOINT"),
  publicUrl: readOptionalString("S3_PUBLIC_URL"),
  forcePathStyle:
    readString("S3_FORCE_PATH_STYLE", "false").toLowerCase() === "true",
  keyPrefix: readRaw("S3_KEY_PREFIX")?.replace(/\/+$/, "") || "excalidash",
  accessKeyId: readOptionalString("AWS_ACCESS_KEY_ID"),
  secretAccessKey: readOptionalString("AWS_SECRET_ACCESS_KEY"),
});

export const config: Config = {
  port: readNumber("PORT", 8000),
  listenHost: readString("BACKEND_HOST", "0.0.0.0"),
  nodeEnv: resolvedNodeEnv,
  buildLabel: readOptionalString("APP_BUILD_LABEL"),
  isDev: resolvedNodeEnv === "development",
  isProduction: resolvedNodeEnv === "production",
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: parseFrontendUrl(readRaw("FRONTEND_URL")),
  trustProxy: parseTrustProxy(),
  drawingsCacheTtlMs: parseDrawingsCacheTtlMs(),
  rateLimitMaxRequests: readNumber("RATE_LIMIT_MAX_REQUESTS", 1000),
  rateLimitWindowMs: readNumber("RATE_LIMIT_WINDOW_MS", 900000),
  csrfMaxRequests: readNumber("CSRF_MAX_REQUESTS", 60),
  csrfRateLimitWindowMs: readNumber("CSRF_RATE_LIMIT_WINDOW_MS", 60000),
  snapshotRetentionMs:
    readNumber("SNAPSHOT_RETENTION_DAYS", 2) * 24 * 60 * 60 * 1000,
  uploadMaxBytes: readNumber("UPLOAD_MAX_MB", 100) * 1024 * 1024,
  bodyLimitMb: readNumber("BODY_LIMIT_MB", 50),
  fileUploadMaxMb,
  fileUploadMaxBytes: fileUploadMaxMb * 1024 * 1024,
  csrfSecret: readRaw("CSRF_SECRET") || null,
  debugCsrf: readRaw("DEBUG_CSRF") === "true",
  enableAuditLogging: readBoolean("ENABLE_AUDIT_LOGGING", false),
  enforceHttpsRedirect: readBoolean("ENFORCE_HTTPS_REDIRECT", true),
  backups: resolveBackupConfig(),
  s3: resolveS3Config(),
  updateCheck: resolveUpdateCheckConfig(),
};
console.log("Configuration validated successfully");
