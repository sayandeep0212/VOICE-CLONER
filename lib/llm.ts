import { GoogleGenerativeAI } from '@google/generative-ai';
import { Persona } from './types';

const apiKey = process.env.GEMINI_API_KEY || '';
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

/**
 * Generate persona response using Gemini or intelligent simulation fallback
 */
export async function generatePersonaReply(
  systemPrompt: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  persona?: Persona,
  memories: string[] = []
): Promise<string> {
  if (genAI && apiKey) {
    try {
      // Try gemini-1.5-flash or gemini-2.0-flash
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150, // enforce 1-3 sentences brevity
        }
      });

      const historyFormatted = conversationHistory.slice(-6).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const chat = model.startChat({
        history: historyFormatted
      });

      const result = await chat.sendMessage(userMessage);
      const text = result.response.text();
      if (text && text.trim()) {
        return text.trim();
      }
    } catch (error) {
      console.warn("Gemini chat API error, switching to intelligent fallback generator:", error);
    }
  }

  // High quality offline demo persona response engine
  return generateOfflineSimulation(userMessage, persona, memories);
}

/**
 * Realistic offline simulation that respects persona rules & retrieved memories
 */
function generateOfflineSimulation(
  userMessage: string,
  persona?: Persona,
  memories: string[] = []
): string {
  const name = persona?.name || 'Grandpa';
  const nickname = persona?.nicknames?.[0] || 'my dear';
  const phrase = persona?.favorite_phrases?.[0] || 'Take care of yourself';
  const lowerMsg = userMessage.toLowerCase();

  // If memory was retrieved, reference it naturally
  if (memories.length > 0) {
    const memory = memories[0];
    if (lowerMsg.includes('remember') || lowerMsg.includes('story') || lowerMsg.includes('tell me') || lowerMsg.includes('tea') || lowerMsg.includes('chess') || lowerMsg.includes('radio')) {
      return `Ah ${nickname}, I remember it so fondly. ${memory}. ${phrase}.`;
    }
    return `Hearing your voice warms my heart, ${nickname}. Remembering that time: "${memory}" makes me smile. How has your day been?`;
  }

  // Questions about unfamiliar events
  if (lowerMsg.includes('where is the') || lowerMsg.includes('what happened to my') || lowerMsg.includes('did you know about')) {
    return `My memory is a little hazy on that, ${nickname}. But I remember our happy days together so clearly. Are you eating well today?`;
  }

  // Greetings and everyday talk
  if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('morning') || lowerMsg.includes('evening')) {
    return `Hello ${nickname}! It is so good to hear your voice. I hope you're taking good care of yourself today.`;
  }

  if (lowerMsg.includes('miss you') || lowerMsg.includes('lonely') || lowerMsg.includes('sad')) {
    return `I know it gets quiet, ${nickname}. Remember that the love we shared is always with you in your heart. Please do call someone in the family today too.`;
  }

  // Default warm 1-2 sentence comforting reply
  return `It brings me such peace to talk with you, ${nickname}. Always remember how much you mean to us all. ${phrase}.`;
}
