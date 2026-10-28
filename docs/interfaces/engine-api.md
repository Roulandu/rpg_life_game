# Engine 与世界接口

本文记录 `src/engine`、`src/world`、`src/domain` 中跨模块使用的公共函数。签名以代码为准；行为变化必须同步本文与对应功能文档。

## 调用约定

- **纯计算优先**：`advanceWeek`、`generateWorld`、`computeLeagueTable` 等接收输入、返回结果，不读写全局状态。
- **显式变更**：`applyTraining`、`resolveEvent`、`resolveKeyMoment` 等会直接修改传入的 `WorldState`，调用方负责先 `structuredClone`。
- **确定性**：所有随机性通过 `createRng(seed, domain, ...parts)` 获得；同一输入必须得到同一输出。
- **无平台依赖**：这些函数不得 import UI、db、platform、llm、Capacitor 或 DOM API。
- **失败语义**：参数缺失/状态不一致时返回 `null` 或抛错；不会静默写半成品。

## 回合

| 函数 | 签名 | 行为 |
|---|---|---|
| `advanceWeek` | `(input: WorldState, plan: WeeklyPlan) => TurnResult` | 克隆输入，依次执行恢复、训练、额外行动、事件过期、比赛、财务、事件生成、身价更新、周次推进；跨赛季时调用 `endSeason` |
| `advanceWeeks` | `(world: WorldState, plan: WeeklyPlan, count: number) => TurnResult[]` | 连续推进，遇到退役或赛季切换提前停止 |
| `endSeason` | `(world: WorldState) => SeasonTransition` | 结算排名、奖项、奖金、声望、升降级、年龄、退役、合同、新赛季赛程；**原地修改** world |

`TurnResult`：

```ts
interface TurnResult {
  world: WorldState
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
  weekPlayed: number
  seasonPlayed: number
}
```

回合顺序（`src/engine/turn.ts`）：

1. `recomputeAllStrengths`
2. `recoverInjuries`
3. `applyTraining`
4. `applyExtraAction`
5. `expireEvents`
6. `simulateWeekFixtures`
7. `settleWeekFinance`
8. `generateWeeklyEvent`
9. 每 3 周 `updatePlayerValue`
10. `week += 1`；超过 `totalWeeks` 时 `endSeason`

`weekPlayed` / `seasonPlayed` 是“刚踢完的那一周”，不是推进后的周次。LLM 叙事必须使用这两个字段，否则会把新一周误写成已结束的一周。

## 世界生成

| 函数 | 签名 | 行为 |
|---|---|---|
| `generateWorld` | `(options: CareerCreateOptions, now: string) => WorldState` | 生成联赛、俱乐部、阵容、用户球员、赛程、关系、财务、新闻与默认设置 |
| `generateFixtures` | `(leagues, seed, season) => Record<Id, Fixture>` | 每个联赛生成双循环赛程，主客尽量均衡 |
| `computeClubStrength` | `(club, players, options?) => ClubStrength` | 按 GK/DEF/MID/FWD 选最强 11 人计算攻防 |
| `getUserPlayer` | `(world) => Player` | 取用户球员，缺失时抛错 |
| `getPlayerWorldClub` | `(world) => Club` | 取用户俱乐部 |
| `getLeague` | `(world, leagueId) => League \| undefined` | 联赛查询 |
| `getClubFixtures` | `(world, clubId, season?) => Fixture[]` | 俱乐部赛季赛程 |
| `getWeekFixtures` | `(world, week?, season?) => Fixture[]` | 指定周赛程 |
| `ageGroupWeight` | `(position) => number` | 位置年龄分布权重 |

常量：

- `ENGINE_VERSION = '0.1.0'`
- `START_SEASON = 2026`
- `TOTAL_WEEKS = 38`

修改任何影响引擎输出的规则时，必须评估是否需要升 `ENGINE_VERSION` 并更新 golden replay 哈希。

## 比赛模拟

