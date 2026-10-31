## 1. Implementation

- [x] 1.1 集中工作区初始化，删除请求用户及 principal 适配层，保持公开链接和历史数据检查。
- [x] 1.2 删除列表缓存用户维度、无调用审计读取与前端所有者字段，更新调用方和测试夹具。

## 2. Validation

- [x] 2.1 运行后端、前端和浏览器测试，验证初始化重试、固定身份、图片、冲突、历史和导入导出。
- [x] 2.2 运行 check、应用和文档构建、git diff 检查及 OpenSpec strict 校验，记录结果与未验证项。

## 3. Integration

- [ ] 3.1 提交实现，同步规格并归档，快进合入 main 后推送 origin。

## Validation

- 环境：Node.js 24.22.1、npm 10.9.2，使用本地隔离数据库与测试文件。
- `npm --prefix backend test`：20 个文件、220 项通过。删除无调用审计读取接口的 5 项旧测试，增加工作区初始化、重试和缓存失效 3 项测试；原有图片、历史、导入导出与保存冲突测试通过。
- 删除恒定的 `config.authMode` 字段和分支后，单用户与运行时健康检查定向回归：2 个文件、10 项通过。
- `npm --prefix frontend run test:unit`：6 个文件、47 项通过。
- `npm run test:e2e`：Chromium 75 项通过；1 项可选 UI 截图场景因未设置 `UI_REVIEW_SCREENSHOTS=true` 跳过。
- `npm run check`、`npm run build`、`npm run docs:build`、`git diff --check` 通过。
- `openspec validate --all --strict --no-interactive`：归档前 5/5 通过。
- PostgreSQL 回归脚本已同步固定工作区夹具，`node --check scripts/verify-postgres-file-races.cjs` 与格式检查通过。
- 源码、脚本扫描没有残留 `req.user`、`DrawingPrincipal`、`getRequestPrincipal`、`getAuditLogs` 或旧认证适配器；数据库 schema、迁移与草稿存储键没有修改。
- 未运行：真实 PostgreSQL 并发脚本、真实 S3 集成、Docker 镜像构建、keeper 部署与生产数据升级验证；没有访问 keeper 生产数据。
