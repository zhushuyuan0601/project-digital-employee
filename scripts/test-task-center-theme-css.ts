import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const taskCenter = readFileSync(new URL('../src/views/TaskCenter2.vue', import.meta.url), 'utf8')
const controlBar = readFileSync(new URL('../src/components/task-center/TaskControlBar.vue', import.meta.url), 'utf8')

assert.match(taskCenter, /class="stage-tabs"/)
assert.match(taskCenter, /class="surface next-action"/)
assert.doesNotMatch(taskCenter, /\.mission-hero\s*\{[^}]*order:\s*1/s)
assert.doesNotMatch(taskCenter, /\.stage-tabs\s*\{[^}]*order:\s*2/s)
assert.match(taskCenter, /\.plan-refreshing-card/)
assert.match(taskCenter, /\.plan-review-card\s*\{[^}]*overflow-wrap:\s*anywhere/s)
assert.match(taskCenter, /\.workflow-plan-node\s*\{[^}]*overflow-wrap:\s*anywhere/s)
assert.match(taskCenter, /\.workflow-node-deps p\s*\{[^}]*overflow-wrap:\s*anywhere/s)

assert.doesNotMatch(controlBar, /rgba\(18,\s*23,\s*33,\s*0\.[0-9]+\)/)
assert.doesNotMatch(controlBar, /border:\s*1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)/)
assert.match(controlBar, /background:[\s\S]*var\(--bg-panel\)/)
assert.match(controlBar, /border-bottom:\s*1px solid var\(--border-default\)/)

console.log('task center theme css ok')
