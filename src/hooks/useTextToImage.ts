'use client';

import { useEffect, useRef, useState } from 'react';

type GenerateResponse = {
  id?: string;
  output?: string[];
};

export enum Status {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
}

export function useTextToImage() {
  const [status, setStatus] = useState<Status>(Status.IDLE);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Update isLoading whenever status changes
  useEffect(() => {
    setIsLoading(status === Status.PENDING || status === Status.RUNNING);
  }, [status]);

  const generateImage = async (userImage: File, hairstyleImageUrl: string, prompt: string) => {
    setStatus(Status.PENDING);
    setErrorMessage(null);

    try {
      // Create a new abort controller at the beginning
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // Convert userImage to base64
      const userImageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(userImage);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      // Fetch hairstyle image and convert to base64
      const hairstyleImageResponse = await fetch(hairstyleImageUrl);
      if (!hairstyleImageResponse.ok) {
        throw new Error('获取发型图片失败');
      }
      const hairstyleImageBlob = await hairstyleImageResponse.blob();
      const hairstyleImageBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(hairstyleImageBlob);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
      });

      const payload = {
        userImage: userImageBase64,
        hairstyleImage: hairstyleImageBase64,
        prompt: prompt,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal, // Use the abort signal for the initial request
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setStatus(Status.FAILED);
        const message =
          errorData?.error?.message ||
          errorData?.error ||
          errorData?.message ||
          '生成图片失败';
        setErrorMessage(message);
        throw new Error(message);
      }

      const data = (await response.json()) as GenerateResponse;

      if (Array.isArray(data.output) && data.output.length > 0) {
        setResults(data.output);
        setStatus(Status.SUCCEEDED);
        setCurrentTaskId(null);
        return data.output;
      }

      if (data.id) {
        setCurrentTaskId(data.id);

        // Now use the same controller for polling
        const results = await pollForCompletion(data.id, setStatus, controller.signal);

        setResults(results);
        return results;
      }

      setStatus(Status.FAILED);
      setErrorMessage('未返回生成结果');
      throw new Error('未返回生成结果');
    } catch (error) {
      // Check if the error was due to an abort
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Request was aborted');
        setStatus(Status.IDLE);
      } else {
        console.error('Error generating image:', error);
        setStatus(Status.FAILED);
        if (error instanceof Error && !errorMessage) {
          setErrorMessage(error.message);
        }
      }
      return [];
    }
  };

  const cancelTaskCreation = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  const cancelTask = async () => {
    if (!currentTaskId) {
      // if no task id, we can abort the task creation
      cancelTaskCreation();
      setErrorMessage(null);
      return;
    }

    try {
      // Abort the polling process
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }

      const response = await fetch(`/api/tasks/${currentTaskId}`, {
        method: 'DELETE',
      });

      // Handle both successful cancellation and "already cancelled/not found" cases
      if (response.ok || response.status === 404) {
        const data = await response.json();

        // If we got a specific status back, log it
        if (data && data.status) {
          console.log(`Task cancellation status: ${data.status}`);
        }

        // Reset all state
        setStatus(Status.IDLE);
        setCurrentTaskId(null);
        setResults([]);
        setErrorMessage(null);
        return true;
      }

      const errorData = await response.json();
      console.error('Error canceling task:', errorData);
      return false;
    } catch (error) {
      console.error('Error canceling task:', error);
      return false;
    }
  };

  const resetResults = () => {
    // Reset all state
    setResults([]);
    setStatus(Status.IDLE);
    setCurrentTaskId(null);
    setErrorMessage(null);

    // Abort any ongoing polling
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  return {
    status,
    isLoading,
    results,
    errorMessage,
    generateImage,
    cancelTask,
    resetResults,
    currentTaskId,
  };
}

async function pollForCompletion(
  taskId: string,
  setStatus: (status: Status) => void,
  signal?: AbortSignal
) {
  // Set status to RUNNING immediately when polling starts
  setStatus(Status.RUNNING);

  while (true) {
    // Check if polling has been aborted
    if (signal?.aborted) {
      console.log('Polling aborted');
      return [];
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const data = await response.json();

      if (data.status === 'SUCCEEDED') {
        setStatus(Status.SUCCEEDED);
        return data.output;
      } else if (data.status === 'FAILED') {
        setStatus(Status.FAILED);
        throw new Error(data.error || '任务失败');
      } else {
        // Task is still processing, wait before checking again
        setStatus(Status.RUNNING);

        // Use a delay that can be interrupted by an abort signal
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 2500);

            if (signal) {
              signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('Polling aborted'));
              });
            }
          });
        } catch (error) {
          // If the promise was rejected due to an abort, break the polling loop
          console.log('Polling delay aborted');
          return [];
        }
      }
    } catch (error) {
      console.error('Error polling for task completion:', error);
      setStatus(Status.FAILED);
      throw error;
    }
  }
}
