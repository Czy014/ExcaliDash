---
title: Drawing and collection sharing
description: Share access to drawings and collections while keeping each editing page independent.
---

# Sharing

This fork uses independent HTTP editing. See [personal editing](/guide/personal-editing) for local drafts, save conflicts and multiple tabs.

## Share a drawing with your team

1. [Create accounts](/guide/first-run) for the people who will use your workspace, or [configure OpenID Connect](/guide/authentication).
2. Create or open a drawing and select **Share**.
3. Add the account you want to invite and choose viewing or editing access.
4. Have the invited person open the drawing from their shared workspace.
5. Open the drawing to read or edit it according to the granted permission. Multiple pages use version checks and explicit conflict resolution.

## Share collections

Collections group related drawings. Right-click a collection in the sidebar and select **Share Collection**. Share the collection with other accounts and select their access level to work on a set of drawings together. Keep access scoped to the people who need it.

<ThemeScreenshot light="/images/screenshots/share-collection-light.png" dark="/images/screenshots/share-collection.png" alt="Share Collection dialog open for Platform engineering" />

## Share a link

In the drawing's **Share** controls, open **Link access** to choose **Restricted** or **Anyone with the link**. Choose viewing or editing permission and an expiration when available, then copy the link. Anyone who receives an enabled link can use the access it grants, subject to your instance's sharing policy. Revoke the link when that access is no longer needed.

<ThemeScreenshot light="/images/screenshots/share-link-light.png" dark="/images/screenshots/share-link.png" alt="Drawing Share dialog with Link access choices open" />

## Reverse proxy

Set `FRONTEND_URL` to the browser origin and configure `TRUST_PROXY` for the trusted proxy chain. Follow the [HTTPS deployment guide](/deploy/docker#configure-https). HTTP authorization is checked on every read and write. Revoking access prevents subsequent HTTP operations.
