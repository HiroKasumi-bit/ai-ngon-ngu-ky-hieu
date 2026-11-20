<!-- impeccable:product-schema 1 -->
# Product

SignBridge AI: web phiên dịch ngôn ngữ ký hiệu. Camera nhận diện ký hiệu ngay trên máy người dùng, đổi thành chữ và giọng nói; người nghe nói vào micro, chữ hiện ra cho người Điếc đọc.

> Ghi chú: tệp này được suy ra từ yêu cầu và tài liệu dự án (20/11/2026), người dùng chưa duyệt từng dòng. Dòng nào sai thì sửa thẳng ở đây.

## Platform

web

## Users

- Người Điếc dùng ngôn ngữ ký hiệu Việt Nam (VSL) hoặc Mỹ (ASL), và người nghe đang trò chuyện với họ.
- Giám khảo, thầy cô, khách tham quan cuộc thi khởi nghiệp của trường (xem trên laptop ở gian hàng hoặc mở link trên điện thoại).

## Product Purpose

Giúp người Điếc và người nghe trò chuyện trực tiếp, không cần phiên dịch viên, bằng thiết bị sẵn có.

## Positioning

Dự án khởi nghiệp của học sinh lớp 11A4 và 11A8, Trường THPT Lê Quý Đôn, giáo viên hướng dẫn cô Lê Thị Thúy. Là bản thử nghiệm: nhận 183 ký hiệu VSL và 112 ký hiệu ASL.

## Operating Context

- App: điện thoại là chính, laptop hai cột. Ánh sáng phòng bình thường.
- Trưng bày: laptop ở gian hàng trong hội trường sáng, người xem đứng cách 1–3 m.

## Capabilities and Constraints

- Mọi xử lý hình ảnh chạy trên máy người dùng (MediaPipe + mô hình LDA), không gửi video đi đâu.
- Độ chính xác có hạn và phải nói thật: số đo nằm ở `ai/README.md`.
- Tốc độ nhận diện trên app là ưu tiên số một; hiệu ứng không được làm chậm nó.

## Brand Commitments

- Tên: SignBridge AI ("AI" màu xanh ngọc).
- Màu lấy từ cờ cộng đồng người Điếc: xanh ngọc `#1FB3A6`/`#0E7C72`, vàng `#FFC431`, xanh đậm `#18265A`, nền `#F3FAF9`.
- Font Lexend. Logo: đôi tay chụm nâng bong bóng lời nói có ba chấm.
- Câu khẩu hiệu đã duyệt trên poster: "Nói bằng tay, AI cũng hiểu."
- Không dùng: glow, neon, gradient công nghệ, khung xương tay, khối 3D giả phồng, combo nền kem + đất nung + font viết tay. 3D chỉ khi render thật, một nguồn sáng, bóng mềm đúng hướng.

## Evidence on Hand

Ảnh chụp app thật (`web/screenshots/`), logo 3D render thật (three.js), video ký hiệu VieSign-10K (CC BY 4.0), danh sách từ xuất từ mô hình thật, số đo độ chính xác trung thực.

## Product Principles

- Nói thật về khả năng của AI.
- Riêng tư: hình ảnh không rời khỏi máy.
- Chữ to, dễ đọc cho cả hai phía.

## Accessibility & Inclusion

Người dùng chính là người Điếc: mọi thông tin bằng âm thanh phải có chữ đi kèm. Tôn trọng `prefers-reduced-motion`. Tương phản chữ đạt WCAG AA.
