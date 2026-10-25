import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { DEFAULT_PERSONA } from '@/lib/storage';
import { Persona } from '@/lib/types';

export async function GET() {
  try {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        return NextResponse.json({ persona: data });
      }
    }
    return NextResponse.json({ persona: DEFAULT_PERSONA });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      relationship,
      nicknames = [],
      speaking_style,
      favorite_phrases = [],
      voice_sample_path,
      voice_sample_url,
      voice_id,
      consent_confirmed
    } = body;

    // F2: Mandatory Consent Enforcement
    if (!consent_confirmed) {
      return NextResponse.json(
        { error: 'Cannot create persona without confirmed ethical consent.' },
        { status: 403 }
      );
    }

    if (!name || !relationship) {
      return NextResponse.json(
        { error: 'Name and relationship are required.' },
        { status: 400 }
      );
    }

    const persona: Persona = {
      id: body.id || "persona-" + Date.now(),
      guardian_id: body.guardian_id || "guardian-local",
      name,
      relationship,
      nicknames: Array.isArray(nicknames) ? nicknames : [nicknames],
      speaking_style: speaking_style || 'warm, gentle, short sentences',
      favorite_phrases: Array.isArray(favorite_phrases) ? favorite_phrases : [favorite_phrases],
      voice_sample_path: voice_sample_path || null,
      voice_sample_url: voice_sample_url || voice_sample_path || null,
      voice_id: voice_id || null,
      consent_confirmed: true,
      consent_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('personas')
        .upsert(persona)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ persona: data });
    }

    return NextResponse.json({ persona });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save persona' }, { status: 500 });
  }
}
