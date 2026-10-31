---
feature: matchday
status: implemented
modules: [engine, store, ui, domain]
code:
  - src/engine/liveMatch.ts
  - src/engine/liveMinute.ts
  - src/engine/liveSetup.ts
  - src/engine/matchBeats.ts
  - src/engine/matchReport.ts
  - src/engine/matchFinalize.ts
  - src/engine/matchGoals.ts
  - src/engine/matchUser.ts
  - src/engine/match.ts
  - src/engine/keyMoments.ts
  - src/engine/keyMomentGen.ts
  - src/engine/keyMomentNarrative.ts
  - src/engine/data/keyMomentOptions.ts
  - src/engine/data/keyMomentOptionsAttack.ts
  - src/engine/data/keyMomentOptionsDefense.ts
  - src/engine/data/keyMomentOptionsSetPiece.ts
  - src/engine/data/beatTexts.ts
  - src/domain/matchTypes.ts
  - src/domain/lineup.ts
  - src/domain/pitch.ts
  - src/domain/keyMomentView.ts
  - src/domain/leagueTable.ts
  - src/store/matchSlice.ts
  - src/store/liveSlice.ts
  - src/store/livePlayback.ts
  - src/store/selectors.ts
  - src/ui/screens/MatchdayScreen.tsx
  - src/ui/screens/matchday/LiveMatchStage.tsx
  - src/ui/screens/matchday/PitchMap.tsx
  - src/ui/screens/matchday/LiveControls.tsx
  - src/ui/screens/matchday/LiveFeed.tsx
  - src/ui/screens/matchday/MatchStatsPanel.tsx
  - src/ui/screens/matchday/KeyMomentModal.tsx
  - src/ui/screens/matchday/KeyMomentCard.tsx
  - src/ui/screens/matchday/useLiveClock.ts
  - src/ui/screens/matchday/ScoreCard.tsx
  - src/ui/screens/matchday/MatchReview.tsx
  - src/ui/screens/matchday/MatchdayExit.tsx
  - src/ui/screens/matchday/MatchTimeline.tsx
tests:
  - tests/engine/liveMinute.test.ts
  - tests/engine/liveMatch.test.ts
  - tests/engine/matchBeats.test.ts
  - tests/engine/matchReport.test.ts
  - tests/engine/liveSetup.test.ts
  - tests/engine/match.test.ts
  - tests/engine/keyMoments.test.ts
  - tests/engine/keyMomentGeneration.test.ts
  - tests/engine/keyMomentOptions.test.ts
  - tests/engine/keyMomentNarrative.test.ts
  - tests/engine/motm.test.ts
  - tests/engine/season.test.ts
  - tests/domain/lineup.test.ts
  - tests/domain/pitch.test.ts
  - tests/domain/keyMomentView.test.ts
  - tests/domain/leagueTable.test.ts
  - tests/store/livePlayback.test.ts
  - tests/store/matchdayStore.test.ts
  - tests/ui/matchdayLiveStage.test.tsx
  - tests/ui/keyMomentModal.test.tsx
  - tests/ui/pitchMap.test.tsx
  - tests/ui/liveControls.test.tsx
  - tests/ui/liveFeed.test.tsx
  - tests/ui/matchStatsPanel.test.tsx
  - tests/ui/useLiveClock.test.tsx
  - tests/ui/matchTimelineSides.test.tsx
  - tests/ui/matchdayUtils.test.ts
  - tests/ui/smoke.test.tsx
  - tests/ui/matchday.test.tsx
  - tests/ui/matchdayLive.test.tsx
  - tests/ui/matchdayOutcomes.test.tsx
diagrams: [sequence, state]
last_reviewed: 2026-10-31
---

# 比赛日与关键回合

## 业务目标

用户比赛必须像“看直播”一样展开：进入比赛日后从 0' 自动开赛，逐分钟推进到 90'，期间提供俯视球场点阵、双方攻防文字直播、实时数据面板和可调速度。关键时刻在对应分钟自动停表弹出选择，并明确展示触发条件、成功率依据、选项效果与掷骰结果。玩家的选择立即改写比分、时间线与势头，而不是在已预定的终场比分上补充进球。

