// Trang giới thiệu: đoạn phim logo (render thật bằng Blender), chữ hiện theo nhịp phim, rồi kể chuyện theo cuộn.
// Phim có hai đoạn: mở màn (chạy một lần) và đoạn ba chấm "đang gõ" (lặp liền mạch).
import '@fontsource-variable/lexend'
import './intro.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { wordName } from '../signs.js'

gsap.registerPlugin(ScrollTrigger, SplitText)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = id => document.getElementById(id)
const hero = $('hero'), film = $('film'), intro = $('filmIntro'), loop = $('filmLoop'), chip = $('chip')
const ASSET = `${import.meta.env.BASE_URL}gioi-thieu/`
let kioskOn = false // đang ở chế độ trưng bày

// Toạ độ trong khung phim 1920×1080 (đo trên khung cuối): ngay dưới logo, và tâm panel xanh ngọc.
const VIDEO = { w: 1920, h: 1080 }
const UNDER_LOGO = { u: 0.72, v: 0.79 }
const PANEL = { u: 0.86, v: 0.97 }

// Đổi toạ độ trong phim sang px trên màn (phim phủ kín khung theo object-fit: cover).
function onScreen({ u, v }) {
  const W = film.clientWidth, H = film.clientHeight
  const [px, py] = getComputedStyle(intro).objectPosition.split(' ').map(p => parseFloat(p) / 100)
  const s = Math.max(W / VIDEO.w, H / VIDEO.h), vw = VIDEO.w * s, vh = VIDEO.h * s
  return { x: (W - vw) * px + u * vw, y: (H - vh) * py + v * vh }
}
function layout() {
  const c = onScreen(UNDER_LOGO)
  chip.style.left = `${c.x}px`
  chip.style.top = `${c.y}px`
  const p = onScreen(PANEL)
  film.style.transformOrigin = `${p.x}px ${p.y}px`
}
addEventListener('resize', layout)
layout()

await document.fonts.ready // tách chữ sau khi font về, để chia dòng đúng
const words = SplitText.create('.title .line', { type: 'words', mask: 'words' })
const sayLines = SplitText.create('.say .line', { type: 'words', mask: 'words' })

// ---------- chữ hiện ra khi camera trong phim lùi ra, chừa chỗ bên trái ----------
const reveal = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
  .from(words.words, { yPercent: 140, duration: 1.2, stagger: 0.06 }, 0)
  .fromTo('.title .ai', { '--bar': 0 }, { '--bar': 1, duration: 0.9, ease: 'expo.inOut' }, 0.65)
  .from(['.lead', '.actions'], { y: 28, autoAlpha: 0, duration: 1, stagger: 0.12 }, 0.5)
  .from(chip, { y: 16, autoAlpha: 0, duration: 0.9 }, 0.9)
  .from(['.nav', '.hero-foot'], { autoAlpha: 0, duration: 1 }, 0.8)

// ---------- phim ----------
loop.poster = `${ASSET}hero-end.webp`
loop.src = `${ASSET}hero-loop.mp4`
const CUE = 2.9 // giây: lúc camera trong phim bắt đầu lùi ra
let started = false
const start = () => { if (!started) { started = true; reveal.play() } }

function toLoop() { // mở màn hết: chuyển sang đoạn lặp (khung đầu đoạn lặp nối tiếp khung cuối mở màn)
  loop.currentTime = 0
  loop.play().catch(() => {})
  loop.addEventListener('playing', () => { intro.hidden = true }, { once: true })
}
if (calm) {
  intro.hidden = true // không chuyển động: chỉ hiện khung cuối, chữ hiện sẵn
  reveal.progress(1)
} else {
  intro.poster = `${ASSET}hero-start.webp`
  intro.src = `${ASSET}hero-intro.mp4`
  intro.addEventListener('ended', toLoop)
  if (!intro.requestVideoFrameCallback) intro.addEventListener('timeupdate', () => { if (intro.currentTime >= CUE) start() })
  armCue()
  intro.play().catch(err => { // trình duyệt chặn tự phát: bỏ mở màn, hiện thẳng đoạn lặp và chữ
    if (err.name !== 'NotAllowedError') return
    intro.hidden = true
    loop.play().catch(() => {})
    start()
  })
  setTimeout(start, 6500) // mạng chậm, phim chưa chạy: vẫn hiện chữ
}
// chữ bắt đầu hiện đúng lúc camera trong phim lùi ra (giây thứ CUE)
function armCue() {
  const watch = (_, meta) => (meta.mediaTime >= CUE ? start() : intro.requestVideoFrameCallback(watch))
  intro.requestVideoFrameCallback?.(watch)
}
// Chạy lại từ đầu đoạn mở màn (chế độ trưng bày gọi khi không còn ai đứng trước máy).
function replayHero() {
  if (calm) return
  started = false
  reveal.pause(0)
  loop.pause()
  intro.hidden = false
  intro.currentTime = 0
  intro.play().catch(() => {})
  armCue()
}

