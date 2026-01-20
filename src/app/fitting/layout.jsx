"use client";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";

export default function FittingLayout({ children }) {
  useIdleWorkTimer("Fitting");

  return (
    <ProtectedRoute allowedRoles={["fitting"]}>
      {children}
    </ProtectedRoute>
  );
}
