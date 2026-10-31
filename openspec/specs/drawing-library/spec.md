# drawing-library Specification

## Purpose

记录 ExcaliDash 绘图库和编辑器已有的基础契约，涵盖分类、完整画布、图片、可移植文件和历史恢复，用于精简实时协作时逐项验证这些能力仍然可用。

## Requirements

### Requirement: Drawing library SHALL organize drawings and collections

系统 SHALL 提供绘图的新建、打开、重命名、分类和回收站操作，并支持通过分类和搜索定位绘图。分类、未分类和回收站 SHALL 显示各自对应的绘图。

#### Scenario: Open a collection

- **WHEN** 用户打开一个已有分类
- **THEN** 列表显示该分类中的绘图，未分类和其他分类的绘图不混入该列表

#### Scenario: Recover a drawing from trash

- **WHEN** 用户将绘图移入回收站后执行恢复
- **THEN** 绘图能够再次打开并编辑，其画布内容保持可用

### Requirement: Editor SHALL preserve complete drawing scenes

编辑器 SHALL 使用官方 Excalidraw 绘图能力，加载和保存场景元素、持久化画布设置及关联图片。图片以文件引用存储时，重新打开绘图 SHALL 能够取得对应图片内容。

#### Scenario: Reopen an image drawing

- **WHEN** 用户保存带有文本、图形和图片的绘图并重新打开
- **THEN** 这些元素及图片均能显示，持久化画布设置被恢复

### Requirement: Drawing library SHALL support portable drawing files

系统 SHALL 支持导入 Excalidraw 绘图文件和导出可再次导入的绘图内容，保留场景元素及其需要的图片内容。

#### Scenario: Round trip a drawing file

- **WHEN** 用户将带图片的绘图导出为 Excalidraw 文件，再导入为新绘图
- **THEN** 新绘图中的场景和图片保持可编辑，不覆盖原绘图

### Requirement: Drawing library SHALL retain scene history

系统 SHALL 提供场景历史快照的查看及恢复。恢复历史场景 SHALL 保留恢复前的场景作为历史记录，并作为新的场景版本提交。

#### Scenario: Restore a previous scene

- **WHEN** 用户对已有历史快照的绘图执行恢复
- **THEN** 当前画布变为所选历史内容，恢复前的场景仍能从历史中取得
