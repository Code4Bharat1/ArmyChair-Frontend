"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProtectedRoute({ allowedRoles = [], children }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.replace("/login");
      return;
    }

    try {
      const user = JSON.parse(userStr);

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user.role)
      ) {
        router.replace("/login");
        return;
      }

      setChecking(false);
    } catch (err) {
      console.error("Protected Routes error:", err);
      router.replace("/login");
    }
  }, [router, allowedRoles]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900">
        <Loader2 size={40} className="animate-spin text-amber-600" />
      </div>
    );
  }

  return children;
}
