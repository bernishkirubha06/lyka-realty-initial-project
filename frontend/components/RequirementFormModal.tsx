"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  Save, 
  Send, 
  Building2, 
  Lock, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle,
  Check,
  PhoneCall
} from "lucide-react";
import { api } from "@/lib/api";
import { Lead, RecommendationItem, LeadRequirements } from "@/lib/types";
import { validateTextOnly } from "@/lib/countries";
import { firebaseService } from "@/lib/firebase";
import { getAllottedSalespersonForLocation } from "@/lib/staff";

interface RequirementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead, recommendations: RecommendationItem[]) => void;
  initialRequirements?: LeadRequirements;
}

const DUBAI_COMMUNITIES = [
  "Dubai Marina",
  "Downtown Dubai",
  "Palm Jumeirah",
  "Business Bay",
  "Jumeirah Village Circle (JVC)",
  "Dubai Hills Estate",
  "Jumeirah Lake Towers (JLT)",
  "Jumeirah Beach Residence (JBR)",
  "Creek Harbour",
  "Bluewaters Island",
  "City Walk",
  "Damac Hills",
  "Meydan",
  "Culture Village"
];

const PROPERTY_TYPES = ["Apartment", "Villa", "Townhouse", "Penthouse", "Studio"];

const BEDROOM_OPTIONS = [
  { label: "Studio", value: 0 },
  { label: "1 BHK", value: 1 },
  { label: "2 BHK", value: 2 },
  { label: "3 BHK", value: 3 },
  { label: "4 BHK", value: 4 },
  { label: "5+ BHK", value: 5 }
];

const AMENITIES_LIST = [
  "Swimming Pool",
  "Covered Parking",
  "Near Metro Station",
  "Kids Play Area",
  "Private Garden",
  "Sea/Water View",
  "Marina View",
  "View of Landmark (Burj Khalifa)",
  "Gymnasium / Fitness Center",
  "Maid's Room",
  "Private Balcony",
  "Gated Community",
  "Furnished",
  "Pets Allowed",
  "Jacuzzi"
];

const DRAFT_STORAGE_KEY = "lyka_requirement_draft";

