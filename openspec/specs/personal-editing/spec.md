# personal-editing Specification

## Purpose

定义个人绘图库中独立页面的编辑和恢复契约。在保留绘图基础功能的前提下取消实时共同编辑，并通过明确的冲突处理、本地草稿及按需刷新，保护同一绘图在多个页面打开时的未保存内容。

## Requirements

### Requirement: Editing SHALL work without real-time collaboration

编辑器 SHALL 通过 HTTP 读取和保存场景，不建立实时协作连接，不显示其他页面的光标或在线成员，不接收其他页面的实时场景变化。服务端 MUST NOT 提供 Socket.IO 协作入口。绘图库、素材库、图片、导入导出、历史、认证和既有分享权限 SHALL 保持可用。

#### Scenario: Edit without a collaboration transport

- **WHEN** 用户打开绘图、编辑并保存，然后重新打开该绘图
- **THEN** 内容通过 HTTP 成功保存和加载，浏览器没有 Socket.IO 或其他实时协作连接请求

#### Scenario: Preserve shared access checks

- **WHEN** 只读分享访问者尝试修改绘图
- **THEN** HTTP 保存仍被权限检查拒绝，不因协作功能移除而获得编辑权限

### Requirement: Save conflicts SHALL require an explicit resolution

编辑器收到原图的版本冲突后 SHALL 保留本页场景和草稿，暂停对原图的自动保存及关联预览写入，明确显示未保存状态。它 MUST NOT 自动合并、自动改用新版本重试或强制覆盖。用户 SHALL 能够选择加载最新版本或将本页场景另存为副本，操作失败时保持本页内容可恢复。

#### Scenario: Keep the losing page unchanged

- **WHEN** 两个页面基于版本 10 编辑，A 保存为版本 11，B 保存得到版本冲突
- **THEN** B 保留自己的画布和草稿并进入冲突状态，版本 11 保持 A 的内容，B 的排队保存和离开页面保存不再写入原图

#### Scenario: Load the latest scene safely

- **WHEN** 冲突页面选择加载最新版本并确认放弃本页修改
- **THEN** 只有成功取得最新场景后才替换当前画布并恢复正常编辑；加载失败时保留本页画布及草稿，不删除其他页面的草稿

#### Scenario: Save local changes as an independent copy

- **WHEN** 冲突页面选择另存为副本且创建成功
- **THEN** 新绘图包含本页的元素、持久化画布设置和图片，具有独立绘图 ID 及可独立读取的图片，原图保持不变

#### Scenario: Keep changes when creating a copy fails

- **WHEN** 另存副本因断网、权限或图片读取失败而不能完整提交
- **THEN** 编辑器显示失败并保留本页画布及草稿，不把原图标记为已保存，不跳转到不完整的副本

### Requirement: Unsaved drafts SHALL be recoverable and isolated

编辑器 SHALL 将未保存场景、基础版本及所需图片持久化为本地草稿，并按服务、账户、绘图和页面实例隔离。重新打开绘图时 SHALL 提供恢复已有草稿的选择，不自动覆盖服务器。草稿不能只保留在页面内存；本地存储失败时 SHALL 显示保护未生效及未保存状态，并保留可用的导出操作。

#### Scenario: Recover after closing a page

- **WHEN** 一个已成功写入本地存储但尚未保存到服务器的草稿所在页面关闭，用户再次打开该绘图
- **THEN** 用户能够选择恢复该草稿，包括当时未上传图片的内容；草稿基础版本落后时必须经过冲突处理，不自动写回原图

#### Scenario: Isolate two pages and two accounts

- **WHEN** 同一绘图在两个独立或复制出的标签页中产生不同草稿，或用户在同一浏览器切换账户
- **THEN** 页面草稿互不覆盖，当前账户的恢复列表不暴露其他账户的草稿，清理一份草稿不删除其他页面的草稿

#### Scenario: Report unavailable local storage

- **WHEN** 本地存储被禁用、写入失败或容量不足
- **THEN** 页面不能宣称草稿已受到本地保护；服务器保存仍可按正常版本检查尝试，失败时保留当前画布并明确提示未保存

### Requirement: Clean pages SHALL refresh without overwriting local edits

绘图页面重新获得焦点时，如果没有未保存修改、保存请求或待处理草稿，SHALL 按需检查并加载服务器的新版本。有本地修改或冲突时 MUST NOT 自动替换画布；检查期间新增修改后也不得应用过期读取结果。网络失败 SHALL 保留当前场景，重连后仍使用版本检查。

#### Scenario: Refresh a clean page

- **WHEN** B 没有本地修改，A 已保存新版本，用户切回 B
- **THEN** B 在成功读取后显示服务器最新内容，不需要建立实时协作连接

#### Scenario: Protect edits made while refreshing

- **WHEN** 页面检查最新版本期间用户开始编辑，或检查前已有未保存修改
- **THEN** 返回的场景不替换本地画布；后续保存如果版本过期，则进入明确的冲突处理
