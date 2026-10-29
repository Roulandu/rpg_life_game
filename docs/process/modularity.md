# 模块化与即插即用

## 目标

让模块可以被独立理解、独立测试、独立替换，降低多人协作时的代码侵入性。当前采用**模块化单体**：同仓库、同构建，但用目录、公共入口和依赖门禁划清边界。

不在本轮做运行时插件注册表；先把编译期契约和依赖方向做扎实。

## 模块与职责

| 模块 | 目录 | 职责 |
|---|---|---|
| `app` | `src/app` + `src/main.tsx` + `src/router.tsx` | 组合根：路由、布局、模块装配 |
| `ui` | `src/ui` | React 页面/组件；只消费 store 与 view model |
| `store` | `src/store` | 会话编排、持久化协调、UI 状态 |
| `engine` | `src/engine` | 确定性游戏规则：回合、比赛、关键时刻、训练、财务、关系、退役 |
| `world` | `src/world` | 国家数据包、世界/赛程/阵容生成 |
| `llm` | `src/llm` | GM Agent：提示词、工具 schema、提供商适配、提案生成 |
| `db` | `src/db` | IndexedDB 存档、导入/导出 |
| `platform` | `src/platform` | 平台能力端口与适配器（Web/Capacitor/未来微信） |
| `domain` | `src/domain` | 共享类型、属性数学、存档 schema |
| `lib` | `src/lib` | 无业务依赖的工具函数 |

## 依赖方向

目标矩阵见 `docs/modules.yaml` 与 `docs/architecture/overview.md`。摘要：

```text
app        -> ui, store, platform, domain, lib
ui         -> store, domain, lib, platform
store      -> engine, world, llm, db, platform, domain, lib
engine     -> domain, lib
world      -> domain, lib
llm        -> domain, lib, platform (端口)
db         -> domain, lib
platform   -> lib
domain     -> lib
lib        -> (无)
```

禁止反向依赖：engine 不依赖 UI/store/db/llm；world 不依赖 engine（目标）；db 不依赖 engine；platform 不依赖 db；任何模块不依赖 app。

## 已知违规

当前存在、已登记、冻结的边：

- `ui -> engine`：`src/ui/screens/DashboardScreen.tsx`（关键回合查询，积分榜深引已下沉 domain 消除）
- `ui -> world`：`src/ui/screens/CreateCareerScreen.tsx`、`src/ui/screens/ScheduleScreen.tsx`
- `ui -> llm`：`src/ui/screens/InboxScreen.tsx`、`src/ui/screens/SettingsScreen.tsx`

已消除的边：`engine -> world`、`world -> engine`（`rng` 下沉 `src/lib`）、`llm -> engine`（`prompt` 积分榜下沉 domain、`actions` 提案化）、`db -> engine`（`rng` 下沉）、`platform -> db`（`keyStore` 改为注入 `SecretStore` 端口）、`ui -> engine` 的积分榜与 `gameHelpers` 深引。`engine↔world` 循环已断开，`knownCycles` 清零；`capacitor-import`、`dom-file-export` 两处内联平台违规随 HTTP/文件下载迁入 `src/platform` 而消除，`knownPlatformViolations` 清零。

规则：

- 新代码不得新增违规边或循环。
- 已有违规只能减少；修改违规文件时优先顺便消除该文件的那条边。
- 消除后从 `knownViolations` 删除，基线随之收紧。
- 新增违规需要架构决策和 ADR，不能只改 YAML。

## 公共入口

- 新模块必须有 `index.ts`，只 export 稳定 API。
- 新代码跨模块引用只能 import 公共入口，禁止 `src/engine/match` 这类深引。
- 现有模块暂不强制 barrel；`publicEntry: null` 表示尚未启用，边界脚本不检查深引。
- 未来为 engine/world/llm/store 增加 barrel 后，把 `publicEntry` 填上，门禁自动收紧。

## 新模块清单

1. 在 `docs/modules.yaml` 注册：`path`、`publicEntry`、`allowedDeps`、`tests`、`docs`、`testImpact`。
2. 创建目录与 `index.ts`；内部文件不对外暴露。
3. 写功能文档（`docs/features/<name>.md`），注册到模块 `docs`。
4. 写至少一个测试；`testImpact` 默认 `strict`。
5. 确认不依赖 app，不直接使用平台 API。
6. 跑 `npm run check:boundaries`、`npm run check:doc-sync`、`npm run check:test-impact`。

## Agent 契约

`src/llm` 是 GM Agent，规则：

- 输入：只读的 `WorldState` 快照/摘要 + 玩家输入。
- 输出：经过 Zod 校验的叙事文本或**提案**（如 `LlmAction`）。
- 不得直接修改 store/WorldState，不得 import engine effects。
- 提案由 store/engine 决定是否应用；应用前必须校验。
- `llm/actions.ts` 的 `resolveChatAction` 只返回 `ChatActionProposal`（`src/domain/chatAction.ts`），效果应用移到 `src/engine/chatAction.ts`，llm 不再 import engine effects；`llm/prompt.ts` 的积分榜已随 `computeLeagueTable` 下沉 domain。llm→engine 违规清零。

## 内容数据化

- 事件模板、关键时刻定义、新闻/文案优先放 `data/` 或独立 content 模块。
- 引擎只负责规则与结算，不负责长文案。
- 事件模板与结果文案已数据化到 `src/engine/data/eventTemplates.ts`，`engine/keyMoments.ts` 里的文案仍是历史债；新增内容不要再堆进编排文件。

## UI 规则

- UI 不直接 import engine/world/llm；通过 store selector / view model 获取数据。
- UI 不直接做规则推导（积分榜、属性计算等）；需要的派生数据放 selector。
- 现有 `ui -> engine/world/llm` 已冻结；新页面按目标方向写。

## 平台规则

- 只有 `src/platform` 可以直接 import `@capacitor/*`、`window.localStorage`、DOM 文件导出。
- 其他模块通过端口接口访问能力。
- 详见 `docs/process/platform.md`。

## 边界门禁怎么工作

`npm run check:boundaries`：

1. 用 `es-module-lexer` 解析 `src/**` 的静态 import/export。
2. 解析相对路径，归属到模块。
3. 检查边是否在 `allowedDeps` 或 `knownViolations`。
4. 检查是否新增循环（`knownCycles` 之外）。
5. 检查非 platform 模块是否直接 import Capacitor / DOM 存储 / 文件导出。
6. 新增边、新增循环、新增平台违规 → 失败。

## 怎么偿还一条违规

1. 在功能文档里写清迁移方案。
2. 先加测试锁住现有行为。
3. 把共享逻辑抽到允许的模块（通常是 `domain` 或 `lib`）。
4. 改调用方，删除违规 import。
5. 从 `docs/modules.yaml` 删除该 `knownViolations` 条目。
6. 跑 `npm run check`，提交时说明基线收紧。

## 非目标

- 不做运行时插件注册表/动态加载。
- 不为未来平台提前抽象不存在的需求。
- 不强制一次性拆分所有大文件；按触碰频率和风险渐进偿还。
