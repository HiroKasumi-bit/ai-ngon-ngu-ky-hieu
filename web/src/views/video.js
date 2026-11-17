// Trang dịch video: xem video từng khung (30 khung/giây), dùng cùng bộ nhận diện như camera.
import { t } from '../i18n.js'
import { createRecognizer } from '../recognizer.js'
import { settings } from '../settings.js'
import { wordName } from '../signs.js'

const $ = id => document.getElementById(id)
const mmss = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`

export function initVideo(getEngine) {
  const input = $('file'), prog = $('vprog'), bar = prog.firstElementChild, note = $('vnote'), list = $('vres')
  const say = (key, vars) => t(settings.ui, key, vars)
  const stop = text => { prog.hidden = true; note.textContent = text; input.value = '' }

  input.onchange = () => input.files[0] && translate(URL.createObjectURL(input.files[0]))
  // Khi chạy thử trên máy: ?translate=/demo/x.mp4 tự dịch một video có sẵn
  const demo = import.meta.env.DEV && new URLSearchParams(location.search).get('translate')
  if (demo) translate(demo)

  async function translate(src) {
    list.innerHTML = ''
    prog.hidden = false
    bar.style.width = '0%'
    note.textContent = say('video.loading')
    let engine
    try { engine = await getEngine() } catch { return stop(say('video.loadFail')) }

    const v = document.createElement('video')
    v.muted = true
    v.playsInline = true
    v.src = src
    try {
      await new Promise((ok, bad) => { v.onloadeddata = ok; v.onerror = bad })
      if (!Number.isFinite(v.duration) || !v.videoWidth) throw new Error('bad video')
    } catch { URL.revokeObjectURL(v.src); return stop(say('video.bad')) }

    note.textContent = say('video.watching')
    const rec = createRecognizer(engine.model)
    const found = []
    engine.tracker.reset()
    for (let t = 0; t < v.duration; t += 1 / 30) { // 30 khung/giây: giống lúc AI học, không sót ký hiệu ngắn
      v.currentTime = t
      await new Promise(r => { v.onseeked = r })
      const hit = rec.push(engine.tracker.detect(v, performance.now()).frame, t * 1000)
      if (hit) found.push({ ...hit, t })
      bar.style.width = `${Math.min(100, (t / v.duration) * 100)}%`
    }
    URL.revokeObjectURL(v.src)
    stop(found.length ? say('video.found', { n: found.length }) : say('video.none'))
    list.innerHTML = found.map(f => `<li><time>${mmss(f.t)}</time><span class="word">${wordName(engine.sign, f.word, settings.ui)}</span></li>`).join('')
  }
}
