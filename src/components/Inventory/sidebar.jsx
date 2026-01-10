"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Wrench, X, Menu, ShoppingCart, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function InventorySidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const itemClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
     active:scale-95 
     ${
       pathname === path
         ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
         : "text-neutral-400 hover:bg-neutral-800 hover:text-white active:bg-neutral-700"
     }`;

  return (
    <>
      {/* ===== Mobile Toggle Button ===== */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-neutral-900 text-white p-3 rounded-lg border border-neutral-700 shadow-lg hover:bg-neutral-800 active:scale-95 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      {/* ===== Overlay (mobile) ===== */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fadeIn"
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-64 sm:w-72 lg:w-60
        bg-neutral-950 border-r border-neutral-800 flex flex-col
        transition-transform duration-300 ease-in-out
        ${open ? "translate-x-0 shadow-2xl" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* HEADER */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">Inventory</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Stock Management</p>
            </div>

            {/* Close button - mobile only */}
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden text-neutral-400 hover:text-white hover:bg-neutral-800 p-1.5 rounded-md active:scale-95 transition-all duration-200"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          {/* NAV */}
          <nav className="space-y-2">
            <Link
              href="/inventory/full-chair"
              onClick={() => setOpen(false)}
              className={itemClass("/inventory/full-chair")}
            >
              <Package size={18} className="flex-shrink-0" />
              <span className="truncate">Full Chair</span>
            </Link>

            <Link
              href="/inventory/spare-parts"
              onClick={() => setOpen(false)}
              className={itemClass("/inventory/spare-parts")}
            >
              <Wrench size={18} className="flex-shrink-0" />
              <span className="truncate">Spare Parts</span>
            </Link>

            <Link
              href="/inventory/order"
              onClick={() => setOpen(false)}
              className={itemClass("/inventory/order")}
            >
              <ShoppingCart size={18} className="flex-shrink-0" />
              <span className="truncate">Incoming Orders</span>
            </Link>

            <Link
              href="/inventory/completed"
              onClick={() => setOpen(false)}
              className={itemClass("/inventory/completed")}
            >
              <CheckCircle size={18} className="flex-shrink-0" />
              <span className="truncate">Completed Orders</span>
            </Link>
          </nav>
        </div>

        {/* FOOTER - Sticky at bottom */}
        <div className="p-4 border-t border-neutral-800 bg-neutral-950">
          <p className="text-xs text-neutral-500 text-center">
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
          background: #404040;
          border-radius: 3px;
        }

        aside::-webkit-scrollbar-thumb:hover {
          background: #525252;
        }
      `}</style>
    </>
  );
}