import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from 'react-native-webrtc';
import { Config } from '../config';

type Listener = (...args: any[]) => void;

class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private listeners = new Map<string, Set<Listener>>();

  async startLocalStream(): Promise<MediaStream> {
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    this.localStream = stream;
    return stream;
  }

  stopLocalStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  createPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection(Config.ICE_SERVERS as any);

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          pc.addTrack(track, this.localStream);
        }
      });
    }

    (pc as any).addEventListener('icecandidate', (event: any) => {
      if (event.candidate) {
        this.notify('iceCandidate', event.candidate);
      }
    });

    (pc as any).addEventListener('connectionstatechange', () => {
      this.notify('connectionState', (pc as any).connectionState);
    });

    (pc as any).addEventListener('iceconnectionstatechange', () => {
      this.notify('iceConnectionState', (pc as any).iceConnectionState);
    });

    (pc as any).addEventListener('track', (event: any) => {
      this.notify('remoteStream', event.streams?.[0]);
    });

    this.pc = pc;
    return pc;
  }

  async createOffer(): Promise<RTCSessionDescription> {
    if (!this.pc) throw new Error('PeerConnection not created');
    const offer = await this.pc.createOffer({ offerToReceiveAudio: true });
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer(): Promise<RTCSessionDescription> {
    if (!this.pc) throw new Error('PeerConnection not created');
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp: string, type: 'offer' | 'answer') {
    if (!this.pc) throw new Error('PeerConnection not created');
    const desc = new RTCSessionDescription({ type, sdp } as any);
    await this.pc.setRemoteDescription(desc);
  }

  async addIceCandidate(candidate: any) {
    if (!this.pc) return;
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('[WebRTC] Failed to add ICE candidate:', e);
    }
  }

  get remoteDescriptionSet(): boolean {
    return !!(this.pc as any)?.remoteDescription;
  }

  toggleAudio(enabled: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    }
  }

  hangup() {
    this.stopLocalStream();
    if (this.pc) {
      (this.pc as any).close();
      this.pc = null;
    }
    this.listeners.clear();
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
        console.error(`[WebRTC] listener error on "${event}":`, e);
      }
    });
  }

  get isMuted(): boolean {
    if (!this.localStream) return false;
    return !this.localStream.getAudioTracks().some((t) => t.enabled);
  }
}

export const webRTCService = new WebRTCService();
