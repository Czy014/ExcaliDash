# Design

## Current implementation

- `frontend/src/pages/Settings.tsx` fetches `/system/update` on every Settings
  mount and passes channel, status and retry state to
  `frontend/src/pages/settings/UpdateSettingsCard.tsx`.
- `frontend/src/components/UpdateBanner.tsx` is mounted by `Layout` and checks
  the same endpoint on a daily local-storage interval.
- `frontend/src/api/system.ts` exposes the update response type and client.
- `backend/src/routes/system/update.ts` queries GitHub releases, compares
  versions and caches the result. `backend/src/routes/system/index.ts` mounts
  that route.
- `backend/src/config.ts`, `backend/src/config/derived.ts` and
  `backend/src/config/registry/*` own the outbound and GitHub-token settings;
  the generated `.env.example`, lab Compose file and marketing launcher repeat
  the obsolete flag.

## Target implementation

Delete the complete release-check path. Remove the UpdateBanner from both
Layout render branches, remove update state and props from Settings and
SettingsMainGrid, and delete the standalone update card and API module. Remove
the backend route registration and its dedicated test, then remove the now
unused release-check configuration and semver helper. Regenerate
`backend/.env.example` from the remaining registry entries and remove the lab
and marketing environment overrides.

The existing `AdvancedSettings` Version row continues to display
`VITE_APP_VERSION` and `VITE_APP_BUILD_LABEL`; those build identifiers remain
useful for Homebase image pinning and troubleshooting. The editor auto-hide
preference and toolbar control are outside this change and remain intact.

## Verification boundary

Searches SHALL show no update-check UI, client, route, config variable or
release-check test. The backend SHALL still start and serve `/health`, while a
request to the retired `/system/update` path SHALL return the normal not-found
response. Frontend tests SHALL verify Settings still renders the Version row
and the auto-hide preference/control remains available.
