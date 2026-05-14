import React, { useEffect, useState } from 'react';
import { StatusBar, LogBox, View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ClerkProvider } from '@clerk/clerk-react-native';

import { Config } from './config';
import { callService } from './services';
import { useUser } from './hooks/useUser';

import {
  AuthScreen,
  HomeScreen,
  DialPadScreen,
  CallingScreen,
  IncomingCallScreen,
  ActiveCallScreen
} from './screens';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'ViewPropTypes will be removed',
]);

const Stack = createNativeStackNavigator();

const AppContent = () => {
  const { isInitialized, userId } = useUser();
  const [isCallServiceReady, setIsCallServiceReady] = useState(false);

  useEffect(() => {
    const initializeCallService = async () => {
      try {
        await callService.initialize();
        setIsCallServiceReady(true);
        console.log('[App] Call service initialized');
      } catch (error) {
        console.error('[App] Call service init error:', error);
      }
    };

    initializeCallService();
  }, []);

  if (!isCallServiceReady) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Initializing...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        animationDuration: 200
      }}
    >
      {!userId ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ animation: 'fade' }}
        />
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="DialPad" component={DialPadScreen} />
          <Stack.Screen 
            name="Calling" 
            component={CallingScreen}
            options={{ 
              animation: 'fade',
              gestureEnabled: false
            }}
          />
          <Stack.Screen 
            name="IncomingCall" 
            component={IncomingCallScreen}
            options={{ 
              animation: 'fade',
              gestureEnabled: false,
              presentation: 'fullScreenModal'
            }}
          />
          <Stack.Screen 
            name="ActiveCall" 
            component={ActiveCallScreen}
            options={{ 
              gestureEnabled: false
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

const App = () => {
  return (
    <SafeAreaProvider>
      <ClerkProvider publishableKey={Config.CLERK_PUBLISHABLE_KEY}>
        <NavigationContainer>
          <StatusBar 
            barStyle="light-content" 
            backgroundColor="#000"
            translucent={false}
          />
          <AppContent />
        </NavigationContainer>
      </ClerkProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#FFF',
    fontSize: 16
  }
});

export default App;