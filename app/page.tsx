import Link from "next/link";
import { Mic, ShieldCheck, Heart, Sparkles, BookOpen, Volume2, ArrowRight, Lock, CheckCircle2, AlertTriangle, Users } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col justify-between">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-800/60">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-sky-600/20 via-indigo-600/15 to-amber-500/10 blur-[120px] pointer-events-none rounded-full" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs sm:text-sm font-medium mb-6 animate-pulse">
            <Heart className="w-4 h-4 text-sky-400 fill-sky-400/30" />
            <span>Non-Commercial Student Project • Built for Comfort & Remembrance</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6">
            A Voice Memory Companion for{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-indigo-200 to-amber-300">
              Grieving Elders
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-300 mb-10 leading-relaxed font-normal">
            Smriti (स्मृति) lets older adults hold warm, natural voice conversations with an AI simulation of a lost loved one,
            grounded strictly in real family memories and safeguarded by strict ethical, transparency, and crisis protocols.
          </p>

          {/* Quick CTA row */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/talk"
              id="hero-talk-cta"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-lg shadow-xl shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Mic className="w-6 h-6 animate-pulse" />
              <span>Open Elder Talk Screen</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </Link>

            <Link
              href="/voice-cloner"
              id="hero-voice-cloner-cta"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white font-semibold text-base shadow-lg shadow-indigo-500/25 border border-indigo-400/30 transition-all transform hover:-translate-y-0.5"
            >
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
              <span>Voicebox Voice Cloner</span>
            </Link>

            <Link
              href="/onboarding"
              id="hero-onboarding-cta"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-100 font-semibold text-base border border-slate-700 hover:border-slate-600 transition-all"
            >
              <Users className="w-5 h-5 text-amber-400" />
              <span>Guardian Setup Flow</span>
            </Link>

            <Link
              href="/test-suite"
              id="hero-test-cta"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold text-base border border-indigo-700/50 hover:border-indigo-600 transition-all"
            >
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>Professor PRD Tests</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature & Persona Architecture Grid */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3">
            Core Pillars of the Smriti System
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Engineered precisely according to PRD, Architecture, and Safety & Ethics specifications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Pillar 1: Elder-First Voice Experience */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-7 hover:border-sky-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-6">
                <Mic className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Elder-First Accessible UI</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Designed for low tech comfort. High-contrast display, minimum 20px base font size with A- / A+ scaling,
                single Push-to-Talk button, and real-time live captions.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Web Speech API Speech-to-Text</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Permanent &ldquo;AI Simulation&rdquo; Banner</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>20-Minute Healthy Session Cap Warning</span>
                </li>
              </ul>
            </div>
            <Link
              href="/talk"
              className="text-sky-400 hover:text-sky-300 font-semibold text-sm inline-flex items-center gap-1.5"
            >
              <span>Test the Elder Talk UI</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pillar 2: Memory Grounding & Voice Cloning */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-7 hover:border-amber-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                <Volume2 className="w-6 h-6 text-amber-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">RAG Memory & Voice Cloning</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Persona replies only reference real memories stored in the vector database. Zero hallucination rule
                guarantees the AI warmly admits when it does not recall an event.
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>pgvector Cosine Similarity Search</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ElevenLabs & Coqui XTTS Voice Synthesis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Concise 1-3 Sentence Latency Target</span>
                </li>
              </ul>
            </div>
            <Link
              href="/onboarding"
              className="text-amber-400 hover:text-amber-300 font-semibold text-sm inline-flex items-center gap-1.5"
            >
              <span>Manage Memories & Persona</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pillar 3: Safety, Ethics & Privacy */}
          <div className="rounded-3xl bg-slate-900/70 border border-slate-800 p-7 hover:border-rose-500/40 transition-all shadow-lg flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Ethical Safeguards & Crisis</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Strict consent gate before any voice sample upload. Immediate crisis intervention halts the persona and displays
                verified 24/7 helplines (Tele-MANAS 14416 / KIRAN 1800-599-0019).
              </p>
              <ul className="space-y-2 text-xs text-slate-300 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Legal & Estate Consent Checklist</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No Medical, Legal, or Financial Advice</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>One-Click &ldquo;Delete Everything&rdquo; Purge</span>
                </li>
              </ul>
            </div>
            <Link
              href="/dashboard"
              className="text-rose-400 hover:text-rose-300 font-semibold text-sm inline-flex items-center gap-1.5"
            >
              <span>View Safety Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Live Active Persona Card Preview */}
        <div className="mt-12 rounded-3xl bg-gradient-to-r from-slate-900 via-[#0E1527] to-slate-900 border border-slate-800 p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl">
                👴
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h4 className="text-xl font-bold text-white">Ramesh Mukherjee (Dadu)</h4>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    Active Demo Persona
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                  Relationship: <span className="text-slate-200">Grandfather</span> • Style: <span className="text-slate-200">Warm, gentle, short sentences</span> • Nicknames: <span className="text-slate-200">&ldquo;Khoka&rdquo;, &ldquo;Shonamoni&rdquo;</span>
                </p>
                <p className="text-xs text-slate-400 mt-1.5">
                  4 real memories indexed in pgvector memory store (Darjeeling morning chai, porch chess, clay pot rasgulla, mango tree).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                href="/talk"
                id="btn-speak-now-dadu"
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm shadow-md shadow-sky-500/20 transition-all flex items-center gap-2"
              >
                <Mic className="w-4 h-4" />
                <span>Speak with Dadu Now</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
