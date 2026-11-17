"""Bộ đổi dữ liệu ASL (Holistic 543 điểm -> 149 số/khung), thử trên dữ liệu giả có hình dạng biết trước."""
import numpy as np
import pytest

from extract_asl import POSE, RH, body_ratio, to_frames


def fake(n=3):
    """n khung: người đứng giữa ảnh, vai rộng 0,2, mũi cao hơn vai 0,2; chỉ thấy tay phải, ở gần cổ tay phải."""
    p = np.full((n, 543, 3), np.nan, np.float32)
    pose = np.zeros((33, 3), np.float32)
    pose[0], pose[11], pose[12] = [0.5, 0.3, 0], [0.6, 0.5, 0], [0.4, 0.5, 0]   # mũi, vai trái, vai phải (của người)
    pose[15], pose[16] = [0.62, 0.7, 0], [0.38, 0.7, 0]                          # cổ tay trái, phải
    p[:, POSE] = pose
    p[:, RH] = np.tile([0.38, 0.7, 0], (21, 1))
    return p


def test_body_ratio_is_nose_height_over_shoulder_width():
    assert body_ratio(fake()) == pytest.approx(1.0)


def test_no_pose_gives_no_ratio():
    p = fake()
    p[:, POSE] = np.nan
    assert np.isnan(body_ratio(p))


def test_missing_hand_is_skipped_and_hand_goes_to_nearest_wrist():
    f = to_frames(fake(), aspect=1.0)
    assert f.shape == (3, 149)
    assert (f[:, -2:] == [0, 1]).all()  # không có tay trái, có tay phải


def test_vsl_video_with_same_meaning_as_an_asl_word_is_recognised():
    from extract_asl import same_meaning
    meanings = same_meaning({"cat": {"vi": "con mèo"}, "chair": {"vi": "cái ghế"}, "milk": {"vi": "sữa"}})
    assert {"con_mèo", "mèo", "ghế", "sữa"} <= meanings
    assert "bác_sĩ" not in meanings
