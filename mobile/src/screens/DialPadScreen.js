import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useCall } from '../hooks/useCall';

const DialPadScreen = ({ navigation }) => {
  const { callState, initiateCall } = useCall();
  const [inputValue, setInputValue] = useState('');
  const [isCallInitiating, setIsCallInitiating] = useState(false);

  const dialpadKeys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫']
  ];

  const handleKeyPress = (key) => {
    if (key === '⌫') {
      setInputValue(prev => prev.slice(0, -1));
    } else if (key && inputValue.length < 6) {
      setInputValue(prev => prev + key);
    }
  };

  const handleCall = async () => {
    if (!inputValue || inputValue.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit Call ID');
      return;
    }

    setIsCallInitiating(true);
    try {
      await initiateCall(inputValue);
      navigation.navigate('Calling');
    } catch (error) {
      Alert.alert('Call Failed', error.message || 'Failed to initiate call');
    } finally {
      setIsCallInitiating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dial Pad</Text>
      </View>

      <View style={styles.displayContainer}>
        <TextInput
          style={styles.display}
          value={inputValue}
          placeholder="Enter Call ID"
          placeholderTextColor="#666"
          keyboardType="number-pad"
          maxLength={6}
          editable={false}
        />
        {inputValue.length > 0 && (
          <TouchableOpacity 
            style={styles.clearButton}
            onPress={() => setInputValue('')}
          >
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.dialpad}>
        {dialpadKeys.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.dialpadRow}>
            {row.map((key, keyIndex) => (
              <TouchableOpacity
                key={keyIndex}
                style={[
                  styles.keyButton,
                  !key && styles.keyButtonEmpty
                ]}
                onPress={() => handleKeyPress(key)}
                disabled={!key}
              >
                {key === '⌫' ? (
                  <Text style={styles.backspaceIcon}>⌫</Text>
                ) : (
                  <Text style={styles.keyText}>{key}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[
            styles.callButton,
            (!inputValue || inputValue.length !== 6 || isCallInitiating) && 
            styles.callButtonDisabled
          ]}
          onPress={handleCall}
          disabled={!inputValue || inputValue.length !== 6 || isCallInitiating}
        >
          {isCallInitiating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.callButtonText}>Call</Text>
          )}
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
    alignItems: 'center',
    padding: 16,
    paddingTop: 48
  },
  backButton: {
    padding: 8,
    marginRight: 16
  },
  backText: {
    fontSize: 24,
    color: '#FFF'
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFF'
  },
  displayContainer: {
    padding: 24,
    alignItems: 'center'
  },
  display: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    letterSpacing: 8,
    textAlign: 'center',
    minWidth: 200
  },
  clearButton: {
    marginTop: 8
  },
  clearText: {
    color: '#007AFF',
    fontSize: 14
  },
  dialpad: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 48
  },
  dialpadRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16
  },
  keyButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center'
  },
  keyButtonEmpty: {
    backgroundColor: 'transparent'
  },
  keyText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#FFF'
  },
  backspaceIcon: {
    fontSize: 28,
    color: '#FFF'
  },
  actionContainer: {
    padding: 24,
    paddingBottom: 48
  },
  callButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center'
  },
  callButtonDisabled: {
    opacity: 0.5
  },
  callButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600'
  }
});

export default DialPadScreen;