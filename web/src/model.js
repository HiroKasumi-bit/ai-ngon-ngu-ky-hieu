// "Bộ não" AI: một mạng nơ-ron nhỏ (MLP) train bằng ai/train.py, trọng số lưu trong model.json.
// Tính toán chỉ là nhân ma trận + cộng + hàm kích hoạt, nên không cần thư viện AI nào.

const f32 = b64 => {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Float32Array(bytes.buffer)
}

// Giải mã trọng số (base64 -> số thực) một lần, ghi đè vào chính object model.
function decode(model) {
  if (model._ready) return model
  model.mean = f32(model.mean)
  model.std = f32(model.std)
  model.layers = model.layers.map(l => ({ W: f32(l.W), b: f32(l.b), rows: l.shape[0], cols: l.shape[1] }))
  model._ready = true
  return model
}

export async function loadModel(url = '/model/model.json') {
  return decode(await (await fetch(url)).json())
}

export function predict(model, vec) {
  decode(model)
  let x = vec.map((v, i) => (v - model.mean[i]) / model.std[i])
  model.layers.forEach(({ W, b, rows, cols }, li) => {
    const y = new Float32Array(b)
    for (let r = 0; r < rows; r++) {
      const xr = x[r]
      if (xr === 0) continue
      const off = r * cols
      for (let c = 0; c < cols; c++) y[c] += xr * W[off + c]
    }
    x = li < model.layers.length - 1 ? y.map(v => (v > 0 ? v : 0)) : y
  })
  const m = Math.max(...x)
  const e = x.map(v => Math.exp(v - m))
  const s = e.reduce((a, b) => a + b, 0)
  const probs = e.map(v => v / s)
  let best = 0
  probs.forEach((p, i) => { if (p > probs[best]) best = i })
  return { label: model.labels[best], prob: probs[best], probs }
}
