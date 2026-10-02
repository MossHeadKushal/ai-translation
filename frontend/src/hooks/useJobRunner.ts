import { useState, useCallback, useRef, useEffect } from 'react';
import type { Job, JobStatus, ToolId } from '../types';
import { api, ApiError } from '../services/api';

export interface UseJobRunnerReturn {
  job: Job | null;
  status: JobStatus | 'idle' | 'uploading';
  progress: number;
  stage: string;
  error: string | null;
  isSubmitting: boolean;
  startJob: (tool: ToolId, file?: File | null, textInput?: string, config?: Record<string, any>) => Promise<string | null>;
  cancelCurrentJob: () => Promise<void>;
  resetJob: () => void;
  resultData: any;
}

export function useJobRunner(): UseJobRunnerReturn {
  const [job, setJob] = useState<Job | null>(null);
  const [status, setStatus] = useState<JobStatus | 'idle' | 'uploading'>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resultData, setResultData] = useState<any>(null);

  const cleanupRef = useRef<(() => void) | null>(null);

  const cleanupSubscription = useCallback(() => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  const resetJob = useCallback(() => {
    cleanupSubscription();
    setJob(null);
    setStatus('idle');
    setProgress(0);
    setStage('');
    setError(null);
    setIsSubmitting(false);
    setResultData(null);
  }, [cleanupSubscription]);

  const startJob = useCallback(
    async (tool: ToolId, file?: File | null, textInput?: string, config?: Record<string, any>): Promise<string | null> => {
      cleanupSubscription();
      setError(null);
      setIsSubmitting(true);
      setStatus('uploading');
      setProgress(5);
      setStage('Uploading payload...');
      setResultData(null);

      try {
        const response = await api.createJob(tool, file, textInput, config);
        const jobId = response.jobId;

        setStatus('queued');
        setProgress(10);
        setStage('Job queued. Waiting for worker assignment...');

        cleanupRef.current = api.subscribeToJobEvents(
          jobId,
          async (eventData) => {
            setStatus(eventData.status);
            setProgress(eventData.progress);
            setStage(eventData.stage || '');

            if (eventData.status === 'completed') {
              try {
                const finalResult = await api.getJobResult(jobId);
                setResultData(finalResult);
              } catch {
                setResultData(eventData.result || true);
              }
              const fullJob = await api.getJob(jobId);
              setJob(fullJob);
              setIsSubmitting(false);
            } else if (eventData.status === 'failed') {
              setError(eventData.errorMessage || 'Job execution encountered a processing error.');
              setIsSubmitting(false);
            }
          },
          (err) => {
            console.error('Job subscription error:', err);
          }
        );

        return jobId;
      } catch (err: any) {
        setIsSubmitting(false);
        setStatus('failed');
        const message = err instanceof ApiError ? err.message : (err.message || 'Failed to initialize processing job');
        setError(message);
        return null;
      }
    },
    [cleanupSubscription]
  );

  const cancelCurrentJob = useCallback(async () => {
    if (!job?.jobId && status === 'idle') return;
    const currentId = job?.jobId;
    cleanupSubscription();
    if (currentId) {
      try {
        await api.cancelJob(currentId);
      } catch {
        // ignore
      }
    }
    setStatus('cancelled');
    setStage('Job cancelled by user');
    setIsSubmitting(false);
  }, [job?.jobId, status, cleanupSubscription]);

  return {
    job,
    status,
    progress,
    stage,
    error,
    isSubmitting,
    startJob,
    cancelCurrentJob,
    resetJob,
    resultData,
  };
}
