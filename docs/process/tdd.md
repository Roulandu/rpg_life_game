# TDD 与验证证据

## 为什么

模型容易“先写实现，再补一个能过的测试”，甚至声称测试通过但没运行。TDD 的门禁目标不是追求形式，而是让“先失败、再通过”有可验证的痕迹。

## 标准流程

1. 从 `docs/modules.yaml` 找到模块、功能文档、测试目录。
2. 写一个能表达需求的测试；测试名用中文描述行为。
3. 运行测试，确认它因预期原因失败（RED）。
4. 写最小实现，让同一个测试通过（GREEN）。
5. 小步重构，保持测试绿。
6. 更新功能文档/数据模型/接口。
7. 跑 `npm run check:fast`，提交；push 前跑 `npm run check`。

## RED 证据格式

提交的 `验证情况` 必须包含：

```text
RED: tests/engine/training.test.ts > 高强度训练会受伤 — 失败：expected 0 to be greater than 0
```

要求：

- 必须有 `tests/...` 路径。
- 必须有用例名或测试选择器。
- 必须有真实失败信息（≥4 字符），不能只写“失败”。
- RED 与 GREEN 必须是同一个测试文件/用例。

机器只能验证格式和测试存在，不能验证“失败原因是否正确”。reviewer 要扫一眼 RED 是否真的对应需求。

## GREEN 证据格式

```text
GREEN: npm test -- tests/engine/training.test.ts — 12 passed；npm run check:fast 通过
```

要求：

- 命令可复现。
- 有结果（passed/failed 数量、退出码、检查通过）。
- 不能只写“已通过”。

## 测试放在哪里

- 单元/引擎：`tests/engine/*.test.ts`
- 世界生成：`tests/engine/world.test.ts`
- LLM：`tests/llm/*.test.ts`
- 存档：`tests/db/*.test.ts`
- store：`tests/store/*.test.ts`
- UI：`tests/ui/*.test.tsx`
- 共享 fixture：`tests/fixtures/`

## 测试影响检查

`check:test-impact` 基于分支累计 diff（不是单个提交），所以支持“先提交失败的测试，再提交实现”的两段式 TDD。

规则：

- 改 `src/**` 必须有测试改动。
- `strict` 模块：测试文件必须 import 被改文件。
- `via-module` 模块：允许模块测试目录内的相关测试改动。
- `feat` / `fix`：必须新增测试用例（CI 检查用例数或新测试文件，`.ts` 与 `.tsx` 均计入），不能只改实现。
- `fix`：必须有回归测试，或 RED 指向一个真实存在的测试。
- `refactor` / `perf`：可以不新增测试，但必须有 GREEN 证明现有测试通过。
- 纯类型/样式/生成文件可豁免，需 `Test-Impact: none: <理由>`。

## 覆盖率棘轮

- 使用 `@vitest/coverage-v8`。
- `quality/coverage-baseline.json` 记录全局与分模块 floor。
- 覆盖率只能升，不能降；下降超过 0.2pp 失败。
- 覆盖率不是唯一指标：简单测试灌水仍可能通过，所以同时要求新增用例、test-impact、golden replay 和 review。

## 测试数量与跳过

- 改动测试文件的用例数不得减少，除非 `Test-Impact: removed: <理由>`。
- 禁止 `.only`。
- `.skip` 必须在同一行写 `skip-reason: <原因>`；无理由的 skip 视为删除测试。
- 不允许为了过 CI 删除断言、放宽匹配或改 fixture 掩盖问题。

## 特殊场景

### 重构

行为不变时不需要新 RED，但必须：

- 现有测试覆盖被重构行为；
- GREEN 证明全量测试通过；
- 提交里说明“行为不变”。

### 文档/脚本

可以写 `RED: 不适用`，但必须跑对应检查（文档链接、脚本自测、`npm run check`）。

### UI

至少覆盖关键交互或状态变化；无法自动化的部分，提交里写清手动验收步骤和视口宽度。

### 存档

结构变化必须有版本升级、迁移、旧版本 fixture、导出/导入往返测试。

### 引擎

必须考虑确定性：同种子同结果；改输出时更新 golden replay 与 `ENGINE_VERSION`。

## 反模式

- 先写实现，再补一个只覆盖实现细节的测试。
- RED 是语法错误/导入错误，而不是断言失败。
- GREEN 只跑一个测试，却声称全量通过。
- 用 `.only` 让其他测试不跑。
- 删掉失败断言，改成快照。
- 改 fixture 让测试通过，但不说明业务变化。
- 只跑 `test:watch` 看到绿，不跑 CI 同款命令。

## 自检清单

- [ ] 测试先失败，失败原因与需求相关。
- [ ] 同一个测试现在通过。
- [ ] 新增/修改的测试能独立运行。
- [ ] 没有 `.only` / 无理由 `.skip`。
- [ ] `npm run check:fast` 通过。
- [ ] `npm run check` 通过。
- [ ] 文档已更新或豁免。
- [ ] 提交里有真实 RED/GREEN 证据。
