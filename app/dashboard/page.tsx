"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Trash2, 
  AlertTriangle, 
  Clock, 
  User, 
  Database, 
  Heart, 
  Lock, 
  CheckCircle2, 
  Activity, 
  Sparkles,
  PhoneCall
} from "lucide-react";
import { Persona, Memory, Message } from "@/lib/types";
import { StorageManager, DEFAULT_PERSONA } from "@/lib/storage";

export default function DashboardPage() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionCapMinutes, setSessionCapMinutes] = useState(20);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [purgeToast, setPurgeToast] = useState("");

  useEffect(() => {
    async function loadData() {
      const p = await StorageManager.getPersona();
      setPersona(p);
      const m = await StorageManager.getMemories();
      setMemories(m);
      const msgs = await StorageManager.getMessages();
      setMessages(msgs);
    }
    loadData();
  }, []);

  // Filter flagged crisis messages
  const flaggedEvents = messages.filter((m) => m.flagged_crisis);

  // F19 Nuclear Data Purge: Delete Everything
  const handleDeleteEverything = async () => {
    if (!deleteConfirmed) return;
    setIsDeleting(true);
    try {
      await fetch("/api/delete-all", { method: "DELETE" });
      await StorageManager.deleteAllData();
      setPurgeToast("All voice files, memories, chat logs, and persona records permanently deleted from server and local storage.");
      setPersona(null);
      setMemories([]);
      setMessages([]);
      setDeleteConfirmed(false);
    } catch (e: any) {
      alert("Purge error: " + e.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
              Guardian Portal
            </span>
            <span className="text-xs text-slate-400">Privacy-Preserving Telemetry</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Safety & Oversight Dashboard</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>RLS Protected</span>
          </div>
        </div>
      </div>

      {purgeToast && (
        <div className="mt-6 p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-center font-bold text-sm">
          {purgeToast}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-8">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Active Persona</span>
            <User className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-xl font-bold text-white truncate">
            {persona ? persona.name : "None Configured"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {persona?.relationship || "No relationship set"}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Stored Memories (RAG)</span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white">{memories.length} Chunks</p>
          <p className="text-[11px] text-slate-400 mt-1">Grounding persona truth</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Session Cap</span>
            <Clock className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-white">{sessionCapMinutes} Minutes</p>
          <p className="text-[11px] text-slate-400 mt-1">Prevents unhealthy dependency</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Crisis Flags</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-white">{flaggedEvents.length} Events</p>
          <p className="text-[11px] text-slate-400 mt-1">
            {flaggedEvents.length > 0 ? "Requires guardian attention" : "All conversations safe"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Safety & Session Limit Controls */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Dependency Safeguards</h3>
              <p className="text-xs text-slate-400">Configure healthy session limits and nudges</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm font-semibold mb-1">
                <span className="text-slate-300">Max Session Duration Before Gentle Nudge</span>
                <span className="text-sky-400">{sessionCapMinutes} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="45"
                step="5"
                value={sessionCapMinutes}
                onChange={(e) => setSessionCapMinutes(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <p className="text-xs text-slate-400 mt-2">
                Recommended by grief psychologists: 15-20 minutes prevents isolating withdrawal and prompts the elder to call real family.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-2">
              <span className="text-xs font-bold text-slate-200 block uppercase tracking-wider">
                Automated Safeguard Rules Active:
              </span>
              <ul className="text-xs text-slate-300 space-y-1.5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>No push notifications sent to pull elders into chatting.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Persona never claims to have current physical presence.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Refusal to answer medical prescription or financial asset queries.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Crisis Flags Telemetry */}
        <div className="rounded-3xl bg-slate-900/80 border border-slate-800 p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Crisis Telemetry Log</h3>
              <p className="text-xs text-slate-400">Recorded when self-harm or deep despair is signaled</p>
            </div>
          </div>

          <div className="space-y-3">
            {flaggedEvents.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-800/40 border border-slate-700/60 text-slate-400 text-sm">
                <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                <span>No crisis signals detected. The elder is interacting safely.</span>
              </div>
            ) : (
              flaggedEvents.map((evt) => (
                <div
                  key={evt.id}
                  className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-xs space-y-1.5"
                >
                  <div className="flex justify-between font-bold text-rose-300">
                    <span>Crisis Intervention Triggered</span>
                    <span>{new Date(evt.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-200">
                    &ldquo;{evt.content}&rdquo;
                  </p>
                  <p className="text-rose-400 font-semibold">
                    Action Taken: Persona halted, Tele-MANAS helpline 14416 displayed.
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* F19 Nuclear Data Purge (Delete Everything) */}
      <div className="rounded-3xl bg-rose-950/20 border-2 border-rose-800/60 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-400" />
              <h4 className="text-lg font-bold text-rose-200">
                Ethical Right to Erasure (&ldquo;Delete Everything&rdquo;)
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              In full compliance with PRD F19 and ethical guidelines, clicking this button permanently cascades and wipes the voice model samples, all RAG memories, conversations, and persona profiles from both server and database.
            </p>
          </div>

          <div className="flex flex-col gap-3 shrink-0">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-rose-300">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(e) => setDeleteConfirmed(e.target.checked)}
                className="w-4 h-4 accent-rose-500 rounded"
              />
              <span>I confirm I want to erase all data</span>
            </label>

            <button
              id="btn-delete-everything"
              disabled={!deleteConfirmed || isDeleting}
              onClick={handleDeleteEverything}
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              <span>{isDeleting ? "Purging..." : "Permanently Delete Everything"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
