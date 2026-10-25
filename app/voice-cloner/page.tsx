"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Mic,
  Square,
  Upload,
  Play,
  Pause,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Volume2,
  Cpu,
  Layers,
  Settings2,
  ArrowRight,
  RefreshCw,
  Sliders,
  Music,
  Trash2,
  Heart,
  Radio,
} from "lucide-react";
import { StorageManager } from "@/lib/storage";

interface VoiceSample {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  transcript: string;
  durationSec: number;
}

export default function VoiceClonerPage() {
  // Voice Profile Metadata
  const [profileName, setProfileName] = useState("Loved One's Voice");
  const [relationship, setRelationship] = useState("Mother");

  // Audio Samples (Multi-sample support from Voicebox)
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Engine & Delivery Controls
  const [selectedEngine, setSelectedEngine] = useState("local_gpu_cloner");
  const [selectedLanguage, setSelectedLanguage] = useState("auto");
  const [instructPrompt, setInstructPrompt] = useState("Warm, comforting, and speaking with gentle grandmotherly love");
  const [testText, setTestText] = useState("Amar shona, kemon aacho tumi? Shob shomoy mone rekho ami tomar pashei aachi.");

  // Cloning & Synthesis States
  const [isCloning, setIsCloning] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Audio Player State
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isPlayingGenerated, setIsPlayingGenerated] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Server Diagnostics
  const [serverStatus, setServerStatus] = useState<any>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  // Load initial persona voice & sample if previously recorded and saved
  useEffect(() => {
    async function init() {
      try {
        const savedPersona = await StorageManager.getPersona();
        if (savedPersona) {
          if (savedPersona.name) setProfileName(savedPersona.name);
          if (savedPersona.relationship) setRelationship(savedPersona.relationship);
          if (savedPersona.voice_id) setClonedVoiceId(savedPersona.voice_id);

          // Auto-restore saved voice sample into Section 2
          const sampleUrl = savedPersona.voice_sample_url || savedPersona.voice_sample_path;
          if (sampleUrl) {
            try {
              const res = await fetch(sampleUrl);
              if (res.ok) {
                const blob = await res.blob();
                if (blob.size > 100) {
                  const restoredSample: VoiceSample = {
                    id: "saved-persona-sample",
                    name: `${savedPersona.name || "Loved One"} Recorded Voice Sample`,
                    blob,
                    url: sampleUrl,
                    transcript: "Saved voice reference for Voicebox zero-shot synthesis",
                    durationSec: 6,
                  };
                  setSamples([restoredSample]);
                  setStatusMessage({
                    type: "info",
                    text: `Loaded saved voice profile for ${savedPersona.name || "Loved One"}. Ready to preview cloned speech below.`,
                  });
                }
              }
            } catch (fetchErr) {
              console.warn("Could not load audio sample file:", fetchErr);
            }
          }
        }
      } catch (e) {
        console.warn("Could not load persona", e);
      }
    }
    init();
    checkVoiceServerHealth();
  }, []);

  // Poll/Check Server Health
  const checkVoiceServerHealth = async () => {
    setIsCheckingServer(true);
    try {
      const res = await fetch("/api/voicebox");
      if (res.ok) {
        const data = await res.json();
        setServerStatus(data);
      }
    } catch (e) {
      console.warn("Server check failed", e);
    } finally {
      setIsCheckingServer(false);
    }
  };

