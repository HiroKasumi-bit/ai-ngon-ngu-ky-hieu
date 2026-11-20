# Trang giới thiệu cinematic — kế hoạch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/gioi-thieu/` kể chuyện SignBridge AI theo cuộn với logo 3D thật, chế độ trưng bày cho laptop, và hiệu ứng nhẹ cho app.

**Architecture:** Vite nhiều trang. Trang giới thiệu có gói JS riêng (`src/intro/`), chỉ gói này nhập `three`. Chế độ trưng bày dùng lại tracker/recognizer/model của app. Hiệu ứng app chỉ là GSAP trên transform/opacity, nằm ngoài vòng nhận diện.

**Tech Stack:** Vite 6, three (npm, ghim bản), GSAP 3.15 (ScrollTrigger, SplitText, Flip), `node --test`.

**Spec:** `docs/superpowers/specs/2026-11-20-gioi-thieu-cinematic-design.md`

## Global Constraints

- App ở `/`, giới thiệu ở `/gioi-thieu/`; link app không đổi.
- `three` chỉ được nhập trong `web/src/intro/`.
- Màu: `#1FB3A6`, `#0E7C72`, `#FFC431`, `#18265A`, nền `#F3FAF9`. Font Lexend 400–700.
- Cấm: glow, neon, gradient công nghệ, khung xương tay, 3D giả phồng.
- `prefers-reduced-motion: reduce` → không chuyển động, nội dung vẫn đủ.
- Không dùng số liệu không nguồn; mọi "AI nhận được" phải là kết quả thật.
- Commit kết thúc bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Không push/deploy khi người dùng chưa bảo.

## Review Focus

1. Máy không có WebGL → logo 3D thay bằng ảnh `logo3d.png`, không trắng trang.
2. Laptop 1366×768: cảnh mở màn vừa một màn hình, chữ không tràn, nút không bị che.
3. Tab ẩn hoặc logo ra khỏi màn hình → dừng vòng vẽ 3D (không ngốn pin/CPU khi trưng bày cả ngày).
4. Chế độ trưng bày bị từ chối camera → vẫn chạy vòng giới thiệu, hiện hướng dẫn cấp quyền.
5. Mọi chữ có dấu hiện đúng Lexend (không lẫn font dự phòng).

---

### Task 1: Khung trang giới thiệu

**Files:**
- Modify: `web/vite.config.js`, `web/package.json`
- Create: `web/gioi-thieu/index.html`, `web/src/intro/main.js`, `web/src/intro/intro.css`
- Test: `web/test/pages.test.js`

**Interfaces:**
- Produces: trang `/gioi-thieu/` nạp `src/intro/main.js`; `vite.config.js` xuất `build.rollupOptions.input = { app: 'index.html', intro: 'gioi-thieu/index.html' }`.

- [ ] **Step 1: Viết test**
  - `intro_page_is_built_next_to_the_app`: `config.build.rollupOptions.input` có cả `index.html` và `gioi-thieu/index.html`.
  - `three_is_only_used_by_the_intro_page`: mọi file `.js` trong `web/src` ngoài `src/intro/` không chứa `from 'three'`.
- [ ] **Step 2:** `npm test` → test 1 FAIL (chưa có input).
- [ ] **Step 3:** Sửa `vite.config.js`; `npm i three@0.169.0`; tạo trang rỗng có Lexend, màu, `<canvas>` cho logo.
- [ ] **Step 4:** `npm test` → PASS hết; `npm run build` → có `dist/gioi-thieu/index.html`.
- [ ] **Step 5:** Commit.

### Task 2: Logo 3D sống

**Files:** Create `web/src/intro/logo3d.js`; copy `poster/out/3d/logo3d.png` → `web/public/gioi-thieu/logo3d.png` (ảnh dự phòng).

**Interfaces:**
- Produces: `createLogo3D(canvas): { parts: { left, right, bubble, dots: Mesh[] }, pivot: Group, render(): void, dispose(): void } | null` — trả `null` khi không có WebGL. Dựng giống `poster/3d/logo3d.html` (SVGLoader, MeshPhysicalMaterial, RoomEnvironment, một đèn chính trên-trái, ShadowMaterial nền). Tự vẽ bằng `requestAnimationFrame`, dừng khi canvas ra khỏi màn hình (IntersectionObserver) hoặc tab ẩn.

