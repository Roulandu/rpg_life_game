---
name: feature-delivery
description: 在 rpg_life_game 中按治理流程交付任何 src/tests/docs 改动：读模块清单与功能文档，先写失败测试并保留 RED 输出，再实现至 GREEN，更新文档并生成合规中文提交信息。
---

# 功能交付流程

在 `rpg_life_game` 中做任何 `src/`、`tests/`、`docs/`、`quality/` 改动时使用本 Skill。目标不是“写完代码”，而是“可验证、可回归、文档同步、符合模块边界”。

## 开工

1. 读 `AGENTS.md`。
2. 对每个要改的文件运行：

   ```bash
   npm run quality:file -- <path>
   ```

3. 读 `docs/modules.yaml` 找到模块、允许依赖、相关测试、相关文档。
4. 读对应 `docs/features/*.md` 与 `docs/process/anti-regression.md`。
5. 用一句话声明本次范围；不顺手改无关代码。

## RED

1. 在模块对应测试目录写测试，测试名用中文描述行为。
2. 运行最小测试：

   ```bash
   npm test -- <test-file>
   ```

3. 确认失败原因与需求相关，并原样保留失败输出（测试路径、用例名、错误信息）。
4. 如果测试没有失败，先修正测试；不能直接进入实现。

## GREEN

1. 写最小实现。
2. 运行同一个测试，确认通过。
3. 跑该模块相关测试，再跑：

   ```bash
   npm run check:fast
   ```

4. 没有命令输出，不得声称通过。

## REFACTOR

1. 小步整理命名、抽函数、去重复。
2. 保持测试绿。
3. 如果行为变化，回到 RED/GREEN；如果行为不变，在提交里说明。

## 文档

1. 更新对应功能文档：业务规则、时序、接口、失败降级、测试映射、变更记录。
2. 数据结构变化更新 `docs/data-model.md`。
3. 接口变化更新 `docs/interfaces/*`。
4. 模块清单变化运行：

   ```bash
   npm run docs:build
   ```

5. 确实不涉及文档时，提交写 `Docs-Impact: none: <理由≥4字>`。

## 自检

```bash
npm run quality:report
npm run check
```

检查：

- 无新增模块违规。
- 无新增技术债/重复率上升。
- 测试数量未减少。
- 文档已同步。
- 覆盖率 floor 未下降。

## 提交

使用六段中文模板（见 `docs/process/commit.md`）：

- `变更内容`
- `修改范围`
- `修改点`
- `验证情况`（RED/GREEN，真实命令与输出）
- `回归风险与验证`
- `文档影响`

Trailer：

- `Docs-Impact: updated | none: <理由>`
- `Test-Impact: updated | none: <理由> | removed: <理由>`
- 改基线时 `Baseline-Update: <理由>`

## 停止条件

遇到以下情况必须停下来问人，不能硬绕：

- 无法让测试因预期原因失败。
- 需要调高 baseline。
- 需要新增 `knownViolations` 或循环依赖。
- 需要改存档结构但不升版本。
- 文档无法同步且没有合理豁免。
- 需要 `--no-verify`、删除测试或跳过测试。

## 诚实规则

- 没有命令和输出，不得声称测试通过。
- RED 与 GREEN 必须是同一个测试。
- 不得用 `.only` / `.skip` 制造假绿。
- 不得改 baseline 或删除断言来“消灾”。
- 不得把“手动点了一下”写成自动化验证。
- 不确定时如实说明限制，而不是猜一个结果。

## 快速命令

```bash
npm test -- <file>
npm run check:fast
npm run check
npm run quality:file -- <path>
npm run quality:report
npm run docs:build
npm run check:doc-sync -- --base origin/main
npm run check:test-impact -- --base origin/main
```
