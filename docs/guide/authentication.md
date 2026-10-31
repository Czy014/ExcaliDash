---
title: Single-user Access
description: Understand ExcaliDash's shared workspace identity and network access boundary.
---

# Single-user access

This fork removes frontend and backend authentication. Set `AUTH_MODE=disabled` or leave it unset. Other values fail startup so an old deployment cannot silently assume sign-in protection is still present.

Every visitor uses the same workspace identity and can manage its library. Restrict access at your network or reverse proxy to people who may use that whole workspace. Public links do not provide a separate visitor identity or limit access to workspace-owned drawings.

Login, registration, OpenID Connect, password reset, API keys, user administration and impersonation endpoints are absent. An existing browser login cookie or API key has no effect.

## Existing data

The fixed owner is the previous disabled-mode identity, `bootstrap-admin`. Database tables and historical migrations remain unchanged; starting the service does not delete existing users, drawings, history or authentication fields. Other historical users' private libraries are not merged into the workspace, and their old per-user grants no longer authorize requests. Existing public links still follow the link access rules for those historical drawings.

## Browser preferences

Theme, language and editor preferences stay in the browser's existing localStorage. They are not synchronized to an account. Clearing site storage removes those preferences and local drafts.

## Request protection

CSRF tokens and origin checks still protect write requests. Scripts must retain the cookie from `GET /api/csrf-token` and send the returned header and token on writes. Bearer tokens and API keys do not bypass this check.
