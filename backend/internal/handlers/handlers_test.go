package handlers_test

import (
	"bytes"
	"encoding/json"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/handlers"
	"ai-toolbox/internal/jobs"
	"ai-toolbox/internal/storage"
	"ai-toolbox/internal/workers"
)

func setupTestEnv(t *testing.T) (*handlers.APIHandler, *jobs.Store, *storage.Storage, func()) {
	tempDir, err := os.MkdirTemp("", "ai-toolbox-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}

	cfg := &config.Config{
		Port:              "8080",
		MockAI:            true,
		StoragePath:       filepath.Join(tempDir, "storage"),
		DatabasePath:      filepath.Join(tempDir, "data", "app.db"),
		MaxFileSizeMB:     5,
		MaxConcurrentJobs: 2,
		JobRetentionHours: 24,
	}

	st, err := storage.New(cfg.StoragePath)
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}

	store, err := jobs.NewStore(cfg.DatabasePath, cfg.JobRetentionHours)
	if err != nil {
		t.Fatalf("failed to init store: %v", err)
	}

	dispatcher := workers.NewDispatcher(cfg, store, st)
	queue := jobs.NewQueue(cfg.MaxConcurrentJobs, store, dispatcher)
	handler := handlers.NewAPIHandler(cfg, store, st, queue)

	cleanup := func() {
		_ = os.RemoveAll(tempDir)
	}

	return handler, store, st, cleanup
}

func TestHealthHandler(t *testing.T) {
	handler, _, _, cleanup := setupTestEnv(t)
	defer cleanup()

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	rec := httptest.NewRecorder()

	handler.HealthHandler(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d", rec.Code)
	}

	var response map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf("expected status 'ok', got %v", response["status"])
	}
	if response["mockMode"] != true {
		t.Errorf("expected mockMode true, got %v", response["mockMode"])
	}
}

func TestCreateJobAndExecution(t *testing.T) {
	handler, store, _, cleanup := setupTestEnv(t)
	defer cleanup()

	// 1. Create a multipart form request with a sample PNG image
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("tool", "image-to-3d")
	_ = writer.WriteField("configuration", `{"outputFormat":"glb","quality":"fast"}`)

	part, err := writer.CreateFormFile("file", "test_cube.png")
	if err != nil {
		t.Fatalf("failed to create form file: %v", err)
	}
	part.Write([]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}) // PNG header
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/jobs", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.CreateJobHandler(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected status 201 Created, got %d. Body: %s", rec.Code, rec.Body.String())
	}

	var createResp map[string]string
	if err := json.NewDecoder(rec.Body).Decode(&createResp); err != nil {
		t.Fatalf("failed to decode create response: %v", err)
	}

	jobID := createResp["jobId"]
	if jobID == "" {
		t.Fatalf("expected non-empty jobId")
	}

	// 2. Wait for background worker processing to complete
	var finalJob *jobs.Job
	for i := 0; i < 40; i++ {
		time.Sleep(100 * time.Millisecond)
		job, err := store.GetJob(jobID)
		if err == nil && job.Status == jobs.StatusCompleted {
			finalJob = job
			break
		}
	}

	if finalJob == nil {
		t.Fatalf("job did not reach completed status within timeout")
	}

	if finalJob.Progress != 100 {
		t.Errorf("expected progress 100, got %d", finalJob.Progress)
	}
	if finalJob.OutputFilename != "model_generated.glb" {
		t.Errorf("expected outputFilename 'model_generated.glb', got %s", finalJob.OutputFilename)
	}

	// 3. Test Result endpoint
	resReq := httptest.NewRequest(http.MethodGet, "/api/jobs/"+jobID+"/result", nil)
	resRec := httptest.NewRecorder()
	handler.GetResultHandler(resRec, resReq)

	if resRec.Code != http.StatusOK {
		t.Errorf("expected status 200 for result, got %d", resRec.Code)
	}

	// 4. Test Download endpoint
	dlReq := httptest.NewRequest(http.MethodGet, "/api/jobs/"+jobID+"/download", nil)
	dlRec := httptest.NewRecorder()
	handler.DownloadFileHandler(dlRec, dlReq)

	if dlRec.Code != http.StatusOK {
		t.Errorf("expected status 200 for download, got %d", dlRec.Code)
	}
	if dlRec.Body.Len() == 0 {
		t.Errorf("expected non-empty download body")
	}
}

func TestInvalidFileExtension(t *testing.T) {
	handler, _, _, cleanup := setupTestEnv(t)
	defer cleanup()

	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("tool", "image-to-3d")

	part, _ := writer.CreateFormFile("file", "malicious.exe")
	part.Write([]byte("malicious binary content"))
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/jobs", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()

	handler.CreateJobHandler(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected status 400 Bad Request for invalid extension, got %d", rec.Code)
	}
}
