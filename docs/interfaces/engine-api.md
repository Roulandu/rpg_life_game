# Engine 与世界接口

本文记录 `src/engine`、`src/world`、`src/domain` 中跨模块使用的公共函数。签名以代码为准；行为变化必须同步本文与对应功能文档。

## 调用约定

- **纯计算优先**：`advanceWeek`、`startDay`、`generateWorld`、`computeLeagueTable` 等接收输入、返回结果，不读写全局状态。
- **显式变更**：`applyDailyTraining`、`resolveEvent`、`resolveKeyMoment`、`playDay` 等会直接修改传入的 `WorldState`，调用方负责先 `structuredClone`。
- **确定性**：所有随机性通过 `createRng(seed, domain, ...parts)` 获得；同一输入必须得到同一输出。
- **无平台依赖**：这些函数不得 import UI、db、platform、llm、Capacitor 或 DOM API。
- **失败语义**：参数缺失/状态不一致时返回 `null` 或抛错；不会静默写半成品。

## 日回合

位于 `src/engine/day.ts`（快进与单日结算的唯一入口）与 `src/engine/dayContext.ts`（日维度 RNG/id）。

| 函数 | 签名 | 行为 |
|---|---|---|
| `startDay` | `(input: WorldState) => DayResult` | 克隆输入并就地走一天；需要玩家参与时停在开球并写 `pendingDayPlan`，时钟不动 |
| `advanceDay` | `(input: WorldState) => DayResult` | 同一天步进，但把停住的比赛按默认选项踢完；晨间步骤不会重跑（时钟仍钉在这天） |
| `advanceUntilDecision` | `(input: WorldState, limit: number) => FastForwardResult` | 一份克隆上连续走日，跳过平静日，停在第一件 `matchday / event / milestone`；`limit` 为空转兜底 |
| `playDay` | `(world: WorldState, options: { autoResolve: boolean }) => DayResult` | 内部原语：一天只结算一次，**就地修改**，只给快进与周适配器用 |
| `isPendingDay` | `(world) => boolean` | 时钟是否仍钉在未完成的一天（`pendingDayPlan` / live 报告 / 待处理回合） |
| `dayRng` | `(world, tag) => Rng` | `createRng(seed, tag, season, week, day)`：同标签逐日走不同随机流 |
| `dailyId` | `(world, prefix, suffix?) => string` | `<prefix>:<season>:<week>:<day>[:<suffix>]`：同周七天不撞键 |

`DayResult` / `FastForwardResult`：

```ts
interface DayResult {
  world: WorldState
  dayPlayed: number
  live: boolean
  quiet: boolean
  stopReason: 'matchday' | 'event' | 'milestone' | null
  match: MatchReport | null
  event: GameEvent | null
  seasonTransition: SeasonTransition | null
}

interface FastForwardResult {
  days: DayResult[]
  stopReason: 'matchday' | 'event' | 'milestone' | null
  quietDays: number
}
```

`days[*].world` 指向同一份对象，只有末项是最新状态；调用方只应使用 `fast.days.at(-1)`。

一天的顺序（`playDay`，不可交换）：`day === 1` 刷新用户俱乐部强度 → `advanceInjuries` → 训练日 `applyDailyTraining` → 活动日 `applyDailyAction` → `expireEvents` → 今天有场次则 `startUserMatch`/`finalizeMatchday` → `simulateDayFixtures` → `day === 7` 时 `settleWeekFinance` → `generateDailyEvents(world, 今天这场)` → `absoluteDay % 21 === 0` 时 `updatePlayerValue` → 时钟 +1 天（跨周/跨赛季时进位）→ 清空 `pendingDayPlan`。

## 周回合（日步进的适配器）

`src/engine/turn.ts` 保留同名同签名，内部把一周走成 7 次 `playDay`，让旧测试、golden 与非交互调用保持「一次推进一整周」的语义。

| 函数 | 签名 | 行为 |
|---|---|---|
| `startWeek` | `(input: WorldState, plan: WeeklyPlan) => TurnResult` | 写 `world.weekPlan = plan` 后逐日推进；停在开球时 `live = true` 且周次不变 |
| `completeWeek` | `(world: WorldState) => TurnResult` | 仅处理存在 `pendingDayPlan` 的那一天；仍有待处理回合时拒绝；否则自动踢完并走完剩余日子 |
| `advanceWeek` | `(input: WorldState, plan: WeeklyPlan) => TurnResult` | 兼容入口：`startWeek` + 自动处理关键回合 + `completeWeek` |
| `advanceWeeks` | `(world: WorldState, plan: WeeklyPlan, count: number) => TurnResult[]` | 连续推进整周，遇到退役或赛季切换提前停止 |
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

