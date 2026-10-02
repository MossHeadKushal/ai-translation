package workers

import (
	"context"
	"fmt"
	"log"
	"time"

	"ai-toolbox/internal/config"
	"ai-toolbox/internal/jobs"
	"ai-toolbox/internal/storage"
)

type ProgressCallback func(progress int, stage string)

type Worker interface {
	Process(
		ctx context.Context,
		job *jobs.Job,
		inputPath string,
		cfg map[string]any,
		onProgress ProgressCallback,
	) (outputFilename string, outputData []byte, result any, err error)
}

type Dispatcher struct {
	config  *config.Config
	storage *storage.Storage
	store   *jobs.Store
	workers map[jobs.ToolID]Worker
}

func NewDispatcher(cfg *config.Config, store *jobs.Store, storage *storage.Storage) *Dispatcher {
	d := &Dispatcher{
		config:  cfg,
		storage: storage,
		store:   store,
		workers: make(map[jobs.ToolID]Worker),
	}

	// Register all 7 specialized workers
	d.workers[jobs.ToolImageTo3D] = NewImageTo3DWorker(cfg)
	d.workers[jobs.ToolAudioToText] = NewAudioToTextWorker(cfg)
	d.workers[jobs.ToolVideoToText] = NewVideoToTextWorker(cfg)
	d.workers[jobs.ToolImageToText] = NewOCRWorker(cfg)
	d.workers[jobs.ToolSummarizer] = NewSummarizerWorker(cfg)
	d.workers[jobs.ToolTranslator] = NewTranslatorWorker(cfg)
	d.workers[jobs.ToolTTS] = NewTTSWorker(cfg)

	return d
}

func (d *Dispatcher) ProcessJob(ctx context.Context, job *jobs.Job) {
	log.Printf("INFO job=%s tool=%s status=processing", job.JobID, job.Tool)
	startTime := time.Now()

	worker, exists := d.workers[job.Tool]
	if !exists {
		errMsg := fmt.Sprintf("no worker registered for tool: %s", job.Tool)
		log.Printf("ERROR job=%s error=%s", job.JobID, errMsg)
		_ = d.store.FailJob(job.JobID, errMsg)
		return
	}

	progressFunc := func(progress int, stage string) {
		log.Printf("INFO job=%s progress=%d stage=%s", job.JobID, progress, stage)
		_ = d.store.UpdateProgress(job.JobID, progress, stage)
	}

	outFilename, outData, result, err := worker.Process(ctx, job, job.InputPath, job.Config, progressFunc)
	if err != nil {
		if ctx.Err() != nil {
			log.Printf("INFO job=%s status=cancelled", job.JobID)
			_ = d.store.CancelJob(job.JobID)
		} else {
			log.Printf("ERROR job=%s status=failed error=%v", job.JobID, err)
			_ = d.store.FailJob(job.JobID, err.Error())
		}
		return
	}

	var savedOutPath string
	if len(outData) > 0 && outFilename != "" {
		savedPath, saveErr := d.storage.SaveOutputFile(job.JobID, outFilename, outData)
		if saveErr != nil {
			log.Printf("ERROR job=%s failed to save output file: %v", job.JobID, saveErr)
			_ = d.store.FailJob(job.JobID, "Failed to save generated output artifact")
			return
		}
		savedOutPath = savedPath
	}

	_ = d.store.CompleteJob(job.JobID, outFilename, savedOutPath, result)
	duration := time.Since(startTime).Round(time.Millisecond)
	log.Printf("INFO job=%s tool=%s status=completed duration=%s", job.JobID, job.Tool, duration)
}
