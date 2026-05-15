import 'package:flutter/foundation.dart';
import '../config/types.dart';

class CallStore extends ChangeNotifier {
  CallState _callState = CallState.idle;
  String? _localCallId;
  String? _remoteUserId;
  IncomingCallData? _incomingCall;
  bool _isMuted = false;
  bool _isSpeakerOn = false;
  int _callStartTime = 0;

  CallState get callState => _callState;
  String? get localCallId => _localCallId;
  String? get remoteUserId => _remoteUserId;
  IncomingCallData? get incomingCall => _incomingCall;
  bool get isMuted => _isMuted;
  bool get isSpeakerOn => _isSpeakerOn;
  int get callDuration =>
      _callStartTime > 0 ? DateTime.now().millisecondsSinceEpoch - _callStartTime : 0;

  static int _counter = 0;
  String _genId() => 'call_${DateTime.now().millisecondsSinceEpoch}_${++_counter}';

  void setCallState(CallState state) {
    _callState = state;
    notifyListeners();
  }

  void setIncomingCall(IncomingCallData data) {
    _incomingCall = data;
    _remoteUserId = data.callerId;
    _callState = CallState.ringing;
    notifyListeners();
  }

  void clearIncomingCall() {
    _incomingCall = null;
  }

  String startOutgoingCall(String calleeId) {
    final id = _genId();
    _localCallId = id;
    _remoteUserId = calleeId;
    _callState = CallState.calling;
    notifyListeners();
    return id;
  }

  void setRinging() {
    _callState = CallState.ringing;
    notifyListeners();
  }

  void setConnecting() {
    _callState = CallState.connecting;
    notifyListeners();
  }

  void setConnected() {
    _callState = CallState.connected;
    _callStartTime = DateTime.now().millisecondsSinceEpoch;
    notifyListeners();
  }

  void setDisconnected() {
    _callState = CallState.disconnected;
    notifyListeners();
  }

  void setFailed() {
    _callState = CallState.failed;
    notifyListeners();
  }

  void toggleMute() {
    _isMuted = !_isMuted;
    notifyListeners();
  }

  void toggleSpeaker() {
    _isSpeakerOn = !_isSpeakerOn;
    notifyListeners();
  }

  void reset() {
    _callState = CallState.idle;
    _localCallId = null;
    _remoteUserId = null;
    _incomingCall = null;
    _isMuted = false;
    _isSpeakerOn = false;
    _callStartTime = 0;
    notifyListeners();
  }
}