「一次推进一周」的旧顺序（`src/engine/turn.ts`）现在等价于：`startWeek` 写 `weekPlan` → 七天 `playDay`（每天按上面的日顺序）→ 停在开球时保留 `pendingDayPlan` 且周次不变 → `completeWeek` 踢完那天并走完剩余日子。

`weekPlayed` / `seasonPlayed` 是“刚踢完的那一周”，不是推进后的周次。LLM 叙事必须使用这两个字段，否则会把新一周误写成已结束的一周。

叙事仍按周触发：store 只在**非 live 且周次跨过去**的一天结束后调用 `narrateTurn`，快进不会把它放大成每天一次。

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

- `ENGINE_VERSION = '0.7.0'`（与 `world.version = 7` 一起构成回放基准的身份）
- `START_SEASON = 2026`
- `TOTAL_WEEKS = 38`

修改任何影响引擎输出的规则时，必须评估是否需要升 `ENGINE_VERSION` 并更新 golden replay 哈希。

## 比赛模拟

| 函数 | 签名 | 行为 |
|---|---|---|
| `determineUserSelection` | `(world, club, rng) => SelectionResult` | 根据能力差、教练信任、体能、状态、锐度与**教练打法契合度**决定首发/替补/不出场 |
| `selectionScore` | `(club, user, squadOverallWithoutUser, trust) => number` | 纯函数：入选评分的唯一算式，末项 `(styleFit − 0.5) × 4` 来自 `domain/coachStyle`，供选型与回归测试共用 |
| `startUserMatch` | `(world, fixture) => MatchReport` | 创建 live 报告并停在 0'，初始化双方首发与全零统计；重复调用返回已有 live 报告 |
| `advanceLiveMinute` | `(world) => LiveMinuteResult \| null` | 每次只推进一步；返回分钟、球权、球位、持球人、传球轨迹、事件与 `paused / finished / halfTime`；关键回合分钟先按归属写入进攻三区球位并计控球再暂停 |
| `buildSpell` | `(input: SpellInput) => SpellResult` | 纯函数：Markov 控球连续、球位推进、1–3 段传球/带球轨迹、射门/进球判定；返回 `liveState` 供下一分钟与刷新恢复 |
| `homePossessionShare` | `(home, away) => number` | 主队控球份额，按中场强度差修正并 clamp 到 0.3–0.7 |
| `kickoffState` / `momentState` / `goalState` | `(side) => MatchLiveState` | 中圈开球 / 关键回合进攻三区 / 进球门线 + `pendingKickoff` 三种画面状态 |
| `buildBeats` | `(input: BeatInput) => BeatResult` | 纯函数：调用 `buildSpell` 后生成该分钟射门/攻防事件与统计增量，不修改报告；进球分钟不重复计射门 |
| `advanceLiveMatch` | `(world) => MatchReport \| null` | 循环调用 `advanceLiveMinute` 直到下一关键回合分钟或 90 分钟；半场比分在 45 分钟后冻结 |
| `finalizeLiveMatch` | `(world) => MatchReport \| null` | 终场唯一结算入口：评分、赛季统计、MOTM、媒体、新闻、黄牌/伤病；幂等 |
| `simulateUserFixture` | `(world, fixture) => MatchReport` | 兼容包装：`startUserMatch` → 自动处理回合 → `finalizeMatchday` |
| `simulateBackgroundFixture` | `(world, fixture) => void` | 模拟其他比赛，写入比分与射手统计 |
| `simulateDayFixtures` | `(world) => MatchReport \| null` | 模拟**今天**其余比赛，写入比分与射手统计 |
| `getUserMatchFixture` | `(world, week?) => Fixture \| undefined` | 取用户本周赛程（周适配器与旧调用保留） |
| `getUserFixtureOnDay` | `(world, day?) => Fixture \| undefined` | 取用户某天赛程，缺省用 `world.day` |
| `opponentOf` | `(world, fixture) => Club \| undefined` | 取对手俱乐部 |

