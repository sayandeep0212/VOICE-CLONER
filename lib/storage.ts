import { supabase, isSupabaseConfigured } from './supabase';
import { Persona, Memory, Message, Session } from './types';
import { getEmbedding } from './embeddings';

// Default starter persona for immediate demo evaluation
export const DEFAULT_PERSONA: Persona = {
  id: "256880e3-c732-43a0-ba79-4f7e6f8182a4",
  guardian_id: "256880e3-c732-43a0-ba79-4f7e6f8182a4",
  name: "Debadrita",
  relationship: "biwi",
  nicknames: ["Shona", "Debu"],
  speaking_style: "warm, comforting, loving, gentle",
  favorite_phrases: [
    "Amar shona",
    "Kemon aacho tumi?",
    "Shob shomoy mone rekho"
  ],
  voice_sample_path: "/uploads/voices/voicebox-1792950870874-xxld9.wav",
  voice_sample_url: "/uploads/voices/voicebox-1792950870874-xxld9.wav",
  voice_id: "voicebox-1792950870874-xxld9",
  consent_confirmed: true,
  consent_at: new Date().toISOString(),
  created_at: new Date().toISOString()
};

export const DEFAULT_MEMORIES: Memory[] = [
  {
    id: "8a2c7181-9efa-4052-9d86-67b42e5ae7e2",
    persona_id: "256880e3-c732-43a0-ba79-4f7e6f8182a4",
    content: "We used to sit on the veranda drinking warm tea together every winter morning in Darjeeling.",
    category: "Daily Routines",
    created_at: new Date().toISOString()
  },
  {
    id: "mem-2",
    persona_id: "256880e3-c732-43a0-ba79-4f7e6f8182a4",
    content: "Every evening we talked about our days, cooking together and sharing small peaceful moments.",
    category: "Family Traditions",
    created_at: new Date().toISOString()
  },
  {
    id: "mem-3",
    persona_id: "256880e3-c732-43a0-ba79-4f7e6f8182a4",
    content: "Whenever you felt tired, I would remind you: Amar shona, shob theek hoye jaabe, don't worry.",
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
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/persona');
        if (res.ok) {
          const json = await res.json();
          if (json?.persona) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.PERSONA, JSON.stringify(json.persona));
            return json.persona as Persona;
          }
        }
      } catch (e) {
        console.warn("Could not fetch persona from server API:", e);
      }

      const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PERSONA);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error("Failed to parse saved persona", e);
        }
      }
    }

    return DEFAULT_PERSONA;
  },

  async savePersona(persona: Persona): Promise<Persona> {
    let savedPersona = persona;
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/persona', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(persona)
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.persona) {
            savedPersona = json.persona;
          }
        }
      } catch (err) {
        console.warn('Sync persona to server API notice:', err);
      }
      localStorage.setItem(LOCAL_STORAGE_KEYS.PERSONA, JSON.stringify(savedPersona));
    }

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('personas').upsert(savedPersona);
      } catch (e) {
        // Handled server-side by /api/persona with service role
      }
    }

    return savedPersona;
  },

  // --- MEMORIES ---
  async getMemories(personaId?: string): Promise<Memory[]> {
    if (typeof window !== 'undefined') {
      try {
        const url = personaId ? `/api/memories?personaId=${encodeURIComponent(personaId)}` : '/api/memories';
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json?.memories && json.memories.length > 0) {
            localStorage.setItem(LOCAL_STORAGE_KEYS.MEMORIES, JSON.stringify(json.memories));
            return json.memories as Memory[];
          }
        }
      } catch (e) {
        console.warn("Could not fetch memories from server API:", e);
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
    }

    return DEFAULT_MEMORIES;
  },

  async addMemory(content: string, personaId: string, category: string = 'general'): Promise<Memory> {
    let newMemory: Memory | null = null;
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/memories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, personaId, category })
        });
        if (res.ok) {
          const json = await res.json();
          if (json?.memory) {
            newMemory = json.memory;
          }
        }
      } catch (e) {
        console.warn("Could not add memory via server API:", e);
      }
    }

    if (!newMemory) {
      newMemory = {
        id: "mem-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
        persona_id: personaId,
        content,
        category,
        embedding: undefined,
        created_at: new Date().toISOString()
      };
    }

    if (typeof window !== 'undefined') {
      const existing = await this.getMemories(personaId);
      const updated = [newMemory, ...existing.filter(m => m.id !== newMemory!.id)];
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
    if (typeof window !== 'undefined') {
      try {
        await fetch('/api/delete-all', { method: 'DELETE' });
      } catch (e) {
        console.warn('Delete all data API notice:', e);
      }
      localStorage.removeItem(LOCAL_STORAGE_KEYS.PERSONA);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.MEMORIES);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.MESSAGES);
      localStorage.removeItem(LOCAL_STORAGE_KEYS.SESSIONS);
    }
  }
};
