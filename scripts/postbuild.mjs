import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const swPath = join(__dirname, '..', 'out', 'sw.js')

try {
  let content = readFileSync(swPath, 'utf-8')
  content = content.replace('__BUILD_TIME__', Date.now().toString())
  writeFileSync(swPath, content)
  console.log('[postbuild] sw.js version injected:', Date.now())
} catch {
  console.log('[postbuild] sw.js not found, skipping')
}