// Trang từ vựng: mọi ký hiệu app hiểu (theo ngôn ngữ ký hiệu đang chọn), xếp theo chữ cái đầu, có ô tìm kiếm.
// Tên từ hiện theo ngôn ngữ giao diện; tìm kiếm không cần gõ dấu.
import { t } from '../i18n.js'
import { plain } from '../sentence.js'
import { onSettings, settings } from '../settings.js'
import { SIGNS, wordName } from '../signs.js'

const letter = label => (label[0] === 'đ' || label[0] === 'Đ' ? 'Đ' : plain(label[0]).toUpperCase())

export function initVocab() {
  const groups = document.getElementById('groups')
  const count = document.getElementById('vcount')
  const input = document.getElementById('vsearch')
  let items = []

  function load({ sign, ui }) {
    items = SIGNS[sign].words.map(w => wordName(sign, w, ui)).map(label => ({ label, key: plain(label) }))
      .sort((a, b) => a.label.localeCompare(b.label, ui))
    render()
  }

  function render() {
    const q = plain(input.value.trim())
    const byLetter = new Map()
    for (const it of items) {
      if (!it.key.includes(q)) continue
      const k = letter(it.label)
      byLetter.set(k, [...(byLetter.get(k) ?? []), it.label])
    }
    const shown = [...byLetter.values()].reduce((n, ws) => n + ws.length, 0)
    groups.innerHTML = [...byLetter].map(([k, ws]) =>
      `<section class="group"><h2>${k}</h2><div>${ws.map(w => `<span class="word">${w}</span>`).join('')}</div></section>`,
    ).join('')
    count.textContent = !q ? '' : t(settings.ui, shown ? 'vocab.found' : 'vocab.none', { n: shown, q: input.value.trim() })
  }
  input.addEventListener('input', render)
  onSettings(load)
  load(settings)
}
