import 'package:flutter/material.dart';
import '../stores/user_store.dart';
import '../stores/call_store.dart';
import '../services/socket_service.dart';

class HomeScreen extends StatefulWidget {
  final UserStore userStore;
  final CallStore callStore;
  final SocketService socketService;
  final void Function(String calleeId) onStartCall;

  const HomeScreen({
    required this.userStore,
    required this.callStore,
    required this.socketService,
    required this.onStartCall,
    super.key,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _dialController = TextEditingController();
  final _onlineUsers = <Map<String, dynamic>>[];

  @override
  void initState() {
    super.initState();
    widget.socketService.on('user:status', (data) {
      if (!mounted) return;
      setState(() {
        if (data['isOnline'] == true) {
          final exists = _onlineUsers.any((u) => u['userId'] == data['userId']);
          if (!exists) {
            _onlineUsers.add({'userId': data['userId'], 'isOnline': true, 'isInCall': false});
          }
        } else {
          _onlineUsers.removeWhere((u) => u['userId'] == data['userId']);
        }
      });
    });
  }

  void _dial() {
    final trimmed = _dialController.text.trim();
    if (trimmed.isEmpty) return;
    if (trimmed == widget.userStore.userId) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('You cannot call yourself.')),
      );
      return;
    }
    widget.onStartCall(trimmed);
  }

  @override
  void dispose() {
    _dialController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final inCall = widget.callStore.callState.isActive;

    return Scaffold(
      backgroundColor: const Color(0xFF0d0d0d),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(16, 60, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('VoIP P2P',
                    style: TextStyle(fontSize: 28, fontWeight: FontWeight.w700, color: Colors.white)),
                Text('ID: ${widget.userStore.userId ?? ""}',
                    style: const TextStyle(fontSize: 14, color: Color(0xFF888888))),
              ],
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _dialController,
                    style: const TextStyle(fontSize: 16, color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Enter user ID to call',
                      hintStyle: const TextStyle(color: Color(0xFF666666)),
                      filled: true,
                      fillColor: const Color(0xFF1a1a1a),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(10),
                        borderSide: const BorderSide(color: Color(0xFF333333)),
                      ),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
                    ),
                    autocorrect: false,
                    textCapitalization: TextCapitalization.none,
                  ),
                ),
                const SizedBox(width: 12),
                ElevatedButton(
                  onPressed: inCall ? null : _dial,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2a7de1),
                    padding: const EdgeInsets.symmetric(horizontal: 24),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('Call',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                ),
              ],
            ),
            const SizedBox(height: 24),
            const Text('ONLINE',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Color(0xFF888888))),
            const SizedBox(height: 12),
            Expanded(
              child: _onlineUsers.where((u) => u['userId'] != widget.userStore.userId).isEmpty
                  ? const Center(
                      child: Text('No other users online',
                          style: TextStyle(fontSize: 15, color: Color(0xFF555555))))
                  : ListView.builder(
                      itemCount: _onlineUsers.length,
                      itemBuilder: (ctx, i) {
                        final user = _onlineUsers[i];
                        if (user['userId'] == widget.userStore.userId) {
                          return const SizedBox.shrink();
                        }
                        return _UserTile(
                          userId: user['userId'],
                          isInCall: user['isInCall'] == true,
                          inCall: inCall,
                          onCall: () => widget.onStartCall(user['userId']),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserTile extends StatelessWidget {
  final String userId;
  final bool isInCall;
  final bool inCall;
  final VoidCallback onCall;

  const _UserTile({
    required this.userId,
    required this.isInCall,
    required this.inCall,
    required this.onCall,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1a1a1a),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 22,
            backgroundColor: const Color(0xFF2a7de1),
            child: Text(userId[0].toUpperCase(),
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(userId, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white)),
                const SizedBox(height: 2),
                Text(isInCall ? 'In a call' : 'Online',
                    style: TextStyle(fontSize: 13, color: isInCall ? Colors.orange : const Color(0xFF4ade80))),
              ],
            ),
          ),
          ElevatedButton(
            onPressed: inCall ? null : onCall,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2a7de1),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            child: const Text('Call',
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