- [ ] **Step 1:** Port cảnh từ `poster/3d/logo3d.html`; tách hai bàn tay, bong bóng, ba chấm thành mesh riêng (đặt tâm xoay ở giữa từng phần để lắp ráp).
- [ ] **Step 2:** Mở trang, chụp; so với `poster/out/3d/logo3d.png`: cùng màu, cùng hướng sáng, bóng mềm rơi xuống phải-dưới.
- [ ] **Step 3:** Commit.

### Task 3: Cảnh mở màn — MỐC DUYỆT

**Files:** Modify `web/gioi-thieu/index.html`, `web/src/intro/main.js`, `web/src/intro/intro.css`.

- Tiêu đề "Nói bằng tay, / AI cũng hiểu." (AI xanh ngọc, gạch vàng), câu dẫn, nút "Dùng thử ngay" (`/`) và "Chế độ trưng bày" (`?trungbay`), gợi ý cuộn.
- Timeline mở màn (GSAP): hai bàn tay trượt vào và xoay về đúng chỗ → bong bóng bật lên → ba chấm nhấp nháy kiểu "đang gõ" (lặp nhẹ) → chữ tiêu đề hiện từng chữ (SplitText, mặt nạ) → câu dẫn, nút.
- Logo nghiêng theo chuột (lerp, tối đa ~8°). Cuộn xuống: logo thu nhỏ và trôi lên, tiêu đề trượt đi (ScrollTrigger scrub).
- Reduced motion: hiện thẳng trạng thái cuối.

- [ ] **Step 1:** Làm theo trên.
- [ ] **Step 2:** Kiểm tra 1366×768, 1440×900, 1920×1080, 390×844; console không lỗi; font Lexend cho mọi chữ có dấu.
- [ ] **Step 3:** Commit, gửi ảnh cho người dùng, **dừng chờ duyệt**.

### Task 4: Cảnh 2–6

Chi tiết bố cục chốt sau mốc duyệt (ghi `Ruling:` vào ledger). Đã chốt:
- Cảnh 3 dùng ảnh trong `web/screenshots/` (bản tối ưu WebP đặt ở `web/public/gioi-thieu/`), khung laptop ghim bằng ScrollTrigger `pin`.
- Cảnh 4: nền `#0B1433`; phụ đề lấy từ kết quả thật của AI trên chính video đó (ghi cứng từ lần chạy thật, ghi chú nguồn trong code); không có video thì dùng ảnh tĩnh `dich-video.png`.
- Cảnh 5: số đếm lấy từ `src/words/vsl.json` và `asl.json` (không gõ tay); test `counts_come_from_word_lists`.
- Cảnh 2: chỉ đưa số khi có nguồn ghi trên trang.

### Task 5: Chế độ trưng bày

**Files:** Create `web/src/intro/kiosk.js`, `web/test/kiosk.test.js`.

**Interfaces:**
- Produces: `createAttention({ enterMs = 500, leaveMs = 20000 }): { update(hasHands: boolean, now: number): 'idle' | 'active' }`.

- [ ] **Step 1: Test** — `stays_idle_for_a_brief_hand`: tay xuất hiện 300 ms → `'idle'`; `wakes_after_half_a_second_of_hands`: 600 ms liên tục → `'active'`; `goes_back_to_idle_after_20s_without_hands`; `a_hand_resets_the_idle_timer`.
- [ ] **Step 2:** FAIL → **Step 3:** cài → **Step 4:** PASS.
- [ ] **Step 5:** Ghép giao diện: toàn màn hình (Fullscreen API theo cú bấm), camera; idle = vòng giới thiệu; active = camera to + từ chữ khổng lồ + câu ghép. Camera bị từ chối → vòng giới thiệu + hướng dẫn.

### Task 6: Hiệu ứng cho app

**Files:** Modify `web/src/views/chat.js`, `web/src/views/vocab.js`, `web/src/main.js`, `web/src/style.css`.
- Từ nhận được bay từ chip "live" xuống câu nháp (Flip).
- Tin nhắn hiện từng chữ; chuyển trang bằng View Transitions khi trình duyệt hỗ trợ.
- Từ vựng: hiện so le, lọc bằng Flip.
- Micro: sóng âm theo mức âm thật (AnalyserNode) khi đang nghe.
- Kiểm tra: `npm test` vẫn xanh; đo FPS nhận diện trước/sau trên `?demo=/demo/thu-3-tu.mp4` không giảm.

### Task 7: Kiểm tra cuối

- `npm test`, `npm run build`, chụp 1366/1440/1920/390 px, reduced motion, không WebGL.
- Cập nhật `web/README.md` (trang giới thiệu, chế độ trưng bày).
- Hỏi người dùng trước khi push và `npm run deploy`.
