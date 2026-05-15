import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useCallStore } from '../stores/useCallStore';

interface Props {
  onEndCall: () => void;
}

export default function ActiveCallScreen({ onEndCall }: Props) {
  const remoteUserId = useCallStore((s) => s.remoteUserId);
  const isMuted = useCallStore((s) => s.isMuted);
  const isSpeakerOn = useCallStore((s) => s.isSpeakerOn);
  const toggleMute = useCallStore((s) => s.toggleMute);
  const toggleSpeaker = useCallStore((s) => s.toggleSpeaker);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());
  const interval = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    startRef.current = Date.now();
    setElapsed(0);

    interval.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => clearInterval(interval.current);
  }, []);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {remoteUserId?.[0]?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.name}>{remoteUserId || 'Unknown'}</Text>
        <Text style={styles.duration}>{formatTime(elapsed)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
        >
          <Text style={styles.controlLabel}>Mute</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, isSpeakerOn && styles.controlBtnActive]}
          onPress={toggleSpeaker}
        >
          <Text style={styles.controlLabel}>Speaker</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.endBtn} onPress={onEndCall}>
        <Text style={styles.endBtnText}>End</Text>
      </TouchableOpacity>
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
  duration: { color: '#888', fontSize: 18, fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', gap: 32 },
  controlBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  controlBtnActive: { backgroundColor: '#2a7de1', borderColor: '#2a7de1' },
  controlLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
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
