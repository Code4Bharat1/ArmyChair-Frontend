"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Wrench } from "lucide-react";

export default function SalesSidebar() {
  const pathname = usePathname();

  const itemClass = (path) =>
    `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-all duration-200
     ${
       pathname === path
         ? "bg-amber-100 text-amber-800 border-l-4 border-amber-600 shadow-sm"
         : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
     }`;

  return (
    <div className="w-60 bg-white border-r border-neutral-200 h-screen flex flex-col">
      {/* HEADER */}
      <div className="p-6 border-b border-neutral-100">
        <h2 className="text-xl font-bold text-neutral-900">Sales</h2>
        <p className="text-xs text-neutral-500 mt-1">Sales Management</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 p-4 space-y-1">
        <Link href="/sales/order" className={itemClass("/sales/order")}>
          <Package size={18} />
          Order
        </Link>

        <Link href="/sales/fullChair" className={itemClass("/sales/fullChair")}>
          <Package size={18} />
          Full Chair
        </Link>

        <Link
          href="/sales/spare-parts"
          className={itemClass("/sales/spare-parts")}
        >
          <Wrench size={18} />
          Spare Parts
        </Link>

        <Link href="/sales/history" className={itemClass("/sales/history")}>
          <Wrench size={18} />
          History
        </Link>

        <Link href="/sales/task" className={itemClass("/sales/task")}>
          <Wrench size={18} />
          My Tasks
        </Link>

        <Link
          href="/sales/Client-List"
          className={itemClass("/sales/Client-List")}
        >
          <Wrench size={18} />
          Client List
        </Link>
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-neutral-200 text-xs text-neutral-500 text-center">
        Army Industry © 2026
      </div>
    </div>
  );
}
