import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const personaId = (formData.get('personaId') as string) || `persona-${Date.now()}`;
    const personaName = (formData.get('name') as string) || 'Loved One';
    const relationship = (formData.get('relationship') as string) || 'Relative';

    if (!file) {
      return NextResponse.json(
        { error: 'No audio recording or file provided.' },
        { status: 400 }
      );
    }

    // 1. Ensure public/uploads/voices directory exists locally
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'voices');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = file.name && path.extname(file.name) ? path.extname(file.name) : '.wav';
    const safeFilename = `${personaId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${Date.now()}${fileExt}`;
    const filePath = path.join(uploadDir, safeFilename);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(filePath, buffer);

    let publicAudioUrl = `/uploads/voices/${safeFilename}`;

    // 2. If Supabase Storage is configured, also persist to Supabase bucket
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('voice-samples')
          .upload(`${personaId}/${safeFilename}`, buffer, {
            contentType: file.type || 'audio/wav',
            upsert: true
          });

        if (!uploadErr && uploadData?.path) {
          const { data: publicUrlData } = supabase.storage
            .from('voice-samples')
            .getPublicUrl(uploadData.path);
          if (publicUrlData?.publicUrl) {
            publicAudioUrl = publicUrlData.publicUrl;
          }
        }
      } catch (sbErr) {
        console.warn('Supabase storage upload note:', sbErr);
      }
    }

    let clonedVoiceId: string | null = null;
    let cloningMessage = 'Voice recording saved permanently.';
    let cloningEngine: 'ElevenLabs' | 'XTTS-v2' | 'Local' = 'Local';

    // 3. Attempt ElevenLabs Instant Voice Cloning (if API key available)
    const elevenApiKey = process.env.ELEVENLABS_API_KEY;
    if (elevenApiKey) {
      try {
        const elevenForm = new FormData();
        elevenForm.append('name', `${personaName} (${relationship})`);
        elevenForm.append('description', `Smriti voice clone for ${personaName}`);
        elevenForm.append('files', new Blob([buffer], { type: file.type || 'audio/wav' }), safeFilename);

        const elevenRes = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenApiKey
          },
          body: elevenForm
        });

        const elevenData = await elevenRes.json();
        if (elevenRes.ok && elevenData?.voice_id) {
          clonedVoiceId = elevenData.voice_id;
          cloningEngine = 'ElevenLabs';
          cloningMessage = `Voice successfully cloned with ElevenLabs! Voice ID: ${clonedVoiceId}`;
        } else {
          const errDetail = elevenData?.detail?.message || elevenData?.detail?.status || elevenData?.message;
          console.warn('ElevenLabs clone notice:', errDetail);
          if (elevenData?.detail?.status === 'missing_permissions') {
            cloningMessage = 'Audio saved. Note: ElevenLabs API key needs "voices_write" permission to clone automatically.';
          } else if (elevenData?.detail?.status === 'payment_required') {
            cloningMessage = 'Audio saved. Note: ElevenLabs cloning requires a paid tier; pre-made voice will be used.';
          } else {
            cloningMessage = `Audio saved. ElevenLabs response: ${errDetail || 'Clone not created'}`;
          }
        }
      } catch (elevenErr) {
        console.warn('ElevenLabs API request failed:', elevenErr);
      }
    }

    // 4. Also register with Voicebox Voice Server if running
    const voiceServerUrl = process.env.VOICE_SERVER_URL || 'http://localhost:8000';
    const voiceServerSecret = process.env.VOICE_SERVER_SECRET || 'smriti-dev-secret-2025';
    if (voiceServerUrl) {
      try {
        const xttsForm = new FormData();
        xttsForm.append('speaker_id', personaId);
        xttsForm.append('speaker_wav', new Blob([buffer], { type: 'audio/wav' }), safeFilename);

        const xttsRes = await fetch(`${voiceServerUrl}/register-speaker`, {
          method: 'POST',
          headers: {
            'x-secret': voiceServerSecret
          },
          body: xttsForm
        });

        if (xttsRes.ok) {
          if (!clonedVoiceId) {
            cloningEngine = 'XTTS-v2';
            cloningMessage = 'Audio saved and registered with XTTS-v2 voice server.';
          }
        }
      } catch (xttsErr) {
        // Voice server not reachable locally
      }
    }

    return NextResponse.json({
      ok: true,
      audioUrl: publicAudioUrl,
      voiceId: clonedVoiceId,
      cloningEngine,
      cloningMessage
    });

  } catch (error: any) {
    console.error('Upload Voice Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to upload and process voice recording' },
      { status: 500 }
    );
  }
}
