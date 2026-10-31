# Tasks

## 1. 实施

- [x] 1.1 精简桌面/移动侧栏和工具菜单，删除 Beta、资料入口、头像和「与我共享」。
- [x] 1.2 将必要的邮箱及密码管理迁入设置，删除个人资料页/路由；更新关联提示。
- [x] 1.3 清理分享头像、共享虚拟视图专属分支、无调用组件/API/样式，保留集合授权。
- [x] 1.4 同步中英文、使用文档、测试工具及截图场景。

## 2. 验证

- [x] 2.1 补充并运行个人界面 Playwright，覆盖桌面/移动、匿名/认证和两种侧栏布局。
- [x] 2.2 运行邮箱/密码变更和只读分享的认证回归，使用隔离数据库及独立测试账户。
- [x] 2.3 运行前端单测、`npm run check`、`npm run build`、`npm run docs:build`
      与 `npm --prefix e2e run check`。
- [x] 2.4 运行 `git diff --check` 和 `openspec validate --all --strict --no-interactive`。

## 3. 收尾

- [ ] 3.1 记录 Validation，归档并同步规格，提交推送独立分支；不合入 main。

## Validation

### 已通过

- 分支 `feat/personal-interface` 基于 `628ac6c`，使用隔离工具链 Node.js 24.22.1、
  npm 10.9.2；未在 main 开发，未改依赖、后端或数据库 schema/migration。
- `npm --prefix frontend run test:unit`：6 个文件、47 项测试通过。
- `npm run check`：全量 Prettier、ESLint、版本和环境变量边界检查通过。
- `npm run build`：backend/frontend 类型检查和构建通过；`npm run docs:build` 通过；
  `npm --prefix e2e run check` 通过。
- `npm --prefix e2e test`：73 项匿名 Chromium 场景通过，包括新增的中英文、1280px
  和 390px 导航、集合、设置、两种侧栏方式和回收站场景；无旧共享列表请求。
  既有绘图、图片、导入导出、历史、版本竞争、本地草稿及搜索回归也通过。
- `npm --prefix e2e run test:auth` 中既有 6 项认证场景通过，包括登录/退出、权限拒绝、
  只读分享、设置偏好和移动侧栏无身份展示；可选截图场景未开启，跳过 1 项。
- 新增凭据场景首次在退出请求尚未完成时跳转，测试取消了异步退出，导致超时。
  脚本改为等待退出响应和登录表单后，定向运行
  `npm --prefix e2e run test:auth -- tests/auth-workflows.spec.ts -g 'account security in Settings'`
  通过：独立测试账户成功修改邮箱、使用新邮箱登录、拒绝错误当前密码、成功改密、
  自动退出并使用新密码登录。没有为该测试修改应用的认证行为。
- `git diff --check`、change 严格校验和归档前全量 OpenSpec 校验 4/4 通过。

### 未验证及边界

- 未部署 keeper，未访问其数据库、uploads、密钥或备份；生产界面仍是上一部署版本。
- 本轮未重跑后端集成测试，后端源码无修改；没有验证真实 OIDC/S3/PostgreSQL、
  Firefox/Safari、生产 Gateway 前缀或生产写入、备份/恢复。
- 截图测试已更新为设置中的账户安全区域，未运行可选的整站截图生成。
