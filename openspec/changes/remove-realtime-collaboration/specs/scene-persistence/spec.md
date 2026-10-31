# Spec Delta

## MODIFIED Requirements

### Requirement: Scene saves SHALL guard supplied versions

编辑器的所有场景更新 SHALL 携带所基于的已加载版本，包括自动保存、手动保存、排队保存及离开页面时的保存；未知版本时不得提交场景。HTTP 场景更新携带 `version` 时，服务端 SHALL 在提交时检查该版本；版本检查和写入 SHALL 通过同一个事务中的条件更新完成。版本不匹配时 SHALL 返回 HTTP 409 和 `VERSION_CONFLICT`，不得覆盖当前场景。成功的场景写入 SHALL 增加版本并返回新版本。编辑器 MUST NOT 通过省略版本、替换为新版本或其他保存入口绕过冲突暂停状态。

#### Scenario: Reject a stale version

- **WHEN** 当前场景已是版本 11，客户端使用版本 10 提交场景
- **THEN** 服务端返回 HTTP 409 和 `VERSION_CONFLICT`，已保存的版本 11 内容保持不变

#### Scenario: Serialize simultaneous versioned saves

- **WHEN** 两个请求都基于同一个版本同时提交不同场景
- **THEN** 至多一个请求以该版本成功，另一个得到版本冲突，失败请求不覆盖成功请求的场景

#### Scenario: Block every scene save path after a conflict

- **WHEN** 页面已收到版本冲突，此时仍有防抖保存、队列请求、手动保存、组件卸载或页面关闭事件
- **THEN** 尚未发出的原图场景写入全部停止，页面不能通过其他入口继续保存原图，草稿继续记录本地修改

#### Scenario: Preserve edits when the version is unavailable

- **WHEN** 编辑器尚未成功读取绘图版本，或读取被网络错误中断
- **THEN** 不发送无版本的场景更新；已发生的本地修改按草稿保护，不错误显示为已保存
