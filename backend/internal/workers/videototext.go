package workers

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
)

type VideoToTextWorker struct {
	config *config.Config
}

func NewVideoToTextWorker(cfg *config.Config) *VideoToTextWorker {
	return &VideoToTextWorker{config: cfg}
}

func (w *VideoToTextWorker) Process(
	ctx context.Context,
	job *jobs.Job,
	inputPath string,
	cfg map[string]any,
	onProgress ProgressCallback,
) (string, []byte, any, error) {
	outputFormat := "srt"
	if fmtVal, ok := cfg["outputFormat"].(string); ok && fmtVal != "" {
		outputFormat = strings.ToLower(fmtVal)
	}

	language := "en"
	if langVal, ok := cfg["language"].(string); ok && langVal != "" && langVal != "auto" {
		language = langVal
	}

	var customText string
	if textInputVal, ok := cfg["textInput"].(string); ok && strings.TrimSpace(textInputVal) != "" {
		customText = strings.TrimSpace(textInputVal)
	}

	// STRICT REAL AI MODE (MOCK_AI=false)
	if !w.config.MockAI {
		if inputPath == "" {
			return "", nil, nil, fmt.Errorf("no video input file was provided for subtitle extraction")
		}

		ffmpegExe, errF := exec.LookPath(w.config.FFmpegPath)
		whisperExe, errW := exec.LookPath(w.config.WhisperPath)

		if errF != nil || ffmpegExe == "" || errW != nil || whisperExe == "" {
			return "", nil, nil, fmt.Errorf("The required AI processing model is not installed or configured: FFmpeg or Whisper CLI was not found. Please install FFmpeg (ffmpeg.org) and Whisper (pip install openai-whisper) or set MOCK_AI=true for development mode.")
		}

		onProgress(20, "Extracting audio track from video stream via FFmpeg...")
		outDir := filepath.Dir(inputPath)
		extractedAudio := filepath.Join(outDir, "extracted_audio.wav")

		ffCmd := exec.CommandContext(ctx, ffmpegExe, "-y", "-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", extractedAudio)
		var ffErr bytes.Buffer
		ffCmd.Stderr = &ffErr
		if err := ffCmd.Run(); err != nil {
			return "", nil, nil, fmt.Errorf("FFmpeg audio extraction failed: %v, details: %s", err, ffErr.String())
		}

		onProgress(55, "Running Whisper speech recognition on extracted audio...")
		args := []string{extractedAudio, "--model", "base", "--output_format", outputFormat, "--output_dir", outDir}
		if language != "auto" && language != "" {
			args = append(args, "--language", language)
		}

		wCmd := exec.CommandContext(ctx, whisperExe, args...)
		var wStdout, wStderr bytes.Buffer
		wCmd.Stdout = &wStdout
		wCmd.Stderr = &wStderr
		if err := wCmd.Run(); err != nil {
			return "", nil, nil, fmt.Errorf("Whisper subtitle generation failed: %v, details: %s", err, wStderr.String())
		}

		onProgress(90, "Aligning subtitles and packaging container...")
		whisperOutputFile := filepath.Join(outDir, fmt.Sprintf("extracted_audio.%s", outputFormat))
		var subtitleText string
		if fileBytes, readErr := os.ReadFile(whisperOutputFile); readErr == nil {
			subtitleText = string(fileBytes)
		} else {
			subtitleText = wStdout.String()
		}

		if strings.TrimSpace(subtitleText) == "" {
			return "", nil, nil, fmt.Errorf("Whisper model completed but extracted no audible speech from the video")
		}

		outFilename := fmt.Sprintf("video_subtitles.%s", outputFormat)
		return outFilename, []byte(subtitleText), map[string]any{
			"transcript":     subtitleText,
			"language":       language,
			"outputFormat":   outputFormat,
			"cueCount":       len(strings.Split(subtitleText, "\n\n")),
			"outputFilename": outFilename,
		}, nil
	}

	// DEVELOPMENT / MOCK MODE (MOCK_AI=true)
	stages := []struct {
		pct   int
		stage string
		dur   time.Duration
	}{
		{20, "Demuxing container & extracting audio tracks via FFmpeg (Mock)", 350 * time.Millisecond},
		{45, "Running audio normalisation & Whisper speech recognition (Mock)", 450 * time.Millisecond},
		{75, "Generating synchronized timestamp cues & dialogue lines (Mock)", 400 * time.Millisecond},
		{95, "Formatting target subtitle export container (Mock)", 200 * time.Millisecond},
	}

	for _, s := range stages {
		select {
		case <-ctx.Done():
			return "", nil, nil, ctx.Err()
		case <-time.After(s.dur):
			onProgress(s.pct, s.stage)
		}
	}

	filename := "video_file"
	if job != nil && job.InputFilename != "" {
		filename = job.InputFilename
	} else if inputPath != "" {
		filename = filepath.Base(inputPath)
	}

	var subtitleContent string
	if customText != "" {
		subtitleContent = formatTranscriptWithTimestamps(customText, outputFormat)
	} else {
		subtitleContent = generateIntelligentAudioTranscript(filename, 0, language, outputFormat)
	}

	outFilename := fmt.Sprintf("video_subtitles.%s", outputFormat)
	outData := []byte(subtitleContent)
	result := map[string]any{
		"transcript":     subtitleContent,
		"language":       language,
		"outputFormat":   outputFormat,
		"cueCount":       len(strings.Split(subtitleContent, "\n\n")),
		"outputFilename": outFilename,
	}

	return outFilename, outData, result, nil
}
