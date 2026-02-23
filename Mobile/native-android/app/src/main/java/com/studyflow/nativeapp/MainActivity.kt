package com.studyflow.nativeapp

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.OAuthProvider
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.SetOptions

class MainActivity : ComponentActivity() {
    private lateinit var auth: FirebaseAuth
    private lateinit var db: FirebaseFirestore
    private lateinit var authStateListener: FirebaseAuth.AuthStateListener
    private var emailInput by mutableStateOf("")
    private var passwordInput by mutableStateOf("")
    private var displayNameInput by mutableStateOf("")
    private var statusText by mutableStateOf("")
    private var statusIsError by mutableStateOf(false)
    private var loading by mutableStateOf(false)
    private var currentUser by mutableStateOf<FirebaseUser?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        try {
            FirebaseInitializer.ensureInitialized(applicationContext)
            auth = FirebaseAuth.getInstance()
            db = FirebaseFirestore.getInstance()
        } catch (error: Exception) {
            setStatus("Firebase init failed: ${error.message}", isError = true)
        }

        setContent {
            Surface(modifier = Modifier.fillMaxSize()) {
                MaterialTheme {
                    AuthScreen(
                        email = emailInput,
                        password = passwordInput,
                        displayName = displayNameInput,
                        status = statusText,
                        statusIsError = statusIsError,
                        loading = loading,
                        currentUser = currentUser,
                        onEmailChange = { emailInput = it },
                        onPasswordChange = { passwordInput = it },
                        onDisplayNameChange = { displayNameInput = it },
                        onLogin = { login() },
                        onGoogleLogin = { signInWithGoogle() },
                        onRegister = { register() },
                        onSaveProfile = { saveProfile() },
                        onLogout = { auth.signOut() }
                    )
                }
            }
        }

        bindActions()
        observeAuthState()
    }

    override fun onDestroy() {
        if (::authStateListener.isInitialized && ::auth.isInitialized) {
            auth.removeAuthStateListener(authStateListener)
        }
        super.onDestroy()
    }

    private fun bindActions() {
        // Compose callbacks are bound inside setContent.
    }

    private fun observeAuthState() {
        authStateListener = FirebaseAuth.AuthStateListener { firebaseAuth ->
            val user = firebaseAuth.currentUser
            updateSignedInState(user)
            if (user != null) {
                loadProfile(user.uid)
            } else {
                displayNameInput = ""
            }
        }
        auth.addAuthStateListener(authStateListener)
    }

    private fun login() {
        val email = emailInput.trim()
        val password = passwordInput
        if (!validateCredentials(email, password)) return

        showLoading(true)
        auth.signInWithEmailAndPassword(email, password)
            .addOnCompleteListener { task ->
                showLoading(false)
                if (task.isSuccessful) {
                    setStatus("Login success.", isError = false)
                } else {
                    setStatus(authError(task.exception), isError = true)
                }
            }
    }

    private fun register() {
        val email = emailInput.trim()
        val password = passwordInput
        if (!validateCredentials(email, password)) return

        showLoading(true)
        auth.createUserWithEmailAndPassword(email, password)
            .addOnCompleteListener { task ->
                showLoading(false)
                if (task.isSuccessful) {
                    setStatus("Account created. You are now logged in.", isError = false)
                } else {
                    setStatus(authError(task.exception), isError = true)
                }
            }
    }

    private fun signInWithGoogle() {
        showLoading(true)

        val provider = OAuthProvider.newBuilder("google.com")
        provider.addCustomParameter("prompt", "select_account")
        provider.scopes = listOf("email", "profile")

        val pending = auth.pendingAuthResult
        if (pending != null) {
            pending
                .addOnSuccessListener {
                    showLoading(false)
                    setStatus("Google login success.", isError = false)
                }
                .addOnFailureListener { err ->
                    showLoading(false)
                    setStatus("Google login failed: ${authError(err)}", isError = true)
                }
            return
        }

        auth.startActivityForSignInWithProvider(this, provider.build())
            .addOnSuccessListener {
                showLoading(false)
                setStatus("Google login success.", isError = false)
            }
            .addOnFailureListener { err ->
                showLoading(false)
                setStatus("Google login failed: ${authError(err)}", isError = true)
            }
    }

    private fun saveProfile() {
        val user = auth.currentUser ?: run {
            setStatus("You must login first.", isError = true)
            return
        }
        val displayName = displayNameInput.trim()
        if (displayName.isBlank()) {
            setStatus("Display name cannot be empty.", isError = true)
            return
        }

        val payload = hashMapOf(
            "displayName" to displayName,
            "email" to (user.email ?: ""),
            "updatedAt" to FieldValue.serverTimestamp()
        )

        showLoading(true)
        db.collection("users").document(user.uid)
            .set(payload, SetOptions.merge())
            .addOnSuccessListener {
                showLoading(false)
                setStatus("Profile saved to Firestore.", isError = false)
            }
            .addOnFailureListener { err ->
                showLoading(false)
                setStatus("Failed saving profile: ${err.message}", isError = true)
            }
    }

    private fun loadProfile(uid: String) {
        db.collection("users").document(uid)
            .get()
            .addOnSuccessListener { doc ->
                val displayName = doc.getString("displayName").orEmpty()
                if (displayName.isNotBlank()) {
                    displayNameInput = displayName
                }
            }
            .addOnFailureListener { err ->
                setStatus("Failed loading profile: ${err.message}", isError = true)
            }
    }

    private fun validateCredentials(email: String, password: String): Boolean {
        if (email.isBlank() || password.isBlank()) {
            setStatus("Email and password are required.", isError = true)
            return false
        }
        if (password.length < 6) {
            setStatus("Password must be at least 6 characters.", isError = true)
            return false
        }
        return true
    }

    private fun updateSignedInState(user: FirebaseUser?) {
        currentUser = user
    }

    private fun showLoading(loading: Boolean) {
        this.loading = loading
    }

    private fun setStatus(message: String, isError: Boolean) {
        statusText = message
        statusIsError = isError
    }

    private fun authError(error: Exception?): String {
        return AuthErrorMapper.fromException(error)
    }
}

