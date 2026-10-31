---
title: Single-user Access
description: Understand ExcaliDash's shared workspace identity and network access boundary.
---

# Single-user access

This fork removes frontend and backend authentication. Set `AUTH_MODE=disabled` or leave it unset. Other values fail startup so an old deployment cannot silently assume sign-in protection is still present.

Every visitor uses the same workspace identity and can manage its library. Restrict access at your network or reverse proxy to people who may use that whole workspace. There are no public drawing links or separate visitor permissions.

Login, registration, OpenID Connect, password reset, API keys, user administration and impersonation endpoints are absent. An existing browser login cookie or API key has no effect.

## Existing data

The fixed owner is the previous disabled-mode identity, `bootstrap-admin`. Database tables and historical migrations remain unchanged; starting the service does not delete existing users, drawings, history, authentication fields or sharing records. Other historical users' libraries are not merged into the workspace. Their old permissions and public links no longer authorize drawing, history or file requests.

## Browser preferences

Theme and editor preferences stay in the browser's existing localStorage. They are not synchronized to an account. The library and editor always use English, including browsers with an old language preference. Clearing site storage removes preferences and local drafts.

## Request protection

CSRF tokens and origin checks still protect write requests. Scripts must retain the cookie from `GET /api/csrf-token` and send the returned header and token on writes. Bearer tokens and API keys do not bypass this check.
