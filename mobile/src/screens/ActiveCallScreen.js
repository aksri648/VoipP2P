import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated
} from 'react-native';
import { useCall } from '../hooks/useCall';
import { callService } from '../services';

const ActiveCallScreen = ({ navigation }) => {
  const { 
    callState, 
    remoteCallId, 
    remoteUserName,
    isMuted, 
    isSpeakerOn,
    callDuration,
    isReconnecting,
    toggleMute, 
    toggleSpeaker,
    endCall 
  } = useCall();

  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();

    return () => {
      pulseAnim.setValue(1);
    };
  }, []);

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEndCall = async () => {
    await endCall();
    navigation.goBack();
  };

  const handleToggleMute = async () => {
    await toggleMute();
  };

  const handleToggleSpeaker = async () => {
    await toggleSpeaker();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {}}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Animated.View 
          style={[
            styles.avatar,
            { transform: [{ scale: pulseAnim }] }
          ]}
        >
          <Text style={styles.avatarText}>
            {remoteCallId ? remoteCallId.charAt(0) : '?'}
          </Text>
        </Animated.View>

        <Text style={styles.userName}>
          {remoteUserName || `User ${remoteCallId}`}
        </Text>

        <Text style={styles.callId}>
          Call ID: {remoteCallId}
        </Text>

        <Text style={styles.duration}>
          {formatDuration(callDuration)}
        </Text>

        {isReconnecting && (
          <View style={styles.reconnectingContainer}>
            <Text style={styles.reconnectingText}>Reconnecting...</Text>
          </View>
        )}
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={handleToggleMute}
          >
            <Text style={styles.controlIcon}>
              {isMuted ? '🔇' : '🎤'}
            </Text>
            <Text style={styles.controlLabel}>
              {isMuted ? 'Unmute' : 'Mute'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.controlButton, isSpeakerOn && styles.controlButtonActive]}
            onPress={handleToggleSpeaker}
          >
            <Text style={styles.controlIcon}>
              {isSpeakerOn ? '🔊' : '🔈'}
            </Text>
            <Text style={styles.controlLabel}>
              {isSpeakerOn ? 'Speaker' : 'Earpiece'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {}}
          >
            <Text style={styles.controlIcon}>🎵</Text>
            <Text style={styles.controlLabel}>Hold</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {}}
          >
            <Text style={styles.controlIcon}>➕</Text>
            <Text style={styles.controlLabel}>Add Call</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.endCallContainer}>
        <TouchableOpacity
          style={styles.endCallButton}
          onPress={handleEndCall}
        >
          <View style={styles.endCallIcon}>
            <Text style={styles.endCallText}>📵</Text>
          </View>
          <Text style={styles.endCallLabel}>End Call</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 48
  },
  backButton: {
    padding: 8
  },
  backText: {
    fontSize: 24,
    color: '#FFF'
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  avatarText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF'
  },
  userName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8
  },
  callId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16
  },
  duration: {
    fontSize: 48,
    fontWeight: '300',
    color: '#34C759'
  },
  reconnectingContainer: {
    marginTop: 16,
    padding: 8,
    backgroundColor: '#FF9500',
    borderRadius: 8
  },
  reconnectingText: {
    color: '#FFF',
    fontSize: 14
  },
  controlsContainer: {
    padding: 24
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  controlButton: {
    alignItems: 'center',
    padding: 16,
    minWidth: 80
  },
  controlButtonActive: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12
  },
  controlIcon: {
    fontSize: 28,
    marginBottom: 8
  },
  controlLabel: {
    color: '#FFF',
    fontSize: 12
  },
  endCallContainer: {
    alignItems: 'center',
    paddingBottom: 48
  },
  endCallButton: {
    alignItems: 'center'
  },
  endCallIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  endCallText: {
    fontSize: 28
  },
  endCallLabel: {
    color: '#FF3B30',
    fontSize: 14
  }
});

export default ActiveCallScreen;