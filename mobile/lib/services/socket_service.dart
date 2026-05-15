import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import '../config/config.dart';

typedef SocketListener = void Function(dynamic data);

class SocketService {
  IO.Socket? _socket;
  final _listeners = <String, List<SocketListener>>{};
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  Future<void> connect(String userId, {String? fcmToken}) async {
    if (_socket != null) {
      _socket!.disconnect();
      _socket = null;
    }

    _socket = IO.io(AppConfig.socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'reconnection': true,
      'reconnectionAttempts': AppConfig.reconnectAttempts,
      'reconnectionDelay': AppConfig.reconnectDelay,
      'timeout': AppConfig.networkTimeout,
    });

    final completer = Completer<void>();

    _socket!.on('connect', (_) {
      _socket!.emit('register', {
        'userId': userId,
        'fcmToken': fcmToken,
      });
    });

    _socket!.on('register:ok', (_) {
      _isConnected = true;
      _setupRelay();
      if (!completer.isCompleted) completer.complete();
    });

    _socket!.on('register:error', (data) {
      if (!completer.isCompleted) {
        completer.completeError(Exception(data['message']));
      }
    });

    _socket!.on('connect_error', (error) {
      if (!completer.isCompleted) {
        completer.completeError(error);
      }
    });

    _socket!.on('disconnect', (_) {
      _isConnected = false;
    });

    return completer.future;
  }

  void _setupRelay() {
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

    for (final event in events) {
      _socket!.on(event, (data) {
        _notify(event, data);
      });
    }
  }

  void emit(String event, [dynamic data]) {
    _socket?.emit(event, data ?? {});
  }

  StreamSubscription on(String event, SocketListener listener) {
    _listeners.putIfAbsent(event, () => []);
    _listeners[event]!.add(listener);
    return StreamSubscription(() => _off(event, listener));
  }

  void _off(String event, SocketListener listener) {
    _listeners[event]?.remove(listener);
  }

  void _notify(String event, dynamic data) {
    _listeners[event]?.forEach((l) {
      try {
        l(data);
      } catch (e) {
        print('[SocketService] listener error on "$event": $e');
      }
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    _isConnected = false;
    _listeners.clear();
  }
}

class StreamSubscription {
  final void Function() _cancel;
  StreamSubscription(this._cancel);
  void cancel() => _cancel();
}