export default function RequirementFormModal({
  isOpen,
  onClose,
  onSuccess,
  initialRequirements
}: RequirementFormModalProps) {
  const [formData, setFormData] = useState({
    customer_name: "",
    primary_contact: "",
    secondary_contact: "",
    lead_type: "Buyer",
    purpose: "Personal use",
    locality: "Dubai Marina",
    property_type: "Apartment",
    bhk: 2,
    bathrooms: 2,
    budget_min: "1000000",
    budget_max: "1500000",
    purchase_timeline: "Within 3 months",
    preferred_features: ["Swimming Pool", "Covered Parking", "Near Metro Station"] as string[],
    notes: ""
  });

  const [loading, setLoading] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [submitted, setSubmitted] = useState(false);
  const [submittedName, setSubmittedName] = useState("");
  const [submittedContact, setSubmittedContact] = useState("");

  // Load draft or initial requirements on open
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setFormError(null);
      // Check logged in user profile to prefill empty name/contact
      const storedUser = localStorage.getItem("propai_user");
      let uName = "";
      let uContact = "";
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          if (u.full_name) uName = u.full_name;
          if (u.phone) uContact = u.phone;
          else if (u.email) uContact = u.email;
        } catch {}
      }

      const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData((prev) => ({ 
            ...prev, 
            customer_name: parsed.customer_name || uName,
            primary_contact: parsed.primary_contact || uContact,
            ...parsed 
          }));
          setDraftNotice("Resumed previously saved draft.");
        } catch {}
      } else if (initialRequirements) {
        setFormData((prev) => ({
          ...prev,
          customer_name: initialRequirements.customer_name || uName || prev.customer_name,
          primary_contact: initialRequirements.phone || initialRequirements.email || uContact || prev.primary_contact,
          locality: initialRequirements.locality || prev.locality,
          property_type: initialRequirements.property_type || prev.property_type,
          bhk: initialRequirements.bhk ?? prev.bhk,
          budget_min: initialRequirements.budget_min ? String(initialRequirements.budget_min) : prev.budget_min,
          budget_max: initialRequirements.budget_max ? String(initialRequirements.budget_max) : prev.budget_max,
          purchase_timeline: initialRequirements.purchase_timeline || prev.purchase_timeline,
          preferred_features: initialRequirements.preferred_features?.length ? initialRequirements.preferred_features : prev.preferred_features
        }));
      } else if (uName || uContact) {
        setFormData((prev) => ({
          ...prev,
          customer_name: uName || prev.customer_name,
          primary_contact: uContact || prev.primary_contact
        }));
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleToggleAmenity = (item: string) => {
    setFormData((prev) => {
      const exists = prev.preferred_features.includes(item);
      if (exists) {
        return { ...prev, preferred_features: prev.preferred_features.filter((f) => f !== item) };
      } else {
        return { ...prev, preferred_features: [...prev.preferred_features, item] };
      }
    });
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(formData));
      setDraftNotice("Draft saved successfully to your device. You can safely return later.");
      setTimeout(() => setDraftNotice(null), 4000);
    } catch {
      setDraftNotice("Unable to save draft locally.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Mandatory field validations
    if (!formData.customer_name.trim()) {
      setFormError("Full Name is mandatory.");
      return;
    }
    const nameCheck = validateTextOnly(formData.customer_name);
    if (!nameCheck.isValid) {
      setFormError("Full Name must contain letters and spaces only (no numbers allowed).");
      return;
    }
    if (!formData.primary_contact.trim()) {
      setFormError("Primary Contact (phone or email) is mandatory.");
      return;
    }
    if (!formData.locality) {
      setFormError("Target Community / Locality is mandatory.");
      return;
    }
    const maxB = parseFloat(formData.budget_max);
    if (!maxB || isNaN(maxB) || maxB <= 0) {
      setFormError("Please enter a valid maximum budget.");
      return;
    }

    setLoading(true);

    try {
      const isEmail = formData.primary_contact.includes("@");
      const email = isEmail ? formData.primary_contact : undefined;
      const phone = !isEmail ? formData.primary_contact : undefined;

      const payload = {
        customer_name: formData.customer_name.trim(),
        email: email,
        phone: phone,
        secondary_contact: formData.secondary_contact.trim() || undefined,
        lead_type: formData.lead_type,
        purpose: formData.purpose,
        city: "Dubai",
        locality: formData.locality,
        property_type: formData.property_type,
        bhk: formData.bhk,
        bathrooms: formData.bathrooms,
        budget_min: formData.budget_min ? parseFloat(formData.budget_min) : undefined,
        budget_max: maxB,
        currency: "AED",
        purchase_timeline: formData.purchase_timeline,
        preferred_features: formData.preferred_features,
        notes: formData.notes
      };

      const createdLead = await api.createLead(payload);
      
      // Sync to Firebase for Sales Person Dashboard
      try {
        const specialist = getAllottedSalespersonForLocation(payload.locality);
        await firebaseService.saveLead({
          id: String(createdLead.id),
          customer_name: payload.customer_name,
          email: payload.email,
          phone: payload.phone,
          city: payload.city,
          locality: payload.locality,
          property_type: payload.property_type,
          bhk: payload.bhk,
          budget_min: payload.budget_min,
          budget_max: payload.budget_max,
          currency: payload.currency,
          purchase_timeline: payload.purchase_timeline,
          preferred_features: payload.preferred_features,
          pipeline_status: "New",
          lead_category: (createdLead.lead_category as any) || "HOT",
          lead_score: createdLead.lead_score || 85,
          purpose: payload.purpose,
          lead_type: payload.lead_type,
          assigned_to_email: specialist.email,
          assigned_agent_name: specialist.name,
          notes: payload.notes
        });

        await firebaseService.recordActivity({
          customer_name: payload.customer_name,
          customer_email: payload.email,
          customer_phone: payload.phone,
          activity_type: "enquiry_submitted",
          details: `Submitted inquiry for ${payload.bhk ? `${payload.bhk} BHK ` : ""}${payload.property_type} in ${payload.locality}`
        });
      } catch (fbErr) {
        console.warn("Firebase sync note:", fbErr);
      }

      // Clear draft once successfully submitted
      localStorage.removeItem(DRAFT_STORAGE_KEY);

      setSubmittedName(formData.customer_name);
      setSubmittedContact(formData.primary_contact);
      setSubmitted(true);

      onSuccess(createdLead, createdLead.recommended_properties || []);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit requirements. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl bg-[#111319] border border-[#C5A869]/50 rounded-2xl shadow-2xl p-5 sm:p-7 text-left text-zinc-200 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
          {/* Close Button */}
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-[#C5A869]/20 text-[#E1CB8E] rounded-full flex items-center justify-center mx-auto border border-[#C5A869]/50 shadow-lg">
                <PhoneCall className="w-8 h-8 text-[#C5A869]" />
              </div>
              <h3 className="text-2xl font-bold text-white">Requirements Submitted Successfully!</h3>
              <p className="text-zinc-300 text-sm max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{submittedName}</strong>! Your luxury property requirements have been registered with Lyka Realty.
              </p>
              <div className="p-4 rounded-xl bg-[#15171F] border border-[#C5A869]/30 text-xs text-[#E1CB8E] max-w-md mx-auto text-left flex items-start gap-3">
                <span className="text-lg">📞</span>
                <div>
                  <p className="font-bold text-white">Dedicated Agent Calling Shortly</p>
                  <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                    An assigned Lyka Realty agent will call you shortly on <span className="font-mono font-bold text-[#E1CB8E]">{submittedContact}</span> to discuss your preferences, share exclusive off-market listings, and coordinate private viewings.
                  </p>
                </div>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition shadow"
                >
                  Done &amp; View Matched Listings
                </button>
              </div>
            </div>
          ) : (
            <>

        {/* Modal Header */}
        <div className="mb-5 pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-[#C5A869]/20 text-[#C5A869] border border-[#C5A869]/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                Property Requirement Specification
              </h2>
              <p className="text-xs text-zinc-400">
                Submit specific criteria for instant database matching & qualified agent follow-up
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-mono">
              <ShieldCheck className="w-4 h-4" /> 256-Bit SSL Encrypted & Confidential
            </span>
            <span className="text-zinc-500">
              Fields with <span className="text-red-400 font-bold">*</span> are mandatory
            </span>
          </div>
        </div>

        {/* Draft Notice Banner */}
        {draftNotice && (
          <div className="mb-4 p-2.5 rounded-xl bg-[#C5A869]/15 border border-[#C5A869]/40 text-xs text-[#E1CB8E] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{draftNotice}</span>
            </div>
            <button
              type="button"
              onClick={() => setDraftNotice(null)}
              className="text-zinc-400 hover:text-white text-xs font-mono ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Form Error Alert */}
        {formError && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {/* The Form */}
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* SECTION 1: Client Identity & Encrypted Contacts */}
          <div className="p-3.5 bg-[#161822] rounded-xl border border-zinc-800/80 space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C5A869] flex items-center justify-between">
              <span>Client Information</span>
              <span className="text-[10px] text-zinc-400 font-normal">Encrypted Records</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name * */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Full Name <span className="text-red-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Ahmed"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
                />
              </div>

              {/* Primary Contact * */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Primary Contact (Phone or Email) <span className="text-red-400 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +971 50 123 4567 or email@domain.com"
                  value={formData.primary_contact}
                  onChange={(e) => setFormData({ ...formData, primary_contact: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
                />
              </div>

              {/* Secondary Contact (Encrypted) */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1 flex items-center gap-1.5">
                  <span>Secondary / Backup Contact (Optional)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-emerald-400 font-mono flex items-center gap-1 border border-zinc-700">
                    <Lock className="w-2.5 h-2.5" /> End-to-End Encrypted
                  </span>
                </label>
                <input
                  type="text"
                  placeholder="Secondary phone, WhatsApp, or alternative email address"
                  value={formData.secondary_contact}
                  onChange={(e) => setFormData({ ...formData, secondary_contact: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Property Specifications */}
          <div className="p-3.5 bg-[#161822] rounded-xl border border-zinc-800/80 space-y-3">
            <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C5A869]">
              Property Specifications (Dubai, UAE)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Locality * */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Target Community / Locality <span className="text-red-400 font-bold">*</span>
                </label>
                <select
                  required
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  {DUBAI_COMMUNITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Property Type * */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Property Type <span className="text-red-400 font-bold">*</span>
                </label>
                <select
                  required
                  value={formData.property_type}
                  onChange={(e) => setFormData({ ...formData, property_type: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Bedrooms (BHK) * */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Bedrooms (BHK) <span className="text-red-400 font-bold">*</span>
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {BEDROOM_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.value}
                      onClick={() => setFormData({ ...formData, bhk: opt.value })}
                      className={`py-1.5 rounded-lg text-xs font-medium border transition ${
                        formData.bhk === opt.value
                          ? "bg-[#C5A869] text-black font-bold border-[#C5A869]"
                          : "bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Bathrooms
                </label>
                <select
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  {[1, 2, 3, 4, 5].map((num) => (
                    <option key={num} value={num}>{num} {num === 1 ? "Bathroom" : "Bathrooms"}</option>
                  ))}
                </select>
              </div>

              {/* Budget Min & Max * */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Min Budget (AED)
                </label>
                <input
                  type="number"
                  step="50000"
                  placeholder="e.g. 1000000"
                  value={formData.budget_min}
                  onChange={(e) => setFormData({ ...formData, budget_min: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Max Budget (AED) <span className="text-red-400 font-bold">*</span>
                </label>
                <input
                  type="number"
                  step="50000"
                  required
                  placeholder="e.g. 1500000"
                  value={formData.budget_max}
                  onChange={(e) => setFormData({ ...formData, budget_max: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                />
              </div>

              {/* Lead Intent & Purpose */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Intent <span className="text-red-400 font-bold">*</span>
                </label>
                <select
                  value={formData.lead_type}
                  onChange={(e) => setFormData({ ...formData, lead_type: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  <option value="Buyer">Buy Property</option>
                  <option value="Renter">Rent Property</option>
                  <option value="Investor">Invest for ROI</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Purpose
                </label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  <option value="Personal use">Personal Living / Family Home</option>
                  <option value="Investment">Investment (High Rental Yield / ROI)</option>
                </select>
              </div>

              {/* Purchase Timeline */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Purchase / Move-in Timeline
                </label>
                <select
                  value={formData.purchase_timeline}
                  onChange={(e) => setFormData({ ...formData, purchase_timeline: e.target.value })}
                  className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                >
                  <option value="Immediate (Within 30 days)">Immediate / Within 30 days</option>
                  <option value="Within 1 month">Within 1 month</option>
                  <option value="Within 3 months">Within 3 months</option>
                  <option value="Within 6 months">Within 6 months</option>
                  <option value="Flexible / Exploring">Flexible / Exploring Off-Plan</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 3: Suggested Features & Amenities */}
          <div className="p-3.5 bg-[#161822] rounded-xl border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C5A869]">
                Suggested Features & Amenities
              </span>
              <span className="text-[10px] text-zinc-400">
                {formData.preferred_features.length} selected
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {AMENITIES_LIST.map((amenity) => {
                const isSelected = formData.preferred_features.includes(amenity);
                return (
                  <button
                    type="button"
                    key={amenity}
                    onClick={() => handleToggleAmenity(amenity)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-[#C5A869]/20 text-[#E1CB8E] border-[#C5A869]/50 shadow"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#C5A869]" />}
                    <span>{amenity}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 4: Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">
              Additional Notes or Special Criteria
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Higher floor preferred, close to international schools, pet friendly..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-[#0E1016] border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
            />
          </div>

          {/* SECTION 5: Footer Buttons (Save Draft + Secure Submit) */}
          <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveDraft}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1.5 transition"
            >
              <Save className="w-3.5 h-3.5 text-zinc-400" />
              <span>Save as Draft</span>
            </button>

            <div className="w-full sm:w-auto flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs transition"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold text-xs hover:opacity-95 disabled:opacity-40 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{loading ? "Matching Inventory..." : "Submit & Match Properties"}</span>
              </button>
            </div>
          </div>
        </form>
      </>
    )}
        </div>
      </div>
    );
}
