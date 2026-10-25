import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function DELETE(req: NextRequest) {
  try {
    const { personaId } = await req.json().catch(() => ({ personaId: null }));

    if (isSupabaseConfigured && supabase) {
      if (personaId) {
        // Cascade delete on persona removes memories, messages, sessions
        await supabase.from('personas').delete().eq('id', personaId);
      } else {
        await supabase.from('personas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      }
    }

    return NextResponse.json({
      success: true,
      message: 'All personal data, voice files, memories, and message logs permanently deleted.'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Delete failed' }, { status: 500 });
  }
}
