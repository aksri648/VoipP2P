import 'dart:io';

class AppConfig {
  static const String prodUrl = 'https://voip-p2p-signaling.onrender.com';

  static String get socketUrl =>
      const String.fromEnvironment('SOCKET_URL',
          defaultValue: prodUrl);

  static String get apiKey =>
      const String.fromEnvironment('API_KEY',
          defaultValue: 'vp2p_90949ffff155d044f5e43222949bee57');

  static String get defaultSocketUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  static const int callTimeout = 30000;
  static const int ringTimeout = 45000;
  static const int reconnectAttempts = 10;
  static const int reconnectDelay = 1000;
  static const int networkTimeout = 15000;

  static const Map<String, dynamic> iceServers = {
    'iceServers': [
      {'urls': 'stun:stun.l.google.com:19302'},
      {'urls': 'stun:stun1.l.google.com:19302'},
    ],
  };
}
