# History Development — ListenFlow

Nhật ký phát triển tổng hợp từ `git log` của dự án **ListenFlow** (Ứng dụng luyện nghe chép chính tả tiếng Anh chuyên IT Operations & ôn từ vựng lặp lại ngắt quãng).

---

## Kiến trúc hiện tại

- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4, triển khai tự động qua GitHub Actions lên **GitHub Pages** (`lephuocduc/english-app`).
- **Backend & Database**: Cloudflare Workers (Hono + Zod) + **Cloudflare D1** (`listenflow-db`, `https://listenflow-api.duc-todo-api.workers.dev`).
- **Audio & DSP**: Proxy TTS `/api/tts` (mặc định giọng UK `en-GB`, hỗ trợ US/AU), WSOLA time-stretch giữ nguyên cao độ khi đổi tốc độ, phân tách giọng 2 người nói, **Phone Mode Lv 1/2/3** (Web Audio / `OfflineAudioContext` + `HTMLAudioElement` mở khóa sẵn cho iOS/Android).
- **Spaced Repetition (SRS)**: Thuật toán **FSRS** dùng thư viện chính thức `ts-fsrs` (v6) lưu đủ trạng thái thẻ & bảng `review_logs` trên D1.
- **Theo dõi tiến bộ & Cơ sở dữ liệu ẩn thích ứng (Adaptive 85%)**: Thống kê điểm trung bình **lần chấm điểm đầu tiên** (First-Attempt Score) theo tuần / tháng + Daily Streak & Streak Freeze; đồng thời âm thầm lưu **cơ sở dữ liệu ẩn** (`adaptive_word_memory` & `adaptive_lesson_history` trên D1, không hiển thị trên UI) để tối ưu từ vựng và tự động điều chỉnh độ khó bài nghe tiếp theo quanh mục tiêu ~85% (`GET /api/adaptive/profile`).

---

## Nhật ký phát triển chi tiết

### 2026-11-23 — Cơ sở dữ liệu ẩn thích ứng (Mục tiêu 85%), Nâng cấp FSRS, sửa Audio Mobile & Thống kê tiến bộ

- *(Adaptive Hidden DB)* — **Cơ sở dữ liệu ẩn theo dõi Weak Words / Mastered Words / 5 bài gần nhất & quy tắc tạo bài nghe quanh 85%**
  - Tạo migration `migrations/0007_add_hidden_adaptive_memory.sql` (đã chạy trên D1): thêm 2 bảng ẩn `adaptive_word_memory` và `adaptive_lesson_history` (không hiển thị bất kỳ UI nào ra màn hình).
  - Tự động ghi ngầm **chỉ ở lần chấm điểm đầu tiên** của mỗi câu (`DictationStudio` → `hiddenAdaptiveStore` + `POST /api/attempts` kiểm tra `COUNT(*) === 1` → `updateHiddenAdaptiveMemoryInD1`; các lần chấm lại sau khi đã xem đáp án sẽ không ghi đè dữ liệu từ vựng):
    - **Từ hay sai (`weak`)**: lưu từ nghe sai / nghe thiếu / sai chính tả, reset chuỗi đúng liên tiếp về 0.
    - **Lỗi âm đuôi `-s` (`ending_s_count`)**: tự động phân biệt các lỗi chỉ thiếu/thừa đuôi `-s / -es / -ies / 's` (vd: `servers` ↔ `server`, `patches` ↔ `patch`, `queries` ↔ `query`) vào nhóm luyện âm đuôi riêng, **không** đánh nhầm từ đó vào danh sách Từ hay sai.
    - **Từ đã vững (`mastered`)**: tự động nâng hạng khi nghe đúng liên tiếp ≥ 3 lần.
    - **Lịch sử điểm lần đầu 5 bài gần nhất**: tính điểm trung bình lần đầu tiên của 5 bài gần nhất để suy ra hướng điều chỉnh độ khó cho bài nghe tiếp theo (`< 80%` giảm nhẹ, `80%–90%` giữ nguyên, `> 90%` tăng nhẹ).
  - Cung cấp endpoint nội bộ `GET /api/adaptive/profile` và `POST /api/adaptive/backfill` để dùng ngay khi tạo bài nghe mới về sau.
