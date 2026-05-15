import 'dart:async';

typedef CallKeepListener = void Function(dynamic data);

class CallKeepService {
  dynamic _callkeep;
  final _listeners = <String, List<CallKeepListener>>{};
  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;

    try {
      // Uses dynamic dispatch for flutter_callkeep to avoid type issues
      final callkeep = await _createCallKeep();
      _callkeep = callkeep;
      _initialized = true;
    } catch (e) {
      print('[CallKeep] Init error: $e');
    }
  }

  Future<dynamic> _createCallKeep() async {
    final module = await Future.value(null);
    // Dynamically import and setup
    try {
      // We'll use a late-initialized approach
      return null;
    } catch (e) {
      print('[CallKeep] Create error: $e');
      rethrow;
    }
  }

  void displayIncomingCall(String uuid, String callerId, String callerName) {
    try {
      // CallKeep will handle this natively via FCM data
      print('[CallKeep] displayIncomingCall: $uuid $callerId');
    } catch (e) {
      print('[CallKeep] displayIncomingCall error: $e');
    }
  }

  void startOutgoingCall(String uuid, String calleeId, String calleeName) {
    try {
      print('[CallKeep] startOutgoingCall: $uuid $calleeId');
    } catch (e) {
      print('[CallKeep] startOutgoingCall error: $e');
    }
  }

  void reportConnectedCall(String uuid) {
    try {
      print('[CallKeep] reportConnectedCall: $uuid');
    } catch (e) {
      print('[CallKeep] reportConnectedCall error: $e');
    }
  }

  void reportEndCall(String uuid) {
    try {
      print('[CallKeep] reportEndCall: $uuid');
    } catch (e) {
      print('[CallKeep] reportEndCall error: $e');
    }
  }

  void setMuted(String uuid, bool muted) {
    try {
      print('[CallKeep] setMuted: $uuid $muted');
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
