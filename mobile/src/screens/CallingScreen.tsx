import { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCallStore } from '../stores/useCallStore';

interface Props {
  onEndCall: () => void;
}

export default function CallingScreen({ onEndCall }: Props) {
  const remoteUserId = useCallStore((s) => s.remoteUserId);
  const callState = useCallStore((s) => s.callState);

  const statusText = () => {
    switch (callState) {
      case 'calling':
        return 'Connecting...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Establishing call...';
      case 'connected':
        return 'Connected';
      case 'failed':
        return 'Call failed';
      case 'busy':
        return 'User is busy';
      case 'rejected':
        return 'Call rejected';
      case 'missed':
        return 'No answer';
      case 'disconnected':
      case 'ended':
        return 'Call ended';
      default:
        return '';
    }
  };

  const showEndButton = ['calling', 'ringing', 'connecting', 'connected'].includes(callState);

  useEffect(() => {
    if (['failed', 'busy', 'rejected', 'missed', 'disconnected', 'ended'].includes(callState)) {
      const timer = setTimeout(onEndCall, 2000);
      return () => clearTimeout(timer);
    }
  }, [callState]);

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {remoteUserId?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{remoteUserId || 'Unknown'}</Text>
        <Text style={styles.status}>{statusText()}</Text>
      </View>

      {showEndButton && (
        <TouchableOpacity style={styles.endBtn} onPress={onEndCall}>
          <Text style={styles.endBtnText}>End Call</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d0d0d',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 100,
  },
  info: { alignItems: 'center' },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2a7de1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#fff', fontSize: 36, fontWeight: '700' },
  name: { color: '#fff', fontSize: 24, fontWeight: '600', marginBottom: 8 },
  status: { color: '#888', fontSize: 16 },
  endBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  endBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
