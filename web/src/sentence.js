// Ghép các từ nhận được thành câu (giai đoạn 1: nối đơn giản; giai đoạn sau thay bằng AI ghép câu).
export const wordLabel = w => w.replaceAll('_', ' ')

// Bỏ dấu và viết thường, để tìm "benh vien" vẫn ra "bệnh viện".
export const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

// names: tên các từ đã theo ngôn ngữ giao diện (ui = 'vi' | 'en').
export function toSentence(names, ui = 'vi') {
  if (!names.length) return ''
  const s = names.join(' ')
  return s[0].toLocaleUpperCase(ui) + s.slice(1) + '.'
}
