// Lựa chọn của người dùng: ngôn ngữ giao diện (vi/en) và ngôn ngữ ký hiệu (vsl/asl). Nhớ trong máy.
import { SIGNS } from './signs.js'

const KEY = 'loitay.settings'
export const UIS = ['vi', 'en']

// Bỏ giá trị lạ (dữ liệu cũ, gõ tay) để app luôn chạy được.
export function cleanSettings(s) {
  return { ui: UIS.includes(s?.ui) ? s.ui : 'vi', sign: s?.sign in SIGNS ? s.sign : 'vsl' }
}

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) } catch { return null } }
// Link có ?ui=en hoặc ?sign=asl thì mở thẳng theo lựa chọn đó (tiện gửi link tiếng Anh).
const fromUrl = () => { try { const q = new URLSearchParams(location.search); return Object.fromEntries(['ui', 'sign'].filter(k => q.has(k)).map(k => [k, q.get(k)])) } catch { return {} } }
export const settings = cleanSettings({ ...read(), ...fromUrl() })
const subs = new Set()

export function setSettings(patch) {
  Object.assign(settings, cleanSettings({ ...settings, ...patch }))
  try { localStorage.setItem(KEY, JSON.stringify(settings)) } catch {}
  subs.forEach(fn => fn(settings))
}
export const onSettings = fn => subs.add(fn)
