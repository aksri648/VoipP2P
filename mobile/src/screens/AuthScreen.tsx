import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useUserStore } from '../stores/useUserStore';
import { socketService } from '../services/SocketService';
import { Config } from '../config';

interface Props {
  onRegistered: () => void;
}

export default function AuthScreen({ onRegistered }: Props) {
  const [id, setId] = useState('');
  const [loading, setLoading] = useState(false);
  const { persistUserId, setFcmToken } = useUserStore();

  const handleRegister = async () => {
    const trimmed = id.trim();
    if (trimmed.length < 2 || trimmed.length > 30) {
      Alert.alert('Invalid ID', 'User ID must be 2-30 characters.');
      return;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
      Alert.alert('Invalid ID', 'Use only letters, numbers, hyphens, underscores.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${Config.SIGNALING_SERVER_URL}/api/users/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Config.API_KEY,
          },
          body: JSON.stringify({ userId: trimmed }),
        }
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Registration failed (${res.status})`);
      }

      await persistUserId(trimmed);
      onRegistered();
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>VoIP P2P</Text>
        <Text style={styles.subtitle}>Choose your unique ID</Text>

        <TextInput
          style={styles.input}
          value={id}
          onChangeText={setId}
          placeholder="e.g. alice"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={30}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d0d0d' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  title: { fontSize: 36, fontWeight: '700', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#888', marginBottom: 40 },
  input: {
    width: '100%',
    height: 52,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 24,
  },
  button: {
    width: '100%',
    height: 52,
    backgroundColor: '#2a7de1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
