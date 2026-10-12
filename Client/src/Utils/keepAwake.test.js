import { describe, it, expect, vi, afterEach } from 'vitest';
import { keepServerAwake, KEEP_AWAKE_INTERVAL_MS } from './keepAwake';

afterEach(() => vi.useRealTimers());

describe('keepServerAwake', () => {
  it('pings the health check every few minutes until stopped', () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn(() => Promise.resolve());
    const stop = keepServerAwake('https://server.test', { fetchImpl });
    expect(KEEP_AWAKE_INTERVAL_MS).toBeLessThan(30 * 60 * 1000);
    vi.advanceTimersByTime(KEEP_AWAKE_INTERVAL_MS * 2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl).toHaveBeenCalledWith('https://server.test/api/health', { cache: 'no-store' });
    stop();
    vi.advanceTimersByTime(KEEP_AWAKE_INTERVAL_MS * 2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('does nothing without a server address', () => {
    const fetchImpl = vi.fn();
    keepServerAwake('', { fetchImpl })();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
