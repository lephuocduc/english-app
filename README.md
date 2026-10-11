# ListenFlow — YouTube Dictation Web Application

**ListenFlow** là ứng dụng web luyện nghe tiếng Anh và chép chính tả (dictation) theo từng câu dựa trên video YouTube, sử dụng trình phát chính thức của YouTube (official YouTube IFrame Player API), kết hợp thuật toán căn chỉnh đối chiếu từ (word-level alignment) và hệ thống lưu trữ tiến độ học tập trên trình duyệt (local-first).

---

## 1. Công nghệ sử dụng (Tech Stack)

- **Frontend Core**: React 19, TypeScript (Strict Type Checking enabled).
- **Bundler & Build Tool**: Vite 8.
- **Styling**: Tailwind CSS với bảng màu học tập thanh lịch (Soft Neutral slate-50, Indigo/Blue accents, Emerald/Rose/Amber indicators).
- **Embedded Player**: Official YouTube IFrame Player API (`window.YT`).
- **Testing**: Vitest, React Testing Library, `@testing-library/jest-dom`, JSDOM.
- **Icons**: Lucide React.
- **Package Manager**: npm.

---

## 2. Kiến trúc thư mục (Code Organization)

```
src/
├── app/                  # Application initialization
├── components/           # UI components dùng chung (Navbar, KeyboardShortcutsModal)
├── data/                 # Khởi tạo video YouTube mặc định (defaultVideo.ts)
├── features/
│   ├── dictation/        # Giao diện chép chính tả (DictationStudio, SentenceList)
│   ├── lessons/          # Thư viện bài học & chọn bài (LessonsView)
│   ├── progress/         # Thống kê tiến độ & kết quả rèn luyện (ProgressView)
│   ├── vocabulary/       # Sổ tay từ vựng ngữ cảnh (VocabularyView)
│   └── youtube/          # YouTube URL parser & IFrame Player (YouTubePlayerView, useYouTubePlayer, YouTubeImportForm)
├── lib/
│   ├── scoring/          # Thuật toán chuẩn hóa, tính điểm tương đồng & căn chỉnh từ (scorer.ts)
│   ├── storage/          # Lưu trữ tiến độ học tập an toàn vào localStorage (storage.ts)
│   └── transcript/       # Interface kiến trúc nguồn phụ đề đa nguồn (providers.ts)
├── test/                 # Test suites (scorer, urlParser, storage, DictationStudio, DictationApp)
├── types/                # Reusable TypeScript interfaces & types (index.ts)
├── App.tsx               # Root component điều phối 4 tab chính
├── main.tsx              # React DOM entry point
└── index.css             # Tailwind CSS & Typography base styles
```

---

## 3. Các tính năng cốt lõi đã triển khai

### 3.1. Phân tích & Kiểm tra đường dẫn YouTube (URL Parser)
- Hỗ trợ đầy đủ các định dạng URL YouTube thông dụng:
  - `https://www.youtube.com/watch?v=VIDEO_ID` (kèm tham số `&t=`, `&list=`, `&feature=`)
  - `https://youtu.be/VIDEO_ID`
  - `https://www.youtube.com/shorts/VIDEO_ID`
  - `https://www.youtube.com/embed/VIDEO_ID`
  - `https://www.youtube.com/live/VIDEO_ID`
  - Mã video 11 ký tự trực tiếp.
- Kiểm tra tính hợp lệ và thông báo lỗi rõ ràng bằng tiếng Việt nếu link không thuộc YouTube hoặc sai mã ID.

### 3.2. Trình phát video YouTube IFrame chính thức
- Tích hợp chuẩn qua `https://www.youtube.com/iframe_api`.
- Tuân thủ điều khoản YouTube: **Không tải xuống hay bóc tách âm thanh trái phép**.
- Xử lý mã lỗi từ YouTube (video bị xóa, chế độ riêng tư, lỗi tham số, lỗi chủ sở hữu vô hiệu hóa nhúng mã 101/150).
- Tự động dừng chính xác ở mốc thời gian kết thúc phân đoạn câu (`endTime`), hỗ trợ nghe lại câu (`onReplaySegment`), bật/tắt phát video, và tùy chỉnh tốc độ nghe (0.75x, 1x, 1.25x).

