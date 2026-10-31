---
title: Configure Your Self-hosted Excalidraw Workspace
description: Configure ExcaliDash for your server, with environment settings for storage, single-user access, and deployment.
---

# Configuration

Configure ExcaliDash with environment variables.

## Local development

Copy the example files before starting the services:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Keep secrets in untracked `.env` files.

In `backend/.env`, replace the generated `<backend>` path placeholders:

```dotenv
DATABASE_URL=file:./dev.db
BACKUP_DIR=./backups
```

## Docker Compose

Compose reads substitutions from your shell or a root `.env` file:

```dotenv
AUTH_MODE=disabled
FILE_UPLOAD_MAX_MB=100
```

For example, create `compose.override.yml`:

```yaml
services:
  backend:
    environment:
      SNAPSHOT_RETENTION_DAYS: "7"
```

Start the services:

```bash
docker compose -f docker-compose.yml -f compose.override.yml up -d
```

## Workspace preferences

For appearance and editor preferences, open the workspace menu and select **Settings**. Preferences are stored in this browser; server environment variables are configured in the files above.

<ThemeScreenshot light="/images/screenshots/settings-light.png" dark="/images/screenshots/settings.png" alt="Settings with appearance and editor preferences" />

## CSRF secret

The Docker entrypoint generates and persists a CSRF secret if you leave it unset. To manage it yourself, generate a value:

```bash
openssl rand -hex 32
```

Set `CSRF_SECRET` in the root `.env`. Keep it stable across restarts and out of Git. JWT and OpenID Connect settings are no longer used. `AUTH_MODE` must be `disabled` or unset.

See the [environment reference](/reference/environment).
