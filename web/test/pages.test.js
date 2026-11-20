// Web có hai trang: app (trang chủ) và trang giới thiệu. three.js chỉ được dùng ở trang giới thiệu,
// để app mở nhanh trên điện thoại.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import config from '../vite.config.js'

test('intro_page_is_built_next_to_the_app', () => {
  const input = Object.values(config.build?.rollupOptions?.input ?? {}).map(p => p.split('\\').join('/'))
  assert.ok(input.some(p => p.endsWith('/index.html') && !p.includes('gioi-thieu')), 'thiếu trang app')
  assert.ok(input.some(p => p.endsWith('gioi-thieu/index.html')), 'thiếu trang giới thiệu')
})

test('three_is_only_used_by_the_intro_page', () => {
  const files = []
  const walk = dir => readdirSync(dir).forEach(f => {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) { if (f !== 'intro') walk(p) } else if (p.endsWith('.js')) files.push(p)
  })
  walk(fileURLToPath(new URL('../src/', import.meta.url)))
  const offenders = files.filter(f => /from ['"]three/.test(readFileSync(f, 'utf8')))
  assert.deepEqual(offenders, [])
})
