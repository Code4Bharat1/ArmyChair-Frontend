"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import Dashboard from "@/components/Superadmin/dashboard";

export default function AdminDashboardWrapper() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user"));

    // ❌ Not logged in
    if (!token || !user) {
      router.replace("/login");
      return;
    }

    // ❌ Logged in but not admin
    if (user.role !== "admin") {
      router.replace("/login");
      return;
    }

    // ✅ Admin verified
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-[#c62d23]" size={40} />
      </div>
    );
  }

  return <Dashboard />;
}