| 函数 | 签名 | 行为 |
|---|---|---|
| `determineUserSelection` | `(world, club, rng) => SelectionResult` | 根据能力差、教练信任、体能、状态、锐度决定首发/替补/不出场 |
| `simulateUserFixture` | `(world, fixture) => MatchReport` | 模拟用户参与的比赛，写入球员统计、关系、声望、伤病、关键回合 |
| `simulateBackgroundFixture` | `(world, fixture) => void` | 模拟其他比赛，写入比分与射手统计 |
| `simulateWeekFixtures` | `(world) => MatchReport \| null` | 模拟本周全部比赛，返回用户比赛报告 |
| `getUserMatchFixture` | `(world, week?) => Fixture \| undefined` | 取用户本周赛程 |
| `opponentOf` | `(world, fixture) => Club \| undefined` | 取对手俱乐部 |

`simulateUserFixture` 的比赛结果由 `rng.poisson(expectedGoals)` 决定；关键回合在比赛结果之后生成，只影响评分、士气、关系与可能的进球/助攻，不会重新抽取比分。

## 关键回合

| 函数 | 签名 | 行为 |
|---|---|---|
| `generateKeyMoments` | `(player, rng, minutes, isHome, startMinute?) => KeyMoment[]` | 根据出场时间生成 2–4 个关键回合，`roll` 在生成时固定 |
| `pendingKeyMoments` | `(world) => KeyMoment[]` | 尚未处理的回合 |
| `hasPendingKeyMoments` | `(world) => boolean` | 是否存在待处理回合 |
| `resolveKeyMoment` | `(world, momentId, optionId) => MatchReport \| null` | 按固定 `roll` 与选项结算；只能处理下一个待处理回合 |
| `autoResolveKeyMoments` | `(world) => MatchReport \| null` | 对每个待处理回合选择成功率最高的稳妥选项 |
| `finalizeMatchday` | `(world) => MatchReport \| null` | 所有回合完成后生成媒体反应并刷新新闻/时间线 |

不可变条件：

- `roll` 生成后不得重抽。
- 必须按数组顺序处理，不能跳回合。
- 结算可能改比分，但只追加进球/助攻，不重算整场。
- `finalizeMatchday` 在仍有未处理回合时返回 `null`，不得提前生成媒体反应。

## 事件

| 函数 | 签名 | 行为 |
|---|---|---|
| `expireEvents` | `(world) => void` | 将超过 `expiresWeek` 的开放事件标记为 `expired` |
| `generateWeeklyEvent` | `(world, match, plan) => GameEvent \| null` | 按概率与上下文生成模板事件 |
| `resolveEvent` | `(world, eventId, choiceId) => GameEvent \| null` | 应用选项效果、写结果文本、标记 `resolved`；无效/重复返回 `null` |
| `applyEffects` | `(world, effects, label?) => void` | 统一应用 `Effect[]`，写财务/关系/新闻等副作用 |

事件是“引擎事实 + 玩家选择”的组合；LLM 只能改写标题/正文，不能新增选项、改变效果或 `templateId`。

## 训练、财务、关系、退役

| 函数 | 签名 | 行为 |
|---|---|---|
| `recoverInjuries` | `(world) => void` | 伤病周数递减，恢复后清空 |
| `applyTraining` | `(world, focus) => void` | 按年龄、设施、教练、体能计算成长与受伤概率 |
| `applyExtraAction` | `(world, action) => void` | 应用媒体/经纪人/社交/休息/家庭效果 |
| `settleWeekFinance` | `(world) => WeeklyFinanceResult` | 结算周薪、支出、赞助，写流水 |
| `updatePlayerValue` | `(world) => void` | 按表现与年龄更新身价 |
| `paySeasonBonuses` | `(world, summary) => void` | 赛季奖金与升级/夺冠奖励 |
| `reputationAfterSeason` | `(world, averageRating) => void` | 赛季声望变化 |
| `getRelationshipByRole` | `(world, role) => Relationship \| undefined` | 按角色取关系 |
| `adjustRelationship` | `(relationship, delta) => void` | 调整信任与紧张，自动 clamp |
| `coachTrust` | `(world) => number` | 教练信任值，缺失时返回默认值 |
| `retirementReason` | `(world) => string \| null` | 年龄/伤病/状态满足条件时返回中文原因 |

