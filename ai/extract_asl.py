"""Đổi dữ liệu ASL của Google (Kaggle "asl-signs", Deaf Professional Arts Network + Georgia Tech, CC BY 4.0)
sang đúng dạng app dùng: 149 số mỗi khung (sign/features.py).

- Dữ liệu gốc đã là điểm khớp MediaPipe Holistic: mỗi khung 543 điểm (mặt 468, tay trái 21, người 33, tay phải 21).
- Không biết tỉ lệ khung hình (rộng/cao) của video gốc, nên ước lượng cho từng người: so tỉ lệ cơ thể
  (khoảng mũi–vai theo chiều dọc / bề rộng vai) với VieSign, nơi đã biết tỉ lệ khung.
- Video VieSign, chấm bằng cùng kiểu Holistic, làm nhãn "không phải từ nào": là ký hiệu nhưng không phải ASL.
  Phải cùng kiểu chấm, nếu không AI sẽ học mẹo "phân biệt kiểu chấm" thay vì phân biệt ký hiệu.
  Bỏ các video VieSign cùng nghĩa với một từ ASL (mắt, uống, ngủ...): ký hiệu hai nước thường giống nhau,
  dạy AI rằng chúng "không phải từ nào" là dạy ngược.

Cần trước:
  uvx --with six kaggle competitions download -c asl-signs -p data/asl   (37 GB; phải đồng ý luật cuộc thi trên Kaggle)
  data/frames_holistic/<ID>.npy cho mọi video VieSign (chấm bằng MediaPipe Holistic)
Chạy: uv run python extract_asl.py
Kết quả: data/asl/labels.csv (ID_video, Meaning, Signer), data/asl/frames/<ID>.npy
         và data/asl/aspect.json (tỉ lệ khung từng người; chạy lại thì dùng lại, để mọi mẫu đổi cùng một kiểu)
"""
import collections, csv, io, json, os, re, shutil, time, zipfile
from concurrent.futures import ProcessPoolExecutor

import numpy as np
import pyarrow.parquet as pq

from sign.features import F, frame_features

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
ASL = os.path.join(DATA, "asl")
ZIP = os.path.join(ASL, "asl-signs.zip")
HOLISTIC = os.path.join(DATA, "frames_holistic")
OUT = os.path.join(ASL, "frames")
NAMES = os.path.join(ROOT, "..", "web", "src", "words", "asl.names.json")  # nghĩa tiếng Việt của 250 từ ASL
LH, POSE, RH = slice(468, 489), slice(489, 522), slice(522, 543)


def points(raw):
    """Một file parquet -> mảng (số khung, 543, 3)."""
    t = pq.read_table(io.BytesIO(raw), columns=["x", "y", "z"])
    return np.stack([t.column(c).to_numpy() for c in "xyz"], 1).reshape(-1, 543, 3).astype(np.float32)


def body_ratio(p):
    """Trung vị (khoảng mũi–vai theo chiều dọc) / (bề rộng vai), tính trên toạ độ thô 0..1 của ảnh."""
    pose = p[:, POSE]
    pose = pose[~np.isnan(pose[:, [0, 11, 12], :2]).any((1, 2))]
    if not len(pose):
        return np.nan
    dx = np.abs(pose[:, 11, 0] - pose[:, 12, 0])
    dy = np.abs(pose[:, 0, 1] - (pose[:, 11, 1] + pose[:, 12, 1]) / 2)
    return float(np.median(dy / np.maximum(dx, 1e-6)))


def same_meaning(names):
    """Nhãn VieSign (dạng "con_mèo") trùng nghĩa với một từ ASL. Bỏ chữ loại đứng đầu: "con mèo" khớp cả "mèo"."""
    out = set()
    for n in names.values():
        v = n["vi"].lower().replace(" ", "_")
        out |= {v, re.sub(r"^(con|cái|màu|quả)_", "", v)}
    return out


def to_frames(p, aspect):
    """(số khung, 543, 3) -> (số khung, 149), giống hệt bản web: tay nào không thấy thì bỏ qua."""
    state, out = {}, []
    for f in p:
        pose = None if np.isnan(f[POSE]).any() else f[POSE]
        hands = [f[s] for s in (LH, RH) if not np.isnan(f[s]).any()]
        out.append(frame_features(pose, hands, aspect=aspect, state=state))
    return np.array(out, np.float32).reshape(-1, F)


