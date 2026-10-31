# scene-persistence Specification

## Purpose

记录现有 HTTP 场景保存的版本和数据完整性契约，防止个人编辑模式的改动造成较新内容被覆盖或图片、历史记录丢失。

## Requirements

### Requirement: Scene saves SHALL guard supplied versions

HTTP 场景更新携带 `version` 时，服务端 SHALL 在提交时检查该版本；版本检查和写入 SHALL 通过同一个事务中的条件更新完成。版本不匹配时 SHALL 返回 HTTP 409 和 `VERSION_CONFLICT`，不得覆盖当前场景。成功的场景写入 SHALL 增加版本并返回新版本。

#### Scenario: Reject a stale version

- **WHEN** 当前场景已是版本 11，客户端使用版本 10 提交场景
- **THEN** 服务端返回 HTTP 409 和 `VERSION_CONFLICT`，已保存的版本 11 内容保持不变

#### Scenario: Serialize simultaneous versioned saves

- **WHEN** 两个请求都基于同一个版本同时提交不同场景
- **THEN** 至多一个请求以该版本成功，另一个得到版本冲突，失败请求不覆盖成功请求的场景

### Requirement: Scene saves SHALL preserve files and history

成功的场景更新 SHALL 在同一事务中记录更新前场景的历史快照。普通场景保存 SHALL 保留已有图片引用，缺少某个文件或提交空白文件内容不得静默抹掉仍有内容的已有文件。

#### Scenario: Preserve an image omitted from a partial save

- **WHEN** 一个普通场景更新未提交已有图片的文件内容
- **THEN** 已有文件内容仍然可读取，不因缺少该字段而被删除

#### Scenario: Record the previous scene

- **WHEN** 一个带正确版本的场景更新成功提交
- **THEN** 历史中能取得写入前的场景，当前绘图返回写入后的内容和新版本
