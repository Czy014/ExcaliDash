# ExcaliDash

Self-hosted Excalidraw workspaces with collections, real-time collaboration,
sharing, history, backups, and local or OpenID Connect authentication.

[![ExcaliDash dashboard](docs/public/images/workspace.png)](https://excalidash.xyz)

[Self-host Excalidraw with Docker Compose](https://excalidash.xyz/deploy/docker),
or read the documentation at [excalidash.xyz](https://excalidash.xyz).

## Quick start

```sh
git clone https://github.com/Czy014/ExcaliDash.git
cd ExcaliDash
docker compose -f docker-compose.prod.yml up -d
```

Open <http://localhost:6767>. Configuration and deployment guidance live in
the [documentation](https://excalidash.xyz).

ExcaliDash is licensed under the GNU Lesser General Public License v3.0.

## Fork development

本 fork 计划保留绘图库和 Excalidraw 编辑器，移除实时协作，并明确处理多标签页的保存冲突。当前业务代码仍为上游实现；这项行为变更尚未实施。

开发使用独立分支，项目规格与实施计划见 [OpenSpec](openspec/README.md)，开发约定见 [AGENTS.md](AGENTS.md)。
