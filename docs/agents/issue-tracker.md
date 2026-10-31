# Issue tracker

本 fork 使用 [GitHub Issues](https://github.com/Czy014/ExcaliDash/issues) 记录 bug
和待办；功能设计、实施任务、验证与归档继续使用本仓库的 `openspec/`。
有 OpenSpec change 的工作无需另建一个同内容的 issue。

## 审查时读取 issue

本 fork 新增提交中的 `#123` 默认指向 `Czy014/ExcaliDash`。用只读命令取得正文、
标签和讨论，再结合提交关联的 OpenSpec change 审查：

```sh
gh issue view 123 --repo Czy014/ExcaliDash --json number,title,body,state,labels,url
gh issue view 123 --repo Czy014/ExcaliDash --comments
```

上游历史提交中的 issue 编号属于 `ZimengXiong/ExcaliDash`，不能按本 fork 的编号
查询。引用明确的上游 URL 时使用原仓库：

```sh
gh issue view 123 --repo ZimengXiong/ExcaliDash --json number,title,body,state,labels,url
```

没有 issue 引用时，直接以 `openspec/changes/`、归档 change 及主规格为需求来源。
不要因缺少 issue 而跳过规格审查，也不要自动创建、评论或关闭 issue。
