# Tasks

- [x] 1.1 创建单用户运行时身份，替换认证中间件中的 cookie、JWT、OIDC 和 API key 分支。
- [x] 1.2 移除后端认证路由、认证专用配置/初始化路径和认证测试入口，保留 CSRF 与绘图路由依赖。
- [x] 1.3 删除前端认证上下文、认证页面、管理员/账户/API key 入口和相关 API，改用单用户直接路由。
- [x] 1.4 将偏好上下文改为 localStorage-only，并清理失效调用方、导出和类型。
- [x] 1.5 更新首轮安装、认证、配置、协作和 OpenSpec 文档。
- [x] 2.1 运行后端相关 Vitest、前端单元测试和 E2E 类型检查。
- [x] 2.2 运行 `npm run check`、`npm run build`、`npm run docs:build`、`git diff --check`。
- [x] 2.3 运行 `openspec validate --all --strict --no-interactive`。
- [x] 2.4 运行无认证浏览器场景，确认页面直达、保存和公开链接行为。

## Validation

2026-10-31，在独立分支 `feat/remove-authentication` 使用 Node.js 24.22.1、npm 10.9.2 验证：

- `npm --prefix backend test`：20 个文件、222 项通过，包含固定身份首次并发读取、无凭证读写、历史用户/绘图/ACL 保留、认证路由不存在、CSRF cookie 绑定/来源拒绝/旧 API key 不绕过，以及历史绘图公开链接的查看、编辑、过期和撤销。
- `npm --prefix frontend run test:unit`：6 个文件、47 项通过，覆盖保存保护、冲突恢复、草稿和历史。
- `npm --prefix e2e run check`：通过；`node --test scripts/lab-frontend-ports.test.mjs`：4 项通过。
- `npm --prefix e2e test -- --reporter=line`：75 项通过；1 项需显式启用的 UI 截图采集场景跳过。所有场景使用本机隔离测试数据库和新浏览器上下文，覆盖认证 URL 回到资料库、账户接口零请求、主题刷新保留、链接设置、图片、历史、分类及多标签冲突。
- `npm run check`、`npm run build`、`npm run docs:build`、`git diff --check`：通过。认证依赖和已失效脚本/截图移除，保留被文档组件引用的 `image-versions.json`。
- `openspec validate --all --strict --no-interactive`：归档前、后均 4/4 通过；已同步 `personal-editing` 并新增 `single-user-runtime`。
- 以 `252cd9a` 为固定点完成 Standards / Spec 两轴只读审查：规格轴无发现；规范轴指出两处遗漏的账户功能说明和 Compose 文件名，已修正，无未解决的阻断项。
- `backend/prisma/` 的 schema 和迁移无修改；未接入 keeper 数据、上传目录或密钥，未执行生产数据迁移。
- 实现提交 `405fbcd`；change 在全部任务完成后归档。

未验证：keeper 部署及其反向代理、Docker 镜像构建/启动、真实 PostgreSQL/S3；截图采集未运行。所有访问者使用同一工作区身份，公开链接不提供与工作区 owner 隔离的访客权限；历史其他用户的私有绘图不自动合并。
