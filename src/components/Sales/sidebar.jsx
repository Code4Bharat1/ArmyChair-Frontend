"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Wrench, History, Users, CheckSquare } from "lucide-react";

export default function SalesSidebar() {
  const pathname = usePathname();

  const itemClass = (path) =>
    `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-2
     ${pathname === path
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
        <Link href="/sales/order" className={itemClass("/sales/order")}>
          <Package size={18} />
          Orders
        </Link>

        <Link href="/sales/fullChair" className={itemClass("/sales/fullChair")}>
          <Package size={18} />
          Full Chair
        </Link>

        <Link
          href="/sales/Spare"
          className={itemClass("/sales/Spare")}
        >
          <Wrench size={18} />
          Spare Parts
        </Link>

        <Link href="/sales/history" className={itemClass("/sales/history")}>
          <History size={18} />
          History
        </Link>

        <Link href="/sales/task" className={itemClass("/sales/task")}>
          <CheckSquare size={18} />
          My Tasks
        </Link>

        <Link
          href="/sales/Client-List"
          className={itemClass("/sales/Client-List")}
        >
          <Users size={18} />
          Client List
        </Link>
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-gray-200 text-xs text-gray-500 text-center">
        Army Industry © 2026
      </div>
    </div>
  );
}