### 3.3. Động cơ tính điểm & Đối chiếu từ ngữ (Scoring Engine)
- File kiểm thử độc lập: `src/lib/scoring/scorer.ts`.
- Chuẩn hóa chữ hoa/chữ thường và loại bỏ dấu câu bao quanh (`.,!?:;""()`).
- Giữ nguyên dấu nháy đơn mang ý nghĩa từ ngữ (như đại từ rút gọn `don't`, `it's`, `they're` hay sở hữu cách `learner's`).
- Chuẩn hóa dấu nháy đơn thông minh (smart/curly quotes `’`, `‘`) về dấu chuẩn ASCII `'`.
- Sử dụng thuật toán quy hoạch động (Levenshtein Word Distance) để căn chỉnh từng từ và phân loại rõ ràng:
  - **Từ đúng (Correct)**: Màu xanh lục.
  - **Từ sai (Incorrect)**: Gạch ngang màu đỏ và hiển thị từ đúng đối chiếu.
  - **Từ bị sót (Missing)**: Khung nét đứt màu xám hiển thị từ bị thiếu.
  - **Từ thừa (Extra)**: Gạch ngang màu vàng hổ phách.
- Thang điểm chuẩn xác từ **0 đến 100%**.
- Ghi chú minh bạch: *Điểm tương đồng từ ngữ đánh giá độ chính xác khi chép lại, không đo lường khả năng phát âm*.

### 3.4. Gợi ý số lượng từ & Bộ đếm tiến độ gõ thời gian thực
- **Gợi ý số từ trong phân đoạn**: Phân tích câu nghe hiện tại và hiển thị gợi ý thông minh `💡 Gợi ý: X từ` kèm mô tả rõ ràng. Placeholder ô nhập văn bản tự động hiển thị số lượng từ mục tiêu.
- **Bộ đếm tiến độ thời gian thực**: Liên tục cập nhật theo thời gian thực khi người học gõ phím dạng `Đã gõ: X / Y từ`, giúp người học ước lượng được mức độ hoàn chỉnh của câu trước khi kiểm tra đáp án.

### 3.5. Chế độ lặp lại phân đoạn câu (Loop Mode)
- **Cơ chế lặp vô tận (Looping)**: Khi bật chế độ Loop, mỗi khi video phát đến cuối câu (`endTime`), player tự động tua ngược lại mốc bắt đầu (`startTime`) và tiếp tục phát mượt mà, giúp người học nghe đi nghe lại câu khó mà không phải bấm tay.
- **Nút điều khiển tiện lợi**: Nút Loop hiển thị trực quan cả trên thanh điều khiển YouTube Player và trong khung bài tập Dictation Studio.
- **Phím tắt toàn cục**: Nhấn <kbd>Alt</kbd> + <kbd>L</kbd> để bật/tắt nhanh chế độ lặp câu bất cứ lúc nào.

### 3.6. Sổ tay từ vựng & Hệ thống Flashcard lặp lại ngắt quãng (Anki SM-2 Spaced Repetition)
- **Tự động dịch từ vựng & câu ví dụ**: Khi người học nhấp vào một từ vựng bất kỳ từ câu nghe hoặc tự thêm từ mới:
  - Tra và dịch nghĩa riêng của từ đó sang tiếng Việt (`meaning`).
  - Trích xuất toàn bộ câu video hiện tại làm câu ví dụ ngữ cảnh (`contextSentence`).
  - Tự động dịch luôn câu ví dụ đó sang tiếng Việt (`contextSentenceTranslation`).
  - Phát âm chuẩn giọng bản xứ tích hợp (Web Speech API).