// ---------- chip luân phiên những từ AI nhận được thật (lấy từ danh sách từ của app) ----------
const demo = [['vsl', 'khẩu_trang'], ['asl', 'thankyou'], ['vsl', 'điện_thoại'], ['asl', 'water'], ['vsl', 'bệnh_viện']]
const chipWord = $('chipWord'), chipTag = $('chipTag'), chipBar = $('chipBar')
let k = 0
function nextWord() {
  k = (k + 1) % demo.length
  const [sign, label] = demo[k]
  gsap.timeline()
    .fromTo(chipBar, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: 'power1.inOut' })
    .to(chipWord, { yPercent: -110, duration: 0.25, ease: 'power2.in' })
    .call(() => { chipWord.textContent = wordName(sign, label, 'vi'); chipTag.textContent = sign.toUpperCase() })
    .fromTo(chipWord, { yPercent: 110 }, { yPercent: 0, duration: 0.5, ease: 'back.out(1.8)' })
}

// ---------- cuộn ra: máy quay "lao" vào panel xanh ngọc tới khi xanh phủ kín màn ----------
// Tạo sau khi chữ đã hiện xong: hiệu ứng cuộn ghi nhớ trạng thái lúc được tạo.
let scrollReady = false
reveal.eventCallback('onComplete', () => {
  if (scrollReady) return // chạy lại mở màn (chế độ trưng bày) thì không tạo thêm lần nữa
  scrollReady = true
  setInterval(() => { if (!document.hidden && ScrollTrigger.isInViewport(hero)) nextWord() }, 3000)
  if (!calm && !kioskOn) setupScroll()
})
function setupScroll() {
  gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=90%', pin: true, scrub: 0.8, invalidateOnRefresh: true,
      onUpdate: self => document.querySelector('.nav').classList.toggle('on-teal', self.progress > 0.7),
    },
    defaults: { ease: 'power2.in' },
  })
    .to(['.hero-copy', '.hero-foot', chip], { y: -90, autoAlpha: 0, duration: 0.45 }, 0)
    .to(film, { scale: 3.2, duration: 1 }, 0)
    .to('.wash', { opacity: 1, duration: 0.35, ease: 'none' }, 0.65)

  gsap.from(sayLines.words, { yPercent: 140, duration: 1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.statement', start: 'top 55%' } })
  gsap.from(['.say-sub', '.statement .btn'], { y: 24, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.statement', start: 'top 35%' } })
  ScrollTrigger.refresh()
}

// ---------- chế độ trưng bày ----------
// Toàn màn hình chỉ bật được ngay trong cú bấm, nên gọi requestFullscreen trước khi tải phần còn lại.
async function openKiosk() {
  document.documentElement.requestFullscreen?.().catch(() => {})
  kioskOn = true
  $('kStart').hidden = true
  scrollTo(0, 0)
  ScrollTrigger.getAll().forEach(t => t.kill(true)) // màn trưng bày không cuộn
  const { startKiosk } = await import('./kiosk.js')
  startKiosk({ replayHero })
}
document.querySelector('.actions .ghost').addEventListener('click', e => { e.preventDefault(); openKiosk() })
if (new URLSearchParams(location.search).has('trungbay')) { // mở thẳng bằng link: cần một cú bấm để vào toàn màn hình
  $('kStart').hidden = false
  $('kStart').querySelector('button').onclick = openKiosk
}

if (import.meta.env.DEV) window.__intro = { reveal, intro, loop, ScrollTrigger } // để chụp từng khung khi kiểm thử
