"use client";

import ProtectedRoute from "@/components/ProtectedRoutes/ProtectedRoutes.jsx";
import useIdleWorkTimer from "@/hooks/useIdleWorkTimer";
import SalesSidebar from "@/components/Sales/sidebar";

export default function SalesLayout({ children }) {
  useIdleWorkTimer("Sales");

  return (
    <ProtectedRoute allowedRoles={["sales"]}>
     <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <SalesSidebar />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        {/* Add padding on mobile to account for hamburger button */}
        <div className="lg:pl-0 pl-0">
          {children}
        </div>
      </div>
    </div>
    </ProtectedRoute>
  );
}
