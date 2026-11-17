"""Dạy AI nhận ký hiệu, biết bỏ qua cử động lạ, chấm điểm trung thực, rồi xuất model cho website.

1. Xét các từ có ít nhất MIN_VIDEOS video. Video các từ còn lại gộp thành nhãn "không phải từ nào" (OTHER):
   nhờ vậy AI học được cách bỏ qua cử động không phải ký hiệu nó biết. Nhãn có dấu ":" (ví dụ "vsl:mẹ"
   trong dữ liệu ASL) luôn là OTHER: đó là ký hiệu của ngôn ngữ khác.
2. Mỗi video -> vector (sequence_vector). Nhân bản dữ liệu: lật gương, xoay, co giãn, cắt đầu/cuối, nhiễu.
3. Chỉ dạy từ AI học được: chấm thử trên người lạ, từ nào nhận đúng dưới KEEP_ACC thì gộp vào OTHER.
   Từ khó mà vẫn dạy thì AI đoán bừa, kéo cả hệ thống nhận nhầm.
4. Chấm điểm trung thực, chia 5 phần; trong mỗi phần, bước 3 chỉ được nhìn dữ liệu học:
   - từ được dạy: chia theo NGƯỜI, nên người làm ký hiệu lúc kiểm tra chưa từng xuất hiện lúc học;
   - "không phải từ nào": chia theo TỪ, nên cử động lúc kiểm tra là thứ AI chưa từng thấy (giống giơ tay bừa).
   Rồi chọn ngưỡng tự tin sao cho cử động lạ bị nhận thành chữ không quá MAX_FALSE.
5. Dạy trên toàn bộ dữ liệu, xuất web/public/model/<ngôn ngữ>.json, web/src/words/<ngôn ngữ>.json
   và tests/fixtures/parity.json.
Chạy: uv run python train.py       (VSL, khoảng 20 phút)
      uv run python train.py asl   (ASL, cần chạy extract_asl.py trước)
"""
import base64, collections, csv, json, os, sys
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.model_selection import GroupKFold

from sign.features import F, T, mirror_frames, sequence_vector

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
WEB = os.path.join(ROOT, "..", "web")
model_path = lambda lang: os.path.join(WEB, "public", "model", f"{lang}.json")   # mỗi ngôn ngữ ký hiệu một model
words_path = lambda lang: os.path.join(WEB, "src", "words", f"{lang}.json")      # danh sách từ cho trang Từ vựng
FIXTURE = os.path.join(ROOT, "tests", "fixtures", "parity.json")
rng = np.random.default_rng(0)

MIN_VIDEOS = 8      # chỉ xét từ có ít nhất 8 video
KEEP_ACC = 0.4      # chỉ dạy từ AI nhận đúng >= 40% số lần khi gặp người lạ (thử 40/50/60%: 40% nhiều từ nhất, nhầm vẫn ~5%)
TEMP = 5            # LDA hay quá tự tin: chia điểm cho TEMP để độ tự tin sát thực tế, ngưỡng mới có tác dụng
OTHER = "_khác"     # nhãn "không phải từ nào"; web/src/model.js dùng đúng chuỗi này
MAX_FALSE = 0.10    # chấp nhận tối đa 10% cử động lạ bị nhận nhầm thành chữ

# Mỗi ngôn ngữ ký hiệu: thư mục dữ liệu, số biến thể nhân bản (từ được dạy / "không phải từ nào"), co giãn ngang.
SETTINGS = {
    "vsl": dict(data=DATA, copies=10, other_copies=2, stretch=0.0),
    # ASL: mỗi từ ~380 mẫu nên 1 biến thể là đủ; co giãn ngang ±10% vì tỉ lệ khung video gốc chỉ là ước lượng
    "asl": dict(data=os.path.join(DATA, "asl"), copies=1, other_copies=2, stretch=0.1),
}
cfg = SETTINGS["vsl"]


