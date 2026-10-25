"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  CheckSquare, 
  Square, 
  Upload, 
  Mic, 
  Square as StopSquare, 
  Volume2, 
  Sparkles, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  HeartHandshake
} from "lucide-react";
import { Persona, Memory } from "@/lib/types";
import { StorageManager, DEFAULT_PERSONA, DEFAULT_MEMORIES } from "@/lib/storage";

export default function OnboardingPage() {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Step 1: Mandatory Consent Checklist (SAFETY & PRD F2)
  const [consentItems, setConsentItems] = useState({
    permissionGiven: false,
    aiSimulationUnderstood: false,
    comfortOnly: false,
    canDeleteAnytime: false,
  });

  // Step 2: Persona Details (PRD F4)
  const [name, setName] = useState(DEFAULT_PERSONA.name);
  const [relationship, setRelationship] = useState(DEFAULT_PERSONA.relationship);
  const [nicknames, setNicknames] = useState(DEFAULT_PERSONA.nicknames.join(", "));
  const [speakingStyle, setSpeakingStyle] = useState(DEFAULT_PERSONA.speaking_style);
  const [favoritePhrases, setFavoritePhrases] = useState(DEFAULT_PERSONA.favorite_phrases.join("\n"));

  // Step 3: Voice Sample & In-Browser Recording (PRD F3, F6, F7)
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioFileBlob, setAudioFileBlob] = useState<Blob | File | null>(null);
  const [voiceId, setVoiceId] = useState(DEFAULT_PERSONA.voice_id || "JBFqnCBsd6RMkjVDRZzb");
  const [isCloning, setIsCloning] = useState(false);
  const [cloneFeedback, setCloneFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<any>(null);

  // Step 4: Memories & Stories (PRD F5)
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemoryContent, setNewMemoryContent] = useState("");
  const [newMemoryCategory, setNewMemoryCategory] = useState("Daily Routines");

  // Status & saving
  const [isSaving, setIsSaving] = useState(false);
  const [successToast, setSuccessToast] = useState("");

  // Load existing data if available
  useEffect(() => {
    async function loadData() {
      const p = await StorageManager.getPersona();
      if (p) {
        setName(p.name);
        setRelationship(p.relationship);
        setNicknames(p.nicknames.join(", "));
        setSpeakingStyle(p.speaking_style);
        setFavoritePhrases(p.favorite_phrases.join("\n"));
        if (p.voice_id) setVoiceId(p.voice_id);
        if (p.voice_sample_path) setAudioBlobUrl(p.voice_sample_path);
        if (p.consent_confirmed) {
          setConsentItems({
            permissionGiven: true,
            aiSimulationUnderstood: true,
            comfortOnly: true,
            canDeleteAnytime: true,
          });
        }
      }
      const mems = await StorageManager.getMemories();
      setMemories(mems);
    }
    loadData();
  }, []);

  const allConsented = 
    consentItems.permissionGiven && 
    consentItems.aiSimulationUnderstood && 
    consentItems.comfortOnly && 
    consentItems.canDeleteAnytime;

  // In-Browser Audio Recorder (F7)
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlobUrl(url);
        setAudioFileBlob(audioBlob);
        setCloneFeedback(null);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      alert("Microphone permission denied. Please allow microphone access or upload an audio file.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordTimerRef.current);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAudioBlobUrl(url);
      setAudioFileBlob(file);
      setCloneFeedback(null);
    }
  };

  // Programmatic Voice Cloning via ElevenLabs
  const handleCloneWithElevenLabs = async () => {
    if (!audioFileBlob) {
      setCloneFeedback({
        type: "error",
        message: "Please record or upload a voice sample first before cloning."
      });
      return;
    }

    setIsCloning(true);
    setCloneFeedback({
      type: "info",
      message: "Sending audio sample to Voicebox Zero-Shot Voice Cloning Engine..."
    });

    try {
      const fd = new FormData();
      fd.append("name", `${name || 'Persona'} - Voicebox Cloned Voice`);
      fd.append("description", `Smriti memorial voice clone for ${relationship || 'Loved One'}`);
      fd.append("file", audioFileBlob, "voice_sample.wav");

      const res = await fetch("/api/clone-voice", {
        method: "POST",
        body: fd
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setVoiceId(data.voice_id);
        setCloneFeedback({
          type: "success",
          message: `Voice successfully cloned with Voicebox! Voice ID: ${data.voice_id}`
        });
      } else {
        setCloneFeedback({
          type: "error",
          message: data.error || "Failed to clone voice with Voicebox engine."
        });
      }
    } catch (e: any) {
      setCloneFeedback({
        type: "error",
        message: e?.message || "Network error while calling Voicebox cloning engine."
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Add new Memory
  const handleAddMemory = async () => {
    if (!newMemoryContent.trim()) return;

    const newMem = await StorageManager.addMemory(
      newMemoryContent.trim(),
      DEFAULT_PERSONA.id,
      newMemoryCategory
    );

    setMemories([newMem, ...memories]);
    setNewMemoryContent("");
  };

  const handleDeleteMemory = async (id: string) => {
    await StorageManager.deleteMemory(id);
    setMemories(memories.filter((m) => m.id !== id));
  };

  // Save all and activate
  const handleFinalSave = async () => {
    setIsSaving(true);
    try {
      const personaId = "persona-" + Date.now();
      let finalAudioPath = audioBlobUrl || "/samples/sample-voice.wav";
      let finalVoiceId = voiceId;

      // 1. Permanently persist recorded/uploaded voice sample to database/server
      if (audioFileBlob) {
        try {
          const fd = new FormData();
          fd.append("file", audioFileBlob, "voice_sample.wav");
          fd.append("personaId", personaId);
          fd.append("name", name);
          fd.append("relationship", relationship);

          const upRes = await fetch("/api/upload-voice", {
            method: "POST",
            body: fd
          });
          const upData = await upRes.json();
          if (upRes.ok && upData?.audioUrl) {
            finalAudioPath = upData.audioUrl;
            if (upData.voiceId) {
              finalVoiceId = upData.voiceId;
            }
          }
        } catch (upErr) {
          console.warn("Voice upload notice:", upErr);
        }
      }

      const updatedPersona: Persona = {
        id: personaId,
        guardian_id: "guardian-current",
        name,
        relationship,
        nicknames: nicknames.split(",").map((s) => s.trim()).filter(Boolean),
        speaking_style: speakingStyle,
        favorite_phrases: favoritePhrases.split("\n").map((s) => s.trim()).filter(Boolean),
        voice_sample_path: finalAudioPath,
        voice_sample_url: finalAudioPath,
        voice_id: finalVoiceId || undefined,
        consent_confirmed: true,
        consent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      // 2. Save to local storage cache
      await StorageManager.savePersona(updatedPersona);

      // 3. Save to backend database API (Supabase & server)
      try {
        await fetch("/api/persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedPersona)
        });
      } catch (err) {
        console.warn("Persona DB sync note:", err);
      }

      setSuccessToast("Persona successfully activated! Ready for the Elder to speak.");
      setTimeout(() => {
        window.location.href = "/talk";
      }, 1800);
    } catch (e: any) {
      alert("Error saving: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
      {/* Wizard Step Indicator */}
      <div className="mb-10">
        <div className="flex items-center justify-between max-w-xl mx-auto mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => (s <= step || allConsented) && setStep(s as any)}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm transition-all ${
                  step === s
                    ? "bg-sky-500 text-white shadow-lg shadow-sky-500/30 scale-110"
                    : step > s
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {step > s ? "✓" : s}
              </button>
              {s < 5 && (
                <div
                  className={`w-10 sm:w-16 h-1 mx-1 rounded-full ${
                    step > s ? "bg-emerald-500/40" : "bg-slate-800"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-sky-400 font-bold">
            Step {step} of 5
          </p>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
            {step === 1 && "Ethical Consent & Permissions"}
            {step === 2 && "Loved One's Personality & Phrases"}
            {step === 3 && "Voice Sample & In-Browser Recording"}
            {step === 4 && "Memory Vault & Stories (RAG)"}
            {step === 5 && "Preview & Final Activation"}
          </h2>
        </div>
      </div>

      {/* STEP 1: Consent Checklist (F2) */}
      {step === 1 && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-xl">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm mb-6">
            <HeartHandshake className="w-5 h-5 shrink-0" />
            <p>
              Under our Safety & Ethics Charter, all four items must be explicitly confirmed before uploading voice audio or creating a persona.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <label 
              id="consent-box-1"
              className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
            >
              <button
                type="button"
                onClick={() => setConsentItems(p => ({ ...p, permissionGiven: !p.permissionGiven }))}
                className="mt-0.5"
              >
                {consentItems.permissionGiven ? (
                  <CheckSquare className="w-6 h-6 text-sky-400" />
                ) : (
                  <Square className="w-6 h-6 text-slate-500" />
                )}
              </button>
              <div className="text-sm">
                <span className="font-bold text-white block">
                  1. Explicit Permission Confirmed
                </span>
                <span className="text-slate-400">
                  The person whose voice I am uploading gave permission before passing away, OR I have permission from their family / estate.
                </span>
              </div>
            </label>

            <label 
              id="consent-box-2"
              className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
            >
              <button
                type="button"
                onClick={() => setConsentItems(p => ({ ...p, aiSimulationUnderstood: !p.aiSimulationUnderstood }))}
                className="mt-0.5"
              >
                {consentItems.aiSimulationUnderstood ? (
                  <CheckSquare className="w-6 h-6 text-sky-400" />
                ) : (
                  <Square className="w-6 h-6 text-slate-500" />
                )}
              </button>
              <div className="text-sm">
                <span className="font-bold text-white block">
                  2. Honest AI Simulation
                </span>
                <span className="text-slate-400">
                  I understand this creates an AI simulation and not the real person. The elder will always see the AI disclaimer banner.
                </span>
              </div>
            </label>

            <label 
              id="consent-box-3"
              className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
            >
              <button
                type="button"
                onClick={() => setConsentItems(p => ({ ...p, comfortOnly: !p.comfortOnly }))}
                className="mt-0.5"
              >
                {consentItems.comfortOnly ? (
                  <CheckSquare className="w-6 h-6 text-sky-400" />
                ) : (
                  <Square className="w-6 h-6 text-slate-500" />
                )}
              </button>
              <div className="text-sm">
                <span className="font-bold text-white block">
                  3. Pure Comfort & Remembrance Only
                </span>
                <span className="text-slate-400">
                  I will only use this for comfort, healing, and remembrance, never to deceive, impersonate, or conduct financial affairs.
                </span>
              </div>
            </label>

            <label 
              id="consent-box-4"
              className="flex items-start gap-4 p-4 rounded-2xl bg-slate-800/60 border border-slate-700 hover:border-slate-600 cursor-pointer transition-all"
            >
              <button
                type="button"
                onClick={() => setConsentItems(p => ({ ...p, canDeleteAnytime: !p.canDeleteAnytime }))}
                className="mt-0.5"
              >
                {consentItems.canDeleteAnytime ? (
                  <CheckSquare className="w-6 h-6 text-sky-400" />
                ) : (
                  <Square className="w-6 h-6 text-slate-500" />
                )}
              </button>
              <div className="text-sm">
                <span className="font-bold text-white block">
                  4. Full Data Control & Right to Erase
                </span>
                <span className="text-slate-400">
                  I understand I can permanently delete all voice samples, memories, and conversations with one click at any time.
                </span>
              </div>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              id="btn-consent-next"
              disabled={!allConsented}
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-base shadow-lg shadow-sky-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span>Confirm & Continue</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Persona Profile (F4) */}
      {step === 2 && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                Full Name of Loved One *
              </label>
              <input
                type="text"
                id="persona-name-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Mukherjee"
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-200 mb-2">
                Relationship to Elder *
              </label>
              <input
                type="text"
                id="persona-relationship-input"
                value={relationship}
                onChange={(e) => setRelationship(e.target.value)}
                placeholder="e.g. Grandfather, Husband, Mother"
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-base"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">
              Nicknames they used for the Elder (comma-separated)
            </label>
            <input
              type="text"
              id="persona-nicknames-input"
              value={nicknames}
              onChange={(e) => setNicknames(e.target.value)}
              placeholder="e.g. Khoka, Shonamoni, Dear"
              className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">
              Speaking Style & Demeanor
            </label>
            <input
              type="text"
              id="persona-style-input"
              value={speakingStyle}
              onChange={(e) => setSpeakingStyle(e.target.value)}
              placeholder="e.g. Warm, gentle, teasing, short sentences"
              className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-base"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-200 mb-2">
              Favorite Phrases & Catchphrases (one per line)
            </label>
            <textarea
              id="persona-phrases-input"
              rows={3}
              value={favoritePhrases}
              onChange={(e) => setFavoritePhrases(e.target.value)}
              placeholder="e.g. Always drink your morning tea warm&#10;Stay smiling&#10;Family is life's biggest blessing"
              className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-sky-500 text-base"
            />
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button
              disabled={!name || !relationship}
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold disabled:opacity-40"
            >
              <span>Next: Voice Sample</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Voice Sample (F3, F6, F7) */}
      {step === 3 && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-xl space-y-8">
          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/60 text-sky-300 text-sm flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">ElevenLabs Voice Cloning & TTS Ready:</span> Record or upload a clean 30-60s clip to clone the voice directly, choose from tuned vocal presets, or paste an existing ElevenLabs Voice ID.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Option A: In-Browser Direct Recording (F7) */}
            <div className="rounded-2xl bg-slate-800/70 border border-slate-700 p-6 text-center flex flex-col items-center justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
                  <Mic className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg text-white mb-1">Option A: Record Live</h4>
                <p className="text-xs text-slate-400 mb-6">
                  Speak for 30-60 seconds to capture speech patterns directly.
                </p>
              </div>

              <div>
                {isRecording ? (
                  <button
                    onClick={stopAudioRecording}
                    className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-2 animate-pulse"
                  >
                    <StopSquare className="w-5 h-5" />
                    <span>Stop Recording ({recordingSeconds}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={startAudioRecording}
                    className="px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center gap-2"
                  >
                    <Mic className="w-5 h-5 text-sky-400" />
                    <span>Start Live Recording</span>
                  </button>
                )}
              </div>
            </div>

            {/* Option B: File Upload (F3) */}
            <div className="rounded-2xl bg-slate-800/70 border border-slate-700 p-6 text-center flex flex-col items-center justify-between">
              <div>
                <div className="w-12 h-12 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg text-white mb-1">Option B: Upload Audio</h4>
                <p className="text-xs text-slate-400 mb-6">
                  Upload an existing clean .wav or .mp3 voice recording.
                </p>
              </div>

              <div>
                <label className="cursor-pointer px-6 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold inline-flex items-center gap-2">
                  <Upload className="w-5 h-5 text-sky-400" />
                  <span>Choose Voice File</span>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Voice Preview & Instant Cloning Button */}
          {audioBlobUrl && (
            <div className="rounded-2xl bg-slate-800/90 p-5 border border-sky-500/40 space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-6 h-6 text-sky-400 shrink-0" />
                  <div>
                    <h5 className="font-bold text-white text-sm">Voice Sample Loaded</h5>
                    <p className="text-xs text-slate-400">Audio ready for playback and ElevenLabs cloning</p>
                  </div>
                </div>
                <audio controls src={audioBlobUrl} className="w-full sm:w-64 h-10" />
              </div>

              <div className="pt-2 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="text-xs text-slate-400">
                  Ready to create a custom clone using your ElevenLabs API key?
                </div>
                <button
                  type="button"
                  disabled={isCloning}
                  onClick={handleCloneWithElevenLabs}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-md transition disabled:opacity-50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isCloning ? "Cloning Voice..." : "Clone Voice with ElevenLabs"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Feedback from cloning action */}
          {cloneFeedback && (
            <div className={`p-4 rounded-2xl text-xs flex items-start gap-2.5 ${
              cloneFeedback.type === 'success' 
                ? 'bg-emerald-950/50 border border-emerald-500/40 text-emerald-300'
                : cloneFeedback.type === 'error'
                ? 'bg-rose-950/50 border border-rose-500/40 text-rose-300'
                : 'bg-sky-950/50 border border-sky-500/40 text-sky-300'
            }`}>
              {cloneFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              )}
              <div className="leading-relaxed">
                {cloneFeedback.message}
              </div>
            </div>
          )}

          {/* ElevenLabs Voice ID & Preset Configuration */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700/80 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h5 className="font-bold text-white text-sm flex items-center gap-2">
                  <span>ElevenLabs Voice Settings</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30">Active API</span>
                </h5>
                <p className="text-xs text-slate-400 mt-0.5">Select a tuned vocal tone or paste your cloned ElevenLabs Voice ID</p>
              </div>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", desc: "Warm, dignified & mature" },
                { id: "EXAVITQu4vr4xnSDxMaL", name: "Bella", desc: "Gentle, soothing & maternal" },
                { id: "TxGEqnHWrfWFTfGW9XjX", name: "Josh", desc: "Calm, thoughtful & resonant" }
              ].map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setVoiceId(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    voiceId === preset.id
                      ? "bg-sky-500/20 border-sky-500 text-white shadow-sm"
                      : "bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <div className="font-semibold text-xs text-white">{preset.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>

            {/* Manual Voice ID input */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                ElevenLabs Voice ID (Auto-populated from clone or paste from elevenlabs.io)
              </label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value.trim())}
                placeholder="e.g. JBFqnCBsd6RMkjVDRZzb or your cloned Voice ID"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold"
            >
              <span>Next: Add Memories</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Memories & Stories (F5 RAG Chunks) */}
      {step === 4 && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-sm">
            <span className="font-bold">Zero Hallucination Grounding:</span> The AI will strictly reference these stored memories and will warmly admit if it does not recall unlisted events.
          </div>

          {/* Add New Memory Form */}
          <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white">
                Add a Cherished Memory or Story
              </label>
              <select
                value={newMemoryCategory}
                onChange={(e) => setNewMemoryCategory(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-sky-400 font-semibold"
              >
                <option value="Daily Routines">Daily Routines</option>
                <option value="Childhood Memories">Childhood Memories</option>
                <option value="Family Traditions">Family Traditions</option>
                <option value="Special Travels">Special Travels</option>
              </select>
            </div>

            <textarea
              id="new-memory-text"
              rows={3}
              value={newMemoryContent}
              onChange={(e) => setNewMemoryContent(e.target.value)}
              placeholder="e.g. Every winter morning in Darjeeling, we would sit on the veranda wrapped in shawls drinking spiced ginger tea..."
              className="w-full px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500"
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddMemory}
                disabled={!newMemoryContent.trim()}
                className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm flex items-center gap-2 disabled:opacity-40"
              >
                <Plus className="w-4 h-4" />
                <span>Save Memory Chunk</span>
              </button>
            </div>
          </div>

          {/* Existing Memory Vault List */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-300">
              Active Memory Chunks ({memories.length})
            </h4>
            {memories.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-800/40 border border-slate-700/80"
              >
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-700 text-sky-300">
                    {m.category || "General"}
                  </span>
                  <p className="text-sm text-slate-200 mt-1">{m.content}</p>
                </div>
                <button
                  onClick={() => handleDeleteMemory(m.id)}
                  title="Remove memory"
                  className="text-slate-400 hover:text-rose-400 p-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(3)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button
              onClick={() => setStep(5)}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold"
            >
              <span>Next: Final Review</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Final Review & Activation */}
      {step === 5 && (
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-800/80 p-6">
            <h4 className="text-xl font-bold text-white mb-2">{name}</h4>
            <div className="grid grid-cols-2 gap-4 text-xs sm:text-sm text-slate-300 mb-4">
              <div>
                <span className="text-slate-400">Relationship:</span> {relationship}
              </div>
              <div>
                <span className="text-slate-400">Speaking Style:</span> {speakingStyle}
              </div>
              <div>
                <span className="text-slate-400">Nicknames:</span> {nicknames || "None"}
              </div>
              <div>
                <span className="text-slate-400">Indexed Memories:</span> {memories.length} stories
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Consent Verified • Safety Layer Active • Ready for Elder Use</span>
            </div>
          </div>

          {successToast && (
            <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center font-bold text-sm">
              {successToast}
            </div>
          )}

          <div className="flex justify-between pt-4">
            <button
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            <button
              id="btn-activate-persona"
              disabled={isSaving}
              onClick={handleFinalSave}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-base shadow-xl shadow-emerald-600/30 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              <span>{isSaving ? "Activating..." : "Activate Companion Now"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
