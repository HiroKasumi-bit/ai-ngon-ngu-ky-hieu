// Ghép các từ nhận được thành câu (giai đoạn 1: nối đơn giản; giai đoạn sau thay bằng AI ghép câu).
export const wordLabel = w => w.replaceAll('_', ' ')

export function toSentence(words) {
  if (!words.length) return ''
  const s = words.map(wordLabel).join(' ')
  return s[0].toLocaleUpperCase('vi') + s.slice(1) + '.'
}
