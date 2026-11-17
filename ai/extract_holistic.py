"""Chấm điểm khớp mọi video VieSign bằng MediaPipe Holistic, đúng kiểu chấm của dữ liệu ASL (Google ISLR).
Dùng làm nhãn "không phải từ nào" khi dạy ASL (xem extract_asl.py). Phải cùng kiểu chấm với dữ liệu ASL,
nếu không AI sẽ học mẹo "phân biệt kiểu chấm" thay vì phân biệt ký hiệu.

Holistic chỉ có ở mediapipe bản cũ, nên chạy trong môi trường tạm (không đụng tới môi trường của dự án):
  uv run --no-project --python 3.12 --with mediapipe==0.10.14 --with opencv-python --with "numpy<2" python extract_holistic.py
Kết quả: data/frames_holistic/<ID>.npy, cùng dạng 149 số/khung (sign/features.py). 7.664 video mất khoảng 2 giờ.
Chạy lại thì bỏ qua video đã chấm.
"""
import csv, os, time
from concurrent.futures import ProcessPoolExecutor

import numpy as np

from sign.features import F, frame_features

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(DATA, "frames_holistic")


def work(job):
    vid, path = job
    import cv2
    import mediapipe as mp
    arr = lambda lm: np.array([[p.x, p.y, p.z] for p in lm.landmark], np.float32)
    cap, out, state = cv2.VideoCapture(path), [], {}
    with mp.solutions.holistic.Holistic(static_image_mode=False, model_complexity=1) as hol:
        while True:
            ok, bgr = cap.read()
            if not ok:
                break
            h, w = bgr.shape[:2]
            if max(h, w) > 1280:  # video 4K: thu nhỏ cho nhanh (toạ độ đã chuẩn hoá 0..1 nên không đổi)
                s = 1280 / max(h, w)
                bgr = cv2.resize(bgr, (int(w * s), int(h * s)))
            r = hol.process(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB))
            pose = arr(r.pose_landmarks) if r.pose_landmarks else None
            hands = [arr(x) for x in (r.left_hand_landmarks, r.right_hand_landmarks) if x]
            out.append(frame_features(pose, hands, aspect=w / h, state=state))
    cap.release()
    np.save(os.path.join(OUT, vid + ".npy"), np.array(out, np.float32).reshape(-1, F))


def main():
    os.makedirs(OUT, exist_ok=True)
    rows = list(csv.DictReader(open(os.path.join(DATA, "labels.csv"), encoding="utf-8")))
    files = {n.rsplit(".", 1)[0]: n for n in os.listdir(os.path.join(DATA, "videos"))}
    todo = [(r["ID_video"], os.path.join(DATA, "videos", files[r["ID_video"]])) for r in rows
            if r["ID_video"] in files and not os.path.exists(os.path.join(OUT, r["ID_video"] + ".npy"))]
    print(f"{len(rows)} video, còn {len(todo)} video cần chấm", flush=True)
    t0 = time.time()
    with ProcessPoolExecutor(14) as ex:
        for i, _ in enumerate(ex.map(work, todo, chunksize=4), 1):
            if i % 200 == 0:
                print(f"  {i}/{len(todo)} ({time.time() - t0:.0f}s)", flush=True)
    print(f"Xong trong {time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
