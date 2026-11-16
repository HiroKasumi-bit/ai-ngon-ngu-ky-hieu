"""Tải video của 20 từ chủ đề khám bệnh từ bộ VieSign-10K (Zenodo, CC BY 4.0).

Gói gốc nặng 5,9 GB. Ta chỉ đọc "mục lục" ở cuối file zip, rồi tải riêng từng video cần
bằng HTTP Range, tổng khoảng 130 MB.
Nguồn: Cap Pham Dinh Thang, VieSign-10K, https://zenodo.org/records/23610105 (CC BY 4.0).
Chạy: uv run python fetch_viesign.py
"""
import csv, io, os, urllib.request, zipfile

URL = "https://zenodo.org/records/23610105/files/VieSign10K.zip?download=1"
WORDS = ["giúp_đỡ", "hiểu", "không_hiểu", "đúng", "sai", "mời",
         "bác_sĩ", "y_tá", "bệnh_nhân", "bệnh_viện", "trạm_y_tế", "xe_cứu_thương", "cấp_cứu",
         "tiêm", "chữa_bệnh", "khẩu_trang",
         "mệt", "ho", "cảm_cúm", "sợ_hãi"]
OUT = os.path.join(os.path.dirname(__file__), "data")


class RangeFile(io.RawIOBase):
    """File trên mạng, đọc từng đoạn theo yêu cầu (không tải cả file)."""
    def __init__(self, url):
        self.url, self.pos = url, 0
        self.size = int(urllib.request.urlopen(urllib.request.Request(url, method="HEAD")).headers["Content-Length"])
    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos
    def seek(self, off, whence=0):
        self.pos = [off, self.pos + off, self.size + off][whence]
        return self.pos
    def readinto(self, b):
        if self.pos >= self.size: return 0
        end = min(self.pos + len(b), self.size) - 1
        req = urllib.request.Request(self.url, headers={"Range": f"bytes={self.pos}-{end}"})
        data = urllib.request.urlopen(req).read()
        b[:len(data)] = data
        self.pos += len(data)
        return len(data)


def main():
    os.makedirs(os.path.join(OUT, "videos"), exist_ok=True)
    z = zipfile.ZipFile(io.BufferedReader(RangeFile(URL), buffer_size=1 << 20))
    rows = list(csv.DictReader(io.TextIOWrapper(z.open("VieSign10K/ISLR_447_all_rows.csv"), "utf-8-sig")))
    rows = [r for r in rows if r["Meaning"] in WORDS]
    with open(os.path.join(OUT, "labels.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ID_video", "Meaning", "Signer"])
        for r in rows:
            w.writerow([r["ID_video"], r["Meaning"], r["Signer"]])
    # video có thể là .mp4 hoặc .webm: tìm đúng tên theo mã video
    by_id = {os.path.splitext(os.path.basename(n))[0]: n for n in z.namelist() if "/video_raw/" in n}
    total = 0
    for i, r in enumerate(rows, 1):
        src = by_id[r["ID_video"]]
        dst = os.path.join(OUT, "videos", os.path.basename(src))
        if not os.path.exists(dst):
            open(dst, "wb").write(z.read(src))
        total += os.path.getsize(dst)
        print(f"\r{i}/{len(rows)} video, {total / 1e6:.0f} MB", end="", flush=True)
    print()
    for word in WORDS:
        print(f"{word:15s} {sum(r['Meaning'] == word for r in rows)} video")


if __name__ == "__main__":
    main()
