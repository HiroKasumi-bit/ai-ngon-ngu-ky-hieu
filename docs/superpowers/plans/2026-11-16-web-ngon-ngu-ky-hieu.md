# Website dịch ngôn ngữ ký hiệu Việt Nam (giai đoạn 1): kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Website nhận diện 20 ký hiệu ngôn ngữ ký hiệu Việt Nam (chủ đề khám bệnh) qua camera, chạy ngay trong trình duyệt. Có trò chuyện hai chiều (ký hiệu thành chữ và tiếng nói, tiếng nói thành chữ) và trang dịch video.

**Architecture:**
- **Python (`ai/`):** tải video VieSign, trích điểm tay và vai bằng MediaPipe Tasks, train một scikit-learn MLP, rồi xuất trọng số ra JSON.
- **Web (`web/`, Vite + JS thuần):** dùng cùng loại MediaPipe Tasks để lấy đặc trưng giống hệt bên Python. Phần tính MLP viết tay. Không có máy chủ.

**Tech Stack:**
- Python 3.12 (uv): mediapipe, opencv-python, numpy, pandas, scikit-learn, pytest.
- Node 22: vite, @mediapipe/tasks-vision. Kiểm thử bằng `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-16-web-ngon-ngu-ky-hieu-design.md`

## Global Constraints

- Chỉ dùng 20 nhãn sau, viết y nguyên như trong manifest VieSign:
  `giúp_đỡ, hiểu, không_hiểu, đúng, sai, mời, bác_sĩ, y_tá, bệnh_nhân, bệnh_viện, trạm_y_tế, xe_cứu_thương, cấp_cứu, tiêm, chữa_bệnh, khẩu_trang, mệt, ho, cảm_cúm, sợ_hãi`.
  Khi hiển thị thì đổi `_` thành dấu cách.
- Nguồn dữ liệu là VieSign-10K, DOI qua Zenodo record 23610105, giấy phép CC BY 4.0. Ghi nguồn trên website (trang Từ vựng và phần chân trang).
- Video của người dùng không bao giờ được gửi ra khỏi máy họ: không có máy chủ, không gọi API nào kèm hình ảnh.
- Đặc trưng ở Python và JS phải khớp nhau với sai số ≤ 1e-4, có bài kiểm thử đối chiếu.
- `T = 24` khung mỗi chuỗi. Đặc trưng mỗi khung `F = 7*3 + 2*(21*3) + 2 = 149`. Vector chuỗi `D = T*F + (T-1)*F`, tức là vị trí cộng với tốc độ.
- Màu: `#1FB3A6`, `#FFC431`, `#18265A`, nền `#F3FAF9`. Font Lexend. Không glow, không khối 3D giả, không gradient neon.
- Không commit hay push trừ khi người dùng bảo (quy tắc trong CLAUDE.md toàn cục). Các bước "Commit" trong kế hoạch này được thay bằng "kiểm tra `git status` sạch lỗi".
- Sau mỗi task, giải thích ngắn cho người dùng bằng tiếng Việt dễ hiểu: file nào, làm gì, nối với phần nào (theo bộ nhớ `explain-code-plainly`).

## Review Focus

1. **Không có tay trong khung hình**, như lúc mới mở camera hay người dùng hạ tay: không được bật ra từ nào; chip hiện "Đưa tay vào khung hình". Bài kiểm thử: `recognizer` nhận 60 khung toàn số 0 thì không phát ra từ nào.
2. **Chỉ một tay, hoặc tay ra khỏi khung giữa chừng:** không lỗi, vẫn dự đoán được. Bài kiểm thử: `frameFeatures` với tay trái là `null` trả về 0 ở đúng vị trí và cờ bằng 0.
3. **Không thấy vai** (người đứng quá gần camera): dùng giá trị chuẩn hóa gần nhất, không chia cho 0. Bài kiểm thử: pose là `null` thì không có `NaN` trong đặc trưng.
4. **Từ chối quyền camera hoặc micro, hoặc trình duyệt không có SpeechRecognition:** hiện thông báo tiếng Việt, ẩn nút tương ứng, phần còn lại vẫn chạy. Kiểm tra thủ công ở Task 7.
5. **Video tải lên không đọc được hoặc không có ký hiệu nào:** báo "Không tìm thấy ký hiệu nào" thay vì treo. Kiểm tra thủ công ở Task 8.

