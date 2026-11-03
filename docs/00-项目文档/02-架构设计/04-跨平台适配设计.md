# 多端架构策略

目标不是现在就实现所有平台，而是把平台差异限制在可控边界内：核心域保持纯 TypeScript，平台能力只通过端口访问，适配器负责具体实现。

当前代码仍有内联平台判断（见“现状与违规”），它们被冻结；新代码必须按本文的端口规则编写。

## 目标平台

| 平台 | 形态 | 状态 | 说明 |
|---|---|---|---|
| Web / PWA | 浏览器单页应用 | 已支持 | 主开发与发布形态，可安装、离线缓存 |
| Android 手机 | Capacitor 壳 | 已支持 | 原生 HTTP、安全存储、状态栏、触觉等 |
| Android 平板 | Capacitor 壳 | 适配中 | 复用手机布局，验收宽度 640–1024 |
| iOS 手机 / 平板 | Capacitor 壳 | 未实现 | 复用核心域，新增适配器与构建目标 |
| 微信小程序 | web-view 或原生小程序壳 | 未实现 | 核心逻辑不改为小程序专用 |

## 端口与适配器

目标目录：

```text
src/platform/
  index.ts              # 唯一的适配器选择入口
  ports/
    secure-key-store.ts
    http-transport.ts
    file-export.ts
    lifecycle.ts
    persistence.ts
    device-info.ts
  adapters/
    web.ts
    capacitor.ts
    wechat.ts           # 未来
```

端口接口草案（尚未落地，属于 `planned`）：

```ts
export interface SecureKeyStore {
  load(): Promise<string | null>
  save(key: string, remember: boolean): Promise<{ persisted: 'native' | 'encrypted' | 'session' }>
  clear(): Promise<void>
}

export interface HttpTransport {
  readonly kind: 'browser' | 'native' | 'wechat'
  send(request: { url: string; headers: Record<string, string>; body: string; timeoutMs?: number }): Promise<{
    status: number
    bodyText: string
  }>
}

export interface FileExport {
  downloadText(content: string, filename: string, mime: string): Promise<void>
}

export interface Lifecycle {
  onPause(handler: () => void): () => void
  onResume(handler: () => void): () => void
  onBackButton(handler: () => boolean): () => void
}

export interface Persistence {
  load<T>(key: string): Promise<T | null>
  save<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

export interface DeviceInfo {
  readonly platform: 'web' | 'android' | 'ios' | 'wechat'
  readonly safeArea: { top: number; right: number; bottom: number; left: number }
  readonly haptics: boolean
}
```

规则：

- 端口只依赖 `lib`，不依赖 `db`、engine、UI。
- 适配器实现端口；选择逻辑只在 `src/platform/index.ts`。
- 业务模块只 import 端口类型或 `platform` 公共入口，不 import `@capacitor/*`、微信 API、`window.localStorage` 或 DOM 文件导出 API。
- 新增平台不得修改核心域；只新增适配器与构建配置。

## 能力矩阵

| 能力 | Web / PWA | Android | iOS（规划） | 微信（规划） | 端口 |
|---|---|---|---|---|---|
| 安全存储 API Key | AES-GCM 加密 IndexedDB + 会话兜底 | Capacitor SecureStorage | Keychain | 小程序 storage（需评估强度） | `SecureKeyStore` |
| 存档持久化 | IndexedDB / Dexie | IndexedDB（WebView） | IndexedDB（WebView） | 小程序 storage 适配 | `Persistence` |
| 文件导出 | DOM anchor 下载 | 浏览器下载或原生分享 | 分享面板 | 文件/剪贴板 | `FileExport` |
| LLM 网络 | fetch 直连或代理 | CapacitorHttp 原生 HTTP | 原生 HTTP | 小程序 request（需合法域名） | `HttpTransport` |
| PWA / 离线 | Service Worker | 不需要 | 不需要 | 小程序缓存机制 | `Lifecycle` + 构建配置 |
| 触觉反馈 | 无 | Capacitor Haptics | 原生触觉 | 微信振动 API | `DeviceInfo` / `Haptics` |
| 返回键 | 浏览器返回 | 原生返回事件 | 原生返回 | 小程序导航栏 | `Lifecycle` |
| 安全区 | CSS `env(safe-area-inset-*)` | 原生 inset | 原生 inset | 胶囊按钮避让 | `DeviceInfo` |
| 后台/恢复 | visibilitychange | App 生命周期 | App 生命周期 | 小程序生命周期 | `Lifecycle` |
| 主题（深浅色） | `prefers-color-scheme` + `light-dark()` | 同 Web + StatusBar | WKWebView 17.5+；状态栏规划 | 系统信息 + 存储（规划） | `Appearance` |

