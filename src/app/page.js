"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const user =
      typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("user"))
        : null;

    if (!token || !user) {
      router.replace("/login");
      return;
    }

    /* ===== ROLE BASED ROUTING ===== */
    if (user.role === "admin") {
      router.replace("/superadmin/dashboard");
    } else if (user.role === "warehouse") {
      router.replace("/inventory/full-chair");
    } else if (user.role === "fitting") {
      router.replace("/fitting");
    } else if (user.role === "sales") {
      router.replace("/sales");
    } else {
      router.replace("/login");
    }

    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-emerald-50 to-white">
        <Loader2 size={40} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return null;
}
