## ADDED Requirements

### Requirement: Single-user runtime SHALL serve the library without credentials

运行时 SHALL 使用固定的 bootstrap principal 处理绘图、集合、文件、历史、导入导出和设置请求；请求不需要登录 cookie、Bearer token 或 API key。旧用户和认证字段 MUST 保留在数据库中，不通过启动或请求自动删除。

#### Scenario: Open the library on a fresh browser

- **WHEN** 浏览器没有认证 cookie 和本地登录状态并访问绘图库
- **THEN** 页面直接显示绘图库，请求能够读取和保存当前单用户的数据

### Requirement: Authentication endpoints and UI SHALL be absent

后端 MUST NOT 挂载 `/auth/*`、OIDC、密码重置、API key、管理员用户和 impersonation 路由；前端 MUST NOT 提供登录、注册、认证初始化、账户安全、API key 或管理员入口。

#### Scenario: Probe a removed authentication route

- **WHEN** 客户端请求 `/api/auth/status`，或携带有效 CSRF cookie/token 请求 `/api/auth/login`
- **THEN** 服务端返回普通的未找到响应，前端没有认证页面或重定向循环

### Requirement: Existing personal drawing protections SHALL remain

绘图库 SHALL 保留版本冲突、历史快照、文件存储、CSRF 和公开链接分享策略。访问策略保持原 `disabled` 模式：所有访问者使用同一个本地身份，拥有该身份的绘图；公开链接不提供与该身份隔离的访客权限。其他历史用户的数据不自动合并或开放。

#### Scenario: Save through the existing API

- **WHEN** 单用户页面使用当前版本提交场景修改
- **THEN** 场景、图片、历史和版本检查与认证移除前一致，过期版本仍返回冲突

### Requirement: Preferences SHALL remain local to the browser

前端 SHALL 通过已有 localStorage 保存主题、语言、排序和编辑器偏好，不调用账户偏好接口，也不因认证移除清空已有偏好。

#### Scenario: Reload after changing a preference

- **WHEN** 用户修改主题或编辑器偏好后刷新页面
- **THEN** 新偏好仍然生效，网络请求中没有账户偏好接口调用
