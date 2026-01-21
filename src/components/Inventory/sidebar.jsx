"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  Wrench,
  ShoppingCart,
  CheckCircle,
  ArrowLeftRight,
  ClipboardList,
  FileCheck,
} from "lucide-react";

export default function InventorySidebar() {
  const pathname = usePathname();

  const menuItem = (href) =>
    `w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200
     ${
       pathname === href
         ? "bg-[#fef2f2] text-[#991b1b] border-l-4 border-[#c62d23] shadow-sm"
         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
     }`;

  return (
    <div className="w-64 bg-white border-r border-gray-200 shadow-sm relative h-screen flex-shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-10 h-10 bg-[#c62d23] rounded-xl flex items-center justify-center">
            <Package size={20} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Inventory</h1>
        </div>
        <p className="text-xs text-gray-500 ml-12">Stock Management</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
        <Link href="/inventory/full-chair" className={menuItem("/inventory/full-chair")}>
          <Package size={18} className="flex-shrink-0" />
          <span className="truncate">Full Chair</span>
        </Link>

        <Link href="/inventory/spare-parts" className={menuItem("/inventory/spare-parts")}>
          <Wrench size={18} className="flex-shrink-0" />
          <span className="truncate">Spare Parts</span>
        </Link>

        <Link href="/inventory/order" className={menuItem("/inventory/order")}>
          <ShoppingCart size={18} className="flex-shrink-0" />
          <span className="truncate">Incoming Orders</span>
        </Link>

        <Link href="/inventory/completed" className={menuItem("/inventory/completed")}>
          <CheckCircle size={18} className="flex-shrink-0" />
          <span className="truncate">Completed Orders</span>
        </Link>

        <Link href="/inventory/transfer" className={menuItem("/inventory/transfer")}>
          <ArrowLeftRight size={18} className="flex-shrink-0" />
          <span className="truncate">Transfer</span>
        </Link>

        <Link href="/inventory/inward-pending" className={menuItem("/inventory/inward-pending")}>
          <FileCheck size={18} className="flex-shrink-0" />
          <span className="truncate">Pending Approval</span>
        </Link>

        <Link href="/inventory/task" className={menuItem("/inventory/task")}>
          <ClipboardList size={18} className="flex-shrink-0" />
          <span className="truncate">My Tasks</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full border-t border-gray-200 bg-gray-50">
        <p className="px-6 py-3 text-xs text-gray-500 text-center font-medium">
          Army Industry © 2026
        </p>
      </div>

      <style jsx global>{`
        /* Custom scrollbar for sidebar nav */
        nav::-webkit-scrollbar {
          width: 6px;
        }

        nav::-webkit-scrollbar-track {
          background: transparent;
        }

        nav::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        nav::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}