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

### 3.4. Quản lý phân đoạn câu linh hoạt trên video YouTube
- Hỗ trợ thêm các mốc phân đoạn câu trực tiếp cho mọi video YouTube (`onAddSegment`):
  - Lấy mốc thời gian bắt đầu & kết thúc trực tiếp từ vị trí phát của YouTube Player chỉ với 1 click.
  - Nhập câu tiếng Anh mẫu và bản dịch tùy chọn.
  - Phân đoạn được lưu trữ bền vững vào `localStorage` cho từng video.
- Chế độ **Sổ tay luyện nghe tự do (Freeform Dictation)** cho phép người học vừa nghe video vừa gõ ghi chú ngay cả khi chưa cắt câu.

### 3.5. Sổ tay từ vựng ngữ cảnh (Vocabulary Bank)
- Người học có thể nhấp trực tiếp vào bất kỳ từ nào trên bảng đối chiếu để lưu vào sổ từ kèm câu ngữ cảnh và mốc thời gian.
- Tính năng nhảy nhanh đến đúng mốc thời gian của từ để nghe lại trong video.

### 3.6. Lưu trữ cục bộ an toàn (Local-First Persistence)
- Tự động lưu tiến độ làm bài, điểm số câu, lịch sử gõ chữ, từ vựng và tùy chọn cá nhân vào `localStorage`.
- Có schema validation và cơ chế fallback an toàn phòng trường hợp bộ nhớ bị lỗi hoặc chế độ ẩn danh hạn chế storage.
- Không lưu thông tin nhạy cảm hay API keys trên trình duyệt.

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

Ứng dụng đi kèm bộ test toàn diện bao gồm:
- **Scoring & Alignment Tests**: Đánh giá độ chính xác Levenshtein, căn chỉnh từ, phân loại từ đúng/sai/thiếu/thừa.
- **YouTube Parser Tests**: Kiểm tra các dạng URL YouTube khác nhau.
- **Storage & Fallback Tests**: Kiểm tra độ an toàn dữ liệu trên localStorage.
- **UI & Component Integration Tests**: Kiểm thử tương tác giao diện, luồng luyện tập và phím tắt.
- **Cloudflare D1 & Hono API Tests**: Kiểm thử toàn bộ CRUD endpoints, xác thực schema, kiểm tra phân quyền multi-user, ngăn chặn truy cập trái phép và xử lý lỗi hệ thống (sử dụng in-memory SQLite D1 emulator).

```bash
# Chạy toàn bộ 79 tests (100% passing)
npm test

# Chạy linter kiểm tra mã nguồn (0 warning, 0 error)
npm run lint

# Đóng gói bản dựng sản xuất
npm run build
```

---

*Phát triển bởi đội ngũ ListenFlow — Luyện nghe tiếng Anh chuẩn từng từ qua YouTube.*