能力缺失时的统一策略：

1. 核心玩法不得依赖某个平台独有的能力。
2. LLM 能力可以降级为本地模板叙事；存档与导出必须始终可用。
3. 平台能力缺失要在 UI 上给出明确提示，不静默失败。

返回键语义：

- 主页/游戏页按返回键先保存，`saveNow` 返回 `true` 才退出应用。
- 保存失败或回调抛错时留在应用内并显示错误提示，避免丢档。
- 其他页面返回键走浏览器历史回退。

## 主题与深浅色

应用级外观偏好经 `src/platform/appearance.ts` 端口访问，UI/store 不直接接触 `localStorage` 或 `matchMedia`：

- 偏好三态：`system`（默认）| `light` | `dark`，存储在 `pitch-life:theme`；非法值或读取失败回退 `system`。
- 系统色通过 `matchMedia('(prefers-color-scheme: dark)')` 解析；媒体查询不可用时按 `dark`。
- `watchSystemScheme` 返回取消函数，供组合根在卸载时清理。
- `syncStatusBar` 仅在原生平台执行，动态 import `@capacitor/status-bar`；失败静默，不影响玩法。
- 样式使用语义 token + `light-dark()`；不支持时整站保持深色。浏览器要求：Chrome 123+ / Safari 17.5+ / Firefox 120+。
- 显式偏好通过 `html[data-theme]` 锁定 `color-scheme`；`system` 移除该属性，由系统媒体查询决定。
- PWA manifest 与 Capacitor 启动屏背景仍为静态深色，只有运行时 UI 与 `meta[theme-color]` 会跟随偏好。

## 断点与布局

| 区间 | 宽度 | 布局 | 实现 |
|---|---|---|---|
| 手机 | < 640px，最小 360px | 单列、底部导航、触控目标 ≥44px | `.app-shell` 480 上限 + `BottomNav` 底栏 |
| 平板 | 640–1024px | 单列加宽，局部卡片网格；导航仍为底栏 | `sm:` 解除 480 上限，页面宽度分级 |
| 桌面 | ≥ 1024px | 固定左侧导航 + 宽内容区，主次两栏 | `lg:` 侧栏变形与双栏栅格 |

设计令牌（`src/styles.css` 的 `@layer base :root`，组件类统一引用）：

| 令牌 | 值 | 用途 |
|---|---|---|
| `--sidenav-w` | `13rem`（208px） | 桌面侧栏宽度；同时作为内容区左内边距 |
| `--content-max` | `72rem`（1152px） | 双栏页面上限 |
| `--focus-max` | `45rem`（720px） | 专注型流程上限（新建生涯、比赛日、设置） |
| `--bottom-nav-h` | `3.5rem + 安全区` | 对话页锁定高度时扣除底栏 |

实现约束：

- 纯 CSS 响应式：只用 Tailwind 断点变体（`sm:`/`md:`/`lg:`）与 `styles.css` 组件类，UI 中不读视口宽度、不按平台分支；平台判断仍归 `DeviceInfo` 端口。
- 手机基线只追加断点类名，不改既有类字符串，保证 360/390px 像素不变。
- 桌面侧栏与内容左内边距共用 `--sidenav-w`，避免双重偏移；侧栏自行处理上下安全区。
- 对话页仅在 `≥768px` 且已启用 GM 时锁定视口高度、消息区独立滚动、输入框 flex 吸底；更窄宽度回退整页滚动。
- 输入框字号不小于 16px，避免移动端自动缩放。

