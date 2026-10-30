import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Components never open real sockets in unit tests.
vi.mock('socket.io-client', () => {
  const handlers = new Map();
  const socket = {
    connected: false,
    on: (event, fn) => handlers.set(event, fn),
    off: (event) => handlers.delete(event),
    emit: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: () => handlers.clear(),
    __trigger: (event, payload) => handlers.get(event)?.(payload),
  };
  return { io: () => socket, __socket: socket };
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
