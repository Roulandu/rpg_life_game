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

具体实现状态以 `docs/architecture/platform-strategy.md` 为准。

## 响应式断点

- 手机：<640px，最小支持 360px。
- 平板：640–1024px。
- 桌面：>1024px。

要求：

- 触控目标 ≥44px。
- 输入框字号 ≥16px（避免移动端自动缩放）。
- 安全区适配（刘海/底部手势区）。
- 现有 `.app-shell` 的 480px 上限是移动优先的历史选择；做平板/桌面适配时移除，不要继续加平台的硬编码宽度。

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
  - `src/llm/transport.ts`
  - `src/platform/keyStore.ts`
  - `src/main.tsx`
  - `src/ui/screens/SettingsScreen.tsx`
  - `src/db/repository.ts`

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
