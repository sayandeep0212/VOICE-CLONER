import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getEmbedding } from '@/lib/embeddings';
import { DEFAULT_MEMORIES } from '@/lib/storage';
import { Memory } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personaId = searchParams.get('personaId');

    if (isSupabaseConfigured && supabase && personaId) {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('persona_id', personaId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        return NextResponse.json({ memories: data });
      }
    }

    return NextResponse.json({ memories: DEFAULT_MEMORIES });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, personaId, category = 'Stories' } = await req.json();

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Memory content cannot be empty' }, { status: 400 });
    }

    // Generate 768-dim embedding for pgvector RAG
    const embedding = await getEmbedding(content);

    const memory: Memory = {
      id: "mem-" + Date.now(),
      persona_id: personaId || "demo-persona-ramesh-1",
      content,
      category,
      embedding,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('memories')
        .insert(memory)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ memory: data });
    }

    return NextResponse.json({ memory });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to save memory' }, { status: 500 });
  }
}
