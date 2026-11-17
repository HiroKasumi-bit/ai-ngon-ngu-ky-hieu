# Website Lời Tay

Lời Tay giúp người Điếc và người nghe trò chuyện với nhau. AI chạy **ngay trong trình duyệt**: hình từ camera không bị gửi đi đâu, và không cần máy chủ.

## Chạy thử trên máy

```bash
npm install
npm run dev
```

Sau đó mở địa chỉ mà Vite in ra màn hình (thường là http://localhost:5173).

- **Camera** chỉ chạy trên `localhost` hoặc trang `https`.
- **Micro nghe giọng nói** chạy tốt nhất trên Chrome hoặc Edge.
- **Mẹo khi trình bày:** ra từng ký hiệu rõ ràng, sau mỗi từ **hạ tay xuống** một chút để app chốt từ.
- **Thử khi không có camera:** đặt một video ký hiệu vào `public/demo/` (thư mục này không đưa lên git), rồi mở `http://localhost:5173/?demo=/demo/ten-video.mp4`. Website sẽ dùng video thay cho camera.

## Kiểm thử

```bash
npm test
```

Lệnh này chạy 3 nhóm kiểm thử:
- **Đối chiếu với Python:** bộ đo cử chỉ và bộ não trên web phải ra **cùng con số** với bản Python (`ai/`).
- **Bộ nhận diện liên tục:**
  - không có tay thì không ra từ;
  - chỉ chốt sau khi hạ tay, cho trọn ký hiệu;
  - giữ nguyên tay thì không lặp từ;
  - cử động thoáng qua bị bỏ qua;
  - AI đoán "không phải từ nào" hoặc chưa đủ tự tin thì không hiện gì.
- **Ghép câu và tìm từ** (gõ không dấu vẫn tìm được).

## Các file

| File | Làm gì |
|---|---|
| `index.html` | Khung của cả 3 trang: Trò chuyện, Dịch video, Từ vựng. |
| `src/main.js` | Chuyển trang, và tải AI khi cần lần đầu. |
| `src/tracker.js` | "Mắt": MediaPipe dò tay và người trong từng khung hình. |
| `src/features.js` | Bộ đo cử chỉ: đổi điểm khớp thành 149 con số. Đây là bản dịch y hệt của `ai/sign/features.py`. |
| `src/model.js` | "Bộ não" (LDA, 0,5 MB, trọng số 8-bit). Chỉ là nhân ma trận + softmax, nên không cần thư viện AI. |
| `src/recognizer.js` | Tách từng ký hiệu theo lúc **hạ tay**: giơ tay thì gom khung, hạ tay ~0,2 giây thì đoán cả đoạn (giống lúc AI học). Ra liền mạch quá 3 giây thì tự chốt. AI đoán "không phải từ nào" hoặc dưới ngưỡng tự tin thì bỏ qua. |
| `src/words.json` | Danh sách từ cho trang Từ vựng, do `ai/train.py` xuất ra cùng lúc với model nên luôn khớp nhau. |
| `src/sentence.js` | Ghép các từ thành câu. |
| `src/speech.js` | Đọc to câu, và nghe người đối diện nói. Dùng tính năng có sẵn của trình duyệt. |
| `src/views/*.js` | Phần xử lý riêng của từng trang. |
| `src/style.css` | Giao diện. Màu lấy từ cờ cộng đồng người Điếc: xanh ngọc, vàng, xanh đậm. |
| `public/model/model.json` | Bộ não đã học, do `ai/train.py` xuất ra. |
| `public/mediapipe/` | Model dò tay và người cùng phần chạy MediaPipe, dùng cho chế độ không cần mạng. |

## Nguồn

- **Dữ liệu huấn luyện:** VieSign-10K, tác giả Cap Pham Dinh Thang, giấy phép CC BY 4.0.
- **Nhận diện điểm khớp:** MediaPipe của Google, giấy phép Apache 2.0.
- **Phông chữ:** Lexend, giấy phép SIL Open Font License.
- **Hiệu ứng chuyển động:** GSAP.

## Ảnh chụp

`screenshots/`: trò chuyện (điện thoại, laptop), dịch video, từ vựng.
