// Chế độ trưng bày: quyết định lúc nào có người đang muốn thử.
// - Thấy tay liên tục khoảng nửa giây -> 'active' (người đi ngang, tay lướt qua thì không tính).
// - Không thấy tay suốt 20 giây -> quay về 'idle' (vòng giới thiệu).
export function createAttention({ enterMs = 500, leaveMs = 20000 } = {}) {
  let state = 'idle', handsSince = null, lastHands = -Infinity
  return {
    update(hasHands, now) {
      if (hasHands) {
        handsSince ??= now
        lastHands = now
        if (state === 'idle' && now - handsSince >= enterMs) state = 'active'
      } else {
        handsSince = null
        if (state === 'active' && now - lastHands >= leaveMs) state = 'idle'
      }
      return state
    },
  }
}
