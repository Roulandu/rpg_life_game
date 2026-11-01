# 多端与平台规则

## 目标

未来要支持：

- Web / PWA
- Android 手机 / 平板（Capacitor）
- iOS 手机 / 平板（Capacitor，未来）
- 微信小程序（未来）

核心原则：**核心域平台无关，平台差异收敛到端口和适配器**。不要在每个页面里写 `if (isAndroid)`。

## 分层

```text
domain / engine / world / content   ← 纯 TS，无平台 API
store / ui                          ← 通过 platform 端口访问能力
platform/ports                      ← 接口定义
platform/adapters/{web,capacitor,wechat}
platform/index.ts                   ← 唯一选择和装配适配器的地方
```

## 端口

| 端口 | 职责 | Web | Android/iOS | 微信小程序 |
|---|---|---|---|---|
| `SecureKeyStore` | LLM API Key 安全存取 | 加密 IndexedDB / 会话存储 | Capacitor SecureStorage | 小程序安全存储（评估） |
| `HttpTransport` | LLM/网络请求、CORS 代理 | fetch | Capacitor HTTP（可选） | wx.request |
| `FileExport` | 存档导出 | Blob + anchor | Share/Filesystem | 小程序文件 API |
| `Lifecycle` | 返回键、前后台、启动 | visibility/pagehide | Capacitor App | 小程序生命周期 |
| `Persistence` | 存档存储 | IndexedDB | IndexedDB | 小程序 storage/云存储 |
| `DeviceInfo` | 平台、视口、触控 | userAgent/matchMedia | Capacitor Device | 小程序系统信息 |
| `Appearance` | 主题偏好、系统深浅色、状态栏 | localStorage + matchMedia | 同 Web + StatusBar | 系统信息 + storage（规划） |

端口接口放 `src/platform/ports/`，适配器放 `src/platform/adapters/`。选择逻辑只在 `src/platform/index.ts`。

## 能力矩阵

| 能力 | Web/PWA | Android | iOS | 微信小程序 |
|---|---|---|---|---|
| IndexedDB | 是 | 是 | 是 | 否（需 storage 适配） |
| 安全存储 | 会话/加密 | Keystore | Keychain | 评估 |
| 文件导出 | 是 | 是 | 是 | 受限 |
| 返回键 | 浏览器 | 是 | 是 | 是 |
| 触觉反馈 | 受限 | 是 | 是 | 是 |
| PWA 安装 | 是 | 否 | 否 | 否 |
| 后台/生命周期 | 受限 | 是 | 是 | 是 |
| 跟随系统深浅色 | 是（Chrome 123+） | 是（WebView 需 Chromium 123+） | 是（Safari 17.5+） | 评估 |

具体实现状态以 `docs/architecture/platform-strategy.md` 为准。

## 响应式断点

- 手机：<640px，最小支持 360px。
- 平板：640–1024px。
- 桌面：≥1024px。

Tailwind 断点映射：

| 断点 | 宽度 | 典型变化 |
|---|---|---|
| 默认 | <640px | 单列 + 底部导航，480 上限 |
| `sm:` | 640px | 解除 480 上限；专注型页面 720、列表页 760/960 居中 |
| `md:` | 768px | 对话页锁定视口高度、消息区独立滚动 |
| `lg:` | 1024px | 底部导航变形为左侧固定侧栏；主次两栏栅格；标题页双栏 960 |

要求：

- 触控目标 ≥44px。
- 输入框字号 ≥16px（避免移动端自动缩放）。
- 安全区适配（刘海/底部手势区）。
- 纯 CSS 实现：只用断点变体与 `styles.css` 组件类，UI 内不读 `window.innerWidth`、不用 `matchMedia`、不加 `data-layout` 之类的布局分支；平台/设备判断留在 `src/platform` 端口。
- 手机基线只追加断点类名，不改既有手机类字符串，避免像素回归。
- 宽度上限统一用设计令牌（`--sidenav-w` / `--content-max` / `--focus-max` / `--bottom-nav-h`），不要在组件里散落新的硬编码宽度。

### 360/390px 怎么量：同源 iframe

桌面浏览器自动化没有 CDP 视口仿真工具，`window.resizeTo` 对标签页无效、`window.open` 被弹窗拦截，所以直接改窗口宽度这条路走不通。**同源 iframe 有自己的视口**，Tailwind 断点与媒体查询按 iframe 宽度生效，于是可以量到真实布局：

```js
const frame = document.createElement('iframe');
frame.style.cssText = 'position:fixed;left:0;top:0;width:360px;height:640px;visibility:hidden';
frame.src = 'http://localhost:5176/#/team';      // 与顶层页同源，共享该 origin 的 IndexedDB
document.body.appendChild(frame);
// 等 onload + 一帧渲染后：
de.scrollWidth > de.clientWidth                   // 横向溢出
el.getBoundingClientRect().right > width + 1      // 越界元素
Math.min(...targets.map((el) => el.getBoundingClientRect().height))  // 真实触控高度
```