_zip = None


def convert(job):
    global _zip
    path, sid, aspect = job
    _zip = _zip or zipfile.ZipFile(ZIP)  # mỗi tiến trình mở file nén một lần
    np.save(os.path.join(OUT, sid + ".npy"), to_frames(points(_zip.read(path)), aspect))


def estimate_aspect(z, rows, vsl_files):
    """Tỉ lệ khung (rộng/cao) của từng người. Chuẩn so sánh lấy từ VieSign chấm bằng Holistic (đã biết tỉ lệ khung):
    toạ độ y của mũi theo bề rộng vai. Mỗi người lấy 40 mẫu."""
    nose_y = np.concatenate([np.load(f)[:, 1] for f in vsl_files])
    q = float(np.median(np.abs(nose_y[nose_y != 0])))
    by_person = collections.defaultdict(list)
    for r in rows:
        by_person[r["participant_id"]].append(r)
    return {pid: float(np.nanmedian([body_ratio(points(z.read(r["path"]))) for r in rs[:40]])) / q
            for pid, rs in by_person.items()}


def main():
    os.makedirs(OUT, exist_ok=True)
    z = zipfile.ZipFile(ZIP)
    rows = list(csv.DictReader(io.TextIOWrapper(z.open("train.csv"), encoding="utf-8")))

    shared = same_meaning(json.load(open(NAMES, encoding="utf-8")))
    vsl = [r for r in csv.DictReader(open(os.path.join(DATA, "labels.csv"), encoding="utf-8"))
           if os.path.exists(os.path.join(HOLISTIC, r["ID_video"] + ".npy"))]  # video VieSign đã chấm Holistic
    path = os.path.join(ASL, "aspect.json")
    if os.path.exists(path):
        aspect = json.load(open(path))
    else:
        aspect = estimate_aspect(z, rows, [os.path.join(HOLISTIC, r["ID_video"] + ".npy") for r in vsl])
        json.dump(aspect, open(path, "w"), indent=1)
    print(f"{len(rows)} mẫu, {len(aspect)} người, {len(set(r['sign'] for r in rows))} từ. "
          f"Tỉ lệ khung ước lượng (rộng/cao): " + ", ".join(f"{a:.2f}" for a in sorted(aspect.values())), flush=True)

    todo = [(r["path"], r["sequence_id"], aspect[r["participant_id"]]) for r in rows
            if not os.path.exists(os.path.join(OUT, r["sequence_id"] + ".npy"))]
    t0 = time.time()
    with ProcessPoolExecutor(14) as ex:
        for i, _ in enumerate(ex.map(convert, todo, chunksize=64), 1):
            if i % 10000 == 0:
                print(f"  {i}/{len(todo)} ({time.time() - t0:.0f}s)", flush=True)

    # VieSign làm "không phải từ nào": nhãn có dấu ":" thì train.py luôn xếp vào OTHER.
    out = [{"ID_video": r["sequence_id"], "Meaning": r["sign"], "Signer": r["participant_id"]} for r in rows]
    skipped = 0
    for r in vsl:
        vid = "vsl_" + r["ID_video"]
        if r["Meaning"].lower() in shared:
            skipped += 1
            if os.path.exists(os.path.join(OUT, vid + ".npy")):
                os.remove(os.path.join(OUT, vid + ".npy"))
            continue
        shutil.copyfile(os.path.join(HOLISTIC, r["ID_video"] + ".npy"), os.path.join(OUT, vid + ".npy"))
        out.append({"ID_video": vid, "Meaning": "vsl:" + r["Meaning"], "Signer": "vsl:" + r["Signer"]})
    with open(os.path.join(ASL, "labels.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, ["ID_video", "Meaning", "Signer"])
        w.writeheader()
        w.writerows(out)
    print(f"Xong: {len(rows)} mẫu ASL + {len(vsl) - skipped} video VieSign làm 'không phải từ nào' "
          f"(bỏ {skipped} video cùng nghĩa với từ ASL). "
          f"Chấm Holistic thêm video VieSign rồi chạy lại để bổ sung (phần đã đổi được giữ nguyên).")


if __name__ == "__main__":
    main()
