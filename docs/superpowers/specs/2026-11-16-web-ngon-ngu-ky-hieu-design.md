# Thiết kế: Website dịch ngôn ngữ ký hiệu Việt Nam (giai đoạn 1)

Ngày: 16/11/2026 · Trạng thái: đã được người dùng duyệt trong hội thoại ("Ok vậy giờ làm web đi 20 từ chủ đề khám bệnh").

## Mục đích và lý do

Website giúp người Điếc trò chuyện với người nghe. Người Điếc ra ký hiệu trước camera, AI nhận diện rồi hiện thành chữ và đọc thành tiếng. Người nghe nói vào micro, câu nói hiện thành chữ cho người Điếc đọc.

Đây là bản demo cho cuộc thi "Học sinh với ý tưởng khởi nghiệp" của nhóm 11A4, THPT Lê Quý Đôn. Nếu vào vòng trong, dự án sẽ phát triển thành app. Người dùng chính dùng trên điện thoại; khi trình bày trước giám khảo thì chạy trên laptop.

## Mục tiêu

- Nhận diện **20 ký hiệu ngôn ngữ ký hiệu Việt Nam** thuộc chủ đề khám bệnh, qua camera, theo thời gian thực.
- Trò chuyện **hai chiều**: ký hiệu thành chữ và tiếng nói; tiếng nói thành chữ.
- **Dịch video**: tải một video lên, máy liệt kê các ký hiệu nhận được.
- **Nhanh**: AI chạy ngay trong trình duyệt, không gửi video lên máy chủ.
- **Code ngắn, dễ hiểu**: nhóm phải tự giải thích được từng phần.
- Giao diện thân thiện, đẹp, không có kiểu "nhìn là biết AI làm" (xem quy tắc thẩm mỹ trong CLAUDE.md toàn cục).

## Không làm ở giai đoạn này

Trang thu dữ liệu, tính năng học, găng tay, bảng chữ cái đánh vần, AI ghép câu bằng mô hình ngôn ngữ, đăng nhập và tài khoản. Bản thiết kế vẫn để sẵn chỗ cho các phần này.

## Những gì sẽ coi là thất bại

- Báo độ chính xác cao hơn thực tế.
- Dùng code hay dữ liệu của người khác mà không có giấy phép.
- Tự chế ra ký hiệu.
- Gửi video của người dùng ra khỏi máy họ.

## Ràng buộc

**Dữ liệu.** Lấy từ VieSign-10K (Zenodo, giấy phép CC BY 4.0, tác giả Cap Pham Dinh Thang). Phải ghi nguồn trên website và trong thuyết minh. Chỉ tải video của 20 từ, khoảng 130 MB, bằng cách đọc từng phần (HTTP Range) gói zip 5,9 GB.

**20 từ:**

| Nhóm | Các từ |
|---|---|
| Giao tiếp | giúp_đỡ, hiểu, không_hiểu, đúng, sai, mời |
| Người và nơi chốn | bác_sĩ, y_tá, bệnh_nhân, bệnh_viện, trạm_y_tế, xe_cứu_thương, cấp_cứu |
| Khám chữa | tiêm, chữa_bệnh, khẩu_trang |
| Triệu chứng | mệt, ho, cảm_cúm, sợ_hãi |

Mỗi từ có khoảng 10–13 video, do 4–10 người làm.

**Công cụ được phép dùng** (mã nguồn mở, có ghi nguồn):
- MediaPipe Tasks (Apache 2.0): HandLandmarker và PoseLandmarker, dùng **cùng loại model** ở bước train (Python) và trên web (JS), để dữ liệu hai bên khớp nhau.
- numpy, scikit-learn, opencv và pandas để train.
- Vite để chạy và đóng gói web.

**Trình duyệt.** Giọng đọc dùng `speechSynthesis` (vi-VN). Nhận giọng nói dùng `SpeechRecognition` (vi-VN), tốt nhất trên Chrome và Edge. Trình duyệt không hỗ trợ thì ẩn nút micro và báo rõ cho người dùng.

## Các cách đã cân nhắc

| Cách | Đánh đổi | Kết quả |
|---|---|---|
| A. Giữ Streamlit, model chạy trên máy chủ | Chậm. Camera mở là camera của máy chủ chứ không phải của người dùng. Không đưa lên web được. | Loại |
| B. Gửi video lên máy chủ, AI xử lý ở đó | Trễ do mạng, tốn tiền thuê máy chủ, ảnh hưởng quyền riêng tư | Loại |
| **C. MediaPipe và model nhỏ chạy ngay trong trình duyệt** | Nhanh, riêng tư, đưa lên mạng miễn phí. Model phải nhỏ. | **Chọn** |

