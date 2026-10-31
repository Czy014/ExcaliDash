# Proposal

## Why

这个 fork 用于个人绘图库，需要保留 ExcaliDash 的绘图管理和编辑能力，去掉实时共同编辑。两个页面仍可能打开同一张图；当前自动合并重试的保存方式应改为明确的版本冲突处理，避免使用者不知道哪份内容最终被保存。

## What Changes

- **BREAKING**：移除前后端 Socket.IO 协作连接、房间、光标、在线状态和场景广播，不保留协作模式开关或兼容服务。
- 所有编辑器场景保存入口携带已加载版本；收到版本冲突后停止向原图自动保存和自动合并，保留当前画布及本地草稿。
- 冲突时提供“加载最新版本”和“另存为副本”。加载最新前确认放弃本页改动；副本使用本页完整场景创建，不覆盖原图。
- 将未保存的场景和图片写入按账户、绘图和页面实例隔离的浏览器草稿，支持失败后恢复；无本地修改时，页面重新获得焦点可以读取服务器最新版。
- 保留绘图、分类、搜索、回收站、素材库、导入导出、历史记录、现有认证、授权和分享能力，更新相关测试及文档。
- 本次不修改数据库结构，不切换前端框架，不重做界面，不实现跨设备草稿同步，不修改 Homebase 或部署 keeper。原生路径前缀支持和生产接入另行规划。

## Capabilities

### New Capabilities

- `personal-editing`：独立页面编辑、无实时协作、明确处理保存冲突、本地草稿恢复及无修改页面的按需刷新。

### Modified Capabilities

- `scene-persistence`：编辑器所有场景写入必须带有已加载版本，保存入口不得绕过版本检查或冲突暂停状态；保留已有事务、图片及历史保护。

## Impact

- 前端：`frontend/src/pages/Editor.tsx`、`frontend/src/pages/editor/`、绘图 HTTP 封装及现有文件重建工具；新增本地草稿存储和冲突处理界面。
- 后端：`backend/src/index.ts`、`backend/src/server/socket.ts`、dashboard 和 storage routes 的 Socket.IO 装配；保留 HTTP 路由及权限检查。
- 依赖与运行配置：移除双方的直接 Socket.IO 依赖、相关类型引用、Vite 和前端 Nginx 的协作代理；更新对应 lockfile。
- 验证：现有保存安全、图片、历史和分享测试，新增多页面竞争、草稿恢复和无 Socket.IO 请求的 Vitest/Playwright 场景。
- 外部 Socket.IO 客户端将不再受支持；生产容器、真实数据、Homebase 的 Draw 插件和数据库迁移均不在本次修改范围内。
