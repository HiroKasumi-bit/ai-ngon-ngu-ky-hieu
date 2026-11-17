import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { B, D, F, T, frameFeatures, sequenceVector } from '../src/features.js'
import { predict } from '../src/model.js'

// Dữ liệu đối chiếu do ai/train.py xuất ra: cùng một video, Python tính ra những con số này.
const fx = JSON.parse(readFileSync(new URL('../../ai/tests/fixtures/parity.json', import.meta.url)))
const model = JSON.parse(readFileSync(new URL('../public/model/vsl.json', import.meta.url)))
const close = (a, b, tol = 1e-4) => {
  assert.equal(a.length, b.length)
  for (let i = 0; i < a.length; i++) assert.ok(Math.abs(a[i] - b[i]) <= tol, `index ${i}: ${a[i]} vs ${b[i]}`)
}

test('frame_features_match_python', () => {
  // khung đầu tiên: từ điểm thô (pose, hands) ra 149 số, giống Python
  const s = {}
  fx.raw.forEach((r, i) => close(frameFeatures(r.pose, r.hands, fx.aspect, s), fx.frames[i]))
})

test('sequence_vector_matches_python', () => {
  close(sequenceVector(fx.frames.map(f => Float32Array.from(f))), fx.vector)
})

test('model_probs_match_python', () => {
  close(predict(model, Float32Array.from(fx.vector)).probs, fx.probs)
})

test('no_pose_no_nan', () => {
  const hand = Array.from({ length: 21 }, (_, i) => [0.3, 0.7 + i * 0.005, 0])
  const f = frameFeatures(null, [hand], 1, {})
  assert.equal(f.length, F)
  assert.ok(f.every(Number.isFinite))
})

test('sequence_length', () => {
  const frames = Array.from({ length: 37 }, () => Float32Array.from({ length: F }, Math.random))
  assert.equal(T, 8)
  assert.equal(B, 184)
  assert.equal(sequenceVector(frames).length, D)
  assert.equal(D, T * B + 3 * B)
})
