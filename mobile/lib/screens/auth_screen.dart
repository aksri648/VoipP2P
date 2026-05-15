import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/config.dart';
import '../stores/user_store.dart';

class AuthScreen extends StatefulWidget {
  final UserStore userStore;
  final VoidCallback onRegistered;
  const AuthScreen({required this.userStore, required this.onRegistered, super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _controller = TextEditingController();
  bool _loading = false;

  Future<void> _register() async {
    final trimmed = _controller.text.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      _showError('User ID must be 2-30 characters.');
      return;
    }
    if (!RegExp(r'^[a-zA-Z0-9_-]+$').hasMatch(trimmed)) {
      _showError('Use only letters, numbers, hyphens, underscores.');
      return;
    }

    setState(() => _loading = true);
    try {
      final res = await http.post(
        Uri.parse('${AppConfig.socketUrl}/api/users/register'),
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': AppConfig.apiKey,
        },
        body: jsonEncode({'userId': trimmed}),
      );

      if (res.statusCode != 200) {
        final body = jsonDecode(res.body);
        throw Exception(body['error'] ?? 'Registration failed');
      }

      await widget.userStore.persistUserId(trimmed);
      widget.onRegistered();
    } catch (e) {
      _showError(e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showError(String msg) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0d0d0d),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('VoIP P2P',
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: Colors.white)),
              const SizedBox(height: 8),
              const Text('Choose your unique ID',
                  style: TextStyle(fontSize: 16, color: Color(0xFF888888))),
              const SizedBox(height: 40),
              TextField(
                controller: _controller,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 20, color: Colors.white),
                decoration: InputDecoration(
                  hintText: 'e.g. alice',
                  hintStyle: const TextStyle(color: Color(0xFF666666)),
                  filled: true,
                  fillColor: const Color(0xFF1a1a1a),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF333333)),
                  ),
                  contentPadding: const EdgeInsets.symmetric(vertical: 16),
                ),
                autocorrect: false,
                textCapitalization: TextCapitalization.none,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _register,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2a7de1),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _loading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Register',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
