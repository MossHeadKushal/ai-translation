# Anonymous Self-Hosted AI Toolbox Suite 🚀

A modern, production-structured AI web application powered by a **high-concurrency Go backend** and a **React 18 + Three.js / React Three Fiber** frontend.

Built for **100% privacy, zero user accounts, zero telemetry, and zero paid cloud AI API dependencies**.

---

## 🌟 Key Capabilities & Tool Roster

| Tool | Pipeline Engine | Output Formats | Local Engine Support |
|---|---|---|---|
| **Image to 3D** | Monocular Depth + Isosurface Reconstruction | `.glb`, `.obj`, `.stl` | TripoSR / Shap-E / Local Geometry |
| **Audio to Text** | Voice Activity Detection + Acoustic Transformer | `.txt`, `.srt`, `.vtt`, `.json` | OpenAI Whisper (Local CLI) / Faster-Whisper |
| **Video to Text** | FFmpeg Demux + Whisper Subtitle Sync | `.srt`, `.vtt`, `.txt` | FFmpeg + Local Whisper |
| **Image OCR** | Optical Character Recognition & Layout Parsing | `.txt`, `.json` | Tesseract OCR / Vision OCR |
| **Smart Summarizer** | Semantic Context Distillation & Extraction | `.txt`, `.md` | Local Ollama (`llama3`, `mistral`) / llama.cpp |
| **Neural Translator** | English ⇄ Nepali & Multi-Language NMT | `.txt` | Local Neural Machine Translation Engine |
| **Text to Speech** | Harmonic Acoustic Waveform Synthesis | `.mp3`, `.wav` | Local Neural Vocoder (EN & Nepali) |

---

## 🏗️ System Architecture

```text
ai-toolbox/
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS + Three.js
│   ├── src/
│   │   ├── components/           # Dropzone, Viewer3D, JobProgressCard, Navbar, Sidebar, Footer
│   │   ├── features/             # image-to-3d, audio-to-text, video-to-text, ocr, summarizer, translator, text-to-speech
│   │   ├── hooks/                # useJobRunner (unified job lifecycle), useSystemHealth
│   │   ├── pages/                # DashboardPage, ToolPage, SystemPage
│   │   ├── services/             # Typed API client with Server-Sent Events (SSE) & polling fallback
│   │   ├── types/                # Strict TypeScript interfaces
│   │   └── utils/                # Tool definitions & configuration
│   ├── index.html
│   └── package.json
│
├── backend/                      # High-Performance Go Orchestrator
│   ├── cmd/server/main.go        # Server entrypoint with graceful shutdown & cleanup routine
│   ├── internal/
│   │   ├── config/               # Environment variables loader
│   │   ├── handlers/             # REST endpoints (Health, Jobs, Events, Downloads, File serving)
│   │   ├── jobs/                 # In-memory & SQLite metadata store, Concurrency Queue (Semaphore)
│   │   ├── middleware/           # CORS, IP Rate Limiter (60 req/min), Request Limiters
│   │   ├── storage/              # Ephemeral isolated storage (input/output/temp) & traversal guard
│   │   └── workers/              # Specialized workers for all 7 tools (MOCK_AI & Local Models)
│   ├── storage/jobs/             # Ephemeral job execution directories (auto-cleaned)
│   ├── data/                     # Persistent job metadata
│   ├── go.mod
│   └── server.exe                # Pre-compiled standalone binary
│
├── .env.example                  # Environment configuration template
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### 1. Prerequisites
- **Node.js** (v18+ recommended) & **npm**
- **Go** (1.22+)

---

### 2. Start Backend

```bash
cd backend
go run ./cmd/server
```
*The server will start on `http://localhost:8080`.*

---

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```
*The frontend development server will launch on `http://localhost:5173`.*

---

## 🧪 Mock Mode (`MOCK_AI=true`)

By default, the application runs in **Mock Mode** (`MOCK_AI=true`).

- **Zero GPU or heavy model installation required.**
- Produces **valid, playable 3D GLB models**, valid WAV audio speech, synchronized SRT subtitles, and OCR text.
- Provides realistic multi-stage processing simulation with live percentage progression and stage updates streamed via Server-Sent Events (SSE).

---

## 🔌 Connecting Real Local AI Models (`MOCK_AI=false`)

To switch to real local execution, configure `.env` in `backend/`:

```env
MOCK_AI=false
FFMPEG_PATH=ffmpeg
WHISPER_PATH=whisper
TESSERACT_PATH=tesseract
OLLAMA_URL=http://localhost:11434
MAX_CONCURRENT_JOBS=2
```

### Local Engine Dependencies:
1. **FFmpeg & Whisper (Audio/Video Speech-to-Text)**:
   - Install FFmpeg and Whisper CLI: `pip install openai-whisper`
2. **Tesseract (OCR)**:
   - Install Tesseract OCR: `winget install UB-Mannheim.TesseractOCR` or `apt install tesseract-ocr`
3. **Ollama (Summarizer)**:
   - Install Ollama from [ollama.ai](https://ollama.ai) and run `ollama run llama3`

---

## 🛡️ Security & Privacy Guarantees

1. **100% Anonymous**: No registration, passwords, JWTs, user accounts, or tracking cookies.
2. **Job Isolation**: Each job is assigned an ephemeral directory (`storage/jobs/<jobId>/`) with isolated `input/`, `output/`, and `temp/` paths.
3. **Directory Traversal Protection**: All filesystem accesses are validated against canonical base prefixes with strict boundary checks.
4. **Automatic 24h Purge**: A background cleaner automatically destroys job files and metadata older than `JOB_RETENTION_HOURS=24`.
5. **Worker Concurrency Limit**: Hard worker limits (`MAX_CONCURRENT_JOBS=2`) prevent CPU/GPU exhaustion.
6. **Rate Limiting**: Automatic IP rate limiter prevents resource abuse.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | System health, version, mock mode status, and active slots |
| `POST` | `/api/jobs` | Create a job (multipart form with `tool`, `file`, `configuration`, `textInput`) |
| `GET` | `/api/jobs/:id` | Fetch job status, progress, stage, and metadata |
| `GET` | `/api/jobs/:id/events` | Stream live Server-Sent Events (SSE) |
| `GET` | `/api/jobs/:id/result` | Retrieve structured JSON result |
| `GET` | `/api/jobs/:id/download` | Download generated file artifact with `Content-Disposition` |
| `GET` | `/api/jobs/:id/file` | Serve raw file inline for Three.js viewer or audio player |
| `POST` | `/api/jobs/:id/cancel` | Cancel an active or queued job |
| `DELETE` | `/api/jobs/:id` | Delete job metadata and associated files |

---

## 🧪 Testing & Verification

### Backend Tests:
```bash
cd backend
go test -v ./...
go vet ./...
```

### Frontend Build & Lint:
```bash
cd frontend
npm run build
npx tsc --noEmit
```
