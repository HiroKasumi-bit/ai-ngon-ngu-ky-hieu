# Phần AI: dạy máy hiểu ngôn ngữ ký hiệu Việt Nam

Thư mục này dạy AI nhận ra **20 ký hiệu chủ đề khám bệnh**, rồi xuất "bộ não" AI cho website dùng.

## AI hoạt động thế nào

```
Video ký hiệu ──► MediaPipe chấm điểm ──► 149 con số mỗi khung ──► 184 số (x,y + hình dạng tay) ──► 8 khung + số liệu tổng hợp ──► hồi quy logistic ──► "bác sĩ" (81%)
```

1. **Mắt (MediaPipe của Google)** tìm hai bàn tay và cơ thể trong từng khung hình. Mỗi bàn tay được chấm 21 điểm khớp. Trên người lấy 7 điểm: mũi, hai vai, hai khuỷu tay, hai cổ tay.
2. **Bộ đo cử chỉ** (`sign/features.py`) đổi các điểm đó thành 149 con số. Mọi vị trí được tính so với hai vai, nên AI biết tay đang ở gần mặt hay trước ngực, dù người đứng xa hay gần camera.
3. Một ký hiệu kéo dài khoảng 1–2 giây. Máy cắt bỏ phần đầu và cuối không có tay, chọn **8 khung đều nhau** (giữ thứ tự chuyển động), rồi thêm **vị trí trung bình, độ dao động và độ dao động tốc độ** của cả chuỗi. Mỗi bàn tay có thêm **hình dạng tay** (ngón tay tính từ cổ tay, chia độ dài lòng bàn tay) nên không phụ thuộc người đứng xa hay gần.
4. **Bộ não** là hồi quy logistic: mỗi từ có một bộ trọng số, từ nào được điểm cao nhất thì thắng. Đơn giản, nhẹ (0,2 MB), hợp với dữ liệu ít.

## Dữ liệu

- Lấy từ **VieSign-10K** của tác giả Cap Pham Dinh Thang, đăng trên Zenodo (https://zenodo.org/records/23610105), giấy phép **CC BY 4.0**. Giấy phép này cho dùng cả vào mục đích thương mại, miễn là ghi nguồn.
- Chỉ tải video của 20 từ: 243 video, 101 MB, do nhiều người khác nhau ra ký hiệu.
- **Nhân bản dữ liệu**: từ mỗi video, máy tạo thêm 10 biến thể. Ví dụ lật gương (để AI hiểu cả người thuận tay trái), xoay nhẹ, to nhỏ, cắt đầu cuối, tay hơi run.

## Độ chính xác (số thật)

Kết quả lần train ngày 16/11/2026 (243 video, 25 người, 20 từ; đoán bừa chỉ đúng 5%):

| Cách chấm | Độ chính xác |
|---|---|
| **Người lạ** (kiểm tra trên người AI chưa từng thấy) | **63,8%** |
| Chia ngẫu nhiên | 77,8% |
| Model cũ trên Drive (100 từ ASL) | 4,2% |

Thử trọn vòng trên website với video ghép "bác sĩ → mệt → ho": tách đúng 3 ký hiệu, nhận đúng 2 (bác sĩ bị nhầm thành mệt).
Model cuối là hồi quy logistic (0,2 MB). Đã thử MLP (33%), SVM, kNN; cách biểu diễn có "hình dạng bàn tay" + số liệu tổng hợp cả chuỗi giúp tăng từ 33% lên ~62–64%.
Muốn chính xác hơn: cần nhiều video hơn cho mỗi từ (VSL400, hoặc nhóm tự thu).

Số mới nhất luôn nằm ở `metrics` trong `web/public/model/model.json`. Có hai cách chấm:

- **Người lạ**: kiểm tra trên những người AI *chưa từng thấy* khi học. Đây là con số trung thực, nên dùng con số này khi trình bày.
- **Chia ngẫu nhiên**: người kiểm tra có thể đã xuất hiện lúc học, nên dễ hơn. Con số này chỉ để tham khảo.

## Các file

| File | Làm gì |
|---|---|
| `fetch_viesign.py` | Tải video của 20 từ. Chỉ đọc đúng phần cần, không tải cả gói 5,9 GB. |
| `sign/landmarks.py` | Cho máy "xem" một video bằng MediaPipe, rồi đổi ra các con số. |
| `sign/features.py` | Bộ đo cử chỉ. File `web/src/features.js` là bản dịch y hệt sang JavaScript. |
| `extract_all.py` | Xem toàn bộ video, chạy song song nhiều nhân CPU. |
| `train.py` | Nhân bản dữ liệu (10 biến thể/video), dạy AI, chấm điểm trung thực, xuất `model.json` cho web. |
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
