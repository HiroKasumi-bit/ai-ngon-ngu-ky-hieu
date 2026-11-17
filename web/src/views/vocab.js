// Trang từ vựng: mọi ký hiệu app hiểu được, xếp theo chữ cái đầu, có ô tìm kiếm.
// Danh sách từ (words.json) do ai/train.py xuất ra cùng lúc với model.
import WORDS from '../words.json'
import { plain, wordLabel } from '../sentence.js'

const items = WORDS.map(w => ({ label: wordLabel(w), key: plain(wordLabel(w)) }))
  .sort((a, b) => a.label.localeCompare(b.label, 'vi'))
const letter = label => (label[0] === 'đ' ? 'Đ' : plain(label[0]).toUpperCase())

export function initVocab() {
  const groups = document.getElementById('groups')
  const count = document.getElementById('vcount')
  const input = document.getElementById('vsearch')
  document.querySelectorAll('[data-nwords]').forEach(el => { el.textContent = items.length })

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
    count.textContent = !q ? '' : shown ? `Tìm thấy ${shown} từ` : `Chưa có từ “${input.value.trim()}”. Lời Tay đang học thêm.`
  }
  input.addEventListener('input', render)
  render()
}
