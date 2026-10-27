"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Lock, 
  Mail, 
  User, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  UserPlus, 
  LogIn, 
  MapPin, 
  Globe, 
  Calendar,
  AlertCircle,
  ShieldCheck,
  Briefcase,
  Users,
  CheckCircle2,
  ChevronDown,
  Eye,
  EyeOff
} from "lucide-react";
import { api } from "@/lib/api";
import CountryCodePicker from "./CountryCodePicker";
import { 
  Country, 
  COUNTRIES, 
  DEFAULT_COUNTRY, 
  validateTextOnly, 
  validatePhoneNumber 
} from "@/lib/countries";
import { 
  APPROVED_SALES_PERSONS, 
  APPROVED_SALES_MANAGER, 
  APPROVED_ADMIN, 
  isAuthorizedStaffEmail,
  getStaffProfileByEmail
} from "@/lib/staff";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
  onSuccess?: () => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  initialMode = "login",
  onSuccess
}: AuthModalProps) {
  // Navigation: "customer" vs "staff" page
  const [page, setPage] = useState<"customer" | "staff">("customer");

  // Customer Mode: "login" vs "register"
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  // Staff Selected Role
  const [staffRole, setStaffRole] = useState<"agent" | "manager" | "admin">("agent");

  // Customer Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Customer Registration Profile Details
  const [fullName, setFullName] = useState("");
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  
  const [selectedCountry, setSelectedCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [phoneDigits, setPhoneDigits] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const [countryOfResidence, setCountryOfResidence] = useState<string>("United Arab Emirates");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState<"Male" | "Female" | "Prefer not to say">("Male");
  const [dob, setDob] = useState("");
  const [dobError, setDobError] = useState<string | null>(null);
  const [maxDobDate, setMaxDobDate] = useState<string>("");

  // Staff Credentials
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");

  // Show/Hide Password States
  const [showPassword, setShowPassword] = useState(false);
  const [showStaffPassword, setShowStaffPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPage("customer");
      setMode(initialMode);
      setFormError(null);
      setShowPassword(false);
      setShowStaffPassword(false);
      setMaxDobDate(new Date().toISOString().split("T")[0]);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, initialMode]);

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

  // Handle Full Name Input (Text only - rejects numbers)
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (/\d/.test(val)) {
      setFullNameError("Names must contain letters only (no numbers allowed).");
    } else {
      setFullNameError(null);
    }
    setFullName(val.replace(/[0-9]/g, ""));
  };

  // Handle Phone Number Input (Numbers only - rejects non-digits)
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

  // Handle Date of Birth Change
  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDob(val);
    if (val) {
      const selectedDate = new Date(val);
      const today = new Date();
      if (selectedDate > today) {
        setDobError("Date of Birth cannot be in the future.");
      } else {
        setDobError(null);
      }
    } else {
      setDobError(null);
    }
  };

  // Handle Customer Submit
  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (mode === "register") {
      const nameCheck = validateTextOnly(fullName);
      if (!nameCheck.isValid) {
        setFormError(nameCheck.error || "Please enter a valid full name with letters only.");
        return;
      }

      const phoneCheck = validatePhoneNumber(selectedCountry, phoneDigits);
      if (!phoneCheck.isValid) {
        setFormError(phoneCheck.error || "Please enter a valid phone number.");
        return;
      }

      if (!address.trim()) {
        setFormError("Street address is required to register your client profile.");
        return;
      }

      if (!dob) {
        setFormError("Please enter your Date of Birth.");
        return;
      }
      if (new Date(dob) > new Date()) {
        setFormError("Date of Birth cannot be in the future.");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "login") {
        const cleanEmail = email.trim().toLowerCase();
        const cleanPassword = password.trim();
        const res = await api.login({ email: cleanEmail, password: cleanPassword });

        // If credentials belong to a staff member, redirect to staff portal page
        if (res.user.role === "admin" || res.user.role === "manager" || res.user.role === "agent") {
          setPage("staff");
          setStaffRole(res.user.role as any);
          setStaffEmail(cleanEmail);
          setStaffPassword(cleanPassword);
          setFormError("Staff account recognized. Please sign in via the Staff & Enterprise Portal.");
          setLoading(false);
          return;
        }

        window.location.href = "/dashboard";
      } else {
        const fullPhoneNumber = `${selectedCountry.dialCode} ${phoneDigits.trim()}`;
        await api.register({
          email: email.trim().toLowerCase(),
          password: password.trim(),
          full_name: fullName.trim(),
          phone: fullPhoneNumber,
          role: "customer",
          address: address.trim(),
          country: countryOfResidence,
          gender,
          dob
        });
        window.location.href = "/dashboard";
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Staff Submit with Strict Email Allowlist Validation
  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanEmail = staffEmail.trim().toLowerCase();
    const cleanPassword = staffPassword.trim();

    if (!cleanEmail) {
      setFormError("Please enter your corporate work email.");
      return;
    }

    if (!cleanPassword) {
      setFormError("Please enter your account password.");
      return;
    }

    // 1. Strict email allowlist validation:
    // Only 12 Sales Persons, 1 Sales Manager, 1 Administrator
    if (!isAuthorizedStaffEmail(cleanEmail, staffRole)) {
      if (staffRole === "agent") {
        setFormError("Access Restricted: Only the 12 authorized Lyka Realty sales person emails are permitted (e.g. rajesh.sharma@lykarealty.ae, sarah.jenkins@lykarealty.ae).");
      } else if (staffRole === "manager") {
        setFormError("Access Restricted: Only the authorized Sales Manager (fatima.alzaabi@lykarealty.ae) is permitted.");
      } else {
        setFormError("Access Restricted: Only the authorized System Administrator (alexander.vance@lykarealty.ae) is permitted.");
      }
      return;
    }

    setLoading(true);

    try {
      const res = await api.login({ email: cleanEmail, password: cleanPassword });

      // Enforce strict role authorization checks
      if (staffRole === "admin" && res.user.role !== "admin") {
        throw new Error("Access restricted: Administrator credentials required for this role.");
      }
      if (staffRole === "manager" && res.user.role !== "manager" && res.user.role !== "admin") {
        throw new Error("Access restricted: Sales Manager credentials required for this role.");
      }
      if (staffRole === "agent" && res.user.role !== "agent" && res.user.role !== "manager" && res.user.role !== "admin") {
        throw new Error("This account is not authorized as a Sales Person.");
      }

      // Route by authenticated role
      if (res.user.role === "admin") {
        window.location.href = "/admin";
      } else if (res.user.role === "manager") {
        window.location.href = "/manager";
      } else if (res.user.role === "agent") {
        window.location.href = "/sales";
      } else {
        window.location.href = "/dashboard";
      }
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setFormError(err.message || "Staff authentication failed. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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

        {/* ============================================================ */}
        {/* PAGE 1: CUSTOMER SIGN IN & REGISTRATION                      */}
        {/* ============================================================ */}
        {page === "customer" && (
          <div>
            {/* Customer Header */}
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-[#C5A869]" />
                Lyka Realty • Customer Portal
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {mode === "login" ? "Customer Sign In" : "Register Customer Account"}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                {mode === "login"
                  ? "Sign in to access your saved properties, requirement overview, and scheduled site visits."
                  : "Create your verified investor profile to save properties and schedule private VIP viewings."}
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Customer Modal Tabs */}
            <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-5">
              <button
                type="button"
                onClick={() => { setMode("login"); setFormError(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  mode === "login" 
                    ? "bg-[#C5A869] text-black shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setFormError(null); }}
                className={`py-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  mode === "register" 
                    ? "bg-[#C5A869] text-black shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register Account</span>
              </button>
            </div>

            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              {mode === "register" && (
                <>
                  {/* Full Name */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-zinc-300">
                        Full Name <span className="text-[#C5A869]">*</span>
                      </label>
                      <span className="text-[10px] text-zinc-500 font-mono">Letters only</span>
                    </div>
                    <div className="relative">
                      <User className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Johnathan Smith"
                        value={fullName}
                        onChange={handleNameChange}
                        className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                      />
                    </div>
                    {fullNameError && (
                      <p className="text-[11px] text-red-400 mt-1">{fullNameError}</p>
                    )}
                  </div>

                  {/* Gender and DOB Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Gender <span className="text-[#C5A869]">*</span>
                      </label>
                      <select
                        value={gender}
                        onChange={(e: any) => setGender(e.target.value)}
                        className="w-full bg-[#181A24] border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Date of Birth <span className="text-[#C5A869]">*</span>
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="date"
                          required
                          max={maxDobDate}
                          value={dob}
                          onChange={handleDobChange}
                          className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869] [color-scheme:dark]"
                        />
                      </div>
                      {dobError && (
                        <p className="text-[11px] text-red-400 mt-1">{dobError}</p>
                      )}
                    </div>
                  </div>

                  {/* Country of Residence & Dial Code Phone */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Country of Residence <span className="text-[#C5A869]">*</span>
                      </label>
                      <div className="relative">
                        <Globe className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                        <select
                          value={countryOfResidence}
                          onChange={(e) => {
                            const newCName = e.target.value;
                            setCountryOfResidence(newCName);
                            const match = COUNTRIES.find((c) => c.name === newCName);
                            if (match) setSelectedCountry(match);
                          }}
                          className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.name}>
                              {c.name} ({c.dialCode})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-zinc-300">
                          Mobile or Landline Number <span className="text-[#C5A869]">*</span>
                        </label>
                        <span className="text-[10px] text-zinc-500 font-mono">Numbers only</span>
                      </div>
                      <div className="flex gap-2">
                        <CountryCodePicker
                          selectedCountry={selectedCountry}
                          onSelectCountry={(c) => {
                            setSelectedCountry(c);
                            setCountryOfResidence(c.name);
                            if (phoneDigits) {
                              const valResult = validatePhoneNumber(c, phoneDigits);
                              setPhoneError(valResult.isValid ? null : (valResult.error || null));
                            }
                          }}
                        />

                        <div className="relative flex-1">
                          <input
                            type="tel"
                            required
                            placeholder={`e.g. ${selectedCountry.placeholder}`}
                            value={phoneDigits}
                            onChange={handlePhoneDigitsChange}
                            className={`w-full bg-[#181A24] border rounded-xl px-3 py-2 text-sm text-white focus:outline-none font-mono ${
                              phoneError ? "border-red-500" : "border-zinc-700 focus:border-[#C5A869]"
                            }`}
                          />
                        </div>
                      </div>
                      {phoneError ? (
                        <p className="text-[11px] text-red-400 mt-1">{phoneError}</p>
                      ) : (
                        <p className="text-[10px] text-zinc-500 mt-1 font-mono">
                          Accepts valid numbers ({selectedCountry.minDigits}–{selectedCountry.maxDigits} digits for {selectedCountry.name}).
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Residential Address <span className="text-[#C5A869]">*</span>
                      </label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          placeholder="e.g. Villa 42, Al Barsha 1, Dubai"
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Email Address <span className="text-[#C5A869]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="your.email@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Password <span className="text-[#C5A869]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition p-0.5 rounded focus:outline-none cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || (mode === "register" && (!!fullNameError || !!phoneError || !!dobError))}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold text-sm hover:opacity-95 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {loading 
                      ? "Authenticating securely..." 
                      : mode === "login" 
                      ? "Sign In to Customer Account" 
                      : "Create Customer Account"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Bottom Toggle switch */}
            <div className="mt-4 pt-3 border-t border-zinc-800 text-center text-xs text-zinc-400">
              {mode === "login" ? (
                <p>
                  No account created yet?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("register"); setFormError(null); }}
                    className="text-[#E1CB8E] hover:underline font-semibold"
                  >
                    Register new customer profile
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => { setMode("login"); setFormError(null); }}
                    className="text-[#E1CB8E] hover:underline font-semibold"
                  >
                    Sign In to existing account
                  </button>
                </p>
              )}
            </div>

            {/* Arrow Button to navigate to Staff Portal */}
            <div className="mt-5 pt-4 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setPage("staff");
                  setStaffRole("agent");
                  setStaffEmail(APPROVED_SALES_PERSONS[0].email);
                  setStaffPassword("password123");
                  setFormError(null);
                }}
                className="w-full p-3.5 rounded-xl bg-gradient-to-r from-[#141620] to-[#181A24] border border-[#C5A869]/30 hover:border-[#C5A869]/80 flex items-center justify-between text-left transition group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#C5A869]/15 border border-[#C5A869]/30 flex items-center justify-center text-[#E1CB8E]">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#E1CB8E] transition">
                      Staff &amp; Enterprise Portal
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      12 Sales Persons • 1 Sales Manager • 1 Administrator
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E1CB8E]">
                  <span>Staff Sign In</span>
                  <ArrowRight className="w-4 h-4 text-[#C5A869] group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PAGE 2: STAFF ENTERPRISE SIGN IN POPUP                       */}
        {/* ============================================================ */}
        {page === "staff" && (
          <div>
            {/* Top Navigation Back Arrow */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setPage("customer");
                  setFormError(null);
                }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-[#E1CB8E] transition cursor-pointer group"
              >
                <ArrowLeft className="w-4 h-4 text-[#C5A869] group-hover:-translate-x-1 transition-transform" />
                <span>Back to Customer Sign In</span>
              </button>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30">
                Staff Portal
              </span>
            </div>

            {/* Staff Header */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-[#C5A869]" />
                Lyka Realty • Enterprise Gateway
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Staff Enterprise Sign In
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Restricted access: 12 Sales Persons, 1 Sales Manager, and 1 Administrator.
              </p>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Role Selection Tabs (NO EMOJIS) */}
            <div className="grid grid-cols-3 p-1 bg-zinc-900 rounded-xl border border-zinc-800 mb-3">
              <button
                type="button"
                onClick={() => { 
                  setStaffRole("agent"); 
                  setStaffEmail(APPROVED_SALES_PERSONS[0].email);
                  setStaffPassword("password123");
                  setFormError(null); 
                }}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  staffRole === "agent" 
                    ? "bg-[#C5A869] text-black shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>Sales Person</span>
              </button>
              <button
                type="button"
                onClick={() => { 
                  setStaffRole("manager"); 
                  setStaffEmail(APPROVED_SALES_MANAGER.email);
                  setStaffPassword("password123");
                  setFormError(null); 
                }}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  staffRole === "manager" 
                    ? "bg-[#C5A869] text-black shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Sales Manager</span>
              </button>
              <button
                type="button"
                onClick={() => { 
                  setStaffRole("admin"); 
                  setStaffEmail(APPROVED_ADMIN.email);
                  setStaffPassword("password123");
                  setFormError(null); 
                }}
                className={`py-2 px-1 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  staffRole === "admin" 
                    ? "bg-[#C5A869] text-black shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Administrator</span>
              </button>
            </div>

            {/* Roster Information Card per Role */}
            {staffRole === "agent" && (
              <div className="mb-3.5 p-3 rounded-xl bg-[#151720] border border-zinc-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-zinc-300">
                    Authorized Sales Executives (12 Official Members):
                  </label>
                  <span className="text-[10px] text-[#C5A869] font-mono font-bold px-1.5 py-0.5 rounded bg-[#C5A869]/15 border border-[#C5A869]/30">
                    12 Active Roster
                  </span>
                </div>
                <div className="relative">
                  <select
                    value={staffEmail}
                    onChange={(e) => {
                      setStaffEmail(e.target.value);
                      setStaffPassword("password123");
                      setFormError(null);
                    }}
                    className="w-full bg-[#181A24] border border-zinc-700 hover:border-[#C5A869]/60 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-[#C5A869] appearance-none cursor-pointer"
                  >
                    {APPROVED_SALES_PERSONS.map((sp, idx) => (
                      <option key={sp.email} value={sp.email}>
                        {idx + 1}. {sp.name} — {sp.email} ({sp.specialty})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-2.5 pointer-events-none" />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  Only these 12 approved corporate emails are granted access to the Sales Person CRM workspace.
                </p>
              </div>
            )}

            {staffRole === "manager" && (
              <div className="mb-3.5 p-3 rounded-xl bg-[#151720] border border-purple-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">Authorized Sales Manager:</span>
                  <span className="text-[10px] text-purple-300 font-mono font-bold px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-800">
                    1 Person Authorized
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#181A24] border border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{APPROVED_SALES_MANAGER.name}</div>
                    <div className="text-[11px] text-[#E1CB8E] font-mono">{APPROVED_SALES_MANAGER.email}</div>
                    <div className="text-[10px] text-zinc-400">{APPROVED_SALES_MANAGER.title} • {APPROVED_SALES_MANAGER.phone}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffEmail(APPROVED_SALES_MANAGER.email);
                      setStaffPassword("password123");
                      setFormError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-[#C5A869] hover:text-black text-zinc-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Use Email
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  Only Fatima Al-Zaabi ({APPROVED_SALES_MANAGER.email}) is authorized to access the Sales Manager Portal.
                </p>
              </div>
            )}

            {staffRole === "admin" && (
              <div className="mb-3.5 p-3 rounded-xl bg-[#151720] border border-amber-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-white">Authorized Administrator:</span>
                  <span className="text-[10px] text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800">
                    1 Person Authorized
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-[#181A24] border border-zinc-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{APPROVED_ADMIN.name}</div>
                    <div className="text-[11px] text-[#E1CB8E] font-mono">{APPROVED_ADMIN.email}</div>
                    <div className="text-[10px] text-zinc-400">{APPROVED_ADMIN.title} • {APPROVED_ADMIN.phone}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffEmail(APPROVED_ADMIN.email);
                      setStaffPassword("password123");
                      setFormError(null);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-[#C5A869] hover:text-black text-zinc-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Use Email
                  </button>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">
                  Only Alexander Vance ({APPROVED_ADMIN.email}) is authorized to access the Administrator Console.
                </p>
              </div>
            )}

            {/* Staff Credentials Form */}
            <form onSubmit={handleStaffSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Work Email Address <span className="text-[#C5A869]">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder={
                      staffRole === "admin" 
                        ? "alexander.vance@lykarealty.ae" 
                        : staffRole === "manager" 
                        ? "fatima.alzaabi@lykarealty.ae" 
                        : "rajesh.sharma@lykarealty.ae"
                    }
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                  />
                </div>
                {staffEmail.trim() && (
                  <div className="mt-1.5">
                    {isAuthorizedStaffEmail(staffEmail.trim(), staffRole) ? (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>
                          Approved corporate email: {getStaffProfileByEmail(staffEmail.trim())?.name || staffEmail}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-red-400">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                        <span>
                          Unauthorized email. Allowed: {staffRole === "agent" ? "12 specific sales persons" : staffRole === "manager" ? "1 sales manager" : "1 admin"}.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Password <span className="text-[#C5A869]">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type={showStaffPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full bg-[#181A24] border border-zinc-700 rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none focus:border-[#C5A869]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStaffPassword(!showStaffPassword)}
                    tabIndex={-1}
                    title={showStaffPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-white transition p-0.5 rounded focus:outline-none cursor-pointer"
                  >
                    {showStaffPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#F3E5AB] via-[#C5A869] to-[#9E8042] text-black font-bold text-sm hover:opacity-95 transition shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>
                    {loading 
                      ? "Verifying staff credentials..." 
                      : staffRole === "admin" 
                      ? "Sign In as Administrator" 
                      : staffRole === "manager" 
                      ? "Sign In as Sales Manager" 
                      : "Sign In as Sales Person"}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Bottom Return to Customer Sign In Link */}
            <div className="mt-5 pt-3 border-t border-zinc-800 text-center text-xs text-zinc-400">
              <button
                type="button"
                onClick={() => {
                  setPage("customer");
                  setFormError(null);
                }}
                className="inline-flex items-center gap-1.5 text-[#E1CB8E] hover:underline font-semibold cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Customer Sign In &amp; Registration</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