- **Hệ thống Flashcard ôn tập lặp lại ngắt quãng (Anki SRS - SuperMemo SM-2)**:
  - Tích hợp trọn vẹn thuật toán **SuperMemo SM-2** với 4 mức đánh giá chuẩn Anki:
    - 🔴 **1. Again (Quên)**: Đặt lại chu kỳ về 1 ngày, giảm hệ số dễ (`easeFactor`).
    - 🟠 **2. Hard (Khó)**: Tăng khoảng cách thận trọng, giảm nhẹ hệ số dễ.
    - 🟢 **3. Good (Nhớ)**: Giãn cách ngày theo cấp số nhân (`interval * easeFactor`).
    - 🔵 **4. Easy (Dễ)**: Thưởng thêm khoảng cách ôn tập dài và tăng hệ số dễ.
  - **Dự báo trước khoảng cách ôn tập**: Hiển thị trực tiếp số ngày của chu kỳ tiếp theo trên từng nút bấm (vd: `1 ngày`, `3 ngày`, `7 ngày`, `1 tháng`).
  - **Đánh dấu đã thuộc (Mastered)**: Người học có thể nhấn nút đánh dấu đã thuộc ngay trên danh sách hoặc phím tắt <kbd>M</kbd> trong Flashcard.
  - **Chế độ Cloze Test (Ẩn từ trong câu ví dụ)**: Thử thách trí nhớ bằng cách tự động biến từ vựng trong câu ví dụ thành dạng `[ ... ]` (phím tắt <kbd>C</kbd>).
  - **Bảng thống kê SRS 4 chỉ số**: Theo dõi *Tổng số từ*, *Cần ôn hôm nay (Due)*, *Đang học*, và *Đã thuộc* kèm các tab lọc tức thì.
  - **Màn hình hoàn thành & Pháo hoa Confetti**: Tự động bắn pháo hoa chúc mừng khi hoàn thành phiên ôn tập và cho phép ôn lại nhanh các từ chưa nhớ.

### 3.7. Dịch câu sang tiếng Việt khi xem đáp án
- Khi người học bấm nút **"Xem đáp án"** (<kbd>Alt</kbd> + <kbd>A</kbd>), ngoài câu tiếng Anh gốc, hệ thống tự động hiển thị bản dịch tiếng Việt tương ứng ngay bên dưới: `🇻🇳 Dịch nghĩa tiếng Việt: [Bản dịch]` giúp người học nắm bắt nội dung trọn vẹn.

### 3.8. Tối ưu hóa trình phát video YouTube & Khắc phục màn hình đen
- **Duy trì DOM IFrame ổn định**: Khung player YouTube được duy trì liên tục trong cây DOM bằng CSS khi chuyển đổi giữa các tab ứng dụng ("Luyện tập", "Video của tôi", "Từ vựng") thay vì bị hủy và tái tạo.
- **Tự động phục hồi khi chuyển tab trình duyệt**: Lắng nghe sự kiện `visibilitychange` và `focus` của trình duyệt, tự động kích hoạt GPU repaint và kiểm tra khôi phục IFrame nếu Chromium giải phóng bộ nhớ đồ họa nền.
- **Nút làm mới thủ công**: Cung cấp nút "Làm mới khung hình video" giúp người dùng sửa nhanh khung phát video chỉ với 1 click.

### 3.9. Điều hướng câu chuẩn xác (Single Step Navigation)
- Hợp nhất các phím tắt <kbd>Alt</kbd> + <kbd>→</kbd> (câu tiếp theo) và <kbd>Alt</kbd> + <kbd>←</kbd> (câu trước đó) về bộ lắng nghe toàn cục ở root ứng dụng, loại bỏ hoàn toàn lỗi duplicate event bubbling khiến câu bị nhảy cóc 2 đoạn.
- Tích hợp cờ chặn `e.repeat` khi giữ phím lâu, đảm bảo mỗi lần nhấn phím chuyển chính xác từng câu một.

### 3.10. Quản lý phân đoạn câu linh hoạt trên video YouTube
- Hỗ trợ thêm các mốc phân đoạn câu trực tiếp cho mọi video YouTube (`onAddSegment`):
  - Lấy mốc thời gian bắt đầu & kết thúc trực tiếp từ vị trí phát của YouTube Player chỉ với 1 click.
  - Nhập câu tiếng Anh mẫu và bản dịch tùy chọn.
  - Phân đoạn được lưu trữ bền vững vào `localStorage` cho từng video.
- Chế độ **Sổ tay luyện nghe tự do (Freeform Dictation)** cho phép người học vừa nghe video vừa gõ ghi chú ngay cả khi chưa cắt câu.

