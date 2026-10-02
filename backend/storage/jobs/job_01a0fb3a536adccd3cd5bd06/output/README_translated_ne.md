# Aहोइनnymous Self-Hosted AI Toolbox Suite 🚀

एउटा modern, production-structured AI web application powered द्वारा एउटा **नमस्तेgh-concurrency जानु backend** र एउटा **React 18 + Three.js / React Three Fiber** frontend.

Built को लागि **100% privacy, zero user accounts, zero telemetry, र zero paid cloud AI API dependencies**.

---

## 🌟 Key Capabilities & उपकरण Roster

| उपकरण | Pipeline Engine | Output Formats | स्थानीय Engine Support |
|---|---|---|---|
| **Image लाई / तिर 3D** | Moहोइनcular Depth + Isosurface Reconstruction | `.glb`, `.obj`, `.stl` | TripoSR / Shap-E / स्थानीय Geometry |
| **Audio लाई / तिर Text** | Voice Activity Detection + Acoustic Transformer | `.txt`, `.srt`, `.vtt`, `.json` | OpenAI Wनमस्तेsper स्थानीयl CLI) / Faster-Whisper |
| **Video लाई / तिर Text** | FFmpeg Demux + Wनमस्तेsper Subtitle Sync | `.srt`, `.vtt`, `.txt` | FFmpeg + स्थानीय Whisper |
| **Image OCR** | Optical Character Recognition & Layout Parsing | `.txt`, `.json` | Tesseract OCR / Vision OCR |
| **Smart Summarizer** | Semantic Context Distillation & Extraction | `.txt`, `.md` | स्थानीय Ollama (`llama3`, `mistral`) / llama.cpp |
| **Neural Translator** | English ⇄ Nepali & Multi-Language NMT | `.txt` | स्थानीय Neural Macनमस्तेne Translation Engine |
| **Text लाई / तिर Speech** | Harmonic Acoustic Waveform Synthesis | `.mp3`, `.wav` | स्थानीय Neural Vocoder (EN & Nepali) |

---

## 🏗️ प्रणाली Arcनमस्तेtecture

```text
ai-toolbox/
├── frontend/ # React 18 + TypeScript + Vite + Tailwind CSS + Three.js
│ ├── src/
│ │ ├── components/ # Dropzone, Viewer3D, JobProgressCard, Navbar, Sidebar, Footer
│ │ ├── features/ # image-to-3d, audio-to-text, video-to-text, ocr, summarizer, translator, text-to-speech
│ │ ├── hooks/ # useJobRunner (unified job lifecycle), useSystemHealth
│ │ ├── pages/ # DashboardPage, ToolPage, SystemPage
│ │ ├── services/ # Typed API client साथमा / ले Server-Sent Events (SSE) & polling fallback
│ │ ├── types/ # Strict TypeScript interfaces
│ │ └── utils/ # उपकरण definitions & configuration
│ ├── index.html
│ └── package.json
│
├── backend/ # नमस्तेgh-Performance जानु Orchestrator
│ ├── cmd/server/main.go # सर्भर entrypoint साथमा / ले graceful shutdown & cleanup routine
│ ├── internal/
│ │ ├── config/ # Environment variables loader
│ │ ├── handlers/ # REST endpoints स्वास्थ्यh, Jobs, Events, Downloads, File serving)
│ │ ├── jobs/ # In-memory & SQLite metadata store, Concurrency Queue (Semaphore)
│ │ ├── middleware/ # CORS, IP Rate Limiter (60 req/min), Request Limiters
│ │ ├── storage/ # Ephemeral isolated storage (input/output/temp) & traversal guard
│ │ └── workers/ # Specialized workers को लागि सबै 7 tools (MOCK_AI & स्थानीय Models)
│ ├── storage/jobs/ # Ephemeral job execution directories (auto-cleaned)
│ ├── data/ # Persistent job metadata
│ ├── go.mod
│ └── server.exe # Pre-compiled standalone binary
│
├── .env.example # Environment configuration template
└── README.md
```

---

## ⚡ Quick Start स्थानीयl Development)

