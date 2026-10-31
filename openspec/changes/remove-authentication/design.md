# Design

## Current state

`backend/src/index.ts` 挂载 `backend/src/auth.ts`，认证中间件在 `AUTH_MODE=disabled` 时已经为请求创建 bootstrap user，但认证路由、配置、CSRF 例外和前端仍按多用户模式组织。`frontend/src/App.tsx` 通过 `AuthProvider` 和 `ProtectedRoute` 保护所有页面，设置页还渲染账户、API key、管理员和认证开关。

## Target state

核心运行时直接使用一个固定的 bootstrap principal。由 `workspace` 中间件取得固定的数据身份；路由不再使用 `requireAuth`/`optionalAuth` 命名，不解析 cookie、JWT、OIDC 或 API key。`/auth/*` 不再挂载。

前端直接进入绘图库和编辑器。`AuthProvider`、登录/注册/找回密码/认证初始化/管理员页面及账户组件移除；偏好设置只写入已有的 localStorage。公开链接设置和数据读取保持原 disabled 模式，所有访问者均为同一工作区身份，因此公开链接不构成访客隔离；历史其他用户的数据不自动合并，按用户授权的入口与运行逻辑删除。

CSRF 中间件继续保护非安全 HTTP 方法，只删除对已不存在 `/auth/*` 路径的绕过；浏览器仍先取得 CSRF token。数据库 schema 和历史迁移保持不变，避免在本 change 中隐式删除生产数据。

## Affected callers and checks

- 后端：`index.ts`、认证中间件、CSRF、绘图/文件/存储/导入导出路由依赖。
- 前端：`App.tsx`、偏好上下文、设置和侧栏，以及 api 导出。
- 测试：单用户绘图、文件、集合、导入导出、CSRF 和公开链接场景；删除已不再存在的认证专用测试入口。
- 文档：首轮安装、认证、配置和协作文档只描述单用户运行方式。
