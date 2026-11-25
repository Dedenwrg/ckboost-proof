export const CHANNEL_POLL_DELAYS_MS = [3_000, 5_000, 8_000, 13_000, 20_000, 20_000, 20_000, 20_000] as const;

type TimerHandle = ReturnType<typeof setTimeout>;
type TimerApi = {
  set: (callback: () => void, delay: number) => TimerHandle;
  clear: (handle: TimerHandle) => void;
};

const browserTimers: TimerApi = {
  set: (callback, delay) => setTimeout(callback, delay),
  clear: (handle) => clearTimeout(handle),
};

export function createBoundedPoller(
  task: () => Promise<unknown>,
  delays: readonly number[] = CHANNEL_POLL_DELAYS_MS,
  timers: TimerApi = browserTimers,
) {
  let stopped = false;
  let timer: TimerHandle | undefined;

  const poll = async (attempt: number) => {
    if (stopped || attempt >= delays.length) return;
    try { await task(); } catch { /* Temporary failures are retried by the bounded schedule. */ }
    if (!stopped && attempt + 1 < delays.length) {
      timer = timers.set(() => void poll(attempt + 1), delays[attempt]);
    }
  };

  return {
    start() { void poll(0); },
    stop() {
      stopped = true;
      if (timer !== undefined) timers.clear(timer);
    },
  };
}
