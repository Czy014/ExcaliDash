## ADDED Requirements

### Requirement: Personal library navigation SHALL omit redundant identity presentation

个人绘图库前端 SHALL 不展示 Beta 标识、用户头像、个人资料入口或个人资料页面，
并 SHALL 不再提供「与我共享」虚拟集合视图。侧栏工具 SHALL 使用与用户身份无关的
工作区标签，保留紧凑和展开方式下的回收站、设置以及适用的管理与退出操作。
分享对话框 SHALL 使用名称和权限文本，不展示头像。

#### Scenario: Browse a personal library on desktop and mobile

- **WHEN** 用户在桌面或移动端打开资料库、集合及设置，切换侧栏显示方式
- **THEN** 界面没有 Beta、头像、个人资料或「与我共享」入口，回收站和设置仍可访问

#### Scenario: Keep authorized sharing operations

- **WHEN** 用户打开分享对话框或通过既有分享链接访问绘图
- **THEN** 名称、权限控制和链接访问保持可用，隐藏头像不改变授权或授予写入能力

### Requirement: Account security SHALL remain available in Settings

启用认证时，前端 SHALL 在设置页提供原有的登录邮箱和密码管理，保留当前密码确认、
错误反馈、强制重置及修改密码后退出。认证关闭时 SHALL 不展示账户身份表单；
OIDC 强制模式 SHALL 不提供本地密码修改。

#### Scenario: Change login credentials safely

- **WHEN** 本地认证用户在设置页修改邮箱或密码
- **THEN** 当前密码错误时请求被拒绝，成功后使用新邮箱或密码能够登录，密码修改后退出

#### Scenario: Use the library with authentication disabled

- **WHEN** 认证关闭且用户打开设置
- **THEN** 设置仍可使用，不展示邮箱、密码或个人资料表单
