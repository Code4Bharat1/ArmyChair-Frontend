"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Wrench, X, Menu } from "lucide-react";
import { useState } from "react";

export default function InventorySidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const itemClass = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition
     ${
       pathname === path
         ? "bg-amber-600 text-white"
         : "text-neutral-400 hover:bg-neutral-800 hover:text-white"
     }`;

  return (
    <>
      {/* ===== Mobile Toggle Button ===== */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-neutral-900 text-white p-2 rounded-md border border-neutral-700"
      >
        <Menu size={20} />
      </button>

      {/* ===== Overlay (mobile) ===== */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* ===== Sidebar ===== */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-60 min-w-[240px]
        bg-neutral-950 border-r border-neutral-800 p-4 flex flex-col
        transition-transform duration-300
        ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* HEADER */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Inventory</h2>
            <p className="text-xs text-neutral-500">Stock Management</p>
          </div>

          {/* close btn mobile */}
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden text-neutral-400 hover:text-white"
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
            <Package size={18} />
            Full Chair
          </Link>

          <Link
            href="/inventory/spare-parts"
            onClick={() => setOpen(false)}
            className={itemClass("/inventory/spare-parts")}
          >
            <Wrench size={18} />
            Spare Parts
          </Link>

                    <Link
            href="/inventory/order"
            onClick={() => setOpen(false)}
            className={itemClass("/inventory/order")}
          >
            <Wrench size={18} />
            Incoming Sales Orders
          </Link>
                              <Link
            href="/inventory/completed"
            onClick={() => setOpen(false)}
            className={itemClass("/inventory/completed")}
          >
            <Wrench size={18} />
            Completed Orders
          </Link>
        </nav>

        {/* FOOTER */}
        <div className="mt-auto pt-6 border-t border-neutral-800 text-xs text-neutral-500">
          Army Industry © 2026
        </div>
      </aside>
    </>
  );
}
