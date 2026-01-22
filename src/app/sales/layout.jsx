"use client";

import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";
import SalesSidebar from "@/components/Sales/sidebar";

export default function SalesLayout({ children }) {
  useIdleWorkTimer("Sales");

  return (
    <ProtectedRoute allowedRoles={["sales"]}>
      <div className="flex h-screen overflow-hidden">
        {/* SIDEBAR */}
        <aside className="fixed left-0 top-0 h-screen w-64 bg-white shadow-md z-40">
          <SalesSidebar />
        </aside>

        {/* MAIN */}
        <main className="ml-64 flex-1 h-screen overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}
