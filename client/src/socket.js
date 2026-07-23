import { io } from "socket.io-client";

// Same-origin connection: works both in the Vite dev proxy and the
// production build served directly by the Express/Socket.io server.
export const socket = io({
  autoConnect: true,
  transports: ["websocket", "polling"],
});

export function emitAsync(event, payload) {
  return new Promise((resolve) => {
    socket.emit(event, payload, (response) => resolve(response));
  });
}