用户比赛从 `0-0` 开始逐分钟模拟：控球方以 0.64–0.83 的概率保持控球（中场强度差修正），球位在同侧控球时朝对方球门推进 0.04–0.18；进球概率为 `clamp(xG / 90 / 控球份额 × 势头, 0, 0.35)`，非进球分钟射门概率 0.12、射正率 38%。进球与射门共用同一持球人，`appendGoal` 唯一写入比分与射门统计。随机流为 `spell / move / chance / beat-actor / goal / pitch / pitch-lane / pitch-carrier`；势头由最近 10 分钟内已结算回合推导，不落盘，因此读档可重放。

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
| `buildPitchFrame` | `(input: PitchFrameInput) => PitchFrame` | 生成双方 11 人坐标、足球位置、传球路线、最近 4 帧轨迹、控球方、持球人与进球侧；控球方压上、防守方回撤逼抢、球贴持球人脚下；同一 seed/场次/分钟确定性 |
| `successBasisText` | `(option) => string` | 成功率依据（属性名 + 百分比） |
| `effectsSummary` | `(option) => string` | 选项效果摘要（进球、助攻、评分、士气、教练信任） |

## 事件

| 函数 | 签名 | 行为 |
|---|---|---|
| `expireEvents` | `(world) => void` | 把 `expiresDay` 早于当前绝对日的开放事件标记为 `expired`；旧档缺 `expiresDay` 时回落 `expiresWeek` 那一周的最后一天 |
| `generateDailyEvents` | `(world, match: MatchReport \| null) => GameEvent[]` | 每天最多一条：保证型候选（赛后/伤病）不掷骰直接生成，否则 `dayRng('event').chance(0.13)`；命中后按 `weight` 加权抽取、渲染插值、写 `events` / `eventMemory` / 新闻并截断到 80 条 |
| `buildEventScope` | `(world, match: MatchReport \| null) => EventScope` | 条件白名单投影（27 字段，一天构建一次）：日历段 + `bodyPart` + `identityPart` + `surroundingsPart` |
| `scopeMatches` | `(scope, conditions) => boolean` | 合取求值，运算符只有 `eq / in / lt / lte / gte / between`；字段不在白名单则抛错 |
| `resolveEvent` | `(world, eventId, choiceId) => GameEvent \| null` | 应用选项效果、写结果文本、标记 `resolved`；无效/重复返回 `null` |
| `applyEffects` | `(world, effects, label?) => void` | 统一应用 `Effect[]`，写财务/关系/新闻等副作用 |

已退役：`generateWeeklyEvent`（周日 72% 拍一条）。它的上下文 if/else 阶梯改成了数据包里的 `when` 条件，`match` 参数改为**当天的战报**，因此赛后事件落在比赛当天而不是下周日。

事件是“引擎事实 + 玩家选择”的组合；LLM 只能改写标题/正文，不能新增选项、改变效果或 `templateId`。模板内容在 `data/events/*.json`，由 `src/domain/eventContent.ts` 的 Zod 模式与 `assertWhitelist` 在加载时硬校验。

## 训练、财务、关系、退役

| 函数 | 签名 | 行为 |
|---|---|---|
| `advanceInjuries` | `(world) => boolean` | 每天递减 `injury.daysLeft`；伤愈时清空伤病、体能 +10、写新闻并返回 `true`（日步进据此产生 `milestone`） |
| `applyDailyTraining` | `(world, focus) => void` | 按年龄、设施、教练、体能与**打法协同**计算**当日**成长与受伤概率；单次量 = 原周量 × `1/5` |
| `dailyGrowth` | `(user, club, focus) => number` | 纯函数：单次训练成长量，末项乘 `styleSynergy(focus, club.style)`（命中打法偏好 1.12，否则 1），再乘 `PER_DAY` |
| `applyDailyAction` | `(world, action) => void` | 应用媒体/经纪人/社交/休息/家庭效果（每周一次，落在活动日） |
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

不同业务域必须使用不同的 `parts`，避免新增逻辑改变旧随机流。例如 `createRng(seed, 'match', fixture.id)` 与 `createRng(seed, 'event', world.season, world.week)` 相互独立。

