## Context

`middleware/workspace.ts` 每次请求查询固定用户并写入 `req.user`；各路由重复验证身份，`drawingRouteContext.ts` 将其包装为异步 principal。`drawingsCache.ts` 保留没有实际用途的用户缓存键和定向失效逻辑。

## Goals / Non-Goals

目标是删除多用户运行时结构，保持单用户 API 行为。不会移除保存冲突、CSRF、历史快照、图片或公开链接权限，不改历史数据库表、上传路径、导入格式或 IndexedDB 草稿键，不进行生产部署。

## Decisions

1. 路由直接使用 `WORKSPACE_USER_ID`；`getDrawingAccess` 在内部比较此固定身份，保留历史绘图的有效链接策略，删除 `DrawingPrincipal` 与 `getRequestPrincipal`。
2. 单一工作区中间件挂载在业务路由前，只负责确保历史数据身份存在；缓存初始化 promise 以合并并发请求，失败后允许重试。健康与 CSRF 接口仍独立于初始化。
3. 列表缓存只按搜索、集合、数据模式和排序建键，写入统一清空缓存；保留容量、响应体大小、TTL 和 LRU 限制。
4. 删除只有测试调用的审计读取接口及无调用的前端所有者字段；继续保留已使用的审计写入和数据库模型。
5. 测试改用固定工作区夹具。历史用户仅用于验证数据隔离、公开链接和图片归属，不能通过请求头切换身份。

## Risks / Trade-offs

初始化成功后不会在同一进程内重建被外部手动删除的工作区数据行；运行时不支持此类操作。数据库读写失败仍走现有错误处理，初始化失败的后续请求能够重试。已有用户数据、S3 key、素材库 ID 与草稿存储格式保持原值。

## Validation

运行后端测试、前端单元测试、Playwright、`npm run check`、`npm run build`、`npm run docs:build` 和 OpenSpec strict 校验；验证固定身份、并发初始化及失败重试、历史数据隔离、链接、图片、冲突和导入导出。