---

## File Structure

```
ai/
  pyproject.toml          # uv project, dependencies
  README.md               # explains the pipeline in plain Vietnamese
  sign/features.py        # frame_features(), sequence_vector(), mirror_frames()
  sign/landmarks.py       # video_frames(path) -> np.ndarray (N, F)
  fetch_viesign.py        # downloads the 20 words' videos + data/labels.csv
  extract_all.py          # videos -> data/frames/<id>.npy
  train.py                # augment, train, evaluate, export web/public/model/model.json + parity fixture
  tests/test_features.py
  models/                 # hand_landmarker.task, pose_landmarker_lite.task (downloaded)
  data/                   # videos/, frames/, labels.csv  (gitignored)
web/
  package.json, vite.config.js, index.html
  public/model/model.json, public/mediapipe/{*.task, wasm/}
  src/features.js         # port of features.py
  src/model.js            # loadModel(), predict()
  src/tracker.js          # MediaPipe init + detect(video, ts) -> frame vector
  src/recognizer.js       # streaming stability/cooldown logic
  src/speech.js           # speak(), createListener()
  src/views/chat.js, src/views/video.js, src/views/vocab.js
  src/main.js, src/style.css
  test/features.test.js, test/recognizer.test.js
```

---

### Task 1: Python project and features

**Files:** create `ai/pyproject.toml`, `ai/sign/__init__.py`, `ai/sign/features.py`, `ai/tests/test_features.py`. Add `ai/data/`, `ai/models/`, `web/node_modules`, `web/dist` to `.gitignore`.

**Interfaces — Produces:**
- `POSE_IDX = [0, 11, 12, 13, 14, 15, 16]`
- `frame_features(pose: np.ndarray | None (33,3), hands: list[np.ndarray (21,3)]) -> np.ndarray (149,)`. Origin is the shoulder midpoint, scale is the shoulder width. A hand is assigned left or right by the nearest pose wrist (15 or 16). `pose is None` → reuse the last scale, or 1 if there is none; no NaN.
- `sequence_vector(frames: np.ndarray (N,149)) -> np.ndarray (D,)`: trim leading and trailing frames whose hand flags are both 0, linear resample to T=24, concatenate with the 23 frame-to-frame differences.
- `mirror_frames(frames) -> frames`: flip x and swap the left and right blocks.

- [ ] **Step 1: Write tests**

  ```python
  def test_missing_hand_is_zero_with_flag(): f = frame_features(POSE, [RIGHT_HAND]); assert f[-2] == 0 and f[-1] == 1 and not f[21:84].any()
  def test_no_pose_no_nan(): assert not np.isnan(frame_features(None, [RIGHT_HAND])).any()
  def test_sequence_length(): assert sequence_vector(np.random.rand(37,149)).shape == (24*149 + 23*149,)
  def test_trim_handless_edges(): # 5 zero-flag frames + 10 frames + 5 zero-flag frames == resample of the 10 middle frames
  def test_mirror_twice_is_identity(): assert np.allclose(mirror_frames(mirror_frames(X)), X)
  ```

- [ ] **Step 2: Run** `uv run pytest -q`. Expected: FAIL (import error).
- [ ] **Step 3: Implement `ai/sign/features.py`** to the interfaces above.
- [ ] **Step 4: Run** `uv run pytest -q`. Expected: 5 passed.

### Task 2: Download the 20 words and extract landmarks

**Files:** create `ai/fetch_viesign.py`, `ai/sign/landmarks.py`, `ai/extract_all.py`.

**Interfaces:**
- Consumes `frame_features`.
- Produces `ai/data/labels.csv` (`ID_video, Meaning, Signer`) and `ai/data/frames/<ID>.npy` (N,149).
- `video_frames(path: str) -> np.ndarray (N,149)`: MediaPipe Tasks `HandLandmarker` (num_hands=2) and `PoseLandmarker` lite, VIDEO running mode, unmirrored frames.

