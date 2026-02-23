# StudyFlow Native Android

This is a full native Android starter app (no WebView, no Capacitor runtime) with:
- Jetpack Compose UI (no XML layout screen)
- Firebase Authentication (email/password)
- Firebase Authentication (Google via OAuth provider flow)
- Firestore profile read/write

## Run

1. Open `Mobile/native-android` in Android Studio.
2. Sync Gradle.
3. Run the `app` module on device/emulator.

## Google Sign-In error handling

- Error mapping is centralized in `app/src/main/java/com/studyflow/nativeapp/AuthErrorMapper.kt`.
- `MainActivity` uses this mapper to show clearer messages per Firebase auth code.

## Firebase setup

1. Create an Android app in Firebase Console with package name `com.studyflow.nativeapp`.
2. Download `google-services.json`.
3. Put it in `app/google-services.json`.
4. In Firebase Authentication, enable:
   - Email/Password
   - Google
5. Add SHA-1 and SHA-256 fingerprints in the Firebase Android app settings.

- The app currently initializes Firebase manually in
  `app/src/main/java/com/studyflow/nativeapp/FirebaseInitializer.kt`.
- Replace `APP_ID` with your Android Firebase app id (`...:android:...`) for production.
- If `app/google-services.json` exists, Gradle auto-applies `com.google.gms.google-services`.
