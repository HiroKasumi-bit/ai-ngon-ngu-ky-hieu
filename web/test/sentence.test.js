import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toSentence, wordLabel } from '../src/sentence.js'

test('word_label_replaces_underscore', () => {
  assert.equal(wordLabel('xe_cứu_thương'), 'xe cứu thương')
})

test('sentence_capitalises_and_ends_with_period', () => {
  assert.equal(toSentence(['bác_sĩ', 'mệt']), 'Bác sĩ mệt.')
})

test('empty_sentence_is_empty', () => {
  assert.equal(toSentence([]), '')
})
