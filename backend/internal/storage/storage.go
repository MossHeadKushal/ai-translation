package storage

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Storage struct {
	basePath string
}

func New(basePath string) (*Storage, error) {
	cleanPath := filepath.Clean(basePath)
	jobsPath := filepath.Join(cleanPath, "jobs")
	if err := os.MkdirAll(jobsPath, 0755); err != nil {
		return nil, fmt.Errorf("failed to initialize storage directory: %w", err)
	}
	return &Storage{basePath: cleanPath}, nil
}

// InitJobDirs creates input, output, and temp directories for a specific job
func (s *Storage) InitJobDirs(jobID string) (inputDir, outputDir, tempDir string, err error) {
	safeJobID := filepath.Base(filepath.Clean(jobID))
	if safeJobID == "." || safeJobID == "/" || safeJobID == "\\" {
		return "", "", "", errors.New("invalid job ID")
	}

	jobRoot := filepath.Join(s.basePath, "jobs", safeJobID)
	inputDir = filepath.Join(jobRoot, "input")
	outputDir = filepath.Join(jobRoot, "output")
	tempDir = filepath.Join(jobRoot, "temp")

	for _, dir := range []string{inputDir, outputDir, tempDir} {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return "", "", "", fmt.Errorf("failed to create directory %s: %w", dir, err)
		}
	}

	return inputDir, outputDir, tempDir, nil
}

// SaveInputFile safely saves an uploaded reader to the job's input directory
func (s *Storage) SaveInputFile(jobID, originalFilename string, reader io.Reader) (string, string, error) {
	inputDir, _, _, err := s.InitJobDirs(jobID)
	if err != nil {
		return "", "", err
	}

	ext := strings.ToLower(filepath.Ext(originalFilename))
	// Clean extension of dangerous characters
	ext = strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '.' {
			return r
		}
		return -1
	}, ext)

	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", "", err
	}
	safeName := fmt.Sprintf("input_%s%s", hex.EncodeToString(randomBytes), ext)
	safePath := filepath.Join(inputDir, safeName)

	file, err := os.OpenFile(safePath, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0644)
	if err != nil {
		return "", "", fmt.Errorf("failed to create input file: %w", err)
	}
	defer file.Close()

	if _, err := io.Copy(file, reader); err != nil {
		return "", "", fmt.Errorf("failed to write input file data: %w", err)
	}

	return safeName, safePath, nil
}

// SaveOutputFile saves generated content to the output directory
func (s *Storage) SaveOutputFile(jobID, filename string, data []byte) (string, error) {
	safeJobID := filepath.Base(filepath.Clean(jobID))
	safeFilename := filepath.Base(filepath.Clean(filename))
	outDir := filepath.Join(s.basePath, "jobs", safeJobID, "output")

	if err := os.MkdirAll(outDir, 0755); err != nil {
		return "", err
	}

	outPath := filepath.Join(outDir, safeFilename)
	if err := os.WriteFile(outPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write output file: %w", err)
	}

	return outPath, nil
}

// GetJobOutputFilePath returns the full path for a job's output file
func (s *Storage) GetJobOutputFilePath(jobID, filename string) (string, error) {
	safeJobID := filepath.Base(filepath.Clean(jobID))
	safeFilename := filepath.Base(filepath.Clean(filename))

	outPath := filepath.Join(s.basePath, "jobs", safeJobID, "output", safeFilename)
	cleanPath := filepath.Clean(outPath)

	// Guard against directory traversal
	expectedPrefix := filepath.Clean(filepath.Join(s.basePath, "jobs", safeJobID, "output"))
	if !strings.HasPrefix(cleanPath, expectedPrefix) {
		return "", errors.New("access denied: path traversal detected")
	}

	if _, err := os.Stat(cleanPath); err != nil {
		return "", os.ErrNotExist
	}

	return cleanPath, nil
}

// DeleteJobDir recursively removes a job's directory
func (s *Storage) DeleteJobDir(jobID string) error {
	safeJobID := filepath.Base(filepath.Clean(jobID))
	jobRoot := filepath.Join(s.basePath, "jobs", safeJobID)
	return os.RemoveAll(jobRoot)
}

// CleanupOldJobs removes job directories older than retentionHours
func (s *Storage) CleanupOldJobs(retentionHours int) (int, error) {
	jobsDir := filepath.Join(s.basePath, "jobs")
	entries, err := os.ReadDir(jobsDir)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}

	cutoff := time.Now().Add(-time.Duration(retentionHours) * time.Hour)
	cleanedCount := 0

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		info, err := entry.Info()
		if err != nil {
			continue
		}
		if info.ModTime().Before(cutoff) {
			jobPath := filepath.Join(jobsDir, entry.Name())
			if err := os.RemoveAll(jobPath); err == nil {
				cleanedCount++
			}
		}
	}

	return cleanedCount, nil
}
