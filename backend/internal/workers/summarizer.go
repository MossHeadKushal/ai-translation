package workers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
)

type SummarizerWorker struct {
	config *config.Config
}

func NewSummarizerWorker(cfg *config.Config) *SummarizerWorker {
	return &SummarizerWorker{config: cfg}
}

func (w *SummarizerWorker) Process(
	ctx context.Context,
	job *jobs.Job,
	inputPath string,
	cfg map[string]any,
	onProgress ProgressCallback,
) (string, []byte, any, error) {
	length := "medium"
	if lenVal, ok := cfg["length"].(string); ok && lenVal != "" {
		length = lenVal
	}

	format := "bullet_points"
	if fmtVal, ok := cfg["format"].(string); ok && fmtVal != "" {
		format = fmtVal
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
		return "", nil, nil, fmt.Errorf("no input text or document was provided for summarization")
	}

	// STRICT REAL AI MODE (MOCK_AI=false)
	if !w.config.MockAI {
		ollamaURL := w.config.OllamaURL + "/api/generate"
		onProgress(20, fmt.Sprintf("Connecting to local Ollama inference server (%s)...", w.config.OllamaModel))

		prompt := fmt.Sprintf("Please provide a concise %s summary in %s format for the following text. Do not hallucinate:\n\n%s", length, format, sourceText)
		reqBody, _ := json.Marshal(map[string]any{
			"model":  w.config.OllamaModel,
			"prompt": prompt,
			"stream": false,
		})

		req, err := http.NewRequestWithContext(ctx, "POST", ollamaURL, bytes.NewReader(reqBody))
		if err != nil {
			return "", nil, nil, fmt.Errorf("failed to prepare Ollama request: %v", err)
		}

		req.Header.Set("Content-Type", "application/json")
		client := &http.Client{Timeout: 90 * time.Second}
		onProgress(50, "Generating summary with local transformer LLM...")
		resp, err := client.Do(req)
		if err != nil {
			return "", nil, nil, fmt.Errorf("The required AI processing model is not installed or configured: Local Ollama LLM server is not reachable at '%s'. Please start Ollama ('ollama run %s') or set MOCK_AI=true for development mode.", w.config.OllamaURL, w.config.OllamaModel)
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			return "", nil, nil, fmt.Errorf("Ollama LLM server returned error status %d. Verify model '%s' is loaded with 'ollama run %s'.", resp.StatusCode, w.config.OllamaModel, w.config.OllamaModel)
		}

		var ollamaResp struct {
			Response string `json:"response"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil || strings.TrimSpace(ollamaResp.Response) == "" {
			return "", nil, nil, fmt.Errorf("Ollama LLM returned an empty summary response")
		}

		onProgress(95, "Finalizing summary output...")
		outFilename := "summary.txt"
		outData := []byte(ollamaResp.Response)
		origWords := len(strings.Fields(sourceText))
		sumWords := len(strings.Fields(ollamaResp.Response))
		reductionRatio := 0.0
		if origWords > 0 {
			reductionRatio = 1.0 - (float64(sumWords) / float64(origWords))
			if reductionRatio < 0 {
				reductionRatio = 0.0
			}
		}

		return outFilename, outData, map[string]any{
			"summary":            ollamaResp.Response,
			"originalWordCount":  origWords,
			"summaryWordCount":   sumWords,
			"compressionRatio":   fmt.Sprintf("%.1f%%", reductionRatio*100),
			"format":             format,
			"length":             length,
			"outputFilename":     outFilename,
		}, nil
	}

	// DEVELOPMENT / MOCK MODE (MOCK_AI=true)
	stages := []struct {
		pct   int
		stage string
		dur   time.Duration
	}{
		{20, "Tokenizing document and extracting semantic key entities (Mock)", 300 * time.Millisecond},
		{50, "Synthesizing cross-attention contextual representations (Mock)", 400 * time.Millisecond},
		{80, "Generating condensed structured summary outline (Mock)", 350 * time.Millisecond},
		{95, "Refining clarity, conciseness, and bullet hierarchy (Mock)", 200 * time.Millisecond},
	}

	for _, s := range stages {
		select {
		case <-ctx.Done():
			return "", nil, nil, ctx.Err()
		case <-time.After(s.dur):
			onProgress(s.pct, s.stage)
		}
	}

	summaryText := generateExtractiveSummary(sourceText, length, format)
	outFilename := "summary.txt"
	outData := []byte(summaryText)

	origWords := len(strings.Fields(sourceText))
	sumWords := len(strings.Fields(summaryText))
	reductionRatio := 0.0
	if origWords > 0 {
		reductionRatio = 1.0 - (float64(sumWords) / float64(origWords))
		if reductionRatio < 0 {
			reductionRatio = 0.0
		}
	}

	result := map[string]any{
		"summary":            summaryText,
		"originalWordCount":  origWords,
		"summaryWordCount":   sumWords,
		"compressionRatio":   fmt.Sprintf("%.1f%%", reductionRatio*100),
		"format":             format,
		"length":             length,
		"outputFilename":     outFilename,
	}

	return outFilename, outData, result, nil
}

func generateExtractiveSummary(text, length, format string) string {
	sentences := extractSentences(text)
	if len(sentences) == 0 {
		return text
	}

	targetCount := 3
	switch length {
	case "short":
		targetCount = 2
	case "long":
		targetCount = 5
	default:
		targetCount = 3
	}

	if targetCount > len(sentences) {
		targetCount = len(sentences)
	}

	type scoredSentence struct {
		idx   int
		text  string
		score float64
	}

	wordFreq := make(map[string]int)
	stopWords := map[string]bool{
		"the": true, "and": true, "is": true, "in": true, "it": true, "of": true,
		"to": true, "a": true, "for": true, "on": true, "that": true, "this": true,
		"with": true, "as": true, "are": true, "by": true, "at": true, "from": true,
		"an": true, "be": true, "or": true, "which": true, "was": true, "our": true,
	}

	for _, s := range sentences {
		words := strings.Fields(strings.ToLower(s))
		for _, w := range words {
			clean := strings.Trim(w, ".,!?:;\"'()[]{}")
			if len(clean) > 2 && !stopWords[clean] {
				wordFreq[clean]++
			}
		}
	}

	var scored []scoredSentence
	for i, s := range sentences {
		words := strings.Fields(strings.ToLower(s))
		score := 0.0
		for _, w := range words {
			clean := strings.Trim(w, ".,!?:;\"'()[]{}")
			score += float64(wordFreq[clean])
		}
		if len(words) > 0 {
			score = score / float64(len(words))
		}
		if i == 0 {
			score *= 1.3
		}
		scored = append(scored, scoredSentence{idx: i, text: s, score: score})
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score > scored[j].score
	})

	top := scored
	if len(top) > targetCount {
		top = top[:targetCount]
	}

	sort.Slice(top, func(i, j int) bool {
		return top[i].idx < top[j].idx
	})

	var selectedTexts []string
	for _, item := range top {
		selectedTexts = append(selectedTexts, item.text)
	}

	switch format {
	case "bullet_points":
		var sb strings.Builder
		for _, s := range selectedTexts {
			sb.WriteString(fmt.Sprintf("• %s\n", s))
		}
		return strings.TrimSpace(sb.String())

	case "executive":
		return fmt.Sprintf("EXECUTIVE BRIEF:\n%s\n\nKEY TAKEAWAY:\n%s", selectedTexts[0], strings.Join(selectedTexts[1:], " "))

	default: // paragraph
		return strings.Join(selectedTexts, " ")
	}
}

func extractSentences(text string) []string {
	re := regexp.MustCompile(`[.!?\n]+`)
	raw := re.Split(text, -1)
	var out []string
	for _, s := range raw {
		trimmed := strings.TrimSpace(s)
		if len(trimmed) > 10 {
			out = append(out, trimmed)
		}
	}
	return out
}
