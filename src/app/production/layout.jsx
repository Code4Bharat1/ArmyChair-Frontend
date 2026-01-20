"use client";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";

export default function ProductionLayout({ children }) {
  useIdleWorkTimer("Production");

  return (
    <ProtectedRoute allowedRoles={["production"]}>
      {children}
    </ProtectedRoute>
  );
}
