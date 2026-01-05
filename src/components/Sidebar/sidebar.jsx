"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const pathname = usePathname();

  const menuItem = (href) =>
    `w-full block px-6 py-2.5 text-sm transition
     ${
       pathname === href
         ? "bg-amber-600 text-white border-l-4 border-amber-500"
         : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
     }`;

  return (
    <div className="w-55 bg-neutral-950 border-r border-neutral-800 relative">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-xl font-bold text-white">Army Industry</h1>
      </div>

      {/* Navigation */}
      <nav className="">
        {/* MAIN MENU */}
        <div className="mb-6">
          <div className="px-5 mb-10 border-b border-amber-600">

          </div>

          <Link href="/" className={menuItem("/")}>
            Dashboard
          </Link>

          <Link href="/inventory" className={menuItem("/inventory")}>
            Inventory
          </Link>

          <Link href="/order" className={menuItem("/order")}>
            Sales Orders
          </Link>

          <Link href="/vendors" className={menuItem("/vendors")}>
            Vendors
          </Link>
        </div>

        {/* OPERATIONS */}
        <div className="mb-6">
          <div className="px-6 mb-2">
            <h2 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
              Operations
            </h2>
          </div>

          <Link href="/returns" className={menuItem("/returns")}>
            Returns
          </Link>

          <Link href="/defects" className={menuItem("/defects")}>
            Defects
          </Link>

          <Link href="/reports" className={menuItem("/reports")}>
            Reports
          </Link>
        </div>
      </nav>

      {/* Footer */}
      <div className="absolute bottom-0 w-full border-t border-neutral-800">
        <Link
          href="/settings"
          className="block px-6 py-3 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
        >
          Settings
        </Link>

        <Link
          href="/logout"
          className="block px-6 py-3 text-sm text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
        >
          Logout
        </Link>
      </div>
    </div>
  );
}
