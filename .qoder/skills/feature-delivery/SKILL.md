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

3. 读 `docs/modules.yaml` 找到模块、职责、契约、允许依赖、相关测试、相关文档。
4. 读对应 `docs/00-项目文档/03-功能设计/01-功能规则与流程/*.md` 与 `docs/00-项目文档/06-测试与质量/01-测试与回归策略.md`。
5. 用一句话声明本次范围；不顺手改无关代码。

## 变更记录

在 `docs/00-项目文档/08-变更与治理/01-变更记录/` 新建 `CHG-YYYYMMDD-NNN-中文标题.md`：

- `feat/fix/refactor/perf` 必须建，`docs/chore/test` 可豁免。
- 写清背景与目标、验收条件、影响范围；实现过程中补验证证据。
- 状态：`draft` → `verified` → `accepted`；未推送时写“CI 待执行”，不得写“CI 通过”。
- 章节与字段要求见 `docs/00-项目文档/08-变更与治理/00-治理说明.md`。

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
   npm run verify -- --fast
   ```

4. 没有命令输出，不得声称通过。

## REFACTOR

1. 小步整理命名、抽函数、去重复。
2. 保持测试绿。
3. 如果行为变化，回到 RED/GREEN；如果行为不变，在提交里说明。

## 文档

1. 更新对应功能文档：业务规则、时序、接口、失败降级、测试映射、变更记录。
2. 数据结构变化更新 `docs/00-项目文档/04-接口与数据/03-数据模型与存储设计.md`。
3. 接口变化更新 `docs/00-项目文档/04-接口与数据/01-引擎公共接口.md` 或 `02-Agent工具契约.md`。
4. 模块清单变化运行：

   ```bash
   npm run docs:build
   ```

5. 确实不涉及文档时，提交写 `Docs-Impact: none: <理由≥4字>`。

## 自检

```bash
npm run quality:report
npm run verify -- --full --base origin/main
```

检查：

- 无新增模块违规。
- 无新增技术债/重复率上升。
- 测试数量未减少。
- 文档与契约已同步。
- 覆盖率 floor 未下降。
- CHG 记录了真实命令、退出码与未执行项。
- 验证报告写入 `quality/reports/verify-<sha>[-dirty].json`。

## 提交

使用六段中文模板（见 `docs/00-项目文档/05-开发规范/02-中文提交与变更记录规范.md`）：

- `变更内容`
- `修改范围`
- `修改点`
- `验证情况`（RED/GREEN，真实命令与输出）
- `回归风险与验证`
- `文档影响`

Trailer：

- `Docs-Impact: updated | none: <理由>`
- `Test-Impact: updated | none: <理由> | removed: <理由>`
- `变更记录: CHG-YYYYMMDD-NNN`（四类提交必填）
- 改基线时 `Baseline-Update: <理由>`

## 推送与 CI 闭环

CI 在任意分支 push、`v*` 标签、PR、手动触发与每周定时运行；没有 PR 也要等分支推送的 CI。push 之后必须等结果，失败要修到绿才算交付完成：

```bash
npm run ci:wait                                          # 默认：轮询 Actions 到结论，未通过/超时退出码 1
npm run ci:wait -- --sha=<40位> --timeout=900 --json      # 指定提交、改超时或要机器可读输出
gh run list --commit $(git rev-parse HEAD) --limit 1   # 装了 gh：定位 run
gh run watch <run-id> --exit-status                      # 装了 gh：等待结果
gh run view <run-id> --log-failed                        # 装了 gh：失败日志
gh pr checks --watch                                     # 装了 gh：PR 全量检查
```

失败时：取日志 → 本地用同一命令复现 → 新增提交修复后重新 push → 再次等待，循环到全绿。没装 gh 时用 `npm run ci:wait -- --json` 拿到失败 run 的 `html_url`，在 Actions 页面读日志。

- 禁止 `--amend` 已推送提交。
- 禁止靠重跑、删测试、跳过测试、抬高基线或 `--no-verify` 过关。
- 重跑只用于 runner/网络等基础设施故障，且必须等到最终结果。
- 合入/tag 产生新 SHA 时必须重新验证新 SHA。
- artifact 会过期，交付说明记录 run URL 与关键结果。
- CI 结论写进 PR 描述或交付说明，不说“应该能过”。

## 停止条件

遇到以下情况必须停下来问人，不能硬绕：

- 无法让测试因预期原因失败。
- 缺少 CHG，或 CHG 状态/章节无法在本次交付内补齐。
- 需要调高 baseline。
- 需要新增 `knownViolations` 或循环依赖。
- 需要改存档结构但不升版本。
- 文档或契约无法同步且没有合理豁免。
- 需要 `--no-verify`、删除测试或跳过测试。
- CI 失败且需要越出本次范围、改基线或删/跳过测试才能通过。
- CI 未出结果，或 base 不可达/验证对象漂移。

## 诚实规则

- 没有命令和输出，不得声称测试通过。
- RED 与 GREEN 必须是同一个测试。
- 不得用 `.only` / `.skip` 制造假绿。
- 不得改 baseline 或删除断言来“消灾”。
- 不得把“手动点了一下”写成自动化验证。
- CI 未出结果或未通过时，不得声称完成或“应该能过”。
- 不确定时如实说明限制，而不是猜一个结果。

## 快速命令

```bash
npm test -- <file>
npm run verify -- --fast
npm run verify -- --full --base origin/main
npm run quality:file -- <path>
npm run quality:report
npm run quality:change-records
npm run quality:secrets
npm run docs:build
npm run quality:doc-sync -- --base origin/main
npm run quality:test-impact -- --base origin/main
```
