"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/AuthModal";

export default function LoginPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(true);

  useEffect(() => {
    // If already logged in, redirect to appropriate view
    const stored = localStorage.getItem("propai_user");
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role === "admin") router.replace("/admin");
        else if (u.role === "manager") router.replace("/manager");
        else if (u.role === "agent") router.replace("/sales");
        else router.replace("/dashboard");
      } catch {}
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#090A0D] flex items-center justify-center p-4">
      <AuthModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          router.push("/");
        }}
        initialMode="login"
        onSuccess={() => {
          const stored = localStorage.getItem("propai_user");
          if (stored) {
            try {
              const u = JSON.parse(stored);
              if (u.role === "admin") router.push("/admin");
              else if (u.role === "manager") router.push("/manager");
              else if (u.role === "agent") router.push("/sales");
              else router.push("/dashboard");
              return;
            } catch {}
          }
          router.push("/dashboard");
        }}
      />
    </div>
  );
}
