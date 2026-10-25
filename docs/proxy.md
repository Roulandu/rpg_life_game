# 自建 LLM 代理

游戏是纯本地应用，不提供后端。浏览器直连 OpenAI / Anthropic 时，如果供应商不允许跨域（CORS），或你想把请求转发到自己的地址，可以部署一个**自己的**代理，并在设置页把 Base URL 指向它。

代理只负责转发请求和 CORS 响应头，不保存 Key，也不记录请求内容。密钥仍然只从本机发出，保存在本机。

## Cloudflare Worker 示例

固定上游地址，避免变成任何人都能使用的开放代理。把 `ALLOWED_ORIGIN` 改成你实际运行游戏的来源（本地开发是 `http://localhost:5173`，Capacitor 是 `https://localhost`）：

```js
const UPSTREAM = 'https://api.openai.com'
const ALLOWED_ORIGIN = 'https://localhost'

export default {
  async fetch(request) {
    const origin = request.headers.get('Origin')
    if (origin !== ALLOWED_ORIGIN) {
      return new Response('Forbidden', { status: 403 })
    }

    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Headers': 'authorization,content-type,anthropic-version,anthropic-dangerous-direct-browser-access',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Max-Age': '86400',
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    const incoming = new URL(request.url)
    const target = UPSTREAM + incoming.pathname + incoming.search
    const response = await fetch(target, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(cors)) headers.set(key, value)
    return new Response(response.body, { status: response.status, headers })
  },
}
```

部署后在设置页填写：

- OpenAI 兼容：`https://<worker>.workers.dev/v1`
- Anthropic：`https://<worker>.workers.dev`

Anthropic 协议需要把 `UPSTREAM` 换成 `https://api.anthropic.com`，并在 Worker 里保留 `anthropic-version` 请求头。

## 本地 Node 代理

仅用于开发和本机游玩。Node 20+：

```js
import { createServer } from 'node:http'

const UPSTREAM = process.env.UPSTREAM ?? 'https://api.openai.com'

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*')
  res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type,anthropic-version,anthropic-dangerous-direct-browser-access')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  if (req.method === 'OPTIONS') return res.writeHead(204).end()

  const upstream = await fetch(UPSTREAM + req.url, {
    method: req.method,
    headers: { ...req.headers, host: new URL(UPSTREAM).host },
    body: req,
    duplex: 'half',
  })
  res.writeHead(upstream.status, Object.fromEntries(upstream.headers))
  if (upstream.body) for await (const chunk of upstream.body) res.write(chunk)
  res.end()
}).listen(8787)
```

## 注意

- 代理不是本项目的服务，部署、费用和可用性由使用者负责。
- 不要把代理做成不需要鉴权的开放转发器，否则可能被他人用来消耗你的额度。
- `native` 网络模式使用 Android 原生 HTTP，不经过这里，也不支持流式。代理主要给浏览器和自定义端点使用。