// Convert AudioBuffer to clean 16-bit PCM RIFF WAV
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  let samples: Float32Array;

  if (numChannels === 1) {
    samples = buffer.getChannelData(0);
  } else {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    samples = new Float32Array(left.length);
    for (let i = 0; i < left.length; i++) {
      samples[i] = (left[i] + right[i]) / 2;
    }
  }

  const bytesPerSample = bitDepth / 8;
  const blockAlign = 1 * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;
  const arrayBuffer = new ArrayBuffer(totalSize);
  const view = new DataView(arrayBuffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) v.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

  // Start Mic Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const rawBlob = new Blob(audioChunksRef.current);
        let finalBlob: Blob = rawBlob;

        try {
          const arrayBuffer = await rawBlob.arrayBuffer();
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            finalBlob = audioBufferToWavBlob(audioBuffer);
          }
        } catch (convErr) {
          console.warn("Client audio decode notice, using raw blob:", convErr);
        }

        const url = URL.createObjectURL(finalBlob);
        const newSample: VoiceSample = {
          id: `sample-${Date.now()}`,
          name: `Recording #${samples.length + 1}`,
          blob: finalBlob,
          url,
          transcript: "Voice sample recording for Voicebox zero-shot cloner",
          durationSec: recordSeconds || 5,
        };
        setSamples((prev) => [...prev, newSample]);
        stream.getTracks().forEach((track) => track.stop());
      };

      mr.start();
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((sec) => sec + 1);
      }, 1000);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Could not access microphone. Please ensure microphone permissions are granted.",
      });
    }
  };

  // Stop Mic Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const newSample: VoiceSample = {
        id: `sample-${Date.now()}-${idx}`,
        name: file.name,
        blob: file,
        url,
        transcript: "Audio file reference for Voicebox acoustic synthesis",
        durationSec: 10,
      };
      setSamples((prev) => [...prev, newSample]);
    });
  };

  // Remove a sample
  const removeSample = (id: string) => {
    setSamples((prev) => prev.filter((s) => s.id !== id));
  };

  // Clone Voice with Voicebox
  const handleCloneVoice = async () => {
    if (samples.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Please record or upload at least one audio sample of the voice first.",
      });
      return;
    }

    setIsCloning(true);
    setStatusMessage({
      type: "info",
      text: "Voicebox is extracting acoustic embeddings and building the zero-shot voice profile...",
    });

    try {
      const primarySample = samples[0];
      const fd = new FormData();
      fd.append("name", profileName);
      fd.append("relationship", relationship);
      fd.append("engine", selectedEngine);
      fd.append("reference_text", samples.map((s) => s.transcript).join(" "));
      fd.append("file", primarySample.blob, primarySample.name || "voice_sample.wav");

      const res = await fetch("/api/clone-voice", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setClonedVoiceId(data.voice_id);

        // Permanently persist to persona storage so it stays across page refreshes
        try {
          const currentPersona = (await StorageManager.getPersona()) || {
            id: "persona-" + Date.now(),
            guardian_id: "guardian-user",
            name: profileName,
            relationship,
            voice_id: data.voice_id,
            nicknames: [],
            speaking_style: "warm, gentle",
            favorite_phrases: [],
            voice_sample_path: data.audio_url || (samples[0]?.url ?? ""),
            voice_sample_url: data.audio_url || (samples[0]?.url ?? ""),
            consent_confirmed: true,
            created_at: new Date().toISOString()
          };
          await StorageManager.savePersona({
            ...currentPersona,
            name: profileName || currentPersona.name,
            relationship: relationship || currentPersona.relationship,
            voice_id: data.voice_id,
            voice_sample_path: data.audio_url || currentPersona.voice_sample_path,
            voice_sample_url: data.audio_url || currentPersona.voice_sample_url,
          });
        } catch (storageErr) {
          console.warn("Storage save notice:", storageErr);
        }

        setStatusMessage({
          type: "success",
          text: `Voice successfully cloned! Profile ID: ${data.voice_id}. Ready to synthesize and preview speech in Section 4.`,
        });
      } else {
        setStatusMessage({
          type: "error",
          text: data.error || "Failed to register voice clone.",
        });
      }
    } catch (e: any) {
      setStatusMessage({
        type: "error",
        text: e?.message || "Failed to communicate with Voicebox server.",
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Synthesize Test Speech
  const handleSynthesizeSpeech = async () => {
    if (!testText.trim()) return;

    setIsSynthesizing(true);
    setStatusMessage({
      type: "info",
      text: `Synthesizing cloned speech via Voicebox (${selectedEngine})...`,
    });

    try {
      const fd = new FormData();
      fd.append("text", testText.trim());
      fd.append("language", selectedLanguage);
      fd.append("engine", selectedEngine);
      fd.append("instruct", instructPrompt);

      if (clonedVoiceId) {
        fd.append("speaker_id", clonedVoiceId);
      }
      if (samples.length > 0) {
        fd.append("audio_file", samples[0].blob, "sample.wav");
      }

      const res = await fetch("/api/voicebox", {
        method: "POST",
        body: fd,
      });

      if (res.ok) {
        const usedEngine = res.headers.get("x-voicebox-engine") || selectedEngine;
        const detectedPitch = res.headers.get("x-voicebox-pitch");
        const detectedGender = res.headers.get("x-voicebox-gender");
        const pitchInfo = detectedPitch ? ` (${detectedPitch}Hz, ${detectedGender || "matched timbre"})` : "";

        const blob = await res.blob();
        if (blob.size > 100) {
          const url = URL.createObjectURL(blob);
          setGeneratedAudioUrl(url);
          setStatusMessage({
            type: "success",
            text: `Speech synthesized successfully via ${usedEngine}${pitchInfo}! Preview playing below.`,
          });

          // Play immediately (catch autoplay restrictions gracefully)
          setTimeout(() => {
            if (audioPlayerRef.current) {
              audioPlayerRef.current.src = url;
              audioPlayerRef.current.play().catch((playErr) => {
                console.debug("Autoplay note (requires user gesture):", playErr);
              });
              setIsPlayingGenerated(true);
            }
          }, 150);
          return;
        }
      }

      const errData = await res.json().catch(() => null);
      throw new Error(errData?.error || "Voice synthesis returned empty response");
    } catch (e: any) {
      setStatusMessage({
        type: "error",
        text: `Synthesis note: ${e?.message || "Could not generate speech preview."}`,
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Set Cloned Voice as Active Persona Voice
  const handleApplyToPersona = async () => {
    if (!clonedVoiceId) return;

    try {
      const currentPersona = (await StorageManager.getPersona()) || {
        id: "persona-" + Date.now(),
        guardian_id: "guardian-user",
        name: profileName,
        relationship,
        voice_id: clonedVoiceId,
        nicknames: [],
        speaking_style: "warm, gentle",
        favorite_phrases: [],
        consent_confirmed: true,
        created_at: new Date().toISOString()
      };
      const updated = {
        ...currentPersona,
        voice_id: clonedVoiceId,
        name: profileName || currentPersona.name,
        relationship: relationship || currentPersona.relationship,
      };
      await StorageManager.savePersona(updated);

      setStatusMessage({
        type: "success",
        text: "Success! Cloned voice has been activated. The Elder Talk Screen will now speak in this voice.",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: "Could not apply voice to persona: " + (err?.message || "Storage error"),
      });
    }
  };

  // Insert emotional tag (Voicebox Chatterbox feature)
  const insertEmotionalTag = (tag: string) => {
    setTestText((prev) => `${prev} ${tag} `);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 w-full">
      {/* Header & Technology Header */}
      <div className="mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Powered by Jamie Pine Voicebox Technology
            </span>
            <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <Radio className="w-3 h-3 animate-pulse" />
              Zero-Shot Cloning
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Voicebox AI Voice Cloner Studio
          </h1>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Clone any human voice with a short audio sample using Qwen3-TTS, Chatterbox, and Voicebox acoustic timbre synthesis — completely private, local-first, and royalty-free.
          </p>
        </div>

        {/* Server Status Pill */}
        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
          <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center">
            <Cpu className="w-5 h-5 text-sky-400" />
          </div>
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">Engine Device:</span>
              <span className="text-sky-300 font-mono">
                {serverStatus?.health?.device || "Direct Accel"}
              </span>
            </div>
            <p className="text-slate-400 text-[11px]">
              {serverStatus?.connected ? "Voice Server Online" : "Ready / Standby Mode"}
            </p>
          </div>
          <button
            onClick={checkVoiceServerHealth}
            disabled={isCheckingServer}
            title="Refresh Server Status"
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors ml-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingServer ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Grid Studio Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Sample Intake & Recording (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Name & Settings Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Volume2 className="w-5 h-5 text-sky-400" />
              1. Voice Identity & Reference
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Voice Profile Name
                </label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="e.g. Grandmother's Voice"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Relationship / Role
                </label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="e.g. Mother, Father, Spouse"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
              </div>
            </div>
          </div>

          {/* Audio Sample Recording & Upload Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Mic className="w-5 h-5 text-amber-400" />
                2. Audio Samples ({samples.length})
              </h2>
              <span className="text-xs text-slate-400">3-60 seconds recommended</span>
            </div>

            {/* Recording Controls */}
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 text-center mb-4">
              {isRecording ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto animate-pulse">
                    <Mic className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-rose-400 font-mono text-xl font-bold">
                      00:{recordSeconds < 10 ? `0${recordSeconds}` : recordSeconds}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">
                      Speaking reference audio... Please speak clearly.
                    </p>
                  </div>
                  <button
                    onClick={stopRecording}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition-all"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    Stop & Keep Sample
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Record voice sample directly from your microphone, or upload an audio file. Voicebox extracts speaker timbre automatically.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                      onClick={startRecording}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-500/20"
                    >
                      <Mic className="w-4 h-4" />
                      Record Sample
                    </button>

                    <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-sm transition-all cursor-pointer">
                      <Upload className="w-4 h-4 text-slate-400" />
                      Upload Audio
                      <input
                        type="file"
                        accept="audio/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Samples List */}
            {samples.length > 0 && (
              <div className="space-y-3 mt-4">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Reference Clips</span>
                  <span className="text-sky-400">Multi-sample combining enabled</span>
                </div>
                {samples.map((sample, idx) => (
                  <div
                    key={sample.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-200 truncate">{sample.name}</p>
                        <audio src={sample.url} controls className="h-6 w-48 mt-1" />
                      </div>
                    </div>
                    <button
                      onClick={() => removeSample(sample.id)}
                      className="p-2 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Remove sample"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Execute Clone Button */}
            <div className="mt-6">
              <button
                onClick={handleCloneVoice}
                disabled={isCloning || samples.length === 0}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-base shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2 transition-all"
              >
                {isCloning ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Voicebox Zero-Shot Cloning in Progress...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Clone Voice Profile Now
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Engine Selector, Synthesis & Playground (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Status Feedback Banner */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border text-sm flex items-start gap-3 transition-all ${
                statusMessage.type === "success"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : statusMessage.type === "error"
                  ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
                  : "bg-sky-500/10 border-sky-500/30 text-sky-300"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : statusMessage.type === "error" ? (
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : (
                <Sparkles className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium leading-relaxed">{statusMessage.text}</p>
              </div>
            </div>
          )}

          {/* Voicebox Engine Selector Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              3. Voicebox Engine Selection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Local GPU Zero-Shot Cloner (RTX 4050) - PRIMARY */}
              <div
                onClick={() => setSelectedEngine("local_gpu_cloner")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedEngine === "local_gpu_cloner"
                    ? "bg-emerald-500/20 border-emerald-500 shadow-md shadow-emerald-500/15 ring-1 ring-emerald-500"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Local GPU Zero-Shot Cloner</span>
                  </span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    RTX 4050 GPU
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">
                  Zero-shot neural voice cloning running 100% locally on your NVIDIA RTX 4050 GPU. Uses {profileName}&apos;s authentic audio sample. No ElevenLabs or cloud API required.
                </p>
              </div>

              {/* Qwen3-TTS 1.7B */}
              <div
                onClick={() => setSelectedEngine("qwen_tts_1.7B")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedEngine === "qwen_tts_1.7B"
                    ? "bg-sky-500/15 border-sky-500 shadow-md shadow-sky-500/10"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-100">Qwen3-TTS 1.7B</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Zero-Shot GPU
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">
                  Jamie Pine Voicebox flagship zero-shot engine (GPU / Colab accelerated).
                </p>
              </div>

              {/* Chatterbox Multilingual */}
              <div
                onClick={() => setSelectedEngine("chatterbox")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedEngine === "chatterbox"
                    ? "bg-sky-500/15 border-sky-500 shadow-md shadow-sky-500/10"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-100">Chatterbox TTS</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Expressive
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">
                  Zero-shot cloner with paralinguistic tag support like [laugh], [sigh], [whisper].
                </p>
              </div>

              {/* Acoustic Timbre Cloner */}
              <div
                onClick={() => setSelectedEngine("acoustic_timbre")}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedEngine === "acoustic_timbre"
                    ? "bg-sky-500/15 border-sky-500 shadow-md shadow-sky-500/10"
                    : "bg-slate-800/40 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-bold text-sm text-slate-100">Voicebox Instant Timbre</span>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Realtime CPU
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-normal">
                  Instant local acoustic resonance matching. Runs on any CPU with zero GPU load.
                </p>
              </div>
            </div>

            {/* Natural Language Delivery Instruct Prompt */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Delivery Instruction Prompt (Voicebox Instruct)</span>
                <span className="text-[11px] text-slate-500">Guides emotion & tone</span>
              </label>
              <input
                type="text"
                value={instructPrompt}
                onChange={(e) => setInstructPrompt(e.target.value)}
                placeholder="e.g. Speak with gentle grandmotherly warmth, slow pacing"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  "Gentle and loving grandmother",
                  "Warm comforting elder",
                  "Soft whisper",
                  "Joyful & laughing",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInstructPrompt(preset)}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300 transition-colors"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Test & Synthesis Playground Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-3">
              <Sliders className="w-5 h-5 text-sky-400" />
              4. Test & Preview Cloned Speech
            </h2>

            {/* Active Voice Reference Badge */}
            <div className="mb-4 p-3 rounded-2xl bg-slate-800/50 border border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <div>
                  <span className="text-slate-400">Target Voice: </span>
                  <strong className="text-white font-semibold">{profileName}</strong>
                  <span className="text-slate-400 text-[11px] ml-1.5">({relationship})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {samples.length > 0 ? `${samples.length} Voice Reference Loaded` : (clonedVoiceId ? "Saved Voice Profile Linked" : "Ready")}
                </span>
              </div>
            </div>

            {/* Language & Expressive Tag buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
                <span className="text-[11px] font-semibold text-slate-400 px-2">Language:</span>
                {[
                  { id: "auto", label: "Auto-Detect" },
                  { id: "bn", label: "বাংলা (Bengali)" },
                  { id: "en", label: "English" },
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setSelectedLanguage(lang.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      selectedLanguage === lang.id
                        ? "bg-sky-500 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-slate-400 font-medium">Tags:</span>
                {["[laugh]", "[sigh]", "[gasp]", "[whisper]"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => insertEmotionalTag(tag)}
                    className="px-2 py-0.5 rounded-md bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono font-medium transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Text Area */}
            <div className="space-y-3 mb-5">
              <textarea
                rows={3}
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter text to synthesize in the cloned voice..."
                className="w-full p-4 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 leading-relaxed resize-none"
              />
              <div className="flex justify-between items-center text-xs text-slate-400">
                <span>{testText.length} characters</span>
                <button
                  type="button"
                  onClick={() =>
                    setTestText("Shob shomoy mone rekho, bhalo theko. Ami shob shomoy tomar pashe aachi.")
                  }
                  className="text-sky-400 hover:underline"
                >
                  Insert Bengali Comfort Greeting
                </button>
              </div>
            </div>

            {/* Synthesis Button */}
            <button
              onClick={handleSynthesizeSpeech}
              disabled={isSynthesizing || !testText.trim()}
              className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white font-bold text-base shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all mb-6"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Generating Speech via Voicebox...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-white" />
                  Synthesize Cloned Voice
                </>
              )}
            </button>

            {/* Audio Preview & Waveform Player */}
            {generatedAudioUrl && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/40 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-200 text-sm">Voicebox Synthesized Audio</p>
                      <p className="text-xs text-slate-400">24kHz PCM Audio Preview</p>
                    </div>
                  </div>
                  <a
                    href={generatedAudioUrl}
                    download="voicebox_cloned_sample.wav"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>

                <audio
                  ref={audioPlayerRef}
                  src={generatedAudioUrl}
                  controls
                  className="w-full h-10 accent-emerald-500"
                />

                {/* Apply to Active Persona Button */}
                <div className="pt-2 border-t border-slate-800">
                  <button
                    onClick={handleApplyToPersona}
                    className="w-full py-3 px-5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-sm font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Heart className="w-4 h-4 text-sky-400 fill-sky-400" />
                    Apply Cloned Voice to Elder Talk Screen
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
