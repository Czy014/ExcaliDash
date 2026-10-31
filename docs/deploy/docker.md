---
title: How to Self-host Excalidraw with Docker Compose
description: Deploy ExcaliDash for self-hosted Excalidraw with saved drawings and independent editing. Configure Docker, HTTPS, persistent storage, backups, and upgrades.
---

<script setup>
import { setupSlides } from "../.vitepress/theme/screenshot-flows";
</script>

# How to self-host Excalidraw with Docker Compose

Build this fork from source with `docker-compose.yml`. The upstream images in `docker-compose.prod.yml` do not contain this fork's changes.

ExcaliDash gives the Excalidraw editor a self-hosted workspace with saved drawings, collections, local drafts and explicit save conflicts, and version history. This guide deploys the ExcaliDash frontend and backend with a persistent SQLite database. ExcaliDash is an independent project built around Excalidraw.

## Before you start

Install Docker Engine or Docker Desktop and Docker Compose v2. You also need Git and an available host port `6767`. Restrict access to trusted visitors; every visitor can manage the workspace. Use HTTPS when traffic leaves the local machine.

## Install ExcaliDash

Clone the repository and build the stack:

```bash
git clone https://github.com/Czy014/ExcaliDash.git
cd ExcaliDash
docker compose -f docker-compose.yml up -d --build
```

Open `http://localhost:6767` to enter the library directly. All visitors use one workspace identity without sign-in; see [single-user access](/guide/authentication).

Use the arrows to follow the first-run screens after starting the stack.

<ScreenshotCarousel label="First-run setup after Docker deployment" :slides="setupSlides" />

Check that the services are running:

```bash
docker compose -f docker-compose.yml ps
docker compose -f docker-compose.yml logs --tail=100
```

Create a drawing, make an edit, then close and reopen it to check storage. To check multiple pages, edit the same loaded version in two tabs and verify the second save shows a conflict. See [personal editing](/guide/personal-editing).

## Select a source revision

Build both images from the same reviewed fork commit. Record that commit with the deployed image tags so the matching LGPLv3 source remains available. Published upstream images do not provide this fork's single-user behavior.

## Configure HTTPS

Route HTTPS traffic to container port `80` or `8080`, or host port `6767`. Both container ports serve the same application. Existing `6767:80` mappings and reverse proxies targeting port `80` remain supported. The frontend proxies HTTP API traffic to the backend.

Create `compose.override.yml` with your public origin and the number of trusted proxy hops:

```yaml
services:
  backend:
    environment:
      FRONTEND_URL: https://draw.example.com
      TRUST_PROXY: "1"
```

Replace `https://draw.example.com` with your URL. The hop count must match your proxy chain and your proxies must replace untrusted forwarding headers.

Apply the override:

```bash
docker compose -f docker-compose.yml -f compose.override.yml up -d
```

## Non-root port binding

The frontend runs as the non-root nginx user. Modern Docker permits it to bind port `80` inside its network namespace. On Docker installations that restrict low ports, add this frontend override to allow the listener without running nginx as root:

```yaml
services:
  frontend:
    sysctls:
      net.ipv4.ip_unprivileged_port_start: "0"
```

This setting applies to the container network namespace, not the host.

## Persist and back up data

The `backend-data` volume holds SQLite data, image records, and generated signing secrets. Scheduled backups copy the SQLite database. Please save your signing secrets separately.

Add these entries to `compose.override.yml` to enable daily database backups at 04:00 in the container's timezone:

```yaml
services:
  backend:
    environment:
      BACKUP_SCHEDULE: "0 0 4 * * *"
      BACKUP_DIR: /app/backups
      BACKUP_RETENTION_DAYS: "14"
    volumes:
      - backup-data:/app/backups
volumes:
  backup-data:
```

Initialize the backup volume for the backend's user (UID 1001), then apply the override:

```bash
docker compose -f docker-compose.yml -f compose.override.yml run --rm --no-deps --user 0 --entrypoint sh backend -c 'chown 1001:1001 /app/backups'
docker compose -f docker-compose.yml -f compose.override.yml up -d
```

Check the backend logs for backup errors and test restoring a backup. For PostgreSQL, use your database's backup tools. If you use S3, back up its objects too.

## Upgrade

```bash
docker compose -f docker-compose.yml up -d --build
```

## Troubleshoot your deployment

### The site does not open

Check `docker compose -f docker-compose.yml ps` and the service logs. Ensure port `6767` is available and reachable from the machine you are using. `localhost` always means the machine where you open the URL.

### A drawing shows a save conflict

Another page or device saved a newer version. Keep the local scene, load the latest after confirmation, or save it as a copy. See [personal editing](/guide/personal-editing).

### Data or backup permission errors

Use a Docker named volume for the default data directory. If you use a host bind mount, ensure the backend user (UID 1001) can write to it. For the backup volume, use the initialization command above.

## Stop without deleting your data

```bash
docker compose -f docker-compose.yml down
```

The named data volume remains. Adding `--volumes` deletes it, including your stored drawings. Read the [storage and backup guide](/guide/storage-backups) before removing volumes or migrating servers.
