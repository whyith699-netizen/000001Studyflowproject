package com.studyflow.nativeapp

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PUT

data class ProfileDto(
    val uid: String,
    val email: String,
    val displayName: String,
    val createdAt: String?,
    val updatedAt: String?
)

data class UpdateProfileRequest(
    val displayName: String
)

data class UpdateProfileResponse(
    val message: String,
    val profile: ProfileDto
)

data class TaskDto(
    val id: String,
    val title: String,
    val completed: Boolean,
    val priority: String,
    val type: String,
    val classId: String?,
    val className: String?,
    val dueDate: String?,
    val updatedAt: String?
)

data class ClassDto(
    val id: String,
    val name: String,
    val days: List<String>,
    val color: String?,
    val updatedAt: String?
)

data class StudySessionDto(
    val id: String,
    val type: String,
    val duration: Int,
    val taskName: String?,
    val completedAt: String?
)

data class OverviewStatsDto(
    val totalTasks: Int,
    val pendingTasks: Int,
    val completedTasks: Int,
    val classCount: Int,
    val weeklyFocusMinutes: Int,
    val streak: Int
)

data class OverviewDto(
    val profile: ProfileDto,
    val tasks: List<TaskDto>,
    val classes: List<ClassDto>,
    val sessions: List<StudySessionDto>,
    val stats: OverviewStatsDto
)

data class ApiErrorEnvelope(
    val error: ApiErrorBody?
)

data class ApiErrorBody(
    val code: String?,
    val message: String?
)

interface BackendApi {
    @GET("v1/profile")
    suspend fun getProfile(@Header("Authorization") authHeader: String): ProfileDto

    @PUT("v1/profile")
    suspend fun updateProfile(
        @Header("Authorization") authHeader: String,
        @Body body: UpdateProfileRequest
    ): UpdateProfileResponse

    @GET("v1/overview")
    suspend fun getOverview(@Header("Authorization") authHeader: String): OverviewDto
}

object BackendClient {
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }

    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .build()

    val api: BackendApi by lazy {
        Retrofit.Builder()
            .baseUrl(BuildConfig.BACKEND_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(BackendApi::class.java)
    }
}
