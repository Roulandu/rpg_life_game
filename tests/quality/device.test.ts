import { describe, expect, it } from 'vitest'
import { assessDeviceReport, formatDeviceReport, type DeviceProbe } from '../../scripts/quality/lib/device'

/**
 * 职责：把「真机验收前必须成立的事实」写成纯函数判定，让 npm run android:doctor 能被自动化守住。
 * 边界：这里只喂探针数据，不碰 adb 与文件系统；设备不在场只报警不判失败，负载陈旧必须判失败。
 * 依赖：scripts/quality/lib/device.ts 的 assessDeviceReport / formatDeviceReport 与 DeviceProbe 类型。
 */
function probe(overrides: Partial<DeviceProbe> = {}): DeviceProbe {
  return {
    androidHome: 'D:/Android/Sdk',
    androidHomeExists: true,
    adbAvailable: true,
    onlineDevices: ['R58M70ABCDE'],
    hasDist: true,
    hasAssets: true,
    payloadMatches: true,
    apk: { bytes: 4_671_614, mtimeMs: 2_000 },
    payloadMtimeMs: 1_000,
    ...overrides,
  }
}

describe('android:doctor 的就绪判定', () => {
  it('SDK、adb、在线设备与同步负载齐备时报全绿', () => {
    const report = assessDeviceReport(probe())
    expect(report.ok).toBe(true)
    expect(report.deviceReady).toBe(true)
    expect(report.findings.every((item) => item.level === 'pass')).toBe(true)
  })

  it('没有在线设备只报警不判失败，并说明真机清单跑不了', () => {
    const report = assessDeviceReport(probe({ onlineDevices: [] }))
    expect(report.ok).toBe(true)
    expect(report.deviceReady).toBe(false)
    const device = report.findings.find((item) => item.key === 'device')
    expect(device?.level).toBe('warn')
    expect(device?.message).toContain('真机')
  })

  it('dist 与 assets/public 内容不一致时判失败并指名 android:sync', () => {
    const report = assessDeviceReport(probe({ payloadMatches: false }))
    expect(report.ok).toBe(false)
    expect(report.findings.find((item) => item.key === 'payload')?.level).toBe('fail')
    expect(formatDeviceReport(report)).toContain('android:sync')
  })

  it('缺 dist 或缺 assets/public 都判失败并给出对应命令', () => {
    const noDist = assessDeviceReport(probe({ hasDist: false }))
    const noAssets = assessDeviceReport(probe({ hasAssets: false }))
    expect(noDist.ok).toBe(false)
    expect(noAssets.ok).toBe(false)
    expect(formatDeviceReport(noDist)).toContain('npm run build')
    expect(formatDeviceReport(noAssets)).toContain('npm run android:sync')
  })
})

describe('android:doctor 的工具链与产物判定', () => {
  it('ANDROID_HOME 缺失或 adb 不可用都判失败', () => {
    const noSdk = assessDeviceReport(probe({ androidHome: '', androidHomeExists: false }))
    const noAdb = assessDeviceReport(probe({ adbAvailable: false }))
    expect(noSdk.ok).toBe(false)
    expect(formatDeviceReport(noSdk)).toContain('ANDROID_HOME')
    expect(noAdb.ok).toBe(false)
    expect(formatDeviceReport(noAdb)).toContain('adb')
  })

  it('APK 比 WebView 负载旧时提醒重新打包，负载更新后不再报警', () => {
    const stale = assessDeviceReport(probe({ apk: { bytes: 100, mtimeMs: 1_000 }, payloadMtimeMs: 2_000 }))
    expect(stale.findings.find((item) => item.key === 'apk')?.level).toBe('warn')
    const fresh = assessDeviceReport(probe({ apk: { bytes: 100, mtimeMs: 3_000 }, payloadMtimeMs: 2_000 }))
    expect(fresh.findings.find((item) => item.key === 'apk')?.level).toBe('pass')
  })

  it('还没有 APK 时报警并给出 assembleDebug 命令', () => {
    const report = assessDeviceReport(probe({ apk: null }))
    expect(report.ok).toBe(true)
    expect(report.findings.find((item) => item.key === 'apk')?.level).toBe('warn')
    expect(formatDeviceReport(report)).toContain('assembleDebug')
  })
})
