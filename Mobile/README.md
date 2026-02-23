# StudyFlow Native Android

Native Android app (Jetpack Compose) with:
- Firebase Auth (Email/Password + Google OAuth provider flow)
- Backend API integration for user profile (`Cloud Functions -> Firestore`)
- Retrofit + OkHttp networking layer

## Run

1. Open `Mobile` in Android Studio.
2. Sync Gradle.
3. Run the `app` module on device/emulator.

## Profile Backend Integration

- Android reads/writes profile via backend:
  - `GET /v1/profile`
  - `PUT /v1/profile`
- Endpoint base URL is configured in `app/build.gradle` as:
  - `BuildConfig.BACKEND_BASE_URL = "https://asia-southeast1-studydashboard-bd8f0.cloudfunctions.net/api/"`

Main files:
- `app/src/main/java/com/studyflow/nativeapp/BackendApi.kt`
- `app/src/main/java/com/studyflow/nativeapp/BackendRepository.kt`
- `app/src/main/java/com/studyflow/nativeapp/BackendErrorMapper.kt`
- `app/src/main/java/com/studyflow/nativeapp/MainActivity.kt`

## Firebase setup

1. Create Firebase Android app with package name `com.studyflow.nativeapp`.
2. Place `google-services.json` in `app/google-services.json`.
3. Enable Firebase Auth providers:
   - Email/Password
   - Google
4. Add SHA-1 and SHA-256 fingerprints in Firebase console.

Firebase bootstrap file:
- `app/src/main/java/com/studyflow/nativeapp/FirebaseInitializer.kt`
