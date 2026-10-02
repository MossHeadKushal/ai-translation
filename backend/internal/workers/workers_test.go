package workers

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
)

func TestAudioToText_MockAndRealMode(t *testing.T) {
	ctx := context.Background()
	noOpProgress := func(pct int, stage string) {}

	// 1. Test Mock Mode (MOCK_AI=true)
	mockCfg := &config.Config{
		MockAI:      true,
		WhisperPath: "non_existent_whisper_binary",
		FFmpegPath:  "non_existent_ffmpeg_binary",
	}
	mockWorker := NewAudioToTextWorker(mockCfg)
	mockJob := &jobs.Job{JobID: "test_audio_mock", InputFilename: "test_speech.mp3"}

	tempAudioFile := filepath.Join(t.TempDir(), "test_speech.mp3")
	_ = os.WriteFile(tempAudioFile, []byte("RIFF1234WAVEfmt test audio data"), 0644)

	outFile, outData, result, err := mockWorker.Process(ctx, mockJob, tempAudioFile, map[string]any{"outputFormat": "txt"}, noOpProgress)
	if err != nil {
		t.Fatalf("Mock mode audio worker failed: %v", err)
	}
	if outFile == "" || len(outData) == 0 || result == nil {
		t.Fatalf("Mock mode returned empty output")
	}

	// 2. Test Real Mode (MOCK_AI=false) with missing model
	realCfg := &config.Config{
		MockAI:      false,
		WhisperPath: "non_existent_whisper_binary_xyz",
		FFmpegPath:  "non_existent_ffmpeg_binary_xyz",
	}
	realWorker := NewAudioToTextWorker(realCfg)
	realJob := &jobs.Job{JobID: "test_audio_real", InputFilename: "test_speech.mp3"}

	_, _, _, realErr := realWorker.Process(ctx, realJob, tempAudioFile, map[string]any{"outputFormat": "txt"}, noOpProgress)
	if realErr == nil {
		t.Fatalf("Expected error in real mode when Whisper is missing, but got nil")
	}
	if !strings.Contains(realErr.Error(), "The required AI processing model is not installed or configured") {
		t.Errorf("Expected explicit error message, got: %v", realErr)
	}
}

func TestImageTo3D_MockAndRealMode(t *testing.T) {
	ctx := context.Background()
	noOpProgress := func(pct int, stage string) {}

	tempImgFile := filepath.Join(t.TempDir(), "test_image.png")
	_ = os.WriteFile(tempImgFile, []byte{0x89, 'P', 'N', 'G', '\r', '\n', 0x1a, '\n', 0, 0, 0, 13}, 0644)

	// 1. Test Mock Mode
	mockCfg := &config.Config{
		MockAI:           true,
		ImageTo3DCommand: "non_existent_triposr",
	}
	mockWorker := NewImageTo3DWorker(mockCfg)
	mockJob := &jobs.Job{JobID: "test_3d_mock", InputFilename: "test_image.png"}

	outFile, outData, _, err := mockWorker.Process(ctx, mockJob, tempImgFile, map[string]any{"outputFormat": "glb"}, noOpProgress)
	if err != nil {
		t.Fatalf("Mock mode ImageTo3D failed: %v", err)
	}
	if outFile != "model_generated.glb" || len(outData) == 0 {
		t.Fatalf("Mock mode ImageTo3D produced invalid output")
	}

	// 2. Test Real Mode with missing command
	realCfg := &config.Config{
		MockAI:           false,
		ImageTo3DCommand: "non_existent_triposr_xyz",
	}
	realWorker := NewImageTo3DWorker(realCfg)
	realJob := &jobs.Job{JobID: "test_3d_real", InputFilename: "test_image.png"}

	_, _, _, realErr := realWorker.Process(ctx, realJob, tempImgFile, map[string]any{"outputFormat": "glb"}, noOpProgress)
	if realErr == nil {
		t.Fatalf("Expected error in real mode when 3D model is missing, but got nil")
	}
	if !strings.Contains(realErr.Error(), "Image-to-3D model is not installed or configured") {
		t.Errorf("Expected explicit error message, got: %v", realErr)
	}
}

func TestOCR_MockAndRealMode(t *testing.T) {
	ctx := context.Background()
	noOpProgress := func(pct int, stage string) {}

	tempImgFile := filepath.Join(t.TempDir(), "test_doc.png")
	_ = os.WriteFile(tempImgFile, []byte{0x89, 'P', 'N', 'G', '\r', '\n'}, 0644)

	// 1. Mock Mode
	mockCfg := &config.Config{
		MockAI:        true,
		TesseractPath: "non_existent_tesseract",
	}
	mockWorker := NewOCRWorker(mockCfg)
	mockJob := &jobs.Job{JobID: "test_ocr_mock", InputFilename: "test_doc.png"}

	_, outData, _, err := mockWorker.Process(ctx, mockJob, tempImgFile, map[string]any{}, noOpProgress)
	if err != nil || len(outData) == 0 {
		t.Fatalf("Mock OCR failed: %v", err)
	}

	// 2. Real Mode with missing Tesseract
	realCfg := &config.Config{
		MockAI:        false,
		TesseractPath: "non_existent_tesseract_xyz",
	}
	realWorker := NewOCRWorker(realCfg)
	realJob := &jobs.Job{JobID: "test_ocr_real", InputFilename: "test_doc.png"}

	_, _, _, realErr := realWorker.Process(ctx, realJob, tempImgFile, map[string]any{}, noOpProgress)
	if realErr == nil {
		t.Fatalf("Expected error in real mode when Tesseract is missing, but got nil")
	}
	if !strings.Contains(realErr.Error(), "The required AI processing model is not installed or configured") {
		t.Errorf("Expected explicit error message, got: %v", realErr)
	}
}

func TestSummarizer_MockAndRealMode(t *testing.T) {
	ctx := context.Background()
	noOpProgress := func(pct int, stage string) {}

	// 1. Mock Mode
	mockCfg := &config.Config{
		MockAI:    true,
		OllamaURL: "http://127.0.0.1:99999",
	}
	mockWorker := NewSummarizerWorker(mockCfg)
	mockJob := &jobs.Job{JobID: "test_sum_mock"}

	_, outData, _, err := mockWorker.Process(ctx, mockJob, "", map[string]any{"textInput": "Artificial intelligence processes data locally. Privacy is preserved without cloud APIs. On-premise execution is fast and secure."}, noOpProgress)
	if err != nil || len(outData) == 0 {
		t.Fatalf("Mock Summarizer failed: %v", err)
	}

	// 2. Real Mode with unreachable Ollama
	realCfg := &config.Config{
		MockAI:      false,
		OllamaURL:   "http://127.0.0.1:9999",
		OllamaModel: "llama3",
	}
	realWorker := NewSummarizerWorker(realCfg)
	realJob := &jobs.Job{JobID: "test_sum_real"}

	_, _, _, realErr := realWorker.Process(ctx, realJob, "", map[string]any{"textInput": "Some text to summarize."}, noOpProgress)
	if realErr == nil {
		t.Fatalf("Expected error in real mode when Ollama is unreachable, but got nil")
	}
	if !strings.Contains(realErr.Error(), "The required AI processing model is not installed or configured") {
		t.Errorf("Expected explicit error message, got: %v", realErr)
	}
}
