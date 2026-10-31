---
title: Drawing links
description: Manage drawing links in a single-user workspace with independent editing.
---

# Sharing

This fork uses independent HTTP editing. See [personal editing](/guide/personal-editing) for local drafts, save conflicts and multiple tabs.

## Workspace access

All visitors share one identity and can manage its drawings. There are no account invitations or shared collections. Limit network access to people who may use the whole workspace. A public link cannot reduce the permissions that visitors already have as that identity.

## Share a link

Open a drawing and select **Share**. The dialog contains only link access settings. Choose **Restricted** or **Anyone with the link**, viewing or editing access, and an expiration, then copy the link. Revoking a link removes that link's grant; it does not remove the workspace identity's ownership permissions.

For drawings belonging to other historical users, existing public links retain their viewing, editing, expiration and revocation rules. Those users' private drawings are not automatically added to the workspace library.

## Reverse proxy

Set `FRONTEND_URL` to the browser origin and configure `TRUST_PROXY` for the trusted proxy chain. Follow the [HTTPS deployment guide](/deploy/docker#configure-https). Reads and writes retain their data access checks, and writes require CSRF protection.
