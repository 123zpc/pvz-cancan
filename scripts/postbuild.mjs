import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outDir = join(__dirname, '..', 'out')
const swPath = join(outDir, 'sw.js')
const versionPath = join(outDir, 'version.json')

const now = Date.now().toString()

try {
  let content = readFileSync(swPath, 'utf-8')
  content = content.replace('__BUILD_TIME__', now)
  writeFileSync(swPath, content)
  console.log('[postbuild] sw.js version injected:', now)
} catch {
  console.log('[postbuild] sw.js not found, skipping')
}

// 写入 version.json 供页面兜底版本检查
try {
  writeFileSync(versionPath, JSON.stringify({ version: now }))
  console.log('[postbuild] version.json written:', now)
} catch {
  console.log('[postbuild] version.json write failed, skipping')
}