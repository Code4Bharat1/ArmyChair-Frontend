"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Package,
  Users,
  Menu,
  X,
} from "lucide-react";

export default function ProductionSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const itemClass = (path) =>
    `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200 rounded-lg mx-2
     ${
       pathname === path
         ? "bg-[#c62d23] text-white shadow-md"
         : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
     }`;

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={24} color="#1a1a1a" /> : <Menu size={24} color="#1a1a1a" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0
          h-screen w-64 bg-white border-r border-gray-200
          flex flex-col shadow-sm
          transform transition-transform duration-300 ease-in-out
          z-40
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Production</h2>
          <p className="text-xs text-gray-500 mt-1">
            Production Management
          </p>
        </div>

        {/* NAV */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            href="/production/incomingorders"
            className={itemClass("/production/incomingorders")}
            onClick={handleLinkClick}
          >
            <Users size={18} />
            Incoming Orders
          </Link>

          <Link
            href="/production/TransferRecords"
            className={itemClass("/production/TransferRecords")}
            onClick={handleLinkClick}
          >
            <Users size={18} />
            Transfer Records
          </Link>

          <Link
            href="/production/Inventory"
            className={itemClass("/production/Inventory")}
            onClick={handleLinkClick}
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
            className="w-full text-left px-6 py-3 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg"
          >
            Logout
          </button>
          Army Industry © 2026
        </div>
      </div>
    </>
  );
}
