import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration
} from 'react-native';
import { useCall } from '../hooks/useCall';
import { Config } from '../config';
import { callKeepService } from '../services';

const IncomingCallScreen = ({ navigation }) => {
  const { 
    callState, 
    incomingCallData,
    acceptCall, 
    rejectCall, 
    ignoreCall,
    callDuration 
  } = useCall();

  const [callerId, setCallerId] = useState('');
  const [callerName, setCallerName] = useState('');

  useEffect(() => {
    if (incomingCallData) {
      setCallerId(incomingCallData.callerId);
      setCallerName(incomingCallData.callerName || `User ${incomingCallData.callerId}`);
      
      Vibration.vibrate([0, 500, 200, 500], true);
    }

    return () => {
      Vibration.cancel();
    };
  }, [incomingCallData]);

  useEffect(() => {
    if (callState === Config.CALL_STATES.CONNECTING || 
        callState === Config.CALL_STATES.CONNECTED) {
      Vibration.cancel();
      navigation.replace('ActiveCall');
    }
  }, [callState]);

  const handleAccept = async () => {
    Vibration.cancel();
    try {
      await acceptCall();
    } catch (error) {
      console.error('Accept call error:', error);
    }
  };

  const handleReject = async () => {
    Vibration.cancel();
    try {
      await rejectCall();
      navigation.goBack();
    } catch (error) {
      console.error('Reject call error:', error);
    }
  };

  const handleIgnore = async () => {
    Vibration.cancel();
    try {
      await ignoreCall();
      navigation.goBack();
    } catch (error) {
      console.error('Ignore call error:', error);
    }
  };

  if (!incomingCallData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No incoming call data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {callerId ? callerId.charAt(0) : '?'}
          </Text>
        </View>

        <Text style={styles.callerName}>{callerName}</Text>
        
        <Text style={styles.callerId}>
          Call ID: {callerId}
        </Text>

        <Text style={styles.incomingText}>Incoming Call...</Text>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={handleReject}
        >
          <View style={styles.rejectIcon}>
            <Text style={styles.rejectText}>📵</Text>
          </View>
          <Text style={styles.rejectLabel}>Reject</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
        >
          <View style={styles.acceptIcon}>
            <Text style={styles.acceptText}>📞</Text>
          </View>
          <Text style={styles.acceptLabel}>Accept</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.ignoreButton}
        onPress={handleIgnore}
      >
        <Text style={styles.ignoreText}>Ignore Call</Text>
      </TouchableOpacity>
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
  callerName: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8
  },
  callerId: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24
  },
  incomingText: {
    fontSize: 18,
    color: '#888',
    animation: 'pulse 1s infinite'
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 24,
    paddingBottom: 48
  },
  rejectButton: {
    alignItems: 'center'
  },
  rejectIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  rejectText: {
    fontSize: 28
  },
  rejectLabel: {
    color: '#FF3B30',
    fontSize: 14
  },
  acceptButton: {
    alignItems: 'center'
  },
  acceptIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8
  },
  acceptText: {
    fontSize: 28
  },
  acceptLabel: {
    color: '#34C759',
    fontSize: 14
  },
  ignoreButton: {
    alignItems: 'center',
    paddingBottom: 48
  },
  ignoreText: {
    color: '#888',
    fontSize: 14
  }
});

export default IncomingCallScreen;