"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Package,
  Wrench,
  History,
  Users,
  CheckSquare,
  RockingChair,
  Menu,
  X,
  LogOut,
} from "lucide-react";

export default function SalesSidebar() {
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
    setIsOpen(false); // Close sidebar on mobile when a link is clicked
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <>
      {/* MOBILE HAMBURGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md border border-gray-200 hover:bg-gray-50 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <X size={24} className="text-gray-900" />
        ) : (
          <Menu size={24} className="text-gray-900" />
        )}
      </button>

      {/* OVERLAY FOR MOBILE */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          w-64 bg-white border-r border-gray-200 h-screen flex flex-col shadow-lg lg:shadow-sm
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        {/* HEADER */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Sales</h2>
              <p className="text-xs text-gray-500 mt-1">Sales Management</p>
            </div>
            {/* Close button for mobile - only shows when sidebar is open */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link
            href="/sales/order"
            className={itemClass("/sales/order")}
            onClick={handleLinkClick}
          >
            <Package size={18} />
            Orders
          </Link>

          <Link
            href="/sales/fullChair"
            className={itemClass("/sales/fullChair")}
            onClick={handleLinkClick}
          >
            <RockingChair size={18} />
            Full Chair
          </Link>

          <Link
            href="/sales/Spare"
            className={itemClass("/sales/Spare")}
            onClick={handleLinkClick}
          >
            <Wrench size={18} />
            Spare Parts
          </Link>

          <Link
            href="/sales/history"
            className={itemClass("/sales/history")}
            onClick={handleLinkClick}
          >
            <History size={18} />
            History
          </Link>

          <Link
            href="/sales/task"
            className={itemClass("/sales/task")}
            onClick={handleLinkClick}
          >
            <CheckSquare size={18} />
            My Tasks
          </Link>

          <Link
            href="/sales/Client-List"
            className={itemClass("/sales/Client-List")}
            onClick={handleLinkClick}
          >
            <Users size={18} />
            Client List
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors rounded-lg"
          >
            <LogOut size={18} />
            Logout
          </button>
          <p className="text-xs text-gray-500 text-center mt-3">
            Army Industry © 2026
          </p>
        </div>
      </div>
    </>
  );
}