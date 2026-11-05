/**
 * 职责：把「真机验收前必须成立的事实」写成纯判定，供 npm run android:doctor 与测试共用同一口径。
 * 边界：只吃探针数据与 adb 的文本输出，不碰 adb 调用、文件系统与网络；设备不在场只报警，WebView 负载陈旧必须判失败。
 * 依赖：无外部依赖；探针由 scripts/quality/check-device.ts 采集。
 */

export type DeviceLevel = 'pass' | 'warn' | 'fail'

export interface DeviceProbe {
  /** process.env.ANDROID_HOME，空表示未设置。 */
  androidHome: string
  androidHomeExists: boolean
  adbAvailable: boolean
  /** `adb devices` 里 state=device 的序列号。 */
  onlineDevices: string[]
  hasDist: boolean
  hasAssets: boolean
  /** dist/index.html 与 android assets/public/index.html 内容是否一致。 */
  payloadMatches: boolean
  apk: { bytes: number; mtimeMs: number } | null
  payloadMtimeMs: number | null
}

export interface DeviceFinding {
  key: string
  level: DeviceLevel
  message: string
}

export interface DeviceReport {
  findings: DeviceFinding[]
  /** 没有 fail 项即为真机验收前置就绪（设备是否在场看 deviceReady）。 */
  ok: boolean
  deviceReady: boolean
}

/**
 * 从 `adb devices -l` 的文本里取出 state=device 的序列号。
 * 行形状是「序列号 <分隔符> state [字段...]」，但分隔符在 Windows 上是连续空格、在 POSIX 上是 TAB，
 * Windows 还带 CRLF：只认 TAB 会把插着线的真机读成「无在线设备」，整份真机验收清单随之作废。
 * 所以按空白切出前两列再比 state，而不是在整行里找 device 子串——序列号本身可能含 device。
 */
export function parseOnlineDevices(output: string): string[] {
  const online: string[] = []
  for (const raw of output.split(/\r?\n/)) {
    const [serial, state] = raw.trim().split(/\s+/)
    if (serial && state === 'device') online.push(serial)
  }
  return online
}

function toolchainFindings(probe: DeviceProbe): DeviceFinding[] {
  const findings: DeviceFinding[] = []
  if (!probe.androidHome || !probe.androidHomeExists) {
    findings.push({
      key: 'sdk',
      level: 'fail',
      message: probe.androidHome
        ? `ANDROID_HOME 指向的目录不存在：${probe.androidHome}`
        : 'ANDROID_HOME 未设置，Gradle 与 adb 都无从定位。',
    })
  } else {
    findings.push({ key: 'sdk', level: 'pass', message: `Android SDK：${probe.androidHome}` })
  }

  if (!probe.adbAvailable) {
    findings.push({
      key: 'adb',
      level: 'fail',
      message: 'adb 不可用：确认 Android SDK 的 platform-tools 已安装并在 PATH 里。',
    })
  } else {
    findings.push({ key: 'adb', level: 'pass', message: 'adb 可用' })
  }
  return findings
}

function deviceFinding(probe: DeviceProbe): DeviceFinding {
  if (probe.onlineDevices.length === 0) {
    return {
      key: 'device',
      level: 'warn',
      message: '没有在线设备：adb 能装、能同步，但真机验收清单跑不了，只能等手机插上。',
    }
  }
  return {
    key: 'device',
    level: 'pass',
    message: `${probe.onlineDevices.length} 台在线设备：${probe.onlineDevices.join('、')}`,
  }
}

function payloadFindings(probe: DeviceProbe): DeviceFinding[] {
  const findings: DeviceFinding[] = []
  if (!probe.hasDist) {
    findings.push({
      key: 'dist',
      level: 'fail',
      message: 'dist/index.html 不存在：先 npm run build，再 npm run android:sync。',
    })
  } else {
    findings.push({ key: 'dist', level: 'pass', message: 'dist/index.html 就绪' })
  }

  if (!probe.hasAssets) {
    findings.push({
      key: 'assets',
      level: 'fail',
      message: 'android/app/src/main/assets/public/index.html 不存在：跑 npm run android:sync 把 Web 负载灌进原生工程。',
    })
  } else if (!probe.hasDist) {
    findings.push({ key: 'assets', level: 'warn', message: '原生工程里有负载，但 dist 缺失，无法比对是否最新。' })
  } else if (!probe.payloadMatches) {
    findings.push({
      key: 'payload',
      level: 'fail',
      message: 'WebView 负载陈旧：dist 与 assets/public 的内容不一致，APK 打进去的是旧版本，先跑 npm run android:sync。',
    })
  } else {
    findings.push({ key: 'payload', level: 'pass', message: 'WebView 负载与 dist 一致' })
  }
  return findings
}

function apkFinding(probe: DeviceProbe): DeviceFinding {
  if (!probe.apk) {
    return {
      key: 'apk',
      level: 'warn',
      message: '还没有 debug APK：cd android && ./gradlew.bat assembleDebug。',
    }
  }
  const size = `${Math.round(probe.apk.bytes / 1024)} KB`
  if (probe.payloadMtimeMs !== null && probe.apk.mtimeMs < probe.payloadMtimeMs) {
    return {
      key: 'apk',
      level: 'warn',
      message: `APK（${size}）比当前 WebView 负载旧，打进包里的还是旧界面：重跑 ./gradlew.bat assembleDebug。`,
    }
  }
  return { key: 'apk', level: 'pass', message: `APK（${size}）不早于当前负载` }
}

export function assessDeviceReport(probe: DeviceProbe): DeviceReport {
  const findings = [
    ...toolchainFindings(probe),
    deviceFinding(probe),
    ...payloadFindings(probe),
    apkFinding(probe),
  ]
  return {
    findings,
    ok: findings.every((item) => item.level !== 'fail'),
    deviceReady: probe.onlineDevices.length > 0,
  }
}

const MARKS: Record<DeviceLevel, string> = { pass: '✔', warn: '⚠', fail: '✖' }

export function formatDeviceReport(report: DeviceReport): string {
  const lines = report.findings.map((item) => `  ${MARKS[item.level]} ${item.message}`)
  const failed = report.findings.filter((item) => item.level === 'fail').length
  const warned = report.findings.filter((item) => item.level === 'warn').length
  const verdict = failed > 0 ? '不通过' : warned > 0 ? '通过（有提醒）' : '通过'
  const device = report.deviceReady ? '真机验收可以开始' : '真机验收暂缓（无在线设备）'
  return [`android:doctor ${verdict}：${device}`, ...lines].join('\n')
}
