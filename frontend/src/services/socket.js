// Lightweight Socket.IO client wrapper
// Safe to import even if socket.io-client is not installed in production builds

import io from 'socket.io-client';

let socket = null;

export function connectSocket(options = {}) {
  if (socket && socket.connected) return socket;

  // Prefer relative path so Vite dev proxy forwards to backend
  const url = options.url || '';
  const auth = options.auth || (() => {
    const token = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
    return token ? { token } : {};
  })();

  try {
    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      auth,
      timeout: 10000, // Add timeout to prevent hanging connections
    });

    socket.on('connect', () => console.info('[socket] connected', socket.id));
    socket.on('disconnect', (reason) => console.info('[socket] disconnected', reason));
    socket.on('connect_error', (err) => {
      console.warn('[socket] connect_error', err?.message || err);
      // Don't let connection errors propagate
      return true;
    });

    return socket;
  } catch (error) {
    console.error('[socket] Failed to initialize socket:', error);
    return null;
  }
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect(); } catch (_) {}
    socket = null;
  }
}