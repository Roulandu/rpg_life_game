# 绿茵人生 · 研发硬规则

本文件是所有开发者与 AI 模型在本仓库工作的硬约束。优先级：

`AGENTS.md` > `docs/process/*` > `.qoder/skills/feature-delivery` > 代码注释。

冲突时以更严格者为准。不要用“这次特殊”绕过门禁；需要例外时，在提交里写明理由并让人 review。

## 开工前

1. 读 `docs/modules.yaml`，确认要改的文件属于哪个模块、对应哪份功能文档、哪些测试。
2. 跑 `npm run quality:file -- <path>`，查看该文件的相关文档、测试、指标基线、最近提交和回归清单。
3. 读对应功能文档与 `docs/process/anti-regression.md`；涉及平台、存档、Agent 时再读对应细则。
4. 声明本次修改范围，不顺手重构无关代码。

## 必走流程（TDD）

1. **RED**：先写能复现需求的失败测试，运行并保留真实失败输出。
2. **GREEN**：写最小实现，让同一个测试通过。
3. **REFACTOR**：小步整理，保持测试绿；不改变行为不新增测试时，必须说明。
4. **DOCS**：同步更新功能文档、数据模型或接口文档；不涉及文档时给 `Docs-Impact: none: <理由>`。
5. **CHECK**：`npm run check:fast`，提交前再跑 `npm run check`。
6. **COMMIT**：使用六段中文模板，附 RED/GREEN 证据与 Trailer。

没有测试证据不算完成；没有运行命令和输出，不得声称测试通过。

## 常用命令

```bash
npm run dev                  # 本地开发
npm run check:fast           # typecheck + lint + 数据校验 + 技术债 + 模块边界
npm run check                # 全量门禁（CI 同款）
npm test                     # 全量测试
npm run test:coverage        # 覆盖率
npm run quality:file -- <path>  # 修改文件前的上下文
npm run quality:report       # 质量报告
npm run quality:update       # 只降低/删除基线条目
npm run docs:build           # 生成 docs/architecture/modules.md
npm run hooks:install        # 安装 commit-msg / pre-commit
gh run list --commit $(git rev-parse HEAD) --limit 1  # 定位本次 push 的 CI
gh run watch <run-id> --exit-status                   # 等待并返回 CI 结论
```

## 提交

- 类型：`feat | fix | test | refactor | docs | chore | perf`；标题和正文用中文。
- 必填六段：`变更内容 / 修改范围 / 修改点 / 验证情况 / 回归风险与验证 / 文档影响`。
- `feat` / `fix` 必须有 `RED:` 与 `GREEN:`；`refactor` / `perf` 至少 GREEN；`docs` / `chore` 可写不适用。
- Trailer：`Docs-Impact`、`Test-Impact`；改基线时必须带 `Baseline-Update`。
- 详细格式见 `docs/process/commit.md`。

### 推送与 CI 闭环

- push 到 GitHub 后必须等到该 commit 的 CI 结束；未出结果不得声称完成，也不得开始无关的新任务。
- 定位并等待：push 用 `gh run list --commit $(git rev-parse HEAD) --limit 1` + `gh run watch <run-id> --exit-status`；PR 用 `gh pr checks --watch`。
- CI 失败必须主动修复：`gh run view <run-id> --log-failed` 取日志，本地用同一命令复现，修复后新增提交并重新 push，再次等待，直到全绿。
- 已推送提交不得 `--amend`；不得靠重跑、删测试、跳过测试、抬高基线或 `--no-verify` 过关。
- 重跑只用于 runner、网络等基础设施故障，且必须等到最终结果；断网或无权限时如实说明“CI 未出结果”，不得默认通过。
- 紧急回滚的 `--no-verify` 例外不免除事后 CI 闭环：补合规提交并修到绿。

## 红线

- 不得删除、跳过测试，或用 `.only` / `.skip` 制造假绿。
- 不得未经声明使用 `--no-verify`；CI 会复查每个提交。
- 不得调高 `quality/*-baseline.json` 或新增 `knownViolations` 来“消灾”；必须显式说明并 review。
- `src/engine` / `src/world` 禁止 `Math.random`、`Date.now`、`new Date()`、`performance.now`；随机数只用 `createRng`。
- LLM 只写叙事与受约束提案，不得直接改游戏事实或 import engine effects。
- 除 `src/platform/**` 外，不得直接 import `@capacitor/*`、直接使用 `localStorage` 或 DOM 文件导出 API。
- 存档结构变化必须升 `CURRENT_SAVE_VERSION`、提供迁移、旧版本 fixture 和导出/导入往返测试。
- 禁止提交密钥、Token、真实个人信息；LLM 输出只用纯文本渲染。
- 新增依赖必须说明用途、替代方案、license、体积影响，并同步 lockfile。

## 模块与平台

- 模块：`app / ui / store / engine / world / llm / db / platform / domain / lib`。
- 依赖方向以 `docs/modules.yaml` 为准；新增跨模块引用只能走公共入口，禁止深引内部文件。
- `src/app` 是组合根；任何模块不得 import `app`。
- 新模块必须注册 `docs/modules.yaml`，提供 `index.ts`、测试、功能文档、允许依赖。
- 平台能力只走 `src/platform` 端口；核心域保持平台无关。
- 内容优先数据化；新增事件/关键时刻优先进 `data/`。

## 技术债

- 新代码阈值：文件 ≤300 行、函数 ≤60 行、圈复杂度 ≤12、参数 ≤5、嵌套 ≤4、重复率 ≤3%。
- 现有超标文件已冻结在基线；修改时只能持平或下降，不能变大。
- 触碰大文件时优先做小步抽取；不要为了赶进度继续堆逻辑。

## 文档

- 每个模块至少一份文档；每个核心功能有业务说明、时序图、规则边界、接口、失败降级、测试映射。
- 改代码必须同步改文档，或显式声明 `Docs-Impact: none: <理由≥4字>`。
- `docs/architecture/modules.md` 是生成文件，不要手改；运行 `npm run docs:build`。
- 详细规则见 `docs/process/docs-sync.md`。

## DoD

- 新/改行为有对应测试，RED/GREEN 证据真实。
- `npm run check` 全绿；无新增模块违规、无新增技术债、无测试数量下降。
- 文档已更新或豁免理由充分。
- 涉及 UI 时在手机宽度（360–390px）和桌面宽度手动验收。
- 涉及存档时完成旧档导入/导出往返验证。
- 提交信息完整、范围准确、回归风险写清楚。
- push 后对应 commit 的 CI 全绿；失败已定位原因、修复并重新验证。

## 文档地图

- 提交：`docs/process/commit.md`
- TDD：`docs/process/tdd.md`
- 模块化：`docs/process/modularity.md`
- 技术债：`docs/process/tech-debt.md`
- 文档同步：`docs/process/docs-sync.md`
- 防回归：`docs/process/anti-regression.md`
- 多端：`docs/process/platform.md`
- 模块清单：`docs/modules.yaml`
- 文档索引：`docs/README.md`
- 产品路线：`docs/roadmap.md`
