# 文档与代码同步

## 问题

文档最容易在“代码改了、文档忘了”中腐化。本规范把文档分成两类：

- **机器可验证的结构**：路径、章节、图表类型、链接、生成文件、代码与文档是否同提交。
- **只能人工 review 的语义**：业务描述是否仍正确、时序图是否画对、接口说明是否完整。

门禁能防“完全没改文档”，不能防“改了但写错”。不要把 CI 绿当成文档正确。

## 文档分层

| 文档 | 内容 | 更新时机 |
|---|---|---|
| `AGENTS.md` | 硬规则、命令、红线 | 流程变化 |
| `docs/process/*` | 流程细则 | 规则变化 |
| `docs/modules.yaml` | 模块、依赖、测试、文档映射 | 新增模块/改变边界 |
| `docs/architecture/overview.md` | 上下文图、模块依赖、关键流程 | 架构变化 |
| `docs/architecture/modules.md` | 生成式模块索引 | 由 `docs:build` 生成 |
| `docs/architecture/platform-strategy.md` | 端口、适配器、能力矩阵、断点 | 多端策略变化 |
| `docs/features/*.md` | 每个功能的业务规则、时序、接口、降级 | 行为变化 |
| `docs/data-model.md` | WorldState、存档 envelope、IndexedDB、迁移 | 数据结构变化 |
| `docs/interfaces/*.md` | engine 公共接口、LLM 工具契约 | 接口变化 |
| `docs/decisions/*` | ADR | 重大架构决策 |

## 功能文档 frontmatter

```markdown
---
feature: weekly-turn
status: implemented        # implemented | planned | deprecated
modules: [engine, store]
code: [src/engine/turn.ts]
tests: [tests/engine/season.test.ts]
diagrams: [sequence]
last_reviewed: 2026-10-26
---
```

- `code` / `tests` 必须存在（`planned` 用 `plannedCode`）。
- `status: planned` 的文档可以引用不存在的文件，但链接要用 `planned:` 前缀。
- `last_reviewed` 超过 180 天只告警，不阻断。

## 功能文档必备章节

```markdown
## 业务目标
## 用户流程
## 关键时序（mermaid sequenceDiagram）
## 规则与边界
## 数据与接口
## 失败与降级
## 平台差异
## 验收与测试映射
## 变更记录
```

要求：

- 业务目标：解决什么问题，不写实现细节。
- 用户流程：玩家/系统视角的步骤。
- 关键时序：至少一个 `sequenceDiagram`，覆盖主流程和失败分支。
- 规则与边界：公式、阈值、状态转换、不可变条件。
- 数据与接口：读写哪些类型/函数/工具 schema。
- 失败与降级：无网络、无 Key、超时、校验失败、存档损坏。
- 平台差异：Web/Android/iOS/微信的差异或“无差异”。
- 验收与测试映射：哪些测试覆盖哪些规则。
- 变更记录：日期 + 变更点 + 关联提交/ADR。

## 架构文档要求

`docs/architecture/overview.md`：

- 系统上下文图（`flowchart`）。
- 模块依赖图（目标 vs 当前）。
- 关键数据流：创建生涯 → 推进周 → 比赛日 → 存档。
- 与 `docs/modules.yaml` 一致的模块表。

`docs/architecture/modules.md`：

- 由 `scripts/quality/generate-module-docs.ts` 生成。
- 不要手改；CI 检查逐字节一致。

`docs/data-model.md`：

- `WorldState` 主要字段与不变量。
- 存档 envelope、校验、版本。
- IndexedDB 表（`saves`、`meta`、`secrets`）。
- 迁移策略与旧版本 fixture。

`docs/interfaces/*`：

- engine 公共函数签名与用途。
- LLM 工具 JSON schema、输入输出约束、失败行为。

## 同步门禁

`npm run check:doc-sync`：

1. 每个模块至少一份文档，路径存在。
2. frontmatter 的 `code` / `tests` 路径存在（`planned` 除外）。
3. 必备章节齐全；功能文档有 `sequenceDiagram`，架构总览有 `flowchart`。
4. 相对链接可解析；`planned:` 链接跳过。
5. `docs/architecture/modules.md` 与生成结果一致。
6. 改动 `src/**` 的模块，必须同提交改该模块文档，或带：
   `Docs-Impact: none: <理由≥4字>`。
7. `last_reviewed` 过期只告警。

### 改代码 → 改文档的映射

模块的文档列表在 `docs/modules.yaml`。例如：

- `src/engine/**` → `docs/features/weekly-turn.md`、`docs/features/matchday.md`
- `src/world/**` → `docs/features/world-generation.md`
- `src/llm/**` → `docs/features/gm-agent.md`
- `src/db/**`、`src/store/**` → `docs/features/saves.md`
- `src/platform/**` → `docs/architecture/platform-strategy.md`
- `src/domain/**` → `docs/data-model.md`
- `src/ui/**` → 相关功能文档
- `src/app/**` → `docs/architecture/overview.md`

一个模块有多份文档时，改其中任意一份即满足“同模块文档已更新”；如果改动只影响某个功能，优先改最相关的那份。

## 豁免

`Docs-Impact: none: <理由≥4字>` 只用于确实不影响文档的改动，例如：

- 内部变量重命名，不改变行为/接口/数据。
- 纯格式化、注释、测试辅助函数。
- 生成代码/基线更新。

豁免会出现在 CI 摘要里，不是静默通过。滥用豁免会被 review 打回。

## planned 文档

产品路线里尚未实现的文件：

- 用反引号写路径，不用 Markdown 链接。
- 功能文档标 `status: planned`，使用 `plannedCode`。
- 链接用 `planned:docs/...` 或普通文本，不让链接检查器误判。

不要为了过链接检查创建空文件假装已实现。

## 人工 review 清单

- [ ] 业务描述是否与当前代码一致？
- [ ] 时序图是否覆盖失败/降级分支？
- [ ] 规则/公式/阈值是否更新？
- [ ] 数据模型字段、版本、迁移是否写清？
- [ ] 接口签名/工具 schema 是否同步？
- [ ] 测试映射是否指向真实存在的测试？
- [ ] 平台差异是否仍然成立？
- [ ] 变更记录是否补充？

## 更新流程

1. 先改功能文档/数据模型（设计）。
2. 写失败测试。
3. 实现。
4. 跑 `npm run docs:build`（如果模块清单变了）。
5. 跑 `npm run check:doc-sync`。
6. 提交时写 `Docs-Impact`。

## 限制

- 不校验文档语义正确性。
- 不校验 mermaid 是否渲染成功（只校验 fence 类型）。
- 不校验接口说明是否完整。
- 不强制每行代码都有文档；只要求模块/功能级别覆盖。

这些限制是刻意的：过度自动化会制造脆弱门禁，最终被人绕过。
