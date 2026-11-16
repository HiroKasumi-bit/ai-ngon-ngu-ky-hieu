# Lời Tay: phiên dịch ngôn ngữ ký hiệu Việt Nam

**Dùng thử:** https://hirokasumi-bit.github.io/ai-ngon-ngu-ky-hieu/

Lời Tay giúp người Điếc và người nghe trò chuyện với nhau:

- **Người Điếc** ra ký hiệu trước camera. AI nhận diện, chuyển thành chữ và đọc to cho người đối diện.
- **Người nghe** bấm micro rồi nói. Câu nói hiện thành chữ để người Điếc đọc.
- **Dịch video:** tải lên một video có người ra ký hiệu, máy liệt kê các từ nhận được.

AI chạy **ngay trong trình duyệt**. Hình ảnh từ camera không bị gửi đi đâu.

> Đây là bản thử nghiệm. Hiện app nhận diện 20 ký hiệu ngôn ngữ ký hiệu Việt Nam thuộc chủ đề **đi khám bệnh**, độ chính xác khoảng 64% với người chưa từng gặp. Khi dùng, hãy ra từng ký hiệu rõ ràng và hạ tay xuống sau mỗi từ.

## Cấu trúc

| Thư mục | Nội dung |
|---|---|
| [`web/`](web/) | Website (Vite + JavaScript). Xem [web/README.md](web/README.md). |
| [`ai/`](ai/) | Dạy AI bằng Python: tải dữ liệu, trích điểm khớp tay, train, xuất model. Xem [ai/README.md](ai/README.md). |
| [`docs/`](docs/) | Bản thiết kế và kế hoạch. |

## Nguồn và giấy phép

- **Dữ liệu huấn luyện:** [VieSign-10K](https://zenodo.org/records/23610105) của Cap Pham Dinh Thang, giấy phép CC BY 4.0.
- **Nhận diện điểm khớp:** [MediaPipe](https://github.com/google-ai-edge/mediapipe) của Google, giấy phép Apache 2.0.

## Nhóm thực hiện

Dự án khởi nghiệp của nhóm 11A4, Trường THPT Lê Quý Đôn, năm học 2026–2027. Giáo viên hướng dẫn: cô Lê Thị Thúy.
