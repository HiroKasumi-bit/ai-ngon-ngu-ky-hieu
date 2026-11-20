// Hiệu ứng cho app. Chỉ dùng transform/opacity và chỉ chạy khi có sự kiện (nhận được từ, có tin nhắn,
// đổi trang), không bao giờ chạy trong vòng nhận diện từng khung hình, nên AI không chậm đi.
// Người dùng bật "giảm chuyển động" trong máy thì mọi hàm ở đây không làm gì.
import { gsap } from 'gsap'

export const calm = matchMedia('(prefers-reduced-motion: reduce)').matches

/** Từ vừa nhận bay từ chip trên khung camera xuống đúng chỗ của nó trong câu đang ghép. */
export function flyWord(from, to) {
  if (calm || !from?.offsetParent || !to) return
  const a = from.getBoundingClientRect(), b = to.getBoundingClientRect()
  const ghost = to.cloneNode(true)
  Object.assign(ghost.style, { position: 'fixed', left: `${b.left}px`, top: `${b.top}px`, margin: 0, zIndex: 50, pointerEvents: 'none' })
  document.body.append(ghost)
  to.style.visibility = 'hidden'
  gsap.fromTo(ghost,
    { x: a.left + a.width / 2 - (b.left + b.width / 2), y: a.top + a.height / 2 - (b.top + b.height / 2), scale: 1.25 },
    { x: 0, y: 0, scale: 1, duration: 0.65, ease: 'expo.inOut', onComplete: () => { ghost.remove(); to.style.visibility = '' } })
}

/** Phần tử bật ra (khi không có chỗ để bay từ đó tới). */
export function pop(el) {
  if (!calm && el) gsap.from(el, { scale: 0.6, opacity: 0, duration: 0.35, ease: 'back.out(2.2)' })
}

/** Khung camera chớp viền xanh ngọc khi nhận được một từ. */
export function flash(el) {
  if (calm) return
  el.classList.remove('hit')
  void el.offsetWidth // bắt trình duyệt vẽ lại để hiệu ứng chạy lại từ đầu
  el.classList.add('hit')
}

/** Đặt chữ vào phần tử, từng từ hiện ra theo nhịp đọc. */
export function writeWords(el, text) {
  if (calm) return el.append(text)
  const spans = text.split(/(\s+)/).map(part => {
    if (/^\s+$/.test(part)) return document.createTextNode(part)
    const s = document.createElement('span')
    s.className = 'w'
    s.textContent = part
    return s
  })
  el.append(...spans)
  gsap.from(el.querySelectorAll('.w'), { y: 10, autoAlpha: 0, duration: 0.45, ease: 'power3.out', stagger: 0.045 })
}

/** Một loạt phần tử hiện so le (chỉ tối đa vài chục cái đầu, phần còn lại hiện ngay). */
export function staggerIn(nodes, max = 70) {
  if (calm || !nodes.length) return
  gsap.from([...nodes].slice(0, max), { y: 10, autoAlpha: 0, duration: 0.4, ease: 'power3.out', stagger: 0.008, clearProps: 'all' })
}

/** Ô nền trượt theo tab đang chọn. */
export function slideTo(indicator, target, instant = false) {
  if (!target) return
  const box = { x: target.offsetLeft, y: target.offsetTop, width: target.offsetWidth, height: target.offsetHeight }
  calm || instant ? gsap.set(indicator, box) : gsap.to(indicator, { ...box, duration: 0.5, ease: 'expo.out' })
}

/** Sóng âm trên nút micro theo âm lượng thật của giọng nói (chỉ laptop: điện thoại để micro cho nhận giọng). */
export function micMeter(btn) {
  const usable = !calm && matchMedia('(pointer: fine)').matches && navigator.mediaDevices?.getUserMedia
  if (!usable) return { start() {}, stop() {} }
  const bars = [0, 1, 2, 3].map(() => {
    const i = document.createElement('i')
    i.className = 'lvl'
    btn.append(i)
    return i
  })
  let ctx, stream, raf = 0
  return {
    async start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        ctx = new AudioContext()
        const an = ctx.createAnalyser()
        an.fftSize = 256
        ctx.createMediaStreamSource(stream).connect(an)
        const data = new Uint8Array(an.frequencyBinCount)
        btn.classList.add('meter-on')
        const tick = () => {
          an.getByteFrequencyData(data)
          bars.forEach((b, k) => { // mỗi cột một dải tần giọng nói (khoảng 200–3000 Hz)
            let sum = 0
            for (let j = 2 + k * 4; j < 6 + k * 4; j++) sum += data[j]
            b.style.transform = `scaleY(${0.18 + Math.min(1, sum / 4 / 170) * 0.82})`
          })
          raf = requestAnimationFrame(tick)
        }
        tick()
      } catch { this.stop() }
    },
    stop() {
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach(t => t.stop())
      ctx?.close()
      stream = ctx = null
      btn.classList.remove('meter-on')
    },
  }
}
