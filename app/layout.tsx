import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { Heart, ShieldCheck, Settings, Mic, HelpCircle, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "Smriti | Voice Memory Companion for Grieving Elders",
  description: "A voice-first compassionate companion for grieving elders, powered by real family memories, ethical safeguards, and cloned voice technology.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col selection:bg-sky-500 selection:text-white">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 group" id="nav-brand-logo">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-400 p-[2px] shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-[#090E1B] rounded-[14px] flex items-center justify-center">
                  <Heart className="w-5 h-5 text-sky-400 fill-sky-400/20" />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-300 via-white to-amber-200">
                    Smriti
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 border border-slate-700">
                    स्मृति
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Voice Memory Companion for Elders
                </p>
              </div>
            </Link>

            <nav className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/talk"
                id="nav-talk-btn"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-sm font-semibold transition-all shadow-sm shadow-sky-500/10"
              >
                <Mic className="w-4 h-4 text-sky-400" />
                <span>Talk with Elder</span>
              </Link>

              <Link
                href="/voice-cloner"
                id="nav-voice-cloner-btn"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/40 text-sm font-semibold transition-all shadow-sm shadow-indigo-500/10"
              >
                <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span>Voice Cloner</span>
              </Link>

              <Link
                href="/onboarding"
                id="nav-guardian-setup-btn"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Guardian Setup</span>
                <span className="md:hidden">Setup</span>
              </Link>

              <Link
                href="/dashboard"
                id="nav-dashboard-btn"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 text-sm font-medium transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Oversight</span>
              </Link>

              <Link
                href="/test-suite"
                id="nav-test-suite-btn"
                className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-sm font-medium transition-all"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Evaluation Tests</span>
                <span className="sm:hidden">Tests</span>
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-slate-800/80 bg-[#060911] py-6 text-center text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-slate-300 font-medium">Safety Layer Active</span>
              <span className="text-slate-400">• Non-commercial Academic Research Prototype</span>
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <Link href="/talk" className="hover:text-sky-300 transition-colors">Elder UI</Link>
              <Link href="/onboarding" className="hover:text-sky-300 transition-colors">Consent & Voice</Link>
              <Link href="/dashboard" className="hover:text-sky-300 transition-colors">Safety Protocol</Link>
              <Link href="/test-suite" className="hover:text-sky-300 transition-colors">PRD Test Suite</Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
