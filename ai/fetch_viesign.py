"""Tải bộ VieSign-10K (Zenodo, CC BY 4.0) rồi lấy ra video và danh sách nhãn.

Gói gốc nặng 5,9 GB, máy chủ Zenodo chậm và đôi khi báo lỗi. Vì vậy ta chia file thành từng
mảnh 32 MB, tải song song 12 mảnh một lúc, mảnh nào lỗi thì tự thử lại. Chạy lại script sẽ bỏ qua
những mảnh đã tải xong.
Nguồn: Cap Pham Dinh Thang, VieSign-10K, https://zenodo.org/records/23610105 (CC BY 4.0).
Chạy: uv run python fetch_viesign.py
"""
import collections, csv, io, os, shutil, time, urllib.request, zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

URL = "https://zenodo.org/records/23610105/files/VieSign10K.zip?download=1"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
ZIP = os.path.join(OUT, "VieSign10K.zip")
PART = 32 << 20


def get(start, end):
    """Tải đoạn byte [start, end]; lỗi thì chờ một chút rồi thử lại, tối đa 10 lần."""
    for k in range(10):
        try:
            req = urllib.request.Request(URL, headers={"Range": f"bytes={start}-{end}"})
            data = urllib.request.urlopen(req, timeout=120).read()
            if len(data) == end - start + 1:
                return data
        except Exception:
            pass
        time.sleep(min(60, 5 * (k + 1)))
    raise RuntimeError(f"Không tải được đoạn {start}-{end}, hãy chạy lại script")


def download():
    if os.path.exists(ZIP):
        return
    size = int(urllib.request.urlopen(urllib.request.Request(URL, method="HEAD")).headers["Content-Length"])
    parts = os.path.join(OUT, "zip-parts")
    os.makedirs(parts, exist_ok=True)
    jobs = [(os.path.join(parts, f"{i:04d}"), s, min(s + PART, size) - 1) for i, s in enumerate(range(0, size, PART))]

    def one(job):
        path, s, e = job
        if not (os.path.exists(path) and os.path.getsize(path) == e - s + 1):
            open(path + ".tmp", "wb").write(get(s, e))
            os.replace(path + ".tmp", path)

    with ThreadPoolExecutor(12) as ex:
        for k, fut in enumerate(as_completed([ex.submit(one, j) for j in jobs]), 1):
            fut.result()
            print(f"\rĐã tải {k}/{len(jobs)} mảnh", end="", flush=True)
    print()
    with open(ZIP + ".tmp", "wb") as f:
        for path, *_ in jobs:
            with open(path, "rb") as p:
                shutil.copyfileobj(p, f)
    os.replace(ZIP + ".tmp", ZIP)
    shutil.rmtree(parts)


def main():
    os.makedirs(os.path.join(OUT, "videos"), exist_ok=True)
    download()
    z = zipfile.ZipFile(ZIP)
    rows = list(csv.DictReader(io.TextIOWrapper(z.open("VieSign10K/ISLR_447_all_rows.csv"), "utf-8-sig")))
    with open(os.path.join(OUT, "labels.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ID_video", "Meaning", "Signer"])
        for r in rows:
            w.writerow([r["ID_video"], r["Meaning"], r["Signer"]])
    # video có thể là .mp4 hoặc .webm: tìm đúng tên theo mã video
    by_id = {os.path.splitext(os.path.basename(n))[0]: n for n in z.namelist() if "/video_raw/" in n}
    for i, r in enumerate(rows, 1):
        src = by_id[r["ID_video"]]
        dst = os.path.join(OUT, "videos", os.path.basename(src))
        if not os.path.exists(dst):
            with z.open(src) as a, open(dst, "wb") as b:
                shutil.copyfileobj(a, b)
        print(f"\rĐã lấy {i}/{len(rows)} video", end="", flush=True)
    counts = collections.Counter(r["Meaning"] for r in rows)
    print(f"\n{len(counts)} từ, {len(rows)} video, {len({r['Signer'] for r in rows})} người.")
    for k in (3, 8, 10):
        print(f"  Từ có ít nhất {k} video: {sum(n >= k for n in counts.values())}")


if __name__ == "__main__":
    main()
