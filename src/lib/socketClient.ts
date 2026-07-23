"use client";

import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
  }
  return socket;
}

export function emitAsync<T = Record<string, unknown>>(
  event: string,
  payload: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve) => {
    getSocket().emit(event, payload, (response: T) => resolve(response));
  });
}

export function emitWithTimeout<T = Record<string, unknown>>(
  event: string,
  payload: Record<string, unknown>,
  timeoutMs = 20_000
): Promise<T> {
  return new Promise((resolve, reject) => {
    getSocket()
      .timeout(timeoutMs)
      .emit(event, payload, (error: Error | null, response: T) => {
        if (error) {
          reject(new Error("השרת לא הגיב בזמן"));
          return;
        }
        resolve(response);
      });
  });
}
