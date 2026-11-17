// Ghép các từ nhận được thành câu (giai đoạn 1: nối đơn giản; giai đoạn sau thay bằng AI ghép câu).
export const wordLabel = w => w.replaceAll('_', ' ')

// Bỏ dấu và viết thường, để tìm "benh vien" vẫn ra "bệnh viện".
export const plain = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase()

export function toSentence(words) {
  if (!words.length) return ''
  const s = words.map(wordLabel).join(' ')
  return s[0].toLocaleUpperCase('vi') + s.slice(1) + '.'
}
