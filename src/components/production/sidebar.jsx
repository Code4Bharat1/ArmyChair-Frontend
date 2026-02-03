"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Wrench,
  History,
  Users,
  CheckSquare,
  RockingChair,
} from "lucide-react";

export default function ProductionSidebar() {
  const pathname = usePathname();

  const itemClass = (path) =>
    `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-2
     ${
       pathname === path
         ? "bg-[#c62d23] text-white shadow-md"
         : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
     }`;

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-sm">
      {/* HEADER */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Sales</h2>
        <p className="text-xs text-gray-500 mt-1">Sales Management</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/production/incomingorders"
          className={itemClass("/production/incomingorders")}
        >
          <Users size={18} />
          Incoming Orders
        </Link>
        <Link
          href="/production/TransferRecords"
          className={itemClass("/production/TransferRecords")}
        >
          <Users size={18} />
          Transfer Records
        </Link>
        <Link
          href="/production/Inventory"
          className={itemClass("/production/Inventory")}
        >
          <Package size={18} />
          Inventory
        </Link>
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="w-full text-left px-6 py-3 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors "
        >
          Logout
        </button>
        Army Industry © 2026
      </div>
    </div>
  );
}
