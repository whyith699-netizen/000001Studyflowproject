package com.studyflow.nativeapp

import com.google.firebase.auth.FirebaseAuthException

object AuthErrorMapper {
    fun fromException(error: Exception?): String {
        val code = (error as? FirebaseAuthException)?.errorCode
        return fromCode(code, error?.message)
    }

    fun fromCode(code: String?, fallbackMessage: String? = null): String {
        return when (code) {
            "ERROR_INVALID_EMAIL" -> "Invalid email format."
            "ERROR_INVALID_CREDENTIAL" -> "Wrong email or password."
            "ERROR_USER_NOT_FOUND" -> "No account found with this email."
            "ERROR_WRONG_PASSWORD" -> "Wrong password."
            "ERROR_EMAIL_ALREADY_IN_USE" -> "Email already registered."
            "ERROR_WEAK_PASSWORD" -> "Password is too weak (minimum 6 chars)."
            "ERROR_OPERATION_NOT_ALLOWED" -> "This login provider is disabled in Firebase Auth."
            "ERROR_TOO_MANY_REQUESTS" -> "Too many attempts. Try again later."
            "ERROR_NETWORK_REQUEST_FAILED" -> "Network error. Check your internet connection."
            "ERROR_WEB_CONTEXT_CANCELED" -> "Google sign-in canceled."
            "ERROR_WEB_CONTEXT_ALREADY_PRESENTED" -> "Google sign-in is already in progress."
            "ERROR_ACCOUNT_EXISTS_WITH_DIFFERENT_CREDENTIAL" -> "This email already uses another sign-in method."
            "ERROR_PROVIDER_ALREADY_LINKED" -> "Provider already linked to this account."
            "ERROR_CREDENTIAL_ALREADY_IN_USE" -> "Credential already used by another account."
            "ERROR_INTERNAL_ERROR" -> "Internal Firebase error. Please retry."
            null -> fallbackMessage ?: "Authentication failed."
            else -> "Authentication failed ($code)."
        }
    }
}

