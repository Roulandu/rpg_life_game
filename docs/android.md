# Android 构建

环境：JDK 21、Android SDK（`ANDROID_HOME` 已设置）、Node 22+。

```bash
npm install
npm run android:sync      # 以 native 模式构建 Web 资源，并同步到 android/
cd android
./gradlew assembleDebug    # Windows: gradlew.bat assembleDebug
```

产物：`android/app/build/outputs/apk/debug/app-debug.apk`。

## 说明

- `npm run build:native` 使用 Vite 的 `native` mode，`vite-plugin-pwa` 在该模式下禁用，Service Worker 也不会注册。Android 包由 Capacitor WebView 加载本地资源，不需要离线缓存层。
- `androidScheme: 'https'`：WebView 的来源是 `https://localhost`，与浏览器一致。
- 状态栏、启动屏、键盘和返回键已经接入；返回键在主页会先存档再退出，其余页面回退历史。
- 调试包未签名，只用于本机安装。正式发布前需要配置签名、版本号和隐私声明。
- 如果 Gradle 首次构建需要下载依赖，请保持网络连接；国内网络可按需配置镜像。
