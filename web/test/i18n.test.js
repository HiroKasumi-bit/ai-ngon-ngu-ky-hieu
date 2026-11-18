import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { STR, t } from '../src/i18n.js'
import { SIGNS, wordName } from '../src/signs.js'
import { cleanSettings } from '../src/settings.js'

test('vietnamese_and_english_have_the_same_texts', () => {
  // Thiếu một câu ở bản tiếng Anh thì giao diện sẽ lẫn tiếng Việt.
  assert.deepEqual(Object.keys(STR.en).sort(), Object.keys(STR.vi).sort())
})

test('t_fills_in_variables', () => {
  assert.equal(t('vi', 'vocab.found', { n: 3 }), 'Tìm thấy 3 từ')
  assert.equal(t('en', 'vocab.found', { n: 3 }), 'Found 3 signs')
})

test('unknown_language_falls_back_to_vietnamese', () => {
  assert.equal(t('fr', 'tab.chat'), t('vi', 'tab.chat'))
})

test('every_word_has_a_name_in_both_languages', () => {
  for (const [sign, { words, names }] of Object.entries(SIGNS)) {
    assert.ok(words.length > 0, sign)
    for (const w of words) for (const ui of ['vi', 'en']) assert.ok(wordName(sign, w, ui).trim(), `${sign} ${w} ${ui}`)
    const other = sign === 'vsl' ? 'en' : 'vi' // tên ở thứ tiếng không phải tiếng gốc phải do người dịch
    for (const w of words) assert.ok(names[w]?.[other], `${sign}: thiếu tên ${other} cho "${w}"`)
  }
})

test('word_name_follows_interface_language', () => {
  assert.equal(wordName('vsl', 'khẩu_trang', 'vi'), 'khẩu trang')
  assert.equal(wordName('vsl', 'khẩu_trang', 'en'), 'face mask')
})

test('settings_ignore_unknown_values', () => {
  // Dữ liệu cũ hoặc hỏng trong máy không được làm hỏng app.
  assert.deepEqual(cleanSettings({ ui: 'fr', sign: 'xyz' }), { ui: 'vi', sign: 'vsl' })
  assert.deepEqual(cleanSettings({ ui: 'en', sign: 'vsl' }), { ui: 'en', sign: 'vsl' })
  assert.deepEqual(cleanSettings(null), { ui: 'vi', sign: 'vsl' })
})

test('asl_can_be_chosen_and_shows_vietnamese_names', () => {
  assert.equal(cleanSettings({ sign: 'asl' }).sign, 'asl')
  assert.equal(wordName('asl', 'thankyou', 'vi'), 'cảm ơn')
  assert.equal(wordName('asl', 'thankyou', 'en'), 'thank you')
})

test('example_words_are_words_the_ai_knows', () => {
  // Sau mỗi lần dạy lại, danh sách từ có thể đổi: từ ví dụ phải còn trong danh sách.
  for (const [sign, { words, examples }] of Object.entries(SIGNS))
    for (const w of examples) assert.ok(words.includes(w), `${sign}: "${w}" không còn trong danh sách từ`)
})

test('index_html_has_no_vietnamese_text_without_translation', () => {
  // Chữ viết sẵn trong index.html phải có data-t, nếu không giao diện tiếng Anh vẫn hiện tiếng Việt.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
    .replace(/<(\w+)[^>]*data-t-html[^>]*>[\s\S]*?<\/\1>/g, '') // khối data-t-html được thay cả cụm
  const viet = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
  const missed = [...html.matchAll(/<([a-z0-9]+)([^>]*)>([^<]+)</gi)]
    .filter(([, , attrs, text]) => viet.test(text) && !/data-t=|translate="no"/.test(attrs))
    .map(m => m[3].trim())
  assert.deepEqual(missed, [])
})

test('app_is_called_signbridge_ai_everywhere', () => {
  // Tên cũ "Lời Tay" không được sót ở chữ giao diện hay trong index.html.
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
  for (const [where, text] of [['i18n', JSON.stringify(STR)], ['index.html', html]]) {
    assert.ok(!text.includes('Lời Tay'), `${where} còn tên cũ`)
    assert.ok(text.includes('SignBridge'), `${where} chưa có tên mới`)
  }
})
