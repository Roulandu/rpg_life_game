import { describe, expect, it } from 'vitest'
import { parseOnlineDevices } from '../../scripts/quality/lib/device'

/**
 * 职责：钉住 `adb devices -l` 文本到在线设备序列号的解析口径，让 android:doctor 在不同平台都不误报。
 * 边界：只喂字符串，不跑 adb；分隔符、换行符与设备状态是全部输入维度。
 * 依赖：scripts/quality/lib/device.ts 的 parseOnlineDevices。
 */
describe('adb devices -l 的设备解析', () => {
  it('回归: Windows 下 adb devices 用空格分隔时误报无在线设备', () => {
    const windowsOutput = 'List of devices attached\r\n'
      + 'AAHBVB5411000443       device product:DNN-AN00 model:DNN_AN00 device:HNDNN transport_id:25\r\n'
      + '\r\n'
    expect(parseOnlineDevices(windowsOutput)).toEqual(['AAHBVB5411000443'])
  })

  it('macOS 与 Linux 的 TAB 分隔输出仍然认得出设备', () => {
    const posixOutput = 'List of devices attached\n'
      + 'R58M70ABCDE\tdevice product:sdk_gphone model:Pixel_7 transport_id:3\n'
      + '\n'
    expect(parseOnlineDevices(posixOutput)).toEqual(['R58M70ABCDE'])
  })

  it('unauthorized 与 offline 不算在线设备，多设备只取 state=device 的行', () => {
    const mixed = 'List of devices attached\n'
      + 'SERIAL_OK\tdevice transport_id:1\n'
      + 'SERIAL_UNAUTH\tunauthorized transport_id:2\n'
      + 'SERIAL_OFFLINE   offline\n'
      + 'SERIAL_DEVICE2   device  product:foo\n'
    expect(parseOnlineDevices(mixed)).toEqual(['SERIAL_OK', 'SERIAL_DEVICE2'])
  })

  it('头行、空行与只有设备的行都不产出序列号', () => {
    expect(parseOnlineDevices('List of devices attached\n\n')).toEqual([])
    expect(parseOnlineDevices('')).toEqual([])
  })

  it('序列号里没有 device 状态时不被 substring 误命中', () => {
    const fake = 'List of devices attached\n'
      + 'mydevice-serial   unauthorized\n'
      + 'another   device\n'
    expect(parseOnlineDevices(fake)).toEqual(['another'])
  })
})
