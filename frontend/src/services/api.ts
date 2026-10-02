import type { Job, JobEventData, SystemHealth, ToolId } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    let errorData: any = null;
    try {
      errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
      else if (errorData.message) errorMsg = errorData.message;
    } catch {
      // not json
    }
    throw new ApiError(errorMsg, response.status, errorData);
  }
  return response.json();
}

export const api = {
  getBaseUrl(): string {
    return API_BASE_URL;
  },

  async getHealth(): Promise<SystemHealth> {
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      return await handleResponse<SystemHealth>(res);
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(
        'The toolbox backend cannot currently be reached. Please check if the Go server is running.',
        0,
        err
      );
    }
  },

  async createJob(
    tool: ToolId,
    file?: File | null,
    textInput?: string,
    configuration?: Record<string, any>
  ): Promise<{ jobId: string; status: string; message?: string }> {
    const formData = new FormData();
    formData.append('tool', tool);

    if (file) {
      formData.append('file', file);
    }

    if (textInput !== undefined) {
      formData.append('textInput', textInput);
    }

    if (configuration) {
      formData.append('configuration', JSON.stringify(configuration));
    }

    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      body: formData,
    });

    return handleResponse<{ jobId: string; status: string; message?: string }>(res);
  },

  async getJob(jobId: string): Promise<Job> {
    const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}`);
    return handleResponse<Job>(res);
  },

  async getJobResult(jobId: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/result`);
    return handleResponse<any>(res);
  },

  getDownloadUrl(jobId: string): string {
    return `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/download`;
  },

  getResultFileUrl(jobId: string): string {
    return `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/file`;
  },

  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async deleteJob(jobId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  subscribeToJobEvents(
    jobId: string,
    onProgress: (data: JobEventData) => void,
    onError: (err: any) => void
  ): () => void {
    const eventSourceUrl = `${API_BASE_URL}/jobs/${encodeURIComponent(jobId)}/events`;
    let eventSource: EventSource | null = null;
    let pollInterval: any = null;
    let isClosed = false;

    const cleanup = () => {
      isClosed = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };

    const startPolling = () => {
      if (isClosed || pollInterval) return;
      pollInterval = setInterval(async () => {
        try {
          const job = await api.getJob(jobId);
          onProgress({
            jobId: job.jobId,
            tool: job.tool,
            status: job.status,
            progress: job.progress,
            stage: job.stage || '',
            errorMessage: job.errorMessage,
            outputFilename: job.outputFilename,
            result: job.result,
          });

          if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
            cleanup();
          }
        } catch (err) {
          if (!isClosed) {
            onError(err);
          }
        }
      }, 1000);
    };

    try {
      if (typeof EventSource !== 'undefined') {
        eventSource = new EventSource(eventSourceUrl);

        eventSource.onmessage = (event) => {
          try {
            const data: JobEventData = JSON.parse(event.data);
            onProgress(data);
            if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
              cleanup();
            }
          } catch {
            // parse error
          }
        };

        eventSource.onerror = () => {
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          startPolling();
        };
      } else {
        startPolling();
      }
    } catch {
      startPolling();
    }

    return cleanup;
  },
};
