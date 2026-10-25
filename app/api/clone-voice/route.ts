import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const name = (formData.get('name') as string) || 'Persona Voice';
    const description = (formData.get('description') as string) || 'Voicebox AI Voice Clone';
    const referenceText = (formData.get('reference_text') as string) || '';
    const engine = (formData.get('engine') as string) || 'qwen_tts_1.7B';
    const audioFile = formData.get('file') as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'Audio recording or file is required for voice cloning' },
        { status: 400 }
      );
    }

    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8000';
    const voiceServerSecret = process.env.VOICE_SERVER_SECRET || 'smriti-dev-secret-2025';

    // 1. Generate unique voice profile ID
    const voiceId = `voicebox-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 2. Save sample locally in public/uploads/voices
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = audioFile.name && path.extname(audioFile.name) ? path.extname(audioFile.name) : '.wav';
    const filename = `${voiceId}${fileExt}`;
    const filePath = path.join(uploadDir, filename);

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);
    const localAudioUrl = `/uploads/voices/${filename}`;

    // 3. Register with Voicebox Voice Cloning Server
    let voiceboxRegistered = false;
    let voiceboxDetails: any = null;

    try {
      const vbForm = new FormData();
      vbForm.append('speaker_id', voiceId);
      vbForm.append('reference_text', referenceText || 'Hello, this is my voice recording.');
      vbForm.append('speaker_wav', new Blob([buffer], { type: audioFile.type || 'audio/wav' }), filename);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const vbRes = await fetch(`${voiceServerUrl}/register-speaker`, {
        method: 'POST',
        headers: {
          'x-secret': voiceServerSecret
        },
        body: vbForm,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (vbRes.ok) {
        voiceboxRegistered = true;
        voiceboxDetails = await vbRes.json();
      }
    } catch (vbErr) {
      console.warn('Voicebox local server register note (running in direct mode):', vbErr);
    }

    // 4. ElevenLabs Voice Cloning (if requested or key present)
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    let elevenVoiceId: string | null = null;
    let elevenNotice: string | null = null;

    if (elevenLabsApiKey && (formData.get('use_elevenlabs') === 'true' || engine === 'elevenlabs')) {
      try {
        const elevenFormData = new FormData();
        elevenFormData.append('name', name);
        elevenFormData.append('description', description);
        elevenFormData.append('files', new Blob([buffer], { type: audioFile.type || 'audio/wav' }), filename);

        const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: { 'xi-api-key': elevenLabsApiKey },
          body: elevenFormData
        });

        const elevenData = await response.json();
        if (response.ok && elevenData?.voice_id) {
          elevenVoiceId = elevenData.voice_id;
        } else {
          elevenNotice = elevenData?.detail?.message || 'ElevenLabs clone creation returned status ' + response.status;
          console.warn('ElevenLabs clone attempt notice:', elevenNotice);
        }
      } catch (e: any) {
        elevenNotice = e?.message;
        console.warn('ElevenLabs optional attempt failed, keeping Voicebox profile:', e);
      }
    }

    const effectiveEngine = elevenVoiceId ? 'ElevenLabs' : `Voicebox (${engine})`;
    return NextResponse.json({
      ok: true,
      voice_id: elevenVoiceId || voiceId,
      profile_id: voiceId,
      name,
      engine: effectiveEngine,
      audio_url: localAudioUrl,
      voicebox_registered: voiceboxRegistered,
      details: voiceboxDetails,
      eleven_notice: elevenNotice,
      message: elevenVoiceId
        ? `Voice successfully cloned with ElevenLabs! Voice ID: ${elevenVoiceId}`
        : (voiceboxRegistered
            ? 'Voice successfully cloned with Voicebox zero-shot engine!'
            : 'Voice profile created and sample saved for synthesis.')
    });

  } catch (error: any) {
    console.error('Voicebox Clone Route Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to clone voice' },
      { status: 500 }
    );
  }
}
