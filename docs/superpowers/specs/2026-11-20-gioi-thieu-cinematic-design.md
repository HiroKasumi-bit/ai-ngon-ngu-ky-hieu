# Trang giới thiệu cinematic, chế độ trưng bày, hiệu ứng cho app

Duyệt: 20/11/2026 (người dùng: "Duyệt, làm đi").

## Vì sao làm

Nhóm sẽ trưng bày SignBridge AI trên **laptop** ở gian hàng. Cần một thứ thu hút ánh nhìn từ xa, kể được câu chuyện sản phẩm cho giám khảo và khách, rồi mời họ thử thật. Người dùng muốn "cinematic nhất, đẹp nhất, nhiều hiệu ứng nhất", và muốn cả web có nhiều hiệu ứng.

## Mục tiêu

- Trang giới thiệu riêng, kể chuyện theo cuộn trang, nhiều chuyển động, có logo 3D render thật.
- Chế độ trưng bày toàn màn hình cho laptop: tự chạy khi không ai dùng, mời thử khi có người giơ tay.
- App (phần dịch) có thêm hiệu ứng nhưng không chậm đi.

## Không làm (lần này)

- Bản tiếng Anh cho trang giới thiệu (app vẫn có VI/EN). Thêm sau nếu cần.
- Đổi kiểu AI hay số từ nhận được.

## Tuyệt đối tránh

- Glow, neon, gradient công nghệ, khung xương tay, khối 3D giả phồng, bóng đổ ẩu (quy tắc thẩm mỹ của người dùng).
- Hiệu ứng làm AI nhận chậm hoặc trễ hình trên app.
- Số liệu không có nguồn; cảnh "AI nhận được" không đúng với kết quả thật.

## Ràng buộc

- App giữ ở trang chủ `signbridge-vn.pages.dev`, link và QR cũ không đổi.
- three.js chỉ tải ở trang giới thiệu, không vào gói của app.
- Hiệu ứng app chỉ dùng transform/opacity, không chạy trong vòng nhận diện từng khung hình.
- Font Lexend, đủ dấu tiếng Việt. Màu thương hiệu: xanh ngọc `#1FB3A6`/`#0E7C72`, vàng `#FFC431`, xanh đậm `#18265A`, nền `#F3FAF9`.
- Tôn trọng `prefers-reduced-motion`: vẫn đọc được trọn câu chuyện, chỉ bỏ chuyển động.
- Laptop là màn chính (1366–1920 px). Điện thoại vẫn xem được, hiệu ứng nhẹ hơn.

## Các hướng đã cân nhắc

| Hướng | Đánh đổi | Kết luận |
|---|---|---|
| A. Trang giới thiệu riêng + chế độ trưng bày, app chỉ thêm hiệu ứng nhẹ | Thêm một trang phải giữ; app vẫn nhanh | **Chọn** |
| B. Nhồi hiệu ứng nặng thẳng vào app | Một chỗ duy nhất, nhưng 3D + cuộn nặng làm chậm nhận diện trên điện thoại | Loại |
| C. Chỉ làm video giới thiệu | Đã có phiên làm video riêng; video không cho khách thử thật | Loại |

Địa chỉ: app ở `/`, giới thiệu ở `/gioi-thieu/` (chọn). Đưa giới thiệu lên `/` thì đổi link/QR và điện thoại phải tải 3D trước khi dùng app, nên loại.

## Thiết kế

**Phong cách:** cùng thế giới với poster đã chốt (nền sáng xanh ngọc, Lexend xanh đậm đậm nét, chữ "AI" xanh ngọc có gạch vàng, logo 3D thật). "Điện ảnh" đến từ nhịp cuộn, khung hình lớn, chữ chuyển động, đúng một cảnh tối kiểu phòng chiếu.

**Trang giới thiệu, 6 cảnh theo cuộn:**
1. Mở màn: logo 3D (three.js, một đèn chính trên-trái, bóng mềm rơi lên nền) tự lắp ráp: hai bàn tay trượt vào, bong bóng bật lên, ba chấm "đang gõ". Logo nghiêng theo chuột. Câu "Nói bằng tay, AI cũng hiểu." hiện từng chữ.
2. Vấn đề: người Điếc và người nghe khó trò chuyện. Chỉ dùng số có nguồn.
3. Cách hoạt động: khung laptop ghim giữa màn hình, màn hình bên trong đổi theo 3 bước (camera → AI → chữ + giọng nói), dùng ảnh app thật.
4. Cảnh tối: video ký hiệu thật, từ AI nhận được hiện chữ lớn đúng thời điểm (kết quả thật).
5. Hai ngôn ngữ: 183 VSL, 112 ASL đếm lên; bức tường chữ chuyển động gồm các từ app hiểu.
6. Kết: nhóm, cô Thúy, nút "Dùng thử ngay" và "Chế độ trưng bày".

**Chế độ trưng bày** (`/gioi-thieu/?trungbay`): toàn màn hình, camera bật. Không ai thì chạy vòng giới thiệu; thấy tay liên tục khoảng nửa giây thì sang màn thử (camera to, từ nhận được chữ khổng lồ, câu ghép bên dưới); 20 giây không thấy tay thì quay lại.

**Hiệu ứng cho app:** từ nhận được bay từ khung camera xuống câu nháp; tin nhắn hiện theo nhịp; chuyển trang mượt; Từ vựng hiện so le và lọc có chuyển động; micro có sóng âm theo giọng thật; màn chờ camera có logo chuyển động.

## Kỹ thuật

- Vite nhiều trang: `index.html` (app) + `gioi-thieu/index.html`.
- `three` (npm, ghim phiên bản) cho logo 3D; GSAP (đã có) + ScrollTrigger + SplitText cho cuộn và chữ.
- Chế độ trưng bày dùng lại `createTracker`, `createRecognizer`, `loadModel` của app.

## Để người làm tự quyết

Bố cục chi tiết từng cảnh, thời lượng và đường cong chuyển động, cách lấy video cho cảnh tối (bản không có video vẫn phải đẹp, vì thư mục `web/public/demo/` không lên GitHub).

## Mốc duyệt

Làm cảnh mở màn trước, chụp ở 1440 px và 1920 px cho người dùng duyệt, rồi mới làm các cảnh còn lại.
