import 'dart:async';
import 'package:flutter/material.dart';
import '../stores/call_store.dart';

class ActiveCallScreen extends StatefulWidget {
  final CallStore callStore;
  final VoidCallback onEndCall;
  const ActiveCallScreen({required this.callStore, required this.onEndCall, super.key});

  @override
  State<ActiveCallScreen> createState() => _ActiveCallScreenState();
}

class _ActiveCallScreenState extends State<ActiveCallScreen> {
  Timer? _timer;
  int _elapsed = 0;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() => _elapsed++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _format(int sec) {
    final m = (sec ~/ 60).toString().padLeft(2, '0');
    final s = (sec % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.callStore;

    return Scaffold(
      backgroundColor: const Color(0xFF0d0d0d),
      body: SafeArea(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: [
            Column(
              children: [
                CircleAvatar(
                  radius: 40,
                  backgroundColor: const Color(0xFF2a7de1),
                  child: Text(
                    (store.remoteUserId ?? '?')[0].toUpperCase(),
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 16),
                Text(store.remoteUserId ?? 'Unknown',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 8),
                Text(_format(_elapsed),
                    style: const TextStyle(fontSize: 18, color: Color(0xFF888888))),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _ControlButton(
                  label: 'Mute',
                  active: store.isMuted,
                  onTap: store.toggleMute,
                ),
                const SizedBox(width: 32),
                _ControlButton(
                  label: 'Speaker',
                  active: store.isSpeakerOn,
                  onTap: store.toggleSpeaker,
                ),
              ],
            ),
            GestureDetector(
              onTap: widget.onEndCall,
              child: Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFef4444)),
                child: const Center(
                    child: Text('End',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white))),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ControlButton extends StatelessWidget {
  final String label;
  final bool active;
  final VoidCallback onTap;

  const _ControlButton({required this.label, required this.active, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 72,
        height: 72,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: active ? const Color(0xFF2a7de1) : const Color(0xFF1a1a1a),
          border: Border.all(color: const Color(0xFF333333)),
        ),
        child: Center(
            child: Text(label,
                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.white))),
      ),
    );
  }
}
