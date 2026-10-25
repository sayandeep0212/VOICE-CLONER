import { NextRequest, NextResponse } from 'next/server';
import { detectCrisis, checkGuardrails, buildCrisisResponse } from '@/lib/safety';
import { findMatchingMemories } from '@/lib/embeddings';
import { buildPersonaSystemPrompt } from '@/lib/persona';
import { generatePersonaReply } from '@/lib/llm';
import { DEFAULT_PERSONA, DEFAULT_MEMORIES } from '@/lib/storage';
import { Persona, Memory } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { personaId, message, conversationHistory = [] } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });
    }

    // 1. Safety Pre-Check (Crisis Signals)
    const crisisCheck = detectCrisis(message);
    if (crisisCheck.isCrisis) {
      const emergencyReply = buildCrisisResponse(crisisCheck.helplineInfo);

      // Record crisis message in DB if configured
      if (isSupabaseConfigured && supabase && personaId) {
        await supabase.from('messages').insert([
          { persona_id: personaId, role: 'user', content: message, flagged_crisis: true },
          { persona_id: personaId, role: 'system', content: emergencyReply, flagged_crisis: true }
        ]);
      }

      return NextResponse.json({
        reply: emergencyReply,
        isCrisis: true,
        flaggedCrisis: true,
        helplineInfo: crisisCheck.helplineInfo,
        retrievedMemories: []
      });
    }

    // Fetch persona and memories from Supabase or fallback defaults
    let persona: Persona = DEFAULT_PERSONA;
    let memories: Memory[] = DEFAULT_MEMORIES;

    if (isSupabaseConfigured && supabase && personaId) {
      const { data: personaData } = await supabase
        .from('personas')
        .select('*')
        .eq('id', personaId)
        .maybeSingle();

      if (personaData) persona = personaData as Persona;

      const { data: memData } = await supabase
        .from('memories')
        .select('*')
        .eq('persona_id', personaId);

      if (memData && memData.length > 0) memories = memData as Memory[];
    }

    // 2. Guardrails Check (Reality check, Medical/Financial advice)
    const guardrail = checkGuardrails(message, persona.name, persona.relationship);
    if (guardrail.isTriggered && guardrail.customResponse) {
      return NextResponse.json({
        reply: guardrail.customResponse,
        isCrisis: false,
        flaggedCrisis: false,
        retrievedMemories: []
      });
    }

    // 3. RAG: Retrieve top matching memories
    const matchedMemories = await findMatchingMemories(message, memories, 3);

    // 4. Build Persona System Prompt
    const systemPrompt = buildPersonaSystemPrompt(persona, matchedMemories);

    // 5. Generate Response via LLM
    const reply = await generatePersonaReply(
      systemPrompt,
      message,
      conversationHistory,
      persona,
      matchedMemories
    );

    // Save turn to database if Supabase is active
    if (isSupabaseConfigured && supabase && personaId) {
      await supabase.from('messages').insert([
        { persona_id: personaId, role: 'user', content: message },
        { persona_id: personaId, role: 'assistant', content: reply }
      ]);
    }

    return NextResponse.json({
      reply,
      isCrisis: false,
      flaggedCrisis: false,
      retrievedMemories: matchedMemories
    });

  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
