import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const PORT = 3001

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const GITHUB_ENDPOINT = 'https://models.github.ai/inference/chat/completions'
const GITHUB_MODEL    = 'microsoft/Phi-4-multimodal-instruct'

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`)

  // ── CORS preflight ─────────────────────────────────────────────────────
  if (req.method === 'OPTIONS' && url.pathname === '/api/chat') {
    res.writeHead(204, CORS)
    res.end()
    return
  }

  // ── GitHub Models proxy ────────────────────────────────────────────────
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    let body = ''
    for await (const chunk of req) body += chunk

    try {
      const { messages, temperature, token } = JSON.parse(body)

      if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json', ...CORS })
        res.end(JSON.stringify({ error: 'GitHub token not provided.' }))
        return
      }

      const upstream = await fetch(GITHUB_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: GITHUB_MODEL,
          messages,
          temperature: temperature ?? 0.8,
          top_p: 1.0,
          max_tokens: 2048,
        }),
      })

      const data = await upstream.json()
      res.writeHead(upstream.status, { 'Content-Type': 'application/json', ...CORS })
      res.end(JSON.stringify(data))
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', ...CORS })
      res.end(JSON.stringify({ error: err.message }))
    }
    return
  }

  // ── Static files ───────────────────────────────────────────────────────
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname
  const filePath = join(__dirname, pathname)

  try {
    const data = await readFile(filePath)
    const mime = MIME[extname(filePath)] ?? 'application/octet-stream'
    res.writeHead(200, { 'Content-Type': mime })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('404 Not Found')
  }
}).listen(PORT, () => {
  console.log(`Smart Notes — http://localhost:${PORT}`)
})
