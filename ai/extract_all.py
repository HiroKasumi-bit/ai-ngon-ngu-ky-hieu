"""Cho máy xem toàn bộ video trong data/videos, lưu con số của từng video vào data/frames/<ID>.npy.
Chạy song song nhiều nhân CPU cho nhanh. Chạy: uv run python extract_all.py
"""
import os
import sys
from concurrent.futures import ProcessPoolExecutor

import numpy as np

from sign.landmarks import video_frames

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")


def work(name):
    dst = os.path.join(DATA, "frames", os.path.splitext(name)[0] + ".npy")
    if not os.path.exists(dst):
        np.save(dst, video_frames(os.path.join(DATA, "videos", name)))
    f = np.load(dst)
    return name, len(f), int(f[:, -2:].any(axis=1).sum())


if __name__ == "__main__":
    os.makedirs(os.path.join(DATA, "frames"), exist_ok=True)
    names = sorted(n for n in os.listdir(os.path.join(DATA, "videos")) if n.endswith((".mp4", ".webm")))
    weak = []
    with ProcessPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) - 1)) as ex:
        for k, (name, n, with_hands) in enumerate(ex.map(work, names), 1):
            if with_hands < 5:
                weak.append((name, n, with_hands))
            print(f"\r{k}/{len(names)}", end="", flush=True)
    print(f"\nXong {len(names)} video. Video có dưới 5 khung thấy tay: {len(weak)}")
    for w in weak:
        print("  ", *w)
    sys.exit(0)