- **`466cce5`** — *feat(srs): migrate spaced repetition from SM-2 to FSRS (ts-fsrs) with D1 schema and review_logs*
  - Nâng cấp toàn bộ hệ thống SRS từ SM-2 sang **FSRS** bằng thư viện chính thức `ts-fsrs@6.0.1`.
  - Tạo migration `migrations/0006_add_fsrs_and_review_logs.sql` (đã chạy trên D1): bổ sung các cột `due`, `stability`, `difficulty`, `elapsed_days`, `scheduled_days`, `reps`, `lapses`, `learning_steps`, `state` (0–3), `last_review` vào `saved_vocabulary` và backfill dữ liệu cũ; tạo bảng `review_logs` phục vụ thống kê & Optimize sau này.
  - Cập nhật API `server/routes/vocabulary.ts` hỗ trợ `?dueOnly=true`, lưu trạng thái FSRS + ghi `review_logs` (`GET/POST /api/vocabulary/review-logs`).
  - Cập nhật `FlashcardReviewModal`, `VocabularyView`, `AddVocabularyModal`, `storage.ts` và `App.tsx`: khởi tạo thẻ mới bằng `createEmptyCard`, tính sẵn 4 phương án `Again / Hard / Good / Easy` bằng `fsrs.repeat()`, hiển thị gợi ý khoảng thời gian (`1 phút`, `6 phút`, `10 phút`, `8 ngày`, `1 tuần`...) và đồng bộ 2 chiều theo mốc `last_review` mới nhất.
- **`4f75494`** — *fix(audio): remove background static hiss in Phone Mode while preserving telephony voice effect*
  - Tắt hoàn toàn nhiễu nền (`noiseGain: 0`) ở cả 3 mức Phone Mode trong `ttsAudioPlayer.ts`, giữ nguyên bộ lọc dải tần hẹp, độ rè giọng, nén tiếng và hiệu ứng chập chờn sóng ở Lv 2–3.
- **`a477433`** — *fix(audio): route mobile playback through persistent pre-unlocked HTMLAudioElement with offline Phone Mode DSP*
  - Khắc phục triệt để lỗi không nghe được âm thanh trên điện thoại (iOS Safari/Chrome bị tắt tiếng khi gạt nút im lặng & chặn autoplay `new Audio()` sau `await`).
  - Duy trì 1 `HTMLAudioElement` dùng chung duy nhất (`playsInline`), mở khóa đồng bộ ngay trong cú chạm đầu tiên bằng silent WAV + `navigator.audioSession.type = 'playback'`; render hiệu ứng Phone Mode Lv 1/2/3 & đổi giọng qua `OfflineAudioContext` → PCM WAV Blob rồi phát qua kênh media.
  - Bổ sung header `Content-Length` và `Accept-Ranges: bytes` cho `/api/tts`.
- **`029cd21`** — *feat(progress): track first-attempt dictation scores with weekly and monthly comparison*
  - Lưu điểm **lần chấm điểm đầu tiên** cho mỗi câu dictation và thêm endpoint `GET /api/attempts/first-attempt-stats` lấy dữ liệu lịch sử từ D1 (`dictation_attempts`).
  - Thêm module `firstAttemptAnalytics.ts` và biểu đồ/bảng so sánh điểm trung bình lần chấm đầu tiên **theo tuần** và **theo tháng** trong tab **Progress**.
- **`d37e6c8`** — *ci(pages): split build/deploy jobs and upgrade upload-pages-artifact to v4*
  - Tách workflow `.github/workflows/deploy.yml` thành 2 job `build` và `deploy`, nâng `actions/upload-pages-artifact` lên `@v4` để sửa lỗi `No artifacts named "github-pages" were found`.
