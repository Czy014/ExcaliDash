# ExcaliDash 项目规格

本目录只管理 `Czy014/ExcaliDash`，与父目录和 Homebase 的规格独立。

## 当前基线

初始化依据源码提交 `0f9be2d8649be7650e6bee2844739c584fa76c35`（`VERSION=0.6.7`）。`specs/` 记录本轮需要保护的既有能力，并非上游全部功能的穷尽清单。

- [drawing-library](specs/drawing-library/spec.md)：绘图、分类、完整画布、导入导出及历史记录。
- [scene-persistence](specs/scene-persistence/spec.md)：HTTP 场景保存、版本检查、图片保留和历史快照。

个人编辑 change 已完成实现并同步规格；当前主规格描述的是无实时协作的个人编辑、版本冲突处理和本地草稿行为。

## 已归档变更

[2026-10-31-remove-realtime-collaboration](changes/archive/2026-10-31-remove-realtime-collaboration/proposal.md) 定义个人编辑方式：取消实时同步，保留现有基础功能，改用明确的版本冲突处理和本地草稿。

实施分支已完成测试和构建验证；生产部署、Homebase 接入及原生 `/draw/` 前缀兼容由后续独立 change 负责。

## 工作方式

从仓库根目录操作，在 `docs/` 或 `feat/` 等独立分支上工作，不在 `main` 编辑或提交。

```sh
openspec context --json
openspec list
openspec status --change remove-realtime-collaboration
openspec validate --all --strict --no-interactive
```

`context` 返回的 `root.path` 应是当前 ExcaliDash 仓库。详细约定见 [AGENTS.md](../AGENTS.md)，工件规则见 [config.yaml](config.yaml)。

当前只建立规格，不构建或发布镜像、不部署 keeper。Homebase 的现有 Draw 配置仍使用 `0.6.6`；未来接入 fork 时需要独立验证版本和数据兼容性。
