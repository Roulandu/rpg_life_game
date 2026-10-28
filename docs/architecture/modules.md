# 模块索引（生成文件）

> 本文件由 `scripts/quality/generate-module-docs.ts` 从 `docs/modules.yaml` 生成。
> 不要手改；运行 `npm run docs:build` 重新生成。

清单版本：`1`

## 模块清单

| 模块 | 路径 | 公共入口 | 允许依赖 | 测试影响 | 平台能力 | 测试 | 文档 |
|---|---|---|---|---|---|---|---|
| `app` | `src/app` | — | ui, store, platform, domain, lib | `exempt` | composition | — | `docs/architecture/overview.md` |
| `db` | `src/db` | — | domain, lib | `strict` | persistence | `tests/db/**/*.test.ts` | `docs/features/saves.md`<br>`docs/data-model.md` |
| `domain` | `src/domain` | — | lib | `strict` | core | `tests/**/*.test.ts` | `docs/data-model.md`<br>`docs/interfaces/engine-api.md` |
| `engine` | `src/engine` | — | domain, lib | `strict` | core | `tests/engine/**/*.test.ts` | `docs/features/weekly-turn.md`<br>`docs/features/matchday.md` |
| `lib` | `src/lib` | — | — | `strict` | core | `tests/**/*.test.ts` | `docs/architecture/overview.md` |
| `llm` | `src/llm` | — | domain, lib, platform | `strict` | http, secure-storage | `tests/llm/**/*.test.ts` | `docs/features/gm-agent.md` |
| `platform` | `src/platform` | — | lib | `exempt` | secure-storage, http, file-export, lifecycle, persistence, device-info | — | `docs/architecture/platform-strategy.md`<br>`docs/features/saves.md` |
| `store` | `src/store` | — | engine, world, llm, db, platform, domain, lib | `strict` | session | `tests/store/**/*.test.ts` | `docs/features/weekly-turn.md`<br>`docs/features/saves.md`<br>`docs/features/gm-agent.md` |
| `ui` | `src/ui` | — | store, domain, lib, platform | `via-module` | ui | `tests/ui/**/*.test.tsx` | `docs/features/weekly-turn.md`<br>`docs/features/matchday.md`<br>`docs/features/gm-agent.md`<br>`docs/features/saves.md` |
| `world` | `src/world` | — | domain, lib | `strict` | core | `tests/engine/world.test.ts`<br>`tests/db/save.test.ts` | `docs/features/world-generation.md` |

## 允许依赖矩阵

✓ 允许，· 不允许，— 自身。

| from \ to | `app` | `db` | `domain` | `engine` | `lib` | `llm` | `platform` | `store` | `ui` | `world` |
|---|---|---|---|---|---|---|---|---|---|---|
| `app` | — | · | ✓ | · | ✓ | · | ✓ | ✓ | ✓ | · |
| `db` | · | — | ✓ | · | ✓ | · | · | · | · | · |
| `domain` | · | · | — | · | ✓ | · | · | · | · | · |
| `engine` | · | · | ✓ | — | ✓ | · | · | · | · | · |
| `lib` | · | · | · | · | — | · | · | · | · | · |
| `llm` | · | · | ✓ | · | ✓ | — | ✓ | · | · | · |
| `platform` | · | · | · | · | ✓ | · | — | · | · | · |
| `store` | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | · | ✓ |
| `ui` | · | · | ✓ | · | ✓ | · | ✓ | ✓ | — | · |
| `world` | · | · | ✓ | · | ✓ | · | · | · | · | — |

## 已知违规

| 模块 | 文件 | 指向 | 原因 |
|---|---|---|---|
| `platform` | `src/platform/keyStore.ts` | `db` | 密钥存储直接依赖 db，待改为端口注入 |
| `ui` | `src/ui/screens/CreateCareerScreen.tsx` | `world` | 直接读取国家数据包，待通过 store/service |
| `ui` | `src/ui/screens/DashboardScreen.tsx` | `engine` | 页面直接调用 hasPendingKeyMoments，待移入 selector（积分榜深引已随 leagueTable 下沉 domain 消除） |
| `ui` | `src/ui/screens/InboxScreen.tsx` | `llm` | 聊天调用直接 import llm，待通过 store |
| `ui` | `src/ui/screens/ScheduleScreen.tsx` | `world` | 赛程派生数据直接读 world |
| `ui` | `src/ui/screens/SettingsScreen.tsx` | `llm` | LLM 连接测试直接 import llm，待通过 store |

## 已知循环

无。

## 已知平台违规

| 文件 | 模式 | 原因 |
|---|---|---|
| `src/lib/json.ts` | `dom-file-export` | 浏览器文件下载待迁移到 FileExport 端口 |
| `src/llm/transport.ts` | `capacitor-import` | 待迁移到 platform/ports 的 HttpTransport |

## 组合根文件

| 文件 | 归属模块 |
|---|---|
| `src/main.tsx` | `app` |
| `src/router.tsx` | `app` |
