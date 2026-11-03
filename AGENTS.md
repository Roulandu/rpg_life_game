# 绿茵人生 · 研发硬规则

本文件是所有开发者与 AI 模型在本仓库工作的硬约束。优先级：

`AGENTS.md` > `docs/00-项目文档/05-开发规范/*` > `.qoder/skills/feature-delivery` > 代码注释。

冲突时以更严格者为准。不要用“这次特殊”绕过门禁；需要例外时，在提交里写明理由并让人 review。

## 开工前

1. 读 `docs/modules.yaml`，确认要改的文件属于哪个模块、职责/契约、对应哪份功能文档、哪些测试。
2. 跑 `npm run quality:file -- <path>`，查看该文件的相关文档、测试、指标基线、最近提交和回归清单。
3. 读对应功能文档与 `docs/00-项目文档/06-测试与质量/01-测试与回归策略.md`；涉及平台、存档、Agent 时再读对应细则。
4. 在 `docs/00-项目文档/08-变更与治理/01-变更记录/` 建 CHG，写背景、验收条件与影响范围；`feat/fix/refactor/perf` 没有 CHG 不能提交。
5. 声明本次修改范围，不顺手重构无关代码。

## 必走流程（TDD）

1. **RED**：先写能复现需求的失败测试，运行并保留真实失败输出。
2. **GREEN**：写最小实现，让同一个测试通过。
3. **REFACTOR**：小步整理，保持测试绿；不改变行为不新增测试时，必须说明。
4. **DOCS**：同步更新功能文档、数据模型或契约文档；不涉及文档时给 `Docs-Impact: none: <理由>`。
5. **CHECK**：`npm run verify -- --fast`，提交前再跑 `npm run verify -- --full --base origin/main`。
6. **COMMIT**：使用六段中文模板，附 RED/GREEN 证据、`变更记录: CHG-...` 与 Trailer。

没有测试证据不算完成；没有运行命令和输出，不得声称测试通过。

## 常用命令

```bash
npm run dev                  # 本地开发
npm run verify -- --help     # 验证模式、步骤与退出码
npm run verify -- --fast     # 快速门禁
npm run verify -- --full     # 全量门禁（CI 同款）
npm test                     # 全量测试
npm run test:coverage        # 覆盖率
npm run quality:file -- <path>  # 修改文件前的上下文
npm run quality:report       # 质量报告
npm run quality:update       # 只降低/删除基线条目
npm run quality:change-records  # 校验 CHG/VER
npm run quality:secrets      # 全仓密钥扫描
npm run docs:build           # 生成 docs/00-项目文档/02-架构设计/03-模块清单-生成.md
npm run hooks:install        # 安装 commit-msg / pre-commit
npm run hooks:doctor         # 检查 hooks 是否生效
gh run list --commit $(git rev-parse HEAD) --limit 1  # 定位本次 push 的 CI
gh run watch <run-id> --exit-status                   # 等待并返回 CI 结论
```

## 提交

- 类型：`feat | fix | test | refactor | docs | chore | perf`；标题和正文用中文。
- 必填六段：`变更内容 / 修改范围 / 修改点 / 验证情况 / 回归风险与验证 / 文档影响`。
- `feat` / `fix` 必须有 `RED:` 与 `GREEN:`；`refactor` / `perf` 至少 GREEN；`docs` / `chore` 可写不适用。
- Trailer：`Docs-Impact`、`Test-Impact`、`变更记录: CHG-YYYYMMDD-NNN`；改基线时必须带 `Baseline-Update`。
- 四类提交（`feat/fix/refactor/perf`）的 CHG 必须真实存在；`docs/chore/test` 可豁免。
- 详细格式见 `docs/00-项目文档/05-开发规范/02-中文提交与变更记录规范.md`。

### 推送与 CI 闭环

- CI 在**任意分支 push**、`v*` 标签、PR、手动触发与每周定时运行；没有 PR 也能验证，但 push 后必须等到该 commit 的 CI 结束。
- 未出结果不得声称完成，也不得开始无关的新任务；本地通过不等于远端通过。
- 定位并等待：push 用 `gh run list --commit $(git rev-parse HEAD) --limit 1` + `gh run watch <run-id> --exit-status`；PR 用 `gh pr checks --watch`。
- CI 失败必须主动修复：`gh run view <run-id> --log-failed` 取日志，本地用同一命令复现，修复后新增提交并重新 push，再次等待，直到全绿。
- 已推送提交不得 `--amend`；不得靠重跑、删测试、跳过测试、抬高基线或 `--no-verify` 过关。
- 重跑只用于 runner、网络等基础设施故障，且必须等到最终结果；断网或无权限时如实说明“CI 未出结果”，不得默认通过。
- 合入或打 tag 产生新 SHA 时必须重新验证新 SHA，不能沿用旧结果。
- 紧急回滚的 `--no-verify` 例外不免除事后 CI 闭环：补合规提交并修到绿。

