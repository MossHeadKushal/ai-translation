package jobs

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"time"
)

type Status string

const (
	StatusQueued     Status = "queued"
	StatusProcessing Status = "processing"
	StatusCompleted  Status = "completed"
	StatusFailed     Status = "failed"
	StatusCancelled  Status = "cancelled"
)

type ToolID string

const (
	ToolImageTo3D   ToolID = "image-to-3d"
	ToolAudioToText ToolID = "audio-to-text"
	ToolVideoToText ToolID = "video-to-text"
	ToolImageToText ToolID = "image-to-text"
	ToolSummarizer  ToolID = "summarizer"
	ToolTranslator  ToolID = "translator"
	ToolTTS         ToolID = "text-to-speech"
)

type Job struct {
	JobID          string         `json:"jobId"`
	Tool           ToolID         `json:"tool"`
	Status         Status         `json:"status"`
	Progress       int            `json:"progress"`
	Stage          string         `json:"stage,omitempty"`
	InputFilename  string         `json:"inputFilename,omitempty"`
	InputPath      string         `json:"inputPath,omitempty"`
	OutputFilename string         `json:"outputFilename,omitempty"`
	OutputPath     string         `json:"outputPath,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
	StartedAt      *time.Time     `json:"startedAt,omitempty"`
	CompletedAt    *time.Time     `json:"completedAt,omitempty"`
	ErrorMessage   string         `json:"errorMessage,omitempty"`
	Config         map[string]any `json:"config,omitempty"`
	Result         any            `json:"result,omitempty"`
	ClientIP       string         `json:"-"`
}

func GenerateJobID() string {
	now := time.Now().UTC().UnixMilli()
	randomBytes := make([]byte, 6)
	_, _ = rand.Read(randomBytes)
	return fmt.Sprintf("job_%012x%s", now, hex.EncodeToString(randomBytes))
}

type EventData struct {
	JobID          string `json:"jobId"`
	Tool           ToolID `json:"tool"`
	Status         Status `json:"status"`
	Progress       int    `json:"progress"`
	Stage          string `json:"stage"`
	ErrorMessage   string `json:"errorMessage,omitempty"`
	OutputFilename string `json:"outputFilename,omitempty"`
	Result         any    `json:"result,omitempty"`
}
