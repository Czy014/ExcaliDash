# Tasks

## 1. 准备实现环境

- [ ] 1.1 从规格分支建立独立实现分支，使用 Node.js >=24.22.1 和 npm 10.9.2；验证 `git branch --show-current` 不是 `main`，`node --version`、`npm --version` 满足要求，工作区没有未归属修改。
- [ ] 1.2 使用现有 lockfile 执行 `npm ci` 和 `npm run install:all`，运行 `npm --prefix frontend run test:unit -- tests/editor-save-safety.test.tsx` 取得保存安全测试基线；记录已有失败，确认未连接生产数据。

## 2. 本地草稿

- [ ] 2.1 在现有编辑器目录接入 IndexedDB 草稿读写，覆盖服务/账户/绘图/页面隔离、格式版本、图片内容、恢复和按本地修改序号清理。验证新增 Vitest 测试覆盖两个页面、复制标签页、账户切换、成功保存期间新增修改及存储失败。
- [ ] 2.2 在编辑过程中保存草稿并提供恢复入口、存储失败提示和导出退路；补充 `docs/guide/personal-editing.md` 的草稿说明。验证相关前端测试通过，新增 Playwright 场景证明关页重开可恢复已落盘草稿及未上传图片，另一页面草稿保持不变。

## 3. 版本冲突和恢复

- [ ] 3.1 调整 `useEditorPersistence.ts` 的保存状态及队列，移除 409 自动合并重试；所有编辑器场景保存携带已加载版本。更新保存安全单测，验证未知版本不写入、同版本两个请求最多一个成功、晚到响应不清理新草稿或污染其他绘图会话。
- [ ] 3.2 将 `useEditorCommands.ts` 的手动保存、返回、pagehide keepalive、卸载 flush 及关联预览写入接入同一冲突暂停检查。验证假时钟和请求断言覆盖冲突后各入口不再派发原图写入，网络失败保留未保存状态。
- [ ] 3.3 实现冲突提示、确认后加载最新、从本页完整场景另存副本，复用严格图片重建和现有 `POST /drawings`；补充个人编辑指南。验证前端测试及双页面 Playwright 场景覆盖两种操作、读取/创建失败；隔离数据库中删除原图后副本图片仍可读。
- [ ] 3.4 接入无本地改动页面的焦点刷新，补充指南中的多页面说明。验证前端测试覆盖读取期间开始编辑、绘图切换、保存中、冲突、待恢复草稿和断网；Playwright 验证仅干净页面会在切回时加载服务器新版本。

## 4. 移除实时协作

- [ ] 4.1 从 `Editor.tsx`、编辑器 Hooks 和界面删除协作连接、成员、光标及广播，保留本地场景处理和图片加载。更新相关前端安全测试和 `e2e/tests/collaboration.spec.ts`、`image-collab.spec.ts` 中适用的回归场景，验证正常编辑、图片、历史和导出不依赖协作。
- [ ] 4.2 删除后端 Socket.IO 服务以及 index、dashboard、storage 和分享路由的协作参数与广播，保留每次 HTTP 请求的权限检查。更新广播相关测试，验证后端集成测试覆盖版本竞争、图片保留、历史恢复和只读分享拒绝写入。
- [ ] 4.3 移除双方直接 Socket.IO 依赖及不再使用的代码，更新 lockfile、Vite 和前端 Nginx 配置。更新 README、`docs/guide/collaboration.md` 及其导航链接，指向个人编辑指南。验证构建和依赖树不再包含直接协作依赖，Playwright 记录打开、编辑、保存过程没有 Socket.IO 或替代实时协作连接请求。

## 5. 集成验证

- [ ] 5.1 执行 `npm --prefix frontend run test:unit`、`npm run test:integration`、`npm run check`、`npm run build`、`npm --prefix e2e run check`、`npm run test:e2e` 和 `npm run test:e2e:auth`。在隔离环境验证绘图/分类/回收站、素材库、图片、导入导出、历史、分享，以及双页面保存冲突和断网恢复，记录通过项及未验证项。
- [ ] 5.2 执行 `git diff --check`、`openspec validate remove-realtime-collaboration --strict --no-interactive` 和 `openspec validate --all --strict --no-interactive`；核对实现与全部 delta scenarios 一致，将源码提交、测试及构建结果记录在本文件的 Validation 中，确认未修改数据库模型或操作生产部署。

## Validation

2026-10-31，本轮只初始化项目规格，没有实施业务变更。

- `openspec context --json`：解析到 ExcaliDash 自己的仓库根目录，未使用父目录或 Homebase 的规格。
- `openspec validate --all --strict --no-interactive`：2 份主规格和 1 个 change 全部通过，3 passed / 0 failed。
- proposal、design、delta specs、tasks 四类工件齐备；apply 状态为 `ready`，实现任务为 0/13，均未勾选。
- Prettier 3.9.8 检查 `AGENTS.md`、`README.md` 和 OpenSpec Markdown/YAML 通过；`git diff --check` 通过。
- 改动范围仅为项目约定、README 和 OpenSpec 工件，未修改应用代码、依赖或数据库，未操作 keeper。
- 未验证：业务测试、应用构建、多页面行为、浏览器草稿和生产数据兼容性；当前本机 Node 24.21.0 低于项目要求，实施前须准备符合版本的工具链。

## Workflow follow-up

- 实施和验证完成后，按项目 OpenSpec 流程同步主规格并归档本 change；再执行全量严格规格校验，提交并推送实现分支。
- `main` 的合入需要单独指示；本 change 不部署 keeper、不修改 Homebase。生产路径前缀、镜像发布及 0.6.6 数据升级通过独立集成 change 处理。
