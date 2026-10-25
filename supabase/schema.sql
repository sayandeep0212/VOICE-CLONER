-- Smriti: Supabase Postgres Schema with pgvector
-- Run this script in the Supabase SQL Editor

-- 1. Enable Vector Extension
create extension if not exists vector;

-- 2. Personas Table (the remembered loved one)
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references auth.users not null,
  name text not null,
  relationship text not null,          -- e.g. "husband", "mother", "grandfather"
  nicknames text[] default '{}',
  speaking_style text default 'warm, gentle, short sentences',
  favorite_phrases text[] default '{}',
  voice_sample_path text,              -- path in private storage bucket
  consent_confirmed boolean not null default false,
  consent_at timestamptz,
  created_at timestamptz default now()
);

-- 3. Memories Table (RAG chunks)
create table if not exists memories (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas on delete cascade,
  content text not null,
  category text default 'general',     -- e.g. "stories", "family", "routines", "childhood"
  embedding vector(768),               -- Gemini text-embedding-004 dimension is 768
  created_at timestamptz default now()
);

-- Cosine similarity HNSW index for fast vector search
create index if not exists memories_embedding_idx on memories using hnsw (embedding vector_cosine_ops);

-- 4. Messages Table (Chat history & safety telemetry)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas on delete cascade,
  role text check (role in ('user','assistant','system')),
  content text not null,
  audio_url text,
  flagged_crisis boolean default false,
  created_at timestamptz default now()
);

-- 5. Sessions Table (for 20-min healthy dependency limits)
create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid references personas on delete cascade,
  started_at timestamptz default now(),
  ended_at timestamptz,
  duration_seconds int default 0
);

-- 6. Row Level Security (RLS)
alter table personas enable row level security;
alter table memories enable row level security;
alter table messages enable row level security;
alter table sessions enable row level security;

-- Policies for Authenticated Guardians
create policy "own personas" on personas
  for all using (guardian_id = auth.uid());

create policy "own memories" on memories
  for all using (persona_id in (select id from personas where guardian_id = auth.uid()));

create policy "own messages" on messages
  for all using (persona_id in (select id from personas where guardian_id = auth.uid()));

create policy "own sessions" on sessions
  for all using (persona_id in (select id from personas where guardian_id = auth.uid()));

-- 7. Memory RAG Match Function
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
