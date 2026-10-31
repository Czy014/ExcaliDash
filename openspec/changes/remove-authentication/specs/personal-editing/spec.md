## MODIFIED Requirements

### Requirement: Editing SHALL work without real-time collaboration

编辑器 SHALL 通过 HTTP 读取和保存场景，不建立实时协作连接，不显示其他页面的光标或在线成员，不接收其他页面的实时场景变化。服务端 MUST NOT 提供 Socket.IO 协作入口。绘图库、素材库、图片、导入导出、历史、单用户运行方式和公开链接 SHALL 保持可用。

#### Scenario: Edit without a collaboration transport

- **WHEN** 用户打开绘图、编辑并保存，然后重新打开该绘图
- **THEN** 内容通过 HTTP 成功保存和加载，浏览器没有 Socket.IO 或其他实时协作连接请求

#### Scenario: Preserve shared access checks

- **WHEN** 访问者尝试修改自己无编辑权限的历史绘图
- **THEN** HTTP 保存仍被权限检查拒绝，不因协作功能移除而获得编辑权限

### Requirement: Personal library navigation SHALL omit redundant identity presentation

个人绘图库前端 SHALL 不展示 Beta 标识、用户头像、个人资料入口或个人资料页面，
并 SHALL 不再提供「与我共享」虚拟集合视图。侧栏工具 SHALL 使用与用户身份无关的
工作区标签，保留紧凑和展开方式下的回收站和设置；不提供账户、管理员和退出操作。
分享对话框 SHALL 只提供公开链接设置，不提供按用户授权。

#### Scenario: Browse a personal library on desktop and mobile

- **WHEN** 用户在桌面或移动端打开资料库、集合及设置，切换侧栏显示方式
- **THEN** 界面没有 Beta、头像、个人资料或「与我共享」入口，回收站和设置仍可访问

#### Scenario: Keep authorized sharing operations

- **WHEN** 用户打开分享对话框或通过既有分享链接访问绘图
- **THEN** 公开链接设置保持可用，不展示添加人员或按用户授权入口

## REMOVED Requirements

### Requirement: Account security SHALL remain available in Settings

**Reason**: 用户确认移除前后端认证，账户安全不再是个人绘图库能力。

**Migration**: 直接使用单用户工作区；现有数据库字段保留，不再提供账户路由。
