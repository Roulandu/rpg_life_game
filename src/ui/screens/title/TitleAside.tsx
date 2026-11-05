import { Upload } from 'lucide-react'
import { isNativePlatform } from '../../../platform'
import { Card } from '../../components/Card'
import { TitleSaveList } from './TitleSaveList'

export function TitleAside({ onImport }: { onImport: () => void }) {
  const storageZh = isNativePlatform() ? '存档保存在本机 App 存储' : '存档保存在本机浏览器'

  return (
    <>
      <TitleSaveList />

      <section className="mt-6 grid grid-cols-2 gap-2">
        <Card className="p-3">
          <p className="text-[11px] text-muted">导入存档</p>
          <button type="button" className="btn-secondary mt-2 w-full" onClick={onImport}>
            <Upload size={15} /> 选择 JSON
          </button>
        </Card>
        <Card className="p-3">
          <p className="text-[11px] text-muted">本地优先</p>
          <p className="mt-2 text-[11px] leading-relaxed text-dim">
            {storageZh}。无需账号，也不会上传到我们的服务器。
          </p>
        </Card>
      </section>
    </>
  )
}