Về model, chọn cách nhẹ nhất: scikit-learn MLP. Trọng số được xuất ra JSON, và phần tính toán trên web viết tay khoảng 20 dòng JS. Nhờ vậy web không cần nạp thêm thư viện AI nào. Nếu MLP kém rõ rệt so với model đọc chuỗi (1D-CNN hoặc GRU), mới cân nhắc đổi.

## Thiết kế kỹ thuật

### Đặc trưng mỗi khung hình

Gốc toạ độ là điểm giữa hai vai, đơn vị là bề rộng vai. Nhờ vậy giữ được vị trí tay so với cơ thể; bản cũ làm mất thông tin này.

- **Pose:** mũi, hai vai, hai khuỷu tay, hai cổ tay (7 điểm × xyz).
- **Hai bàn tay:** mỗi tay 21 điểm × xyz.
  - Tay nào là trái hay phải được xác định theo **cổ tay pose gần nhất**, không dùng nhãn trái/phải của MediaPipe (nhãn đó giả định ảnh đã lật gương).
  - Tay không thấy thì điền 0, kèm cờ có/không.

### Chuỗi ký hiệu

- Bỏ các khung không thấy tay ở đầu và cuối video.
- Lấy mẫu lại thành T = 24 khung đều nhau. Một chuỗi biến thành một vector phẳng.
- Thêm đặc trưng tốc độ: hiệu giữa hai khung liên tiếp.

### Huấn luyện

- **Nhân bản dữ liệu:** lật gương (đổi trái/phải, đổi dấu x), co giãn thời gian, xoay nhẹ, co giãn kích thước, thêm nhiễu.
- **Đánh giá trung thực:** chia train và test theo người làm ký hiệu, để kiểm tra AI với người lạ. Báo cả hai con số: test theo người lạ và test thường.

### Nhận diện liên tục trên web

- Cửa sổ trượt khoảng 1,2 giây cuối. Cứ khoảng 4 khung hình thì dự đoán một lần.
- Chỉ nhận một từ khi đủ ba điều kiện:
  - tay đang hiện,
  - độ tin cậy ≥ ngưỡng,
  - cùng một từ thắng ở ít nhất 3 lần dự đoán liên tiếp.
- Sau khi nhận một từ thì có thời gian chờ, hoặc chờ người dùng hạ tay.

### Ghép câu (giai đoạn 1)

Nối các từ đã nhận thành câu nháp mà người dùng sửa được: xoá từ cuối, xoá hết, hoặc gửi. Khi gửi, câu được đọc to và vào khung chat. Đây là một khối riêng, để giai đoạn sau có thể thay bằng AI ghép câu.

## Giao diện

Ưu tiên điện thoại, giãn ra cho laptop.

### Trang chính: Trò chuyện

- **Điện thoại:** từ trên xuống gồm khung camera bo góc (có chip từ đang nhận và thanh độ tin cậy), dải câu nháp với nút gửi, khung chat hai bên (bên người Điếc và bên người nghe), thanh dưới có nút micro lớn cho người nghe.
- **Laptop:** camera bên trái, khung chat bên phải.

### Các trang khác

- **Dịch video:** chọn file, xem tiến trình, rồi ra danh sách từ theo thời gian.
- **Từ vựng:** 20 từ chia theo nhóm, giúp người dùng biết app hiểu được những gì.

### Phong cách

- **Bảng màu thương hiệu:** xanh ngọc `#1FB3A6`, vàng `#FFC431`, xanh đậm `#18265A`, nền `#F3FAF9`.
- **Chữ:** font Lexend, có đủ dấu tiếng Việt và đủ các độ đậm.
- **Logo:** logo đôi tay.
- **Không dùng:** glow, khối 3D giả, gradient neon.
- **Chuyển động:** nhẹ và có ý nghĩa, ví dụ chip từ nảy nhẹ khi nhận được một từ.

### Tiếp cận

- Chữ lớn, độ tương phản đủ.
- Không dựa vào âm thanh để báo trạng thái, vì người dùng là người Điếc.
- Bàn phím dùng được.

## Phần để người làm tự quyết

Chọn cụ thể giữa MLP và CNN theo độ chính xác đo được. Ngưỡng tin cậy và thời gian chờ chỉnh theo thử nghiệm. Chi tiết bố cục và chuyển động thì làm theo skill `impeccable`.
