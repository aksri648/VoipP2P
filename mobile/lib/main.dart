import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';

import 'config/types.dart';
import 'stores/user_store.dart';
import 'stores/call_store.dart';
import 'services/socket_service.dart';
import 'services/webrtc_service.dart';
import 'services/callkeep_service.dart';
import 'services/fcm_service.dart';
import 'screens/auth_screen.dart';
import 'screens/home_screen.dart';
import 'screens/calling_screen.dart';
import 'screens/incoming_call_screen.dart';
import 'screens/active_call_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const VoipP2PApp());
}

class VoipP2PApp extends StatelessWidget {
  const VoipP2PApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => UserStore()),
        ChangeNotifierProvider(create: (_) => CallStore()),
        Provider(create: (_) => SocketService()),
        Provider(create: (_) => WebRTCService()),
        Provider(create: (_) => CallKeepService()),
        Provider(create: (_) => FCMService()),
      ],
      child: MaterialApp(
        title: 'VoIP P2P',
        debugShowCheckedModeBanner: false,
        theme: ThemeData.dark(),
        home: const AppShell(),
      ),
    );
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  bool _ready = false;
  bool _servicesInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      final userStore = context.read<UserStore>();
      await userStore.loadUserId();
      if (mounted) setState(() => _ready = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (!_ready) {
      return const Scaffold(
        backgroundColor: Color(0xFF0d0d0d),
        body: Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return Consumer<UserStore>(
      builder: (ctx, userStore, _) {
        if (!userStore.isRegistered) {
          return AuthScreen(
            userStore: userStore,
            onRegistered: () {
              if (!_servicesInitialized) {
                _servicesInitialized = true;
                _initServices(context);
              }
            },
          );
        }

        if (!_servicesInitialized) {
          _servicesInitialized = true;
          _initServices(context);
        }

        return const _CallNavigator();
      },
    );
  }

  void _initServices(BuildContext context) async {
    final userStore = context.read<UserStore>();
    final callStore = context.read<CallStore>();
    final socketService = context.read<SocketService>();
    final webRTCService = context.read<WebRTCService>();
    final callKeepService = context.read<CallKeepService>();
    final fcmService = context.read<FCMService>();
    final userId = userStore.userId;

    if (userId == null) return;

    await callKeepService.initialize();
    final fcmToken = await fcmService.initialize();
    if (fcmToken != null) userStore.setFcmToken(fcmToken);

    await socketService.connect(userId, fcmToken: fcmToken);

    socketService.on('incoming_call', (data) async {
      final callId = data['callId'] as String;
      final callerId = data['callerId'] as String;
      final sdp = data['sdp'] as String?;

      callStore.setIncomingCall(
        IncomingCallData(callId: callId, callerId: callerId, sdp: sdp),
      );

      callKeepService.displayIncomingCall(callId, callerId, callerId);

      await webRTCService.startLocalStream();
      webRTCService.createPeerConnection();

      if (sdp != null) {
        await webRTCService.setRemoteDescription({'sdp': sdp}, 'offer');
        final answer = await webRTCService.createAnswer();
        socketService.emit('call:answer', {'callId': callId, 'sdp': answer['sdp']});
        callStore.setConnecting();
      }
    });

    socketService.on('call:answered', (data) async {
      final sdp = data['sdp'] as String?;
      if (sdp != null) {
        await webRTCService.setRemoteDescription({'sdp': sdp}, 'answer');
      }
      callStore.setConnected();
      callKeepService.reportConnectedCall(callStore.localCallId ?? '');
    });

    socketService.on('call:rejected', (_) {
      callStore.setDisconnected();
      _cleanup(context);
    });

    socketService.on('call:ended', (_) {
      callStore.setDisconnected();
      _cleanup(context);
    });

    socketService.on('call:timeout', (_) {
      callStore.setDisconnected();
      _cleanup(context);
    });

    socketService.on('ice:candidate', (data) async {
      final candidate = data['candidate'] as Map<String, dynamic>?;
      if (candidate != null) {
        await webRTCService.addIceCandidate(candidate);
      }
    });

    webRTCService.on('iceCandidate', (candidate) {
      final remoteId = callStore.remoteUserId;
      final callId = callStore.incomingCall?.callId ?? callStore.localCallId;
      if (callId != null && remoteId != null) {
        socketService.emit('ice:candidate', {
          'callId': callId,
          'candidate': candidate,
          'targetId': remoteId,
        });
      }
    });

    webRTCService.on('connectionState', (state) {
      if (state == 'connected') {
        callStore.setConnected();
      } else if (state == 'disconnected' || state == 'failed') {
        callStore.setDisconnected();
        _cleanup(context);
      }
    });

    callKeepService.on('answer', (_) {
      final data = callStore.incomingCall;
      if (data != null && data.sdp != null && !webRTCService.remoteDescriptionSet) {
        webRTCService.setRemoteDescription({'sdp': data.sdp}, 'offer').then((_) async {
          final answer = await webRTCService.createAnswer();
          socketService.emit('call:answer', {'callId': data.callId, 'sdp': answer['sdp']});
        });
      }
      callStore.setConnected();
      callKeepService.reportConnectedCall(data?.callId ?? '');
    });

    callKeepService.on('endCall', (_) {
      _hangup(context);
    });

    fcmService.on('incoming_call', (data) {
      final callId = data['callId'] as String;
      final callerId = data['callerId'] as String;
      final sdp = data['sdp'] as String?;
      callStore.setIncomingCall(
        IncomingCallData(callId: callId, callerId: callerId, sdp: sdp),
      );
      callKeepService.displayIncomingCall(callId, callerId, callerId);
    });
  }

  void _cleanup(BuildContext context) {
    context.read<WebRTCService>().hangup();
  }

  void _hangup(BuildContext context) {
    final callStore = context.read<CallStore>();
    final socketService = context.read<SocketService>();
    final webRTCService = context.read<WebRTCService>();
    final callKeepService = context.read<CallKeepService>();

    final callId = callStore.incomingCall?.callId ?? callStore.localCallId;
    if (callId != null) {
      socketService.emit('call:end', {'callId': callId});
    }

    webRTCService.hangup();
    callKeepService.reportEndCall(callId ?? '');
    callStore.reset();
  }
}

class _CallNavigator extends StatelessWidget {
  const _CallNavigator();

  void _startCall(BuildContext context, String calleeId) async {
    final callStore = context.read<CallStore>();
    final socketService = context.read<SocketService>();
    final webRTCService = context.read<WebRTCService>();
    final callKeepService = context.read<CallKeepService>();
    final userStore = context.read<UserStore>();

    final id = callStore.startOutgoingCall(calleeId);

    await webRTCService.startLocalStream();
    webRTCService.createPeerConnection();

    callKeepService.startOutgoingCall(id, calleeId, calleeId);

    final offer = await webRTCService.createOffer();

    socketService.emit('call:offer', {
      'calleeId': calleeId,
      'sdp': offer['sdp'],
      'callerId': userStore.userId,
    });

    callStore.setRinging();
  }

  void _acceptCall(BuildContext context) async {
    final callStore = context.read<CallStore>();
    final data = callStore.incomingCall;
    if (data == null) return;

    final webRTCService = context.read<WebRTCService>();
    final socketService = context.read<SocketService>();
    final callKeepService = context.read<CallKeepService>();

    if (data.sdp != null && !webRTCService.remoteDescriptionSet) {
      await webRTCService.setRemoteDescription({'sdp': data.sdp}, 'offer');
      final answer = await webRTCService.createAnswer();
      socketService.emit('call:answer', {'callId': data.callId, 'sdp': answer['sdp']});
    }

    callStore.setConnected();
    callKeepService.reportConnectedCall(data.callId);
  }

  void _rejectCall(BuildContext context) {
    final callStore = context.read<CallStore>();
    final data = callStore.incomingCall;
    if (data != null) {
      context.read<SocketService>().emit('call:reject', {'callId': data.callId});
    }
    callStore.clearIncomingCall();
    context.read<WebRTCService>().hangup();
    callStore.reset();
  }

  void _hangup(BuildContext context) {
    final callStore = context.read<CallStore>();
    final socketService = context.read<SocketService>();
    final webRTCService = context.read<WebRTCService>();
    final callKeepService = context.read<CallKeepService>();

    final callId = callStore.incomingCall?.callId ?? callStore.localCallId;
    if (callId != null) {
      socketService.emit('call:end', {'callId': callId});
    }

    webRTCService.hangup();
    callKeepService.reportEndCall(callId ?? '');
    callStore.reset();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<CallStore>(
      builder: (ctx, callStore, _) {
        final state = callStore.callState;

        if (state == CallState.ringing) {
          return IncomingCallScreen(
            callStore: callStore,
            onAccept: () => _acceptCall(context),
            onReject: () => _rejectCall(context),
          );
        }

        if (state == CallState.connected) {
          return ActiveCallScreen(
            callStore: callStore,
            onEndCall: () => _hangup(context),
          );
        }

        if (state.isActive || state == CallState.failed ||
            state == CallState.busy || state == CallState.rejected ||
            state == CallState.missed || state == CallState.disconnected) {
          return CallingScreen(
            callStore: callStore,
            onEndCall: () => _hangup(context),
          );
        }

        return HomeScreen(
          userStore: context.read<UserStore>(),
          callStore: callStore,
          socketService: context.read<SocketService>(),
          onStartCall: (id) => _startCall(context, id),
        );
      },
    );
  }
}
