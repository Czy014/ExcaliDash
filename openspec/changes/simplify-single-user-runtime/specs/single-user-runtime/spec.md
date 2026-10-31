## MODIFIED Requirements

### Requirement: Single-user runtime SHALL serve the library without credentials

运行时 SHALL 使用固定工作区身份 `bootstrap-admin` 处理绘图、集合、文件、历史、导入导出和设置请求；请求不需要登录 cookie、Bearer token 或 API key。工作区 ID SHALL 直接来自固定常量，不建立请求用户或多用户 principal 适配层。旧用户和认证字段 MUST 保留在数据库中，不通过启动或请求自动删除。

#### Scenario: Open the library on a fresh browser

- **WHEN** 浏览器没有认证 cookie 和本地登录状态并访问绘图库
- **THEN** 页面直接显示绘图库，请求能够读取和保存当前单用户的数据

#### Scenario: Ignore supplied identities

- **WHEN** 请求携带过期凭据或声称其他用户身份的请求头
- **THEN** 仍使用同一个固定工作区，不能借此读取或修改未通过公开链接开放的历史用户绘图
