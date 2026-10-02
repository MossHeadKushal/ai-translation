package storage_test

import (
	"bytes"
	"os"
	"path/filepath"
	"testing"
	"time"

	"ai-toolbox/internal/storage"
)

func TestStorageOperations(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "storage-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tempDir)

	st, err := storage.New(tempDir)
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}

	jobID := "job_test123"

	// 1. Save input file
	inputContent := []byte("sample input image content")
	safeName, safePath, err := st.SaveInputFile(jobID, "original.png", bytes.NewReader(inputContent))
	if err != nil {
		t.Fatalf("failed to save input file: %v", err)
	}
	if safeName == "" || safePath == "" {
		t.Fatalf("expected non-empty safeName and safePath")
	}

	// 2. Save output file
	outputContent := []byte("generated glb binary")
	outPath, err := st.SaveOutputFile(jobID, "model.glb", outputContent)
	if err != nil {
		t.Fatalf("failed to save output file: %v", err)
	}
	if outPath == "" {
		t.Fatalf("expected non-empty outPath")
	}

	// 3. Retrieve output file path & verify content
	retrievedPath, err := st.GetJobOutputFilePath(jobID, "model.glb")
	if err != nil {
		t.Fatalf("failed to get output file path: %v", err)
	}
	data, err := os.ReadFile(retrievedPath)
	if err != nil || string(data) != "generated glb binary" {
		t.Fatalf("retrieved file content mismatch")
	}

	// 4. Test directory traversal protection
	_, err = st.GetJobOutputFilePath(jobID, "../../etc/passwd")
	if err == nil {
		t.Errorf("expected error for path traversal attempt, got nil")
	}

	// 5. Cleanup old jobs
	// Artificially change mod time
	jobDir := filepath.Join(tempDir, "jobs", jobID)
	oldTime := time.Now().Add(-48 * time.Hour)
	_ = os.Chtimes(jobDir, oldTime, oldTime)

	cleaned, err := st.CleanupOldJobs(24)
	if err != nil {
		t.Fatalf("cleanup failed: %v", err)
	}
	if cleaned != 1 {
		t.Errorf("expected 1 cleaned job dir, got %d", cleaned)
	}
}
