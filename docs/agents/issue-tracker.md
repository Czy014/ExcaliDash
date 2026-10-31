# Issue tracker

This fork uses [GitHub Issues](https://github.com/Czy014/ExcaliDash/issues) for bugs and backlog items. Feature design, implementation tasks, validation and archives belong in this repository's `openspec/`. Work already covered by an OpenSpec change does not need a duplicate issue.

## Reading issues during review

A `#123` reference in a new fork commit points to `Czy014/ExcaliDash` by default. Fetch the issue text, labels and discussion with read-only commands, then review it alongside the commit's OpenSpec change:

```sh
gh issue view 123 --repo Czy014/ExcaliDash --json number,title,body,state,labels,url
gh issue view 123 --repo Czy014/ExcaliDash --comments
```

Issue numbers in historical upstream commits belong to `ZimengXiong/ExcaliDash`. Do not resolve them against the fork's issue numbers. Use the original repository when an upstream issue URL is supplied:

```sh
gh issue view 123 --repo ZimengXiong/ExcaliDash --json number,title,body,state,labels,url
```

When no issue is referenced, use `openspec/changes/`, archived changes and current specifications as the requirements source. Do not skip specification review because there is no issue, and do not automatically create, comment on or close issues.
