import { LiveKitClient, Room, LocalTrack, RemoteTrack, AudioTrack } from '@livekit/client';
import { Config } from '../config';
import useCallStore from '../stores/useCallStore';

class LiveKitService {
  constructor() {
    this.room = null;
    this.localAudioTrack = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
  }

  async connect(roomName, token) {
    console.log('[LiveKitService] Connecting to room:', roomName);
    
    try {
      const callStore = useCallStore.getState();
      callStore.setConnecting(roomName, token);

      this.room = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureOptions: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      this.setupRoomListeners();

      await this.room.connect(Config.LIVEKIT_URL, token, {
        autoSubscribe: true
      });

      console.log('[LiveKitService] Connected to room');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      await this.createLocalAudioTrack();
      
      callStore.setConnected(roomName);
      this.notifyListeners('connected', { roomName });

      return this.room;
    } catch (error) {
      console.error('[LiveKitService] Connection error:', error);
      const callStore = useCallStore.getState();
      callStore.setFailed(error.message);
      throw error;
    }
  }

  setupRoomListeners() {
    this.room.on('connected', () => {
      console.log('[LiveKitService] Room connected event');
      this.isConnected = true;
      this.notifyListeners('room_connected', {});
    });

    this.room.on('disconnected', (reason) => {
      console.log('[LiveKitService] Room disconnected:', reason);
      this.isConnected = false;
      const callStore = useCallStore.getState();
      callStore.setDisconnected(reason);
      this.notifyListeners('disconnected', { reason });
    });

    this.room.on('reconnecting', (reason) => {
      console.log('[LiveKitService] Reconnecting:', reason);
      const callStore = useCallStore.getState();
      callStore.setReconnecting(true);
      this.notifyListeners('reconnecting', { reason });
    });

    this.room.on('reconnected', () => {
      console.log('[LiveKitService] Reconnected');
      this.isConnected = true;
      const callStore = useCallStore.getState();
      callStore.setReconnecting(false);
      this.notifyListeners('reconnected', {});
    });

    this.room.on('participantConnected', (participant) => {
      console.log('[LiveKitService] Participant connected:', participant.identity);
      const callStore = useCallStore.getState();
      callStore.setRemoteParticipant(participant);
      this.notifyListeners('participant_connected', { participant });
    });

    this.room.on('participantDisconnected', (participant) => {
      console.log('[LiveKitService] Participant disconnected:', participant.identity);
      const callStore = useCallStore.getState();
      callStore.setRemoteParticipant(null);
      this.notifyListeners('participant_disconnected', { participant });
    });

    this.room.on('trackSubscribed', (track, publication, participant) => {
      console.log('[LiveKitService] Track subscribed:', track.kind);
      
      if (track.kind === 'audio') {
        this.notifyListeners('remote_audio_track', { track, participant });
      }
    });

    this.room.on('trackUnsubscribed', (track, publication, participant) => {
      console.log('[LiveKitService] Track unsubscribed:', track.kind);
    });

    this.room.on('trackMuted', (publication, participant) => {
      console.log('[LiveKitService] Track muted:', publication.trackSid);
      this.notifyListeners('track_muted', { publication, participant });
    });

    this.room.on('trackUnmuted', (publication, participant) => {
      console.log('[LiveKitService] Track unmuted:', publication.trackSid);
      this.notifyListeners('track_unmuted', { publication, participant });
    });

    this.room.on('speaking', (participant) => {
      console.log('[LiveKitService] Speaking:', participant.identity);
      this.notifyListeners('speaking', { participant });
    });

    this.room.on('silence', (participant) => {
      this.notifyListeners('silence', { participant });
    });

    this.room.on('connectionQualityChanged', (quality, participant) => {
      console.log('[LiveKitService] Connection quality:', quality);
      this.notifyListeners('connection_quality', { quality, participant });
    });

    this.room.on('mediaDevicesError', (error) => {
      console.error('[LiveKitService] Media devices error:', error);
      this.notifyListeners('media_devices_error', { error });
    });
  }

  async createLocalAudioTrack() {
    try {
      this.localAudioTrack = await this.room.createLocalAudioTrack({
        name: 'microphone',
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      });
      
      await this.room.publishTrack(this.localAudioTrack);
      console.log('[LiveKitService] Local audio track published');
      
      return this.localAudioTrack;
    } catch (error) {
      console.error('[LiveKitService] Error creating local audio track:', error);
      throw error;
    }
  }

  async muteLocalAudio() {
    if (this.localAudioTrack) {
      await this.localAudioTrack.mute();
      const callStore = useCallStore.getState();
      callStore.setMuted(true);
      console.log('[LiveKitService] Local audio muted');
    }
  }

  async unmuteLocalAudio() {
    if (this.localAudioTrack) {
      await this.localAudioTrack.unmute();
      const callStore = useCallStore.getState();
      callStore.setMuted(false);
      console.log('[LiveKitService] Local audio unmuted');
    }
  }

  async toggleMute() {
    const callStore = useCallStore.getState();
    if (callStore.isMuted) {
      await this.unmuteLocalAudio();
    } else {
      await this.muteLocalAudio();
    }
  }

  getLocalParticipant() {
    return this.room?.localParticipant;
  }

  getRemoteParticipants() {
    return Array.from(this.room?.remoteParticipants.values() || []);
  }

  async disconnect() {
    console.log('[LiveKitService] Disconnecting from room');
    
    if (this.localAudioTrack) {
      try {
        await this.room.unpublishTrack(this.localAudioTrack);
        this.localAudioTrack.stop();
      } catch (error) {
        console.error('[LiveKitService] Error stopping local track:', error);
      }
      this.localAudioTrack = null;
    }

    if (this.room) {
      try {
        await this.room.disconnect();
      } catch (error) {
        console.error('[LiveKitService] Error disconnecting room:', error);
      }
      this.room = null;
    }

    this.isConnected = false;
    const callStore = useCallStore.getState();
    callStore.setDisconnected('local_end');
  }

  isRoomConnected() {
    return this.isConnected && this.room?.state === 'connected';
  }

  getRoom() {
    return this.room;
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
          console.error('[LiveKitService] Listener error:', error);
        }
      });
    }
  }
}

export const liveKitService = new LiveKitService();
export default liveKitService;