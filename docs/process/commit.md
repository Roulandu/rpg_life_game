# 提交规范

## 目的

让每次提交都能回答四个问题：

1. 改了什么、加了什么功能？
2. 改了哪些范围？
3. 具体修改点是什么？
4. 怎么验证的、有没有回归风险？

同时给机器留下可校验的结构，防止“只写一句 update”或“声称测试通过但没跑”。

## 格式

保留英文类型前缀用于工具筛选，标题和正文用中文。

```text
<type>(<scope>): <中文标题>

变更内容:
- ...

修改范围:
- src/...
- tests/...
- docs/...

修改点:
- ...

验证情况:
- RED: <测试路径> > <用例名> — 失败：<失败信息>
- GREEN: <命令> — <结果>

回归风险与验证:
- 风险：...
- 验证：...

文档影响:
- ...

Docs-Impact: updated | none: <理由≥4字>
Test-Impact: updated | none: <理由≥4字> | removed: <理由≥4字>
Baseline-Update: <仅改基线/已知违规时需要>
```

## 类型与 scope

| type | 用途 |
|---|---|
| `feat` | 新功能、新行为 |
| `fix` | 修 bug，必须有回归测试 |
| `test` | 只改测试 |
| `refactor` | 行为不变的结构调整 |
| `docs` | 只改文档 |
| `chore` | 构建、依赖、脚本、配置 |
| `perf` | 性能优化，行为不变 |

`scope` 用模块或功能名，小写：`engine`、`matchday`、`saves`、`agent`、`ui`、`platform`、`quality`、`docs`。不要用文件名当 scope。

标题 4–72 个字符，不用句号，不用“更新代码”这类空话。

## 六段内容

### 变更内容

写用户/系统可感知的变化，而不是文件列表。

- 好：`训练时按强度与体能计算受伤概率，受伤后停赛 1–3 周`
- 差：`修改 training.ts`

### 修改范围

列出本次提交实际改动的文件或目录，必须覆盖所有 staged 的 `src/ tests/ docs/ quality/` 文件。commit-msg 钩子会校验。

### 修改点

写实现层面的关键点：新增/删除了什么函数、数据流怎么变、为什么这样改。不要贴大段 diff。

### 验证情况

- `feat` / `fix` 必须有 `RED:` 和 `GREEN:`。
- `refactor` / `perf` 允许 `RED: 不适用（行为不变，已有测试覆盖）`，但必须有 GREEN。
- `docs` / `chore` 可写 `RED/GREEN: 不适用`，但必须说明实际跑了什么检查。
- RED 必须包含 `tests/...` 路径、用例名/选择器、失败信息（≥4 字符）。
- GREEN 必须包含实际命令和结果（如 `12 passed`、`npm run check:fast 通过`）。

RED/GREEN 必须指向同一个测试。不要用“手动点了一下”代替可复现命令。

### 回归风险与验证

写这次修改可能弄坏什么，以及用什么测试/命令证明没弄坏。改到别人改过的文件时尤其重要。

示例：

```text
回归风险与验证:
- 风险：同种子训练结果变化，旧回放哈希可能改变
- 验证：tests/engine/golden.test.ts 已更新哈希并说明原因；赛季模拟测试通过
```

### 文档影响

写更新了哪份文档，或为什么不涉及。Trailer 必须与正文一致。

## Trailer 规则

| Trailer | 含义 | 校验 |
|---|---|---|
| `Docs-Impact: updated` | 同步改了文档 | 必须存在被改的模块文档 |
| `Docs-Impact: none: <理由>` | 明确不涉及文档 | 理由 ≥4 字，CI 会展示 |
| `Test-Impact: updated` | 同步改了测试 | 测试文件必须在修改范围内 |
| `Test-Impact: none: <理由>` | 行为不变/仅文档 | 理由 ≥4 字 |
| `Test-Impact: removed: <理由>` | 有意删测试 | 理由 ≥4 字，必须 review |
| `Baseline-Update: <理由>` | 改质量基线或已知违规 | 必须解释为什么基线不能只降 |

## 示例

### 新功能

