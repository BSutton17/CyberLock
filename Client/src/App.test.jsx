// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

// Fake socket.io so the app never opens a real connection.
const fakeSocket = {
  connected: false,
  handlers: new Map(),
  on(event, handler) { this.handlers.set(event, handler); },
  off(event) { this.handlers.delete(event); },
  emit: vi.fn(),
  connect: vi.fn(function connect() { this.connected = true; }),
  disconnect: vi.fn(function disconnect() { this.connected = false; })
};
vi.mock('socket.io-client', () => ({ default: () => fakeSocket, io: () => fakeSocket }));

const { default: App } = await import('./App');

const json = (body, status = 200) => Promise.resolve({ ok: status < 400, status, json: async () => body });

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState({}, '', '/');
  window.HTMLMediaElement.prototype.play = vi.fn(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App sign-in flow', () => {
  it('sends signed-out players to the login page and lets them in as a guest', async () => {
    const fetchMock = vi.fn((url, options = {}) => {
      if (url.endsWith('/api/health')) return json({ status: 'ok' });
      if (url.endsWith('/api/auth/config')) return json({ googleClientId: null, guestLoginEnabled: true });
      if (url.endsWith('/api/auth/guest')) {
        expect(JSON.parse(options.body)).toEqual({ name: 'Sean' });
        return json({ token: 'session-token', user: { id: 'guest:1', name: 'Sean', provider: 'guest' } });
      }
      return json({ message: 'not found' }, 404);
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(await screen.findByLabelText('Guest name'), { target: { value: 'Sean' } });
    fireEvent.click(screen.getByText('Play as guest'));

    expect(await screen.findByText('Sean')).toBeTruthy();
    expect(screen.getByText(/Signed in as/)).toBeTruthy();
    expect(localStorage.getItem('cyberlock_token')).toBe('session-token');
    expect(fakeSocket.connect).toHaveBeenCalled();
  });

  it('tells players when the server is waking up', async () => {
    let calls = 0;
    vi.stubGlobal('fetch', vi.fn(() => {
      calls += 1;
      return calls === 1 ? Promise.reject(new Error('sleeping')) : new Promise(() => {});
    }));

    render(<App />);
    expect(await screen.findByText(/Waking up the server/, {}, { timeout: 4000 })).toBeTruthy();
  });

  it('drops a stored session the server no longer accepts', async () => {
    localStorage.setItem('cyberlock_token', 'expired');
    localStorage.setItem('cyberlock_user', JSON.stringify({ id: 'x', name: 'Old' }));
    vi.stubGlobal('fetch', vi.fn((url) => {
      if (url.endsWith('/api/health')) return json({ status: 'ok' });
      if (url.endsWith('/api/auth/config')) return json({ googleClientId: null, guestLoginEnabled: true });
      if (url.endsWith('/api/auth/me')) return json({ message: 'Please sign in again.' }, 401);
      return json({}, 404);
    }));

    render(<App />);
    expect(await screen.findByText('Play as guest')).toBeTruthy();
    expect(localStorage.getItem('cyberlock_token')).toBeNull();
  });
});
