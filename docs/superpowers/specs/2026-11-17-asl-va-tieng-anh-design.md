# Thêm ASL và giao diện tiếng Anh (17/11/2026)

## Vì sao
- Dữ liệu VSL đang bí: muốn thêm "xin chào", "cảm ơn" thì phải xin phép hoặc tự quay. Nhóm muốn có thêm một lựa chọn quốc tế.
- International Sign không có bộ từ chuẩn và không có dữ liệu công khai, nên chọn **ASL** (ngôn ngữ ký hiệu Mỹ). Đây là ngôn ngữ ký hiệu phổ biến nhất thế giới, có dữ liệu mở lớn.
- Giao diện vẫn mặc định tiếng Việt, nhưng chuyển được sang tiếng Anh cho người dùng ASL.

## Người dùng chọn
- Giữ **VSL làm chính**. Ở góc trên có nút chọn **VSL | ASL** và nút đổi giao diện **VI | EN**.
- Gọi đúng tên là ASL, không gọi là "quốc tế".

## Dữ liệu ASL
| Nguồn | Giấy phép | Kết luận |
|---|---|---|
| **Google ISLR** (Kaggle asl-signs, 250 từ, 94.477 mẫu, 21 người, điểm khớp MediaPipe) | CC BY 4.0, của Deaf Professional Arts Network và Georgia Tech | **Dùng**, ghi nguồn |
| ASL Citizen (Microsoft) | Chỉ cho nghiên cứu phi thương mại, cấm đưa lên làm dịch vụ | Không dùng |
| WLASL | C-UDA, chỉ cho học thuật | Không dùng |

- Tải bằng tài khoản Kaggle của người dùng: người dùng tự đồng ý luật cuộc thi và tự đặt `kaggle.json`.
- Dữ liệu đã là điểm khớp MediaPipe Holistic (33 điểm người, 21 điểm mỗi tay), nên đổi thẳng sang 149 số/khung bằng `frame_features`. Không cần trích lại từ video.
- Không biết tỉ lệ khung hình của video gốc. Ước lượng bằng tỉ lệ cơ thể (bề rộng vai so với khoảng mũi–vai) đối chiếu với VieSign. Thêm biến thể co giãn ngang khi nhân bản dữ liệu để AI chịu được sai lệch.

## Cách làm
- **AI:** dùng chung `train.py` (LDA, nhãn `_khác`, chọn từ học được, chấm trung thực theo người, ngưỡng tự tin, trọng số 8-bit). Mỗi ngôn ngữ xuất riêng `web/public/model/<vsl|asl>.json` và `web/src/words/<vsl|asl>.json`.
- **Tên từ hai thứ tiếng:** `web/src/words/<vsl|asl>.names.json` ghi tên hiển thị tiếng Việt và tiếng Anh cho từng nhãn. Có test bắt buộc mọi nhãn đều có đủ tên.
- **Giao diện:** `i18n.js` giữ mọi câu chữ Việt/Anh. Có test bắt buộc hai thứ tiếng đủ khóa như nhau. Lựa chọn được nhớ trong máy (localStorage).
  - Giọng đọc và nghe đi theo ngôn ngữ giao diện (vi-VN / en-US).
  - Câu ghép từ ký hiệu hiện theo ngôn ngữ giao diện.
- **Đổi ngôn ngữ ký hiệu:** tải model tương ứng khi cần, dùng chung "mắt" MediaPipe. Nếu camera đang chạy thì đổi ngay, không phải bật lại.
- **Trang Từ vựng:** hiện từ của ngôn ngữ đang chọn, ghi nguồn dữ liệu tương ứng.

## Không làm lần này
- International Sign, dịch câu, VSL thêm từ chào hỏi (chờ dữ liệu xin phép hoặc tự quay).

## Kết quả (18/11/2026)
- **Kiểm tra trước:** dạy bằng điểm Holistic rồi chạy trên điểm MediaPipe Tasks của web không bị tụt (VSL 183 từ, một phần kiểm tra: Tasks→Tasks 74,2%, Holistic→Tasks 74,4%).
- **Nhãn "không phải từ nào" cho ASL:** 6.837 video VieSign chấm bằng Holistic (`ai/extract_holistic.py`). Bỏ 827 video của từ cùng nghĩa với một từ ASL; đã thử cả hai cách, kết quả gần như nhau.
- **Tỉ lệ khung ước lượng:** 0,55–0,78 (điện thoại dọc), lưu ở `ai/data/asl/aspect.json` để chạy lại vẫn đổi dữ liệu y như cũ.
- **ASL, người lạ:** dạy 112/250 từ; đoán đúng ngay lần đầu 57,3%, top 5 78,2%. Ngưỡng 0,20: nhận đúng 23,2%, nhầm 3,6%, bỏ sót 73,1%, ký hiệu lạ bị nhận thành chữ 9,1%.
- **Giới hạn:** LDA đã hết sức với ASL (30 mẫu đã học mà chỉ đoán đúng 16). Bước sau: thử mạng nơ-ron; `web/src/model.js` đã chạy được nhiều lớp.
- Web và Python tính khớp nhau trên 30 mẫu ASL thật (lệch < 1e-6). Có test quét `index.html` để không còn chữ tiếng Việt nào thiếu bản dịch.
