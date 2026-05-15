import 'dart:async';
import 'package:firebase_messaging/firebase_messaging.dart';

typedef FCMListener = void Function(dynamic data);

class FCMService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  final _listeners = <String, List<FCMListener>>{};

  Future<String?> initialize() async {
    await _requestPermission();

    final token = await _fcm.getToken();
    print('[FCM] Token: $token');

    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      final data = message.data;
      if (data['type'] == 'incoming_call') {
        _notify('incoming_call', data);
      }
    });

    FirebaseMessaging.onBackgroundMessage(_backgroundHandler);

    return token;
  }

  Future<void> _requestPermission() async {
    final settings = await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      print('[FCM] Permission denied');
    }
  }

  @pragma('vm:entry-point')
  static Future<void> _backgroundHandler(RemoteMessage message) async {
    print('[FCM] Background message: ${message.data}');
    // In background, CallKeep will handle the notification
    // via the data payload when the app is opened
  }

  StreamSubscription on(String event, FCMListener listener) {
    _listeners.putIfAbsent(event, () => []);
    _listeners[event]!.add(listener);
    return StreamSubscription(() => _off(event, listener));
  }

  void _off(String event, FCMListener listener) {
    _listeners[event]?.remove(listener);
  }

  void _notify(String event, dynamic data) {
    _listeners[event]?.forEach((l) {
      try {
        l(data);
      } catch (e) {
        print('[FCM] listener error on "$event": $e');
      }
    });
  }
}

class StreamSubscription {
  final void Function() _cancel;
  StreamSubscription(this._cancel);
  void cancel() => _cancel();
}