按天执行的步骤（训练与伤病、每日新闻、事件选项副作用）走 `dayRng(world, tag)` 与 `dailyId(world, prefix)`（`src/engine/dayContext.ts`，域尾追加 `season/week/day`）——id 不带日会让同周七天撞键，新闻与副作用记录因此互相覆盖。事件 id 同样带日段（`event:<season>:<week>:<day>:<templateId>`），掷骰用 `dayRng(world, 'event')`。仍按周拍的一步（`settleWeekFinance` 的余额告急新闻）继续用 `season/week` 作键，因为它们设计上每周只产出一条。`Fixture.id` 保持 `fixture:<leagueId>:<season>:<week>:<index>`：它同时是比赛随机盐，日粒度改造不得改其结构。

## 领域工具

`src/domain/attributes.ts`：

| 函数/常量 | 用途 |
|---|---|
| `overall(player)` | 按位置权重计算综合能力 |
| `computeOverall(position, attributes)` | 纯属性计算 |
| `positionGroup(position)` | `GK / DEF / MID / FWD` |
| `clamp` / `round1` / `round2` | 数值约束 |
| `ATTR_KEYS` / `POSITION_WEIGHTS` / `TRAINING_ATTRS` | 属性与训练配置 |

`src/domain/coachStyle.ts`（主教练打法模型，纯函数，不消耗 RNG、不读墙钟）：

| 函数/常量 | 用途 |
|---|---|
| `STYLE_LABELS` | `possession / counter / highPress / direct` → 中文打法名 |
| `STYLE_ATTRS` | 每种打法的属性权重（求和后归一到 0–1 的契合度） |
| `STYLE_TRAINING_BONUS` | 每种打法偏好的训练重点（`TrainingFocus`） |
| `styleFit(player, style)` | 契合度 0–1；阈值 0.62 / 0.45 切成契合 / 中性 / 不合三档 |
| `styleFitLabel` / `styleAdvice` / `styleTopAttrs` | 档位标签、一句可读规则、看重的属性键 |
| `styleSynergy(focus, style)` | 训练重点命中打法偏好时 1.12，否则 1 |

`src/domain/calendar.ts`（赛历规则，纯整数推导，不读墙钟；日期与星期见 `docs/features/calendar-dates.md`）：

| 函数/常量 | 用途 |
|---|---|
| `DAYS_PER_WEEK` / `MATCH_DAY` / `MATCH_DAY_ALT` / `MIDWEEK_DAY` / `TRAINING_DAYS` | 日序常量（周一 = 1） |
| `DEFAULT_WEEK_PLAN` / `DEFAULT_TRAINING_FOCUS` / `DEFAULT_EXTRA_ACTION` | v5 迁移与新世界使用的默认周模板 |
| `absoluteDay(week, day)` | 跨周比较用的绝对日序 `(week-1)*7+day`，不落盘 |
| `dayForRound(round)` | 轮次 → 星期几：每第 5 轮周三，偶数轮周六，奇数轮周日 |
| `fixtureDayOf(fixture)` | `fixture.day ?? dayForRound(fixture.round)`，旧档无 `day` 也能推导 |
| `weekDayRoles(fixtures, season, week, clubId?)` | 该周的比赛日/活动日/特训日/训练日/决策日划分 |

## 持久化接口

虽然不属于 engine，store 通过这些函数读写世界：

| 函数 | 签名 | 说明 |
|---|---|---|
| `saveWorld` | `(world, id?) => Promise<SaveSummary>` | 写入 Dexie 并更新 `lastSaveId` |
| `loadWorld` | `(id) => Promise<WorldState \| null>` | 读取、schema 校验并迁移旧版本；迁移后回写数据库 |
| `listSaves` | `() => Promise<SaveSummary[]>` | 按更新时间倒序 |
| `deleteSave` | `(id) => Promise<void>` | 删除并清理 `lastSaveId` |
| `exportWorld` | `(world) => string` | 生成带 checksum 的 JSON（`saveVersion` 取 `CURRENT_SAVE_VERSION`，当前 5） |
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
- 连续控球、球位推进、射门/进球同源、球场位置模型与存档 v4 都改变过引擎输出，因此 `ENGINE_VERSION` 一路升到 `0.4.1`。
- 存档 v5 把结算粒度从周改成天（训练/伤病/新闻按天执行、强度重算与身价评估改拍、比赛按日命中），引擎输出必然变化，因此 `ENGINE_VERSION` 升到 `0.5.0` 并重算 golden。
- 基线由 `npm run quality:golden` 重新生成；脚本连续跑两次确认同 hash 后才写入。
- 修改任何影响引擎输出的规则时，必须评估是否需要升 `ENGINE_VERSION` 并更新回放；哈希变化而版本未升会被 `check-anti-regression` 拦截。
- 事件内容不参与接口签名：`data/events/*.json` 扩容只改 `world.events[*].choices` 的内容，因此接口文档里事件相关条目见 `docs/features/daily-events.md`，本文件只在引擎语义变化时升版本。

