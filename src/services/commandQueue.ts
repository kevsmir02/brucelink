export type Task<T> = () => Promise<T>;

export class CommandQueue {
  private queue: Array<{
    task: Task<any>;
    resolve: (val: any) => void;
    reject: (err: any) => void;
    retries: number;
  }> = [];
  private isProcessing = false;

  /**
   * Enqueues a task to run sequentially with pacing and automatic retries.
   * @param task An async function to execute.
   * @param maxRetries Number of times to retry on failure (default 1).
   */
  async enqueue<T>(task: Task<T>, maxRetries = 1): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject, retries: maxRetries });
      this.processQueue();
    });
  }

  private shouldRetry(err: any): boolean {
    const status = err?.status ?? err?.response?.status;
    if (typeof status === 'number') {
      // 4xx responses are usually deterministic client/auth failures.
      // Keep retries for 408/429 since they are often transient.
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) {
        return false;
      }
    }
    return true;
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const item = this.queue[0];
      try {
        const result = await item.task();
        item.resolve(result);
        this.queue.shift(); // remove after success
        // Pace commands by waiting 250ms between commands to avoid overwhelming the ESP32
        await new Promise(r => setTimeout(r, 250));
      } catch (err: any) {
        if (item.retries > 0 && this.shouldRetry(err)) {
          item.retries--;
          // Backoff before retry
          await new Promise(r => setTimeout(r, 1000));
        } else {
          item.reject(err);
          this.queue.shift(); // remove after exhausting retries
        }
      }
    }

    this.isProcessing = false;
  }
}

export const commandQueue = new CommandQueue();
