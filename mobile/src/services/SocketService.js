import { io } from 'socket.io-client';
import { Config } from '../config';
import useCallStore from '../stores/useCallStore';
import useUserStore from '../stores/useUserStore';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.listeners = new Map();
    this.eventQueue = [];
  }

  initialize(userId, callId) {
    if (this.socket) {
      this.disconnect();
    }

    this.socket = io(Config.SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Config.SOCKET_RECONNECT_ATTEMPTS,
      reconnectionDelay: Config.SOCKET_RECONNECT_DELAY,
      reconnectionDelayMax: 5000,
      timeout: Config.NETWORK_TIMEOUT,
      query: {
        userId,
        callId
      }
    });

    this.setupEventListeners();
    return this.socket;
  }

  setupEventListeners() {
    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to server');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      const userStore = useUserStore.getState();
      if (userStore.userId) {
        this.emitUserOnline(userStore.userId, userStore.callId);
      }

      this.processEventQueue();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[SocketService] Disconnected:', reason);
      this.isConnected = false;
      
      if (reason === 'io server disconnect') {
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('[SocketService] Connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[SocketService] Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      const userStore = useUserStore.getState();
      if (userStore.userId) {
        this.emitUserOnline(userStore.userId, userStore.callId);
      }
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[SocketService] Reconnection failed');
    });

    this.setupCallEventListeners();
  }

  setupCallEventListeners() {
    this.socket.on('incoming_call', (data) => {
      console.log('[SocketService] Incoming call:', data);
      const callStore = useCallStore.getState();
      
      callStore.setIncomingCall({
        callerId: data.callerId,
        callerName: data.callerName,
        roomName: data.roomName,
        roomToken: data.roomToken,
        callId: data.callId
      });
      
      this.notifyListeners('incoming_call', data);
    });

    this.socket.on('call_accepted', (data) => {
      console.log('[SocketService] Call accepted:', data);
      const callStore = useCallStore.getState();
      
      if (data.roomName && data.roomToken) {
        callStore.setConnecting(data.roomName, data.roomToken);
      } else {
        callStore.setConnecting(data.room, data.token);
      }
      
      this.notifyListeners('call_accepted', data);
    });

    this.socket.on('call_rejected', (data) => {
      console.log('[SocketService] Call rejected:', data);
      const callStore = useCallStore.getState();
      callStore.setRejected();
      this.notifyListeners('call_rejected', data);
    });

    this.socket.on('call_busy', (data) => {
      console.log('[SocketService] Call busy:', data);
      const callStore = useCallStore.getState();
      callStore.setBusy();
      this.notifyListeners('call_busy', data);
    });

    this.socket.on('call_ended', (data) => {
      console.log('[SocketService] Call ended:', data);
      const callStore = useCallStore.getState();
      callStore.setDisconnected('remote_end');
      this.notifyListeners('call_ended', data);
    });

    this.socket.on('call_timeout', (data) => {
      console.log('[SocketService] Call timeout:', data);
      const callStore = useCallStore.getState();
      callStore.setFailed('timeout');
      this.notifyListeners('call_timeout', data);
    });

    this.socket.on('user_offline', (data) => {
      console.log('[SocketService] User offline:', data);
      const callStore = useCallStore.getState();
      
      if (callStore.remoteCallId === data.callId) {
        callStore.setFailed('user_offline');
      }
      
      this.notifyListeners('user_offline', data);
    });

    this.socket.on('user_online', (data) => {
      console.log('[SocketService] User online:', data);
      this.notifyListeners('user_online', data);
    });

    this.socket.on('call_missed', (data) => {
      console.log('[SocketService] Call missed:', data);
      const callStore = useCallStore.getState();
      callStore.setMissed();
      this.notifyListeners('call_missed', data);
    });

    this.socket.on('offer_accepted', (data) => {
      console.log('[SocketService] Offer accepted');
      this.notifyListeners('offer_accepted', data);
    });

    this.socket.on('ice_candidate', (data) => {
      console.log('[SocketService] ICE candidate received');
      this.notifyListeners('ice_candidate', data);
    });
  }

  emitUserOnline(userId, callId) {
    if (this.isConnected) {
      this.socket.emit('user_online', { userId, callId });
    } else {
      this.eventQueue.push({ type: 'user_online', data: { userId, callId } });
    }
  }

  emitUserOffline(userId, callId) {
    if (this.isConnected) {
      this.socket.emit('user_offline', { userId, callId });
    }
  }

  initiateCall(calleeCallId, callerCallId, callerName) {
    return new Promise((resolve, reject) => {
      if (!this.isConnected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('initiate_call', {
        calleeCallId,
        callerCallId,
        callerName,
        timestamp: Date.now()
      }, (response) => {
        if (response.success) {
          resolve(response);
        } else {
          reject(new Error(response.error || 'Call initiation failed'));
        }
      });
    });
  }

  acceptCall(callId, roomName, roomToken) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected to server'));
    }

    return this.socket.emitWithAck('accept_call', {
      callId,
      roomName,
      roomToken
    });
  }

  rejectCall(callId) {
    if (!this.isConnected) {
      return Promise.reject(new Error('Not connected to server'));
    }

    return this.socket.emitWithAck('reject_call', { callId });
  }

  endCall(callId) {
    if (this.isConnected) {
      this.socket.emit('end_call', { callId });
    }
  }

  sendCallMissed(calleeCallId, callerCallId) {
    if (this.isConnected) {
      this.socket.emit('call_missed', {
        calleeCallId,
        callerCallId,
        timestamp: Date.now()
      });
    }
  }

  updateCallState(callId, state) {
    if (this.isConnected) {
      this.socket.emit('call_state_update', { callId, state });
    }
  }

  processEventQueue() {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event.type === 'user_online') {
        this.emitUserOnline(event.data.userId, event.data.callId);
      }
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  notifyListeners(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[SocketService] Listener error:', error);
        }
      });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
    this.listeners.clear();
  }

  getSocket() {
    return this.socket;
  }

  isSocketConnected() {
    return this.isConnected;
  }
}

export const socketService = new SocketService();
export default socketService;