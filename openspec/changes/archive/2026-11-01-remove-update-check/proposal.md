# Remove release update checks

## Problem

The single-user fork still contains an update-check feature that calls the
upstream GitHub repository, exposes an Updates card in Settings, and renders a
release banner throughout the library. The feature only reports releases; it
does not update or deploy the application, and its upstream target does not
represent the Homebase-managed fork.

## Proposed change

- Remove the Settings Updates card and the library-wide release banner.
- Remove the frontend update client and the backend release-check route,
  caching, semver helper and update-check configuration.
- Remove the related environment examples and tests.
- Keep the local Version row with the application version and build label so a
  deployed image remains identifiable.

## Preserved capabilities

Drawing, collections, import/export, backups, history, local preferences,
version-conflict protection, CSRF protection, and the editor's auto-hide
control remain unchanged.

## Exclusions

This change does not add an update mechanism, change image deployment, alter
the database schema, remove application version metadata, or change the
editor header auto-hide behavior.