### 3.11. Đồng bộ hóa xóa từ vựng hai chiều (Local & Cloud Tombstones)
- Xóa từ vựng đồng bộ tức thì lên Cloudflare D1 cơ sở dữ liệu đám mây.
- Quản lý danh sách ghi nhớ từ đã xóa (Deleted Tombstones) trong `localStorage`. Khi người học tải lại trang web (F5 / reload), hệ thống ngăn chặn cơ chế Cloud Sync hồi sinh các từ vựng đã bị xóa trước đó.

### 3.12. Lưu trữ cục bộ an toàn (Local-First Persistence)
- Tự động lưu tiến độ làm bài, điểm số câu, lịch sử gõ chữ, từ vựng và tùy chọn cá nhân vào `localStorage`.
- Có schema validation và cơ chế fallback an toàn phòng trường hợp bộ nhớ bị lỗi hoặc chế độ ẩn danh hạn chế storage.
- Không lưu thông tin nhạy cảm hay API keys trên trình duyệt.

### 3.13. Bộ công cụ tăng cường sự tập trung cao độ (Focus Suite & UX/UI Enhancements)
- **Chế độ tập trung Zen Mode (<kbd>Alt</kbd> + <kbd>Z</kbd>)**:
  - Tự động ẩn thanh tiêu đề header, thanh import nhanh và các bảng mẹo vặt gây xao nhãng.
  - Chuyển giao diện sang studio toàn màn hình tinh gọn với thanh thoát siêu mỏng ở góc trên.
  - Nhấn <kbd>Alt</kbd> + <kbd>Z</kbd> hoặc <kbd>Esc</kbd> để bật/tắt nhanh bất kỳ lúc nào.
- **Chế độ nghe mù (Blind Listening Mode - <kbd>Alt</kbd> + <kbd>B</kbd>)**:
  - Kích hoạt lớp rèm mờ màu tối (dark glassmorphic curtain) che phủ trình phát YouTube kèm hoạt ảnh tai nghe và sóng âm thanh nhịp nhàng.
  - Ngăn người học dựa dẫm vào hình ảnh hoặc khẩu hình miệng, kích thích tối đa năng lực phản xạ âm thanh và nhận diện ngữ âm chuẩn xác.
- **Giao diện tối chuyên sâu (Deep Slate Dark Mode)**:
  - Tích hợp bảng màu Dark Mode cao cấp (nền `#090d16` và slate siêu êm dịu), chống mỏi mắt khi luyện nghe chép chính tả thời gian dài.
  - Đồng bộ tự động với tùy chọn cá nhân trong `localStorage`.
- **Thanh phím tắt nổi rảnh tay (Floating Keyboard HUD)**:
  - Dock điều khiển nổi nhỏ gọn đặt ở cạnh dưới màn hình, hiển thị trực quan các phím tắt cốt lõi: <kbd>Alt+R</kbd> (Nghe lại), <kbd>Alt+L</kbd> (Lặp lại), <kbd>Alt+B</kbd> (Nghe mù), <kbd>Alt+Z</kbd> (Tập trung), <kbd>Alt+A</kbd> (Đáp án), <kbd>Alt+←/→</kbd> (Chuyển câu).
  - Giúp người học thao tác 100% bằng bàn phím mà không cần rời tay để dùng chuột.
- **Tối ưu trải nghiệm gõ phím (Typing Ergonomics)**:
  - Khung nhập văn bản rộng rãi hơn, cỡ chữ phóng lớn dễ đọc (`text-base sm:text-lg`).
  - Viền phát sáng tập trung (`focus:ring-4 focus:ring-indigo-500/10`) giúp giữ vững tầm nhìn khi đang chép câu.

---

## 4. Hướng dẫn cài đặt & Khởi chạy

### Yêu cầu hệ thống:
- Node.js version 18+ (khuyến nghị Node.js v20 hoặc v24)
- npm version 9+

### Khởi chạy môi trường phát triển (Development):
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev
```
Truy cập ứng dụng tại địa chỉ: `http://localhost:5173/`

### Chạy kiểm thử tự động (Testing):
```bash
# Chạy toàn bộ 47 unit và component tests
npm test

# Chạy ở chế độ watch liên tục
npm run test:watch
```

