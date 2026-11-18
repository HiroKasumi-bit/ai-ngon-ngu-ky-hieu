# SignBridge AI: phiên dịch ngôn ngữ ký hiệu Việt Nam

**Dùng thử:** https://signbridge-vn.pages.dev

SignBridge AI giúp người Điếc và người nghe trò chuyện với nhau:

- **Người Điếc** ra ký hiệu trước camera. AI nhận diện, chuyển thành chữ và đọc to cho người đối diện.
- **Người nghe** bấm micro rồi nói. Câu nói hiện thành chữ để người Điếc đọc.
- **Dịch video:** tải lên một video có người ra ký hiệu, máy liệt kê các từ nhận được.

AI chạy **ngay trong trình duyệt**. Hình ảnh từ camera không bị gửi đi đâu.

Ngôn ngữ chính là **ngôn ngữ ký hiệu Việt Nam (VSL)**. Nút ở góc trên đổi sang **ngôn ngữ ký hiệu Mỹ (ASL)**, và đổi chữ trên giao diện giữa tiếng Việt và tiếng Anh.

> Đây là bản thử nghiệm. App bỏ qua cử động không phải ký hiệu nó biết, và chỉ hiện chữ lúc đủ tự tin, nên ít khi nói sai nhưng hay bỏ sót.
> - **VSL:** nhận diện **183 ký hiệu**. Với người chưa từng gặp, AI đoán đúng ngay lần đầu khoảng 60%. Khi chạy thật, khoảng 1/3 số lần ra ký hiệu được nhận đúng, nói sai khoảng 4%.
> - **ASL:** nhận diện **112 ký hiệu**. Đoán đúng ngay lần đầu khoảng 57%. Khi chạy thật, chỉ khoảng 1/4 số lần ra ký hiệu được nhận đúng, nói sai khoảng 4%.
>
> Khi dùng, hãy ra từng ký hiệu rõ ràng và hạ tay xuống sau mỗi từ. Nếu không thấy chữ hiện ra, làm lại ký hiệu. Số đo chi tiết ở [ai/README.md](ai/README.md).

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| [`web/`](web/) | Website (Vite + JavaScript). Xem [web/README.md](web/README.md). |
| [`ai/`](ai/) | Dạy AI bằng Python: tải dữ liệu, trích điểm khớp tay, train, xuất model. Xem [ai/README.md](ai/README.md). |
| [`docs/`](docs/) | Bản thiết kế và kế hoạch. |

## Nguồn và giấy phép

- **Dữ liệu huấn luyện VSL:** [VieSign-10K](https://zenodo.org/records/23610105) của Cap Pham Dinh Thang, giấy phép CC BY 4.0.
- **Dữ liệu huấn luyện ASL:** [Google Isolated Sign Language Recognition](https://www.kaggle.com/competitions/asl-signs), thu bởi Deaf Professional Arts Network và Georgia Institute of Technology, giấy phép CC BY 4.0.
- **Nhận diện điểm khớp:** [MediaPipe](https://github.com/google-ai-edge/mediapipe) của Google, giấy phép Apache 2.0.

## Nhóm thực hiện

Dự án khởi nghiệp của nhóm học sinh lớp 11A4 và 11A8, Trường THPT Lê Quý Đôn, năm học 2026–2027. Giáo viên hướng dẫn: cô Lê Thị Thúy.
