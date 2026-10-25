export interface Persona {
  id: string;
  guardian_id: string;
  name: string;
  relationship: string;
  nicknames: string[];
  speaking_style: string;
  favorite_phrases: string[];
  voice_sample_path?: string;
  voice_sample_url?: string;
  voice_id?: string;
  consent_confirmed: boolean;
  consent_at?: string;
  created_at: string;
}

export interface Memory {
  id: string;
  persona_id: string;
  content: string;
  category?: string;
  embedding?: number[];
  similarity?: number;
  created_at: string;
}

export interface Message {
  id: string;
  persona_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  flagged_crisis?: boolean;
  audio_url?: string;
  created_at: string;
}

export interface Session {
  id: string;
  persona_id: string;
  started_at: string;
  ended_at?: string;
  duration_seconds: number;
}

export interface HelplineInfo {
  country: string;
  helplineName: string;
  numbers: string[];
  availableHours: string;
  notes: string;
}

export interface SafetyCheckResult {
  isCrisis: boolean;
  reason?: string;
  confidence: number;
  helplineInfo?: HelplineInfo;
}

export interface ChatRequest {
  personaId: string;
  message: string;
  conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  reply: string;
  isCrisis: boolean;
  flaggedCrisis?: boolean;
  helplineInfo?: HelplineInfo;
  retrievedMemories?: string[];
  audioBase64?: string;
  notice?: string;
}
