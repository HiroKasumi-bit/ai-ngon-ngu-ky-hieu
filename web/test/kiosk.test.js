// Chế độ trưng bày: khi nào chuyển từ vòng giới thiệu sang màn "mời thử", và khi nào quay lại.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createAttention } from '../src/intro/attention.js'

// Mô phỏng camera: mỗi khung 1/30 giây, có tay hoặc không.
function run(att, ms, hands, from = 0) {
  let state
  for (let t = from; t <= from + ms; t += 1000 / 30) state = att.update(hands, t)
  return state
}

test('stays_idle_for_a_brief_hand', () => {
  const att = createAttention()
  assert.equal(run(att, 300, true), 'idle') // người đi ngang, tay lướt qua
})

test('wakes_after_half_a_second_of_hands', () => {
  const att = createAttention()
  assert.equal(run(att, 600, true), 'active')
})

test('goes_back_to_idle_after_20s_without_hands', () => {
  const att = createAttention()
  run(att, 600, true)
  assert.equal(run(att, 19000, false, 700), 'active')
  assert.equal(run(att, 1500, false, 19800), 'idle')
})

test('a_hand_resets_the_idle_timer', () => {
  const att = createAttention()
  run(att, 600, true)
  run(att, 15000, false, 700)
  run(att, 100, true, 15800)              // khách giơ tay lại
  assert.equal(run(att, 15000, false, 16000), 'active')
})

test('a_hand_gap_while_waking_restarts_the_count', () => {
  const att = createAttention()
  run(att, 400, true)
  run(att, 200, false, 450)               // tay vừa rời khung
  assert.equal(run(att, 300, true, 700), 'idle')
})