## 变更记录

| 日期 | 变更 | 关联 |
|---|---|---|
| 2026-10-26 | 初版：回合、比赛、关键回合、事件、财务、积分榜、RNG 与持久化接口 | ADR 0001 |
| 2026-10-31 | 两阶段回合（startWeek/completeWeek）、逐分钟实时比赛、终场统一结算、存档 v2 迁移；engine 0.2.0 与 golden 更新 | 缺陷修复：比赛日比分穿越 |
| 2026-10-31 | `advanceLiveMinute`、`buildBeats`、`startUserMatch` 停在 0'、`resolveKeyMoment` 增加 `advance` 选项、`selectLineup`/`buildMatchLineups`/`buildPitchFrame`；关键回合 5–7 次；engine 0.3.0 与 golden 更新 | 比赛日实时化改造 |
| 2026-10-31 | 新增 `buildSpell`/`homePossessionShare`/`kickoffState`/`momentState`/`goalState`；`advanceLiveMinute` 返回 `carrierId/steps/goalSide`；`buildPitchFrame` 增加 `passPath/carrierId/goalSide` 与控球压上模型；`ENGINE_VERSION` 0.4.0 与 golden 更新 | 缺陷修复：比赛日 2D 画面不可读 |
| 2026-11-01 | `buildPitchFrame` 的 `passPath` 跳过与当前分钟重复的历史帧；关键回合结算事件补写用户方 `side`；`ENGINE_VERSION` 0.4.1 与 golden 更新 | 缺陷修复：2D 画面细节 |
| 2026-11-01 | 新增日回合接口（`startDay`/`advanceDay`/`advanceUntilDecision`/`playDay`/`isPendingDay`/`dayRng`/`dailyId`）与 `DayResult`/`FastForwardResult`；`startWeek`/`completeWeek`/`advanceWeek` 保留为周适配器；`recoverInjuries→advanceInjuries`、`applyTraining→applyDailyTraining`、`applyExtraAction→applyDailyAction`、`simulateWeekFixtures→simulateDayFixtures`、新增 `getUserFixtureOnDay`；领域赛历（`absoluteDay`/`dayForRound`/`fixtureDayOf`/`weekDayRoles`/`DEFAULT_WEEK_PLAN`）进入公共接口；`ENGINE_VERSION` 0.5.0 | 绿茵人生 M1.1 |
| 2026-11-02 | 引擎产出的所有文本（直播事件、关键回合文案、新闻、教练评语、MOTM、射手榜）人名一律取 `displayName(entity)`；接口签名不变，但 `hashState` 因实体新增 `nameZh` 而变化，`ENGINE_VERSION` 升到 0.5.1 并重算 golden；转写本身不消耗 RNG，同种子结果仍可复现 | 绿茵人生 M1.4（中文人名） |
| 2026-11-02 | 新增 `domain/coachStyle.ts` 打法模型；`matchUser` 抽出并导出 `selectionScore`，评分末项加 `(styleFit − 0.5) × 4`；`training` 抽出并导出 `dailyGrowth`，成长量乘 `styleSynergy`；`ENGINE_VERSION` 升到 0.5.2，重算 golden（种子 42 的回放计划不命中风格加成，哈希变化来自世界内的 `engineVersion` 字符串） | 绿茵人生 M1.5 || 2026-11-02 | 新增 `domain/coachStyle.ts` 打法模型；`matchUser` 抽出并导出 `selectionScore`，评分末项加 `(styleFit − 0.5) × 4`；`training` 抽出并导出 `dailyGrowth`，成长量乘 `styleSynergy`；`ENGINE_VERSION` 升到 0.5.2，重算 golden（种子 42 的回放计划不命中风格加成，哈希变化来自世界内的 `engineVersion` 字符串） | 绿茵人生 M1.5 |
| 2026-11-02 | 接口签名不变；`ENGINE_VERSION` 0.6.0 → 0.7.0 并重算 golden（事件内容从 11 条扩到 87 条，`world.events[*].choices` 参与哈希），`EffectOp` 新增 `injuryDays` | 绿茵人生 M1.8（事件内容扩容） |
