"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  ShieldAlert, 
  Heart, 
  RefreshCw, 
  Type, 
  Clock, 
  PhoneCall, 
  Send, 
  Sparkles,
  AlertCircle,
  HelpCircle,
  Info
} from "lucide-react";
import { Persona, Message, HelplineInfo } from "@/lib/types";
import { StorageManager, DEFAULT_PERSONA } from "@/lib/storage";

export default function TalkPage() {
  const [persona, setPersona] = useState<Persona>(DEFAULT_PERSONA);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [recognizedText, setRecognizedText] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  // Elder Accessibility: Font size scaling (Normal 20px, Large 24px, Huge 28px)
  const [fontSizeLevel, setFontSizeLevel] = useState<"normal" | "large" | "huge">("normal");

  // 20-minute gentle session limiter
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showSessionNudge, setShowSessionNudge] = useState(false);

  // Crisis detection state
  const [crisisAlert, setCrisisAlert] = useState<{
    triggered: boolean;
    helpline?: HelplineInfo;
    message?: string;
  } | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load persona on mount
  useEffect(() => {
    async function loadData() {
      const p = await StorageManager.getPersona();
      if (p) setPersona(p);

      // Add a warm initial greeting from the persona
      setMessages([
        {
          id: "welcome-msg",
          persona_id: p?.id || "demo",
          role: "assistant",
          content: `Hello ${p?.nicknames?.[0] || 'dear one'}! It brings me so much warmth to hear from you today. How are you feeling?`,
          created_at: new Date().toISOString()
        }
      ]);
    }
    loadData();
  }, []);

  // 20-minute session timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => {
        const next = prev + 1;
        // 20 minutes = 1200 seconds (for testing, triggered at 1200s or on manual trigger)
        if (next === 1200) {
          setShowSessionNudge(true);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, recognizedText, isThinking]);

  // Speech Recognition Setup (Web Speech API)
  const toggleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice speech recognition is not supported in this browser. Please use Google Chrome or type your message below.");
      setShowManualInput(true);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
        setRecognizedText("");
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRecognizedText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn("Speech recognition notice:", event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setShowManualInput(true);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        if (recognizedText && recognizedText.trim()) {
          handleSendMessage(recognizedText.trim());
          setRecognizedText("");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Speech Recognition start error:", e);
      setIsListening(false);
      setShowManualInput(true);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  // Dispatch message to /api/chat
  const handleSendMessage = async (text: string) => {
    if (!text || !text.trim() || isThinking) return;

    const userMsg: Message = {
      id: "usr-" + Date.now(),
      persona_id: persona.id,
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);
    setManualText("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personaId: persona.id,
          message: text,
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (data.isCrisis) {
        // Crisis triggered! Drop persona voice and show emergency helpline
        setCrisisAlert({
          triggered: true,
          helpline: data.helplineInfo,
          message: data.reply
        });

        const crisisMsg: Message = {
          id: "crisis-" + Date.now(),
          persona_id: persona.id,
          role: "system",
          content: data.reply,
          flagged_crisis: true,
          created_at: new Date().toISOString()
        };
        setMessages((prev) => [...prev, crisisMsg]);
        playSpeech(data.reply, true);
        return;
      }

      // Normal response
      const assistantMsg: Message = {
        id: "ast-" + Date.now(),
        persona_id: persona.id,
        role: "assistant",
        content: data.reply,
        created_at: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Play audio response
      playSpeech(data.reply, false);

    } catch (err) {
      console.error("Chat communication error:", err);
      const fallbackReply = `I am always here with you in memory, ${persona.nicknames?.[0] || 'dear'}.`;
      setMessages((prev) => [
        ...prev,
        {
          id: "err-" + Date.now(),
          persona_id: persona.id,
          role: "assistant",
          content: fallbackReply,
          created_at: new Date().toISOString()
        }
      ]);
      playSpeech(fallbackReply, false);
    } finally {
      setIsThinking(false);
    }
  };

  // Play audio via ElevenLabs TTS API with graceful SpeechSynthesis fallback
  const playSpeech = async (text: string, isCrisis = false) => {
    if (typeof window === "undefined") return;

    // Stop any currently playing audio
    stopAllAudio();

    // Crisis response: Drop persona voice; use neutral browser speech for clear help
    if (isCrisis) {
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsPlayingAudio(true);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
      }
      return;
    }

    try {
      setIsPlayingAudio(true);
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voiceId: persona?.voice_id || undefined,
          speakerId: persona?.id || undefined,
        }),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("audio")) {
          const blob = await res.blob();
          const audioUrl = URL.createObjectURL(blob);
          const audio = new Audio(audioUrl);
          audioPlayerRef.current = audio;

          audio.onended = () => {
            setIsPlayingAudio(false);
            URL.revokeObjectURL(audioUrl);
          };
          audio.onerror = () => {
            setIsPlayingAudio(false);
            fallbackBrowserSpeech(text);
          };

          await audio.play();
          return;
        }
      }
    } catch (e) {
      console.warn("TTS API fetch failed, falling back to speech synthesis:", e);
    }

    // Fallback to browser speech synthesis
    fallbackBrowserSpeech(text);
  };

  const fallbackBrowserSpeech = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.88;
      utterance.pitch = 0.95;
      utterance.onstart = () => setIsPlayingAudio(true);
      utterance.onend = () => setIsPlayingAudio(false);
      utterance.onerror = () => setIsPlayingAudio(false);
      window.speechSynthesis.speak(utterance);
    } else {
      setIsPlayingAudio(false);
    }
  };

  const stopAllAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
  };

  // Format time MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Font size classes
  const fontClass = 
    fontSizeLevel === "huge" ? "text-2xl sm:text-3xl leading-relaxed" :
    fontSizeLevel === "large" ? "text-xl sm:text-2xl leading-relaxed" :
    "text-lg sm:text-xl leading-relaxed";

  return (
    <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 sm:px-6 py-4 justify-between">
      
      {/* 1. Mandatory Transparency Banner (F13 & Ethics Principle 2) */}
      <div 
        id="ai-transparency-banner"
        className="w-full rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 p-4 mb-4 flex items-center justify-between gap-3 shadow-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Info className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <h2 className="font-extrabold text-base sm:text-lg text-amber-200">
              Notice: AI Memory Simulation
            </h2>
            <p className="text-xs sm:text-sm text-amber-300/80">
              This is an AI simulation of <span className="font-bold underline">{persona.name}</span>, not the real person. Built for comfort and remembrance.
            </p>
          </div>
        </div>

        {/* Accessibility Font Size Controls */}
        <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/80 p-1.5 rounded-xl border border-slate-700">
          <button
            onClick={() => setFontSizeLevel("normal")}
            title="Standard Font Size"
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              fontSizeLevel === "normal" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            A
          </button>
          <button
            onClick={() => setFontSizeLevel("large")}
            title="Large Font Size"
            className={`px-2.5 py-1 rounded-lg text-sm font-bold transition-all ${
              fontSizeLevel === "large" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            A+
          </button>
          <button
            onClick={() => setFontSizeLevel("huge")}
            title="Extra Large Font Size"
            className={`px-2.5 py-1 rounded-lg text-base font-bold transition-all ${
              fontSizeLevel === "huge" ? "bg-sky-500 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            A++
          </button>
        </div>
      </div>

      {/* 2. Top Session Bar with Timer & Stop Button */}
      <div className="flex items-center justify-between py-2 border-b border-slate-800/80 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
            👴
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white">{persona.name}</h3>
              {persona.voice_id ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium inline-flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  Cloned Voice Active
                </span>
              ) : persona.voice_sample_path ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium inline-flex items-center gap-1">
                  <Volume2 className="w-2.5 h-2.5 text-sky-400" />
                  Voice Sample Synced
                </span>
              ) : null}
            </div>
            <p className="text-xs text-sky-400 font-medium">
              {persona.relationship} • {persona.speaking_style}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Healthy Session Timer */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-xs sm:text-sm text-slate-300">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Time: </span>
            <span className="font-mono font-bold text-white">{formatTimer(sessionSeconds)}</span>
            {sessionSeconds >= 1200 && (
              <span className="text-amber-400 font-bold ml-1">(20m limit)</span>
            )}
          </div>

          {isPlayingAudio && (
            <button
              onClick={stopAllAudio}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold"
            >
              <VolumeX className="w-4 h-4" />
              <span>Pause Voice</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Live Captions & Conversation Stream (F12) */}
      <div 
        id="elder-conversation-scroll"
        className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[340px] max-h-[480px] p-4 rounded-3xl bg-[#0B101D] border-2 border-slate-800/80 shadow-inner"
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const isSystemCrisis = msg.role === "system" || msg.flagged_crisis;

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-xs font-semibold text-slate-400">
                  {isUser ? "You" : isSystemCrisis ? "Safety & Care Protocol" : persona.name}
                </span>
                <span className="text-[10px] text-slate-400">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-[90%] sm:max-w-[80%] p-5 sm:p-6 rounded-3xl font-medium shadow-md ${fontClass} ${
                  isSystemCrisis
                    ? "bg-rose-950/80 border-2 border-rose-500 text-rose-100"
                    : isUser
                    ? "bg-sky-600 text-white rounded-br-none"
                    : "bg-[#162036] border border-slate-700/80 text-slate-100 rounded-bl-none"
                }`}
              >
                <div>{msg.content}</div>
                {!isUser && !isSystemCrisis && (
                  <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => playSpeech(msg.content, false)}
                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold transition"
                      title="Play in recorded/cloned voice"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Hear in {persona.name}&apos;s voice</span>
                    </button>
                    {persona.voice_id && (
                      <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Cloned Voice
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Live Recognized Speech Interim Caption */}
        {isListening && recognizedText && (
          <div className="flex flex-col items-end">
            <span className="text-xs text-sky-400 font-semibold mb-1">Listening to your voice...</span>
            <div className={`max-w-[80%] p-5 rounded-3xl bg-sky-950/70 border-2 border-dashed border-sky-400 text-sky-200 ${fontClass}`}>
              {recognizedText}
            </div>
          </div>
        )}

        {/* Thinking State */}
        {isThinking && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#162036] border border-slate-700 w-fit">
            <div className="w-5 h-5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-slate-300">
              {persona.name} is remembering...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 4. Push-To-Talk Main Action Button (F8: Elder First Core Button) */}
      <div className="mt-5 flex flex-col items-center justify-center">
        {/* Voice Bar Visualizer when speaking or listening */}
        {(isListening || isPlayingAudio) && (
          <div className="flex items-center justify-center gap-1.5 h-10 mb-2">
            <div className="w-1.5 bg-sky-400 rounded-full animate-voice-bar-1" />
            <div className="w-1.5 bg-sky-300 rounded-full animate-voice-bar-2" />
            <div className="w-1.5 bg-indigo-400 rounded-full animate-voice-bar-3" />
            <div className="w-1.5 bg-sky-300 rounded-full animate-voice-bar-4" />
            <div className="w-1.5 bg-sky-400 rounded-full animate-voice-bar-5" />
          </div>
        )}

        <div className="relative flex items-center justify-center">
          {/* Animated Glow Rings when active */}
          {isListening && (
            <div className="absolute w-44 h-44 rounded-full bg-sky-500/30 animate-ping pointer-events-none" />
          )}

          <button
            id="elder-push-to-talk-btn"
            onClick={toggleSpeechRecognition}
            aria-label={isListening ? "Listening. Tap to send." : "Tap to speak with loved one"}
            className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center gap-2 font-bold text-white shadow-2xl transition-all transform active:scale-95 border-4 ${
              isListening
                ? "bg-rose-600 hover:bg-rose-500 border-rose-300 glow-crisis scale-105"
                : "bg-gradient-to-tr from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 border-sky-300/80 glow-primary hover:scale-105"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                  Listening...
                </span>
              </>
            ) : (
              <>
                <Mic className="w-10 h-10 sm:w-12 sm:h-12" />
                <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider">
                  Press to Talk
                </span>
              </>
            )}
          </button>
        </div>

        <p className="text-sm font-semibold text-slate-300 mt-3 text-center">
          {isListening 
            ? "Speak now. Tap again when you are finished."
            : "Tap the big microphone button to speak naturally."}
        </p>

        {/* Fallback Keyboard Toggle (F14) */}
        <div className="mt-2">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-slate-400 hover:text-sky-300 underline underline-offset-4"
          >
            {showManualInput ? "Hide keyboard typing" : "Can't use microphone? Type here"}
          </button>
        </div>

        {/* Fallback Text Input Drawer */}
        {showManualInput && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(manualText);
            }}
            className="w-full max-w-xl flex items-center gap-2 mt-3"
          >
            <input
              type="text"
              id="elder-manual-input"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 px-4 py-3 rounded-2xl bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 text-base"
            />
            <button
              type="submit"
              disabled={!manualText.trim() || isThinking}
              className="px-5 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold transition-all disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        )}
      </div>

      {/* 5. 20-Minute Healthy Session Reminder Modal (F17 & Dependency Safeguards) */}
      {showSessionNudge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full rounded-3xl bg-[#0F172A] border-2 border-amber-500/60 p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 text-3xl">
              💛
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Gentle Time Check
            </h3>
            <p className="text-base text-slate-300 leading-relaxed mb-6">
              You have been talking with {persona.name}&apos;s memory for 20 minutes. It was lovely talking today.
              Maybe take a warm cup of tea and call someone in the family?
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowSessionNudge(false)}
                className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-base transition-all"
              >
                I Understand, Thank You
              </button>
              <button
                onClick={() => {
                  setShowSessionNudge(false);
                  stopAllAudio();
                }}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
              >
                Rest for Today
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Crisis & Emergency Helpline Modal (F15 & Safety Protocol) */}
      {crisisAlert?.triggered && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-red-950/90 backdrop-blur-md">
          <div className="max-w-lg w-full rounded-3xl bg-[#1C0F13] border-4 border-rose-500 p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-12 h-12 text-rose-500 animate-pulse" />
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              We Care About Your Safety
            </h3>

            <p className="text-sm sm:text-base text-rose-200/90 mb-6 leading-relaxed">
              You do not have to carry this grief alone. The persona simulation has been paused so you can connect with people who can support you right now.
            </p>

            <div className="rounded-2xl bg-rose-900/40 border border-rose-700/60 p-4 text-left mb-6">
              <p className="text-xs uppercase tracking-wider text-rose-300 font-bold mb-2">
                Verified 24/7 Crisis Helplines (Toll-Free):
              </p>
              <div className="space-y-2">
                <a
                  href="tel:14416"
                  className="flex items-center justify-between p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold transition-all"
                >
                  <span className="flex items-center gap-2">
                    <PhoneCall className="w-5 h-5" />
                    <span>Tele-MANAS National Helpline</span>
                  </span>
                  <span className="text-lg">14416</span>
                </a>

                <a
                  href="tel:18005990019"
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-200 font-bold transition-all border border-rose-500/30"
                >
                  <span className="flex items-center gap-2">
                    <PhoneCall className="w-5 h-5 text-rose-400" />
                    <span>KIRAN Mental Health</span>
                  </span>
                  <span>1800-599-0019</span>
                </a>
              </div>
            </div>

            <button
              onClick={() => setCrisisAlert(null)}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all"
            >
              Close and Return
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
