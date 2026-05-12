import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8')

assert.match(source, /['"]\/api\/agent-console['"]\s*:/)
assert.match(source, /\/api\/agent-console[\s\S]*?target:\s*['"]http:\/\/127\.0\.0\.1:18888['"]/)

console.log('api proxy config ok')
