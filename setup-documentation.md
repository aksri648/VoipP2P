# VoIP P2P - Setup Documentation

This document provides complete instructions for setting up and running the VoIP P2P anonymous voice calling application.

## Prerequisites

- **Node.js** >= 18.0.0
- **npm** or **yarn**
- **Java** (JDK 11 or higher) for Android builds
- **Android Studio** with Android SDK configured
- **React Native CLI** (installed globally)

---

## Project Structure

```
VoipP2P/
├── mobile/              # React Native Android app
│   ├── src/
│   │   ├── config/     # App configuration
│   │   ├── stores/     # Zustand state management
│   │   ├── services/   # Core services (Socket, LiveKit, FCM, etc.)
│   │   ├── hooks/      # React hooks
│   │   ├── screens/    # UI screens
│   │   └── App.js      # Root component
│   ├── android/        # Android native code
│   └── package.json
│
├── backend/            # Node.js backend server
│   ├── src/
│   │   ├── index.js           # Server entry point
│   │   ├── routes/api.js      # REST API endpoints
│   │   ├── middleware/       # Auth middleware
│   │   └── services/         # Firebase, LiveKit, Socket services
│   └── package.json
│
└── setup-documentation.md
```

---

## Part 1: Backend Setup

### 1.1 Install Backend Dependencies

```bash
cd backend
npm install
```

### 1.2 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
PORT=3000
HOST=0.0.0.0

NODE_ENV=development

# LiveKit Configuration
LIVEKIT_URL=wss://your-livekit-url.livekit.cloud
LIVEKIT_API_KEY=your-livekit-api-key
LIVEKIT_API_SECRET=your-livekit-api-secret

# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# Clerk Configuration
CLERK_SECRET_KEY=your-clerk-secret-key

# Backend API Key (for mobile app authentication)
API_KEY=your-secure-api-key
```

### 1.3 Get LiveKit Credentials

1. Go to [LiveKit Cloud](https://cloud.livekit.io/)
2. Create an account and a new project
3. Copy the API Key and API Secret
4. Use your LiveKit URL (e.g., `wss://your-project.livekit.cloud`)

### 1.4 Get Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Cloud Messaging** in Project Settings
4. Go to **Service Accounts** tab
5. Generate a new private key
6. Use the credentials in your `.env` file

### 1.5 Get Clerk Credentials

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Create a new application
3. Enable **Phone Number** authentication
4. Copy your **Publishable Key** (for mobile)
5. Copy your **Secret Key** (for backend)

### 1.6 Start the Backend Server

**Development mode (with auto-restart):**
```bash
npm run dev
```

**Production mode:**
```bash
npm run prod
```

The server will start on `http://localhost:3000`. You can verify it's running by visiting:
```
http://localhost:3000/health
```

---

## Part 2: Mobile App Setup

### 2.1 Install Mobile Dependencies

```bash
cd mobile
npm install
```

### 2.2 Configure App Configuration

Edit `mobile/src/config/index.js` and update the following:

```javascript
export const Config = {
  // Your backend Socket.IO URL
  SOCKET_URL: 'http://YOUR_SERVER_IP:3000',
  
  // Your LiveKit URL
  LIVEKIT_URL: 'wss://your-livekit-url.livekit.cloud',
  
  // Your FCM Sender ID (from Firebase)
  FCM_SENDER_ID: 'your-fcm-sender-id',
  
  // Your Clerk Publishable Key
  CLERK_PUBLISHABLE_KEY: 'pk_test_your-clerk-key',
  
  // ... other config options
};
```

**Important:** Replace `YOUR_SERVER_IP` with your actual server IP (for Android emulator, use `10.0.2.2` for localhost, or your computer's LAN IP for physical devices).

### 2.3 Configure Firebase for Android

1. In Firebase Console, add an Android app
2. Set package name: `com.voipp2p`
3. Download `google-services.json`
4. Place it in: `mobile/android/app/google-services.json`

### 2.4 Build the APK

#### Option A: Debug Build (Faster)

```bash
cd mobile/android
./gradlew assembleDebug
```

The APK will be at:
```
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

#### Option B: Release Build (Smaller, optimized)

1. Create signing config in `android/app/build.gradle`:
   ```groovy
   android {
       signingConfigs {
           release {
               storeFile file("your-keystore.jks")
               storePassword "your-password"
               keyAlias "your-key-alias"
               keyPassword "your-key-password"
           }
       }
   }
   ```

2. Build:
   ```bash
   cd mobile/android
   ./gradlew assembleRelease
   ```

The APK will be at:
```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

### 2.5 Install APK on Device

```bash
# Using adb
adb install mobile/android/app/build/outputs/apk/debug/app-debug.apk

# Or manually transfer the APK to your device
```

---

## Part 3: Testing the Application

### 3.1 Start the Backend

```bash
cd backend
npm run dev
```

### 3.2 Install the APK

Transfer and install `app-debug.apk` on your Android device.

### 3.3 Test the Call Flow

1. **User A signs in:**
   - Open the app
   - Enter phone number
   - Verify OTP
   - Note your 6-digit Call ID (e.g., `482193`)

2. **User B signs in:**
   - Repeat the sign-in process
   - Note their Call ID (e.g., `915628`)

3. **Make a call:**
   - User A enters User B's Call ID (`915628`)
   - Tap "Call"
   - User B sees incoming call notification
   - User B taps "Accept"
   - Audio call connects

---

## Part 4: Common Issues & Solutions

### Issue: Socket Connection Failed

**Solution:**
- Ensure backend is running
- Check that `SOCKET_URL` in `mobile/src/config/index.js` matches your server IP
- For emulator, use `10.0.2.2` instead of `localhost`
- Check firewall allows connections on port 3000

### Issue: LiveKit Connection Failed

**Solution:**
- Verify LiveKit credentials in backend `.env`
- Ensure LiveKit URL is accessible from your device
- Check LiveKit dashboard for API key validity

### Issue: FCM Notifications Not Working

**Solution:**
- Ensure `google-services.json` is correctly placed
- Check FCM Sender ID matches in Firebase and app config
- For Android 13+, ensure POST_NOTIFICATIONS permission is granted

### Issue: CallKeep Not Working

**Solution:**
- Grant phone permissions in Android settings
- Enable "Display over other apps" permission
- For battery optimization, disable it for the app

### Issue: App Crashes on Launch

**Solution:**
- Check Metro bundler is not required (for production APK)
- Run `cd android && ./gradlew clean` to clear cache
- Verify all native dependencies are properly linked

---

## Part 5: Production Checklist

- [ ] Use release build instead of debug
- [ ] Configure ProGuard/R8 for code obfuscation
- [ ] Set up proper signing for Play Store
- [ ] Configure Firebase App Distribution or similar for testing
- [ ] Set up monitoring (Crashlytics, Sentry)
- [ ] Configure backend for HTTPS/WSS
- [ ] Set up proper SSL certificates

---

## Part 6: API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/api/users` | Create/register user |
| GET | `/api/users/:callId` | Get user by Call ID |
| PUT | `/api/users/:callId/status` | Update user status |
| PUT | `/api/users/:callId/fcm` | Update FCM token |
| GET | `/api/users` | Get online users |
| POST | `/api/call/token` | Generate LiveKit tokens |
| POST | `/api/notify` | Send FCM notification |

All API endpoints require `x-api-key` header with your API key.

---

## Support

For issues or questions, please refer to the code comments and console logs for debugging information.