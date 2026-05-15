import 'package:flutter/material.dart';
import '../stores/call_store.dart';

class IncomingCallScreen extends StatelessWidget {
  final CallStore callStore;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const IncomingCallScreen({
    required this.callStore,
    required this.onAccept,
    required this.onReject,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    final callerId = callStore.incomingCall?.callerId ?? 'Unknown';

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
                    callerId[0].toUpperCase(),
                    style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w700, color: Colors.white),
                  ),
                ),
                const SizedBox(height: 16),
                Text(callerId,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 8),
                const Text('Incoming call...',
                    style: TextStyle(fontSize: 16, color: Color(0xFF4ade80))),
              ],
            ),
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                GestureDetector(
                  onTap: onReject,
                  child: Container(
                    width: 72,
                    height: 72,
                    margin: const EdgeInsets.only(right: 48),
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFFef4444)),
                    child: const Center(
                        child: Text('Decline',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white))),
                  ),
                ),
                GestureDetector(
                  onTap: onAccept,
                  child: Container(
                    width: 72,
                    height: 72,
                    decoration: const BoxDecoration(shape: BoxShape.circle, color: Color(0xFF4ade80)),
                    child: const Center(
                        child: Text('Accept',
                            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white))),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
