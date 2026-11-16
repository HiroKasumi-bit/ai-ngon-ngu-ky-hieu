"""Cho máy "xem" một video: MediaPipe dò tay + người ở từng khung, rồi đổi ra 149 số/khung.
Dùng đúng 2 model mà website dùng (hand_landmarker.task, pose_landmarker_lite.task),
để con số bên Python và bên web giống nhau.
"""
import os
import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions, vision

from .features import F, frame_features

MODELS = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")
VIDEO = vision.RunningMode.VIDEO


def _landmarkers():
    hand = vision.HandLandmarker.create_from_options(vision.HandLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(MODELS, "hand_landmarker.task")),
        running_mode=VIDEO, num_hands=2))
    pose = vision.PoseLandmarker.create_from_options(vision.PoseLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=os.path.join(MODELS, "pose_landmarker_lite.task")),
        running_mode=VIDEO, num_poses=1))
    return hand, pose


def video_frames(path, keep_raw=False):
    """Đường dẫn video -> mảng (số khung, 149). Ảnh giữ nguyên, không lật gương.
    keep_raw=True: trả thêm điểm thô + tỉ lệ khung (dùng cho bài kiểm thử đối chiếu với web)."""
    cap = cv2.VideoCapture(path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    hand, pose = _landmarkers()
    state, out, raw, i, aspect = {}, [], [], 0, 1.0
    try:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            h, w = bgr.shape[:2]
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            ts = int(i * 1000 / fps)
            hr, pr = hand.detect_for_video(img, ts), pose.detect_for_video(img, ts)
            p = np.array([[l.x, l.y, l.z] for l in pr.pose_landmarks[0]]) if pr.pose_landmarks else None
            hs = [np.array([[l.x, l.y, l.z] for l in hl]) for hl in hr.hand_landmarks]
            aspect = w / h
            out.append(frame_features(p, hs, aspect=aspect, state=state))
            if keep_raw:
                raw.append({"pose": None if p is None else p.tolist(), "hands": [x.tolist() for x in hs]})
            i += 1
    finally:
        cap.release(); hand.close(); pose.close()
    frames = np.array(out, np.float32).reshape(-1, F)
    return (frames, raw, aspect) if keep_raw else frames