## 微信小程序策略

优先级：

1. **web-view 外壳**：复用现有 Web 构建与 IndexedDB（若宿主支持），成本最低。
2. **原生小程序壳 + 适配器**：核心域保持纯 TS，通过 `Persistence` / `HttpTransport` / `FileExport` 适配器复用；不把核心改成小程序专用。
3. 不为了小程序重写 engine / world / domain。

限制需要提前验证：包体大小、合法请求域名、存储配额、CORS 与 Cookie、分享与返回键行为。

## iOS 策略

- 复用 Capacitor 工程与 Web 产物，新增 iOS 构建目标与适配器。
- Keychain 适配 `SecureKeyStore`；文件导出走分享面板；网络走原生 HTTP。
- 安全区、返回手势、键盘避让作为验收项。

## 现状与违规

已完成的端口化（不再是违规）：

| 文件 | 现状 |
|---|---|
| `src/platform/keyStore.ts` | 原生 SecureStorage / Web AES-GCM / 会话兜底；持久化经注入的 `SecretStore` 端口，实现见 `src/store/secretStore.ts`，组合根 `src/main.tsx` 装配。`platform → db` 违规已消除。 |
| `src/platform/http.ts` | 浏览器 fetch / CapacitorHttp 两个 `HttpPort` 实现，抛平台中立 `HttpError`；`src/llm/transport.ts` 只做选择与 `HttpError→LlmError` 映射。`capacitor-import` 内联违规已消除。 |
| `src/platform/fileExport.ts` | `downloadTextFile` 触发浏览器下载；`src/store/exportSave.ts` 的 `downloadWorld` 组装文件名后调用。`dom-file-export` 内联违规已消除。 |
| `src/platform/appearance.ts` | 主题偏好读写、系统深浅色解析与监听、原生状态栏同步；store 与 UI 只经平台入口使用。 |

剩余内联平台分支（已冻结，不得增加）：

| 文件 | 现状 | 目标 |
|---|---|---|
| `src/platform/native.ts` | 通过 `window.Capacitor` 判断平台 | 收进 `DeviceInfo` 适配器 |
| `src/main.tsx` | 生产 Web 才注册 Service Worker | 构建/生命周期适配器 |
| `src/ui/screens/SettingsScreen.tsx` | 直接 import llm 测试连接 | 经 store 调用 |
| `src/ui/screens/InboxScreen.tsx` | 直接 import llm 聊天 | 经 store 调用 |

## 门禁

`check:boundaries` 将检查：

- 除 `src/platform/**` 外，禁止直接 import `@capacitor/*`。
- 除 `src/platform/**` 外，禁止直接使用 `window.localStorage` / `localStorage`。
- 除 `src/platform/**`、`src/db/repository.ts`（冻结）外，禁止 DOM 文件导出 API。
- 新平台代码若绕过端口，直接失败。
- `docs/modules.yaml` 中模块的 `platformCapabilities` 与实际 import 不一致时告警。

## 新增平台检查清单

- [ ] 是否需要新端口？优先复用现有端口。
- [ ] 适配器是否只依赖端口与 `lib`？
- [ ] 是否修改了核心域？如果修改，说明为什么无法通过适配器解决。
- [ ] 存档格式是否保持兼容？是否需要迁移？
- [ ] 断点、安全区、触控尺寸是否验收？
- [ ] 能力矩阵与本文是否同步？
- [ ] 是否补充了平台相关测试或手动验收记录？

## 变更记录

| 日期 | 变更 | 关联 |
|---|---|---|
| 2026-10-26 | 初版：端口、能力矩阵、断点与平台演进规则 | ADR 0001 |
| 2026-10-30 | 落地平板/桌面布局：侧栏 208、内容 1152、专注 720、底栏高度令牌；480 上限收窄为手机专用 | 响应式改造 |
| 2026-10-31 | 新增 `Appearance` 端口：主题偏好、系统深浅色监听、`light-dark()` 样式与原生状态栏 best-effort | 浅色模式需求 |
