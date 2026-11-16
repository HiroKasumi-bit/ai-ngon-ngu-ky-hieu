// Giọng nói: đọc to câu của người Điếc, và nghe người đối diện nói rồi đổi thành chữ.
// Dùng tính năng có sẵn của trình duyệt (miễn phí). Nghe giọng nói chạy tốt nhất trên Chrome/Edge.

export function speak(text) {
  if (!('speechSynthesis' in window) || !text) return false
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'vi-VN'
  u.rate = 0.95
  const vi = speechSynthesis.getVoices().find(v => v.lang?.toLowerCase().startsWith('vi'))
  if (vi) u.voice = vi
  speechSynthesis.cancel()
  speechSynthesis.speak(u)
  return true
}

// onFinal(text): câu đã nói xong; onInterim(text): chữ đang nghe dở; onState(listening, error)
export function createListener({ onFinal, onInterim, onState }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return { supported: false, start() {}, stop() {} }
  const r = new SR()
  r.lang = 'vi-VN'
  r.interimResults = true
  r.continuous = false
  r.onresult = e => {
    let interim = ''
    let final = ''
    for (const res of e.results) res.isFinal ? (final += res[0].transcript) : (interim += res[0].transcript)
    final ? onFinal(final.trim()) : onInterim(interim)
  }
  r.onstart = () => onState(true)
  r.onend = () => onState(false)
  r.onerror = e => onState(false, e.error)
  return { supported: true, start: () => r.start(), stop: () => r.stop() }
}
