import 'dart:async';
import 'package:flutter_webrtc/flutter_webrtc.dart';
import '../config/config.dart';

typedef WebRTCListener = void Function(dynamic data);

class WebRTCService {
  RTCPeerConnection? _pc;
  MediaStream? _localStream;
  final _listeners = <String, List<WebRTCListener>>{};

  Future<MediaStream> startLocalStream() async {
    final stream = await navigator.mediaDevices.getUserMedia({
      'audio': true,
      'video': false,
    });
    _localStream = stream;
    return stream;
  }

  void stopLocalStream() {
    _localStream?.getTracks().forEach((t) => t.stop());
    _localStream = null;
  }

  RTCPeerConnection createPeerConnection() {
    _pc = createPeerConnection(AppConfig.iceServers);

    _pc!.onIceCandidate = (candidate) {
      _notify('iceCandidate', candidate.toMap());
    };

    _pc!.onIceConnectionState = (state) {
      _notify('iceConnectionState', state.toString());
    };

    _pc!.onConnectionState = (state) {
      _notify('connectionState', state.toString());
    };

    _pc!.onTrack = (event) {
      _notify('remoteStream', event.streams[0]);
    };

    if (_localStream != null) {
      _pc!.addStream(_localStream!);
    }

    return _pc!;
  }

  Future<Map<String, dynamic>> createOffer() async {
    if (_pc == null) throw Exception('PeerConnection not created');
    final offer = await _pc!.createOffer({'offerToReceiveAudio': true});
    await _pc!.setLocalDescription(offer);
    return offer.toMap();
  }

  Future<Map<String, dynamic>> createAnswer() async {
    if (_pc == null) throw Exception('PeerConnection not created');
    final answer = await _pc!.createAnswer();
    await _pc!.setLocalDescription(answer);
    return answer.toMap();
  }

  Future<void> setRemoteDescription(Map<String, dynamic> sdpMap, String type) async {
    if (_pc == null) throw Exception('PeerConnection not created');
    final desc = RTCSessionDescription(sdpMap['sdp'], type);
    await _pc!.setRemoteDescription(desc);
  }

  Future<void> addIceCandidate(Map<String, dynamic> candidate) async {
    if (_pc == null) return;
    try {
      await _pc!.addCandidate(RTCIceCandidate(
        candidate['candidate'],
        candidate['sdpMid'],
        candidate['sdpMLineIndex'],
      ));
    } catch (e) {
      print('[WebRTC] Failed to add ICE candidate: $e');
    }
  }

  bool get remoteDescriptionSet => _pc?.remoteDescription != null;

  void toggleAudio(bool enabled) {
    _localStream?.getAudioTracks().forEach((t) => t.enabled = enabled);
  }

  void hangup() {
    stopLocalStream();
    _pc?.close();
    _pc = null;
    _listeners.clear();
  }

  StreamSubscription on(String event, WebRTCListener listener) {
    _listeners.putIfAbsent(event, () => []);
    _listeners[event]!.add(listener);
    return StreamSubscription(() => _off(event, listener));
  }

  void _off(String event, WebRTCListener listener) {
    _listeners[event]?.remove(listener);
  }

  void _notify(String event, dynamic data) {
    _listeners[event]?.forEach((l) {
      try {
        l(data);
      } catch (e) {
        print('[WebRTC] listener error on "$event": $e');
      }
    });
  }
}

class StreamSubscription {
  final void Function() _cancel;
  StreamSubscription(this._cancel);
  void cancel() => _cancel();
}