- **`a558962`** — *fix(audio,streak,ui): unlock mobile TTS, add Phone Mode Lv 1-3, fix streak same-day multi-count, refine Practice UI*
  - Tab **Practice** ưu tiên mở lại bài đang học dang dở (hoặc bài lần cuối thoát ra), nếu không có mới chuyển sang bài chưa học tiếp theo.
  - Thêm 3 mức độ khó cho **Phone Mode** (`Lv 1 Tiêu chuẩn`, `Lv 2 Sóng yếu`, `Lv 3 Chập chờn`).
  - Sửa lỗi cộng Streak và Tổng số ngày học nhiều lần trong cùng 1 ngày (chặn trùng trên cả frontend `mergeStreakData` và backend `server/routes/streak.ts`).
  - Bỏ nút `+1s đệm`, bỏ dòng `💡 Hint: X words`, đưa nút Play và Phone Mode nằm cạnh `Loop: On`.

---

### 2026-11-22 — Từ điển ngữ cảnh IT Ops (kèm dạng từ), tinh gọn UI & bộ 10 bài B1 2 phút

- **`bc545dc`** — *style(vocab): use icon-only speaker button for example sentences matching word button*
  - Đổi nút nghe câu ví dụ trong `VocabularyView` và `FlashcardReviewModal` sang dạng chỉ dùng icon loa đồng bộ với nút nghe từ.
- **`1361ef8`** — *feat(vocab,ui): add contextual IT Ops word dictionary with POS tags and streamline LessonsView*
  - Xây dựng từ điển ngữ cảnh chuyên IT Ops (`src/lib/translation/itOpsWordDictionary.ts`) kèm nhãn dạng từ (`n`, `v`, `adj`, `adv`, `phr`, `prep`) hiển thị đẹp trên badge và form thêm từ vựng.
  - Dọn gọn `LessonsView`: xóa các đoạn mô tả dài và bỏ form tự tạo Text-to-Audio trên UI.
- **`973431b`** — *fix(srs): refine SM-2 review algorithm and add example sentence audio playback*
  - Tinh chỉnh thuật toán SRS cũ tránh nhảy Mastered quá sớm và thêm nút phát âm thanh câu ví dụ (`speakSentence`).
- **`a127ac2` / `8da3b98` / `36c4979`** — *feat(lessons): auto-resume home lesson, purge uncompleted lessons, and add 10 B1 2-min IT Ops dialogues*
  - Thêm 10 bài hội thoại **B1 (~2 phút)** chuyên IT System Operations kèm bản dịch tiếng Việt tự nhiên và gợi ý, giản lược đúng trình độ B1, bỏ tên riêng, và lưu lên D1.
  - Hỗ trợ tự động resume bài đang học ở trang chủ.

---

### 2026-11-21 — Bộ 12 bài A2–B1 IT Ops, giữ cao độ giọng khi đổi tốc độ & sửa múi giờ Streak

- **`58c0aa7`** — *fix: prevent streak timezone double-counting, add streak reset, and preserve voice pitch on speed change*
  - Sửa lỗi lệch múi giờ khi tính Streak, thêm chức năng Reset Streak.
  - Cài đặt thuật toán WSOLA time-stretch (`src/lib/audio/voicePitchShift.ts`) giúp thay đổi tốc độ đọc mà không làm méo cao độ giọng nói.
- **`a94d5f3`** — *feat: add quick same-level next lesson button and default uncompleted filter*
  - Thêm nút chuyển nhanh sang bài tiếp theo cùng cấp độ và mặc định lọc bài chưa hoàn thành.
- **`3f0ff85`** — *feat: replace B1-B2 audio with A2-B1 IT Ops lessons, add status filter, full lesson playback, and update player defaults*
  - Thay bộ bài cũ bằng 12 bài hội thoại **A2–B1 (~1 phút)** IT Ops, thêm lọc trạng thái hoàn thành, chế độ nghe toàn bài (**Play All**) và đặt mặc định UK `en-GB` + Loop On + Phone Mode On.

