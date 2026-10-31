# ExcaliDash project specifications

This directory manages only `Czy014/ExcaliDash`, independently of the parent workspace and Homebase.

## Current baseline

The initial source baseline was upstream commit `0f9be2d8649be7650e6bee2844739c584fa76c35` (`VERSION=0.6.7`). The specifications protect the drawing library's maintained contracts rather than cataloging every upstream feature.

- [drawing-library](specs/drawing-library/spec.md): drawings, collections, complete scenes, import/export and history.
- [scene-persistence](specs/scene-persistence/spec.md): HTTP saves, version checks, image retention and snapshots.
- [personal-editing](specs/personal-editing/spec.md): independent editing, conflicts, drafts and personal navigation.
- [single-user-runtime](specs/single-user-runtime/spec.md): credential-free workspace identity, data retention, CSRF and browser-local preferences.

Current documentation and new changes use English. Historical archives retain the language and validation records in which they were written. Application specifications and Homebase production integration are tracked separately.

## Archived changes

- [remove-realtime-collaboration](changes/archive/2026-10-31-remove-realtime-collaboration/proposal.md): independent HTTP editing with explicit save conflicts and local drafts.
- [simplify-personal-interface](changes/archive/2026-10-31-simplify-personal-interface/proposal.md): remove profile presentation, avatars, Shared with me navigation and Beta badges.
- [remove-authentication](changes/archive/2026-10-31-remove-authentication/proposal.md): remove authentication, invitations and account management while keeping historical database tables and browser-local preferences.
- [simplify-single-user-runtime](changes/archive/2026-10-31-simplify-single-user-runtime/proposal.md): use a fixed workspace ID, centralize initialization and remove obsolete identity adapters and cache partitions.

- [remove-drawing-sharing](changes/archive/2026-10-31-remove-drawing-sharing/proposal.md): remove sharing UI, public-link routes and link authorization, retain historical data, and use English consistently across the interface and current maintenance documents.

## Workflow

Work from this repository root on a separate branch, never directly on `main`.

```sh
openspec context --json
openspec list
openspec validate --all --strict --no-interactive
```

The `root.path` returned by `context` must identify this ExcaliDash repository. See [AGENTS.md](../AGENTS.md) for development conventions and [config.yaml](config.yaml) for artifact rules.

Production deployment, Homebase assembly and `/draw/` prefix support belong to Homebase's Draw plugin and its own OpenSpec changes. See the Homebase `integrate-personal-editing-draw` change for its deployment record.

See the [issue tracker configuration](../docs/agents/issue-tracker.md) for issue and backlog review instructions.
