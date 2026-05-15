import { useEffect, useState, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useUserStore } from './src/stores/useUserStore';
import { useCallStore } from './src/stores/useCallStore';
import { socketService } from './src/services/SocketService';
import { callKeepService } from './src/services/CallKeepService';
import { fcmService } from './src/services/FCMService';
import { inCallManagerService } from './src/services/InCallManagerService';
import { registerBackgroundHandler } from './src/notifications';
import { useCall } from './src/hooks/useCall';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CallingScreen from './src/screens/CallingScreen';
import IncomingCallScreen from './src/screens/IncomingCallScreen';
import ActiveCallScreen from './src/screens/ActiveCallScreen';

function AppContent() {
  const userId = useUserStore((s) => s.userId);
  const isRegistered = useUserStore((s) => s.isRegistered);
  const setRegistered = useUserStore((s) => s.setRegistered);
  const loadUserId = useUserStore((s) => s.loadUserId);
  const setFcmToken = useUserStore((s) => s.setFcmToken);
  const callState = useCallStore((s) => s.callState);
  const [ready, setReady] = useState(false);
  const appState = useRef(AppState.currentState);

  const {
    startCall,
    acceptCall,
    rejectCall,
    hangup,
  } = useCall();

  useEffect(() => {
    (async () => {
      await loadUserId();
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!isRegistered || !userId) return;

    const init = async () => {
      await registerBackgroundHandler();
      await inCallManagerService.initialize();
      await callKeepService.initialize();

      const fcmToken = await fcmService.initialize();
      if (fcmToken) setFcmToken(fcmToken);

      await socketService.connect(userId, fcmToken || undefined);
    };

    init();

    return () => {
      socketService.disconnect();
    };
  }, [isRegistered, userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  const handleRegistered = () => {
    setRegistered(true);
  };

  if (!ready) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const showIncoming = callState === 'ringing';
  const showCalling = ['calling', 'ringing', 'connecting', 'failed', 'busy', 'rejected', 'missed'].includes(callState);
  const showActive = callState === 'connected';
  const showHome = !showCalling && !showActive && isRegistered;

  if (!isRegistered) {
    return <AuthScreen onRegistered={handleRegistered} />;
  }

  return (
    <View style={styles.container}>
      {showHome && <HomeScreen onStartCall={startCall} />}
      {showCalling && !showIncoming && <CallingScreen onEndCall={hangup} />}
      {showIncoming && <IncomingCallScreen onAccept={acceptCall} onReject={rejectCall} />}
      {showActive && <ActiveCallScreen onEndCall={hangup} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  loading: { flex: 1, backgroundColor: '#0d0d0d', justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#fff', fontSize: 16 },
});
