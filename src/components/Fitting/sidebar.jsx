"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Wrench,
  CheckCircle,
  RotateCcw,
  X,
  Menu,
  UserCircle,
  PackagePlus,
} from "lucide-react";
import { useState } from "react";

export default function FittingSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const itemClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
     active:scale-95 
     ${
       pathname === path
         ? "bg-[#c62d23] text-white shadow-md"
         : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 active:bg-gray-200"
     }`;

  return (
    <div className="lg:w-64 flex-shrink-0">
      {/* This div reserves space for the sidebar on desktop */}
      {/* ===== Mobile Toggle Button ===== */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white text-gray-900 p-3 rounded-xl border border-gray-200 shadow-lg hover:bg-gray-50 active:scale-95 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ===== Overlay (mobile) ===== */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 sm:w-72 lg:w-64
  bg-white border-r border-gray-200 flex flex-col
  transition-transform duration-300 ease-in-out
  ${open ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* HEADER */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-10 h-10 bg-[#c62d23] rounded-xl flex items-center justify-center">
                  <Wrench size={20} className="text-white" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Fitting</h2>
              </div>
              <p className="text-xs text-gray-500 ml-12">Fitting Department</p>
            </div>
            <button
              onClick={() => router.push("/profile")}
              title="My Profile"
              className="text-gray-600 top-2 hover:text-[#c62d23] transition"
            >
              <UserCircle size={34} />
            </button>
            {/* Close button - mobile only */}
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden text-gray-400 hover:text-gray-900 hover:bg-gray-100 p-1.5 rounded-lg active:scale-95 transition-all duration-200"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* NAV */}
          <nav className="space-y-2">
            <Link
              href="/fitting"
              onClick={() => setOpen(false)}
              className={itemClass("/fitting")}
            >
              <Wrench size={18} className="flex-shrink-0" />
              <span className="truncate">Fitting</span>
            </Link>

            <Link
              href="/fitting/task"
              onClick={() => setOpen(false)}
              className={itemClass("/fitting/task")}
            >
              <CheckCircle size={18} className="flex-shrink-0" />
              <span className="truncate">My Tasks</span>
            </Link>

            <Link
              href="/fitting/requestInventory"
              onClick={() => setOpen(false)}
              className={itemClass("/fitting/requestInventory")}
            >
              <PackagePlus size={18} className="flex-shrink-0" />
              <span className="truncate">Request Inventory</span>
            </Link>
            <Link
              href="/fitting/Return-orders"
              onClick={() => setOpen(false)}
              className={itemClass("/fitting/Return-orders")}
            >
              <RotateCcw size={18} className="flex-shrink-0" />
              <span className="truncate">Return Orders</span>
            </Link>
          </nav>
        </div>

        {/* FOOTER */}
        <div className="p-5 pt-1 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              localStorage.removeItem("token");
              window.location.href = "/login";
            }}
            className="w-full text-left py-3 px-5 text-sm text-gray-600 rounded-md hover:bg-red-100 hover:text-red-500 transition-colors "
          >
            Logout
          </button>
          <p className="text-xs text-gray-500 text-center font-medium">
            Army Industry © 2026
          </p>
        </div>
      </aside>

      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        /* Custom scrollbar for sidebar */
        aside::-webkit-scrollbar {
          width: 6px;
        }

        aside::-webkit-scrollbar-track {
          background: transparent;
        }

        aside::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 3px;
        }

        aside::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
      `}</style>
    </div>
  );
}