- [ ] **Step 1:** In `fetch_viesign.py`, read the zip central directory with HTTP Range (reuse the RangeFile approach). Filter `ISLR_447_all_rows.csv` to the 20 labels. Read only those `video_raw/<ID>.mp4` entries into `ai/data/videos/`. Print the count per label and the total MB.
- [ ] **Step 2: Run** `uv run python fetch_viesign.py`. Expected: about 230 videos, roughly 130 MB, every label at least 9 videos.
- [ ] **Step 3:** Download `hand_landmarker.task` and `pose_landmarker_lite.task` from `storage.googleapis.com/mediapipe-models/...` into `ai/models/`. Implement `video_frames`.
- [ ] **Step 4: Run** `uv run python extract_all.py`. Expected: one `.npy` per video, and a log listing how many videos had fewer than 5 frames with a hand (report those, do not crash).

### Task 3: Train, evaluate honestly, export

**Files:** create `ai/train.py`. Modify `ai/tests/test_features.py` with the export test.

**Interfaces:**
- Produces `web/public/model/model.json`:
  `{ labels:[20], T:24, F:149, mean:[D], std:[D], layers:[{W:[[...]], b:[...]}], activation:"relu", metrics:{signer_independent:float, random_split:float} }`
- Produces `ai/tests/fixtures/parity.json`: `{ frames:[N][149], vector:[D], probs:[20] }` for one real video.

- [ ] **Step 1:** Augment the training split only, 20 copies per sample: mirror, time-stretch 0.8–1.2, rotation ±10°, scale 0.9–1.1, gaussian noise 0.01.
- [ ] **Step 2:** Evaluate two splits.
  - **Signer-independent:** hold out whole signers, with GroupKFold on `Signer`.
  - **Random stratified split.**
  - Train `MLPClassifier(hidden_layer_sizes=(256,), alpha=1e-3, early_stopping=True)` on standardised vectors. Print both accuracies.
- [ ] **Step 3: Test** `test_export_roundtrip`: a numpy forward pass computed from model.json equals `clf.predict_proba` (atol 1e-5).
- [ ] **Step 4: Run** `uv run python train.py && uv run pytest -q`. Expected: both accuracies printed, all tests pass. Report the real numbers to the user. If signer-independent accuracy is below 40%, try one of these and keep whichever is better: `(512,128)` hidden layers, or kNN on the standardised vector.

### Task 4: Web scaffold, features port, model in JS

**Files:** create `web/package.json`, `web/vite.config.js`, `web/index.html`, `web/src/features.js`, `web/src/model.js`, `web/test/features.test.js`. Copy the `.task` files and the tasks-vision `wasm/` folder into `web/public/mediapipe/`.

**Interfaces — Produces:**
- `frameFeatures(pose: number[33][3] | null, hands: number[21][3][], state) -> Float32Array(149)`, where `state` keeps the last shoulder scale.
- `sequenceVector(frames: Float32Array[]) -> Float32Array(D)`
- `loadModel(url) -> Promise<Model>`
- `predict(model, vec) -> { label, prob, probs }`

- [ ] **Step 1: Test.** `features.test.js` loads `ai/tests/fixtures/parity.json`.
  - `sequenceVector(fixture.frames)` must equal `fixture.vector` within 1e-4.
  - `predict(model, vector).probs` must equal `fixture.probs` within 1e-4.
  - `frameFeatures(null, [hand])` must contain no NaN.
- [ ] **Step 2: Run** `node --test test/`. Expected: FAIL.
- [ ] **Step 3:** Implement as a direct port of `features.py`. The MLP is: standardise, then dense, relu, dense, softmax.
- [ ] **Step 4: Run** `node --test test/`. Expected: pass.

### Task 5: Tracker and streaming recognizer

**Files:** create `web/src/tracker.js`, `web/src/recognizer.js`, `web/test/recognizer.test.js`.

**Interfaces — Produces:**
- `createTracker() -> Promise<{ detect(videoEl, tsMs) -> { frame: Float32Array(149), hands: number, landmarks } }>`. Uses GPU delegate with CPU fallback. Models are loaded from `/mediapipe/`.
- `createRecognizer(model, { windowFrames: 36, every: 4, minProb: 0.6, stable: 3, cooldownMs: 1200 }) -> { push(frame, tsMs) -> null | { word, prob }, current: { label, prob } | null, reset() }`.
  - A word fires once its label wins `stable` consecutive predictions with hands present.
  - After a word fires, the next one waits until the cooldown has passed or the hands have been absent for at least 8 frames.

