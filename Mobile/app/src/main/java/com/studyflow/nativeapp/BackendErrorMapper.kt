package com.studyflow.nativeapp

import com.google.gson.Gson
import retrofit2.HttpException
import java.io.IOException

object BackendErrorMapper {
    private val gson = Gson()

    fun fromThrowable(error: Throwable): String {
        return when (error) {
            is HttpException -> fromHttp(error)
            is IOException -> "Network error. Check your internet connection."
            is IllegalStateException -> error.message ?: "Operation failed."
            else -> error.message ?: "Unexpected backend error."
        }
    }

    private fun fromHttp(error: HttpException): String {
        val body = error.response()?.errorBody()?.string().orEmpty()
        val envelope = runCatching { gson.fromJson(body, ApiErrorEnvelope::class.java) }.getOrNull()
        val code = envelope?.error?.code
        val message = envelope?.error?.message

        return when (error.code()) {
            400 -> message ?: "Invalid request."
            401 -> message ?: "Session expired. Please login again."
            500 -> message ?: "Server error. Please try again."
            else -> message ?: "Request failed (${error.code()})."
        }.let {
            if (code.isNullOrBlank()) it else "$it [$code]"
        }
    }
}
