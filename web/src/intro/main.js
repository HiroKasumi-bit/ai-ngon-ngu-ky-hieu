// Trang giới thiệu: đoạn phim mở màn của logo 3D, rồi kể chuyện theo cuộn.
// Mọi chuyển động dùng GSAP; logo 3D (three.js) tải sau khi chữ đã hiện để trang mở nhanh.
import '@fontsource-variable/lexend'
import './intro.css'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { wordName } from '../signs.js'

gsap.registerPlugin(ScrollTrigger, SplitText)
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
const $ = id => document.getElementById(id)
const hero = $('hero'), slot = $('logoSlot')

// Tâm và chiều cao chỗ đặt logo (px, tính trong khung hero). CSS quyết định bố cục, JS chỉ đo.
function slotRect() {
  const r = slot.getBoundingClientRect(), hr = hero.getBoundingClientRect()
  return { x: r.left - hr.left + r.width / 2, y: r.top - hr.top + r.height / 2, size: r.height }
}

await document.fonts.ready // tách chữ sau khi font về, để chia dòng đúng
const words = SplitText.create('.title .line', { type: 'words', mask: 'words' })
const sayLines = SplitText.create('.say .line', { type: 'words', mask: 'words' })

// ---------- logo 3D (hoặc ảnh tĩnh nếu máy không có WebGL) ----------
const { createLogo3D } = await import('./logo3d.js')
const logo = createLogo3D($('logo3d'))
let fallback = null
if (!logo) {
  fallback = Object.assign(new Image(), { className: 'logo-fallback', alt: '', src: `${import.meta.env.BASE_URL}gioi-thieu/logo3d.webp` })
  slot.prepend(fallback)
}

function fit() {
  if (!logo) return
  logo.resize(hero.clientWidth, hero.clientHeight)
  if (!opening.isActive()) Object.assign(logo.view, slotRect())
  logo.renderOnce()
}
addEventListener('resize', fit)
addEventListener('pointermove', e => logo?.setPointer(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1))
// chỉ vẽ 3D khi phần mở màn đang hiện trên màn hình
new IntersectionObserver(([e]) => { if (logo) e.isIntersecting ? logo.start() : logo.stop() }).observe(hero)

// ---------- đoạn phim mở màn ----------
const opening = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } })
if (logo) {
  const { left, right, bubble, dots } = logo.parts
  const start = { x: hero.clientWidth / 2, y: hero.clientHeight * 0.5, size: hero.clientHeight * 0.5 }
  opening
    .set(logo.view, start, 0)
    .from(left.position, { x: '-=760', y: '+=120', duration: 1.4 }, 0.1)       // hai bàn tay trượt vào, chụm lại
    .from(left.rotation, { y: -1.3, z: 0.6, duration: 1.4 }, 0.1)
    .from(right.position, { x: '+=760', y: '+=120', duration: 1.4 }, 0.2)
    .from(right.rotation, { y: 1.3, z: -0.6, duration: 1.4 }, 0.2)
    .set(bubble, { visible: false }, 0).set(bubble, { visible: true }, 0.95)        // ẩn hẳn, kẻo còn một chấm vàng
    .from(bubble.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 1, ease: 'back.out(1.6)' }, 0.95) // bong bóng bật lên
    .from(bubble.position, { y: '+=110', duration: 1, ease: 'back.out(1.3)' }, 0.95)
    .from(dots.map(d => d.scale), { x: 0, y: 0, z: 0, duration: 0.5, ease: 'back.out(3)', stagger: 0.12 }, 1.5)
    .call(() => { logo.typing = true }, null, 1.95)                               // ba chấm "đang gõ"
    .to(logo.view, { x: () => slotRect().x, y: () => slotRect().y, size: () => slotRect().size, duration: 1.5, ease: 'expo.inOut' }, 2.05)
} else {
  opening.from(fallback, { scale: 0.85, opacity: 0, duration: 1.2 }, 0.2)
}
const t0 = logo ? 2.35 : 0.6
opening
  .from('.disc', { scale: 0, duration: 1.8 }, t0)                                  // sân khấu xanh ngọc nở ra dưới logo
  .from(words.words, { yPercent: 140, duration: 1.2, stagger: 0.06 }, t0 + 0.25)  // tiêu đề trồi lên từng chữ
  .fromTo('.title .ai', { '--bar': 0 }, { '--bar': 1, duration: 0.9, ease: 'expo.inOut' }, t0 + 0.9)
  .from(['.lead', '.actions', '.chip'], { y: 28, autoAlpha: 0, duration: 1, stagger: 0.12 }, t0 + 0.75)
  .from(['.nav', '.hero-foot'], { autoAlpha: 0, duration: 1 }, t0 + 1)

fit()
calm ? opening.progress(1) : opening.play()
if (logo && calm) { logo.typing = false; Object.assign(logo.view, slotRect()); logo.renderOnce() }

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
if (!calm) opening.call(() => setInterval(() => { if (!document.hidden && ScrollTrigger.isInViewport(hero)) nextWord() }, 3000))

// ---------- cuộn ra khỏi mở màn: đĩa xanh ngọc phình phủ kín màn, logo bay lên ----------
// Chỉ tạo sau khi mở màn xong: hiệu ứng cuộn ghi nhớ trạng thái lúc được tạo, tạo sớm thì nó
// nhớ đĩa và chữ đang ẩn, rồi mỗi lần trang tính lại vị trí sẽ ẩn chúng đi.
if (!calm) opening.eventCallback('onComplete', setupScroll)
function setupScroll() {
  const cover = () => {
    const d = document.querySelector('.disc').getBoundingClientRect()
    const cx = d.left + d.width / 2, cy = d.top + d.height / 2
    const far = Math.max(...[[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]].map(([x, y]) => Math.hypot(x - cx, y - cy)))
    return (far / (d.width / 2)) * 1.04
  }
  const out = gsap.timeline({
    scrollTrigger: {
      trigger: hero, start: 'top top', end: '+=90%', pin: true, scrub: 0.8, invalidateOnRefresh: true,
      // đĩa đã phủ gần kín màn: chữ "AI" trên thanh trên đổi sang trắng cho khỏi chìm
      onUpdate: self => document.querySelector('.nav').classList.toggle('on-teal', self.progress > 0.7),
    },
    defaults: { ease: 'none' },
  })
  out.to('.disc', { scale: cover, ease: 'power2.in', duration: 1 }, 0)
    .to(['.hero-copy', '.hero-foot', '.chip'], { y: -90, autoAlpha: 0, ease: 'power2.in', duration: 0.45 }, 0)
  if (logo) out.to(logo.view, { y: () => -slotRect().size, size: () => slotRect().size * 0.6, ease: 'power2.in', duration: 0.8 }, 0.15)

  // cảnh 2: câu chữ trồi lên khi đi vào màn
  gsap.from(sayLines.words, { yPercent: 140, duration: 1, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: '.statement', start: 'top 55%' } })
  gsap.from(['.say-sub', '.statement .btn'], { y: 24, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.1, scrollTrigger: { trigger: '.statement', start: 'top 35%' } })
  ScrollTrigger.refresh()
}

if (import.meta.env.DEV) window.__intro = { opening, logo, ScrollTrigger } // để chụp từng khung khi kiểm thử
