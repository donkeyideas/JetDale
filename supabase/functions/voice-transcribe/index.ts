// ============================================================
// Jetdale — Voice Transcribe Edge Function
// Accepts audio, forwards to Groq Whisper, returns transcript.
// Checks voice quota before processing.
// ============================================================

import { getAuthUser, AuthError } from '../_shared/auth.ts';
import { checkQuota, incrementVoiceMinutes } from '../_shared/quota-check.ts';
import { jsonResponse, errorResponse, corsResponse, limitExceededResponse } from '../_shared/response.ts';
import { logProductEvent } from '../_shared/log-event.ts';

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
const GROQ_WHISPER_MODEL = Deno.env.get('GROQ_WHISPER_MODEL') || 'whisper-large-v3-turbo';
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const user = await getAuthUser(req);

    // Check voice quota
    const quotaCheck = await checkQuota(user.id, user.planTier, 'voiceMinutesPerMonth');
    if (!quotaCheck.allowed) {
      return limitExceededResponse(quotaCheck.limit!, quotaCheck.current!, quotaCheck.max!);
    }

    // Check if Groq is configured
    if (!GROQ_API_KEY) {
      return errorResponse('Voice transcription is not configured. Groq API key missing.', 503);
    }

    // Parse multipart form data
    const formData = await req.formData();
    const audioFile = formData.get('audio');

    if (!audioFile || !(audioFile instanceof File)) {
      return errorResponse('Missing audio file. Send as multipart form data with key "audio".', 400);
    }

    // Validate file size
    if (audioFile.size > MAX_AUDIO_SIZE) {
      return errorResponse(`Audio file too large. Maximum size is 25MB.`, 400);
    }

    // Validate file type
    const validTypes = ['audio/m4a', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4'];
    const isValidType = validTypes.some(
      (t) => audioFile.type === t || audioFile.name.match(/\.(m4a|mp3|wav|webm|ogg|mp4)$/i),
    );
    if (!isValidType) {
      return errorResponse(`Unsupported audio format: ${audioFile.type}. Supported: m4a, mp3, wav, webm, ogg.`, 400);
    }

    // Forward to Groq Whisper
    const groqForm = new FormData();
    groqForm.append('file', audioFile, audioFile.name || 'audio.m4a');
    groqForm.append('model', GROQ_WHISPER_MODEL);
    groqForm.append('response_format', 'verbose_json');
    groqForm.append('language', 'en');

    const startMs = Date.now();
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    const latencyMs = Date.now() - startMs;

    if (!groqResponse.ok) {
      const errText = await groqResponse.text();
      console.error('Groq error:', errText);
      return errorResponse('Transcription failed. Please try again.', 502);
    }

    const result = await groqResponse.json();
    const transcript = result.text || '';
    const durationSeconds = result.duration || 0;
    const durationMinutes = Math.ceil(durationSeconds / 60);

    // Increment voice minutes used
    if (durationMinutes > 0) {
      await incrementVoiceMinutes(user.id, durationMinutes);
    }

    // Log product event
    await logProductEvent({
      userId: user.id,
      event: 'voice_transcription',
      properties: {
        duration_seconds: durationSeconds,
        duration_minutes: durationMinutes,
        latency_ms: latencyMs,
        transcript_length: transcript.length,
        model: GROQ_WHISPER_MODEL,
      },
    });

    return jsonResponse({
      transcript,
      durationSeconds,
      confidence: result.segments?.[0]?.avg_logprob
        ? Math.exp(result.segments[0].avg_logprob)
        : null,
      model: GROQ_WHISPER_MODEL,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status);
    }
    console.error('voice-transcribe error:', err);
    return errorResponse('Internal server error', 500);
  }
});
