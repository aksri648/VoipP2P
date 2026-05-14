const admin = require('firebase-admin');

let firebaseApp = null;
let isInitialized = false;

const initializeFirebase = () => {
  if (isInitialized) {
    return firebaseApp;
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require('../config/firebase-service-account.json');

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

    isInitialized = true;
    console.log('[Firebase] Initialized successfully');
    return firebaseApp;
  } catch (error) {
    console.error('[Firebase] Initialization error:', error.message);
    return null;
  }
};

const getFirebaseApp = () => {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
};

const sendPushNotification = async (fcmToken, data) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      data: data,
      token: fcmToken,
      android: {
        priority: 'high',
        ttl: 300,
        notification: {
          channelId: 'voip_p2p_channel',
          clickAction: 'incoming_call'
        }
      }
    };

    const response = await app.messaging().send(message);
    console.log('[Firebase] Push notification sent:', response);
    return response;
  } catch (error) {
    console.error('[Firebase] Push notification error:', error.message);
    throw error;
  }
};

const sendDataOnlyNotification = async (fcmToken, data) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      data: data,
      token: fcmToken,
      android: {
        priority: 'high',
        ttl: 0,
        data: data
      }
    };

    const response = await app.messaging().send(message);
    console.log('[Firebase] Data notification sent');
    return response;
  } catch (error) {
    console.error('[Firebase] Data notification error:', error.message);
    throw error;
  }
};

const sendMulticastNotification = async (fcmTokens, data) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    const message = {
      data: data,
      tokens: fcmTokens,
      android: {
        priority: 'high',
        ttl: 300
      }
    };

    const response = await app.messaging().sendMulticast(message);
    console.log('[Firebase] Multicast sent, success:', response.successCount);
    return response;
  } catch (error) {
    console.error('[Firebase] Multicast error:', error.message);
    throw error;
  }
};

const subscribeToTopic = async (fcmToken, topic) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    await app.messaging().subscribeToTopic(fcmToken, topic);
    console.log('[Firebase] Subscribed to topic:', topic);
  } catch (error) {
    console.error('[Firebase] Subscribe error:', error.message);
    throw error;
  }
};

const unsubscribeFromTopic = async (fcmToken, topic) => {
  try {
    const app = getFirebaseApp();
    if (!app) {
      throw new Error('Firebase not initialized');
    }

    await app.messaging().unsubscribeFromTopic(fcmToken, topic);
    console.log('[Firebase] Unsubscribed from topic:', topic);
  } catch (error) {
    console.error('[Firebase] Unsubscribe error:', error.message);
    throw error;
  }
};

module.exports = {
  initializeFirebase,
  getFirebaseApp,
  sendPushNotification,
  sendDataOnlyNotification,
  sendMulticastNotification,
  subscribeToTopic,
  unsubscribeFromTopic
};