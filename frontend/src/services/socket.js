// Lightweight Socket.IO client wrapper
// Safe to import even if socket.io-client is not installed in production builds

let io;
try {
  // Dynamically require to avoid bundling errors if not installed
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  io = require('socket.io-client');
} catch (_) {
  io = null;
}

let socket = null;

export function connectSocket(options = {}) {
  if (!io) {
    console.warn('[socket] socket.io-client not installed; realtime disabled');
    return null;
  }
  if (socket && socket.connected) return socket;

  // Prefer relative path so Vite dev proxy forwards to backend
  const url = options.url || '';
  const auth = options.auth || (() => {
    const token = (typeof window !== 'undefined') ? localStorage.getItem('access_token') : null;
    return token ? { token } : {};
  })();

  socket = io(url, {
    path: '/socket.io',
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    auth,
  });

  socket.on('connect', () => console.info('[socket] connected', socket.id));
  socket.on('disconnect', (reason) => console.info('[socket] disconnected', reason));
  socket.on('connect_error', (err) => console.warn('[socket] connect_error', err?.message || err));

  return socket;
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
