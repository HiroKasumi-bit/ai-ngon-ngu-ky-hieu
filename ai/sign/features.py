"""Bộ đo cử chỉ: biến điểm khớp MediaPipe thành con số cho AI.

Mỗi khung hình -> 149 số:
  [7 điểm trên người × xyz] [21 điểm tay trái × xyz] [21 điểm tay phải × xyz] [có tay trái?, có tay phải?]
Mọi toạ độ tính theo người: gốc là điểm giữa hai vai, đơn vị là bề rộng vai.
Nhờ vậy AI biết tay đang ở gần mặt hay trước ngực, dù người đứng xa hay gần camera.
File web/src/features.js là bản dịch 1-1 của file này (có bài kiểm thử đối chiếu).
"""
import numpy as np

POSE_IDX = [0, 11, 12, 13, 14, 15, 16]   # mũi, vai T/P, khuỷu T/P, cổ tay T/P
T = 8                                    # số khung sau khi chuẩn hoá độ dài
F = len(POSE_IDX) * 3 + 2 * 21 * 3 + 2   # = 149 số mỗi khung (lưu từ MediaPipe)
B = 7 * 2 + 2 * (21 * 2 + 21 * 2) + 2    # = 184 số mỗi khung đưa vào AI (xem per_frame)
D = T * B + 3 * B                        # độ dài vector cuối cùng của một ký hiệu


def frame_features(pose, hands, aspect=1.0, state=None):
    """pose: (33,3) hoặc None; hands: danh sách (21,3); toạ độ chuẩn hoá 0..1 của MediaPipe.
    aspect = rộng/cao của ảnh để trục x, y cùng đơn vị. state: dict nhớ gốc/thước của khung trước."""
    state = {} if state is None else state
    k = np.array([aspect, 1.0, aspect], np.float32)  # z của MediaPipe cùng thang với x
    out = np.zeros(F, np.float32)

    if pose is not None:
        p = np.asarray(pose, np.float32) * k
        origin = (p[11] + p[12]) / 2
        scale = float(np.linalg.norm(p[11, :2] - p[12, :2])) or state.get("scale", 1.0)
        state.update(origin=origin, scale=scale, wrists=p[[15, 16]])
        out[:21] = ((p[POSE_IDX] - origin) / scale).ravel()
    origin = state.get("origin", np.zeros(3, np.float32))
    scale = state.get("scale", 1.0)

    slots = [None, None]  # 0 = tay trái của người, 1 = tay phải
    for h in hands[:2]:
        h = np.asarray(h, np.float32) * k
        if "wrists" in state:   # gán theo cổ tay gần nhất trên người
            d = np.linalg.norm(state["wrists"][:, :2] - h[0, :2], axis=1)
            order = list(np.argsort(d))
        else:                   # không thấy người: ảnh không lật gương nên tay phải nằm bên trái ảnh
            order = [1, 0] if h[0, 0] < 0.5 * aspect else [0, 1]
        i = next(i for i in order if slots[i] is None)
        slots[i] = h

    for i, h in enumerate(slots):
        if h is not None:
            out[21 + i * 63: 84 + i * 63] = ((h - origin) / scale).ravel()
            out[-2 + i] = 1
    return out


def per_frame(frames):
    """(N,149) -> (N,184), chỉ lấy x,y (chiều sâu z của MediaPipe nhiễu):
    [7 điểm người] + mỗi tay [vị trí so với vai, hình dạng tay] + [2 ô có tay?].
    Hình dạng tay = các điểm tính từ cổ tay, chia cho độ dài lòng bàn tay (cổ tay -> gốc ngón giữa),
    nên không phụ thuộc người đứng xa hay gần."""
    n = len(frames)
    out = [frames[:, :21].reshape(n, 7, 3)[..., :2].reshape(n, 14)]
    for k in range(2):
        h = frames[:, 21 + 63 * k: 84 + 63 * k].reshape(n, 21, 3)[..., :2]
        rel = h - h[:, :1]
        size = np.linalg.norm(rel[:, 9], axis=1)[:, None, None]
        shape = np.divide(rel, size, out=np.zeros_like(rel), where=size > 1e-6)
        out += [h.reshape(n, 42), shape.reshape(n, 42)]
    out.append(frames[:, -2:])
    return np.concatenate(out, axis=1).astype(np.float32)


def sequence_vector(frames, t=T):
    """(N,149) -> vector D số cho một ký hiệu:
    T khung đều nhau (giữ thứ tự chuyển động) + trung bình, độ dao động, độ dao động tốc độ của cả chuỗi.
    Bỏ các khung không có tay ở đầu và cuối."""
    frames = np.asarray(frames, np.float32)
    has = frames[:, -2:].any(axis=1)
    if has.any():
        idx = np.flatnonzero(has)
        frames = frames[idx[0]: idx[-1] + 1]
    n = len(frames)
    pos = np.linspace(0, n - 1, t)
    lo = np.floor(pos).astype(int)
    hi = np.minimum(lo + 1, n - 1)
    w = (pos - lo)[:, None].astype(np.float32)
    b = per_frame(frames[lo] * (1 - w) + frames[hi] * w)
    return np.concatenate([b.ravel(), b.mean(0), b.std(0), np.diff(b, axis=0).std(0)])


def mirror_frames(frames):
    """Lật gương: đổi dấu x, đổi tay trái <-> phải (dùng để nhân bản dữ liệu)."""
    f = np.array(frames, np.float32, copy=True)
    f[:, 0:147:3] *= -1
    pose = f[:, :21].reshape(-1, 7, 3)
    pose[:, [1, 2, 3, 4, 5, 6]] = pose[:, [2, 1, 4, 3, 6, 5]]
    f[:, :21] = pose.reshape(-1, 21)
    f[:, 21:84], f[:, 84:147] = f[:, 84:147].copy(), f[:, 21:84].copy()
    f[:, [-2, -1]] = f[:, [-1, -2]]
    return f
