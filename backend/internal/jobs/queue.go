package jobs

import (
	"context"
	"sync"
)

type Processor interface {
	ProcessJob(ctx context.Context, job *Job)
}

type Queue struct {
	maxConcurrent int
	semaphore     chan struct{}
	processor     Processor
	store         *Store
	activeCancels map[string]context.CancelFunc
	mu            sync.Mutex
}

func NewQueue(maxConcurrent int, store *Store, processor Processor) *Queue {
	if maxConcurrent <= 0 {
		maxConcurrent = 2
	}
	return &Queue{
		maxConcurrent: maxConcurrent,
		semaphore:     make(chan struct{}, maxConcurrent),
		processor:     processor,
		store:         store,
		activeCancels: make(map[string]context.CancelFunc),
	}
}

func (q *Queue) Enqueue(job *Job) {
	go func() {
		// Acquire semaphore slot (limits concurrent active AI jobs)
		q.semaphore <- struct{}{}
		defer func() {
			<-q.semaphore
		}()

		// Check if job was cancelled while waiting in queue
		currentJob, err := q.store.GetJob(job.JobID)
		if err != nil || currentJob.Status == StatusCancelled {
			return
		}

		ctx, cancel := context.WithCancel(context.Background())
		q.mu.Lock()
		q.activeCancels[job.JobID] = cancel
		q.mu.Unlock()

		defer func() {
			q.mu.Lock()
			delete(q.activeCancels, job.JobID)
			q.mu.Unlock()
			cancel()
		}()

		q.processor.ProcessJob(ctx, job)
	}()
}

func (q *Queue) CancelJob(jobID string) bool {
	q.mu.Lock()
	cancel, exists := q.activeCancels[jobID]
	q.mu.Unlock()

	if exists && cancel != nil {
		cancel()
		return true
	}
	return false
}