## 积分榜

| 函数 | 签名 | 行为 |
|---|---|---|
| `computeLeagueTable` | `(world, leagueId, season?) => LeagueTableRow[]` | 只统计已结束比赛；积分、净胜球、进球数排序 |
| `leaguePosition` | `(world, clubId, season?) => number` | 返回 1 起始排名，找不到返回 0 |
| `goalDifference` | `(row) => number` | 净胜球 |

排序规则：积分 → 净胜球 → 进球数 → `clubId` 字典序。修改排序会改变赛季结算与 golden replay。

## 随机数与哈希

> 位置：`src/lib/rng.ts`（原 `src/engine/rng.ts`）。随机数与哈希是平台无关的纯函数，下沉到 `lib` 供 `engine`/`world`/`db` 共用，不再造成 `world→engine`、`db→engine` 依赖与 `engine↔world` 循环。

| 函数 | 签名 | 用途 |
|---|---|---|
| `createRng` | `(seed, ...parts: (string \| number)[]) => Rng` | 按 seed + 域 + 参数创建独立随机流 |
| `Rng.next/float/int/chance/pick/shuffle/weighted/normal/poisson` | 见 `src/lib/rng.ts` | 所有随机行为的唯一入口 |
| `hashString` | `(input: string) => string` | 存档 checksum、golden 哈希 |
| `stableStringify` | `(value) => string` | 稳定序列化 |
| `hashState` | `(value) => string` | 状态哈希 |
| `seededId` | `(seed, ...parts) => string` | 确定性 ID |

不同业务域必须使用不同的 `parts`，避免新增逻辑改变旧随机流。例如 `createRng(seed, 'match', fixture.id)` 与 `createRng(seed, 'events', world.season, world.week)` 相互独立。

## 领域工具

`src/domain/attributes.ts`：

| 函数/常量 | 用途 |
|---|---|
| `overall(player)` | 按位置权重计算综合能力 |
| `computeOverall(position, attributes)` | 纯属性计算 |
| `positionGroup(position)` | `GK / DEF / MID / FWD` |
| `clamp` / `round1` / `round2` | 数值约束 |
| `ATTR_KEYS` / `POSITION_WEIGHTS` / `TRAINING_ATTRS` | 属性与训练配置 |

## 持久化接口

虽然不属于 engine，store 通过这些函数读写世界：

| 函数 | 签名 | 说明 |
|---|---|---|
| `saveWorld` | `(world, id?) => Promise<SaveSummary>` | 写入 Dexie 并更新 `lastSaveId` |
| `loadWorld` | `(id) => Promise<WorldState \| null>` | 读取并过 `worldSchema` |
| `listSaves` | `() => Promise<SaveSummary[]>` | 按更新时间倒序 |
| `deleteSave` | `(id) => Promise<void>` | 删除并清理 `lastSaveId` |
| `exportWorld` | `(world) => string` | 生成带 checksum 的 JSON |
| `importWorld` | `(text) => WorldState` | 校验并返回世界，不落库 |
| `downloadWorld` | `(world) => void` | 触发浏览器下载 |

## 错误与兼容

- `generateWorld` 缺少可用俱乐部时抛错。
- `simulateUserFixture` 缺少球员/俱乐部时抛错。
- `resolveEvent` / `resolveKeyMoment` 对无效输入返回 `null`，由 store 转成中文提示。
- `loadWorld` / `importWorld` 使用 Zod 校验，错误信息包含字段路径。
- 接口签名变化必须同步本文、功能文档与调用方；破坏性变化需要 ADR。

## 变更记录

| 日期 | 变更 | 关联 |
|---|---|---|
| 2026-10-26 | 初版：回合、比赛、关键回合、事件、财务、积分榜、RNG 与持久化接口 | ADR 0001 |
