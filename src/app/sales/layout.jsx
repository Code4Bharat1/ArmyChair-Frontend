"use client";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";

export default function SalesLayout({ children }) {
  useIdleWorkTimer("Sales");

  return (
    <ProtectedRoute allowedRoles={["sales"]}>
      {children}
    </ProtectedRoute>
  );
}
