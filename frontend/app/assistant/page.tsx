"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  Bot, 
  User, 
  Flame, 
  Zap, 
  Snowflake, 
  CheckCircle2, 
  RefreshCw, 
  Building2, 
  Calendar, 
  ExternalLink,
  Volume2,
  ClipboardList
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ScheduleVisitModal from "@/components/ScheduleVisitModal";
import AuthModal from "@/components/AuthModal";
import RequirementFormModal from "@/components/RequirementFormModal";
import { 
  ChatMessage, 
  LeadRequirements, 
  LeadScoreBreakdown, 
  RecommendationItem, 
  Property,
  Lead
} from "@/lib/types";
import { Currency } from "@/lib/currency";
import { api } from "@/lib/api";
import { getSystemTimezoneLabel } from "@/lib/timezone";

export default function AssistantPage() {
  const [currency, setCurrency] = useState<Currency>("AED");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI property advisor at Lyka Realty. Tell me what property you are looking for in Dubai, or click 'Fill Requirements Form' to specify detailed criteria."
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [leadId, setLeadId] = useState<number | undefined>(undefined);

  // Extracted Requirements & Score State
  const [requirements, setRequirements] = useState<LeadRequirements>({
    customer_name: null,
    email: null,
    phone: null,
    lead_type: "Buyer",
    purpose: null,
    city: "Dubai",
    currency: "AED",
    preferred_features: []
  });
  const [leadScore, setLeadScore] = useState<LeadScoreBreakdown>({
    total_score: 30,
    category: "LOW",
    badge: "❄️ LOW PRIORITY",
    explanation: "Initial consultation. Stated budget, preferred community, and move-in timeline are pending discovery.",
    factors: { budget_provided: 0, location_provided: 0, property_or_bedroom: 15, intent_confirmed: 15, timeline: 0, essential_preferences: 0 }
  });
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>(["customer_name", "contact_details", "budget", "locality", "purchase_timeline"]);

  // Modals State
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [selectedPropertyForVisit, setSelectedPropertyForVisit] = useState<Property | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");

  // Voice Interaction State
  const [isRecording, setIsRecording] = useState(false);
  const [voiceTranscriptPreview, setVoiceTranscriptPreview] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load real user details and lead from database on mount
  useEffect(() => {
    const initUserContext = async () => {
      const stored = localStorage.getItem("propai_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          const firstName = u.full_name ? u.full_name.split(" ")[0] : "";
          setRequirements((prev) => ({
            ...prev,
            customer_name: u.full_name || prev.customer_name,
            email: u.email || prev.email,
            phone: u.phone || prev.phone
          }));
          setMessages([
            {
              role: "assistant",
              content: `Hello${firstName ? ` ${firstName}` : ""}! I am your AI property advisor at Lyka Realty. Tell me what property you are looking for in Dubai, or click 'Fill Requirements Form' to specify detailed criteria.`
            }
          ]);

          // Fetch user's existing lead from database
          const existingLead = await api.getMyLead();
          if (existingLead) {
            setLeadId(existingLead.id);
            setRequirements({
              customer_name: existingLead.customer_name,
              email: existingLead.email,
              phone: existingLead.phone,
              lead_type: existingLead.lead_type || "Buyer",
              purpose: existingLead.purpose,
              city: existingLead.city || "Dubai",
              locality: existingLead.locality,
              property_type: existingLead.property_type,
              bhk: existingLead.bhk,
              budget_min: existingLead.budget_min,
              budget_max: existingLead.budget_max,
              purchase_timeline: existingLead.purchase_timeline,
              preferred_features: existingLead.preferred_features || []
            });
            if (existingLead.recommended_properties && existingLead.recommended_properties.length > 0) {
              setRecommendations(existingLead.recommended_properties);
            }
          }
        } catch {}
      }
    };
    initUserContext();
  }, []);

  // Initialize Web Speech API if supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setVoiceTranscriptPreview(current);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognition.onerror = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleStartVoice = () => {
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    setVoiceTranscriptPreview("");
    setIsRecording(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech recognition start failed:", e);
      }
    } else {
      alert("Voice recognition is not supported in this browser. Please use Chrome or Edge, or type your message instead.");
      setIsRecording(false);
    }
  };

  const handleSendVoiceMessage = () => {
    if (voiceTranscriptPreview && voiceTranscriptPreview.trim()) {
      const text = voiceTranscriptPreview.trim();
      setVoiceTranscriptPreview(null);
      sendMessage(text);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await api.sendChatMessage({
        message: text,
        conversation_id: conversationId,
        lead_id: leadId,
        existing_requirements: requirements
      });

      setConversationId(response.conversation_id);
      setLeadId(response.lead_id);
      setRequirements(response.extracted_requirements);
      setLeadScore(response.lead_score);
      setRecommendations(response.recommendations);
      setMissingFields(response.missing_fields);

      const asstMessage: ChatMessage = { role: "assistant", content: response.reply };
      setMessages((prev) => [...prev, asstMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I apologize, but I encountered an advisory synchronization error. Please try again or refine your query."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  const handleRequirementFormSuccess = (lead: Lead, recs: RecommendationItem[]) => {
    setLeadId(lead.id);
    setRecommendations(recs);
    setLeadScore({
      total_score: lead.lead_score,
      category: lead.lead_category,
      badge: lead.lead_category === "HIGH" || lead.lead_category === "HOT" ? "🔥 HIGH PRIORITY" : lead.lead_category === "MEDIUM" || lead.lead_category === "WARM" ? "⚡ MEDIUM PRIORITY" : "❄️ LOW PRIORITY",
      explanation: lead.lead_explanation || "Client requirements registered via verified form submission.",
      factors: {}
    });
    setRequirements({
      customer_name: lead.customer_name,
      email: lead.email,
      phone: lead.phone,
      lead_type: lead.lead_type || "Buyer",
      purpose: lead.purpose,
      city: lead.city,
      locality: lead.locality,
      property_type: lead.property_type,
      bhk: lead.bhk,
      budget_min: lead.budget_min,
      budget_max: lead.budget_max,
      purchase_timeline: lead.purchase_timeline,
      preferred_features: lead.preferred_features || []
    });

    const confirmationMsg: ChatMessage = {
      role: "assistant",
      content: `Thank you, ${lead.customer_name}! Your requirements for a ${lead.bhk !== null && lead.bhk !== undefined ? (lead.bhk === 0 ? "Studio" : lead.bhk + " BHK ") : ""}${lead.property_type || "property"} in ${lead.locality || "Dubai"} have been securely registered. I have displayed your top matching properties on the right.`
    };
    setMessages((prev) => [...prev, confirmationMsg]);
  };

  const sampleSuggestions = [
    "2 BHK apartment in Dubai Marina under 1.5M AED",
    "3 BHK villa in Palm Jumeirah with sea view",
    "1 BHK in Business Bay for investment high ROI",
    "Studio in Downtown Dubai under 1M AED"
  ];

  return (
    <div className="min-h-screen bg-[#090A0D] text-zinc-100 flex flex-col selection:bg-[#C5A869]/30">
      <Navbar
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        onOpenAuth={(mode) => {
          if (mode) setAuthModalMode(mode);
          setAuthModalOpen(true);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Header Bar */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/30">
                <Sparkles className="w-5 h-5 text-[#C5A869]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  Lyka PropAI Conversational Advisory
                </h1>
                <p className="text-xs text-zinc-400">
                  Voice & NLP Advisory • Real Inventory Database Matching • Dubai, UAE
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {getSystemTimezoneLabel()} • DB: Dubai (GST)
            </span>
            {/* Pop-up Form Trigger Button */}
            <button
              type="button"
              onClick={() => setRequirementModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold text-xs flex items-center gap-1.5 shadow hover:opacity-95 transition"
            >
              <ClipboardList className="w-4 h-4" />
              <span>Fill Requirements Form</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Layout: Chat on Left (7 cols), Property Recommendations on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: Conversational Chat Interface */}
          <div className="lg:col-span-7 bg-[#111319] border border-zinc-800 rounded-2xl flex flex-col h-[750px] shadow-xl overflow-hidden">
            {/* Chat Messages Scroll Area */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#C5A869] to-[#9E8042] flex items-center justify-center flex-shrink-0 text-black shadow-md mt-1">
                      <Bot className="w-4 h-4 fill-black" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-[#C5A869] text-black font-medium rounded-tr-none shadow-md"
                        : "bg-[#181B24] text-zinc-200 border border-zinc-700/60 rounded-tl-none"
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.content}</p>
                  </div>

                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 text-zinc-300 mt-1">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-3 items-center text-zinc-400 text-xs py-2">
                  <div className="w-7 h-7 rounded-full bg-[#C5A869]/20 flex items-center justify-center text-[#C5A869] animate-spin">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </div>
                  <span>Searching matching properties in Dubai portfolio...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice Recording / Transcription Display */}
            {voiceTranscriptPreview !== null && (
              <div className="p-4 bg-[#161822] border-t border-amber-500/30">
                <div className="flex items-center justify-between text-xs text-[#E1CB8E] mb-1 font-mono">
                  <span className="flex items-center gap-1.5 font-bold">
                    <Volume2 className="w-4 h-4 text-[#C5A869]" /> Voice Transcription:
                  </span>
                  <button
                    onClick={() => setVoiceTranscriptPreview(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
                <div className="p-3 bg-zinc-900/90 rounded-xl border border-zinc-700 text-sm text-zinc-200 min-h-[48px]">
                  {voiceTranscriptPreview || <span className="text-zinc-500 italic">Listening... Speak your property requirements...</span>}
                </div>
                {voiceTranscriptPreview && (
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      onClick={handleSendVoiceMessage}
                      className="px-4 py-1.5 text-xs font-bold rounded-lg bg-[#C5A869] text-black hover:bg-[#E1CB8E] transition"
                    >
                      Send Voice Message →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Quick Suggestions & Form Shortcut */}
            <div className="px-4 py-2.5 bg-[#0E1016] border-t border-zinc-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setRequirementModalOpen(true)}
                className="px-3 py-1 rounded-full text-xs bg-[#C5A869] text-black font-bold hover:bg-[#E1CB8E] transition flex items-center gap-1 flex-shrink-0 shadow"
              >
                <ClipboardList className="w-3 h-3" />
                <span>Fill Form</span>
              </button>
              <span className="text-[10px] text-zinc-500 uppercase font-mono flex-shrink-0">Quick Prompts:</span>
              {sampleSuggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => sendMessage(s)}
                  className="px-2.5 py-1 rounded-full text-xs bg-zinc-800/90 hover:bg-[#C5A869]/20 text-zinc-300 hover:text-white border border-zinc-700/60 whitespace-nowrap transition flex-shrink-0"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Chat Input Controls (Text & Voice) */}
            <form onSubmit={handleTextSubmit} className="p-3 bg-[#0B0C11] border-t border-zinc-800 flex items-center gap-2">
              {/* Voice Button */}
              <button
                type="button"
                onClick={handleStartVoice}
                title={isRecording ? "Stop voice recording" : "Start Voice Input"}
                className={`p-3 rounded-xl transition-all flex items-center justify-center flex-shrink-0 ${
                  isRecording
                    ? "bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                    : "bg-zinc-800 hover:bg-[#C5A869]/20 text-[#C5A869] border border-zinc-700 hover:border-[#C5A869]"
                }`}
              >
                {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                placeholder="E.g. I need a 2 BHK apartment in Dubai Marina under 1.5M AED..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={loading}
                className="flex-1 bg-[#151720] border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869] transition"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={loading || !inputValue.trim()}
                className="p-3 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold hover:opacity-95 disabled:opacity-40 transition flex-shrink-0 shadow"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>

          {/* RIGHT: Real-Time Matching Properties Shelf ONLY */}
          <div className="lg:col-span-5 bg-[#111319] border border-zinc-800 rounded-2xl flex flex-col h-[750px] shadow-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 bg-[#0E1016] border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#C5A869]/20 text-[#C5A869] border border-[#C5A869]/30">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    Matching Properties
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    Real inventory matched to client requirements
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-[#C5A869]/20 text-[#E1CB8E] border border-[#C5A869]/30">
                  {recommendations.length} {recommendations.length === 1 ? "Match" : "Matches"}
                </span>
              </div>
            </div>

            {/* Scrollable Property Matches List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {recommendations.length === 0 ? (
                <div className="text-center py-16 px-4 rounded-xl bg-[#161822] border border-zinc-800 text-zinc-500 text-xs space-y-3 my-auto">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/80 flex items-center justify-center mx-auto text-zinc-400 border border-zinc-700">
                    <Building2 className="w-6 h-6 text-[#C5A869]" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-200 text-sm">No Properties Matched Yet</p>
                    <p className="mt-1 text-zinc-400 max-w-xs mx-auto leading-relaxed">
                      Tell our AI advisor what you are looking for in the chat, or fill out our specification form to view matching listings.
                    </p>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setRequirementModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition shadow inline-flex items-center gap-1.5"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      <span>Fill Requirements Form</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec) => (
                    <div
                      key={rec.property.id}
                      className="p-4 rounded-xl bg-[#161822] border border-zinc-800 hover:border-[#C5A869]/50 transition flex flex-col gap-3 shadow-md"
                    >
                      {/* Property Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-mono text-[#C5A869]">
                              {rec.property.locality}, {rec.property.city}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-mono">
                              Demo ID: #{rec.property.id}
                            </span>
                          </div>
                          <Link
                            href={`/properties/${rec.property.id}`}
                            className="font-bold text-sm text-white hover:text-[#E1CB8E] transition line-clamp-1"
                          >
                            {rec.property.title}
                          </Link>
                        </div>
                        <span className="px-2.5 py-1 rounded text-xs font-bold bg-[#C5A869] text-black font-mono flex-shrink-0 shadow">
                          {rec.match_score}% Match
                        </span>
                      </div>

                      {/* Property Specs */}
                      <div className="grid grid-cols-3 gap-1.5 text-[11px] font-mono">
                        <div className="p-1.5 bg-zinc-900 rounded border border-zinc-800 text-center">
                          <span className="text-zinc-500 block text-[9px]">Layout</span>
                          <span className="font-semibold text-white">{rec.property.bhk} BHK</span>
                        </div>
                        <div className="p-1.5 bg-zinc-900 rounded border border-zinc-800 text-center">
                          <span className="text-zinc-500 block text-[9px]">Bathrooms</span>
                          <span className="font-semibold text-white">{rec.property.bathrooms} Baths</span>
                        </div>
                        <div className="p-1.5 bg-zinc-900 rounded border border-zinc-800 text-center">
                          <span className="text-zinc-500 block text-[9px]">Area</span>
                          <span className="font-semibold text-white">{rec.property.super_area_sqft} sqft</span>
                        </div>
                      </div>

                      {/* Explainable Rationale */}
                      <div className="text-[11px] space-y-1 bg-black/40 p-2.5 rounded-lg border border-white/5">
                        <span className="font-semibold text-[#E1CB8E] block text-[10px] uppercase font-mono tracking-wider">
                          Why this matches customer requirements:
                        </span>
                        {rec.reasons.map((r, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-zinc-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            <span>{r}</span>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Price & Actions */}
                      <div className="flex items-center justify-between pt-1 border-t border-zinc-800/80">
                        <div>
                          <span className="text-[10px] text-zinc-500 block font-mono">Asking Price</span>
                          <span className="font-extrabold text-sm text-white">
                            {currency === "AED"
                              ? `AED ${rec.property.price.toLocaleString()}`
                              : `₹ ${(rec.property.price * 22.8 / 100000).toFixed(1)} Lakh`}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedPropertyForVisit(rec.property)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#C5A869] text-black hover:bg-[#E1CB8E] transition shadow"
                          >
                            Schedule Visit
                          </button>
                          <Link
                            href={`/properties/${rec.property.id}`}
                            className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700 transition"
                            title="View Full Listing"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Requirement Form Pop-up Modal */}
      <RequirementFormModal
        isOpen={requirementModalOpen}
        onClose={() => setRequirementModalOpen(false)}
        onSuccess={handleRequirementFormSuccess}
        initialRequirements={requirements}
      />

      {/* Schedule Visit Modal */}
      <ScheduleVisitModal
        property={selectedPropertyForVisit}
        isOpen={!!selectedPropertyForVisit}
        onClose={() => setSelectedPropertyForVisit(null)}
        leadId={leadId}
        onRequireRegister={() => {
          setSelectedPropertyForVisit(null);
          setAuthModalMode("register");
          setAuthModalOpen(true);
        }}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authModalMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
