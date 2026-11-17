import { test } from 'node:test'
import assert from 'node:assert/strict'
import { plain, toSentence, wordLabel } from '../src/sentence.js'

test('plain_drops_tone_marks_for_search', () => {
  // Gõ "bac si" hay "BÁC SĨ" đều tìm ra "bác sĩ"; đ cũng thành d.
  assert.equal(plain('Bác sĩ'), 'bac si')
  assert.equal(plain('giúp đỡ'), 'giup do')
  assert.equal(plain('Đường'), 'duong')
})

test('word_label_replaces_underscore', () => {
  assert.equal(wordLabel('xe_cứu_thương'), 'xe cứu thương')
})

test('sentence_capitalises_and_ends_with_period', () => {
  assert.equal(toSentence(['bác_sĩ', 'mệt']), 'Bác sĩ mệt.')
})

test('empty_sentence_is_empty', () => {
  assert.equal(toSentence([]), '')
})
