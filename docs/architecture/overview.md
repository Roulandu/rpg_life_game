# 架构总览

本文描述“当前代码实际怎么运行”，以及“目标架构允许怎么依赖”。两者不一致的地方列在“已知违规”中，并由 `docs/modules.yaml` 与 `check:boundaries` 共同约束。

## 系统上下文

```mermaid
flowchart LR
  P[玩家] --> WEB[Web / PWA]
  P --> AND[Android Capacitor]
  WEB --> UI[src/ui React]
  AND --> UI
  UI --> STORE[src/store Zustand]
  STORE --> ENGINE[src/engine 规则]
  STORE --> WORLD[src/world 世界生成]
  STORE --> LLM[src/llm Agent]
  STORE --> DB[src/db Dexie]
  STORE --> PLATFORM[src/platform 平台能力]
  ENGINE --> DOMAIN[src/domain 类型与属性]
  WORLD --> DOMAIN
  LLM --> DOMAIN
  DB --> DOMAIN
  LLM --> PROVIDER[外部 LLM Provider]
```

- 应用是纯前端单页应用，没有自建后端；唯一可选外部依赖是玩家自己配置的 LLM 接口。
- 游戏事实（比分、属性、合同、赛程、财务、关系）全部由本地确定性引擎计算。
- 运行时状态只存在两处：Zustand 内存状态，以及 IndexedDB 中的存档；导出文件是 JSON。

## 运行形态

| 形态 | 入口 | 说明 |
|---|---|---|
| Web | `index.html` → `src/main.tsx` | Vite 构建，生产环境注册 PWA Service Worker |
| Android | Capacitor `android/` 壳 | 复用同一套 Web 产物，原生 HTTP / 安全存储 / 文件能力通过平台分支接入 |
| iOS | 未实现 | 规划为 Capacitor 壳，复用核心域 |
| 微信小程序 | 未实现 | 先评估 web-view 外壳，核心逻辑保持纯 TS |

路由（`src/router.tsx`）：

| 路径 | 页面 | 主要职责 |
|---|---|---|
| `/` | TitleScreen | 继续生涯 / 新建 / 导入 |
| `/create` | CreateCareerScreen | 选择国籍、位置、俱乐部、种子 |
| `/game` | DashboardScreen | 周计划、推进、当前事件 |
| `/match` | MatchdayScreen | 比赛报告与关键回合 |
| `/schedule` | ScheduleScreen | 赛程与积分榜 |
| `/inbox` | InboxScreen | 新闻、事件、AI 对话 |
| `/profile` | ProfileScreen | 属性、合同、财务、生涯记录 |
| `/timeline` | TimelineScreen | 赛季与生涯时间线 |
| `/settings` | SettingsScreen | LLM Provider、Key、叙事密度、导入导出 |
| `/more` | MoreScreen | 次级入口 |

## 模块划分

模块与 `docs/modules.yaml` 保持一致；模块清单是唯一事实源，本表只做导读。

| 模块 | 目录 | 职责 | 允许依赖 |
|---|---|---|---|
| app | `src/app` | 组合根、错误边界、全局装配 | ui, store, platform, domain, lib |
| ui | `src/ui` | 页面、组件、纯展示派生 | store, domain, lib, platform |
| store | `src/store` | 会话状态、编排引擎/存档/Agent | engine, world, llm, db, platform, domain, lib |
| engine | `src/engine` | 确定性规则：回合、比赛、事件、财务、关系 | domain, lib |
| world | `src/world` | 世界与赛程生成、俱乐部强度、数据包读取 | domain, lib |
| llm | `src/llm` | Agent 提示词、工具契约、Provider 适配、降级 | domain, lib, platform |
| db | `src/db` | IndexedDB 存档、导入导出、校验和 | domain, lib |
| platform | `src/platform` | 平台能力：安全存储、原生 HTTP 等 | lib |
| domain | `src/domain` | 纯类型、属性公式、存档 schema | lib |
| lib | `src/lib` | 无业务语义工具；确定性随机数与哈希（`rng.ts`：createRng/hashString/hashState）、格式化、稳定序列化 | 无 |

`src/main.tsx` 与 `src/router.tsx` 属于组合根，登记在 `docs/modules.yaml` 的 `rootFiles`，归属 `app`。

## 目标依赖方向

✓ 允许，✗ 禁止。

