"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AgentRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/sales");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090A0D] flex items-center justify-center text-zinc-400 text-sm font-mono">
      Redirecting to Sales Dashboard...
    </div>
  );
}
