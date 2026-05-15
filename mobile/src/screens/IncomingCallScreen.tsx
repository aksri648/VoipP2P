import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCallStore } from '../stores/useCallStore';

interface Props {
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallScreen({ onAccept, onReject }: Props) {
  const incomingCall = useCallStore((s) => s.incomingCall);
  const callerId = incomingCall?.callerId || 'Unknown';

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{callerId[0]?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{callerId}</Text>
        <Text style={styles.label}>Incoming call...</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
          <Text style={styles.actionText}>Decline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
          <Text style={styles.actionText}>Accept</Text>
        </TouchableOpacity>
      </View>
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
  label: { color: '#4ade80', fontSize: 16 },
  actions: { flexDirection: 'row', gap: 48 },
  rejectBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#4ade80',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
