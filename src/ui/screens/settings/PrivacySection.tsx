import { ShieldCheck } from 'lucide-react'
import { Card, SectionTitle } from '../../components/Card'

export function PrivacySection() {
  return (
    <section className="mb-3">
      <SectionTitle right={<ShieldCheck size={14} className="text-teal" />}>隐私</SectionTitle>
      <Card className="space-y-2 text-[11px] leading-relaxed text-muted">
        <p>游戏不需要账号，也不依赖我们的服务器。存档保存在本机浏览器的 IndexedDB 中。</p>
        <p>
          密钥只保存在本机：Web 端默认会话级保存，勾选后使用 Web Crypto 加密；Android
          端使用系统安全存储。密钥不会写入存档、日志或导出文件。
        </p>
        <p>
          开启 AI 后，本周的比赛与事件摘要会直接从设备发往你选择的模型供应商。建议使用单独的限额
          Key，并避免在自由对话里输入真实个人信息。
        </p>
        <p className="text-dim">
          浏览器端无法完全防御 XSS。游戏不加载第三方脚本与统计，但仍请保持浏览器与系统更新。
        </p>
      </Card>
    </section>
  )
}