- [ ] **Step 1: Tests.**
  - `no_hands_never_fires`: 60 zero frames give no event.
  - `stable_label_fires_once`: stub `predict` returns `ho`@0.9 forever, so exactly 1 event in 1 second of frames.
  - `cooldown_then_new_word`: `ho`, then hands absent for 10 frames, then `mệt` gives 2 events.
- [ ] **Step 2: Run** `node --test test/`. FAIL. **Step 3:** Implement. **Step 4:** Run, PASS.

### Task 6: Visual design pass

**Files:** `web/index.html`, `web/src/style.css`, `web/src/main.js` (tabs: Trò chuyện, Dịch video, Từ vựng).

- [ ] **Step 1:** Look at 2–3 real references: caption and translation apps for Deaf users, and friendly health or chat apps. Note what makes them warm, following the "Thẩm mỹ" rule in the global CLAUDE.md.
- [ ] **Step 2:** Build the shell.
  - Mobile-first layout, desktop two columns at ≥ 960px.
  - Header with the logo mark (teal hands, yellow bubble) and the name "Lời Tay", which is a working name.
  - Bottom tab bar on mobile, top tabs on desktop.
  - Lexend via Google Fonts with `display=swap`.
  - CSS variables for the palette.
- [ ] **Step 3:** Run `/impeccable critique` on the rendered shell at 375px and 1440px. Fix what it flags.

### Task 7: Chat view (two-way)

**Files:** `web/src/views/chat.js`, `web/src/speech.js`.

**Interfaces:**
- Consumes `createTracker`, `createRecognizer`, `loadModel`.
- Produces `speak(text)` (speechSynthesis, `lang="vi-VN"`, picks a vi voice if one exists) and `createListener(onFinal, onInterim) -> { start(), stop(), supported }`.

- [ ] **Step 1: Camera panel.**
  - Mirrored preview; landmarks drawn as small dots in the brand colours, no skeleton glow.
  - Live chip shows the current word and a confidence bar.
  - Hint "Đưa tay vào khung hình" when no hands are visible.
- [ ] **Step 2: Draft strip.** Each recognised word pops into it (small GSAP scale bounce). Buttons: xoá từ cuối, xoá hết, gửi. On "gửi": push a Deaf-side bubble and call `speak()`.
- [ ] **Step 3: Mic button for the hearing person.** Interim text shows live; the final result becomes a hearing-side bubble.
  - If unsupported or permission is denied: hide the button and show a one-line note.
  - If camera permission is denied: show a card explaining how to allow it.
- [ ] **Step 4: Verify** in the browser pane with `preview_start`.
  - Feed a VieSign test video through a fake camera, using `?demo=<id>` to play a video file as the source.
  - Expected: the right words appear and nothing appears while hands are absent.
  - Screenshot at 375px and 1440px.

### Task 8: Video translation and vocabulary views

**Files:** `web/src/views/video.js`, `web/src/views/vocab.js`.

- [ ] **Step 1: Video view.**
  - Pick a file and run `detect` frame by frame at 15 fps sampling, with a progress bar.
  - Feed the same recognizer and list the words with timestamps.
  - If there are no words: "Không tìm thấy ký hiệu nào".
  - If the file is unreadable: "Không đọc được video này".
- [ ] **Step 2: Vocabulary view.** The 20 words grouped by spec category, plus the attribution "Dữ liệu: VieSign-10K, Cap Pham Dinh Thang, CC BY 4.0" with a link, and the team credit.
- [ ] **Step 3: Verify.** Upload a held-out VieSign video and check the predicted word. Upload a non-video file and check the error message.

### Task 9: Final check and explain

- [ ] **Step 1:** Run `cd ai && uv run pytest -q`, `cd web && node --test test/`, and `npm run build`. Everything must pass and the build must succeed.
- [ ] **Step 2:** Run `/impeccable audit` on the built site at 375px and 1440px. Fix the issues it flags, then take final screenshots.
- [ ] **Step 3:** Write `ai/README.md` and `web/README.md` in plain Vietnamese: how to run, what each file does, the real accuracy numbers, and the data credit.
- [ ] **Step 4:** Update the project `CLAUDE.md` (structure, how to run) and send the screenshots to the user.
