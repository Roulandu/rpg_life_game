# 模块索引（生成文件）

> 本文件由 `scripts/quality/generate-module-docs.ts` 从 `docs/modules.yaml` 生成。
> 不要手改；运行 `npm run docs:build` 重新生成。

清单版本：`1`

## 模块清单

| 模块 | 路径 | 公共入口 | 允许依赖 | 测试影响 | 平台能力 | 测试 | 文档 |
|---|---|---|---|---|---|---|---|
| `app` | `src/app` | `src/app/index.ts` | ui, store, platform, domain, lib | `exempt` | composition | `tests/app/**/*.test.tsx` | `docs/architecture/overview.md`<br>`docs/features/appearance.md` |
| `db` | `src/db` | `src/db/index.ts` | domain, lib | `strict` | persistence | `tests/db/**/*.test.ts` | `docs/features/saves.md`<br>`docs/data-model.md` |
| `domain` | `src/domain` | `src/domain/index.ts` | lib | `strict` | core | `tests/**/*.test.ts` | `docs/data-model.md`<br>`docs/interfaces/engine-api.md` |
| `engine` | `src/engine` | `src/engine/index.ts` | domain, lib | `strict` | core | `tests/engine/**/*.test.ts` | `docs/features/weekly-turn.md`<br>`docs/features/matchday.md` |
| `lib` | `src/lib` | `src/lib/index.ts` | — | `strict` | core | `tests/**/*.test.ts` | `docs/architecture/overview.md` |
| `llm` | `src/llm` | `src/llm/index.ts` | domain, lib, platform | `strict` | http, secure-storage | `tests/llm/**/*.test.ts` | `docs/features/gm-agent.md` |
| `platform` | `src/platform` | `src/platform/index.ts` | lib | `exempt` | secure-storage, http, file-export, lifecycle, persistence, device-info, appearance | `tests/platform/**/*.test.ts` | `docs/architecture/platform-strategy.md`<br>`docs/features/saves.md`<br>`docs/features/appearance.md` |
| `store` | `src/store` | `src/store/index.ts` | engine, world, llm, db, platform, domain, lib | `strict` | session | `tests/store/**/*.test.ts` | `docs/features/weekly-turn.md`<br>`docs/features/saves.md`<br>`docs/features/gm-agent.md`<br>`docs/features/appearance.md`<br>`docs/features/matchday.md` |
| `ui` | `src/ui` | `src/ui/index.ts` | store, domain, lib, platform | `via-module` | ui | `tests/ui/**/*.test.tsx` | `docs/features/weekly-turn.md`<br>`docs/features/matchday.md`<br>`docs/features/gm-agent.md`<br>`docs/features/saves.md`<br>`docs/features/appearance.md` |
| `world` | `src/world` | `src/world/index.ts` | domain, lib | `strict` | core | `tests/engine/world.test.ts`<br>`tests/db/save.test.ts`<br>`tests/world/**/*.test.ts` | `docs/features/world-generation.md` |

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

无。

## 已知循环

无。

## 已知平台违规

无。

## 组合根文件

| 文件 | 归属模块 |
|---|---|
| `src/main.tsx` | `app` |
| `src/router.tsx` | `app` |
