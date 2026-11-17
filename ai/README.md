# Phần AI: dạy máy hiểu ngôn ngữ ký hiệu Việt Nam

Thư mục này dạy AI nhận ra **183 ký hiệu ngôn ngữ ký hiệu Việt Nam**, đồng thời **bỏ qua cử động không phải ký hiệu nó biết**, rồi xuất "bộ não" AI cho website dùng.

## AI hoạt động thế nào

```
Video ký hiệu ──► MediaPipe chấm điểm ──► 149 con số mỗi khung ──► 8 khung + số liệu tổng hợp (2.024 số) ──► LDA ──► "khẩu trang" (89%) hoặc "không phải từ nào"
```

1. **Mắt (MediaPipe của Google)** tìm hai bàn tay và cơ thể trong từng khung hình. Mỗi bàn tay được chấm 21 điểm khớp. Trên người lấy 7 điểm: mũi, hai vai, hai khuỷu tay, hai cổ tay.
2. **Bộ đo cử chỉ** (`sign/features.py`) đổi các điểm đó thành 149 con số. Mọi vị trí được tính so với hai vai, nên AI biết tay đang ở gần mặt hay trước ngực, dù người đứng xa hay gần camera.
3. **Gom cả ký hiệu.** Một ký hiệu kéo dài khoảng 1–2 giây. Máy làm như sau:
   - cắt bỏ phần đầu và cuối không có tay;
   - chọn **8 khung đều nhau** để giữ thứ tự chuyển động;
   - thêm **vị trí trung bình, độ dao động và độ dao động tốc độ** của cả chuỗi;
   - thêm **hình dạng tay** cho mỗi bàn tay: ngón tay tính từ cổ tay, chia cho độ dài lòng bàn tay, nên không phụ thuộc người đứng xa hay gần.
4. **Bộ não** là phân tích biệt thức tuyến tính (LDA): mỗi nhãn có một bộ trọng số, nhãn nào được điểm cao nhất thì thắng.
   - Ngoài 183 từ còn một nhãn **"không phải từ nào"**, học từ video của các từ AI không dạy.
   - App chỉ hiện chữ khi AI đoán ra một từ thật **và** đủ tự tin (từ 45% trở lên). Còn lại thì bỏ qua.
   - Trọng số được nén về số nguyên 8-bit, nên cả bộ não chỉ nặng 0,5 MB.

## Dữ liệu

- Lấy từ **VieSign-10K** của tác giả Cap Pham Dinh Thang, đăng trên Zenodo (https://zenodo.org/records/23610105), giấy phép **CC BY 4.0**. Giấy phép này cho dùng cả vào mục đích thương mại, miễn là ghi nguồn.
- Cả gói có 7.664 video, 1.182 từ, 57 người. Nhưng đa số từ chỉ có 3–4 video.
- **Chọn từ để dạy:**
  1. Xét 389 từ có ít nhất 8 video.
  2. Chấm thử trên người lạ. Từ nào AI nhận đúng dưới 40% thì không dạy: có 206 từ như vậy, ví dụ bác sĩ, mệt, ho, vì các từ này dễ lẫn với từ khác. Còn lại **183 từ**.
  3. Video của tất cả các từ không dạy (999 từ) dùng làm ví dụ cho nhãn "không phải từ nào".
- **Nhân bản dữ liệu:** từ mỗi video, máy tạo thêm 10 biến thể: lật gương (để AI hiểu cả người thuận tay trái), xoay nhẹ, to nhỏ, cắt đầu cuối, tay hơi run.

## Độ chính xác (số thật)

Kết quả lần train ngày 17/11/2026, chấm trên **người lạ**: người làm ký hiệu lúc kiểm tra chưa từng xuất hiện lúc AI học. Bước chọn từ cũng làm lại trong mỗi lần chấm và chỉ dựa trên dữ liệu học, để con số không bị đẹp giả.

| Khi bắt buộc chọn 1 trong 183 từ | Kết quả |
|---|---|
| Đoán đúng ngay lần đầu | **59,8%** |
| Từ đúng nằm trong 5 gợi ý đầu | 73,8% |

Khi chạy thật, app chỉ hiện chữ lúc AI đủ tự tin (ngưỡng 0,45):

| Người dùng làm | Nhận đúng | Nhận nhầm sang từ khác | Không hiện gì |
|---|---|---|---|
| Một trong 183 từ | **35,6%** | 4,2% | 60,1% |
| Ký hiệu của từ AI chưa từng thấy (giống giơ tay bừa) | — | **8,5%** bị nhận thành chữ | 91,5% |

App **ít khi nói sai, nhưng hay bỏ sót**. Nếu không thấy chữ hiện ra, người dùng làm lại ký hiệu rõ hơn.

**Các cách đã thử** (chấm trên người lạ):
- **Chọn kiểu AI** (dạy cả 389 từ, cùng một phần kiểm tra, tính "đúng ngay lần đầu"):
  - LDA: 32,5%
  - hồi quy logistic: 23,6%
  - mạng nơ-ron nhỏ: 20,6%
- **Dạy cả 389 từ** thì khi bật bộ lọc, app chỉ nhận đúng 17% và bỏ sót 76%. Vì vậy chỉ dạy những từ AI học được.
- **Riêng 20 từ khám bệnh**, có bộ lọc: chỉ nhận đúng 17%. Dữ liệu hiện có chưa đủ để nhận tin cậy các từ này.
- **Bản cũ ngày 16/11** (20 từ khám bệnh): đạt 63,8% khi bắt buộc chọn 1 trong 20 từ. Nhưng bản đó không có nhãn "không phải từ nào", nên cử động bừa cũng bị dịch thành chữ.

**Muốn chính xác hơn:** cần nhiều video hơn cho mỗi từ (VSL400, hoặc nhóm tự thu), nhất là các từ khám bệnh.

Số mới nhất luôn nằm ở `metrics` trong `web/public/model/model.json`.

## Các file

| File | Làm gì |
|---|---|
| `fetch_viesign.py` | Tải cả gói VieSign-10K (5,9 GB) theo từng mảnh 32 MB, tải song song và tự thử lại khi Zenodo lỗi. Sau đó giải nén video và ghi `data/labels.csv`. |
| `sign/landmarks.py` | Cho máy "xem" một video bằng MediaPipe, rồi đổi ra các con số. |
| `sign/features.py` | Bộ đo cử chỉ. File `web/src/features.js` là bản dịch y hệt sang JavaScript. |
| `extract_all.py` | Xem toàn bộ video, chạy song song nhiều nhân CPU. Với 7.664 video mất khoảng 2 giờ. |
| `train.py` | Chọn từ AI học được, nhân bản dữ liệu, dạy LDA, chấm điểm trung thực, chọn ngưỡng tự tin. Xuất `model.json` và `web/src/words.json` (danh sách cho trang Từ vựng). Mất khoảng 20 phút. |
| `tests/` | Kiểm thử tự động, gồm cả bài đối chiếu để bản web và bản Python tính ra cùng một kết quả. |

## Chạy lại từ đầu

```bash
uv sync
uv run python fetch_viesign.py
curl -L -o models/hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
curl -L -o models/pose_landmarker_lite.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task
uv run python extract_all.py
uv run python train.py
uv run pytest -q
```
