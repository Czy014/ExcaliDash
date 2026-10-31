# Design

## Context

`Sidebar.tsx` 与 `Layout.tsx` 分别展示桌面和移动端 Beta 标识。`SidebarFooter.tsx`
把工具入口放在姓名头像菜单中，并链接到 `/profile`。`Profile.tsx` 除资料展示外还
承载修改登录邮箱及密码，不能直接删除而丢失账户管理能力。分享对话框也使用
`UserAvatar.tsx`，头像移除时须一并清理调用及样式。

`Dashboard.tsx`、`useDashboardData.ts` 和相关面板通过 `shared` 虚拟集合装配
「与我共享」视图，包括专用请求、筛选和仅对接收者隐藏的操作。这条前端路径随入口
一起移除；集合授权和链接分享继续使用原有服务端权限检查。

## Goals / Non-Goals

**Goals:**

- 导航直接面向绘图库及工作区工具，所有屏幕尺寸和侧栏显示方式均无头像、资料及 Beta。
- 必要的邮箱、密码、设置、回收站和退出功能仍可用。
- 删除本次失去调用者的前端分支和组件，而非保留隐藏的个人资料页。

**Non-Goals:**

- 不移除认证、管理后台、链接分享、集合授权或服务端相关 API。
- 不改变场景保存、版本竞争、本地草稿、图片和历史。
- 不修改数据库、依赖、Homebase core、部署配置或 keeper 运行数据。

## Decisions

### 1. 复用侧栏工具菜单

保留现有 `compactSidebar` 偏好及展开、Escape、点外关闭、拖入回收站行为；菜单按钮
改用通用工具图标和本地化「工作区」文字。非紧凑布局直接显示工具，不再追加身份行。
移除 Profile lazy import、路由及个人姓名修改表单，不增加兼容路由。

### 2. 账户安全并入设置

从 `Profile.tsx` 提取邮箱操作为 `settings/AccountSettings.tsx`，复用既有 PasswordCard，
将 PasswordCard 和 ApiKeysCard 搬入 settings 目录。仅认证开启时展示账户管理，
`oidc_enforced` 继续隐藏本地改密入口。保留错误处理、当前密码确认、成功反馈和
修改密码后的退出；强制重置仍由现有 Login/ProtectedRoute 处理。

### 3. 移除展示与专属分支

删除「与我共享」入口、标题、请求装配及独有隐藏操作，移除失去调用者的前端 API
包装和 props。保留共享集合的权限标识与写入保护，不改变真实集合的可见性。
分享对话框保留名称和权限文本，删除头像组件及只为其服务的样式和工具函数。
Beta 标识在两处源组件直接删除，不通过 CSS 隐藏。

## Validation

- 在隔离数据库运行匿名和认证 Playwright，验证桌面及移动端无资料、头像、Beta 和
  「与我共享」入口，验证紧凑/展开工具、回收站、集合、设置和退出仍可访问。
- 认证场景验证设置中的邮箱变更（含错误密码拒绝）和密码变更后的重新登录；测试
  使用独立临时账户，不改既有测试账户密码，保留只读分享回归。
- 执行前端单测、`npm run check`、`npm run build`、`npm run docs:build`、
  `npm --prefix e2e run check`、diff 检查与严格 OpenSpec 校验。
- 记录实际通过和未验证项，完成后同步主规格、归档并提交推送分支，不合入 main。
