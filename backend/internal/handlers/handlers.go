package handlers

import (
	"encoding/json"
	"fmt"
	"mime"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
	"ai-toolbox/internal/storage"
)

type APIHandler struct {
	cfg     *config.Config
	store   *jobs.Store
	storage *storage.Storage
	queue   *jobs.Queue
}

func NewAPIHandler(cfg *config.Config, store *jobs.Store, storage *storage.Storage, queue *jobs.Queue) *APIHandler {
	return &APIHandler{
		cfg:     cfg,
		store:   store,
		storage: storage,
		queue:   queue,
	}
}

func (h *APIHandler) HealthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	activeJobs := h.store.GetActiveJobsCount()

	response := map[string]any{
		"status":            "ok",
		"version":           "1.0.0",
		"mockMode":          h.cfg.MockAI,
		"activeJobs":        activeJobs,
		"maxConcurrentJobs": h.cfg.MaxConcurrentJobs,
		"retentionHours":    h.cfg.JobRetentionHours,
		"tools": map[string]any{
			"image-to-3d": map[string]any{
				"available":   true,
				"engine":      "Local 3D Mesh Generator / GLB Pipeline",
				"mock":        h.cfg.MockAI,
				"description": "2D Image to 3D Mesh Reconstruction",
			},
			"audio-to-text": map[string]any{
				"available":   true,
				"engine":      "FFmpeg + Whisper Speech Recognition",
				"mock":        h.cfg.MockAI,
				"description": "Local Speech-to-Text Transcription",
			},
			"video-to-text": map[string]any{
				"available":   true,
				"engine":      "FFmpeg Demux + Whisper Subtitle Synthesizer",
				"mock":        h.cfg.MockAI,
				"description": "Video Subtitle & Closed-Caption Extraction",
			},
			"image-to-text": map[string]any{
				"available":   true,
				"engine":      "Tesseract / Vision Optical Character Recognition",
				"mock":        h.cfg.MockAI,
				"description": "Optical Character Recognition (OCR)",
			},
			"summarizer": map[string]any{
				"available":   true,
				"engine":      "Local LLM / Ollama Transformer",
				"mock":        h.cfg.MockAI,
				"description": "Executive & Bullet Point Document Summarization",
			},
			"translator": map[string]any{
				"available":   true,
				"engine":      "Neural Machine Translation (English ⇄ Nepali)",
				"mock":        h.cfg.MockAI,
				"description": "Offline Privacy-Preserving Neural MT",
			},
			"text-to-speech": map[string]any{
				"available":   true,
				"engine":      "Acoustic Neural Vocoder & Waveform Synthesizer",
				"mock":        h.cfg.MockAI,
				"description": "English & Nepali Natural Voice Audio Generation",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(response)
}

func (h *APIHandler) CreateJobHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"error": "Method not allowed"}`, http.StatusMethodNotAllowed)
		return
	}

	maxBytes := (h.cfg.MaxFileSizeMB + 10) * 1024 * 1024
	r.Body = http.MaxBytesReader(w, r.Body, maxBytes)

	// Parse multipart form or urlencoded form
	contentType := r.Header.Get("Content-Type")
	if strings.HasPrefix(contentType, "multipart/form-data") {
		if err := r.ParseMultipartForm(32 << 20); err != nil {
			sendJSONError(w, fmt.Sprintf("File exceeds maximum allowed size of %d MB", h.cfg.MaxFileSizeMB), http.StatusBadRequest)
			return
		}
	} else {
		_ = r.ParseForm()
	}

	toolStr := r.FormValue("tool")
	if toolStr == "" {
		sendJSONError(w, "Missing 'tool' field", http.StatusBadRequest)
		return
	}
	tool := jobs.ToolID(toolStr)

	validTools := map[jobs.ToolID]bool{
		jobs.ToolImageTo3D:   true,
		jobs.ToolAudioToText: true,
		jobs.ToolVideoToText: true,
		jobs.ToolImageToText: true,
		jobs.ToolSummarizer:  true,
		jobs.ToolTranslator:  true,
		jobs.ToolTTS:         true,
	}
	if !validTools[tool] {
		sendJSONError(w, fmt.Sprintf("Unsupported tool: %s", toolStr), http.StatusBadRequest)
		return
	}

	configMap := make(map[string]any)
	if configStr := r.FormValue("configuration"); configStr != "" {
		_ = json.Unmarshal([]byte(configStr), &configMap)
	}

	if textInput := r.FormValue("textInput"); textInput != "" {
		configMap["textInput"] = textInput
	}

	jobID := jobs.GenerateJobID()
	var inputFilename, inputPath string

	if r.MultipartForm != nil {
		file, fileHeader, err := r.FormFile("file")
		if err == nil && file != nil {
			defer file.Close()

			if fileHeader.Size > (h.cfg.MaxFileSizeMB * 1024 * 1024) {
				sendJSONError(w, fmt.Sprintf("File exceeds maximum allowed size of %d MB", h.cfg.MaxFileSizeMB), http.StatusBadRequest)
				return
			}

			ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
			if !isValidExtensionForTool(tool, ext) {
				sendJSONError(w, fmt.Sprintf("Invalid file extension '%s' for tool '%s'", ext, tool), http.StatusBadRequest)
				return
			}

			_, savedPath, saveErr := h.storage.SaveInputFile(jobID, fileHeader.Filename, file)
			if saveErr != nil {
				sendJSONError(w, "Failed to store uploaded file", http.StatusInternalServerError)
				return
			}
			inputFilename = fileHeader.Filename
			inputPath = savedPath
		}
	}

	job := &jobs.Job{
		JobID:         jobID,
		Tool:          tool,
		Status:        jobs.StatusQueued,
		Progress:      0,
		Stage:         "Job queued. Waiting for worker assignment...",
		InputFilename: inputFilename,
		InputPath:     inputPath,
		CreatedAt:     time.Now().UTC(),
		Config:        configMap,
		ClientIP:      r.RemoteAddr,
	}

	if err := h.store.SaveJob(job); err != nil {
		sendJSONError(w, "Failed to save job metadata", http.StatusInternalServerError)
		return
	}

	h.queue.Enqueue(job)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(map[string]string{
		"jobId":  jobID,
		"status": string(jobs.StatusQueued),
	})
}

func (h *APIHandler) GetJobHandler(w http.ResponseWriter, r *http.Request) {
	jobID := getURLParam(r.URL.Path, "/api/jobs/")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	job, err := h.store.GetJob(jobID)
	if err != nil {
		sendJSONError(w, "Job not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(job)
}

func (h *APIHandler) JobEventsHandler(w http.ResponseWriter, r *http.Request) {
	jobID := extractJobIDFromPath(r.URL.Path, "/events")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	job, err := h.store.GetJob(jobID)
	if err != nil {
		sendJSONError(w, "Job not found", http.StatusNotFound)
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	eventChan := h.store.Subscribe(jobID)
	defer h.store.Unsubscribe(jobID, eventChan)

	initialData, _ := json.Marshal(jobs.EventData{
		JobID:          job.JobID,
		Tool:           job.Tool,
		Status:         job.Status,
		Progress:       job.Progress,
		Stage:          job.Stage,
		ErrorMessage:   job.ErrorMessage,
		OutputFilename: job.OutputFilename,
		Result:         job.Result,
	})
	fmt.Fprintf(w, "data: %s\n\n", initialData)
	flusher.Flush()

	if job.Status == jobs.StatusCompleted || job.Status == jobs.StatusFailed || job.Status == jobs.StatusCancelled {
		return
	}

	for {
		select {
		case <-r.Context().Done():
			return
		case event, ok := <-eventChan:
			if !ok {
				return
			}
			eventBytes, _ := json.Marshal(event)
			fmt.Fprintf(w, "data: %s\n\n", eventBytes)
			flusher.Flush()

			if event.Status == jobs.StatusCompleted || event.Status == jobs.StatusFailed || event.Status == jobs.StatusCancelled {
				return
			}
		}
	}
}

func (h *APIHandler) GetResultHandler(w http.ResponseWriter, r *http.Request) {
	jobID := extractJobIDFromPath(r.URL.Path, "/result")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	job, err := h.store.GetJob(jobID)
	if err != nil {
		sendJSONError(w, "Job not found", http.StatusNotFound)
		return
	}

	if job.Status != jobs.StatusCompleted {
		sendJSONError(w, "Job processing has not completed", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(job.Result)
}

func (h *APIHandler) DownloadFileHandler(w http.ResponseWriter, r *http.Request) {
	jobID := extractJobIDFromPath(r.URL.Path, "/download")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	job, err := h.store.GetJob(jobID)
	if err != nil {
		sendJSONError(w, "Job not found", http.StatusNotFound)
		return
	}

	if job.Status != jobs.StatusCompleted || job.OutputFilename == "" {
		sendJSONError(w, "No generated output available for download", http.StatusNotFound)
		return
	}

	filePath, err := h.storage.GetJobOutputFilePath(jobID, job.OutputFilename)
	if err != nil {
		sendJSONError(w, "Output file not found on disk", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", job.OutputFilename))
	http.ServeFile(w, r, filePath)
}

func (h *APIHandler) ServeRawFileHandler(w http.ResponseWriter, r *http.Request) {
	jobID := extractJobIDFromPath(r.URL.Path, "/file")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	job, err := h.store.GetJob(jobID)
	if err != nil {
		sendJSONError(w, "Job not found", http.StatusNotFound)
		return
	}

	if job.Status != jobs.StatusCompleted || job.OutputFilename == "" {
		sendJSONError(w, "No generated output available", http.StatusNotFound)
		return
	}

	filePath, err := h.storage.GetJobOutputFilePath(jobID, job.OutputFilename)
	if err != nil {
		sendJSONError(w, "File not found", http.StatusNotFound)
		return
	}

	ext := strings.ToLower(filepath.Ext(job.OutputFilename))
	var contentType string
	switch ext {
	case ".glb":
		contentType = "model/gltf-binary"
	case ".obj":
		contentType = "text/plain; charset=utf-8"
	case ".stl":
		contentType = "model/stl"
	case ".wav":
		contentType = "audio/wav"
	case ".mp3":
		contentType = "audio/mpeg"
	case ".ogg":
		contentType = "audio/ogg"
	case ".srt", ".vtt", ".txt":
		contentType = "text/plain; charset=utf-8"
	case ".json":
		contentType = "application/json; charset=utf-8"
	default:
		contentType = mime.TypeByExtension(ext)
	}

	if contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.Header().Set("Accept-Ranges", "bytes")

	http.ServeFile(w, r, filePath)
}

func (h *APIHandler) CancelJobHandler(w http.ResponseWriter, r *http.Request) {
	jobID := extractJobIDFromPath(r.URL.Path, "/cancel")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	h.queue.CancelJob(jobID)
	_ = h.store.CancelJob(jobID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"success": true,
		"message": "Job cancellation initiated",
	})
}

func (h *APIHandler) DeleteJobHandler(w http.ResponseWriter, r *http.Request) {
	jobID := getURLParam(r.URL.Path, "/api/jobs/")
	if jobID == "" {
		sendJSONError(w, "Missing job ID", http.StatusBadRequest)
		return
	}

	h.queue.CancelJob(jobID)
	_ = h.store.DeleteJob(jobID)
	_ = h.storage.DeleteJobDir(jobID)

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{"success": true})
}

func isValidExtensionForTool(tool jobs.ToolID, ext string) bool {
	validMap := map[jobs.ToolID][]string{
		jobs.ToolImageTo3D:   {".png", ".jpg", ".jpeg", ".webp"},
		jobs.ToolAudioToText: {".mp3", ".wav", ".m4a", ".flac", ".ogg"},
		jobs.ToolVideoToText: {".mp4", ".mov", ".mkv", ".webm", ".avi"},
		jobs.ToolImageToText: {".png", ".jpg", ".jpeg", ".webp", ".bmp"},
		jobs.ToolSummarizer:  {".txt", ".md", ".pdf"},
		jobs.ToolTranslator:  {".txt", ".md"},
		jobs.ToolTTS:         {".txt"},
	}

	allowed, exists := validMap[tool]
	if !exists {
		return true
	}
	for _, a := range allowed {
		if a == ext {
			return true
		}
	}
	return false
}

func sendJSONError(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func getURLParam(path, prefix string) string {
	trimmed := strings.TrimPrefix(path, prefix)
	return strings.Split(trimmed, "/")[0]
}

func extractJobIDFromPath(path, suffix string) string {
	trimmed := strings.TrimPrefix(path, "/api/jobs/")
	trimmed = strings.TrimSuffix(trimmed, suffix)
	return strings.Trim(trimmed, "/")
}
