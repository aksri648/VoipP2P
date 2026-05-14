import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { useCall } from '../hooks/useCall';
import { Config } from '../config';

const CallingScreen = ({ navigation }) => {
  const { 
    callState, 
    remoteCallId, 
    remoteUserName,
    callDuration,
    endCall 
  } = useCall();

  const [callStatusText, setCallStatusText] = useState('Calling...');

  useEffect(() => {
    switch (callState) {
      case Config.CALL_STATES.CALLING:
        setCallStatusText('Calling...');
        break;
      case Config.CALL_STATES.RINGING:
        setCallStatusText('Ringing...');
        break;
      case Config.CALL_STATES.CONNECTING:
        setCallStatusText('Connecting...');
        break;
      case Config.CALL_STATES.CONNECTED:
        navigation.replace('ActiveCall');
        break;
      case Config.CALL_STATES.DISCONNECTED:
      case Config.CALL_STATES.FAILED:
      case Config.CALL_STATES.BUSY:
      case Config.CALL_STATES.REJECTED:
        navigation.goBack();
        break;
    }
  }, [callState]);

  const handleEndCall = async () => {
    await endCall();
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {remoteCallId ? remoteCallId.charAt(0) : '?'}
          </Text>
        </View>

        <Text style={styles.userName}>
          {remoteUserName || `User ${remoteCallId}`}
        </Text>

        <Text style={styles.callId}>
          Call ID: {remoteCallId}
        </Text>

        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.statusText}>{callStatusText}</Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
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
    backgroundColor: '#1C1C1E',
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
    marginBottom: 24
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  statusText: {
    fontSize: 18,
    color: '#888',
    marginLeft: 8
  },
  actionContainer: {
    padding: 48,
    alignItems: 'center'
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

export default CallingScreen;