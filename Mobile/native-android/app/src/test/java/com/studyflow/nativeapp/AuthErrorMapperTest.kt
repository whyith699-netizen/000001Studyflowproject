package com.studyflow.nativeapp

import org.junit.Assert.assertEquals
import org.junit.Test

class AuthErrorMapperTest {
    @Test
    fun `maps invalid credential`() {
        assertEquals(
            "Wrong email or password.",
            AuthErrorMapper.fromCode("ERROR_INVALID_CREDENTIAL")
        )
    }

    @Test
    fun `maps network error`() {
        assertEquals(
            "Network error. Check your internet connection.",
            AuthErrorMapper.fromCode("ERROR_NETWORK_REQUEST_FAILED")
        )
    }

    @Test
    fun `maps unknown code with suffix`() {
        assertEquals(
            "Authentication failed (ERROR_SOMETHING_NEW).",
            AuthErrorMapper.fromCode("ERROR_SOMETHING_NEW")
        )
    }

    @Test
    fun `uses fallback message when code missing`() {
        assertEquals(
            "custom fallback",
            AuthErrorMapper.fromCode(null, "custom fallback")
        )
    }
}