## 用户流程

1. 玩家推进一周，`startWeek` 完成赛前准备并创建 live 比赛；`startUserMatch` 停在 `0'`，比分 `0-0`，不增加周次，并落盘一次。
2. 进入 `/match` 后页面自动开赛：默认 `1x`，每分钟一次 tick，球场点阵、足球、双方文字直播与数据面板同步刷新。
3. 播放到关键回合分钟时自动停表，弹出关键回合弹窗：场景、触发条件、5 个选项（成功率依据与效果摘要）、当前掷骰阈值。
4. 玩家选择后显示掷骰值、成功/失败与影响，随后落盘一次；点击“继续比赛”恢复播放。
5. 最后一条回合结束后比赛仍为 live，继续播到 90'，出现“完成比赛”入口；点击后终场结算（评分、MOTM、媒体反应、新闻、赛季数据）并推进周次。
6. 玩家可随时暂停/继续、切换 `1x/2x/4x`、点击“跳到下一关键回合”直接推进到下一回合分钟。
7. 玩家也可以“自动处理”，系统为每个回合选择默认（成功率最高）选项、自动播完并完成整周。

## 关键时序

```mermaid
sequenceDiagram
  participant U as 玩家
  participant UI as MatchdayScreen
  participant S as gameStore
  participant T as engine/turn
  participant M as engine/liveMinute
  participant K as engine/keyMoments
  participant F as engine/matchFinalize
  participant DB as db/repository
  U->>UI: 进入比赛日
  UI->>S: startLivePlayback()
  S-->>UI: phase=playing, speed=1, minute=0
  loop 每分钟
    UI->>S: tickLiveMatch()
    S->>M: advanceLiveMinute(world)
    M-->>S: possession / ballX / events / paused
    S-->>UI: 浅拷贝 world + playback revision
  end
  Note over M,S: 下一分钟是关键回合 → 停表, phase=awaiting
  U->>S: resolveKeyMoment(momentId, optionId)
  S->>K: resolveKeyMoment(next, ..., { advance: false })
  K-->>S: 比分/事件/势头已写，分钟不变
  S->>DB: saveWorld 一次
  S-->>UI: phase=result + 掷骰结果
  U->>S: continueAfterMoment()
  Note over S: phase=playing 或 ended(90')
  U->>S: finishLiveMatch()
  S->>F: finalizeLiveMatch + completeWeek
  S->>DB: saveWorld 一次
  S->>S: narrateTurn
  UI-->>U: 比赛总结
```

失败分支：

- 非 live 或已结束的 tick 是 no-op，不重复计分。
- 存档写入失败 → 内存状态保留，提示“保存失败：<原因>”；再次操作不会重复结算或推进周次。
- AI 叙事失败 → 比赛结果、媒体反应与新闻保留，只显示错误提示。
- 旧版存档（无 `pendingWeekPlan`）→ 完成回合后只结算比赛，不调用 `completeWeek`，不会多推一周。

## 状态机

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> playing: startLivePlayback（live 且未到关键回合）
  playing --> awaiting: tick 到关键回合分钟
  playing --> ended: tick 到 90'
  awaiting --> result: resolveKeyMoment（落盘一次）
  result --> playing: continueAfterMoment
  result --> ended: continueAfterMoment（已到 90'）
  playing --> paused: 暂停
  paused --> playing: 继续
  ended --> idle: finishLiveMatch（终场 + 推周）
