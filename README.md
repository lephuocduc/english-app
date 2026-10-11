# ListenFlow — YouTube English Dictation & Listening Studio

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-132%2F132%20Pass-729B1B?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Cloudflare D1](https://img.shields.io/badge/Cloudflare_D1-Serverless_SQLite-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)

**ListenFlow** is a modern, high-performance web application designed for sentence-by-sentence English listening and dictation practice using authentic YouTube videos. Built with a local-first architecture and seamless Cloudflare D1 cloud synchronization, it combines the official YouTube IFrame Player API with dynamic word-level alignment scoring and an Anki-style SuperMemo SM-2 Spaced Repetition (SRS) vocabulary notebook.

---

## 🌟 Key Features

### 1. Interactive Dictation Studio
- **Word Count Suggestion**: Analyzes each sentence and provides an upfront suggestion (`💡 Hint: X words`) to guide learners. The typing area placeholder dynamically indicates the expected word target.
- **Live Typing Indicator**: Real-time counter (`Typed: X / Y words`) updates continuously as you type to give immediate progress feedback.
- **Dynamic Levenshtein Word-Level Alignment**:
  - Automatically normalizes casing and punctuation while preserving semantic contractions (`don't`, `it's`, `they're`) and possessives (`learner's`).
  - Normalizes smart quotes (`’`, `‘`) to standard ASCII quotes (`'`).
  - Highlights word accuracy using color-coded status badges:
    - 🟢 **Correct**: Matched word.
    - 🔴 **Incorrect**: Struck-through with the expected word suggested.
    - ⚪ **Missing**: Outlined box indicating missed words.
    - 🟡 **Extra**: Struck-through warning for redundant words.
  - Overall accuracy score rated from **0% to 100%**.
- **1-Click Retry Workflow**: Clears your current attempt, resets score indicators, replays the audio segment, and automatically refocuses the text input.
- **Transcript & Translation Reveal**: Toggle the official transcript with optional Vietnamese translation for comprehensive comprehension checking.

### 2. Official YouTube Player Integration
- **ToS Compliant**: Integrates exclusively via `window.YT` (YouTube IFrame Player API). Zero unauthorized audio extraction or download.
- **Segment Boundary Watcher**: Automatically pauses playback at segment `endTime` without latency.
- **Segment Loop Mode (<kbd>Alt</kbd> + <kbd>L</kbd>)**: Continuously loops the active sentence segment from `startTime` to `endTime` for intensive listening.
- **Blind Listening Curtain (<kbd>Alt</kbd> + <kbd>B</kbd>)**: Hides the video player with an elegant glassmorphic curtain and acoustic visualizer to prevent lip-reading and train pure auditory processing.
- **Speed Controls**: Select playback speeds (0.75x, 1x, 1.25x) without pitch distortion.
- **Reliable DOM Persistence**: Keeps the YouTube IFrame rendered across tab navigations to eliminate black-screen resets.
- **Single-Step Navigation (<kbd>Alt</kbd> + <kbd>←</kbd> / <kbd>→</kbd>)**: Global hotkey handler with repeat suppression guarantees navigating exactly one sentence per keystroke.

### 3. Contextual Vocabulary & Spaced Repetition (Anki SM-2 SRS)
- **1-Click Bookmarking**: Click any word directly from the dictation feedback to save it to your vocabulary notebook.
- **Context Preservation**: Automatically stores the word's dictionary translation, the full context sentence from the video, and the sentence translation.
- **Native Pronunciation**: Integrated Text-to-Speech (Web Speech API) with native English pronunciation.
- **SuperMemo SM-2 Spaced Repetition Engine**:
  - Four Anki review ratings:
    - 🔴 **1. Again**: Resets interval to 1 day and decreases ease factor.
    - 🟠 **2. Hard**: Applies a conservative interval increase.
    - 🟢 **3. Good**: Standard exponential interval growth (`interval × easeFactor`).
    - 🔵 **4. Easy**: Bonus interval extension and increased ease factor.
  - Next interval preview displayed directly on rating buttons (e.g., `1d`, `3d`, `7d`, `1m`).
  - **Cloze Test Mode (<kbd>C</kbd>)**: Challenges active recall by masking target words in example sentences as `[ ... ]`.
  - **3 Clean Stat Cards**: Track `Total Words`, `Due Today`, and `Mastered`.
  - **Session Completion Screen**: Celebrates review sessions with canvas confetti animations.

### 4. Flexible Subtitle & Transcript Ingestion
- **Auto-Fetch YouTube Subtitles**: Ingest official or auto-generated YouTube subtitles with accurate timestamps in one click.
- **Clipboard 1-Click Paste**: Parses copied YouTube transcripts or formatted subtitle text from clipboard automatically.
- **File Upload**: Supports importing standard `.srt`, `.vtt`, and raw text subtitle files.
- **Custom Segment Builder**: Add sentence segments manually with timestamp pickers synchronized directly with the video playback head.
- **Freeform Dictation Scratchpad**: Allows taking unstructured notes alongside any YouTube video when pre-cut segments are unavailable.

### 5. Focus Suite & Ergonomics
- **Zen / Focus Mode (<kbd>Alt</kbd> + <kbd>Z</kbd>)**: Hides all navigation elements, banners, and toolbars for a distraction-free, full-screen studio environment.
- **Deep Slate Dark Mode**: Optimized color palette (`#090d16` base with slate-800 surfaces) reducing eye strain during extended practice sessions.
- **Floating HUD**: Compact bottom dock displaying active keyboard hotkeys.
- **Keyboard Shortcuts Dialog (<kbd>?</kbd>)**: Interactive modal listing all keyboard workflows.

### 6. Cloudflare D1 Cloud Synchronization
- **Serverless SQLite**: Cloud-backed persistence via Cloudflare D1 and typed Hono REST endpoints.
- **Local-First Architecture**: Changes are immediately written locally and synchronized in the background.
- **Tombstone Sync**: Deletions recorded with tombstone markers to prevent deleted words or lessons from resurrecting upon re-sync.
- **Cross-Device Ready**: Maintain identical vocabulary and study progress between localhost and production domains.

---

## ⌨️ Keyboard Shortcuts Reference

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>Enter</kbd> | Submit and check typed answer | Dictation input focused |
| <kbd>Ctrl</kbd> + <kbd>Space</kbd> / <kbd>Alt</kbd> + <kbd>R</kbd> | Replay current sentence from beginning | Global |
| <kbd>Space</kbd> | Toggle video play / pause | Outside text inputs |
| <kbd>Alt</kbd> + <kbd>L</kbd> | Toggle sentence looping | Global |
| <kbd>Alt</kbd> + <kbd>B</kbd> | Toggle Blind Listening Mode | Global |
| <kbd>Alt</kbd> + <kbd>Z</kbd> | Toggle Zen / Focus Mode | Global |
| <kbd>Alt</kbd> + <kbd>A</kbd> | Show / hide answer transcript | Global |
| <kbd>Alt</kbd> + <kbd>→</kbd> | Jump to next sentence | Global |
| <kbd>Alt</kbd> + <kbd>←</kbd> | Jump to previous sentence | Global |
| <kbd>Esc</kbd> | Exit Focus Mode / Close modals | Global |
| <kbd>Space</kbd> / <kbd>Enter</kbd> | Flip flashcard | Flashcard modal |
| <kbd>1</kbd> / <kbd>2</kbd> / <kbd>3</kbd> / <kbd>4</kbd> | Rate flashcard (Again, Hard, Good, Easy) | Flashcard modal (back side) |
| <kbd>C</kbd> | Toggle Cloze test mode | Flashcard modal |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, TypeScript (Strict Mode) |
| **Build & Dev Tool** | Vite 8, `@tailwindcss/vite` |
| **Styling** | Tailwind CSS 4, Custom Design Tokens |
| **Icons & Visuals** | Lucide React, Canvas Confetti |
| **Video Playback** | Official YouTube IFrame Player API (`window.YT`) |
| **Backend & Cloud** | Hono 4, Cloudflare D1 (Serverless SQLite), Zod |
| **Testing** | Vitest 5, React Testing Library, `@testing-library/jest-dom`, JSDOM |
| **Linter** | Oxlint |

---

## 📁 Project Architecture

```
listenflow/
├── index.html                 # HTML shell with English localization & viewport meta
├── build.mjs                  # Release bundle pipeline script
├── wrangler.jsonc             # Cloudflare Workers & D1 database bindings
├── migrations/                # Database migrations
│   ├── 0001_initial.sql       # Users, lessons, segments, attempts, vocabulary
│   └── 0002_add_srs_columns.sql # SM-2 columns (interval, repetitions, ease_factor, etc.)
├── server/                    # Hono REST API backend
│   ├── index.ts               # Worker entry point & route registration
│   ├── db/                    # D1 query helpers & schema bindings
│   └── routes/                # Typed REST routers (lessons, attempts, vocabulary, sync)
├── src/
│   ├── components/            # Shared UI components (Navbar, KeyboardShortcutsModal, CloudSyncModal)
│   ├── data/                  # Sample lessons & default video presets
│   ├── features/
│   │   ├── dictation/         # DictationStudio, SentenceList, alignment views
│   │   ├── lessons/           # LessonsView (saved YouTube video cards & stats)
│   │   ├── progress/          # ProgressView (overall statistics & performance charts)
│   │   ├── transcript/        # TranscriptImportModal (SRT/VTT parser, auto-fetch)
│   │   ├── vocabulary/        # VocabularyView, FlashcardReviewModal, AddVocabularyModal
│   │   └── youtube/           # YouTubePlayerView, useYouTubePlayer, urlParser, YouTubeImportForm
│   ├── lib/
│   │   ├── api/               # Typed client for Hono backend endpoints
│   │   ├── scoring/           # Levenshtein word distance & alignment engine (scorer.ts)
│   │   ├── srs/               # SuperMemo SM-2 algorithm & interval calculator (sm2.ts)
│   │   ├── storage/           # Local-first storage with tombstone sync (storage.ts)
│   │   ├── transcript/        # Subtitle parser for SRT, VTT, and text (transcriptParser.ts)
│   │   └── translation/       # Dictionary & sentence translation utility (translator.ts)
│   ├── test/                  # Automated test suites (132 tests, 100% passing)
│   ├── types/                 # TypeScript domain interfaces & types
│   ├── App.tsx                # Root layout, hotkey manager, and tab router
│   ├── main.tsx               # Client entry point
│   └── index.css              # Typography & global styles
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or later (v20+ or v24+ recommended)
- **npm**: v9.0.0 or later

### Installation & Local Run
```bash
# 1. Clone the repository
git clone https://github.com/lephuocduc/english-app.git
cd english-app

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open your browser and navigate to `http://localhost:5173/`.

---

## 🧪 Testing & Quality Assurance

ListenFlow is covered by a comprehensive automated test suite consisting of **132 automated tests** across 12 test files:

```bash
# Run the complete test suite once
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run code linter
npm run lint

# Compile and build the production bundle
npm run build
```

### Test Coverage Highlights
- **Spaced Repetition & SM-2**: Interval projection, ease factor recalculation, 4-tier rating transitions, due date filtration, and cloze masking.
- **Scoring & Alignment**: Levenshtein distance calculations, punctuation and contraction preservation, smart quotes handling, and classification of correct/missing/incorrect/extra tokens.
- **YouTube URL Parser**: Format validation for standard watch URLs, timestamps, playlists, youtu.be, Shorts, Embeds, and live streams.
- **Player State & Controls**: Accurate segment boundary pausing, loop rewind, blind listening curtain toggle, and player error handling.
- **Storage & Cloud Sync**: Data schema validation, fallback handling, tombstone tracking, and Cloudflare D1 synchronization.
- **Accessibility & UX**: Keyboard hotkey dispatching, focus traps, modal interactions, and screen-reader accessibility labels.

---

## ☁️ Cloudflare D1 & Worker Deployment

### 1. Initialize Local D1 Database
```bash
# Apply migrations to your local SQLite emulator
npx wrangler d1 execute listenflow-db --local --file=./migrations/0001_initial.sql
npx wrangler d1 execute listenflow-db --local --file=./migrations/0002_add_srs_columns.sql
```

### 2. Run Local Worker API
```bash
npx wrangler dev
```

### 3. Deploy to Production
```bash
# 1. Create a D1 database on your Cloudflare account
npx wrangler d1 create listenflow-db

# 2. Copy the resulting database_id into wrangler.jsonc

# 3. Run migrations on the remote Cloudflare D1 instance
npx wrangler d1 execute listenflow-db --remote --file=./migrations/0001_initial.sql
npx wrangler d1 execute listenflow-db --remote --file=./migrations/0002_add_srs_columns.sql

# 4. Deploy the Worker API
npx wrangler deploy
```

---

## 📄 License & Attribution

This project is open-source under the [MIT License](LICENSE).

- YouTube video playback utilizes the official [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).
- Spaced Repetition scheduling is based on the [SuperMemo SM-2 Algorithm](https://www.supermemo.com/en/archives1990-2015/english/ol/sm2).
- Designed and built with ❤️ by the ListenFlow team.
