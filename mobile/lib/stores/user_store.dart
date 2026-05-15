import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class UserStore extends ChangeNotifier {
  String? _userId;
  String? _fcmToken;
  bool _isRegistered = false;

  String? get userId => _userId;
  String? get fcmToken => _fcmToken;
  bool get isRegistered => _isRegistered;

  static const _keyUserId = 'user_id';

  Future<void> loadUserId() async {
    final prefs = await SharedPreferences.getInstance();
    _userId = prefs.getString(_keyUserId);
    _isRegistered = _userId != null;
    notifyListeners();
  }

  Future<void> persistUserId(String id) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUserId, id);
    _userId = id;
    _isRegistered = true;
    notifyListeners();
  }

  void setFcmToken(String token) {
    _fcmToken = token;
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyUserId);
    _userId = null;
    _isRegistered = false;
    _fcmToken = null;
    notifyListeners();
  }
}
