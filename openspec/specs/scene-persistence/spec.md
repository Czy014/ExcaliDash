# scene-persistence Specification

## Purpose

Record the version and data integrity contracts for HTTP scene saves, protecting newer content, images and history during personal editing changes.

## Requirements

### Requirement: Scene saves SHALL guard supplied versions

All editor scene updates SHALL include the loaded base version, including autosave, manual, queued, navigation and unload saves; unknown versions MUST NOT be sent. The server SHALL check supplied `version` with a conditional update in the write transaction. Stale writes SHALL return HTTP 409 and `VERSION_CONFLICT` without changing the scene. Success SHALL increment and return the version. The editor MUST NOT bypass a conflict pause by omitting or replacing the version or using another save path.

#### Scenario: Reject a stale version

- **WHEN** the current scene is version 11 and a client submits version 10
- **THEN** the server returns HTTP 409 and `VERSION_CONFLICT`, leaving version 11 unchanged

#### Scenario: Serialize simultaneous versioned saves

- **WHEN** two requests submit different scenes based on the same version
- **THEN** at most one succeeds with that version and the other receives a conflict without overwriting the successful scene

#### Scenario: Block every scene save path after a conflict

- **WHEN** a page has received a version conflict and a debounced save, queued request, manual save, unmount or page-close event occurs
- **THEN** unsent writes to the original scene stop across all save paths while drafts continue to record local edits

#### Scenario: Preserve edits when the version is unavailable

- **WHEN** the editor has not successfully loaded the drawing version or a network error interrupts loading
- **THEN** it does not send an unversioned scene update, protects local edits as drafts and does not claim they are saved

### Requirement: Scene saves SHALL preserve files and history

Successful scene updates SHALL record the previous scene as a history snapshot in the same transaction. Normal saves SHALL retain existing image references; omitting a file or submitting empty file content MUST NOT silently erase existing content.

#### Scenario: Preserve an image omitted from a partial save

- **WHEN** a normal scene update omits the content of an existing image
- **THEN** that file's content remains readable and is not deleted because the field was absent

#### Scenario: Record the previous scene

- **WHEN** a scene update with the correct version commits
- **THEN** the previous scene is available in history and the drawing returns the new scene and version