def load():
    rows = list(csv.DictReader(open(os.path.join(cfg["data"], "labels.csv"), encoding="utf-8")))
    counts = collections.Counter(r["Meaning"] for r in rows)
    words = sorted(w for w, n in counts.items() if n >= MIN_VIDEOS and ":" not in w)
    index = {w: i for i, w in enumerate(words)}
    y = np.array([index.get(r["Meaning"], len(words)) for r in rows])  # từ không được dạy -> OTHER
    paths = [os.path.join(cfg["data"], "frames", r["ID_video"] + ".npy") for r in rows]
    with ThreadPoolExecutor(16) as ex:  # đọc song song: ASL có ~98.000 file nhỏ, đọc lần lượt mất ~15 phút
        frames = list(ex.map(np.load, paths))
    return rows, frames, words + [OTHER], y


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
    if cfg["stretch"]:                            # tỉ lệ khung hình lệch (chỉ ASL)
        pts[..., 0] *= rng.uniform(1 - cfg["stretch"], 1 + cfg["stretch"])
    present = np.concatenate([np.ones((len(f), 7)), np.repeat(f[:, -2:] > 0, 21, axis=1)], axis=1)[..., None]
    pts += rng.normal(0, 0.01, pts.shape) * present  # tay hơi run (chỉ chỗ có tay)
    f[:, :147] = pts.reshape(len(f), 147)
    return f


def build(frames, y, other):
    """Vector của mọi video kèm các biến thể. V = video gốc của từng dòng, O = dòng đó là bản gốc (không nhân bản)."""
    X, Y, V, O = [], [], [], []
    for i, (f, label) in enumerate(zip(frames, y)):
        for k in range(1 + cfg["other_copies" if label == other else "copies"]):
            X.append(sequence_vector(f if k == 0 else augment(f)))
            Y.append(label); V.append(i); O.append(k == 0)
    return np.array(X, np.float32), np.array(Y), np.array(V), np.array(O)


def fit(X, Y):
    """Phân tích biệt thức tuyến tính (LDA): mỗi nhãn một bộ trọng số, điểm cao nhất thắng.
    Thử trên 389 từ, LDA nhận đúng nhiều hơn hồi quy logistic và mạng nơ-ron nhỏ, lại học nhanh nhất.
    Trên web chỉ là nhân ma trận + softmax."""
    mean, std = X.mean(0), X.std(0)
    std[std < 1e-6] = 1
    clf = LinearDiscriminantAnalysis(solver="lsqr", shrinkage="auto")
    clf.fit((X - mean) / std, Y)
    return clf, mean, std


def scores(clf, mean, std, X, n_labels):
    """Điểm của mọi nhãn, đã chia TEMP; nhãn vắng mặt lúc học = -vô cực (không bao giờ thắng)."""
    D = np.full((len(X), n_labels), -np.inf)
    D[:, clf.classes_] = clf.decision_function((X - mean) / std) / TEMP
    return D


def splits(rows, y, other, k=5):
    signers = [r["Signer"] for r in rows]
    meaning = [r["Meaning"] for r in rows]
    sf, wf = np.empty(len(y), int), np.empty(len(y), int)
    for f, (_, te) in enumerate(GroupKFold(k).split(y, groups=signers)):
        sf[te] = f
    for f, (_, te) in enumerate(GroupKFold(k).split(y, groups=meaning)):
        wf[te] = f
    neg = y == other
    for f in range(k):
        yield (sf != f) & (~neg | (wf != f)), np.where(neg, wf == f, sf == f)