@Composable
private fun AuthScreen(
    email: String,
    password: String,
    displayName: String,
    status: String,
    statusIsError: Boolean,
    loading: Boolean,
    currentUser: FirebaseUser?,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onDisplayNameChange: (String) -> Unit,
    onLogin: () -> Unit,
    onGoogleLogin: () -> Unit,
    onRegister: () -> Unit,
    onSaveProfile: () -> Unit,
    onLogout: () -> Unit
) {
    val isLoggedIn = currentUser != null

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(20.dp),
        verticalArrangement = Arrangement.Top
    ) {
        Text(text = "StudyFlow Native", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            text = "Android native app with Firebase Auth + Firestore",
            style = MaterialTheme.typography.bodyMedium
        )
        Spacer(modifier = Modifier.height(12.dp))

        if (loading) {
            CircularProgressIndicator()
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (status.isNotBlank()) {
            Text(
                text = status,
                color = if (statusIsError) Color(0xFFB00020) else Color(0xFF1B5E20),
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (!isLoggedIn) {
            OutlinedTextField(
                value = email,
                onValueChange = onEmailChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Email") },
                singleLine = true,
                enabled = !loading
            )
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedTextField(
                value = password,
                onValueChange = onPasswordChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Password") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                enabled = !loading
            )
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onLogin,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Login")
            }
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                onClick = onGoogleLogin,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Continue with Google")
            }
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                onClick = onRegister,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Register")
            }
        } else {
            Text(
                text = "Signed in as ${currentUser.email ?: currentUser.uid}",
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedTextField(
                value = displayName,
                onValueChange = onDisplayNameChange,
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Display Name") },
                singleLine = true,
                enabled = !loading
            )
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onSaveProfile,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save Profile")
            }
            Spacer(modifier = Modifier.height(10.dp))
            OutlinedButton(
                onClick = onLogout,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Logout")
            }
        }
    }
}
