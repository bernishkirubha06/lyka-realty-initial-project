import React from "react";
import Link from "next/link";
import { MapPin, Phone, Mail, Globe, Shield, Sparkles } from "lucide-react";
import LykaLogo from "./LykaLogo";

export default function Footer() {
  return (
    <footer className="bg-[#060709] border-t border-[#1F222B] text-zinc-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand info */}
          <div className="lg:col-span-2 space-y-4">
            <LykaLogo size="md" />
            <p className="text-zinc-400 text-sm leading-relaxed max-w-sm mt-3">
              Lyka Realty is Dubai's premier luxury real estate brokerage and advisory. 
              Powered by PropAI, our platform connects global and NRI investors with 
              exceptional residential assets across Dubai and India.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#C5A869]/15 text-[#E1CB8E] border border-[#C5A869]/30">
                <Shield className="w-3.5 h-3.5" />
                RERA Certified Agency • Dubai, UAE
              </span>
            </div>
          </div>

          {/* Prime Communities */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wide uppercase mb-4 font-mono">
              Prime Communities
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/properties?locality=Downtown+Dubai" className="hover:text-[#E1CB8E] transition">Downtown Dubai</Link></li>
              <li><Link href="/properties?locality=Palm+Jumeirah" className="hover:text-[#E1CB8E] transition">Palm Jumeirah</Link></li>
              <li><Link href="/properties?locality=Dubai+Marina" className="hover:text-[#E1CB8E] transition">Dubai Marina</Link></li>
              <li><Link href="/properties?locality=Business+Bay" className="hover:text-[#E1CB8E] transition">Business Bay</Link></li>
              <li><Link href="/properties?locality=Dubai+Hills+Estate" className="hover:text-[#E1CB8E] transition">Dubai Hills Estate</Link></li>
            </ul>
          </div>

          {/* PropAI Platform */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wide uppercase mb-4 font-mono">
              PropAI Features
            </h4>
            <ul className="space-y-2.5 text-xs sm:text-sm">
              <li><Link href="/assistant" className="hover:text-[#E1CB8E] transition flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-[#C5A869]" /> Conversational Voice AI</Link></li>
              <li><Link href="/assistant" className="hover:text-[#E1CB8E] transition">Automated Property Advisory</Link></li>
              <li><Link href="/properties" className="hover:text-[#E1CB8E] transition">Weighted Recommendation Engine</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#E1CB8E] transition">Customer Advisory Hub</Link></li>
              <li><Link href="/dashboard" className="hover:text-[#E1CB8E] transition">Saved Listings &amp; Visits</Link></li>
            </ul>
          </div>

          {/* Contact Details from lykarealty.ae */}
          <div>
            <h4 className="text-white font-semibold text-sm tracking-wide uppercase mb-4 font-mono">
              Dubai Headquarters
            </h4>
            <ul className="space-y-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#C5A869] flex-shrink-0 mt-0.5" />
                <span>Office 1002, DAMAC Executive Heights, Barsha Heights, Dubai, UAE</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#C5A869] flex-shrink-0" />
                <a href="tel:+97144567890" className="hover:text-[#E1CB8E] transition">+971 4 456 7890</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-[#C5A869] flex-shrink-0" />
                <a href="mailto:concierge@lykarealty.ae" className="hover:text-[#E1CB8E] transition">concierge@lykarealty.ae</a>
              </li>
              <li className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#C5A869] flex-shrink-0" />
                <a href="https://lykarealty.ae" target="_blank" rel="noopener noreferrer" className="hover:text-[#E1CB8E] transition">
                  lykarealty.ae
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#1A1D24] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© 2026 Lyka Realty (lykarealty.ae) &amp; PropAI. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>RERA Broker No. 49210</span>
            <Link href="/properties" className="hover:text-zinc-400">Inventory</Link>
            <Link href="/assistant" className="hover:text-zinc-400">AI Assistant</Link>
            <Link href="/dashboard" className="hover:text-zinc-400">Client Dashboard</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
