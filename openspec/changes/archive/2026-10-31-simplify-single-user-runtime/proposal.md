## Why

认证已移除，但路由仍注入和检查请求用户，再包装为仅有一种身份的 principal；列表缓存仍按用户分区。这些结构增加单用户实现的维护成本。

## What Changes

- 使用固定工作区 ID，删除请求用户、principal 适配层和不可达的认证分支。
- 将工作区数据行的初始化集中到一个入口，同一进程成功初始化后不再逐请求查询。
- 删除列表缓存的用户维度和未调用的审计读取接口、前端所有者字段。
- 同步测试夹具和维护说明，保持既有 HTTP 行为、数据库结构、存储路径、草稿键和公开链接策略。

## Capabilities

### New Capabilities

无。

### Modified Capabilities

- `single-user-runtime`: 明确工作区身份直接来自固定常量，不依赖请求用户或多用户 principal。

## Impact

影响后端工作区初始化、绘图库、文件、导入导出路由及测试；不修改数据库 schema、迁移、Homebase 或 keeper。
