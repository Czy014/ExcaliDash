# drawing-library Specification

## Purpose

Record the existing drawing library and editor contracts for collections, complete scenes, images, portable files and history recovery, so simplification can verify that these capabilities remain usable.

## Requirements

### Requirement: Drawing library SHALL organize drawings and collections

The system SHALL support creating, opening, renaming, organizing and trashing drawings, with collection and search navigation. Collections, Unorganized and Trash SHALL show their respective drawings.

#### Scenario: Open a collection

- **WHEN** a user opens an existing collection
- **THEN** its drawings appear without drawings from Unorganized or other collections

#### Scenario: Recover a drawing from trash

- **WHEN** a user moves a drawing to Trash and then restores it
- **THEN** the drawing can be opened and edited with its scene content intact

### Requirement: Editor SHALL preserve complete drawing scenes

The editor SHALL use the official Excalidraw engine to load and save scene elements, persisted canvas settings and associated images. Reopening a drawing whose images use file references SHALL retrieve their content.

#### Scenario: Reopen an image drawing

- **WHEN** a user saves and reopens a drawing with text, shapes and images
- **THEN** its elements and images are visible and persisted canvas settings are restored

### Requirement: Drawing library SHALL support portable drawing files

The system SHALL import Excalidraw files and export drawings that can be imported again, preserving scene elements and their required image content.

#### Scenario: Round trip a drawing file

- **WHEN** a user exports a drawing with images and imports the file as a new drawing
- **THEN** the new scene and images remain editable without overwriting the original drawing

### Requirement: Drawing library SHALL retain scene history

The system SHALL support viewing and restoring scene snapshots. A restore SHALL retain the previous current scene in history and commit the restored scene as a new version.

#### Scenario: Restore a previous scene

- **WHEN** a user restores an existing history snapshot
- **THEN** the canvas displays the selected scene and the scene from before the restore remains available in history
