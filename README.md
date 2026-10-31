# ExcaliDash

Self-hosted Excalidraw with collections, local drafts, explicit save conflicts,
history, backups, and a single-user workspace without sign-in.

[![ExcaliDash dashboard](docs/public/images/workspace.png)](https://excalidash.xyz)

See the [personal editing guide](docs/guide/personal-editing.md) and [local development instructions](docs/develop/index.md).

## Development

Requires Node.js >=24.22.1 and npm 10.9.2.

```sh
git clone https://github.com/Czy014/ExcaliDash.git
cd ExcaliDash
npm ci
npm run install:all
```

Follow [local development](docs/develop/index.md) to configure and start the backend and frontend. Published upstream Docker images do not include this fork's changes; fork image publication and production integration are a separate step.

ExcaliDash is licensed under the GNU Lesser General Public License v3.0.

## Fork development

This fork keeps the drawing library and official Excalidraw editor, with an English interface. Real-time collaboration, authentication and link sharing are removed. Every visitor uses the same workspace identity; network access controls the workspace boundary. Version checks prevent one tab from overwriting another. After a conflict, local drafts remain available and you can load the latest version or save a complete copy. The fork is based on upstream 0.6.7 and was modified on 2026-10-31. Upstream copyright notices and the LGPLv3 license are retained.

Develop on a separate branch. See [OpenSpec](openspec/README.md) for project specifications and implementation plans, and [AGENTS.md](AGENTS.md) for development conventions. Current documentation and new change artifacts use English; historical change archives retain their original text.

GitHub Actions runs manually: open **Actions → CI → Run workflow** in this repository and select a branch. The workflow runs backend tests, code checks and browser tests. It does not publish images, create releases or synchronize branches. Pushes and pull requests do not trigger CI.
