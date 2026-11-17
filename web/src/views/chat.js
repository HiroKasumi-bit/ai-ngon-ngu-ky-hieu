// Trang trò chuyện hai chiều.
// Người Điếc: ký hiệu trước camera -> từ hiện ra -> ghép câu -> "Gửi và đọc to".
// Người nghe: bấm micro, nói -> chữ hiện ra trong khung trò chuyện.
import { gsap } from 'gsap'
import { createRecognizer } from '../recognizer.js'
import { toSentence, wordLabel } from '../sentence.js'
import { createListener, speak } from '../speech.js'

const $ = id => document.getElementById(id)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches

export function initChat(getEngine) {
  const cam = $('cam'), video = $('video'), overlay = $('overlay'), ctx = overlay.getContext('2d')
  let words = []

  // ---------- câu nháp ----------
  function renderDraft(popLast = false) {
    const box = $('draft')
    box.innerHTML = words.length ? '' : '<span class="placeholder">Từ nhận được sẽ hiện ở đây</span>'
    words.forEach(w => box.insertAdjacentHTML('beforeend', `<span class="word">${wordLabel(w)}</span>`))
    $('send').disabled = !words.length
    if (popLast && !calm) gsap.from(box.lastElementChild, { scale: 0.6, opacity: 0, duration: 0.35, ease: 'back.out(2.2)' })
  }
  $('undo').onclick = () => { words.pop(); renderDraft() }
  $('clear').onclick = () => { words = []; renderDraft() }
  $('send').onclick = () => {
    const text = toSentence(words)
    addMessage('me', 'Bạn · ký hiệu', text)
    speak(text)
    words = []
    renderDraft()
  }

  // ---------- khung trò chuyện ----------
  function addMessage(side, who, text) {
    const thread = $('thread')
    thread.querySelector('.empty')?.remove()
    const li = document.createElement('li')
    li.className = `msg ${side}`
    li.innerHTML = `<small>${who}</small>`
    li.append(text)
    thread.append(li)
    thread.scrollTop = thread.scrollHeight
    if (!calm) gsap.from(li, { y: 10, opacity: 0, duration: 0.3, ease: 'power2.out' })
  }

  // Chỉ khi chạy thử trên máy: cho phép bơm từ/tin nhắn để kiểm tra giao diện
  if (import.meta.env.DEV) {
    window.__loiTayChat = { addWord: w => { words.push(w); renderDraft(true) }, addMessage, send: () => $('send').click() }
    if (new URLSearchParams(location.search).has('showcase')) { // ảnh chụp minh hoạ: điền sẵn một đoạn hội thoại mẫu
      addMessage('me', 'Bạn · ký hiệu', 'Trạm y tế.')
      addMessage('them', 'Người đối diện · giọng nói', 'Bạn cần đến trạm y tế à? Đi thẳng đường này nhé.')
      words = ['khó_chịu', 'sợ_hãi']; renderDraft()
    }
  }

  // ---------- micro cho người nghe ----------
  const interim = $('interim'), mic = $('mic')
  const idle = 'Người đối diện bấm micro rồi nói'
  const listener = createListener({
    onInterim: t => { interim.textContent = t || 'Đang nghe…'; interim.classList.add('on') },
    onFinal: t => { interim.textContent = idle; interim.classList.remove('on'); addMessage('them', 'Người đối diện · giọng nói', t) },
    onState: (on, err) => {
      mic.classList.toggle('on', on)
      if (on) { interim.textContent = 'Đang nghe…'; interim.classList.add('on') }
      else if (err === 'not-allowed') interim.textContent = 'Chưa được phép dùng micro. Bấm biểu tượng ổ khoá trên thanh địa chỉ để cho phép.'
      else if (err) interim.textContent = 'Chưa nghe rõ, bấm micro để thử lại.'
      else if (interim.textContent === 'Đang nghe…') { interim.textContent = idle; interim.classList.remove('on') }
    },
  })
  if (listener.supported) mic.onclick = () => (mic.classList.contains('on') ? listener.stop() : listener.start())
  else { mic.hidden = true; interim.textContent = 'Trình duyệt này chưa nghe được giọng nói. Hãy mở bằng Chrome hoặc Edge.' }

  // ---------- camera + nhận diện ----------
  const demo = new URLSearchParams(location.search).get('demo') // ?demo=/demo/x.mp4: dùng video thay camera (để kiểm thử)
  $('camStart').onclick = async () => {
    const msg = $('camMsg'), btn = $('camStart')
    btn.disabled = true
    msg.textContent = 'Đang tải AI nhận diện… (lần đầu khoảng 30 MB, các lần sau nhanh hơn)'
    try {
      const [{ model, tracker }] = await Promise.all([getEngine(), startSource()])
      $('camOff').hidden = true
      $('live').hidden = false
      run(model, tracker)
    } catch (err) {
      console.error('[Lời Tay] không khởi động được:', err)
      btn.disabled = false
      msg.textContent = err?.name === 'NotAllowedError'
        ? 'Bạn chưa cho phép dùng camera. Bấm biểu tượng ổ khoá trên thanh địa chỉ, cho phép camera rồi bấm lại.'
        : err?.name === 'NotFoundError' ? 'Không tìm thấy camera trên máy này.' : 'Chưa khởi động được. Kiểm tra mạng rồi thử lại.'
    }
  }

  async function startSource() {
    if (demo) {
      video.src = demo; video.loop = true
    } else {
      video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false })
      cam.classList.add('mirror') // như nhìn gương; AI vẫn nhận ảnh gốc
    }
    // Trình duyệt có thể tạm dừng video khi tab ở chế độ nền: không coi là lỗi, sẽ tự phát lại
    try { await video.play() } catch (err) { if (err.name !== 'AbortError') throw err }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && video.paused && (video.srcObject || video.src)) video.play().catch(() => {})
  })

  function run(model, tracker) {
    const rec = createRecognizer(model)
    const dbg = import.meta.env.DEV ? (window.__loiTay = { frames: 0, withHands: 0, events: [] }) : null
    const liveWord = $('liveWord'), liveBar = $('liveBar'), hint = $('camHint')
    const view = $('chat')
    const tick = () => {
      // chỉ nhận diện khi đang ở trang trò chuyện (trang dịch video dùng chung "mắt")
      if (!view.hidden && video.readyState >= 2 && !video.paused) {
        const { frame, hands, landmarks } = tracker.detect(video, performance.now())
        const hit = rec.push(frame, performance.now())
        if (dbg) { dbg.frames++; dbg.withHands += hands > 0; dbg.current = rec.current && { label: rec.current.label, prob: rec.current.prob }; if (hit) dbg.events.push(hit) }
        hint.hidden = hands > 0
        const cur = rec.current
        liveWord.textContent = hands && cur ? wordLabel(cur.label) : '…'
        liveBar.style.width = `${hands && cur ? Math.round(cur.prob * 100) : 0}%`
        draw(landmarks)
        if (hit) { words.push(hit.word); renderDraft(true) }
      }
      video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick)
    }
    tick()
  }

  // Chấm các điểm khớp tay lên hình (chấm nhỏ, màu thương hiệu)
  function draw({ hands }) {
    if (overlay.width !== video.videoWidth) { overlay.width = video.videoWidth; overlay.height = video.videoHeight }
    ctx.clearRect(0, 0, overlay.width, overlay.height)
    hands.forEach((h, i) => {
      ctx.fillStyle = i ? '#FFC431' : '#1FB3A6'
      for (const p of h) { ctx.beginPath(); ctx.arc(p.x * overlay.width, p.y * overlay.height, 3.5, 0, 7); ctx.fill() }
    })
  }
}
