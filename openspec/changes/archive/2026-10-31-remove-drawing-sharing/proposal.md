# remove-drawing-sharing

## Why

ExcaliDash is now a single-user drawing library. The editor still exposes a
Share button, a link-sharing dialog, a public `/shared/:id` route and backend
link authorization. These paths add UI and maintenance cost while providing no
useful capability for the private workspace.

## What changes

- Remove the editor Share button, dialog, sharing API client methods and related
  frontend tests.
- Remove the public shared-drawing route and backend link-sharing endpoints.
- Restrict drawing, history and file access to the fixed workspace owner;
  historical users, permissions and link-share rows remain stored but no
  longer authorize runtime access.
- Remove link-sharing runtime configuration and documentation/screenshots.
- Keep the existing database tables and migrations so removing the feature does
  not delete historical data.
- Use English throughout the library and editor, remove the partial translation
  layer and language selectors, and translate current maintenance documents
  and specifications. Historical change archives retain their original text.

## Out of scope

- No database migration or deletion of users, drawings, permissions,
  `DrawingLinkShare` rows, files or snapshots.
- No change to drawing editing, collections, images, import/export, history,
  CSRF protection or version-conflict handling.
- No Homebase changes or production deployment.

## Capabilities

### Modified Capabilities

- `personal-editing`: the editor and personal library no longer expose public
  sharing or shared-drawing access.
- `single-user-runtime`: runtime access is limited to the fixed workspace
  owner while historical sharing data remains in the database.

## Impact

The frontend and backend no longer create or serve public drawing links.
Existing public links stop resolving after deployment. Historical sharing
tables and rows remain untouched for backup and migration compatibility.
