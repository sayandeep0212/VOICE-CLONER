import { supabase, isSupabaseConfigured } from './supabase';
import { Persona, Memory, Message, Session } from './types';
import { getEmbedding } from './embeddings';

// Default starter persona for immediate demo evaluation
export const DEFAULT_PERSONA: Persona = {
  id: "demo-persona-ramesh-1",
  guardian_id: "guardian-demo-user",
  name: "Ramesh Mukherjee (Dadu)",
  relationship: "Grandfather",
  nicknames: ["Khoka", "Shonamoni"],
  speaking_style: "warm, gentle, short sentences, fond memories",
  favorite_phrases: [
    "Always drink your morning tea warm",
    "Family is life's biggest blessing",
    "Keep smiling, Khoka"
  ],
  voice_sample_path: "/samples/grandpa-voice.wav",
  voice_id: "JBFqnCBsd6RMkjVDRZzb",
  consent_confirmed: true,
  consent_at: new Date().toISOString(),
  created_at: new Date().toISOString()
};

export const DEFAULT_MEMORIES: Memory[] = [
  {
    id: "mem-1",
    persona_id: "demo-persona-ramesh-1",
    content: "Every winter morning at 7 AM in Darjeeling, we would sit on the veranda wrapped in woolen shawls sipping hot spiced ginger tea.",
    category: "Morning Routines",
    created_at: new Date().toISOString()
  },
  {
    id: "mem-2",
    persona_id: "demo-persona-ramesh-1",
    content: "During summer afternoons, we spent hours on the porch playing chess while listening to old songs on the Philips valve radio.",
    category: "Childhood Games",
    created_at: new Date().toISOString()
  },
  {
    id: "mem-3",
    persona_id: "demo-persona-ramesh-1",
    content: "Whenever you came home from school, I always saved two sweet rasgullas in the earthen clay pot just for you.",
    category: "Family Traditions",
    created_at: new Date().toISOString()
  },
  {
    id: "mem-4",
    persona_id: "demo-persona-ramesh-1",
    content: "We planted the mango sapling together in the backyard when you were seven years old, watering it together every Sunday morning.",
    category: "Special Moments",
    created_at: new Date().toISOString()
  }
];

const LOCAL_STORAGE_KEYS = {
  PERSONA: 'smriti_persona',
  MEMORIES: 'smriti_memories',
  MESSAGES: 'smriti_messages',
  SESSIONS: 'smriti_sessions',
  SETTINGS: 'smriti_settings'
};

/**
 * Storage adapter handling both Supabase and LocalStorage
 */
export const StorageManager = {
  // --- PERSONA ---
  async getPersona(): Promise<Persona | null> {
    if (typeof window === 'undefined') return DEFAULT_PERSONA;

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('personas')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data && !error) return data as Persona;
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PERSONA);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved persona", e);
      }
    }

    // Initialize with default demo persona
    localStorage.setItem(LOCAL_STORAGE_KEYS.PERSONA, JSON.stringify(DEFAULT_PERSONA));
    return DEFAULT_PERSONA;
  },

  async savePersona(persona: Persona): Promise<Persona> {
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_STORAGE_KEYS.PERSONA, JSON.stringify(persona));
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('personas').upsert(persona);
    }

    return persona;
  },

  // --- MEMORIES ---
  async getMemories(personaId?: string): Promise<Memory[]> {
    if (typeof window === 'undefined') return DEFAULT_MEMORIES;

    if (isSupabaseConfigured && supabase && personaId) {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('persona_id', personaId);

      if (data && !error && data.length > 0) return data as Memory[];
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.MEMORIES);
    if (saved) {
      try {
        const mems: Memory[] = JSON.parse(saved);
        if (mems.length > 0) return mems;
      } catch (e) {
        console.error("Failed to parse memories", e);
      }
    }

    // Initialize default memories
    localStorage.setItem(LOCAL_STORAGE_KEYS.MEMORIES, JSON.stringify(DEFAULT_MEMORIES));
    return DEFAULT_MEMORIES;
  },

  async addMemory(content: string, personaId: string, category: string = 'general'): Promise<Memory> {
    const embedding = await getEmbedding(content);
    const newMemory: Memory = {
      id: "mem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
      persona_id: personaId,
      content,
      category,
      embedding,
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('memories').insert(newMemory);
    }

    if (typeof window !== 'undefined') {
      const existing = await this.getMemories(personaId);
      const updated = [newMemory, ...existing];
      localStorage.setItem(LOCAL_STORAGE_KEYS.MEMORIES, JSON.stringify(updated));
    }

    return newMemory;
  },

  async deleteMemory(memoryId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('memories').delete().eq('id', memoryId);
    }
    if (typeof window !== 'undefined') {
      const existing = await this.getMemories();
      const filtered = existing.filter(m => m.id !== memoryId);
      localStorage.setItem(LOCAL_STORAGE_KEYS.MEMORIES, JSON.stringify(filtered));
    }
  },

  // --- MESSAGES ---
  async getMessages(personaId?: string): Promise<Message[]> {
    if (typeof window === 'undefined') return [];

    if (isSupabaseConfigured && supabase && personaId) {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('persona_id', personaId)
        .order('created_at', { ascending: true });

      if (data) return data as Message[];
    }

    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.MESSAGES);
    return saved ? JSON.parse(saved) : [];
  },

  async saveMessage(msg: Omit<Message, 'id' | 'created_at'>): Promise<Message> {
    const fullMsg: Message = {
      ...msg,
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      created_at: new Date().toISOString()
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('messages').insert(fullMsg);
    }

    if (typeof window !== 'undefined') {
      const existing = await this.getMessages(msg.persona_id);
      const updated = [...existing, fullMsg];
      localStorage.setItem(LOCAL_STORAGE_KEYS.MESSAGES, JSON.stringify(updated));
    }

    return fullMsg;
  },

  // --- DELETE ALL DATA (PRD F19 & SAFETY) ---
  async deleteAllData(): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      // Cascading deletion via Postgres foreign keys
      await supabase.from('personas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.PERSONA);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.MEMORIES);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.MESSAGES);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSIONS);
    }
  }
};
