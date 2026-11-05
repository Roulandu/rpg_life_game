---
id: CHG-20261105-001
title: 修 Windows 下 adb 设备解析误报无在线设备
type: fix
status: verified
level: standard
created: 2026-11-05
updated: 2026-11-05
scope: [scripts, tests, docs]
commits: []
verification: []
ciRun: ''
---

## 背景与目标

真机试玩交付过程中发现 `npm run android:doctor` 在 Windows 上明明连着机（HONOR DNN_AN00）却报「没有在线设备」，导致它给出的「真机验收暂缓」结论不可信，后续整份真机验收清单被无谓作废。

根因在 `scripts/quality/check-device.ts` 的私有 `parseDevices`：过滤条件写成 `/\tdevice(\s|$)/`，**只认 TAB**。实测本机 `adb devices -l` 输出是空格分隔 + CRLF 换行：

```
List of devices attached^M$
AAHBVB5411000443       device product:DNN-AN00 model:DNN_AN00 device:HNDNN transport_id:25^M$
```

TAB 只出现在 macOS/Linux 的 adb 上，所以该正则在 Windows 上永远匹配不到任何行。

目标：让设备解析在 Windows 与 POSIX 上都能认出 `state=device` 的行，并把这条口径从一次性脚本里搬到与就绪判定同处的纯函数，使它能被自动化测试守住。本次不做：不改 `assessDeviceReport` 的判级口径，不动其他探针（SDK/负载/APK 陈旧）。

## 验收条件

- `parseOnlineDevices` 是 `scripts/quality/lib/device.ts` 的导出纯函数，测试可直接 import（满足 `quality:test-impact` 的「改动的测试必须直接 import 改动的实现」）。
- Windows 的空格分隔 + CRLF 输出能解析出序列号；POSIX 的 TAB 输出行为不变。
- `unauthorized` / `offline` 仍不算在线设备；`offline` 与 `device` 混排时只取 `device`。
- 序列号本身含 `device` 子串时（如 `mydevice-serial`）不被误命中 —— 这是放弃整行 substring 匹配、改为「按空白切列再比 state」的理由。
- 真机插着时 `npm run android:doctor` 报「N 台在线设备」且结论为「真机验收可以开始」。

## 影响范围

- `scripts/quality/lib/device.ts`：新增导出 `parseOnlineDevices`，并把文件头「边界」从「只吃探针数据」修正为「吃探针数据与 adb 的文本输出」。
- `scripts/quality/check-device.ts`：删除私有 `parseDevices`，改调 `parseOnlineDevices`；该文件头本就写着「判定口径全部交给 lib/device.ts 的纯函数」，本次是让注释重新成真。
- 测试：新增 `tests/quality/deviceParse.test.ts`（5 例）。
- 文档：`docs/00-项目文档/05-开发规范/04-跨平台开发规范.md` 的「真机验收」段与本 CHG。
- 不涉及 `src/`、存档结构、游戏数值、引擎输出与 golden。

## 方案与取舍

原实现「整行找 `\tdevice` 子串 + 取 `split('\t')[0]`」有两个独立缺陷：分隔符假设平台特有，且子串匹配本身不精确。改成 `raw.trim().split(/\s+/)` 取前两列、比 `state === 'device'`，一次同时解决两者；换行用 `/\r?\n/` 吸收 CRLF。

备选方案是把正则放宽成 `/(?:\t| +)device(\s|$)/`：改动更小，但保留「整行 substring」这个不精确的形状，序列号含 `device` 就会误判，且函数仍留在脚本里不可测。按 `docs/00-项目文档/06-测试与质量/01-测试与回归策略.md` 的 Bug fix 政策，修复必须能被自动化守住，所以选择搬函数 + 换列切分。

设备不在场仍是 `warn` 不是 `fail`（`deviceFinding` 原语义保留）：解析修好后「真没插线」和「插了线读不出来」才第一次能被区分开。

## 验证证据

