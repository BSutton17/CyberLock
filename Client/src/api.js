import { API_URL } from './config';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch(path, { method = 'GET', body, token, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new ApiError(data?.message || `Request failed (${response.status})`, response.status);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(error.name === 'AbortError' ? 'The server took too long to answer.' : 'Could not reach the server.', 0);
  } finally {
    clearTimeout(timer);
  }
}

// Polls the health endpoint until the server answers. A sleeping Heroku Eco dyno takes a few
// seconds to wake, so `onWaiting` fires if the first attempt doesn't succeed quickly.
export async function waitForServer({ onWaiting, attempts = 12, delayMs = 2500, signal } = {}) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) return false;
    try {
      await apiFetch('/api/health', { timeoutMs: 8000 });
      return true;
    } catch {
      if (attempt === 0) onWaiting?.();
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return false;
}
