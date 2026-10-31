---
title: Set Up Your ExcaliDash Workspace
description: Open the single-user library and organize your first Excalidraw drawings.
---

<script setup>
import { setupSlides, workspaceSlides } from "../.vitepress/theme/screenshot-flows";
</script>

# First run

Open ExcaliDash to enter the library directly. There is no account setup or sign-in. The only supported mode is `AUTH_MODE=disabled`.

All visitors use the same workspace identity and can change its drawings. Limit network access to the people who may manage the whole library; public links do not isolate visitors from that identity.

## Your first drawing

Select **New Drawing**, edit the canvas, and return to the library. Reopen the drawing to check that it was saved.

<ScreenshotCarousel label="Open the workspace and create your first drawing" :slides="setupSlides" />

## Organize your workspace

Create collections in the sidebar and move drawings into them. Use **Trash** to review deleted drawings before permanently deleting them.

<ScreenshotCarousel label="Workspace organization" :slides="workspaceSlides" />

[Sample drawing credits](/images/CREDITS.txt).

## Existing installations

The workspace keeps the existing disabled-mode owner (`bootstrap-admin`). Its drawings, images and history remain available. Historical users and authentication fields remain in the database, but accounts cannot sign in and their private libraries are not automatically merged.

See [single-user access](/guide/authentication) and [configuration](/guide/configuration).
