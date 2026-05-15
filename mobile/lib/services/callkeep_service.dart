import 'dart:async';
import 'package:flutter_callkeep/flutter_callkeep.dart';

typedef CallKeepListener = void Function(dynamic data);

class CallKeepService {
  final FlutterCallkeep _callkeep = FlutterCallkeep();
  final _listeners = <String, List<CallKeepListener>>{};
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      await _callkeep.setup(<String, dynamic>{
        'ios': {
          'appName': 'VoIP P2P',
        },
        'android': {
          'alertTitle': 'VoIP P2P Permissions',
          'alertMessage': 'This app needs phone permissions to handle calls.',
          'cancelButton': 'Cancel',
          'okButton': 'OK',
          'foregroundService': {
            'channelId': 'voip_p2p_call',
            'channelName': 'Call Service',
            'notificationTitle': 'Call in progress',
            'notificationIcon': 'ic_launcher',
          },
        },
      });

      _callkeep.on('answerCall', (data) => _notify('answer', data));
      _callkeep.on('endCall', (data) => _notify('endCall', data));
      _callkeep.on('muteCall', (data) => _notify('muteCall', data));

      _initialized = true;
    } catch (e) {
      print('[CallKeep] Init error: $e');
    }
  }

  void displayIncomingCall(String uuid, String callerId, String callerName) {
    try {
      _callkeep.displayIncomingCall(uuid, callerId, callerName, 'number', true);
    } catch (e) {
      print('[CallKeep] displayIncomingCall error: $e');
    }
  }

  void startOutgoingCall(String uuid, String calleeId, String calleeName) {
    try {
      _callkeep.startCall(uuid, calleeId, calleeName, 'number', true);
    } catch (e) {
      print('[CallKeep] startOutgoingCall error: $e');
    }
  }

  void reportConnectedCall(String uuid) {
    try {
      _callkeep.connectedCall(uuid);
    } catch (e) {
      print('[CallKeep] reportConnectedCall error: $e');
    }
  }

  void reportEndCall(String uuid) {
    try {
      _callkeep.endCall(uuid);
    } catch (e) {
      print('[CallKeep] reportEndCall error: $e');
    }
  }

  void setMuted(String uuid, bool muted) {
    try {
      _callkeep.setMutedCall(uuid, muted);
    } catch (e) {
      print('[CallKeep] setMuted error: $e');
    }
  }

  StreamSubscription on(String event, CallKeepListener listener) {
    _listeners.putIfAbsent(event, () => []);
    _listeners[event]!.add(listener);
    return StreamSubscription(() => _off(event, listener));
  }

  void _off(String event, CallKeepListener listener) {
    _listeners[event]?.remove(listener);
  }

  void _notify(String event, dynamic data) {
    _listeners[event]?.forEach((l) {
      try {
        l(data);
      } catch (e) {
        print('[CallKeep] listener error on "$event": $e');
      }
    });
  }
}

class StreamSubscription {
  final void Function() _cancel;
  StreamSubscription(this._cancel);
  void cancel() => _cancel();
}
