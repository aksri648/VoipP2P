import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-react-native';
import { useUser } from '../hooks/useUser';
import { Config } from '../config';

const AuthScreen = ({ navigation }) => {
  const { signIn, signUp, isLoaded, user } = useAuth();
  const { initializeUser, setCallId, isInitialized } = useUser();
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [generatedCallId, setGeneratedCallId] = useState(null);

  useEffect(() => {
    if (user && isInitialized) {
      navigation.replace('Home');
    }
  }, [user, isInitialized]);

  const generateCallId = () => {
    const callId = Math.floor(100000 + Math.random() * 900000).toString();
    return callId;
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      await signIn({ phoneNumber });
      setIsOtpSent(true);
      const newCallId = generateCallId();
      setGeneratedCallId(newCallId);
    } catch (error) {
      try {
        await signUp({ phoneNumber });
        setIsOtpSent(true);
        const newCallId = generateCallId();
        setGeneratedCallId(newCallId);
      } catch (signUpError) {
        Alert.alert('Error', 'Failed to send OTP. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      Alert.alert('Error', 'Please enter valid OTP');
      return;
    }

    setIsLoading(true);
    try {
      const result = await signIn({ code: otp });
      
      if (result && generatedCallId) {
        await initializeUser({
          id: result.userId,
          phoneNumber: phoneNumber
        });
        
        await setCallId(generatedCallId);
        
        navigation.replace('Home');
      }
    } catch (error) {
      Alert.alert('Error', 'Invalid OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isLoaded) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>VoIP P2P</Text>
          <Text style={styles.subtitle}>Secure Voice Calls</Text>
        </View>

        <View style={styles.form}>
          {!isOtpSent ? (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="+1234567890"
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              
              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleSendOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter OTP</Text>
              <TextInput
                style={styles.input}
                placeholder="123456"
                placeholderTextColor="#999"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
              />
              
              <View style={styles.callIdContainer}>
                <Text style={styles.callIdLabel}>Your Call ID:</Text>
                <Text style={styles.callIdValue}>{generatedCallId}</Text>
                <Text style={styles.callIdHint}>
                  Share this ID to receive calls
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center'
  },
  header: {
    alignItems: 'center',
    marginBottom: 48
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#888'
  },
  form: {
    marginBottom: 24
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#FFF',
    marginBottom: 24
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600'
  },
  callIdContainer: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center'
  },
  callIdLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8
  },
  callIdValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 4
  },
  callIdHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8
  },
  footer: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  }
});

export default AuthScreen;