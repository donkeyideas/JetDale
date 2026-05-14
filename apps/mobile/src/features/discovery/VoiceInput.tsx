// ============================================================
// Jetdale — Voice Input Component
// Handles both free (Web Speech / expo-speech-recognition) and
// premium (Groq Whisper via voice-transcribe Edge Function) paths.
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { colors, typography, spacing, radii } from '@/theme/tokens';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onPartialTranscript?: (text: string) => void;
  disabled?: boolean;
  voicePreference?: 'auto' | 'web_speech' | 'whisper';
}

export function VoiceInput({
  onTranscript,
  onPartialTranscript,
  disabled = false,
  voicePreference = 'auto',
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

  // Pulse animation while recording
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  // Determine which speech method to use
  function getSpeechMethod(): 'web_speech' | 'whisper' {
    if (voicePreference === 'whisper') return 'whisper';
    if (voicePreference === 'web_speech') return 'web_speech';

    // Auto: use Web Speech API on web, expo-speech-recognition on mobile
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
        return 'web_speech';
      }
      return 'whisper';
    }

    // On native, try expo-speech-recognition first
    return 'web_speech';
  }

  async function startRecording() {
    setError(null);
    const method = getSpeechMethod();

    if (method === 'web_speech') {
      startWebSpeech();
    } else {
      startWhisperRecording();
    }
  }

  function startWebSpeech() {
    if (Platform.OS === 'web') {
      // Web Speech API
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError('Speech recognition not supported in this browser.');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (interimTranscript && onPartialTranscript) {
          onPartialTranscript(interimTranscript);
        }
        if (finalTranscript) {
          onTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
        stopPulse();
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopPulse();
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      startPulse();
    } else {
      // Native: use expo-speech-recognition
      startNativeSpeech();
    }
  }

  async function startNativeSpeech() {
    try {
      const ExpoSpeechRecognition = require('expo-speech-recognition');

      const { granted } = await ExpoSpeechRecognition.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required for voice input.');
        return;
      }

      ExpoSpeechRecognition.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });

      const resultSub = ExpoSpeechRecognition.addResultListener((event: any) => {
        if (event.isFinal && event.results?.[0]?.transcript) {
          onTranscript(event.results[0].transcript);
        } else if (event.results?.[0]?.transcript && onPartialTranscript) {
          onPartialTranscript(event.results[0].transcript);
        }
      });

      const errorSub = ExpoSpeechRecognition.addErrorListener((event: any) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsRecording(false);
        stopPulse();
      });

      const endSub = ExpoSpeechRecognition.addEndListener(() => {
        setIsRecording(false);
        stopPulse();
      });

      recognitionRef.current = { resultSub, errorSub, endSub };
      setIsRecording(true);
      startPulse();
    } catch {
      // Fallback to whisper if expo-speech-recognition not available
      startWhisperRecording();
    }
  }

  async function startWhisperRecording() {
    try {
      const { Audio } = require('expo-av');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError('Microphone permission is required for voice input.');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recognitionRef.current = recording;
      setIsRecording(true);
      startPulse();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
    }
  }

  async function stopRecording() {
    const method = getSpeechMethod();

    if (method === 'web_speech') {
      if (Platform.OS === 'web' && recognitionRef.current) {
        recognitionRef.current.stop();
      } else if (recognitionRef.current) {
        // Native speech recognition
        try {
          const ExpoSpeechRecognition = require('expo-speech-recognition');
          ExpoSpeechRecognition.stop();
          recognitionRef.current.resultSub?.remove();
          recognitionRef.current.errorSub?.remove();
          recognitionRef.current.endSub?.remove();
        } catch {
          // Cleanup silently
        }
      }
    } else {
      // Whisper: stop recording, send to server
      if (recognitionRef.current) {
        try {
          setIsProcessing(true);
          await recognitionRef.current.stopAndUnloadAsync();
          const uri = recognitionRef.current.getURI();

          if (uri) {
            await sendToWhisper(uri);
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to process recording';
          setError(message);
        } finally {
          setIsProcessing(false);
        }
      }
    }

    setIsRecording(false);
    stopPulse();
    recognitionRef.current = null;
  }

  async function sendToWhisper(audioUri: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(audioUri);
        const blob = await response.blob();
        formData.append('audio', blob, 'recording.m4a');
      } else {
        formData.append('audio', {
          uri: audioUri,
          name: 'recording.m4a',
          type: 'audio/m4a',
        } as any);
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/voice-transcribe`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Transcription failed');
      }

      const result = await response.json();
      if (result.transcript) {
        onTranscript(result.transcript);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Transcription failed';
      setError(message);
    }
  }

  function handlePress() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable
          style={[
            styles.micButton,
            isRecording && styles.micButtonRecording,
            (disabled || isProcessing) && styles.micButtonDisabled,
          ]}
          onPress={handlePress}
          disabled={disabled || isProcessing}
        >
          <Text style={styles.micIcon}>
            {isProcessing ? '...' : isRecording ? '||' : 'MIC'}
          </Text>
        </Pressable>
      </Animated.View>

      <Text style={styles.label}>
        {isProcessing
          ? 'Processing...'
          : isRecording
            ? 'Listening... tap to stop'
            : 'Tap to speak'}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: spacing[2] },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.paper2,
    borderWidth: 2,
    borderColor: colors.paper3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButtonRecording: {
    backgroundColor: colors.accent,
    borderColor: colors.accent2,
  },
  micButtonDisabled: { opacity: 0.4 },
  micIcon: {
    fontFamily: typography.families.mono,
    fontSize: typography.sizes.monoXs,
    fontWeight: typography.weights.bold,
    color: colors.ink,
  },
  label: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.muted,
  },
  error: {
    fontFamily: typography.families.body,
    fontSize: typography.sizes.bodySm,
    color: colors.error,
    textAlign: 'center',
    maxWidth: 200,
  },
});
