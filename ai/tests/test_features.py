import numpy as np
from sign.features import B, D, F, T, frame_features, mirror_frames, per_frame, sequence_vector

# Tư thế giả: vai trái (điểm 11) ở x=0.6, vai phải (12) ở x=0.4 (ảnh không lật gương),
# cổ tay trái (15) ở x=0.7, cổ tay phải (16) ở x=0.3.
POSE = np.zeros((33, 3), np.float32)
POSE[0] = [0.5, 0.3, 0]
POSE[11], POSE[12] = [0.6, 0.5, 0], [0.4, 0.5, 0]
POSE[13], POSE[14] = [0.65, 0.65, 0], [0.35, 0.65, 0]
POSE[15], POSE[16] = [0.7, 0.8, 0], [0.3, 0.8, 0]

# Bàn tay nằm sát cổ tay phải (x≈0.3).
RIGHT_HAND = np.tile([0.3, 0.78, 0.0], (21, 1)).astype(np.float32)
RIGHT_HAND[:, 1] -= np.linspace(0, 0.1, 21)


def test_missing_hand_is_zero_with_flag():
    f = frame_features(POSE, [RIGHT_HAND])
    assert f.shape == (F,)
    assert f[-2] == 0 and f[-1] == 1          # cờ: không có tay trái, có tay phải
    assert not f[21:84].any()                 # khối tay trái toàn 0
    assert f[84:147].any()                    # khối tay phải có số


def test_no_pose_no_nan():
    f = frame_features(None, [RIGHT_HAND])
    assert not np.isnan(f).any()


def test_sequence_length():
    v = sequence_vector(np.random.rand(37, F).astype(np.float32))
    assert T == 8 and B == 184
    assert v.shape == (D,) == (T * B + 3 * B,)


def test_hand_shape_ignores_distance():
    # cùng một bàn tay, đứng xa gấp đôi (tay nhỏ đi một nửa) -> khối "hình dạng bàn tay" không đổi
    near = frame_features(POSE, [RIGHT_HAND])
    small = RIGHT_HAND.copy(); small[:, :2] = small[0, :2] + (small[:, :2] - small[0, :2]) * 0.5
    far = frame_features(POSE, [small])
    shape = slice(14 + 42 + 42 + 42, 14 + 42 + 42 + 42 + 42)   # hình dạng tay phải
    assert np.allclose(per_frame(near[None])[0, shape], per_frame(far[None])[0, shape], atol=1e-5)


def test_trim_handless_edges():
    mid = np.random.rand(10, F).astype(np.float32)
    mid[:, -2:] = 1
    empty = np.zeros((5, F), np.float32)
    padded = np.vstack([empty, mid, empty])
    assert np.allclose(sequence_vector(padded), sequence_vector(mid))


def test_mirror_twice_is_identity():
    x = np.random.rand(12, F).astype(np.float32)
    assert np.allclose(mirror_frames(mirror_frames(x)), x)


def test_mirror_swaps_hands():
    f = frame_features(POSE, [RIGHT_HAND])[None]
    m = mirror_frames(f)[0]
    assert m[-2] == 1 and m[-1] == 0           # tay phải thành tay trái
    assert np.allclose(m[21:84].reshape(21, 3)[:, 0], -f[0, 84:147].reshape(21, 3)[:, 0])
