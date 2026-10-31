## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Editing SHALL work without real-time collaboration

**Reason**: Replace the former contract that required public links with independent HTTP editing and workspace-only access.

**Migration**: Continue editing workspace drawings at `/editor/:id`; historical links no longer grant access. Database rows remain stored.

### Requirement: Personal library navigation SHALL omit redundant identity presentation

**Reason**: Replace the former contract that required a sharing dialog with personal navigation that omits both identity and sharing controls.

**Migration**: Use the library and editor directly. Trash, Settings, history and export remain available; old `/shared/:id` URLs return to the library.
