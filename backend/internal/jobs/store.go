package jobs

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"
	"time"
)

type Store struct {
	mu           sync.RWMutex
	jobs         map[string]*Job
	subscribers  map[string][]chan EventData
	dbFilePath   string
	retentionHrs int
}

func NewStore(dbFilePath string, retentionHours int) (*Store, error) {
	cleanDBPath := filepath.Clean(dbFilePath)
	if err := os.MkdirAll(filepath.Dir(cleanDBPath), 0755); err != nil {
		return nil, err
	}

	store := &Store{
		jobs:         make(map[string]*Job),
		subscribers:  make(map[string][]chan EventData),
		dbFilePath:   cleanDBPath,
		retentionHrs: retentionHours,
	}

	// Load existing persistent jobs if file exists
	if data, err := os.ReadFile(cleanDBPath); err == nil && len(data) > 0 {
		var savedJobs map[string]*Job
		if err := json.Unmarshal(data, &savedJobs); err == nil {
			store.jobs = savedJobs
		}
	}

	return store, nil
}

func (s *Store) SaveJob(job *Job) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.jobs[job.JobID] = job
	s.persistAsync()
	return nil
}

func (s *Store) GetJob(jobID string) (*Job, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	job, exists := s.jobs[jobID]
	if !exists {
		return nil, errors.New("job not found")
	}

	// Return a copy
	jobCopy := *job
	return &jobCopy, nil
}

func (s *Store) UpdateProgress(jobID string, progress int, stage string) error {
	s.mu.Lock()
	job, exists := s.jobs[jobID]
	if !exists {
		s.mu.Unlock()
		return errors.New("job not found")
	}

	job.Progress = progress
	job.Stage = stage
	if job.Status == StatusQueued {
		job.Status = StatusProcessing
		now := time.Now().UTC()
		job.StartedAt = &now
	}

	event := EventData{
		JobID:          job.JobID,
		Tool:           job.Tool,
		Status:         job.Status,
		Progress:       job.Progress,
		Stage:          job.Stage,
		ErrorMessage:   job.ErrorMessage,
		OutputFilename: job.OutputFilename,
		Result:         job.Result,
	}
	s.mu.Unlock()

	s.broadcast(jobID, event)
	return nil
}

func (s *Store) CompleteJob(jobID, outputFilename, outputPath string, result any) error {
	s.mu.Lock()
	job, exists := s.jobs[jobID]
	if !exists {
		s.mu.Unlock()
		return errors.New("job not found")
	}

	now := time.Now().UTC()
	job.Status = StatusCompleted
	job.Progress = 100
	job.Stage = "Processing completed successfully"
	job.CompletedAt = &now
	job.OutputFilename = outputFilename
	job.OutputPath = outputPath
	job.Result = result

	event := EventData{
		JobID:          job.JobID,
		Tool:           job.Tool,
		Status:         job.Status,
		Progress:       100,
		Stage:          job.Stage,
		OutputFilename: outputFilename,
		Result:         result,
	}
	s.mu.Unlock()

	s.persistAsync()
	s.broadcast(jobID, event)
	return nil
}

func (s *Store) FailJob(jobID, errorMsg string) error {
	s.mu.Lock()
	job, exists := s.jobs[jobID]
	if !exists {
		s.mu.Unlock()
		return errors.New("job not found")
	}

	now := time.Now().UTC()
	job.Status = StatusFailed
	job.ErrorMessage = errorMsg
	job.Stage = "Failed: " + errorMsg
	job.CompletedAt = &now

	event := EventData{
		JobID:        job.JobID,
		Tool:         job.Tool,
		Status:       job.Status,
		Progress:     job.Progress,
		Stage:        job.Stage,
		ErrorMessage: errorMsg,
	}
	s.mu.Unlock()

	s.persistAsync()
	s.broadcast(jobID, event)
	return nil
}

func (s *Store) CancelJob(jobID string) error {
	s.mu.Lock()
	job, exists := s.jobs[jobID]
	if !exists {
		s.mu.Unlock()
		return errors.New("job not found")
	}

	now := time.Now().UTC()
	job.Status = StatusCancelled
	job.Stage = "Cancelled by user"
	job.CompletedAt = &now

	event := EventData{
		JobID:    job.JobID,
		Tool:     job.Tool,
		Status:   job.Status,
		Progress: job.Progress,
		Stage:    job.Stage,
	}
	s.mu.Unlock()

	s.persistAsync()
	s.broadcast(jobID, event)
	return nil
}

func (s *Store) DeleteJob(jobID string) error {
	s.mu.Lock()
	delete(s.jobs, jobID)
	s.mu.Unlock()

	s.persistAsync()
	return nil
}

func (s *Store) Subscribe(jobID string) chan EventData {
	s.mu.Lock()
	defer s.mu.Unlock()

	ch := make(chan EventData, 10)
	s.subscribers[jobID] = append(s.subscribers[jobID], ch)
	return ch
}

func (s *Store) Unsubscribe(jobID string, ch chan EventData) {
	s.mu.Lock()
	defer s.mu.Unlock()

	subs := s.subscribers[jobID]
	for i, sub := range subs {
		if sub == ch {
			s.subscribers[jobID] = append(subs[:i], subs[i+1:]...)
			close(ch)
			break
		}
	}
	if len(s.subscribers[jobID]) == 0 {
		delete(s.subscribers, jobID)
	}
}

func (s *Store) broadcast(jobID string, event EventData) {
	s.mu.RLock()
	subs, exists := s.subscribers[jobID]
	if !exists || len(subs) == 0 {
		s.mu.RUnlock()
		return
	}

	// Send non-blocking to all active subscribers
	for _, ch := range subs {
		select {
		case ch <- event:
		default:
		}
	}
	s.mu.RUnlock()
}

func (s *Store) CleanupOldJobs(retentionHours int) int {
	s.mu.Lock()
	defer s.mu.Unlock()

	cutoff := time.Now().UTC().Add(-time.Duration(retentionHours) * time.Hour)
	count := 0

	for id, job := range s.jobs {
		if job.CreatedAt.Before(cutoff) {
			delete(s.jobs, id)
			count++
		}
	}

	if count > 0 {
		s.persistUnlocked()
	}

	return count
}

func (s *Store) GetActiveJobsCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	count := 0
	for _, job := range s.jobs {
		if job.Status == StatusQueued || job.Status == StatusProcessing {
			count++
		}
	}
	return count
}

func (s *Store) persistAsync() {
	go func() {
		s.mu.RLock()
		defer s.mu.RUnlock()
		s.persistUnlocked()
	}()
}

func (s *Store) persistUnlocked() {
	data, err := json.MarshalIndent(s.jobs, "", "  ")
	if err == nil {
		_ = os.WriteFile(s.dbFilePath, data, 0644)
	}
}