def word_accuracy(X, Y, V, O, y, rows, videos, other, k):
    """Chấm thử k phần trên các video được chọn: mỗi từ được nhận đúng bao nhiêu phần số lần (khi gặp người lạ)."""
    idx = np.where(videos)[0]
    hit, cnt = np.zeros(other), np.zeros(other)
    for tr, te in splits([rows[i] for i in idx], y[idx], other, k):
        a, b = np.zeros(len(y), bool), np.zeros(len(y), bool)
        a[idx[tr]], b[idx[te]] = True, True
        clf, mean, std = fit(X[a[V]], Y[a[V]])
        sel = b[V] & O
        guess, truth = scores(clf, mean, std, X[sel], other + 1)[:, :-1].argmax(1), y[V[sel]]
        m = truth != other
        np.add.at(cnt, truth[m], 1)
        np.add.at(hit, truth[m], guess[m] == truth[m])
    return hit / np.maximum(cnt, 1)


def relabel(acc, other):
    """Giữ các từ nhận đúng >= KEEP_ACC. Trả về chỉ số từ giữ lại và bảng đổi nhãn (từ bị loại -> OTHER)."""
    keep = np.where(acc >= KEEP_ACC)[0]
    remap = np.full(other + 1, len(keep))
    remap[keep] = np.arange(len(keep))
    return keep, remap


def evaluate(X, Y, V, O, y, rows, other):
    """Mỗi video được kiểm tra đúng 1 lần, khi AI chưa từng thấy người (hoặc từ) đó. Trả về cho từng video:
    từ AI đoán (-1 = không phải từ nào), độ tự tin, 5 từ điểm cao nhất, và từ đó có được dạy ở phần ấy không."""
    n = len(y)
    E = {"guess": np.full(n, -1), "conf": np.zeros(n), "top5": np.full((n, 5), -1), "taught": np.zeros(n, bool)}
    for f, (train, test) in enumerate(splits(rows, y, other), 1):
        keep, remap = relabel(word_accuracy(X, Y, V, O, y, rows, train, other, 4), other)
        clf, mean, std = fit(X[train[V]], remap[Y[train[V]]])
        sel = test[V] & O
        vids, D = V[sel], scores(clf, mean, std, X[sel], len(keep) + 1)
        P = softmax(D)
        best = P.argmax(1)
        E["guess"][vids] = np.where(best < len(keep), keep[np.minimum(best, len(keep) - 1)], -1)
        E["conf"][vids] = P.max(1)
        E["top5"][vids] = keep[np.argsort(-D[:, :-1], 1)[:, :5]]
        E["taught"][vids] = np.isin(y[vids], keep)
        print(f"  phần {f}/5 xong: dạy {len(keep)} từ", flush=True)
    return E


def rates(E, y, other, t):
    """Tỉ lệ khi app chỉ hiện chữ lúc AI đoán một từ với độ tự tin >= t."""
    said = (E["guess"] >= 0) & (E["conf"] >= t)
    right = E["guess"] == y
    pos, neg = E["taught"], y == other  # neg: video của từ AI chưa từng thấy ở bất kỳ ai
    return {"correct": float((said & right)[pos].mean()),   # nhận đúng
            "wrong": float((said & ~right)[pos].mean()),    # nhận nhầm sang từ khác
            "missed": float((~said)[pos].mean()),           # bỏ sót
            "false_alarm": float(said[neg].mean())}         # cử động lạ bị nhận thành chữ


def b64(a):
    return base64.b64encode(np.ascontiguousarray(a, "<f4").tobytes()).decode()


def quantize(W):
    """Nén trọng số về số nguyên 8-bit (-127..127), mỗi cột một hệ số tỉ lệ: model nhẹ đi 4 lần, gần như không đổi kết quả."""
    scale = np.abs(W).max(0) / 127
    scale[scale == 0] = 1
    return np.round(W / scale).astype(np.int8), scale.astype(np.float32)


