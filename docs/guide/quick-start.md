---
title: "Self-host Excalidraw: Quick Start"
description: Install ExcaliDash with Docker Compose, and open a single-user Excalidraw workspace.
---

<script setup>
import { setupSlides } from "../.vitepress/theme/screenshot-flows";
</script>

# Quick start

Run ExcaliDash with Docker Compose.

## Prerequisites

- Docker Engine or Docker Desktop
- Docker Compose v2
- Port `6767` available on the host

## Start ExcaliDash

1. Clone the repository:

   ```bash
   git clone https://github.com/Czy014/ExcaliDash.git
   cd ExcaliDash
   ```

2. Start the services:

   ```bash
   docker compose up -d --build
   ```

3. Open `http://localhost:6767`.
4. Open the library directly and select **New Drawing**. All visitors share this workspace; see [single-user access](/guide/authentication).

## Open your workspace

A new workspace starts empty. Select New Drawing to open the editor.

<ScreenshotCarousel label="Open the workspace and create a drawing" :slides="setupSlides" />

## Check the services

```bash
docker compose ps
docker compose logs -f
```

## Stop the stack

```bash
docker compose down
```

For a server deployment, see [Deploy with Docker Compose](/deploy/docker).
