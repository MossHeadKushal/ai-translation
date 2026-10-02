package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port               string
	MockAI             bool
	StoragePath        string
	DatabasePath       string
	MaxFileSizeMB      int64
	MaxConcurrentJobs  int
	JobRetentionHours  int
	FFmpegPath         string
	WhisperPath        string
	TesseractPath      string
	ImageTo3DCommand   string
	ImageTo3DModelPath string
	TTSCommand         string
	OllamaURL          string
	OllamaModel        string
}

func Load() *Config {
	port := getEnv("PORT", "8080")
	mockAIStr := getEnv("MOCK_AI", "true")
	mockAI := mockAIStr == "true" || mockAIStr == "1" || mockAIStr == "yes"

	storagePath := getEnv("STORAGE_PATH", "./storage")
	databasePath := getEnv("DATABASE_PATH", "./data/app.db")

	maxFileSizeMB, err := strconv.ParseInt(getEnv("MAX_FILE_SIZE_MB", "50"), 10, 64)
	if err != nil || maxFileSizeMB <= 0 {
		maxFileSizeMB = 50
	}

	maxConcurrentJobs, err := strconv.Atoi(getEnv("MAX_CONCURRENT_JOBS", "2"))
	if err != nil || maxConcurrentJobs <= 0 {
		maxConcurrentJobs = 2
	}

	jobRetentionHours, err := strconv.Atoi(getEnv("JOB_RETENTION_HOURS", "24"))
	if err != nil || jobRetentionHours <= 0 {
		jobRetentionHours = 24
	}

	return &Config{
		Port:               port,
		MockAI:             mockAI,
		StoragePath:        storagePath,
		DatabasePath:       databasePath,
		MaxFileSizeMB:      maxFileSizeMB,
		MaxConcurrentJobs:  maxConcurrentJobs,
		JobRetentionHours:  jobRetentionHours,
		FFmpegPath:         getEnv("FFMPEG_PATH", "ffmpeg"),
		WhisperPath:        getEnv("WHISPER_PATH", getEnv("WHISPER_COMMAND", "whisper")),
		TesseractPath:      getEnv("TESSERACT_PATH", "tesseract"),
		ImageTo3DCommand:   getEnv("IMAGE_TO_3D_COMMAND", "triposr"),
		ImageTo3DModelPath: getEnv("IMAGE_TO_3D_MODEL_PATH", ""),
		TTSCommand:         getEnv("TTS_COMMAND", "piper"),
		OllamaURL:          getEnv("OLLAMA_URL", "http://localhost:11434"),
		OllamaModel:        getEnv("OLLAMA_MODEL", "llama3"),
	}
}

func getEnv(key, defaultVal string) string {
	if val, exists := os.LookupEnv(key); exists && val != "" {
		return val
	}
	return defaultVal
}
