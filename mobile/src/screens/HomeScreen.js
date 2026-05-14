import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useUser } from '../hooks/useUser';
import { useCall } from '../hooks/useCall';
import { callService } from '../services';

const HomeScreen = ({ navigation }) => {
  const { callId, userId, logout, connectToSignaling } = useUser();
  const { callState, incomingCallData, initiateCall } = useCall();
  
  const [targetCallId, setTargetCallId] = useState('');
  const [isCallInitiating, setIsCallInitiating] = useState(false);

  useEffect(() => {
    connectToSignaling();
  }, []);

  useEffect(() => {
    if (callState === 'ringing' || callState === 'connecting') {
      navigation.navigate('Calling');
    }
  }, [callState]);

  useEffect(() => {
    if (incomingCallData) {
      navigation.navigate('IncomingCall');
    }
  }, [incomingCallData]);

  const handleCall = async () => {
    if (!targetCallId || targetCallId.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit Call ID');
      return;
    }

    if (targetCallId === callId) {
      Alert.alert('Error', 'You cannot call yourself');
      return;
    }

    setIsCallInitiating(true);
    try {
      await initiateCall(targetCallId);
    } catch (error) {
      Alert.alert('Call Failed', error.message || 'Failed to initiate call');
    } finally {
      setIsCallInitiating(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {callId ? callId.charAt(0) : '?'}
            </Text>
          </View>
          <Text style={styles.callIdLabel}>Your Call ID</Text>
          <Text style={styles.callIdValue}>{callId}</Text>
          <Text style={styles.callIdHint}>Share this to receive calls</Text>
        </View>

        <View style={styles.dialSection}>
          <Text style={styles.sectionTitle}>Enter Call ID</Text>
          
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor="#666"
            value={targetCallId}
            onChangeText={(text) => setTargetCallId(text.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            editable={!isCallInitiating}
          />

          <TouchableOpacity
            style={[
              styles.callButton,
              (!targetCallId || targetCallId.length !== 6 || isCallInitiating) && 
              styles.callButtonDisabled
            ]}
            onPress={handleCall}
            disabled={!targetCallId || targetCallId.length !== 6 || isCallInitiating}
          >
            {isCallInitiating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Text style={styles.callButtonIcon}>📞</Text>
                <Text style={styles.callButtonText}>Call</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.dialPadButton}
          onPress={() => navigation.navigate('DialPad')}
        >
          <Text style={styles.dialPadButtonText}>Open Dial Pad</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>VoIP P2P v1.0.0</Text>
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
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 48
  },
  logoutButton: {
    padding: 8
  },
  logoutText: {
    color: '#FF3B30',
    fontSize: 16
  },
  content: {
    flex: 1,
    padding: 24
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 48
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF'
  },
  callIdLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4
  },
  callIdValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4
  },
  callIdHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8
  },
  dialSection: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 20,
    fontSize: 32,
    color: '#FFF',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24
  },
  callButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  callButtonDisabled: {
    opacity: 0.5
  },
  callButtonIcon: {
    fontSize: 20,
    marginRight: 8
  },
  callButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  },
  dialPadButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  dialPadButtonText: {
    color: '#007AFF',
    fontSize: 16
  },
  footer: {
    padding: 16,
    alignItems: 'center'
  },
  footerText: {
    color: '#666',
    fontSize: 12
  }
});

export default HomeScreen;