- `npx vitest run tests/quality/deviceParse.test.ts` — RED：`Test Files 1 failed (1)`、`Tests 5 failed (5)`，全部为 `TypeError: parseOnlineDevices is not a function`（实现尚未创建），其中用例名 `回归: Windows 下 adb devices 用空格分隔时误报无在线设备`。
- `npx vitest run tests/quality/deviceParse.test.ts tests/quality/device.test.ts` — GREEN：`Test Files 2 passed (2)`、`Tests 12 passed (12)`（5 新增 + 原有 7 例不减）。
- `npm run android:doctor` — 修复前输出「⚠ 没有在线设备…真机验收暂缓（无在线设备）」；修复后在连着同一台 HONOR 的情况下输出 `android:doctor 通过：真机验收可以开始` 与 `✔ 1 台在线设备：AAHBVB5411000443`。
- `adb devices -l | cat -A` — 记录真实字节形状：`AAHBVB5411000443       device product:DNN-AN00 ...`（空格分隔、`^M$` 结尾），测试 fixture 由此抄录而非推测。
- `npm run verify -- --fast` — 通过：`验证通过：fast 模式，8 个步骤。`，含 `变更记录检查通过：5 份 CHG，0 份 VER`、`技术债检查通过：14 个已知超标实体均未恶化`、`模块边界检查通过：388 条跨模块依赖`、`全仓密钥扫描通过：688 个受版本控制文件`。

## 防回归

`tests/quality/deviceParse.test.ts` 把三种平台形状（Windows 空格+CRLF、POSIX TAB、混排状态）与两条边界（头行/空行、序列号含 device）钉成断言；解析口径一旦回到 substring 匹配，`mydevice-serial` 那例会立刻失败。

同类问题排查：本仓另一处 `adb devices` 消费方是 `scripts/quality/check-device.ts` 自身，无第二份解析实现；`android:sync`/`build:native` 不读设备列表，不受影响。

## 文档影响

更新本 CHG；`docs/00-项目文档/05-开发规范/04-跨平台开发规范.md` 的「真机验收」结论口径补一句「报空之前先用 `adb devices -l | cat -A` 确认分隔符形状」，并修正 2026-11-03 那条把误报当成「本机无设备」记进文档的事实 —— 该条正是本缺陷写下的假结论。`scripts/quality/lib/device.ts` 与 `check-device.ts` 的文件头职责注释同步。

## 兼容与回滚

纯函数搬家 + 判定放宽，不改 `DeviceProbe` 字段、不改 `assessDeviceReport` 的判级与 `formatDeviceReport` 文案，`--json` 输出的 `onlineDevices` 形状不变（只会从空数组变成真实序列号）。回滚即还原两个脚本文件并删除新测试，退回单平台可用状态。

## 技术债与例外

未新增技术债：`lib/device.ts` 移动后仍在 300 行、60 行、圈复杂度阈值内，`check-device.ts` 行数下降。未修改 `quality/*-baseline.json`，未新增 `knownViolations`，未放宽任何门禁。

本项缺陷由 `CHG-20261103-004` 引入但未被其测试发现：该批只测了 `assessDeviceReport` 的判级，解析函数留在脚本内无覆盖，属「测试没钉住的实现细节」而非已知取舍。

## 验收结论

RED/GREEN 是同一个测试文件 `tests/quality/deviceParse.test.ts`，失败原因与需求直接相关（`parseOnlineDevices is not a function`），修复后 12 例全绿且原有用例数不降。真实设备上的效果已由 `npm run android:doctor` 前后对比证明：同一台 HONOR、同一条命令，从「真机验收暂缓（无在线设备）」变成「1 台在线设备：AAHBVB5411000443 / 真机验收可以开始」。`npm run verify -- --fast` 8 步全绿。

状态为 `verified`：本地门禁通过，**CI 待执行**（本次改动尚未推送）。推送后须用 `npm run ci:wait` 取到该 commit 的最终结论，才能推进到 `accepted` 并回填 `ciRun`。
