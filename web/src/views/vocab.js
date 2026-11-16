// Trang từ vựng: 20 ký hiệu app hiểu được, chia theo nhóm.
import { wordLabel } from '../sentence.js'

const GROUPS = [
  ['Giao tiếp', ['giúp_đỡ', 'hiểu', 'không_hiểu', 'đúng', 'sai', 'mời']],
  ['Người và nơi chốn', ['bác_sĩ', 'y_tá', 'bệnh_nhân', 'bệnh_viện', 'trạm_y_tế', 'xe_cứu_thương', 'cấp_cứu']],
  ['Khám chữa', ['tiêm', 'chữa_bệnh', 'khẩu_trang']],
  ['Triệu chứng', ['mệt', 'ho', 'cảm_cúm', 'sợ_hãi']],
]

export function initVocab() {
  document.getElementById('groups').innerHTML = GROUPS.map(([name, words]) =>
    `<section class="group"><h2>${name}</h2><div>${words.map(w => `<span class="word">${wordLabel(w)}</span>`).join('')}</div></section>`,
  ).join('')
}
