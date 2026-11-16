// Bộ đo cử chỉ — bản dịch 1-1 của ai/sign/features.py (có bài kiểm thử đối chiếu với Python).
// Mỗi khung hình -> 149 số: 7 điểm trên người, 21 điểm mỗi bàn tay (trái, phải), 2 ô "có tay?".
// Toạ độ tính theo người: gốc = giữa hai vai, đơn vị = bề rộng vai.

export const POSE_IDX = [0, 11, 12, 13, 14, 15, 16] // mũi, vai T/P, khuỷu T/P, cổ tay T/P
export const T = 8 // số khung sau khi chuẩn hoá độ dài
export const F = POSE_IDX.length * 3 + 2 * 21 * 3 + 2 // 149 số mỗi khung (từ MediaPipe)
export const B = 7 * 2 + 2 * (21 * 2 + 21 * 2) + 2 // 184 số mỗi khung đưa vào AI
export const D = T * B + 3 * B // độ dài vector của một ký hiệu

export function frameFeatures(pose, hands, aspect = 1, state = {}) {
  const k = [aspect, 1, aspect]
  const scaled = pts => pts.map(p => [p[0] * k[0], p[1] * k[1], p[2] * k[2]])
  const out = new Float32Array(F)

  if (pose) {
    const p = scaled(pose)
    const origin = [0, 1, 2].map(j => (p[11][j] + p[12][j]) / 2)
    state.scale = Math.hypot(p[11][0] - p[12][0], p[11][1] - p[12][1]) || state.scale || 1
    state.origin = origin
    state.wrists = [p[15], p[16]]
    POSE_IDX.forEach((idx, n) => {
      for (let j = 0; j < 3; j++) out[n * 3 + j] = (p[idx][j] - origin[j]) / state.scale
    })
  }
  const origin = state.origin || [0, 0, 0]
  const scale = state.scale || 1

  const slots = [null, null] // 0 = tay trái của người, 1 = tay phải
  for (const raw of hands.slice(0, 2)) {
    const h = scaled(raw)
    let order
    if (state.wrists) {
      const d = state.wrists.map(w => Math.hypot(w[0] - h[0][0], w[1] - h[0][1]))
      order = d[0] <= d[1] ? [0, 1] : [1, 0]
    } else {
      order = h[0][0] < 0.5 * aspect ? [1, 0] : [0, 1] // ảnh không lật gương: tay phải nằm bên trái ảnh
    }
    slots[order.find(i => !slots[i])] = h
  }
  slots.forEach((h, i) => {
    if (!h) return
    h.forEach((pt, n) => {
      for (let j = 0; j < 3; j++) out[21 + i * 63 + n * 3 + j] = (pt[j] - origin[j]) / scale
    })
    out[F - 2 + i] = 1
  })
  return out
}

// Một khung 149 số -> 184 số (chỉ x,y): [7 điểm người] + mỗi tay [vị trí so với vai, hình dạng tay] + [2 ô có tay?].
// Hình dạng tay = điểm tính từ cổ tay, chia độ dài lòng bàn tay -> không phụ thuộc đứng xa/gần.
export function perFrame(f) {
  const out = new Float32Array(B)
  let o = 0
  for (let p = 0; p < 7; p++) { out[o++] = f[p * 3]; out[o++] = f[p * 3 + 1] }
  for (let k = 0; k < 2; k++) {
    const base = 21 + 63 * k
    const x = i => f[base + i * 3]
    const y = i => f[base + i * 3 + 1]
    for (let i = 0; i < 21; i++) { out[o++] = x(i); out[o++] = y(i) }
    const size = Math.hypot(x(9) - x(0), y(9) - y(0))
    for (let i = 0; i < 21; i++) {
      out[o++] = size > 1e-6 ? (x(i) - x(0)) / size : 0
      out[o++] = size > 1e-6 ? (y(i) - y(0)) / size : 0
    }
  }
  out[o++] = f[F - 2]
  out[o] = f[F - 1]
  return out
}

// (N khung × 149) -> vector D số: T khung đều nhau (giữ thứ tự chuyển động)
// + trung bình, độ dao động, độ dao động tốc độ của cả chuỗi. Bỏ khung không có tay ở đầu/cuối.
export function sequenceVector(frames, t = T) {
  const has = frames.map(f => f[F - 2] !== 0 || f[F - 1] !== 0)
  const first = has.indexOf(true)
  if (first >= 0) frames = frames.slice(first, has.lastIndexOf(true) + 1)
  const n = frames.length
  const rows = []
  for (let i = 0; i < t; i++) {
    const pos = i === t - 1 ? n - 1 : (i * (n - 1)) / (t - 1)
    const lo = Math.floor(pos)
    const hi = Math.min(lo + 1, n - 1)
    const w = pos - lo
    const row = new Float32Array(F)
    for (let j = 0; j < F; j++) row[j] = frames[lo][j] * (1 - w) + frames[hi][j] * w
    rows.push(perFrame(row))
  }
  const out = new Float32Array(D)
  rows.forEach((r, i) => out.set(r, i * B))
  const stats = (get, m) => {
    let mean = 0, sq = 0
    for (let i = 0; i < m; i++) mean += get(i)
    mean /= m
    for (let i = 0; i < m; i++) sq += (get(i) - mean) ** 2
    return [mean, Math.sqrt(sq / m)]
  }
  for (let j = 0; j < B; j++) {
    const [mean, std] = stats(i => rows[i][j], t)
    const [, dstd] = stats(i => rows[i + 1][j] - rows[i][j], t - 1)
    out[t * B + j] = mean
    out[t * B + B + j] = std
    out[t * B + 2 * B + j] = dstd
  }
  return out
}
