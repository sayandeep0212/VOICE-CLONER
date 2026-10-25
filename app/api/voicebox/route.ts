import { NextRequest, NextResponse } from 'next/server';
import { toBengaliScriptIfBanglish } from '@/lib/persona';

export async function GET(req: NextRequest) {
  const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8000';
  const voiceServerSecret = process.env.VOICE_SERVER_SECRET || 'smriti-dev-secret-2025';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const [healthRes, enginesRes] = await Promise.all([
      fetch(`${voiceServerUrl}/health`, {
        headers: { 'x-secret': voiceServerSecret },
        signal: controller.signal
      }).catch(() => null),
      fetch(`${voiceServerUrl}/engines`, {
        headers: { 'x-secret': voiceServerSecret },
        signal: controller.signal
      }).catch(() => null),
    ]);

    clearTimeout(timeoutId);

    const health = healthRes && healthRes.ok ? await healthRes.json() : null;
    const engines = enginesRes && enginesRes.ok ? await enginesRes.json() : null;

    return NextResponse.json({
      connected: !!health,
      serverUrl: voiceServerUrl,
      health: health || {
        status: 'standby',
        device: 'CPU / Direct Fallback',
        engines: { qwen_tts: true, chatterbox: true, acoustic_timbre: true },
        registered_speakers: 0
      },
      engines: engines || {
        default_engine: 'local_gpu_cloner',
        engines: [
          { id: 'local_gpu_cloner', name: 'Local GPU Zero-Shot Cloner (F5-TTS Flow Matching)', type: 'zero-shot-gpu' },
          { id: 'voicebox_neural', name: 'Voicebox Neural Cloner (Pitch & Timbre Matched)', type: 'neural-timbre' },
          { id: 'qwen_tts_1.7B', name: 'Qwen3-TTS 1.7B (Flagship Voicebox Cloner)', type: 'zero-shot' },
          { id: 'qwen_tts_0.6B', name: 'Qwen3-TTS 0.6B (Fast Cloner)', type: 'zero-shot' },
          { id: 'chatterbox', name: 'Chatterbox Multilingual (Expressive)', type: 'zero-shot' },
          { id: 'acoustic_timbre', name: 'Voicebox Instant Timbre Cloner', type: 'acoustic-resonance' }
        ]
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      connected: false,
      serverUrl: voiceServerUrl,
      error: error?.message || 'Server check error'
    });
  }
}

export async function POST(req: NextRequest) {
  const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8000';
  const voiceServerSecret = process.env.VOICE_SERVER_SECRET || 'smriti-dev-secret-2025';

  try {
    const formData = await req.formData();
    const rawText = (formData.get('text') as string) || 'Hello, I am speaking with your cloned voice.';
    const engine = (formData.get('engine') as string) || 'local_gpu_cloner';
    const text = engine === 'local_gpu_cloner' ? rawText : toBengaliScriptIfBanglish(rawText);
    const language = (formData.get('language') as string) || 'auto';
    const instruct = (formData.get('instruct') as string) || '';
    const speakerId = (formData.get('speaker_id') as string) || '';
    const audioFile = formData.get('audio_file') as File | null;

    const vbForm = new FormData();
    vbForm.append('text', text);
    vbForm.append('language', language);
    vbForm.append('engine', engine);
    if (instruct) vbForm.append('instruct', instruct);
    if (speakerId) vbForm.append('speaker_id', speakerId);

    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      vbForm.append('speaker_wav', new Blob([buffer], { type: audioFile.type || 'audio/wav' }), 'sample.wav');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const vbRes = await fetch(`${voiceServerUrl}/speak`, {
      method: 'POST',
      headers: {
        'x-secret': voiceServerSecret
      },
      body: vbForm,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!vbRes.ok) {
      const errText = await vbRes.text();
      return NextResponse.json({ error: `Voice server error: ${errText}` }, { status: vbRes.status });
    }

    const audioBuffer = await vbRes.arrayBuffer();
    const usedEngine = vbRes.headers.get('x-voicebox-engine') || engine;
    const detectedPitch = vbRes.headers.get('x-voicebox-pitch') || '';
    const detectedGender = vbRes.headers.get('x-voicebox-gender') || '';

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/wav',
        'Cache-Control': 'no-store',
        'X-Voicebox-Engine': usedEngine,
        'X-Voicebox-Pitch': detectedPitch,
        'X-Voicebox-Gender': detectedGender
      }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Voicebox synthesis failed' }, { status: 500 });
  }
}
