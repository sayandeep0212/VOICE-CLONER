import { NextRequest, NextResponse } from 'next/server';
import { toBengaliScriptIfBanglish } from '@/lib/persona';

export async function POST(req: NextRequest) {
  try {
    const {
      text: rawText,
      language = 'auto',
      voiceId,
      speakerId,
      engine = 'local_gpu_cloner',
      instruct,
    } = await req.json();

    if (!rawText || typeof rawText !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    const text = engine === 'local_gpu_cloner' ? rawText : toBengaliScriptIfBanglish(rawText);

    const effectiveSpeakerId = (voiceId && voiceId.startsWith('voicebox-')) ? voiceId : (speakerId || voiceId);
    const isVoiceboxId = Boolean(effectiveSpeakerId && (effectiveSpeakerId.startsWith('voicebox-') || effectiveSpeakerId.startsWith('persona-')));

    // A true ElevenLabs ID is an ID that does NOT start with voicebox- or persona-
    const isExplicitElevenId = Boolean(voiceId && !isVoiceboxId);

    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8000';
    const voiceServerSecret = process.env.VOICE_SERVER_SECRET || 'smriti-dev-secret-2025';
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

    // 1. Synthesize with Local Voice Server (GPU Zero-Shot Cloner / Voicebox)
    if (voiceServerUrl && (!isExplicitElevenId || engine === 'local_gpu_cloner')) {
      try {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        formData.append('engine', engine || 'local_gpu_cloner');
        if (effectiveSpeakerId) {
          formData.append('speaker_id', effectiveSpeakerId);
        }
        if (instruct) {
          formData.append('instruct', instruct);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch(`${voiceServerUrl}/speak`, {
          method: 'POST',
          headers: {
            'x-secret': voiceServerSecret
          },
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('audio')) {
            const audioBuffer = await response.arrayBuffer();
            const usedEngine = response.headers.get('x-voicebox-engine') || engine || 'local_gpu_cloner';
            const detectedPitch = response.headers.get('x-voicebox-pitch');
            const detectedGender = response.headers.get('x-voicebox-gender');
            return new Response(audioBuffer, {
              headers: {
                'Content-Type': 'audio/wav',
                'Cache-Control': 'public, max-age=3600',
                'X-Voice-Engine': `Voicebox (${usedEngine})`,
                'X-Voice-Id': effectiveSpeakerId || 'default',
                ...(detectedPitch ? { 'X-Voice-Pitch': detectedPitch } : {}),
                ...(detectedGender ? { 'X-Voice-Gender': detectedGender } : {})
              }
            });
          }
        }
      } catch (voiceError) {
        console.warn('Voicebox zero-shot synthesis note, checking fallback:', voiceError);
      }
    }

    // 2. If user provided a specific ElevenLabs Voice ID or requested ElevenLabs without a Voicebox ID
    if (elevenLabsApiKey && (isExplicitElevenId || (!isVoiceboxId && engine === 'elevenlabs'))) {
      try {
        const lowerText = (text || '').toLowerCase();
        const isFemaleContext = lowerText.includes('biwi') || 
                                lowerText.includes('wife') || 
                                lowerText.includes('mother') || 
                                lowerText.includes('maa') || 
                                lowerText.includes('didi') || 
                                lowerText.includes('debadrita') || 
                                lowerText.includes('shona') || 
                                lowerText.includes('grandmother') ||
                                lowerText.includes('ammu');
        const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || (isFemaleContext ? '21m00Tcm4TlvDq8ikWAM' : 'JBFqnCBsd6RMkjVDRZzb');
        const targetVoiceId = isExplicitElevenId ? voiceId : defaultVoiceId;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${targetVoiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.50,
              similarity_boost: 0.85,
              style: 0.15,
              use_speaker_boost: true
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600',
              'X-Voice-Engine': 'ElevenLabs',
              'X-Voice-Id': targetVoiceId
            }
          });
        } else {
          const errBody = await response.text();
          console.warn('ElevenLabs API response status', response.status, errBody);
        }
      } catch (elevenErr) {
        console.warn('ElevenLabs TTS failed, checking Voicebox fallback:', elevenErr);
      }
    }

    // 3. Fallback to Voicebox general synthesis
    if (voiceServerUrl) {
      try {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        formData.append('engine', 'voicebox_neural');
        if (effectiveSpeakerId) {
          formData.append('speaker_id', effectiveSpeakerId);
        }
        if (instruct) {
          formData.append('instruct', instruct);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(`${voiceServerUrl}/speak`, {
          method: 'POST',
          headers: { 'x-secret': voiceServerSecret },
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const contentType = response.headers.get('content-type') || '';
          if (contentType.includes('audio')) {
            const audioBuffer = await response.arrayBuffer();
            return new Response(audioBuffer, {
              headers: {
                'Content-Type': 'audio/wav',
                'Cache-Control': 'public, max-age=3600',
                'X-Voice-Engine': 'Voicebox (voicebox_neural)',
                'X-Voice-Id': effectiveSpeakerId || 'fallback'
              }
            });
          }
        }
      } catch (fallbackErr) {
        console.warn('Voicebox fallback synthesis failed:', fallbackErr);
      }
    }

    // 4. Fallback to ElevenLabs default voice if not tried yet
    if (elevenLabsApiKey && !isExplicitElevenId) {
      try {
        const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`, {
          method: 'POST',
          headers: {
            'xi-api-key': elevenLabsApiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          body: JSON.stringify({
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: {
              stability: 0.50,
              similarity_boost: 0.85,
              style: 0.15,
              use_speaker_boost: true
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const audioBuffer = await response.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600',
              'X-Voice-Engine': 'ElevenLabs',
              'X-Voice-Id': defaultVoiceId
            }
          });
        }
      } catch (elevenErr) {
        console.warn('ElevenLabs default TTS failed:', elevenErr);
      }
    }

    // 3. Fallback notice for browser speech synthesis
    return NextResponse.json({
      audioAvailable: false,
      fallbackText: text,
      notice: 'Voice synthesis offline. Using browser speech synthesis.'
    });

  } catch (error: any) {
    console.error('TTS Route Error:', error);
    return NextResponse.json({ error: error?.message || 'TTS Error' }, { status: 500 });
  }
}
