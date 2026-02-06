"use client";

import ProductionSidebar from "@/components/production/sidebar";
import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";

export default function ProductionLayout({ children }) {
  useIdleWorkTimer("Production");

  return (
    <ProtectedRoute allowedRoles={["production"]}>
      <div className="flex h-screen overflow-hidden bg-gray-50">

        {/* SIDEBAR */}
        <div className="z-40">
          <ProductionSidebar />
        </div>

        {/* MAIN CONTENT */}
        <main className="flex-1 h-screen overflow-y-auto lg:ml-64">
          {children}
        </main>

      </div>
    </ProtectedRoute>
  );
}
