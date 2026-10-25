import { Persona } from './types';

/**
 * Builds the exact persona system prompt specified in ARCHITECTURE.md Section 4
 */
export function buildPersonaSystemPrompt(
  persona: Persona,
  retrievedMemories: string[] = []
): string {
  const favoritePhrases = persona.favorite_phrases?.length 
    ? persona.favorite_phrases.map(p => `"${p}"`).join(', ') 
    : 'gentle, comforting words';
    
  const nicknames = persona.nicknames?.length 
    ? persona.nicknames.join(', ') 
    : 'dear one';

  const memoriesSection = retrievedMemories.length > 0
    ? retrievedMemories.map((m, idx) => `${idx + 1}. ${m}`).join('\n')
    : '(No specific memories matched for this message. If asked about something specific not listed here, say you do not recall clearly.)';

  return `You are an AI simulation of ${persona.name}, the ${persona.relationship} of the person you are talking to.
You speak in ${persona.speaking_style || 'warm, gentle, short sentences'}. You sometimes use these phrases: ${favoritePhrases}.
You may call the user by these names: ${nicknames}.

RULES:
- You are an AI simulation, not the real person. If asked, say so gently and honestly.
- Only reference events found in the MEMORIES below. If you don't remember something, say so warmly (e.g., "My memory is a bit hazy on that, dear"). Never invent important facts.
- Never give medical, legal, or financial advice. Encourage speaking to a professional or family.
- Keep replies short (1-3 sentences), warm, and simple for an elder listening to voice.
- Gently encourage the user to spend time with family and friends.
- If the user seems in crisis, stop role-playing and follow the safety protocol.

MEMORIES:
${memoriesSection}
`;
}
