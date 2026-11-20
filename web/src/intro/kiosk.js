// Chế độ trưng bày (laptop ở gian hàng): toàn màn hình, camera luôn bật.
// - Không ai: phim logo chạy, góc dưới có khung camera nhỏ soi gương mời khách giơ tay.
// - Có người giơ tay khoảng nửa giây: khung camera phóng to, từ AI nhận được hiện chữ khổng lồ và đọc to.
// - 20 giây không thấy tay: quay về màn chờ, chạy lại đoạn mở màn.
// Tải "mắt" (MediaPipe) và "bộ não" (model) giống hệt app, chỉ khi bật chế độ này.
import { gsap } from 'gsap'
import { Flip } from 'gsap/Flip'
import { createAttention } from './attention.js'

gsap.registerPlugin(Flip)
const $ = id => document.getElementById(id)

export async function startKiosk({ replayHero }) {
  const [{ createTracker }, { loadModel }, { createRecognizer }, { settings }, { SIGNS, wordName }, { speak }] = await Promise.all([
    import('../tracker.js'), import('../model.js'), import('../recognizer.js'),
    import('../settings.js'), import('../signs.js'), import('../speech.js'),
  ])
  const root = $('kiosk'), cam = $('kCam'), dots = $('kDots'), ctx = dots.getContext('2d')
  const status = $('kStatus'), word = $('kWord'), line = $('kLine'), tip = $('kTip')
  const sign = settings.sign, ui = 'vi'
  document.documentElement.classList.add('kiosk-on')
  root.hidden = false // (toàn màn hình đã được bật ngay lúc bấm nút, vì trình duyệt chỉ cho bật khi có cú bấm)
  tip.textContent = `Thử: ${SIGNS[sign].examples.map(w => wordName(sign, w, ui)).join(', ')}`

  // ---------- camera + AI ----------
  status.textContent = 'Đang chuẩn bị camera…'
  let tracker, model
  try {
    const stream = navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
    ;[cam.srcObject, tracker, model] = await Promise.all([stream, createTracker(), loadModel(`${import.meta.env.BASE_URL}model/${sign}.json`)])
    await cam.play()
  } catch (err) {
    console.error('[SignBridge AI] trưng bày:', err)
    status.textContent = err?.name === 'NotAllowedError'
      ? 'Chưa có quyền dùng camera: bấm biểu tượng camera trên thanh địa chỉ để cho phép.'
      : 'Không mở được camera. Kiểm tra lại camera của máy.'
    return
  }
  status.textContent = 'Giơ tay trước camera để thử'
  const attention = createAttention()
  let rec = createRecognizer(model), state = 'idle', said = []

  function setState(next) {
    if (next === state) return
    state = next
    const flip = Flip.getState('#kCamBox') // khung camera nhỏ phóng to thành nửa màn hình (và ngược lại)
    root.classList.toggle('is-active', state === 'active')
    Flip.from(flip, { duration: 0.9, ease: 'expo.inOut' })
    if (state === 'idle') { said = []; renderLine(); word.textContent = '…'; rec = createRecognizer(model); replayHero() }
  }
  function renderLine() {
    line.innerHTML = said.map(w => `<span class="word">${w}</span>`).join('')
  }
  function showWord(label) {
    const text = wordName(sign, label, ui)
    said = [...said, text].slice(-6)
    renderLine()
    word.textContent = text
    gsap.fromTo(word, { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out' })
    gsap.fromTo('.k-word-wrap .bar', { scaleX: 0 }, { scaleX: 1, duration: 0.8, ease: 'expo.inOut', delay: 0.1 })
    gsap.from(line.lastElementChild, { scale: 0.6, opacity: 0, duration: 0.4, ease: 'back.out(2)' })
    speak(text, ui)
  }

  const tick = () => {
    if (cam.readyState >= 2) {
      const now = performance.now()
      const { frame, hands, landmarks } = tracker.detect(cam, now)
      setState(attention.update(hands > 0, now))
      const hit = rec.push(frame, now)
      if (hit && state === 'active') showWord(hit.word)
      draw(landmarks.hands)
    }
    cam.requestVideoFrameCallback ? cam.requestVideoFrameCallback(tick) : requestAnimationFrame(tick)
  }
  tick()

  // chấm nhỏ trên các khớp tay, màu thương hiệu (không vẽ khung xương)
  function draw(hands) {
    if (dots.width !== cam.videoWidth) { dots.width = cam.videoWidth; dots.height = cam.videoHeight }
    ctx.clearRect(0, 0, dots.width, dots.height)
    hands.forEach((h, i) => {
      ctx.fillStyle = i ? '#FFC431' : '#1FB3A6'
      for (const p of h) { ctx.beginPath(); ctx.arc(p.x * dots.width, p.y * dots.height, 4, 0, 7); ctx.fill() }
    })
  }

  // thoát: phím Esc (thoát toàn màn hình) hoặc nút "Thoát"
  const exit = () => location.assign(location.pathname)
  $('kExit').onclick = exit
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) exit() })
}