```

- `phase` 是 store 瞬态状态，不写入存档。
- `tickLiveMatch` 只在 `playing` 时推进；`paused / awaiting / result / ended` 下为 no-op，避免重复计分。
- `jumpToNextKeyMoment` 只在 `playing` 时循环推进，直到 `paused`（进入 `awaiting`）、`finished`（`ended`）或无效。

## 规则与边界

### 出场判定

`determineUserSelection`：

- 受伤或体能 <26：不出场。
- 综合评分：
  `(能力 - 队友阵容能力) × 2.2 + (教练信任 - 50) × 0.22 + (体能 - 70) × 0.2 + (状态 - 50) × 0.12 + (锐度 - 50) × 0.08`
- 体能 ≥38 且（评分 ≥−3.5，或评分 ≥−9 且 55% 概率）→ 首发 90 分钟。
- 体能 ≥45 且评分 ≥−18 且 45% 概率 → 替补 15–30 分钟。
- 其余不出场；不出场时 `startWeek` 在内部完整模拟 90 分钟并直接结算整周。

### 首发阵容

`domain.lineup.selectLineup` 是首发唯一来源，`computeClubStrength` 与比赛首发共用：

- 目标结构为 1 门将、4 后卫、4 中场、2 前锋，共 11 人。
- 同位置按综合能力、状态、体能排序；同一俱乐部、同一阵容输出稳定。
- 用户出场时强制选入首发；用户不出场或替补时不在首发 11 人中。
- `matchReport.lineups` 保存双方首发（`id / name / number / position / isUser`），供球场点阵与射手选择复用。

### 逐分钟实时模拟

- 赛前用 `expectedGoals` + 俱乐部风格修正计算 `homeXg/awayXg`（与旧版一致）。
- `advanceLiveMinute(world)` 每次只推进一步，返回 `{ minute, paused, finished, halfTime, possession, ballX, events }`。
- 每分钟主客各一次伯努利判定：`p = clamp(xG / 90 × 势头系数, 0, 0.5)`；使用独立随机流 `createRng(seed, 'live', fixtureId, minute)`。
- 关键回合分钟不模拟自动进球，也不生成攻防事件；该分钟按回合归属方计入控球后再暂停。
- 第一次跨过第 45 分钟时冻结半场比分并补一条半场事件，之后不再变化。
- 90' 返回 `finished = true`，但不自动终场；终场由 `finalizeLiveMatch` 负责。
- `advanceLiveMatch(world)` 只是循环调用 `advanceLiveMinute` 的批量路径；逐分钟播放与批量结算必须产生完全相同的终场报告（同一 seed 哈希一致）。
- 替补球员在登场前不会成为进球者或助攻者：用户可选窗口为 `90 - userMinutes` 到 90，未出场权重为 0。

### 双方攻防事件与统计

`engine.matchBeats.buildBeats` 每分钟生成双方攻防事件与统计增量，纯函数、不修改报告：

| 掷骰区间 | 事件 | 归属 | 统计 |
|---|---|---|---|
| `< 0.10` | 射门 | 控球方 | 射门 +1，42% 射正 |
| `< 0.16` | 角球 | 控球方 | 角球 +1 |
| `< 0.24` | 进攻推进 | 控球方 | — |
| `< 0.28` | 犯规 | 防守方 | — |
| `< 0.30` | 越位 | 控球方 | — |
| 其余 | 无事件 | — | — |

- 控球归属使用 `createRng(seed, 'possession', fixtureId, minute)`；主队控球概率
  `clamp(0.52 + (主队中场强度 - 客队中场强度) × 0.004, 0.3, 0.7)`。
- 球位使用同一分钟随机流：主队控球在 `x ∈ [0.52, 0.94]`，客队控球在 `x ∈ [0.06, 0.48]`。
- 事件球员用 `createRng(seed, 'beat-actor', fixtureId, minute, side, att|def)` 抽取：进攻取前锋/中场，防守取门将/后卫。
- 统计面板固定四项：控球、射门、射正、角球；`双方控球分钟之和 = currentMinute`，`射正 ≤ 射门`。
- 关键回合进球同步补记用户方射门/射正；对手机会只以攻防事件呈现，不产生“对手关键回合”。

### 球场点阵

`domain.pitch.buildPitchFrame` 生成双方各 11 名球员坐标、足球位置与最近 5 帧轨迹：

- 阵型槽位：门将 `x=0.06`，后卫 `x=0.24`，中场 `x=0.4`，前锋 `x=0.46`；客队镜像到 `1 - x`。
- 每名球员使用 `createRng(seed, 'pitch', fixtureId, minute, side, index)` 加 ±0.03/±0.04 抖动，边界 clamp。
- 足球位置由同一分钟球位随机流生成 `y ∈ [0.18, 0.82]`；轨迹复算最近 5 帧。
- 控球方距球最近的球员标记 `hasBall`。
- 同一 seed、场次与分钟输出相同坐标；不同分钟产生跑位变化。

### 关键回合生成

- 仅当用户出场且分钟数 >0 时生成。
- 数量：`rng.int(5, 7)`，按出场分钟缩放（替补出场时间越短越少），保证落在出场窗口内。
- 12 类：`bigChance / penalty / throughBall / duel / save / clearance / freeKick / headerDuel / oneOnOne / counterAttack / cross / longShot`。
- 位置池按门将、后卫、中场、前锋划分；分钟递增且不重复。
- 每个回合恰好 5 个选项，`defaultOptionId` 指向成功率最高的稳妥选项。
- 每个选项含 `successChance`、成功/失败评分、士气、教练信任、进球/助攻标记，以及：
  - `successBasisZh`：成功率依据（属性名 + 百分比）。
  - 效果摘要：进球、助攻、评分、士气、教练信任。
- 每个回合含 `triggerZh`：触发条件（场景描述）。
- `roll` 在生成时固定为 0–1 的四位小数；后续只比较 `roll < successChance`，不得重抽或重算。

### 回合结算

- `success = moment.roll < option.successChance`。
- 实时比赛（`status === 'live'`）：
  - 成功且 `goalOnSuccess`：立即为用户方追加进球，`userGoals + 1`，补记射门/射正。
  - 成功且 `assistOnSuccess`：为球队生成一粒队友进球，用户 `userAssists + 1`。
  - 失败：不增加进球。
  - 士气、信心、教练/媒体/球迷关系立即结算。
  - **不**在回合中写赛季进球/助攻/评分/form；`ratingDelta` 存入 outcome，终场统一加总。
  - `resolveKeyMoment(..., { advance: false })` 时停在当前分钟；默认 `advance: true` 的批量路径会继续推进到下一回合或 90'。
  - 批量自动结算前若回合分钟尚未播到，会先 `advanceLiveMatch` 到该分钟，保证“暂停分钟”的控球归属与实时播放一致。
- 旧版 `final` 报告（v1/v2 存档遗留的未完成回合）保留旧路径：立即写赛季统计、评分、form、新闻与时间线，避免旧档行为漂移。

### 终场结算

`finalizeLiveMatch` 幂等（`status === 'final'` 直接返回）：

- 由 `report.goals` 统计 AI 射手/助攻赛季数据；用户数据经 `updateUserAfterMatch` 一次写入。
- 最终评分 = `computeUserRating(...)` 基础分 + 所有 `outcome.ratingDelta` 之和，clamp 4.3–9.9。
- MOTM 依据 `report.goals` 的射手与最终评分；用户评分 ≥8.3 归用户。
- 生成黄牌/伤病/机会事件并并入时间线，追加 `fulltime` 事件与 `mediaReaction`。
- `fixture.status = 'played'`，写报告与比赛新闻；`report.status = 'final'`、`currentMinute = 90`。

### 自动处理

- 对每个待处理回合选择 `defaultOptionId`（成功率最高的稳妥选项）。
- 仍逐条走 `resolveKeyMoment`，结果与玩家选择同一路径。
- `skipKeyMoments` 自动处理剩余回合并直接完成整周，同时清空播放状态。
- `advanceWeek` / `advanceWeeks` / `simulateUserFixture` 兼容入口会 start → autoResolve → finalize → complete，保持“一次推进一周”的旧语义。

### 持久化与重放

- 落盘点固定在“开局、每个关键回合结算后、完赛”三处；播放中的每分钟只改内存，不落盘。
- 刷新/读档后，UI 调用 `startLivePlayback` 按 `fixtureId` 对账：
  - 有未结算回合且 `moment.minute === currentMinute` → `awaiting`。
  - `currentMinute >= 90` → `ended`。
  - 其余 → `playing`，从最近 checkpoint 按每分钟独立随机流确定性重放。
- `livePlayback`（phase/speed/position/history/resultMomentId）不持久化：刷新后速度回到 `1x`，结果弹窗不恢复（结果已写入报告与时间线），但比分、统计与事件一致。

### 播放控制

| 速度 | tick 间隔 |
|---|---|
| 1x | 500ms |
| 2x | 250ms |
| 4x | 120ms |

- 切换速度只改变 UI 计时器频率，不改变引擎结果。
- 计时器只存在于 `useLiveClock`，卸载或离开 `playing` 时清除。
- “跳到下一关键回合”与自动播放共用 `advanceLiveMinute`，跳过的分钟照常产生事件与统计。

### 交互状态

- `final` 报告 → 赛后回顾页（比分、数据统计、MOTM、媒体反应、出口）。
- `live` 报告 → 实时比赛页：比分卡、球场点阵、数据面板、播放控件、双方文字直播。
- `awaiting` → 关键回合弹窗（不可关闭）；`result` → 掷骰结果弹窗，含“继续比赛”。
- `ended` → 页面内“完成比赛”入口。
- 存在待处理回合时隐藏“下一场”入口与「返回主页」按钮，避免跳过后面的关键回合。
- 提交回合或自动处理期间按钮锁定；即使动作抛错也会在 `finally` 解锁。

### 不可变条件

- 比赛不得预先确定终场比分；比分只能是“截至当前分钟”的累计。
- `roll` 不得重抽、不得在结算时重新计算成功率。
- 关键回合顺序不可交换。
- 比分只能由 `appendGoal` 写入；同一进球不得重复计数。
- 未完成全部回合时不得生成媒体反应、评分或推进下一周。
- 赛季统计、form、MOTM、新闻只在终场结算一次。
- 播放中 tick 不得写库，也不得 `structuredClone` 整棵 world。

## 数据与接口

读写：

- `world.lastMatch`：`MatchReport`，live 阶段 `userRating = null`、`motmName = ''`、`motmRating = 0`、无 `mediaReaction`；新增可选 `stats` 与 `lineups`。
- `world.pendingWeekPlan`：live 期间保存本周计划与 `fixtureId`，用于完成后继续结算。
- `world.fixtures[fixtureId]`：`status` 为 `scheduled / live / played`，比分实时同步。
- 用户球员：`seasonStats`、`form`、`morale`、`confidence`、`reputation`、`injury`。
- `world.relationships`：教练、媒体、球迷。
- `world.news`：比赛新闻与惊险比赛新闻（终场生成）。
- `store.livePlayback`：瞬态播放状态，不进入 `WorldState`。

调用：

- `engine.startWeek(world, plan)` / `engine.completeWeek(world)`
- `engine.startUserMatch(world, fixture)`
- `engine.advanceLiveMinute(world)` / `engine.advanceLiveMatch(world)`
- `engine.buildBeats(input)`
- `engine.generateKeyMoments(player, rng, minutes, isHome, startMinute)`
- `engine.resolveKeyMoment(world, momentId, optionId, { advance? })`
- `engine.autoResolveKeyMoments(world)`
- `engine.finalizeMatchday(world)` / `engine.finalizeLiveMatch(world)`
- `domain.selectLineup(club, players, options?)` / `domain.buildMatchLineups(world, report)`
- `domain.buildPitchFrame(input)`
- `domain.successBasisText(option)` / `domain.effectsSummary(option)`
- `domain.computeLeagueTable(world, leagueId, season)`
- `store.startLivePlayback / tickLiveMatch / pauseLivePlayback / resumeLivePlayback / setLiveSpeed / jumpToNextKeyMoment / continueAfterMoment / finishLiveMatch`

## 失败与降级

| 场景 | 行为 |
|---|---|
| 用户未出场/无关键回合 | `startWeek` 内完整模拟 90 分钟并结算整周，不进入回合流程 |
| 无效回合或选项 | 返回 `null`，store 提示，不修改状态 |
| 重复提交同一回合 | 第二次返回 `null` |
| 存档失败 | 内存结果保留，持久化失败不阻塞；再次操作不会重复结算或推进周次 |
| 页面刷新（播放中） | 从最近 checkpoint 重放；最终比分/统计一致；速度回到 1x |
| 页面刷新（弹窗中） | 回到同一待处理回合，重新弹出；掷骰结果本来就要重新选择，不恢复 |
| 点击完成比赛但未到 90' 或仍有回合 | 拒绝并提示，不推周、不写库 |
| 旧版存档未完成回合 | 保留旧结算路径，完成回合后不多推周 |
| AI 叙事失败 | 比赛报告、媒体反应与新闻保留 |

## 平台差异

- 手机小屏（<640px）：球场只渲染点阵、足球与轨迹；姓名节点隐藏，保留号码。
- pad / web（≥640px）：点阵 + 姓名 + 号码 + 轨迹。
- 宽屏布局：`≥640px` 起页面以 720px 专注宽度居中（`--focus-max`），保持单列流程，不拆两栏。
- 播放控件触控高度 ≥44px；`prefers-reduced-motion` 下禁用点阵过渡动画。
- 比赛与关键回合完全本地计算；平台差异只影响展示。

## 已知限制

- 刷新后从最近 checkpoint 重放，结果弹窗不恢复；速度回到 1x。
- 用户替补时球场仍显示首发 11 人，只显示“你将在第 X 分钟登场”提示，不动态换人。
- 关键回合只有玩家一方；对手机会以双方攻防事件呈现。
- 背景比赛仍即时结算，不逐分钟播放。

## 验收与测试映射

| 规则/场景 | 测试 |
|---|---|
| startWeek 停在 0'、逐分钟推进、暂停分钟、批量一致 | `tests/engine/liveMinute.test.ts` |
| 半场冻结、90' 不终场、重复推进幂等、控球/射正约束 | `tests/engine/liveMinute.test.ts` |
| 双方攻防事件与统计映射、确定性 | `tests/engine/matchBeats.test.ts` |
| 开球报告统计归零、统计只累加对应一方 | `tests/engine/matchReport.test.ts` |
| 主客各 11 人首发 | `tests/engine/liveSetup.test.ts` |
| 关键回合成功/失败立即改写比分 | `tests/engine/liveMatch.test.ts` |
| 关键回合数量、分钟递增、默认选项、替补窗口 | `tests/engine/keyMomentGeneration.test.ts` |
| 12 类 × 5 选项、触发条件、成功率依据、收益 | `tests/engine/keyMomentOptions.test.ts` |
| 12 类成功/失败叙事 | `tests/engine/keyMomentNarrative.test.ts` |
| 结算、终场评分、form、赛季统计、新闻 | `tests/engine/keyMoments.test.ts`、`tests/engine/motm.test.ts` |
| 比赛模拟、出场判定、赛季统计 | `tests/engine/season.test.ts`、`tests/engine/match.test.ts` |
| startWeek/completeWeek 两阶段 | `tests/engine/turn.test.ts` |
| 首发选择稳定性、用户强制入选 | `tests/domain/lineup.test.ts` |
| 球场坐标边界、确定性、轨迹 | `tests/domain/pitch.test.ts` |
| 成功率依据与效果摘要 | `tests/domain/keyMomentView.test.ts` |
| store 播放时钟、暂停/结果、落盘点、刷新重放 | `tests/store/livePlayback.test.ts` |
| store 保存、完成与失败恢复 | `tests/store/matchdayStore.test.ts` |
| 页面自动开赛、速度、弹窗、90' 完成 | `tests/ui/matchdayLiveStage.test.tsx` |
| 弹窗 5 选项、触发条件、依据、掷骰 | `tests/ui/keyMomentModal.test.tsx` |
| 球场 22 点、足球、轨迹、紧凑模式 | `tests/ui/pitchMap.test.tsx` |
| 双方事件与主客标记 | `tests/ui/liveFeed.test.tsx`、`tests/ui/matchTimelineSides.test.tsx` |
| 数据面板四项 | `tests/ui/matchStatsPanel.test.tsx` |
| 速度映射、tick 间隔、卸载清理 | `tests/ui/liveControls.test.tsx`、`tests/ui/useLiveClock.test.tsx` |
| 比赛页渲染与实时比分 | `tests/ui/matchday.test.tsx`、`tests/ui/matchdayLive.test.tsx` |

手动验收：

1. 推进一周，进入 `/match` 自动从 0' 开赛，点阵、足球、双方 feed、比分/统计随分钟变化。
2. 切换 1x/2x/4x，节奏明显不同；暂停/继续正常；切换不改变最终结果。
3. 关键回合到点停表：弹窗显示触发条件、5 个选项、成功率依据与效果；选择后显示掷骰值、成功/失败；点“继续比赛”恢复。
4. “跳到下一关键回合”直达下一回合分钟并弹窗；feed 含跳过分钟的双方事件。
5. 最后一条回合后继续播到 90'，点“完成比赛”进入回顾页，比分/MOTM/媒体反应/周次正确。
6. 刷新：弹窗态回到同一回合；普通播放态从最近 checkpoint 重放，最终比分/统计一致。
7. 360–390px 无横向溢出、控件可点、只显示点阵；桌面显示姓名/号码，720px 专注宽度不破。
8. 导入 v2 live 存档：待处理回合保留、阵容/统计补齐、可继续到终场；v3 导出再导入深度相等。

## 变更记录

| 日期 | 变更 | 关联 |
|---|---|---|
| 2026-10-26 | 初版：出场、比分、关键回合、结算、最终化与失败降级 | ADR 0001 |
| 2026-10-28 | 积分榜计算 `computeLeagueTable` 下沉至 `src/domain/leagueTable.ts`，斩断 engine→world 与 llm/ui→engine 深引 | 全量重构提交 3 |
| 2026-10-29 | 关键回合选项构建外迁 `src/engine/data/keyMomentOptions.ts`、叙事与媒体反应外迁 `src/engine/keyMomentNarrative.ts`，keyMoments.ts 只保留编排；golden 哈希不变 | 全量重构提交 7 |
| 2026-10-30 | 宽屏下比赛日以 720px 专注宽度居中；比赛规则与结算不变 | 响应式改造 |
| 2026-10-29 | 比赛模拟拆为 `matchGoals.ts`（期望进球/射手/助攻/伤种）与 `matchUser.ts`（选人/评分/赛后结算），match.ts 只保留比赛编排；RNG 顺序不变，golden 哈希一致 | 全量重构提交 8 |
| 2026-10-29 | 比赛日动作迁入 `store/matchSlice.ts`，Dashboard/Schedule 的待处理回合与赛程派生改走 `store/selectors.ts`，消除 ui→engine/world 直接依赖 | 全量重构提交 10 |
| 2026-10-29 | `MatchdayScreen` 拆为 `ui/screens/matchday/*`：比分卡、关键时刻选择、赛后回顾、文字直播与回合工具，主组件只做编排；新增页面状态测试，视觉与交互不变 | 全量重构提交 11 |
| 2026-10-29 | 全场最佳在用户为射手王但评分 <8.3 时改用用户实际评分，消除姓名与评分矛盾；golden 哈希不变 | 缺陷修复 P4 |
| 2026-10-29 | 待处理回合时隐藏“下一场”入口；回合动作用 try/finally 解锁按钮 | 缺陷修复 P5 |
| 2026-10-31 | 结果页末尾新增整宽「返回主页」主按钮，下一场信息合并为按钮上方说明；比赛结算规则不变 | 交互修复：结果页出口 |
| 2026-10-31 | 重做逐分钟实时模拟：取消预生成终场比分，关键回合插入实时进程并立即改写比分/势头；终场统一结算评分与赛季数据；存档升 v2；engine 0.2.0，golden 哈希更新 | 缺陷修复：比赛日比分穿越 |
| 2026-10-31 | 比赛日实时化：0' 自动开赛 + 1x/2x/4x + 跳到下一关键回合；球场点阵/足球/轨迹、双方攻防文字直播与四项数据；关键回合扩为 12 类 × 5 选项、每场 5–7 次并展示触发条件/成功率依据/掷骰结果；存档升 v3；engine 0.3.0，golden 哈希更新 | 比赛日实时化改造 |
| 2026-10-31 | 触发条件文案只由 UI 添加“触发条件：”前缀，数据层不再重复携带前缀，避免弹窗出现双前缀 | 比赛日实时化改造 |