```text
feat(engine): 训练结算加入伤病概率

变更内容:
- 训练时按强度与体能计算受伤概率，受伤后停赛 1-3 周

修改范围:
- src/engine/training.ts
- tests/engine/training.test.ts
- docs/features/weekly-turn.md

修改点:
- 新增 injuryRisk 纯函数，由 applyTraining 调用
- 使用 domain='training' 的确定性 Rng

验证情况:
- RED: tests/engine/training.test.ts > 高强度训练会受伤 — 失败：expected 0 to be greater than 0
- GREEN: npm test -- tests/engine/training.test.ts — 12 passed；npm run check:fast 通过

回归风险与验证:
- 风险：同种子训练结果变化，旧回放哈希可能改变
- 验证：tests/engine/golden.test.ts 已更新哈希并说明；赛季模拟测试通过

文档影响:
- 更新 docs/features/weekly-turn.md 的规则与伤病接口

Docs-Impact: updated
Test-Impact: updated
```

### Bug fix

```text
fix(matchday): 修复跳过关键时刻后比分未结算

变更内容:
- 选择“跳过”后仍按模拟结果结算比分与评分

修改范围:
- src/engine/keyMoments.ts
- tests/engine/keyMoments.test.ts
- docs/features/matchday.md

修改点:
- 跳过分支补上 finalizeMatch 调用
- 增加回归用例，覆盖跳过与观看两条路径结果一致

验证情况:
- RED: tests/engine/keyMoments.test.ts > 回归: 跳过后比分与观看一致 — 失败：expected 1 to be 0
- GREEN: npm test -- tests/engine/keyMoments.test.ts — 18 passed

回归风险与验证:
- 风险：观看路径重复结算
- 验证：观看/跳过对比用例 + 全量赛季模拟

文档影响:
- 更新 docs/features/matchday.md 的跳过语义

Docs-Impact: updated
Test-Impact: updated
```

### 文档/杂务

```text
docs(process): 新增提交与 TDD 规范

变更内容:
- 补充六段式提交模板与 RED/GREEN 证据要求

修改范围:
- docs/process/commit.md
- docs/process/tdd.md

修改点:
- 明确 Trailer 与 hook/CI 校验边界

验证情况:
- RED: 不适用（仅文档）
- GREEN: npm run check:doc-sync -- --base origin/main 通过

回归风险与验证:
- 风险：规则与现有 CI 冲突
- 验证：本地跑通全部质量脚本

文档影响:
- 本次提交本身就是文档

Docs-Impact: updated
Test-Impact: none: 仅文档与规范，不涉及可执行行为
```

## 钩子与 CI

- `commit-msg`：校验标题、六段、RED/GREEN 形状、Trailer、修改范围覆盖 staged 文件。
- `pre-commit`：跑暂存文件的密钥/`.only`/`.skip`/oxlint 检查，以及全仓技术债、边界、重复率检查（不跑需要 base 的 test-impact/doc-sync，CI 负责）。
- CI：对 `base..HEAD` 的每个提交重新校验消息；本地 `--no-verify` 绕不过去。
- `Merge` / `Revert` / `fixup!` / `squash!` 跳过消息校验。

## 常见错误

| 错误 | 结果 |
|---|---|
| 只写 `update` / `fix bug` | 标题或段落校验失败 |
| `修改范围` 与实际 staged 文件不一致 | 提交被拒 |
| `feat` 没有 RED/GREEN | 提交被拒 |
| RED 只写“测试失败”，没有路径/信息 | 提交被拒 |
| 改了 `src` 没改测试也没豁免 | 提交被拒 |
| 改了 `src` 没改文档也没豁免 | 提交被拒 |
| 改基线不写 `Baseline-Update` | CI 标红 |
| 用 `--no-verify` 逃避 | CI 复查提交，仍标红 |

## 例外

- 紧急回滚/线上事故：可以 `--no-verify`，但必须在 PR 描述里写明原因，并尽快补合规提交。
- 纯格式化/机械重命名：仍需六段，但 `Test-Impact` 可写 `none` 并说明由现有测试覆盖。
- 合并提交、revert：按 Git 默认格式，不做六段校验。
