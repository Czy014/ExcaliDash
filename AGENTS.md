# ExcaliDash fork 开发约定

- 本仓库是 `Czy014/ExcaliDash`，上游为 `ZimengXiong/ExcaliDash`；绘图引擎继续使用官方 `@excalidraw/excalidraw`。
- 所有文档和代码修改都在独立分支完成，不得直接在 `main` 开发；没有明确指示时不合入 `main`，不向 `upstream` 推送。
- 本仓库使用自己的 `openspec/`，不使用父目录或 Homebase 的 OpenSpec 根目录。所有 OpenSpec 命令从本仓库根目录执行。
- 非琐碎行为变更先完成 change 的 proposal、design、specs、tasks，再实施；工件正文使用中文，保留 OpenSpec 英文结构标题和 SHALL/MUST 关键词。
- `openspec/specs/` 记录已实现的契约，计划中的行为放在 `openspec/changes/`；实施和验证完成后再同步规格、归档。
- 首轮方向是保留绘图库和编辑器，移除实时协作。保存版本检查、图片、历史记录、认证、授权和 CSRF 保护不可因精简协作而丢失。
- 本仓库独立于 Homebase。Homebase 的路由、备份和部署装配留在其 Draw 插件中，不把这些业务写入本仓库的应用代码。
- 保留上游版权和 LGPLv3 许可证；发布修改版时记录对应源码提交和构建方式。
- 测试使用隔离数据库和测试文件，不接入 keeper 的生产数据库、上传目录、密钥或备份；日志和规格不记录密钥值。
- 运行环境以各 `package.json` 为准：Node.js >=24.22.1，npm 10.9.2。优先复用现有 React、Express、Prisma、Vitest 和 Playwright 结构。
- 行为变更验证包含相关单元/集成测试、`npm run check`、`npm run build` 和相关 Playwright 场景；记录未运行或失败的检查，不把规格校验当作运行验证。
- 提交前运行 `git diff --check` 和 `openspec validate --all --strict --no-interactive`。纯规格修改不要求启动应用或运行全部业务测试。
