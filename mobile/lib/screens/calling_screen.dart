import 'dart:async';
import 'package:flutter/material.dart';
import '../stores/call_store.dart';

class CallingScreen extends StatefulWidget {
  final CallStore callStore;
  final VoidCallback onEndCall;
  const CallingScreen({required this.callStore, required this.onEndCall, super.key});

  @override
  State<CallingScreen> createState() => _CallingScreenState();
}

class _CallingScreenState extends State<CallingScreen> {
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer(const Duration(seconds: 2), () {
      if (mounted && !widget.callStore.callState.isActive &&
          widget.callStore.callState != CallState.idle) {
        widget.onEndCall();
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String get _statusText {
    switch (widget.callStore.callState) {
      case CallState.calling:
        return 'Connecting...';
      case CallState.ringing:
        return 'Ringing...';
      case CallState.connecting:
        return 'Establishing call...';
      case CallState.connected:
        return 'Connected';
      case CallState.failed:
        return 'Call failed';
      case CallState.busy:
        return 'User is busy';
      case CallState.rejected:
        return 'Call rejected';
      case CallState.missed:
        return 'No answer';
      case CallState.disconnected:
        return 'Call ended';
      default:
        return '';
    }
  }

  bool get _showEndButton => widget.callStore.callState.isActive;

  @override
  Widget build(BuildContext context) {
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
                    (widget.callStore.remoteUserId ?? '?')[0].toUpperCase(),
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 16),
                Text(widget.callStore.remoteUserId ?? 'Unknown',
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 8),
                Text(_statusText, style: const TextStyle(fontSize: 16, color: Color(0xFF888888))),
              ],
            ),
            if (_showEndButton)
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
