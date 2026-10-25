import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      text,
      language = 'en',
      voiceId,
      speakerId,
      engine = 'voicebox_neural',
      instruct,
    } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for TTS' }, { status: 400 });
    }

    const effectiveSpeakerId = (voiceId && voiceId.startsWith('voicebox-')) ? voiceId : (speakerId || voiceId);
    const isVoiceboxId = effectiveSpeakerId && (effectiveSpeakerId.startsWith('voicebox-') || effectiveSpeakerId.startsWith('persona-'));

    // 1. Voicebox Voice Server (Zero-Shot Qwen3-TTS / Chatterbox / Timbre Cloning)
    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8000';
    const voiceServerSecret = process.env.VOICE_SERVER_SECRET || 'smriti-dev-secret-2025';

    if (voiceServerUrl) {
      try {
        const formData = new FormData();
        formData.append('text', text);
        formData.append('language', language);
        formData.append('engine', engine);
        if (effectiveSpeakerId) {
          formData.append('speaker_id', effectiveSpeakerId);
        }
        if (instruct) {
          formData.append('instruct', instruct);
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

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
            const usedEngine = response.headers.get('x-voicebox-engine') || engine;
            return new Response(audioBuffer, {
              headers: {
                'Content-Type': 'audio/wav',
                'Cache-Control': 'public, max-age=3600',
                'X-Voice-Engine': `Voicebox (${usedEngine})`,
                'X-Voice-Id': effectiveSpeakerId || 'default'
              }
            });
          }
        }
      } catch (voiceError) {
        console.warn('Voicebox server not reachable or timed out, trying fallback:', voiceError);
      }
    }

    // 2. ElevenLabs fallback if user has API key and it's not explicitly a Voicebox ID
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (elevenLabsApiKey && (!isVoiceboxId || !voiceServerUrl)) {
      try {
        const defaultVoiceId = process.env.ELEVENLABS_DEFAULT_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
        const targetVoiceId = (!isVoiceboxId && voiceId) ? voiceId : defaultVoiceId;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

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
              stability: 0.55,
              similarity_boost: 0.75,
              style: 0.1,
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
        }
      } catch (elevenErr) {
        console.warn('ElevenLabs TTS failed:', elevenErr);
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
