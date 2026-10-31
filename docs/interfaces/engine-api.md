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
| `startWeek` | `(input: WorldState, plan: WeeklyPlan) => TurnResult` | 克隆输入，执行恢复、训练、额外行动、事件过期；用户出场且有关键回合时创建 live 报告并停在开球 0'，周次不变；否则完整结算本周 |
| `completeWeek` | `(world: WorldState) => TurnResult` | 仅处理存在 `pendingWeekPlan` 的周；终场结算、背景比赛、财务、事件、身价与周次推进；未完成 live 时拒绝 |
| `advanceWeek` | `(input: WorldState, plan: WeeklyPlan) => TurnResult` | 兼容入口：`startWeek` + 自动处理关键回合 + `finalizeMatchday` + `completeWeek`，保持“一次推进一周”的旧语义 |
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
  live: boolean
}
```

两阶段顺序（`src/engine/turn.ts`）：

1. `startWeek`：`recomputeAllStrengths → recoverInjuries → applyTraining → applyExtraAction → expireEvents →` 开始用户比赛。
2. live：停在关键回合，写 `pendingWeekPlan`，不增加周次。
3. `completeWeek`：`simulateWeekFixtures → settleWeekFinance → generateWeeklyEvent → updatePlayerValue（每 3 周）→ week += 1 → endSeason（必要时）→` 清空 `pendingWeekPlan`。

`weekPlayed` / `seasonPlayed` 是“刚踢完的那一周”，不是推进后的周次。LLM 叙事必须使用这两个字段，否则会把新一周误写成已结束的一周。

## 世界生成

| 函数 | 签名 | 行为 |
|---|---|---|
| `generateWorld` | `(options: CareerCreateOptions, now: string) => WorldState` | 生成联赛、俱乐部、阵容、用户球员、赛程、关系、财务、新闻与默认设置 |
| `generateFixtures` | `(leagues, seed, season) => Record<Id, Fixture>` | 每个联赛生成双循环赛程，主客尽量均衡。位置：`src/domain/fixtures.ts`（原 `world/generator.ts`），供 `world` 与 `engine/turn` 共用 |
| `computeClubStrength` | `(club, players, options?) => ClubStrength` | 按 GK/DEF/MID/FWD 选最强 11 人计算攻防。位置：`src/domain/strength.ts`（原 `world/generator.ts`），供 `world` 与 `engine/match`、`engine/turn` 共用 |
| `getUserPlayer` | `(world) => Player` | 取用户球员，缺失时抛错 |
| `getPlayerWorldClub` | `(world) => Club` | 取用户俱乐部 |
| `getLeague` | `(world, leagueId) => League \| undefined` | 联赛查询 |
| `getClubFixtures` | `(world, clubId, season?) => Fixture[]` | 俱乐部赛季赛程 |
| `getWeekFixtures` | `(world, week?, season?) => Fixture[]` | 指定周赛程 |
| `ageGroupWeight` | `(position) => number` | 位置年龄分布权重 |

常量：

- `ENGINE_VERSION = '0.3.0'`
- `START_SEASON = 2026`
- `TOTAL_WEEKS = 38`

修改任何影响引擎输出的规则时，必须评估是否需要升 `ENGINE_VERSION` 并更新 golden replay 哈希。

## 比赛模拟

| 函数 | 签名 | 行为 |
|---|---|---|
| `determineUserSelection` | `(world, club, rng) => SelectionResult` | 根据能力差、教练信任、体能、状态、锐度决定首发/替补/不出场 |
| `startUserMatch` | `(world, fixture) => MatchReport` | 创建 live 报告并停在 0'，初始化双方首发与全零统计；重复调用返回已有 live 报告 |
| `advanceLiveMinute` | `(world) => LiveMinuteResult \| null` | 每次只推进一步；返回分钟、球权、球位、事件与 `paused / finished / halfTime`；关键回合分钟先按归属计入控球再暂停 |
| `buildBeats` | `(input: BeatInput) => BeatResult` | 纯函数：生成该分钟双方攻防事件与统计增量，不修改报告 |
| `advanceLiveMatch` | `(world) => MatchReport \| null` | 循环调用 `advanceLiveMinute` 直到下一关键回合分钟或 90 分钟；半场比分在 45 分钟后冻结 |
| `finalizeLiveMatch` | `(world) => MatchReport \| null` | 终场唯一结算入口：评分、赛季统计、MOTM、媒体、新闻、黄牌/伤病；幂等 |
| `simulateUserFixture` | `(world, fixture) => MatchReport` | 兼容包装：`startUserMatch` → 自动处理回合 → `finalizeMatchday` |
| `simulateBackgroundFixture` | `(world, fixture) => void` | 模拟其他比赛，写入比分与射手统计 |
| `simulateWeekFixtures` | `(world) => MatchReport \| null` | 模拟本周全部比赛，返回用户比赛报告 |
| `getUserMatchFixture` | `(world, week?) => Fixture \| undefined` | 取用户本周赛程 |
| `opponentOf` | `(world, fixture) => Club \| undefined` | 取对手俱乐部 |

用户比赛从 `0-0` 开始逐分钟模拟：每分钟以 `p = clamp(xG / 90 × 势头, 0, 0.5)` 做伯努利判定，随机流为 `createRng(seed, 'live', fixtureId, minute)`。关键回合分钟跳过自动判定，由回合结果经统一 `appendGoal` 写入比分、fixture 与时间线。势头由最近 10 分钟内已结算回合推导，不落盘，因此读档可重放。

## 关键回合

| 函数 | 签名 | 行为 |
|---|---|---|
| `generateKeyMoments` | `(player, rng, minutes, isHome, startMinute?) => KeyMoment[]` | 根据出场时间生成 5–7 个关键回合（12 类、每回合 5 选项），`roll` 在生成时固定 |
| `pendingKeyMoments` | `(world) => KeyMoment[]` | 尚未处理的回合 |
| `hasPendingKeyMoments` | `(world) => boolean` | 是否存在待处理回合 |
| `resolveKeyMoment` | `(world, momentId, optionId, options?: { advance?: boolean }) => MatchReport \| null` | 按固定 `roll` 与选项结算；只能处理下一个待处理回合。live 报告立即改写比分，`advance` 默认 `true`，为 `false` 时停在当前分钟；赛季数据留到终场 |
| `autoResolveKeyMoments` | `(world) => MatchReport \| null` | 对每个待处理回合选择默认（成功率最高）选项 |
| `finalizeMatchday` | `(world) => MatchReport \| null` | live 报告：推进到 90 分钟后调用 `finalizeLiveMatch`；旧版 `final` 报告：刷新媒体反应与新闻 |

不可变条件：

- `roll` 生成后不得重抽。
- 必须按数组顺序处理，不能跳回合。
- 比分只通过 `appendGoal` 追加，不重算整场；live 回合的赛季进球/助攻/评分只在终场统计一次。
- `finalizeMatchday` / `finalizeLiveMatch` 在仍有未处理回合时返回 `null`，不得提前生成媒体反应。
- 终场结算幂等：`status === 'final'` 时直接返回，不重复统计或发布新闻。

## 领域比赛辅助

| 函数 | 签名 | 行为 |
|---|---|---|
| `selectLineup` | `(club, players, options?) => Player[]` | 选择 1-4-4-2 首发；同俱乐部输出稳定；可强制/排除指定球员 |
| `buildMatchLineups` | `(world, report) => MatchLineups` | 为主客各生成 11 人首发摘要（姓名、号码、位置、是否用户） |
| `buildPitchFrame` | `(input: PitchFrameInput) => PitchFrame` | 生成双方 11 人坐标、足球位置、控球方与最近 5 帧轨迹；同一 seed/场次/分钟确定性 |
| `successBasisText` | `(option) => string` | 成功率依据（属性名 + 百分比） |
| `effectsSummary` | `(option) => string` | 选项效果摘要（进球、助攻、评分、士气、教练信任） |

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

位于 `src/domain/leagueTable.ts`（domain 模块，只读纯计算）。

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
| `loadWorld` | `(id) => Promise<WorldState \| null>` | 读取、schema 校验并迁移旧版本；迁移后回写数据库 |
| `listSaves` | `() => Promise<SaveSummary[]>` | 按更新时间倒序 |
| `deleteSave` | `(id) => Promise<void>` | 删除并清理 `lastSaveId` |
| `exportWorld` | `(world) => string` | 生成带 checksum 的 JSON（v2 envelope） |
| `importWorld` | `(text) => WorldState` | 校验原始 checksum 后迁移到当前版本；不落库 |

`downloadWorld`（`(world) => void`，触发浏览器下载）已从 `db/repository` 迁到 `store/exportSave`，经 `platform/fileExport.downloadTextFile` 落地。

## 错误与兼容

- `generateWorld` 缺少可用俱乐部时抛错。
- `startUserMatch` / `simulateUserFixture` 缺少球员/俱乐部时抛错。
- `resolveEvent` / `resolveKeyMoment` 对无效输入返回 `null`，由 store 转成中文提示。
- `loadWorld` / `importWorld` 使用 Zod 校验，错误信息包含字段路径；旧版本存档先迁移，checksum 始终在迁移前校验。
- 接口签名变化必须同步本文、功能文档与调用方；破坏性变化需要 ADR。

## Golden 回放

- `quality/golden/season-seed-42.json` 记录 seed 42 赛季回放的 `engineVersion` 与最终状态哈希。
- 逐分钟实时比赛、双方攻防事件/统计、首发选择与关键回合扩展都会改变引擎输出，因此本次将 `ENGINE_VERSION` 升到 `0.3.0` 并更新哈希。
- 修改任何影响引擎输出的规则时，必须评估是否需要升 `ENGINE_VERSION` 并更新回放；哈希变化而版本未升会被 `check-anti-regression` 拦截。

## 变更记录

| 日期 | 变更 | 关联 |
|---|---|---|
| 2026-10-26 | 初版：回合、比赛、关键回合、事件、财务、积分榜、RNG 与持久化接口 | ADR 0001 |
| 2026-10-31 | 两阶段回合（startWeek/completeWeek）、逐分钟实时比赛、终场统一结算、存档 v2 迁移；engine 0.2.0 与 golden 更新 | 缺陷修复：比赛日比分穿越 |
| 2026-10-31 | `advanceLiveMinute`、`buildBeats`、`startUserMatch` 停在 0'、`resolveKeyMoment` 增加 `advance` 选项、`selectLineup`/`buildMatchLineups`/`buildPitchFrame`；关键回合 5–7 次；engine 0.3.0 与 golden 更新 | 比赛日实时化改造 |
