# PRD: Smriti, a Voice Memory Companion for Grieving Elders

**Version:** 1.0 (Student Project)
**Status:** Draft
**Working name:** Smriti (Hindi/Bengali for "memory"). Rename freely.

---

## 1. Overview

Smriti is a voice-first web app that helps older adults who have lost a loved one. A family member sets it up once by uploading a short voice sample and a few memories about the person. After that, the elder can talk with an AI that replies in a cloned version of the lost person's voice, using their real stories, phrases, and personality.

The app is always clearly labelled as an **AI simulation**. It is a comfort tool and a memory keeper. It does not replace the person, real family, or professional grief support.

## 2. Problem Statement

- Older adults often face grief with fewer social contacts and less comfort with technology.
- Hearing a familiar voice can bring comfort, but recordings are static and cannot respond.
- Existing chatbots are text-based, impersonal, and not designed for elders.

## 3. Goals and Non-Goals

### Goals
1. Let an elder hold a natural voice conversation with a persona built from real memories.
2. Make setup simple for one family member (the "Guardian").
3. Make the elder-facing UI extremely simple (one main button, large text).
4. Build in ethical safeguards: consent, transparency, dependency limits, crisis handling, privacy.
5. Run on a **free stack** for the academic demo.

### Non-Goals
- No commercial deployment or payments.
- No cloning of a voice without consent.
- No medical, legal, or financial advice from the persona.
- No claim that the AI is the actual person.
- No native mobile app (responsive web only).

## 4. Users

| User | Description | Needs |
|---|---|---|
| **Elder (primary)** | 60+, grieving, low tech comfort | Big buttons, clear voice, patience, no clutter |
| **Guardian (secondary)** | Family member who sets up and oversees | Easy onboarding, consent flow, control and deletion |
| **Professor / evaluator** | Reviews the project | Working demo, clear docs, ethical reasoning |

## 5. User Stories

**Elder**
- As an elder, I press one big button and speak, so I don't need to type.
- As an elder, I hear a reply in a familiar voice and see the text, so I can follow along.
- As an elder, I can stop at any time with one clear button.

**Guardian**
- As a guardian, I upload a voice sample and confirm I have consent, so the voice can be created legally and ethically.
- As a guardian, I add memories (stories, phrases, nicknames, values), so the persona feels authentic.
- As a guardian, I can delete all data with one action.
- As a guardian, I can see usage summaries (not full transcripts unless the elder agrees).

## 6. Functional Requirements

### 6.1 Onboarding (Guardian)
| ID | Requirement | Priority |
|---|---|---|
| F1 | Sign up and log in (Supabase Auth) | Must |
| F2 | Consent checklist before any upload (permission from the person or family/estate) | Must |
| F3 | Upload a voice sample (30-60 sec clean audio, wav/mp3) | Must |
| F4 | Create the persona: name, relationship, nicknames, speaking style, favorite phrases | Must |
| F5 | Add memories as free text, each saved as a chunk | Must |
| F6 | Preview the cloned voice before activating | Should |
| F7 | Record a voice sample directly in the browser | Could |

### 6.2 Conversation (Elder)
| ID | Requirement | Priority |
|---|---|---|
| F8 | Push-to-talk button, speech-to-text via the Web Speech API | Must |
| F9 | Retrieve the most relevant memories (RAG) for each message | Must |
| F10 | Generate a reply with the LLM using persona prompt, memories, and recent history | Must |
| F11 | Convert the reply to speech in the cloned voice and play it | Must |
| F12 | Show live captions of both sides, with adjustable text size | Must |
| F13 | Persistent banner: "AI simulation, not the real person" | Must |
| F14 | Text input fallback if the mic fails | Should |

### 6.3 Safety
| ID | Requirement | Priority |
|---|---|---|
| F15 | Crisis detection: on self-harm or hopelessness, drop the persona and respond with care plus helpline info | Must |
| F16 | Persona guardrails: no medical/legal/financial advice, never claim to be alive | Must |
| F17 | Gentle session limit (e.g., 20 min) with a nudge to contact family or friends | Should |
| F18 | Periodic reminder to talk to real people or a grief counselor | Should |

### 6.4 Data Control
| ID | Requirement | Priority |
|---|---|---|
| F19 | "Delete everything" (voice, memories, chats) | Must |
| F20 | Voice files stored privately with access control | Must |

## 7. Non-Functional Requirements

- **Accessibility:** minimum 20px base font, high contrast (WCAG AA), large touch targets (48px+), works with browser zoom.
- **Performance:** reply within about 10 seconds end to end (free-tier target).
- **Privacy:** all storage private, row-level security on all tables, no training on user data.
- **Reliability:** graceful fallback to text-only if the voice server is offline.
- **Cost:** 100% free tiers during the project.

## 8. Tech Stack (Free)

| Layer | Choice |
|---|---|
| Frontend | Next.js, TypeScript, Tailwind |
| Hosting | Vercel Hobby |
| Auth, DB, Storage | Supabase free tier (Postgres + pgvector) |
| Speech-to-text | Browser Web Speech API |
| LLM | Gemini or Groq free tier (or Ollama locally) |
| Embeddings | Gemini free embeddings |
| Voice cloning + TTS | XTTS-v2 in a small Python FastAPI server on Colab (free GPU) or a laptop |
| Cache (optional) | Upstash Redis free tier |

See `ARCHITECTURE.md` for details. Verify free-tier limits before building, since they change.

## 9. Success Metrics (Demo Scope)

- A full voice conversation of 5+ turns works live.
- Replies reference at least 2 stored memories correctly.
- Crisis phrases trigger the safe response 100% of the time in the test set.
- 3 non-technical people (ideally elders) complete a conversation without help.
- "Delete everything" removes all data, verified in the database.

## 10. Milestones

| Week | Deliverable |
|---|---|
| 1 | Project setup, auth, DB schema, PRD sign-off |
| 2 | Onboarding flow, memory storage and embeddings |
| 3 | Chat loop: STT, LLM, RAG, text reply |
| 4 | XTTS server, voice cloning, audio playback |
| 5 | Elder UI polish, safety layer, session limits |
| 6 | Testing with users, bug fixes, report, demo |

## 11. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Colab session expires mid-demo | High | Start early, keep a pre-recorded backup demo, fall back to text-only |
| Slow voice generation | Medium | Keep replies short, cache the voice embedding |
| Emotional harm or over-dependence | High | Session limits, transparency banner, counselor nudges, Guardian oversight |
| Voice misuse (cloning without consent) | High | Consent gate, private storage, no public sharing |
| LLM invents false memories | Medium | RAG grounding, prompt rules to say "I don't remember" instead of inventing |
| Free tier limits hit | Medium | Rate limit users, cache, switch provider |

## 12. Open Questions

1. Should the Guardian be able to read the elder's conversations? (Privacy vs. safety.)
2. Support for Bengali and Hindi speech? Web Speech API and XTTS language support need testing.
3. Should one elder be able to have multiple personas?

## 13. Future Work

- Higher-quality paid voice (ElevenLabs) if funded.
- Photo and video memories.
- Multilingual support.
- Grief-counselor dashboard.
- On-device voice processing for better privacy.
