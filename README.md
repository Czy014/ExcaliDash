# ExcaliDash

Self-hosted Excalidraw workspaces with collections, local drafts, explicit save conflicts,
public links, history, backups, and a single-user workspace without sign-in.

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

本 fork 保留绘图库和官方 Excalidraw 编辑器，移除实时协作与前后端认证。所有访问者使用同一个工作区身份，访问范围由部署网络控制。多标签页通过版本号防止覆盖；冲突后保留本地草稿，可加载最新版或另存完整副本。实现基于上游 0.6.7，修改日期为 2026-10-31；版权和 LGPLv3 许可证保留。

开发使用独立分支，项目规格与实施计划见 [OpenSpec](openspec/README.md)，开发约定见 [AGENTS.md](AGENTS.md)。