| from \ to | app | ui | store | engine | world | llm | db | platform | domain | lib |
|---|---|---|---|---|---|---|---|---|---|---|
| app | - | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| ui | ✗ | - | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| store | ✗ | ✗ | - | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| engine | ✗ | ✗ | ✗ | - | ✗ | ✗ | ✗ | ✗ | ✓ | ✓ |
| world | ✗ | ✗ | ✗ | ✗ | - | ✗ | ✗ | ✗ | ✓ | ✓ |
| llm | ✗ | ✗ | ✗ | ✗ | ✗ | - | ✗ | ✓ | ✓ | ✓ |
| db | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | - | ✗ | ✓ | ✓ |
| platform | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | - | ✗ | ✓ |
| domain | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | - | ✓ |
| lib | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | - |

核心原则：

- `domain` 与 `lib` 不依赖任何业务模块，保证可以跨平台、跨外壳复用。
- `engine` 与 `world` 不依赖 UI、存储、网络；随机数只能通过 `createRng` 获得。`createRng`/`hashString` 等确定性工具定义在 `src/lib/rng.ts`（原 `src/engine/rng.ts`），下沉到 `lib` 后 `world`、`db` 可直接复用，消除了 `world→engine`、`db→engine` 依赖与 `engine↔world` 循环。
- `store` 是唯一允许同时编排 engine、world、llm、db、platform 的模块。
- `ui` 只消费 store 状态与 selector，不直接调用引擎或 LLM。
- `app` 是组合根，任何模块都不得反向依赖 `app`。

## 当前真实依赖与已知违规

目标矩阵尚未完全达成。以下边被显式登记为已知违规，新增同类边会失败，已有违规只能减少。

```mermaid
flowchart TD
  APP[app] --> UI[ui]
  APP --> STORE[store]
  UI --> STORE
  STORE --> ENGINE[engine]
  STORE --> WORLD[world]
  STORE --> LLM[llm]
  STORE --> DB[db]
  STORE --> PLATFORM[platform]
  ENGINE --> DOMAIN[domain]
  WORLD --> DOMAIN
  LLM --> DOMAIN
  DB --> DOMAIN
  DOMAIN --> LIB[lib]
  ENGINE --> LIB
  WORLD --> LIB
  DB --> LIB
  UI -.违规.-> ENGINE
  UI -.违规.-> WORLD
  UI -.违规.-> LLM
  ENGINE -.违规.-> WORLD
  LLM -.违规.-> ENGINE
  PLATFORM -.违规.-> DB
```

| 违规 | 位置 | 现状原因 |
|---|---|---|
| ui → engine | `gameHelpers.ts`、`DashboardScreen`、`ScheduleScreen` | 页面直接算积分榜/赛程派生数据，应移入 store selector |
| ui → world | `CreateCareerScreen`、`ScheduleScreen` | 直接读国家数据包与赛程 |
| ui → llm | `InboxScreen`、`SettingsScreen` | 聊天与连接测试直接调用 llm，应经 store |
| llm → engine | `actions.ts`、`prompt.ts` | 直接应用效果、直接读积分榜，目标改为提案 + 只读快照 |
| engine → world | `turn.ts`、`match.ts` | 复用 `computeClubStrength`，待抽到 domain 公共查询 |
| platform → db | `keyStore.ts` | 密钥存储直接依赖 Dexie，目标改为端口注入 |

`rng`（`createRng`/`hashString`）已下沉到 `src/lib/rng.ts`，`world→engine`、`db→engine` 违规与 `engine↔world` 循环已消除。剩余的 `engine → world` 是单向违规，待把 `computeClubStrength`/`generateFixtures` 下沉到 `domain` 后清除。

## 关键流程

### 创建生涯

```mermaid
flowchart LR
  UI[CreateCareerScreen] --> S[store.createCareer]
  S --> G[world.generateWorld]
  G --> D[domain 属性/类型]
  G --> S
  S --> R[db.saveWorld]
  R --> IDB[(IndexedDB saves)]
  S --> UI
```

1. UI 校验表单并生成确定性 seed。
2. `generateWorld` 生成两级联赛、俱乐部、23 人阵容、用户球员、38 周双循环赛程、关系、财务与初始新闻。
3. store 立即写入 IndexedDB，并刷新存档列表。

### 推进一周

