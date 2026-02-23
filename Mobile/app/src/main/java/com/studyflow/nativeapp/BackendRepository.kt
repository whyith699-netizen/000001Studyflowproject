package com.studyflow.nativeapp

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await
import retrofit2.HttpException

class BackendRepository(
    private val auth: FirebaseAuth,
    private val api: BackendApi = BackendClient.api
) {
    suspend fun getProfile(): ProfileDto {
        return runWithAuthRetry { token ->
            api.getProfile(authHeader(token))
        }
    }

    suspend fun updateProfile(displayName: String): UpdateProfileResponse {
        val normalizedName = displayName.trim()
        if (normalizedName.isBlank()) {
            throw IllegalStateException("Display name cannot be empty.")
        }
        if (normalizedName.length > 80) {
            throw IllegalStateException("Display name is too long (max 80 characters).")
        }
        return runWithAuthRetry { token ->
            api.updateProfile(authHeader(token), UpdateProfileRequest(normalizedName))
        }
    }

    suspend fun getOverview(): OverviewDto {
        return runWithAuthRetry { token ->
            api.getOverview(authHeader(token))
        }
    }

    private suspend fun <T> runWithAuthRetry(request: suspend (String) -> T): T {
        val user = auth.currentUser ?: throw IllegalStateException("You must login first.")

        val firstToken = user.getIdToken(false).await().token
            ?: throw IllegalStateException("Failed to obtain auth token.")

        try {
            return request(firstToken)
        } catch (error: HttpException) {
            if (error.code() != 401) throw error
        }

        val refreshedToken = user.getIdToken(true).await().token
            ?: throw IllegalStateException("Failed to refresh auth token.")
        return request(refreshedToken)
    }

    private fun authHeader(token: String): String = "Bearer $token"
}