### Đóng gói ứng dụng cho môi trường sản xuất (Production Build):
```bash
npm run build
```
Bản dựng tối ưu hóa sẽ được xuất ra thư mục `dist/`.

---

## 5. Cloudflare D1 & Hono API Architecture

ListenFlow tích hợp hệ thống lưu trữ đám mây bền vững sử dụng **Cloudflare D1** (Serverless SQLite) kết hợp cùng backend API siêu nhẹ và an toàn viết bằng **Hono**:

### 5.1. Cấu trúc bảng cơ sở dữ liệu (D1 Database Schema)
Các bảng được định nghĩa trong `migrations/0001_initial.sql`:
- **`users`**: Quản lý danh tính người dùng độc lập, không lưu trữ thông tin cá nhân không cần thiết (không lưu mật khẩu dạng plain text, không theo dõi định danh xâm phạm quyền riêng tư).
- **`lessons`**: Lưu trữ siêu dữ liệu video YouTube do người học thêm vào (ID video, tiêu đề, mô tả, cấp độ). **Không bao giờ lưu trữ tệp âm thanh hoặc video có bản quyền**.
- **`transcript_segments`**: Các mốc câu văn bản do người dùng nhập hoặc cung cấp kèm mốc thời gian `start_time` và `end_time`.
- **`dictation_attempts`**: Lịch sử các lần gõ chép chính tả, lưu trữ điểm số (0-100), độ chính xác (`accuracy`), số từ đúng (`correct_count`), từ thiếu (`missing_count`), từ sai (`incorrect_count`), và từ thừa (`extra_count`).
- **`sentence_progress`**: Tiến độ học tập và trạng thái làm chủ từng câu (đáp án người dùng đã gõ, điểm cao nhất, số lần thử, trạng thái hoàn thành).
- **`saved_vocabulary`**: Sổ tay từ vựng ngữ cảnh của người học, liên kết với câu mẫu và mốc thời gian video.

### 5.2. Các Typed API Endpoints (Hono Router)
Mọi endpoint đều được định kiểu và xác thực schema với **Zod**, truy vấn 100% bằng **parameterized queries** (`prepare(...).bind(...)`):
- `GET /api/health` — Kiểm tra trạng thái máy chủ và kết nối D1.
- `GET /api/lessons` & `POST /api/lessons` — Xem danh sách và tạo bài học mới.
- `GET /api/lessons/:id`, `PUT /api/lessons/:id`, `DELETE /api/lessons/:id` — Thao tác CRUD bài học với kiểm tra quyền sở hữu (`user_id`).
- `GET /api/segments/lessons/:lessonId` & `POST /api/segments/lessons/:lessonId` — Lấy và thêm các phân đoạn câu (đơn lẻ hoặc hàng loạt).
- `PUT /api/segments/:id` & `DELETE /api/segments/:id` — Cập nhật và xóa phân đoạn câu.
- `POST /api/attempts` — Ghi nhận kết quả làm bài dictation và tự động cập nhật bảng tiến độ câu.
- `GET /api/attempts/lessons/:lessonId` — Lịch sử thử sức theo bài học.
- `GET /api/progress/lessons/:lessonId` & `PUT /api/progress/lessons/:lessonId/:segmentId` — Truy vấn và cập nhật tiến độ học tập.
- `GET /api/vocabulary`, `POST /api/vocabulary`, `DELETE /api/vocabulary/:id` — Sổ tay từ vựng của người học.

### 5.3. Bảo mật, Phân quyền & Quyền riêng tư (Security & Privacy)
- **Kiểm tra quyền sở hữu (Ownership Enforcement)**: Mọi thao tác truy vấn và biến đổi dữ liệu đều xác thực quyền sở hữu của `userId` hiện tại. Người dùng A không thể đọc, sửa hoặc xóa dữ liệu của Người dùng B (trả về mã lỗi 403 Forbidden).
- **Bảo vệ Secrets ở Server-side**: Khóa bí mật API (`API_SECRET`) và khóa ký token được cấu hình ở Cloudflare Worker Secrets (`.dev.vars` / Cloudflare Dashboard), không bao giờ bị lộ ra phía client.
- **Phòng chống SQL Injection**: 100% câu truy vấn cơ sở dữ liệu sử dụng Parameterized Query Binding của Cloudflare D1.
- **Bản quyền nội dung**: Tuyệt đối không lưu trữ hay cache bất kỳ file video hoặc audio nhị phân nào từ YouTube mà không có bản quyền. Ứng dụng chỉ lưu giữ ID video công khai và các mốc thời gian học tập.