```mermaid
flowchart TD
  UI[周计划界面] --> S[store.advance]
  S --> E[engine.advanceWeek]
  E --> T[训练 / 恢复 / 额外行动]
  E --> M[模拟本周比赛]
  M --> K{用户出场且有 key moments?}
  K -- 是 --> P[持久化并进入比赛日]
  P --> R[逐条 resolveKeyMoment]
  R --> F[finalizeMatchday]
  F --> N[store.narrateTurn]
  K -- 否 --> N
  N --> L[llm.narrateWeek]
  L --> A[applyWeekNarrative]
  A --> DB[(IndexedDB)]
```

- 比赛结果在 `advanceWeek` 内一次算完；关键回合只允许在既定 `roll` 与选项上追加结果，不重新模拟比赛。
- 所有状态变更完成后先持久化，再触发可选的 LLM 叙事。
- LLM 失败只影响叙事，不回滚比赛结果。

### 存档、导出与导入

- 运行时：`store.saveNow` → `db.saveWorld` → Dexie `saves` 表。
- 导出：`db.buildEnvelope` 生成带 checksum 的 JSON，`lib.downloadTextFile` 触发浏览器下载。
- 导入：`db.importWorld` 先过 Zod envelope + world 校验，再校验 checksum，拒绝更高 `saveVersion`。
- 密钥：`platform/keyStore.ts` 在本机加密保存，不进入 `WorldState`。

### Agent

- `store.narrateTurn` / `store.sendChat` 负责编排。
- `llm/client.ts` 负责 Provider 适配、重试与错误分类。
- `llm/schema.ts` 用 Zod 校验工具输出，`sanitizeText` 去控制字符、标签与 URL。
- 当前 `llm/actions.ts` 会直接应用固定效果，属于已知违规；目标是由 store/engine 应用经过校验的提案。

## 数据所有权

| 数据 | 所有者 | 读者 | 写入约束 |
|---|---|---|---|
| 比分、属性、合同、赛程、财务、关系 | engine / world | ui、llm 只读 | 只能由 engine 的确定性函数修改 |
| `WorldState` 整体 | engine + store | ui、db、llm | store 负责持久化与编排，LLM 不得直接改事实 |
| `aiNarrative` / `aiChat` / `aiUsage` | llm 产出，store 写入 | ui | 文本经 sanitize，事件改写需 templateId 匹配 |
| 存档 envelope | db | 导入/导出 | 版本、checksum、Zod 校验 |
| LLM API Key | platform | llm / store | 不写入 `WorldState`，不进入导出文件 |

## 平台边界

当前平台差异以内联分支存在，已冻结：

- `src/platform/native.ts`：判断 Capacitor 运行环境。
- `src/platform/keyStore.ts`：Android SecureStorage / Web AES-GCM IndexedDB。
- `src/llm/transport.ts`：浏览器 fetch / CapacitorHttp。
- `src/main.tsx`：生产 Web 才注册 Service Worker。
- `src/db/repository.ts`：DOM 下载导出文件。

目标形态是 `src/platform/ports` + `web/capacitor/wechat` 适配器，选择逻辑只放在 `src/platform/index.ts`。详见 [多端策略](platform-strategy.md)。

## 非功能约束

- **确定性**：engine / world 内禁止 `Math.random`、`Date.now`、`new Date()`、`performance.now`；随机数只走 `createRng(seed, ...domain)`。
- **原子回合**：`advanceWeek` 接收旧状态并返回新状态，内部用 `structuredClone`，不修改入参。
- **存档可校验**：任何持久化状态必须通过 `worldSchema`；导出必须带版本与 checksum。
- **技术债棘轮**：新代码按阈值卡，现有超标文件只降不升。
- **文档同步**：改模块代码必须同步对应功能/架构文档，或有书面豁免。

## 架构演进

- 决策背景与取舍见 [ADR 0001](../decisions/0001-governance-and-modular-monolith.md)。
- 后续拆分顺序：`gameStore.ts` → `generator.ts` → `match.ts` / `keyMoments.ts`；随后补公共 `index.ts`，把已知深引降为 0。
- 平台端口化与 iOS / 微信评估不在本轮实现，规则见 [多端策略](platform-strategy.md)。

## 变更记录

| 日期 | 变更 | 关联 |
|---|---|---|
| 2026-10-26 | 初版：记录运行形态、模块矩阵、已知违规与关键流程 | ADR 0001 |
