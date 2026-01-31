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
  X,
} from "lucide-react";

export default function InventorySidebar({ onClose }) {
  const pathname = usePathname();

  const menuItem = (href) =>
    `w-full flex items-center gap-3 px-4 sm:px-6 py-3 text-sm font-medium transition-all duration-200
     ${
       pathname === href
         ? "bg-[#fef2f2] text-[#991b1b] border-l-4 border-[#c62d23] shadow-sm"
         : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
     }`;

  const handleLinkClick = () => {
    // Close sidebar on mobile when a link is clicked
    if (onClose && typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <div className="w-64 sm:w-72 lg:w-64 bg-white border-r border-gray-200 shadow-sm relative h-screen flex-shrink-0 flex flex-col">
      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        className="lg:hidden absolute top-4 right-4 text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors z-10"
        aria-label="Close sidebar"
      >
        <X size={20} />
      </button>

      {/* Logo */}
      <div className="p-4 sm:p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#c62d23] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
            <Package size={16} className="text-white sm:w-5 sm:h-5" />
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-gray-900">Inventory</h1>
        </div>
        <p className="text-xs text-gray-500 ml-10 sm:ml-12">Stock Management</p>
      </div>

      {/* Navigation */}
      <nav className="p-3 sm:p-4 space-y-1 overflow-y-auto flex-1">
        <Link 
          href="/inventory/full-chair" 
          className={menuItem("/inventory/full-chair")}
          onClick={handleLinkClick}
        >
          <Package size={18} className="flex-shrink-0" />
          <span className="truncate">Full Chair</span>
        </Link>

        <Link 
          href="/inventory/spare-parts" 
          className={menuItem("/inventory/spare-parts")}
          onClick={handleLinkClick}
        >
          <Wrench size={18} className="flex-shrink-0" />
          <span className="truncate">Spare Parts</span>
        </Link>

        <Link 
          href="/inventory/order" 
          className={menuItem("/inventory/order")}
          onClick={handleLinkClick}
        >
          <ShoppingCart size={18} className="flex-shrink-0" />
          <span className="truncate">Incoming Orders</span>
        </Link>

        <Link 
          href="/inventory/completed" 
          className={menuItem("/inventory/completed")}
          onClick={handleLinkClick}
        >
          <CheckCircle size={18} className="flex-shrink-0" />
          <span className="truncate">Completed Orders</span>
        </Link>

        <Link 
          href="/inventory/transfer" 
          className={menuItem("/inventory/transfer")}
          onClick={handleLinkClick}
        >
          <ArrowLeftRight size={18} className="flex-shrink-0" />
          <span className="truncate">Transfer</span>
        </Link>

        <Link 
          href="/inventory/inward-pending" 
          className={menuItem("/inventory/inward-pending")}
          onClick={handleLinkClick}
        >
          <FileCheck size={18} className="flex-shrink-0" />
          <span className="truncate">Pending Approval</span>
        </Link>

        <Link 
          href="/inventory/task" 
          className={menuItem("/inventory/task")}
          onClick={handleLinkClick}
        >
          <ClipboardList size={18} className="flex-shrink-0" />
          <span className="truncate">My Tasks</span>
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <button
          onClick={() => {
            localStorage.removeItem("token");
            window.location.href = "/login";
          }}
          className="w-full text-left px-4 sm:px-6 py-3 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors font-medium"
        >
          Logout
        </button>
        <p className="px-4 sm:px-6 py-2 sm:py-3 text-xs text-gray-500 text-center font-medium border-t border-gray-200">
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

        /* Hide scrollbar for Firefox */
        nav {
          scrollbar-width: thin;
          scrollbar-color: #d1d5db transparent;
        }
      `}</style>
    </div>
  );
}