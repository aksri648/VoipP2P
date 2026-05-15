import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { useUserStore } from '../stores/useUserStore';
import { useCallStore } from '../stores/useCallStore';
import { socketService } from '../services/SocketService';
import { Config } from '../config';

interface Props {
  onStartCall: (calleeId: string) => void;
}

interface OnlineUser {
  userId: string;
  isOnline: boolean;
  isInCall: boolean;
}

export default function HomeScreen({ onStartCall }: Props) {
  const [dialId, setDialId] = useState('');
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const userId = useUserStore((s) => s.userId);
  const callState = useCallStore((s) => s.callState);

  useEffect(() => {
    const unsub = socketService.on('user:status', (data: { userId: string; isOnline: boolean }) => {
      setOnlineUsers((prev) => {
        if (data.isOnline) {
          if (prev.find((u) => u.userId === data.userId)) return prev;
          return [...prev, { userId: data.userId, isOnline: true, isInCall: false }];
        }
        return prev.filter((u) => u.userId !== data.userId);
      });
    });

    return () => unsub();
  }, []);

  const handleDial = () => {
    const trimmed = dialId.trim();
    if (!trimmed) return;
    if (trimmed === userId) {
      Alert.alert('Error', 'You cannot call yourself.');
      return;
    }
    onStartCall(trimmed);
  };

  const inCall = callState !== 'idle' && callState !== 'disconnected' && callState !== 'failed';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>VoIP P2P</Text>
        <Text style={styles.userId}>ID: {userId}</Text>
      </View>

      <View style={styles.dialRow}>
        <TextInput
          style={styles.input}
          value={dialId}
          onChangeText={setDialId}
          placeholder="Enter user ID to call"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[styles.callBtn, inCall && styles.callBtnDisabled]}
          onPress={handleDial}
          disabled={inCall}
        >
          <Text style={styles.callBtnText}>Call</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Online</Text>
      <FlatList
        data={onlineUsers.filter((u) => u.userId !== userId)}
        keyExtractor={(item) => item.userId}
        renderItem={({ item }) => (
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.userId[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{item.userId}</Text>
              <Text style={styles.userStatus}>
                {item.isInCall ? 'In a call' : 'Online'}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.smallCallBtn, inCall && styles.callBtnDisabled]}
              onPress={() => onStartCall(item.userId)}
              disabled={inCall}
            >
              <Text style={styles.smallCallBtnText}>Call</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No other users online</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d', paddingHorizontal: 16, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  userId: { fontSize: 14, color: '#888' },
  dialRow: { flexDirection: 'row', marginBottom: 24, gap: 12 },
  input: {
    flex: 1,
    height: 48,
    backgroundColor: '#1a1a1a',
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#333',
  },
  callBtn: {
    height: 48,
    backgroundColor: '#2a7de1',
    borderRadius: 10,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  callBtnDisabled: { opacity: 0.4 },
  callBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#888', marginBottom: 12, textTransform: 'uppercase' },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2a7de1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userStatus: { color: '#4ade80', fontSize: 13, marginTop: 2 },
  smallCallBtn: {
    backgroundColor: '#2a7de1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smallCallBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyText: { color: '#555', textAlign: 'center', marginTop: 32, fontSize: 15 },
});
