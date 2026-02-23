package com.studyflow.nativeapp

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions

object FirebaseInitializer {
    private const val API_KEY = "AIzaSyBkI6gO38nNMvjQCGBiR7hINU4ZckNBsCY"
    private const val APP_ID = "1:912149378367:android:0bf9d027fe1d13616f4f8a"
    private const val PROJECT_ID = "studydashboard-bd8f0"
    private const val STORAGE_BUCKET = "studydashboard-bd8f0.firebasestorage.app"
    private const val SENDER_ID = "912149378367"

    fun ensureInitialized(context: Context) {
        if (FirebaseApp.getApps(context).isNotEmpty()) return

        // Preferred path: use values generated from google-services.json.
        val autoInitialized = FirebaseApp.initializeApp(context)
        if (autoInitialized != null) return

        val options = FirebaseOptions.Builder()
            .setApiKey(API_KEY)
            .setApplicationId(APP_ID)
            .setProjectId(PROJECT_ID)
            .setStorageBucket(STORAGE_BUCKET)
            .setGcmSenderId(SENDER_ID)
            .build()

        FirebaseApp.initializeApp(context, options)
    }
}
