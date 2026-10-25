# Architecture

## 1. System Diagram

```
┌────────────────────────── Browser (Next.js on Vercel) ──────────────────────────┐
│  Elder UI: [Hold to Talk]  →  Web Speech API  →  text                            │
└───────────────┬──────────────────────────────────────────────▲───────────────────┘
                │ POST /api/chat                               │ audio (wav/mp3)
                ▼                                              │
┌──────────── Next.js API Routes ────────────┐        ┌────────┴──────────────┐
│ 1. Safety check (crisis keywords + LLM)    │        │ Python FastAPI server │
│ 2. Embed message → pgvector search         │──text─▶│ XTTS-v2 (Colab/laptop)│
│ 3. Build persona prompt + memories + chat  │        └───────────────────────┘
│ 4. Call LLM (Gemini/Groq) → reply text     │
└───────┬───────────────────────┬────────────┘
        ▼                       ▼
   Supabase (Auth,          LLM provider
   Postgres+pgvector,       (free tier)
   Storage)
        ▲
        └── optional: Upstash Redis for recent chat context
```

## 2. Conversation Flow

1. Elder holds the button and speaks. The Web Speech API returns text.
2. Frontend sends `{ personaId, message }` to `/api/chat`.
3. **Safety pre-check:** if the message shows crisis signals, skip the persona and return a supportive response with helpline info.
4. Embed the message and query pgvector for the top 3-5 memories.
5. Build the prompt: persona rules, retrieved memories, last ~10 turns.
6. LLM returns a short reply (target 1-3 sentences for speed).
7. Frontend sends the reply to `/api/tts`, which forwards it to the Python server with the stored voice sample.
8. Audio plays while captions show.
9. The turn is saved to `messages`.

## 3. Database Schema (Supabase / Postgres)

```sql
create extension if not exists vector;

-- Personas (the lost person)
create table personas (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references auth.users not null,
  name text not null,
  relationship text not null,          -- e.g. "husband", "mother"
  nicknames text[],
  speaking_style text,                 -- e.g. "warm, teasing, short sentences"
  favorite_phrases text[],
  voice_sample_path text,              -- path in private storage bucket
  consent_confirmed boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz default now()
);

-- Memories (RAG chunks)
create table memories (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas on delete cascade,
  content text not null,
  embedding vector(768),               -- match your embedding model's dimension
  created_at timestamptz default now()
);

create index on memories using hnsw (embedding vector_cosine_ops);

-- Chat history
create table messages (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  flagged_crisis boolean default false,
  created_at timestamptz default now()
);

-- Session tracking (for limits)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Row Level Security
alter table personas enable row level security;
alter table memories enable row level security;
alter table messages enable row level security;
alter table sessions enable row level security;

create policy "own personas" on personas
  for all using (guardian_id = auth.uid());

create policy "own memories" on memories
  for all using (persona_id in (select id from personas where guardian_id = auth.uid()));

create policy "own messages" on messages
  for all using (persona_id in (select id from personas where guardian_id = auth.uid()));

create policy "own sessions" on sessions
  for all using (persona_id in (select id from personas where guardian_id = auth.uid()));
```

Memory search function:

```sql
create or replace function match_memories(
  query_embedding vector(768),
  p_persona_id uuid,
  match_count int default 4
)
returns table (id uuid, content text, similarity float)
language sql stable as $$
  select id, content, 1 - (embedding <=> query_embedding) as similarity
  from memories
  where persona_id = p_persona_id
  order by embedding <=> query_embedding
  limit match_count;
$$;
```

## 4. Persona System Prompt (Template)

```
You are an AI simulation of {name}, the {relationship} of the person you are talking to.
You speak in {speaking_style}. You sometimes use these phrases: {favorite_phrases}.
You may call the user by these names: {nicknames}.

RULES:
- You are an AI simulation, not the real person. If asked, say so gently and honestly.
- Only reference events found in the MEMORIES below. If you don't remember something, say so warmly. Never invent important facts.
- Never give medical, legal, or financial advice. Encourage speaking to a professional or family.
- Keep replies short (1-3 sentences), warm, and simple.
- Gently encourage the user to spend time with family and friends.
- If the user seems in crisis, stop role-playing and follow the safety protocol.

MEMORIES:
{retrieved_memories}
```

## 5. API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/chat` | POST | Safety check, RAG, LLM, returns reply text |
| `/api/tts` | POST | Sends text to the voice server, returns audio |
| `/api/persona` | POST | Create persona (requires consent flag) |
| `/api/memories` | POST | Add memory, generate embedding, store |
| `/api/delete-all` | DELETE | Remove voice files, memories, messages, persona |

## 6. Python Voice Server (outline)

```python
# voice-server/main.py
from fastapi import FastAPI, Header, HTTPException, UploadFile, Form
from fastapi.responses import Response
from TTS.api import TTS
import tempfile, os

app = FastAPI()
tts = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to("cuda")  # "cpu" on laptop
SECRET = os.environ["VOICE_SERVER_SECRET"]

@app.post("/speak")
async def speak(
    text: str = Form(...),
    language: str = Form("en"),
    speaker_wav: UploadFile = None,
    x_secret: str = Header(None),
):
    if x_secret != SECRET:
        raise HTTPException(401)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as ref:
        ref.write(await speaker_wav.read())
    out = tempfile.mktemp(suffix=".wav")
    tts.tts_to_file(text=text, speaker_wav=ref.name, language=language, file_path=out)
    return Response(open(out, "rb").read(), media_type="audio/wav")
```

Check the XTTS-v2 docs for supported languages and current install steps.

## 7. Security

- Voice samples in a **private** bucket, accessed only via signed URLs or server-side.
- RLS on every table.
- Voice server protected by a shared secret header.
- Never expose service-role keys to the browser.
- "Delete everything" removes storage files and cascades through the DB.
- No conversation data used for model training (check the provider's free-tier terms).

## 8. Performance Notes

- Keep replies to 1-3 sentences to cut TTS time.
- Stream LLM output and start TTS per sentence if time permits.
- Cache the speaker embedding on the voice server instead of re-processing the sample each time.
- Use Redis (or Supabase) to keep recent turns and avoid large DB reads.

## 9. Fallbacks

| Failure | Behavior |
|---|---|
| Voice server offline | Show text reply with a small notice |
| Mic denied or unsupported | Show text input |
| LLM rate limit | Friendly "please wait a moment" message |