### 5.4. Hướng dẫn thiết lập & Chạy Migrations cục bộ (Local D1 Setup)

1. **Cấu hình Wrangler**:
   Kiểm tra tệp [wrangler.jsonc](file:///g:/My%20Drive/L%C3%AA%20Ph%C6%B0%E1%BB%9Bc%20%C4%90%E1%BB%A9c/English%20app/wrangler.jsonc) đã khai báo binding `DB` cho D1 database `listenflow-db`.

2. **Chạy Migration cục bộ**:
   ```bash
   # Tạo cấu trúc các bảng trên cơ sở dữ liệu D1 local
   npx wrangler d1 execute listenflow-db --local --file=./migrations/0001_initial.sql
   ```

3. **Nạp dữ liệu mẫu (Sample Seed Data)**:
   ```bash
   # Nạp dữ liệu bài học mẫu, phân đoạn câu và từ vựng mẫu
   npx wrangler d1 execute listenflow-db --local --file=./migrations/seed.sql
   ```

4. **Khởi chạy Hono API Worker ở chế độ phát triển**:
   ```bash
   npx wrangler dev
   ```

5. **Triển khai lên Cloudflare Workers (Production)**:
   ```bash
   # 1. Tạo database D1 trên Cloudflare
   npx wrangler d1 create listenflow-db
   
   # 2. Cập nhật database_id vào wrangler.jsonc
   
   # 3. Chạy migration trên production
   npx wrangler d1 execute listenflow-db --remote --file=./migrations/0001_initial.sql
   
   # 4. Triển khai API Worker
   npx wrangler deploy
   ```

---

## 6. Kiểm thử tự động (Test Suite)

Ứng dụng đi kèm bộ test toàn diện với **126 tests** (100% passing) bao gồm:
- **Spaced Repetition & SM-2 Tests**: Kiểm tra thuật toán lặp lại ngắt quãng Anki SM-2, tính toán chu kỳ interval, cập nhật ease factor, đánh giá 4 mức Again/Hard/Good/Easy, lọc từ đến hạn ôn tập (due), chế độ cloze test câu ngữ cảnh.
- **Scoring & Alignment Tests**: Đánh giá độ chính xác Levenshtein, căn chỉnh từ, phân loại từ đúng/sai/thiếu/thừa.
- **YouTube Parser Tests**: Kiểm tra các dạng URL YouTube khác nhau.
- **Storage & Cloud Sync Tests**: Kiểm tra độ an toàn dữ liệu trên localStorage, cơ chế tombstone ngăn ngừa hồi sinh từ vựng đã xóa.
- **UI & Component Integration Tests**: Kiểm thử tương tác giao diện, Flashcard review, sổ từ vựng, luồng luyện tập và phím tắt.
- **New Feature Tests**: Kiểm thử gợi ý số từ, đếm từ thời gian thực, bật/tắt chế độ lặp lại câu (Loop), dịch nghĩa từ vựng & câu ví dụ, dịch đáp án tiếng Việt, điều hướng đơn câu không nhảy cóc.
- **Cloudflare D1 & Hono API Tests**: Kiểm thử toàn bộ CRUD endpoints, xác thực schema, kiểm tra phân quyền multi-user, ngăn chặn truy cập trái phép và xử lý lỗi hệ thống (sử dụng in-memory SQLite D1 emulator).

```bash
# Chạy toàn bộ 126 tests (100% passing)
npm test

# Chạy linter kiểm tra mã nguồn (0 warning, 0 error)
npm run lint

# Đóng gói bản dựng sản xuất
npm run build
```

---

*Phát triển bởi đội ngũ ListenFlow — Luyện nghe tiếng Anh chuẩn từng từ qua YouTube.*