def export(W, b, mean, std, labels, min_prob, metrics, lang="vsl"):
    """W (số đặc trưng, số nhãn), b (số nhãn): xác suất = softmax(((x - mean) / std) @ W + b). Trả về W sau khi nén."""
    q, scale = quantize(W)
    layers = [{"W": base64.b64encode(q.tobytes()).decode(), "scale": b64(scale), "b": b64(b), "shape": list(W.shape)}]
    out = model_path(lang)
    json.dump({"labels": labels, "T": T, "F": F, "minProb": min_prob, "mean": b64(mean), "std": b64(std),
               "layers": layers, "metrics": metrics},
              open(out, "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(labels[:-1], open(words_path(lang), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"Đã xuất {out} ({os.path.getsize(out) / 1e6:.1f} MB)")
    return q * scale


def softmax(z):
    z = z - z.max(-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(-1, keepdims=True)


def write_fixture(rows, W, b, mean, std):
    """Lưu một video thật: điểm thô -> khung -> vector -> xác suất, để web tự kiểm tra khớp Python."""
    from sign.landmarks import video_frames
    vid = next(n for n in os.listdir(os.path.join(DATA, "videos")) if n.startswith(rows[0]["ID_video"]))
    frames, raw, aspect = video_frames(os.path.join(DATA, "videos", vid), keep_raw=True)
    vec = sequence_vector(frames)
    probs = softmax(((vec - mean) / std) @ W + b)
    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    json.dump({"aspect": aspect, "raw": raw[:15], "frames": frames.tolist(), "vector": vec.tolist(), "probs": probs.tolist()},
              open(FIXTURE, "w"))


def main(lang="vsl"):
    global cfg
    cfg = SETTINGS[lang]
    rows, frames, labels, y = load()
    other = len(labels) - 1
    signers = len(set(r["Signer"] for r in rows))
    print(f"{len(rows)} video, {signers} người. Xét {other} từ có >= {MIN_VIDEOS} video; {(y == other).sum()} video "
          f"của {len(set(r['Meaning'] for r in rows)) - other} từ còn lại làm 'không phải từ nào'.")
    X, Y, V, O = build(frames, y, other)
    print(f"Sau nhân bản: {len(X)} mẫu. Đang chấm điểm trên người lạ...")
    E = evaluate(X, Y, V, O, y, rows, other)

    pos = E["taught"]
    top1 = float((E["top5"][pos, 0] == y[pos]).mean())
    top5 = float((E["top5"][pos] == y[pos, None]).any(1).mean())
    print(f"Người lạ: đúng ngay lần đoán đầu {top1:.1%}, nằm trong 5 gợi ý đầu {top5:.1%}")
    print(" ngưỡng  nhận đúng  nhận nhầm  bỏ sót  cử động lạ bị nhận thành chữ")
    table = {}
    for t in np.round(np.arange(0, 0.96, 0.05), 2):
        table[t] = r = rates(E, y, other, t)
        print(f"  {t:.2f}    {r['correct']:6.1%}    {r['wrong']:6.1%}   {r['missed']:6.1%}   {r['false_alarm']:6.1%}")
    min_prob = float(next((t for t, r in table.items() if r["false_alarm"] <= MAX_FALSE), max(table)))
    chosen = table[min_prob]
    print(f"Chọn ngưỡng {min_prob:.2f}: " + ", ".join(f"{k} {v:.1%}" for k, v in chosen.items()))

    print("Chọn từ trên toàn bộ dữ liệu rồi dạy bản cuối...")
    keep, remap = relabel(word_accuracy(X, Y, V, O, y, rows, np.ones(len(y), bool), other, 5), other)
    clf, mean, std = fit(X, remap[Y])
    b = clf.intercept_ / TEMP
    W = export(clf.coef_.T / TEMP, b, mean, std, [labels[i] for i in keep] + [OTHER], min_prob,
               {"signer_independent": top1, "top5": top5, **chosen, "threshold": min_prob,
                "model": f"LinearDiscriminantAnalysis lsqr shrinkage=auto, /{TEMP}", "words": len(keep),
                "candidates": other, "videos": len(rows), "signers": signers}, lang)
    print(f"Dạy {len(keep)}/{other} từ.")
    if lang == "vsl":  # bài đối chiếu web/Python dùng một video VieSign thật
        write_fixture(rows, W, b, mean, std)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "vsl")
