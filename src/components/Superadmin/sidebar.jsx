"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NotificationBell from "@/components/notifications/NotificationBell";
import {
  LayoutDashboard,
  Armchair,
  Wrench,
  ShoppingCart,
  RotateCcw,
  Users,
  ClipboardCheck,
  Activity,
  LogOut,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
const menuItem = (href) =>

    `w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200
     ${
       pathname === href
         ? "bg-[#fef2f2] text-[#991b1b] border-l-4 border-[#c62d23] shadow-sm"
         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
     }`;

  return (
    <div className="w-64 bg-white border-r border-gray-200 shadow-sm relative h-screen overflow-visible">

      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span className="text-gray-900">Army</span>
          <span className="text-[#c62d23]">Industry</span>
        </h1>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto pb-24">
        <Link href="/superadmin/dashboard" className={menuItem("/superadmin/dashboard")}>
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        <Link href="/superadmin/inventory" className={menuItem("/superadmin/inventory")}>
          <Armchair size={18} />
          Chair Inventory
        </Link>

        <Link href="/superadmin/spareparts" className={menuItem("/superadmin/spareparts")}>
          <Wrench size={18} />
          Parts Inventory
        </Link>

        <Link href="/superadmin/order" className={menuItem("/superadmin/order")}>
          <ShoppingCart size={18} />
          Orders
        </Link>

        <Link href="/superadmin/return" className={menuItem("/superadmin/return")}>
          <RotateCcw size={18} />
          Returns
        </Link>

        <Link href="/superadmin/staff" className={menuItem("/superadmin/staff")}>
          <Users size={18} />
          Staff
        </Link>

        <Link href="/superadmin/task" className={menuItem("/superadmin/task")}>
          <ClipboardCheck size={18} />
          Assign Tasks
        </Link>

        <Link href="/superadmin/activity" className={menuItem("/superadmin/activity")}>
          <Activity size={18} />
          Activity
        </Link>
      </nav>

      {/* 🔔 NOTIFICATION BELL */}
      <div className="absolute top-4 right-3">
        <NotificationBell />
      </div>

      {/* Footer */}
      <div className="absolute bottom-0 w-full border-t border-gray-200 bg-gray-50">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="w-full flex items-center gap-3 text-left px-6 py-3 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors border-t border-gray-200"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}