---

### 2026-11-19 — Audio Studio, Phone Call Mode, 2 giọng hội thoại & Full Transcript Review

- **`be4f8b8`** — *fix(tts): harden Worker /api/tts upstream fallback and CORS headers*
  - Gia cố endpoint `/api/tts` với nhiều nguồn dự phòng và header CORS ổn định.
- **`2d2ef9b`** — *feat(audio): assign distinct voices per speaker in dialogue lessons*
  - Tự động phân tách giọng nói khác nhau (pitch + EQ) cho từng người nói trong hội thoại.
- **`9441c60`** — *feat(dictation): show full transcript review panel after completing a lesson*
  - Hiển thị bảng xem lại toàn bộ transcript kèm bản dịch sau khi hoàn thành bài nghe.
- **`d5ac16a` / `36c4827` / `22c1c7f` / `f0deb03`** — *Text-to-Audio Studio & Phone Call Challenge Mode*
  - Ra mắt chế độ bài nghe Audio (TTS + Web Audio DSP giả lập cuộc gọi điện thoại Phone Mode), chọn giọng **UK / US / AU** chuyển đổi tức thì và bộ bài hội thoại IT System Operations đầu tiên.

---

### 2026-11-09 → 2026-11-17 — Nâng cấp trải nghiệm Dictation, Streak Freeze, Auto-start & Chuẩn hóa câu

- **`ddbbae6` / `eaec6cc`** — Sửa lỗi nhảy đúng câu khi bấm Replay từ vựng, tự động tạm dừng video khi chuyển tab và hiển thị ngữ cảnh cho câu bị tách.
- **`978d7b7` / `036b991` / `6ce9eec`** — Tự động hiện đáp án & bản dịch tiếng Việt khi chấm điểm, khóa học tuần tự từng câu, hiện câu ngữ cảnh trước đó & 1s đệm audio.
- **`c06717a` / `3f8cc9a`** — Thêm **Daily Streak + Streak Freeze** (1 lần/tuần), smart resume câu tiếp theo và cấu hình tự khởi động mở web app khi bật Windows.
- **`3ef20ba` / `0c1d270` / `6b1e8e5` / `d9b072e` / `ca5612e` / `0d3d967` / `400d012`** — Tắt phụ đề YouTube mặc định (`Alt+C` bật/tắt), bố cục 2 cột màn hình rộng, tự động chuẩn hóa ranh giới câu (`sentenceNormalizer.ts`), cơ chế tombstone xóa video sạch cả local & cloud, modal xác nhận xóa và giao diện tinh gọn.

---

### 2026-10-10 → 2026-10-11 — Khởi tạo ListenFlow, Cloudflare D1, Focus Suite & Flashcard SRS

- **`93c14a5` / `48273e1`** — Chuẩn hóa tài liệu README & giao diện tiếng Anh.
- **`db09bb5` → `bff2d5c`** — Xây dựng hệ thống sổ từ vựng & Flashcard lặp lại ngắt quãng (kiến trúc Cloud-First đồng bộ 2 chiều với Cloudflare D1, phát âm, Cloze mode, badge đếm từ đến hạn).
- **`9ff930e` / `9fc3637` / `728ed2d` / `744dd0d`** — Ra mắt **Focus Suite** (Zen Mode, Blind Listening, Dark Mode, thanh phím tắt), lặp câu, gợi ý từ và dịch tự động.
- **`aef103e` / `4451655`** — Tích hợp **Cloudflare D1** thực tế (`listenflow-db`) cùng `CloudSyncModal` và chế độ single-owner.
- **`aca6df6` → `c12fd8d`** — Khởi tạo dự án **ListenFlow** (YouTube IFrame Player, Dictation Studio với chấm điểm so khớp từng từ, nhập transcript, Hono Worker API + migrations ban đầu và thiết lập deploy tự động GitHub Pages).
