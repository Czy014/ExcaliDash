# personal-editing Specification

## Purpose

Define editing and recovery contracts for independent pages in a personal drawing library. Explicit conflicts, local drafts and refresh on demand protect unsaved work when several pages open the same drawing.

## Requirements

### Requirement: Save conflicts SHALL require an explicit resolution

After a version conflict on the original drawing, the editor SHALL retain this page's scene and draft, pause autosaves and associated preview writes to the original, and visibly indicate unsaved changes. It MUST NOT merge automatically, retry automatically with a newer version or force an overwrite. The user SHALL be able to load the latest version or save this page's scene as a copy, and failures SHALL leave the scene recoverable.

#### Scenario: Keep the losing page unchanged

- **WHEN** pages A and B edit from version 10, A saves version 11 and B receives a version conflict
- **THEN** B retains its canvas and draft in a conflict state, version 11 retains A's content, and B's queued and navigation saves stop writing to the original

#### Scenario: Load the latest scene safely

- **WHEN** a page in conflict chooses to load the latest version and confirms discarding its local changes
- **THEN** it replaces the canvas and resumes editing only after successfully reading the latest scene; failures retain the canvas and draft without deleting other pages' drafts

#### Scenario: Save local changes as an independent copy

- **WHEN** saving the local scene as a copy succeeds
- **THEN** the new drawing includes this page's elements, persisted canvas settings and independently readable images under its own drawing ID, leaving the original unchanged

#### Scenario: Keep changes when creating a copy fails

- **WHEN** a copy cannot be fully committed because of network, permission or image-read failures
- **THEN** the editor reports the failure, keeps the canvas and draft, does not mark the original saved and does not navigate to an incomplete copy

### Requirement: Unsaved drafts SHALL be recoverable and isolated

The editor SHALL persist unsaved scenes, base versions and required images as local drafts isolated by service, account, drawing and page instance. Reopening a drawing SHALL offer draft recovery without automatically overwriting the server. Drafts MUST NOT exist only in page memory. A local storage failure SHALL visibly indicate unavailable draft protection and unsaved work while keeping export available.

#### Scenario: Recover after closing a page

- **WHEN** a page closes after its unsaved draft has been successfully stored locally and the drawing is reopened
- **THEN** the user can recover that draft, including images not yet uploaded; an older base version requires conflict resolution instead of an automatic write

#### Scenario: Isolate two pages and two accounts

- **WHEN** independent or duplicated tabs create different drafts for a drawing, or the browser switches accounts
- **THEN** drafts do not overwrite one another, recovery does not expose other accounts' drafts and removing one draft leaves other pages' drafts intact

#### Scenario: Report unavailable local storage

- **WHEN** local storage is disabled, fails to write or runs out of space
- **THEN** the page does not claim local protection; versioned server saves remain possible, and failures retain the canvas with an unsaved warning

### Requirement: Clean pages SHALL refresh without overwriting local edits

When a drawing page regains focus with no unsaved edits, pending saves or drafts awaiting recovery, it SHALL check and load newer server content on demand. A page with local edits or conflicts MUST NOT replace its canvas automatically, including when edits begin during a refresh. A network failure SHALL retain the current scene, and reconnection SHALL continue to use version checks.

#### Scenario: Refresh a clean page

- **WHEN** B has no local edits, A has saved a newer version and the user returns to B
- **THEN** B displays the latest server scene after a successful read without a real-time connection

#### Scenario: Protect edits made while refreshing

- **WHEN** local edits already exist or begin while the page checks for a newer version
- **THEN** the returned scene does not replace the local canvas and a later save with an old version enters explicit conflict resolution

### Requirement: Editor SHALL use independent HTTP editing

The editor SHALL read and save scenes over HTTP without opening real-time collaboration connections, displaying other pages' cursors or online members, or receiving their live scene changes. The server MUST NOT provide a Socket.IO collaboration endpoint. The drawing library, assets, images, import/export, history and single-user operation SHALL remain available.

#### Scenario: Edit without a collaboration transport

- **WHEN** a user opens, edits, saves and reopens a drawing
- **THEN** the content is saved and loaded over HTTP without Socket.IO or other real-time collaboration requests

#### Scenario: Reject a historical non-owner drawing

- **WHEN** a request accesses another historical user's drawing, even if permission or link-share records exist
- **THEN** drawing, history and file endpoints return not-found responses without granting view or edit access

### Requirement: Personal library navigation SHALL omit identity and sharing controls

The frontend SHALL omit Beta badges, user avatars, profile entries and pages, and the Shared with me virtual collection. Sidebar tools SHALL use workspace labels independent of identity and keep Trash and Settings accessible in compact and expanded layouts, without account, administrator or sign-out actions. The editor SHALL NOT provide a Share button, sharing dialog or public drawing link.

#### Scenario: Browse a personal library on desktop and mobile

- **WHEN** a user opens the library, collections and Settings on desktop or mobile and changes the sidebar layout
- **THEN** no Beta, avatar, profile, Shared with me or sharing entry appears, and Trash and Settings remain accessible

#### Scenario: Retired sharing controls are absent

- **WHEN** a user opens a workspace drawing or visits an old `/shared/:id` URL
- **THEN** the editor has no Share controls and the old URL returns to the library without opening a drawing

### Requirement: Interface SHALL use English consistently

The library, Settings, live editor and history preview SHALL use English regardless of browser locale or obsolete stored language preferences. The frontend SHALL NOT expose a language selector or maintain a partial translation layer. User-created drawing names, collection names and scene text SHALL remain unchanged.

#### Scenario: Open with an obsolete Chinese preference

- **WHEN** a browser using a Chinese locale and a stored Chinese language preference opens the library, Settings or a drawing
- **THEN** navigation and editor controls use English, no language selector is shown and user content retains its original text
