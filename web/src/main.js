// Điểm khởi động: chuyển trang theo thanh dưới, và tải "mắt" + "bộ não" AI khi cần lần đầu.
import './style.css'
import { loadModel } from './model.js'
import { createTracker } from './tracker.js'
import { initChat } from './views/chat.js'
import { initVideo } from './views/video.js'
import { initVocab } from './views/vocab.js'

// Chỉ tải AI (~30 MB) khi người dùng bật camera hoặc chọn video, để mở trang nhanh.
let engine = null
export const getEngine = () =>
  (engine ??= Promise.all([loadModel(`${import.meta.env.BASE_URL}model/model.json`), createTracker()])
    .then(([model, tracker]) => ({ model, tracker }))
    .catch(err => { engine = null; throw err }))

const views = { chat: 'chat', video: 'video-view', vocab: 'vocab' }
function route() {
  const key = location.hash.slice(1) in views ? location.hash.slice(1) : 'chat'
  for (const [k, id] of Object.entries(views)) document.getElementById(id).hidden = k !== key
  scrollTo(0, 0)
  document.querySelectorAll('.tabs a').forEach(a =>
    a.dataset.tab === views[key] ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'))
}
addEventListener('hashchange', route)
route()

initChat(getEngine)
initVideo(getEngine)
initVocab()
