package workers

import (
	"bytes"
	"context"
	"encoding/binary"
	"fmt"
	"math"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
)

type TTSWorker struct {
	config *config.Config
}

func NewTTSWorker(cfg *config.Config) *TTSWorker {
	return &TTSWorker{config: cfg}
}

func (w *TTSWorker) Process(
	ctx context.Context,
	job *jobs.Job,
	inputPath string,
	cfg map[string]any,
	onProgress ProgressCallback,
) (string, []byte, any, error) {
	outputFormat := "wav"
	if fmtVal, ok := cfg["outputFormat"].(string); ok && fmtVal != "" {
		outputFormat = strings.ToLower(fmtVal)
	}

	language := "en"
	if langVal, ok := cfg["language"].(string); ok && langVal != "" {
		language = langVal
	}

	voice := "natural_female"
	if vVal, ok := cfg["voice"].(string); ok && vVal != "" {
		voice = vVal
	}

	speed := 1.0
	if spdVal, ok := cfg["speed"].(float64); ok && spdVal > 0 {
		speed = spdVal
	}

	var sourceText string
	if inputPath != "" {
		if fileBytes, err := os.ReadFile(inputPath); err == nil {
			sourceText = string(fileBytes)
		}
	}
	if sourceText == "" {
		if textInputVal, ok := cfg["textInput"].(string); ok {
			sourceText = textInputVal
		}
	}

	sourceText = strings.TrimSpace(sourceText)
	if sourceText == "" {
		return "", nil, nil, fmt.Errorf("no text was provided for speech synthesis")
	}

	// STRICT REAL AI MODE (MOCK_AI=false)
	if !w.config.MockAI {
		ttsExe, err := exec.LookPath(w.config.TTSCommand)
		if err != nil || ttsExe == "" {
			return "", nil, nil, fmt.Errorf("The required AI processing model is not installed or configured: Local Text-to-Speech synthesis engine was not found at '%s'. Please install Piper TTS (e.g. piper-tts) or set MOCK_AI=true for development mode.", w.config.TTSCommand)
		}

		onProgress(25, "Synthesizing vocal mel-spectrogram with local TTS neural model...")
		outDir := filepath.Dir(inputPath)
		if outDir == "" || outDir == "." {
			outDir = filepath.Join(w.config.StoragePath, "jobs", job.JobID, "output")
		}
		outFilename := fmt.Sprintf("speech_%s.wav", language)
		outputFilePath := filepath.Join(outDir, outFilename)

		cmd := exec.CommandContext(ctx, ttsExe, "--output_file", outputFilePath)
		cmd.Stdin = strings.NewReader(sourceText)
		var stderr bytes.Buffer
		cmd.Stderr = &stderr
		if err := cmd.Run(); err != nil {
			return "", nil, nil, fmt.Errorf("local TTS engine execution failed: %v, details: %s", err, stderr.String())
		}

		audioData, readErr := os.ReadFile(outputFilePath)
		if readErr != nil {
			return "", nil, nil, fmt.Errorf("failed to read synthesized audio output: %w", readErr)
		}

		durationSec := float64(len(strings.Fields(sourceText))) * 0.45 / speed
		return outFilename, audioData, map[string]any{
			"language":       language,
			"voice":          voice,
			"speed":          speed,
			"outputFormat":   outputFormat,
			"durationSec":    math.Round(durationSec*10) / 10,
			"outputFilename": outFilename,
			"textLength":     len(sourceText),
		}, nil
	}

	// DEVELOPMENT / MOCK MODE (MOCK_AI=true)
	stages := []struct {
		pct   int
		stage string
		dur   time.Duration
	}{
		{20, "Grapheme-to-phoneme conversion & linguistic parsing (Mock)", 300 * time.Millisecond},
		{50, "Synthesizing mel-spectrogram acoustic frames (Mock)", 450 * time.Millisecond},
		{80, "Neural vocoder waveform generation & tempo scaling (Mock)", 500 * time.Millisecond},
		{95, "Normalizing audio channels & encoding output container (Mock)", 250 * time.Millisecond},
	}

	for _, s := range stages {
		select {
		case <-ctx.Done():
			return "", nil, nil, ctx.Err()
		case <-time.After(s.dur):
			onProgress(s.pct, s.stage)
		}
	}

	audioData, durationSec := generateDynamicSpeechWAV(sourceText, speed)
	outFilename := fmt.Sprintf("speech_%s.wav", language)

	result := map[string]any{
		"language":       language,
		"voice":          voice,
		"speed":          speed,
		"outputFormat":   "wav",
		"durationSec":    durationSec,
		"outputFilename": outFilename,
		"textLength":     len(sourceText),
	}

	return outFilename, audioData, result, nil
}

func generateDynamicSpeechWAV(text string, speed float64) ([]byte, float64) {
	sampleRate := 44100
	words := len(strings.Fields(text))
	if words < 1 {
		words = 5
	}

	durationSeconds := float64(words) * 0.45
	if durationSeconds < 2.0 {
		durationSeconds = 2.0
	}
	if durationSeconds > 30.0 {
		durationSeconds = 30.0
	}

	if speed > 0 {
		durationSeconds = durationSeconds / speed
	}
	numSamples := int(float64(sampleRate) * durationSeconds)

	var pcmData bytes.Buffer
	baseFreqs := []float64{261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25}

	runes := []rune(text)
	runeLen := len(runes)

	for i := 0; i < numSamples; i++ {
		t := float64(i) / float64(sampleRate)
		envelope := 1.0
		if t < 0.08 {
			envelope = t / 0.08
		} else if t > durationSeconds-0.25 {
			envelope = (durationSeconds - t) / 0.25
		}

		charIdx := int(t * float64(words) * 2.5)
		var charCode rune = 'a'
		if runeLen > 0 {
			charCode = runes[charIdx%runeLen]
		}
		freqIdx := int(charCode) % len(baseFreqs)
		freq := baseFreqs[freqIdx]

		val := 0.55*math.Sin(2*math.Pi*freq*t) + 0.25*math.Sin(2*math.Pi*freq*2*t) + 0.15*math.Sin(2*math.Pi*freq*3*t)
		sample := int16(val * envelope * 16000.0)

		_ = binary.Write(&pcmData, binary.LittleEndian, sample)
	}

	var wavHeader bytes.Buffer
	dataSize := uint32(pcmData.Len())
	fileSize := dataSize + 36

	wavHeader.WriteString("RIFF")
	_ = binary.Write(&wavHeader, binary.LittleEndian, fileSize)
	wavHeader.WriteString("WAVE")
	wavHeader.WriteString("fmt ")
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint32(16))
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint16(1))
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint16(1))
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint32(sampleRate))
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint32(sampleRate*2))
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint16(2))
	_ = binary.Write(&wavHeader, binary.LittleEndian, uint16(16))
	wavHeader.WriteString("data")
	_ = binary.Write(&wavHeader, binary.LittleEndian, dataSize)

	wavHeader.Write(pcmData.Bytes())
	return wavHeader.Bytes(), math.Round(durationSeconds*10) / 10
}
