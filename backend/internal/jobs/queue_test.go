package jobs_test

import (
	"context"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"

	"ai-toolbox/internal/jobs"
)

type mockProcessor struct {
	processedCount int32
	activeCount    int32
	maxSeenActive  int32
}

func (m *mockProcessor) ProcessJob(ctx context.Context, job *jobs.Job) {
	curr := atomic.AddInt32(&m.activeCount, 1)
	for {
		old := atomic.LoadInt32(&m.maxSeenActive)
		if curr <= old || atomic.CompareAndSwapInt32(&m.maxSeenActive, old, curr) {
			break
		}
	}

	select {
	case <-ctx.Done():
	case <-time.After(150 * time.Millisecond):
		atomic.AddInt32(&m.processedCount, 1)
	}

	atomic.AddInt32(&m.activeCount, -1)
}

func TestQueueConcurrencyLimit(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "queue-test-*")
	defer os.RemoveAll(tempDir)

	store, _ := jobs.NewStore(filepath.Join(tempDir, "app.db"), 24)
	proc := &mockProcessor{}
	maxConcurrent := 2
	queue := jobs.NewQueue(maxConcurrent, store, proc)

	// Submit 5 jobs concurrently
	for i := 0; i < 5; i++ {
		job := &jobs.Job{
			JobID:     jobs.GenerateJobID(),
			Tool:      jobs.ToolImageTo3D,
			Status:    jobs.StatusQueued,
			CreatedAt: time.Now().UTC(),
		}
		_ = store.SaveJob(job)
		queue.Enqueue(job)
	}

	// Wait for processing
	time.Sleep(900 * time.Millisecond)

	maxSeen := atomic.LoadInt32(&proc.maxSeenActive)
	if maxSeen > int32(maxConcurrent) {
		t.Errorf("expected max concurrent jobs <= %d, but saw %d", maxConcurrent, maxSeen)
	}

	processed := atomic.LoadInt32(&proc.processedCount)
	if processed != 5 {
		t.Errorf("expected 5 jobs processed, got %d", processed)
	}
}

func TestQueueCancellation(t *testing.T) {
	tempDir, _ := os.MkdirTemp("", "queue-test-*")
	defer os.RemoveAll(tempDir)

	store, _ := jobs.NewStore(filepath.Join(tempDir, "app.db"), 24)
	proc := &mockProcessor{}
	queue := jobs.NewQueue(2, store, proc)

	jobID := jobs.GenerateJobID()
	job := &jobs.Job{
		JobID:     jobID,
		Tool:      jobs.ToolImageTo3D,
		Status:    jobs.StatusQueued,
		CreatedAt: time.Now().UTC(),
	}
	_ = store.SaveJob(job)
	queue.Enqueue(job)

	// Cancel shortly after start
	time.Sleep(30 * time.Millisecond)
	cancelled := queue.CancelJob(jobID)
	if !cancelled {
		t.Errorf("expected CancelJob to return true for active job")
	}

	time.Sleep(200 * time.Millisecond)
	processed := atomic.LoadInt32(&proc.processedCount)
	if processed != 0 {
		t.Errorf("expected cancelled job not to complete normally, got %d", processed)
	}
}
