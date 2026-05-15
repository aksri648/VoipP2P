import { io, Socket } from 'socket.io-client';
import { Config } from '../config';

type Listener = (...args: any[]) => void;

class SocketService {
  private socket: Socket | null = null;
  private listeners = new Map<string, Set<Listener>>();

  connect(userId: string, fcmToken?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected) {
        this.socket.disconnect();
      }

      this.socket = io(Config.SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: Config.RECONNECT_ATTEMPTS,
        reconnectionDelay: Config.RECONNECT_DELAY,
        timeout: Config.NETWORK_TIMEOUT,
      });

      this.socket.on('connect', () => {
        this.socket!.emit('register', { userId, fcmToken });
      });

      this.socket.on('register:ok', () => {
        this.setupRelay();
        resolve();
      });

      this.socket.on('register:error', (data) => {
        reject(new Error(data.message));
      });

      this.socket.on('connect_error', (err) => {
        reject(err);
      });

      this.socket.on('disconnect', (reason) => {
        this.notify('disconnect', reason);
      });
    });
  }

  private setupRelay() {
    if (!this.socket) return;

    const events = [
      'incoming_call',
      'call:answered',
      'call:rejected',
      'call:ended',
      'call:timeout',
      'call:missed',
      'ice:candidate',
      'user:status',
    ];

    for (const event of events) {
      this.socket.on(event, (...args: any[]) => {
        this.notify(event, ...args);
      });
    }
  }

  emit(event: string, ...args: any[]) {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    }
  }

  on(event: string, callback: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  off(event: string, callback: Listener) {
    this.listeners.get(event)?.delete(callback);
  }

  private notify(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach((cb) => {
      try {
        cb(...args);
      } catch (e) {
        console.error(`[SocketService] listener error on "${event}":`, e);
      }
    });
  }

  get isConnected() {
    return this.socket?.connected ?? false;
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.listeners.clear();
  }
}

export const socketService = new SocketService();