三条注意：

- **origin 会隔离 IndexedDB**（含端口）。验收一律开一次性生涯（如 `localhost:5176`），不要拿开发存档（`localhost:5174`）做推进或改状态。
- `clientWidth` 比 `innerWidth` 小 15px（滚动条），所以 360px 视口的可用内容宽度是 345px。
- jsdom 量不到布局，只能断言类名；两者互补，不能互相替代。

### 断点与触控的自动化契约

像素验收之外，`tests/ui/layoutContract.test.tsx` 用**结构断言**兜住回归，防止同类缺陷再次靠肉眼漏掉：

| 断言 | 口径 |
| --- | --- |
| 触控目标 ≥44px | 主页**每个** `data-dashboard-block` 区块、队伍页、球员详情页、赛程页与收件箱页的移动端 tab 里，每个 `a`、`button` 的类名必须给出 `min-h-[Npx]`（N ≥ 44）或 Tailwind 档位 `min-h-11`（=44px），或走 `btn-primary` / `btn-secondary` / `btn-ghost`；`.btn-*` 组合选择器含 `min-h-11` 由同批用例对 `src/styles.css` 做静态断言。 |
| 手机不被固定宽度撑爆 | 队伍页与详情页内不允许出现基线断点的 `w-[Npx]` / `min-w-[Npx]` / `max-w-[Npx]` 且 N > 340（360px 视口减去左右 16px 内边距）。 |
| 阅读宽度 | 专注型页面根节点带 `page-pad` + `sm:mx-auto sm:max-w-[760px]`，且基线断点不加 `max-w-[...]`，手机占满宽度。 |
| 窄屏栅格 | 球员详情页基线 `grid-cols-*` ≤3，10 项属性用 2 列、本赛季用 3 列仍可读。 |
| 平静日也有可点目标 | 用例注入一条本周 open 事件，避免「没有按钮所以全通过」的假绿。 |

新增页面时把它的根节点与交互元素加进这份契约；360/390px 的真实布局量测（上一节的 iframe 法）仍然是 DoD 的一部分，自动化只兜回归，不替代量测。


## 微信小程序策略

微信小程序不能直接运行现有 React DOM + IndexedDB 应用。两条路径：

1. **web-view 外壳（优先评估）**：小程序内嵌现有 Web 构建，能力受限但改动最小。
2. **原生小程序外壳**：用 Taro/uni-app 等重写 UI，复用 `domain/engine/world` 纯 TS 核心，通过 `Persistence`/`HttpTransport`/`SecureKeyStore` 适配器接入。

无论哪条路径：

- 核心域不得出现 `wx.*`、`window`、DOM API。
- 不把业务规则复制到小程序壳。
- 不在本轮实现；先保证端口和边界规则成立。

## iOS 策略

- 复用 Capacitor，新增 iOS 工程与适配器。
- 安全存储走 Keychain。
- 返回键/生命周期沿用 Capacitor App 端口。
- 响应式布局与 Android 平板共用断点。

## 强制规则

- 只有 `src/platform/**` 可以直接 import `@capacitor/*`。
- 只有 `src/platform/**` 可以直接使用 `window.localStorage`、DOM 文件导出 API、微信 API。
- 其他模块通过端口接口访问能力。
- 新增平台判断必须放 `src/platform`，不能在 UI/store/engine 里散落。
- 现有内联平台判断作为已知违规冻结：
  - `src/platform/native.ts`
  - `src/main.tsx`
  - `src/ui/screens/SettingsScreen.tsx`
  - `src/ui/screens/InboxScreen.tsx`
- 已迁入端口、不再冻结：`src/llm/transport.ts`（HTTP 迁 `src/platform/http.ts`）、`src/platform/keyStore.ts`（持久化改注入 `SecretStore`）、`src/db/repository.ts` 的文件下载（迁 `src/platform/fileExport.ts` + `src/store/exportSave.ts`）。

`check:boundaries` 会检查新增违规。

## 新平台接入清单

1. 在 `docs/architecture/platform-strategy.md` 更新能力矩阵。
2. 实现缺失的端口适配器。
3. 在 `src/platform/index.ts` 注册选择逻辑。
4. 加端口契约测试（同一组行为测试跑多个适配器）。
5. 手动验收关键流程：新建生涯 → 推进 → 比赛日 → 存档 → 刷新恢复。
6. 更新平台差异文档与提交说明。

## 非目标

- 不为不存在的平台提前抽象。
- 不在本轮实现 iOS/微信适配器。
- 不追求一套 UI 适配所有平台；允许壳层不同，但核心规则必须复用。
