# VoIP P2P APK Build Memory

Date: 2026-05-15

## Goal

Build the Android APK for the React Native mobile app using `setup-documentation.md`, then copy the generated APK to the repository root.

## Current Status

- JDK is installed and available:
  - `java -version` reports OpenJDK 17.0.18.
  - `javac -version` reports 17.0.18.
- Mobile npm dependencies were installed in `mobile/node_modules`.
- `mobile/package.json` was adjusted to use bundled local packages:
  - `react-native-callkeep`: `file:../react-native-callkeep-master`
  - `react-native-incall-manager`: `file:../react-native-incall-manager-master`
  - `react`: `18.2.0` to match React Native 0.74.5 peer requirements.
- `mobile/android` was scaffolded from the React Native 0.74 template because the repo only had `AndroidManifest.xml`.
- Android package/app ID was set to `com.voipp2p`.
- Gradle wrapper downloaded Gradle 8.6 successfully.
- First Gradle build reached native module configuration, then failed because Android SDK was missing.
- Android command-line tools were downloaded and unpacked to `/tmp/android-sdk/cmdline-tools/latest`.
- Android SDK licenses were accepted in `/tmp/android-sdk/licenses`.

## Still Required

Install or finish installing these Android SDK packages:

```bash
/tmp/android-sdk/cmdline-tools/latest/bin/sdkmanager --sdk_root=/tmp/android-sdk \
  "platforms;android-34" \
  "build-tools;34.0.0" \
  "platform-tools" \
  "ndk;26.1.10909125"
```

Then create `mobile/android/local.properties`:

```properties
sdk.dir=/tmp/android-sdk
```

Then build:

```bash
cd mobile/android
ANDROID_HOME=/tmp/android-sdk ANDROID_SDK_ROOT=/tmp/android-sdk ./gradlew assembleDebug
```

Expected APK:

```text
mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

Copy target at repository root:

```text
VoipP2P.apk
```

## Notes

- `/tmp/android-sdk` is temporary and may disappear after reboot. For a persistent SDK, install Android Studio or set up `$HOME/Android/Sdk`.
- `google-services.json` is still missing from `mobile/android/app/google-services.json`; if Firebase Gradle integration requires it later, add the Firebase config file for package `com.voipp2p`.
