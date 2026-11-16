"""Dạy AI nhận 20 ký hiệu, chấm điểm trung thực, rồi xuất model cho website.

1. Mỗi video -> vector (sequence_vector).
2. Nhân bản dữ liệu: mỗi video tạo thêm nhiều biến thể (lật gương, xoay, co giãn, cắt đầu/cuối, nhiễu).
3. Chấm điểm 2 kiểu:
   - "người lạ": AI được kiểm tra trên người nó CHƯA từng thấy (chia theo người ra ký hiệu) -> con số trung thực
   - "ngẫu nhiên": chia video ngẫu nhiên (người có thể trùng) -> con số dễ hơn, chỉ để tham khảo
4. Train trên toàn bộ dữ liệu, xuất web/public/model/model.json và tests/fixtures/parity.json.
Chạy: uv run python train.py
"""
import base64, csv, json, os

import numpy as np
from sklearn.model_selection import GroupKFold, StratifiedKFold
from sklearn.linear_model import LogisticRegression

from sign.features import F, T, mirror_frames, sequence_vector

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
WEB_MODEL = os.path.join(ROOT, "..", "web", "public", "model", "model.json")
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "parity.json")
rng = np.random.default_rng(0)


def load():
    rows = list(csv.DictReader(open(os.path.join(DATA, "labels.csv"), encoding="utf-8")))
    frames = [np.load(os.path.join(DATA, "frames", r["ID_video"] + ".npy")) for r in rows]
    labels = sorted({r["Meaning"] for r in rows})
    y = np.array([labels.index(r["Meaning"]) for r in rows])
    groups = np.array([r["Signer"] for r in rows])
    return rows, frames, labels, y, groups


def augment(frames):
    """Một biến thể ngẫu nhiên của chuỗi khung (N,149)."""
    f = frames.copy()
    if rng.random() < 0.5:
        f = mirror_frames(f)
    n = len(f)                                    # cắt ngẫu nhiên một chút ở đầu/cuối
    a, b = rng.integers(0, max(1, n // 8) + 1, 2)
    f = f[a: max(a + 2, n - b)]
    ang = np.radians(rng.uniform(-10, 10))        # xoay nhẹ quanh giữa hai vai
    c, s = np.cos(ang), np.sin(ang)
    pts = f[:, :147].reshape(len(f), 49, 3)
    x, yv = pts[..., 0].copy(), pts[..., 1].copy()
    pts[..., 0], pts[..., 1] = c * x - s * yv, s * x + c * yv
    pts *= rng.uniform(0.9, 1.1)                  # người to/nhỏ, đứng xa/gần
    present = np.concatenate([np.ones((len(f), 7)), np.repeat(f[:, -2:] > 0, 21, axis=1)], axis=1)[..., None]
    pts += rng.normal(0, 0.01, pts.shape) * present  # tay hơi run (chỉ chỗ có tay)
    f[:, :147] = pts.reshape(len(f), 147)
    return f


def build(frames_list, y, copies):
    X, Y = [], []
    for f, label in zip(frames_list, y):
        X.append(sequence_vector(f)); Y.append(label)
        for _ in range(copies):
            X.append(sequence_vector(augment(f))); Y.append(label)
    return np.array(X, np.float32), np.array(Y)


C = 0.05      # độ "kiềm chế" của model: nhỏ = đơn giản hơn, ít học thuộc lòng (chọn qua thử nghiệm)
COPIES = 10   # số biến thể nhân bản cho mỗi video


def fit(X, Y):
    """Hồi quy logistic: mỗi từ có một bộ trọng số; điểm cao nhất thắng. Đơn giản, nhẹ, hợp với dữ liệu ít."""
    mean, std = X.mean(0), X.std(0)
    std[std < 1e-6] = 1
    clf = LogisticRegression(C=C, max_iter=3000)
    clf.fit((X - mean) / std, Y)
    return clf, mean, std


def score(frames, y, splits, copies=COPIES):
    acc = []
    for tr, te in splits:
        X, Y = build([frames[i] for i in tr], y[tr], copies)
        clf, mean, std = fit(X, Y)
        Xt = np.array([sequence_vector(frames[i]) for i in te])
        acc.append((clf.predict((Xt - mean) / std) == y[te]).mean())
    return float(np.mean(acc))


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a, "<f4").tobytes()).decode()


def export(clf, mean, std, labels, metrics):
    W = clf.coef_.T  # (số đặc trưng, 20 từ)
    layers = [{"W": b64(W), "b": b64(clf.intercept_), "shape": list(W.shape)}]
    os.makedirs(os.path.dirname(WEB_MODEL), exist_ok=True)
    json.dump({"labels": labels, "T": T, "F": F, "mean": b64(mean), "std": b64(std),
               "layers": layers, "metrics": metrics},
              open(WEB_MODEL, "w", encoding="utf-8"), ensure_ascii=False)
    print(f"Đã xuất {WEB_MODEL} ({os.path.getsize(WEB_MODEL) / 1e6:.1f} MB)")


def write_fixture(rows, clf, mean, std):
    """Lưu một video thật: điểm thô -> khung -> vector -> xác suất, để web tự kiểm tra khớp Python."""
    from sign.landmarks import video_frames
    vid = next(n for n in os.listdir(os.path.join(DATA, "videos")) if n.startswith(rows[0]["ID_video"]))
    frames, raw, aspect = video_frames(os.path.join(DATA, "videos", vid), keep_raw=True)
    vec = sequence_vector(frames)
    probs = clf.predict_proba(((vec - mean) / std)[None])[0]
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    json.dump({"aspect": aspect, "raw": raw[:15], "frames": frames.tolist(), "vector": vec.tolist(), "probs": probs.tolist()},
              open(FIXTURE, "w"))


if __name__ == "__main__":
    rows, frames, labels, y, groups = load()
    print(f"{len(rows)} video, {len(labels)} từ, {len(set(groups))} người ra ký hiệu")
    by_signer = list(GroupKFold(n_splits=5).split(frames, y, groups))
    random = list(StratifiedKFold(n_splits=5, shuffle=True, random_state=0).split(frames, y))
    signer_acc = score(frames, y, by_signer)
    random_acc = score(frames, y, random)
    print(f"Độ chính xác — người lạ: {signer_acc:.1%} · chia ngẫu nhiên: {random_acc:.1%} (đoán bừa: {1/len(labels):.0%})")

    X, Y = build(frames, y, copies=COPIES)
    clf, mean, std = fit(X, Y)
    export(clf, mean, std, labels, {"signer_independent": signer_acc, "random_split": random_acc,
                                    "model": f"LogisticRegression C={C}", "videos": len(rows), "signers": len(set(groups))})
    write_fixture(rows, clf, mean, std)