### 1. Prerequisites
- **होइनde.js** (v18+ recommended) & **npm**
- **Go** (1.22+)

---

### 2. Start Backend

```bash
cd backend
जानु दौडनु ./cmd/server
```
*The सर्भर हुनेछ / गर्नेछ start मा / माथि `http://localhost:8080`.*

---

### 3. Start Frontend

```bash
cd frontend
npm install
npm दौडनु dev
```
*The frontend development सर्भर हुनेछ / गर्नेछ launch मा / माथि `http://localhost:5173`.*

---

## 🧪 Mock Mode (`MOCK_AI=true`)

द्वारा default, त्यो application runs मा **Mock Mode** (`MOCK_AI=true`).

- **Zero GPU वा heavy मोडल installation required.**
- Produces **valid, playable 3D GLB models**, valid WAV audio speech, synchronized SRT subtitles, र OCR text.
- Provides realistic multi-stage processing simulation साथमा / ले live percentage progression र stage updates streamed via Server-Sent Events (SSE).

---

## 🔌 Connecting Real स्थानीय AI Models (`MOCK_AI=false`)

लाई / तिर switch लाई / तिर real स्थानीय execution, configure `.env` मा `backend/`:

```env
MOCK_AI=false
FFMPEG_PATH=ffmpeg
Wनमस्तेSPER_PATH=whisper
TESSERACT_PATH=tesseract
OLLAMA_URL=http://localhost:11434
MAX_CONCURRENT_JOBS=2
```

### स्थानीय Engine Dependencies:
1. **FFmpeg & Wनमस्तेsper (Audio/Video Speech-to-Text)**:
- Install FFmpeg र Wनमस्तेsper CLI: `pip install openai-whisper`
2. **Tesseract (OCR)**:
- Install Tesseract OCR: `winget install UB-Mannheim.TesseractOCR` वा `apt install tesseract-ocr`
3. **Ollama (Summarizer)**:
- Install Ollama बाट [ollama.ai](https://ollama.ai) र दौडनु `ollama दौडनु llama3`

---

## 🛡️ Security & Privacy Guarantees

1. **100% Aहोइनnymous**: होइन registration, passwords, JWTs, user accounts, वा tracking cookies.
2. **Job Isolation**: Each job हो assigned एउटा ephemeral directory (`storage/jobs/<jobId>/`) साथमा / ले isolated `input/`, `output/`, र `temp/` paths.
3. **Directory Traversal Protection**: सबै filesystem accesses हुन् / छन् validated against caहोइनnical base prefixes साथमा / ले strict boundary checks.
4. **Automatic 24h Purge**: एउटा background cleaner automatically destroys job files र metadata older than `JOB_RETENTION_HOURS=24`.
5. **Worker Concurrency Limit**: गाह्रो worker limits (`MAX_CONCURRENT_JOBS=2`) prevent CPU/GPU exhaustion.
6. **Rate Limiting**: Automatic IP rate limiter prevents resource abuse.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | प्रणाली स्वास्थ्य, version, mock mode status, र active slots |
| `POST` | `/api/jobs` | सिर्जना गर्नु एउटा job (multipart form साथमा / ले `tool`, `file`, `configuration`, `textInput`) |
| `GET` | `/api/jobs/:id` | Fetch job status, progress, stage, र metadata |
| `GET` | `/api/jobs/:id/events` | Stream live Server-Sent Events (SSE) |
| `GET` | `/api/jobs/:id/result` | Retrieve structured JSON result |
| `GET` | `/api/jobs/:id/download` | Download generated file artifact साथमा / ले `Content-Disposition` |
| `GET` | `/api/jobs/:id/file` | Serve raw file inline को लागि Three.js viewer वा audio player |
| `POST` | `/api/jobs/:id/cancel` | Cancel एउटा active वा queued job |
| `DELETE` | `/api/jobs/:id` | Delete job metadata र associated files |

---

## 🧪 Testing & Verification

### Backend Tests:
```bash
cd backend
जानु test -v ./...
जानु vet ./...
```

### Frontend निर्माण गर्नु & Lint:
```bash
cd frontend
npm दौडनु निर्माण गर्नु
npx tsc --होइनEmit
```