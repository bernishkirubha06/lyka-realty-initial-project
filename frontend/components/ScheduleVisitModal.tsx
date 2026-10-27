"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Building2, 
  AlertCircle, 
  UserPlus, 
  PhoneCall 
} from "lucide-react";
import { Property } from "@/lib/types";
import { api } from "@/lib/api";
import CountryCodePicker from "./CountryCodePicker";
import { Country, DEFAULT_COUNTRY, validateTextOnly, validatePhoneNumber } from "@/lib/countries";
import { firebaseService } from "@/lib/firebase";

interface ScheduleVisitModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  leadId?: number;
  onSuccess?: () => void;
  onRequireRegister?: () => void;
}

export default function ScheduleVisitModal({
  property,
  isOpen,
  onClose,
  leadId,
  onSuccess,
  onRequireRegister
}: ScheduleVisitModalProps) {
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("11:00 AM");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minDate, setMinDate] = useState<string>("");

  useEffect(() => {
    setMinDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Check login and auto-fill from currently logged in user
  useEffect(() => {
    if (isOpen) {
      setSubmitted(false);
      setError(null);
      const stored = localStorage.getItem("propai_user");
      if (stored) {
        try {
          const u = JSON.parse(stored);
          setCurrentUser(u);
          if (u.full_name) setName(u.full_name);
          if (u.email) setEmail(u.email);
          if (u.phone) {
            const digits = u.phone.replace(/\D/g, "");
            setPhoneDigits(digits.slice(-9));
          }
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
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

  if (!isOpen || !property) return null;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/\d/.test(val)) {
      setNameError("Names must contain letters only (no numbers allowed).");
    } else {
      setNameError(null);
    }
    setName(val.replace(/[0-9]/g, ""));
  };

  const handlePhoneDigitsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const clean = rawVal.replace(/\D/g, "");
    setPhoneDigits(clean);

    if (clean) {
      const valResult = validatePhoneNumber(selectedCountry, clean);
      setPhoneError(valResult.isValid ? null : (valResult.error || "Invalid phone number."));
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If user is not authenticated, block submission
    if (!currentUser) {
      onRequireRegister?.();
      return;
    }

    const nameCheck = validateTextOnly(name);
    if (!nameCheck.isValid) {
      setError(nameCheck.error || "Please enter a valid full name (letters only).");
      return;
    }

    const phoneCheck = validatePhoneNumber(selectedCountry, phoneDigits);
    if (!phoneCheck.isValid) {
      setError(phoneCheck.error || "Please enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${selectedCountry.dialCode} ${phoneDigits.trim()}`;
      const customerName = name.trim() || currentUser?.full_name || "Interested Client";
      const customerEmail = email.trim() || currentUser?.email || undefined;
      const prefDate = date || "Next available date";

      const createdVisit = await api.requestSiteVisit({
        property_id: property.id,
        customer_name: customerName,
        contact_phone: fullPhone,
        contact_email: customerEmail,
        preferred_date: prefDate,
        preferred_time: time,
        notes: notes.trim() || undefined,
        lead_id: leadId
      });

      // Sync site visit and activity event to Firebase for Sales Person Dashboard
      try {
        await firebaseService.saveSiteVisit({
          id: String(createdVisit.id),
          customer_name: customerName,
          contact_phone: fullPhone,
          contact_email: customerEmail,
          property_id: property.id,
          property_title: property.title,
          property_locality: property.locality,
          property_price: property.price,
          property_image: property.image_url,
          preferred_date: prefDate,
          preferred_time: time,
          notes: notes.trim() || undefined,
          status: "pending"
        });

        await firebaseService.recordActivity({
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: fullPhone,
          activity_type: "site_visit_requested",
          property_id: property.id,
          property_title: property.title,
          property_locality: property.locality,
          property_price: property.price,
          property_image: property.image_url,
          details: `Requested viewing for ${property.title} on ${prefDate} at ${time}`
        });
      } catch (fbErr) {
        console.warn("Firebase sync note:", fbErr);
      }

      setSubmitted(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to schedule visit. Please try again.");
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
        className="relative w-full max-w-lg bg-[#111319] border border-[#C5A869]/40 rounded-2xl shadow-2xl p-6 sm:p-8 text-zinc-200 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          type="button"
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

          {!currentUser ? (
            /* Unregistered User Protection State */
            <div className="text-center py-6 sm:py-8 space-y-4">
              <div className="w-16 h-16 bg-[#C5A869]/20 text-[#E1CB8E] rounded-full flex items-center justify-center mx-auto border border-[#C5A869]/50 shadow-lg">
                <UserPlus className="w-8 h-8" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 mb-2 uppercase tracking-wider font-mono">
                  Registration Required
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-white">Please Register Your Account First</h3>
                <p className="text-zinc-300 text-xs sm:text-sm max-w-md mx-auto mt-2 leading-relaxed">
                  To schedule a private VIP tour for <span className="text-[#E1CB8E] font-semibold">{property.title}</span>, you must be a registered member.
                  Register your account first so our dedicated real estate advisor can confirm your viewing appointment and coordinate building security clearance.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onRequireRegister?.();
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-extrabold text-xs shadow-lg hover:opacity-95 transition"
                >
                  Go Register First →
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition border border-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : submitted ? (
            /* Submission Success State with Agent Call Notice */
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-[#C5A869]/20 text-[#E1CB8E] rounded-full flex items-center justify-center mx-auto border border-[#C5A869]/50 shadow-lg">
                <PhoneCall className="w-8 h-8 text-[#C5A869]" />
              </div>
              <h3 className="text-2xl font-bold text-white">VIP Site Visit Scheduled!</h3>
              <p className="text-zinc-300 text-sm max-w-md mx-auto leading-relaxed">
                Thank you, <strong className="text-white">{name}</strong>! Your private viewing request for <span className="text-[#E1CB8E] font-semibold">{property.title}</span> has been confirmed and recorded in our CRM system.
              </p>
              <div className="p-4 rounded-xl bg-[#15171F] border border-[#C5A869]/30 text-xs text-[#E1CB8E] max-w-md mx-auto text-left flex items-start gap-3">
                <span className="text-lg">📞</span>
                <div>
                  <p className="font-bold text-white">Dedicated Agent Calling Shortly</p>
                  <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                    Our assigned Lyka Realty agent will call you shortly on <span className="font-mono font-bold text-[#E1CB8E]">{selectedCountry.dialCode} {phoneDigits}</span> to confirm your appointment, visitor clearance, and arrange private property access.
                  </p>
                </div>
              </div>
              <div className="pt-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    onClose();
                  }}
                  className="px-6 py-2.5 rounded-xl bg-[#C5A869] text-black font-bold text-xs hover:bg-[#E1CB8E] transition shadow"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Scheduling Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-[#C5A869] uppercase tracking-wider font-mono">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>Lyka Private Property Tour</span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">Schedule VIP Viewing</h3>
                <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                  {property.title} • {property.locality}, {property.city}
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Preferred Date *</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#1A1D26] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Preferred Time *</label>
                  <div className="relative">
                    <Clock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <select
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-[#1A1D26] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869]"
                    >
                      <option>10:00 AM</option>
                      <option>11:00 AM</option>
                      <option>01:00 PM</option>
                      <option>03:00 PM</option>
                      <option>05:00 PM</option>
                      <option>06:30 PM (Sunset Viewing)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Full Name (Text Only) */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Full Name (Letters Only) *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={handleNameChange}
                    placeholder="Enter your full name"
                    className={`w-full bg-[#1A1D26] border ${
                      nameError ? "border-red-500" : "border-zinc-700"
                    } rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]`}
                  />
                </div>
                {nameError && (
                  <p className="text-[11px] text-red-400 mt-1">{nameError}</p>
                )}
              </div>

              {/* Phone / Landline with Country Code Picker */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Contact Phone / Landline (Numbers Only) *
                </label>
                <div className="flex gap-2">
                  <CountryCodePicker
                    selectedCountry={selectedCountry}
                    onSelectCountry={(c) => {
                      setSelectedCountry(c);
                      if (phoneDigits) {
                        const val = validatePhoneNumber(c, phoneDigits);
                        setPhoneError(val.isValid ? null : (val.error || null));
                      }
                    }}
                  />
                  <div className="relative flex-1">
                    <Phone className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={phoneDigits}
                      onChange={handlePhoneDigitsChange}
                      placeholder={selectedCountry.placeholder}
                      className={`w-full bg-[#1A1D26] border ${
                        phoneError ? "border-red-500" : "border-zinc-700"
                      } rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]`}
                    />
                  </div>
                </div>
                {phoneError && (
                  <p className="text-[11px] text-red-400 mt-1">{phoneError}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#1A1D26] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Special Viewing Requests</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Need driver pick-up, interpreter, evening viewing..."
                  className="w-full bg-[#1A1D26] border border-zinc-700 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C5A869]"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
                  <Clock className="w-3 h-3 text-[#C5A869]" />
                  Booking Real Time: Instant Reservation
                </span>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !!nameError || !!phoneError}
                    className="px-6 py-2 text-xs font-bold rounded-xl bg-[#C5A869] text-black hover:bg-[#E1CB8E] transition shadow disabled:opacity-50"
                  >
                    {loading ? "Scheduling..." : "Confirm Viewing Request"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    );
}
