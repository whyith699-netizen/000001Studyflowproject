/**
 * useVoiceInput Hook
 * Encapsulates Web Speech API logic for voice-to-text input.
 * Supports Indonesian (id-ID) and English (en-US) with auto-detection.
 * Note: Voice input is disabled in mobile apps (Capacitor) as Web Speech API
 * requires a browser environment.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// Check if running in Capacitor/mobile app
const isCapacitorApp = () => {
  return typeof window !== 'undefined' && (
    window.Capacitor?.isNativePlatform?.() === true ||
    /(^|\s)capacitor/i.test(navigator.userAgent) ||
    window.webkit?.messageHandlers?.capacitor ||
    window.Capacitor?.getPlatform?.() !== 'web'
  );
};

/**
 * @param {object} options
 * @param {string} options.language - BCP-47 language tag (default 'id-ID')
 * @param {number} options.silenceTimeout - ms to auto-stop after silence (default 5000)
 * @param {boolean} options.continuous - keep listening until manually stopped (default false)
 * @returns {{ isSupported, isListening, transcript, error, startListening, stopListening, resetTranscript }}
 */
export default function useVoiceInput({
  language = 'id-ID',
  silenceTimeout = 5000,
  continuous = false,
} = {}) {
  const [isSupported] = useState(() => {
    if (isCapacitorApp()) return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  });
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const connectionTimeoutRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };
  }, []);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    silenceTimerRef.current = setTimeout(() => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
    }, silenceTimeout);
  }, [silenceTimeout, isListening]);

  const startListening = useCallback(() => {
    // Check if running in mobile app
    if (isCapacitorApp()) {
      setError('Voice input is not available in mobile app. Please use the keyboard to type.');
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Browser does not support voice input');
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
    }

    setError('');
    setTranscript('');

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = true;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      // Clear the connection timeout once it successfully starts listening
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = null;
      }
      
      setIsListening(true);
      resetSilenceTimer();
    };

    recognition.onresult = (event) => {
      resetSilenceTimer();

      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('[useVoiceInput] Error:', event.error);

      switch (event.error) {
        case 'not-allowed':
          setError('Microphone permission denied. Please enable it in browser settings.');
          break;
        case 'no-speech':
          setError('No sound detected. Please try again.');
          break;
        case 'audio-capture':
          setError('Microphone not found. Ensure a microphone is connected.');
          break;
        case 'network':
          setError('Internet connection required for voice input.');
          break;
        case 'aborted':
          // User or programmatic abort — not an error the user needs to see
          break;
        default:
          setError(`Voice input error: ${event.error}`);
      }

      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      if (connectionTimeoutRef.current) {
        clearTimeout(connectionTimeoutRef.current);
      }
    };

    recognitionRef.current = recognition;

    try {
      // Set a strict timeout (e.g., 5 seconds) to catch silent connection failures
      connectionTimeoutRef.current = setTimeout(() => {
        if (!isListening && recognitionRef.current) {
          try {
            recognitionRef.current.abort();
          } catch {
             // ignore
          }
          setError('Connection to language service timed out. Please check your internet connection.');
          setIsListening(false);
        }
      }, 5000);

      recognition.start();
    } catch {
      setError('Failed to start voice input. Please try again.');
      setIsListening(false);
    }
  }, [language, continuous, resetSilenceTimer, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
    }
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setError('');
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  };
}