### CI 强制范围（当前事实）

- 仓库文件不能配置 GitHub 分支保护、ruleset 或必需状态检查；main 的 CI 目前只是可见检查，是否强制取决于仓库管理员。
- 当前受控交付入口是 `v*` 标签上的 `verify --full`；仓库没有自动部署、自动打 tag 或自动发布。
- artifact 会过期；发布验收必须记录 run URL 与关键结果。

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
- 新模块必须注册 `docs/modules.yaml`，提供非空 `description`、`index.ts`、测试、功能文档、允许依赖；有公开接口时登记 `contracts`。
- `contracts` 指向的契约文档必须真实存在；改公开接口必须同步契约文档。
- 平台能力只走 `src/platform` 端口；核心域保持平台无关。
- 内容优先数据化；新增事件/关键时刻优先进 `data/`。

## 技术债

- 新代码阈值：文件 ≤300 行、函数 ≤60 行、圈复杂度 ≤12、参数 ≤5、嵌套 ≤4、重复率 ≤3%。
- 现有超标文件已冻结在基线；修改时只能持平或下降，不能变大。
- 触碰大文件时优先做小步抽取；不要为了赶进度继续堆逻辑。
- 需要人决策的债务登记在 `docs/00-项目文档/08-变更与治理/03-技术债记录.md`，机器事实源仍是基线与 `quality:report`。

## 迁移、兼容与恢复

- 存档结构变化必须升版本、提供幂等迁移、旧版本 fixture、导出/导入往返测试；迁移失败拒绝导入，不写半成品。
- 版本只升不降；不写降级迁移。回滚优先恢复备份或回退应用版本，再做前向修复。
- 发布、回滚与故障处理见 `docs/00-项目文档/07-发布与运维/02-数据迁移与回滚方案.md` 与 `03-故障排查与恢复手册.md`。

## 文档

- 每个模块至少一份文档；每个核心功能有业务说明、时序图、规则边界、接口、失败降级、测试映射。
- 改代码必须同步改文档或契约，或显式声明 `Docs-Impact: none: <理由≥4字>`。
- `docs/00-项目文档/02-架构设计/03-模块清单-生成.md` 是生成文件，不要手改；运行 `npm run docs:build`。
- 详细规则见 `docs/00-项目文档/05-开发规范/06-文档与代码同步规范.md`。

## DoD

- 新/改行为有对应测试，RED/GREEN 证据真实。
- CHG 已建立并记录真实验证证据；四类提交关联有效 CHG。
- `npm run verify -- --full --base origin/main` 全绿；无新增模块违规、无新增技术债、无测试数量下降。
- 文档/契约已更新或豁免理由充分。
- 涉及 UI 时在手机宽度（360–390px）和桌面宽度手动验收。
- 涉及存档时完成旧档导入/导出往返验证，并写明兼容与回滚。
- 提交信息完整、范围准确、回归风险写清楚。
- push 后对应 commit 的 CI 全绿；失败已定位原因、修复并重新验证。未推送时只能写“CI 待执行”。

## 文档地图

- 治理与 CHG/VER：`docs/00-项目文档/08-变更与治理/00-治理说明.md`
- 提交：`docs/00-项目文档/05-开发规范/02-中文提交与变更记录规范.md`
- TDD：`docs/00-项目文档/05-开发规范/03-测试驱动开发与证据规范.md`
- 模块化：`docs/00-项目文档/02-架构设计/02-模块边界与依赖规则.md`
- 技术债：`docs/00-项目文档/05-开发规范/05-代码质量与技术债规范.md`
- 文档同步：`docs/00-项目文档/05-开发规范/06-文档与代码同步规范.md`
- 防回归：`docs/00-项目文档/06-测试与质量/01-测试与回归策略.md`
- 质量门禁：`docs/00-项目文档/06-测试与质量/02-质量门禁与例外规则.md`
- CI：`docs/00-项目文档/06-测试与质量/03-持续集成与交付门禁.md`
- 发布：`docs/00-项目文档/07-发布与运维/01-构建与发布流程.md`
- 多端：`docs/00-项目文档/05-开发规范/04-跨平台开发规范.md`
- 模块清单：`docs/modules.yaml`
- 文档索引：`docs/00-项目文档/00-文档导航.md`
- 产品路线：`docs/00-项目文档/01-项目与需求/02-产品路线与需求.md`
