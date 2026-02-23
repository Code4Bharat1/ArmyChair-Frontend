"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  CheckCircle,
  Package,
  Clock,
  TrendingUp,
  Search,
  X,
} from "lucide-react";
import axios from "axios";
import FittingSidebar from "@/components/Fitting/sidebar";

/* ─── helpers ─── */
const getOrderTotalQty = (order) => {
  if (order.items && order.items.length > 0)
    return order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  return order.quantity;
};

const FITTING_STATUSES = [
  "PRODUCTION_COMPLETED",
  "FITTING_IN_PROGRESS",
  "FITTING_COMPLETED",
  "DISPATCHED",
  "DELIVERED",
];

export default function Fitting() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // null | "total" | "inProgress" | "completed"

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      const fittingOrders = (res.data.orders || res.data).filter((o) =>
        FITTING_STATUSES.includes(o.progress)
      );
      setOrders(fittingOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= UPDATE ================= */
  const updateProgress = async (id, progress) => {
    try {
      setProcessingId(id);
      await axios.patch(`${API}/orders/${id}/progress`, { progress }, { headers });
      fetchOrders();
    } catch {
      alert("Failed to update fitting status");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= STATS ================= */
  const totalOrders = orders.length;
  const inProgress = orders.filter((o) => o.progress === "FITTING_IN_PROGRESS").length;
  const completed = orders.filter((o) =>
    ["FITTING_COMPLETED", "DISPATCHED", "DELIVERED"].includes(o.progress)
  ).length;

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();

    let base = orders;

    if (activeFilter === "inProgress") {
      base = orders.filter((o) => o.progress === "FITTING_IN_PROGRESS");
    } else if (activeFilter === "completed") {
      base = orders.filter((o) =>
        ["FITTING_COMPLETED", "DISPATCHED", "DELIVERED"].includes(o.progress)
      );
    }
    // "total" or null → no extra filter

    if (!q) return base;

    return base.filter((o) => {
      const itemNames = (o.items || []).map((i) => i.name?.toLowerCase()).join(" ");
      return (
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q) ||
        itemNames.includes(q)
      );
    });
  }, [orders, search, activeFilter]);

  /* ================= BADGE HELPERS ================= */
  const getWarehouseBadge = (progress) => {
    if (FITTING_STATUSES.includes(progress)) {
      return (
        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">
          Collected
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-medium">
        Processing
      </span>
    );
  };

  const getFittingBadge = (progress) => {
    if (["FITTING_COMPLETED", "DISPATCHED", "DELIVERED"].includes(progress)) {
      return (
        <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">
          Completed
        </span>
      );
    }
    if (progress === "FITTING_IN_PROGRESS") {
      return (
        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs font-medium">
        Pending
      </span>
    );
  };

  const handleStatClick = (filter) => {
    setActiveFilter((prev) => (prev === filter ? null : filter));
  };

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <FittingSidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pr-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench size={32} className="text-[#c62d23]" />
                <span>Fitting / Assembly</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Assemble products after warehouse material collection
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* STATS — clickable */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
              active={activeFilter === "total" || activeFilter === null}
              onClick={() => handleStatClick("total")}
              filterLabel={activeFilter === "total" ? "Showing all" : null}
            />
            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock className="text-[#c62d23]" />}
              danger={inProgress > 0}
              active={activeFilter === "inProgress"}
              onClick={() => handleStatClick("inProgress")}
              filterLabel={activeFilter === "inProgress" ? "Filtered" : null}
            />
            <StatCard
              title="Completed"
              value={completed}
              icon={<TrendingUp className="text-[#c62d23]" />}
              active={activeFilter === "completed"}
              onClick={() => handleStatClick("completed")}
              filterLabel={activeFilter === "completed" ? "Filtered" : null}
            />
          </div>

          {/* Active filter badge */}
          {activeFilter && activeFilter !== "total" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filtering by:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c62d23]/10 text-[#c62d23] rounded-full text-sm font-medium border border-[#c62d23]/20">
                {activeFilter === "inProgress" ? "In Progress" : "Completed"}
                <button
                  onClick={() => setActiveFilter(null)}
                  className="hover:bg-[#c62d23]/20 rounded-full p-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          {/* SEARCH */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Order ID, Client, Chair Model or Item name..."
              className="w-full bg-white border border-gray-200 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent shadow-sm"
            />
          </div>

          {/* TABLE */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2">Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Order ID",
                        "Client",
                        "Products",
                        "Total Qty",
                        "Warehouse Status",
                        "Fitting Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-4 text-left font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-8 text-center text-gray-500">
                          No fitting orders found
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o, index) => (
                        <tr
                          key={o._id}
                          className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                          }`}
                        >
                          {/* Order ID */}
                          <td className="p-4 font-medium text-gray-900 whitespace-nowrap">
                            {o.orderId}
                          </td>

                          {/* Client */}
                          <td className="p-4 text-gray-700 whitespace-nowrap">
                            {o.dispatchedTo?.name || "—"}
                          </td>

                          {/* Products — stacked items */}
                          <td className="p-4">
                            {o.items && o.items.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {o.items.map((item, idx) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className="text-gray-900 font-medium text-sm">
                                      {item.name}
                                    </span>
                                    <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-semibold border border-gray-200">
                                      ×{item.quantity}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-900">{o.chairModel}</span>
                            )}
                          </td>

                          {/* Total Qty */}
                          <td className="p-4 font-semibold text-gray-900">
                            {getOrderTotalQty(o)}
                          </td>

                          {/* Warehouse Status */}
                          <td className="p-4">{getWarehouseBadge(o.progress)}</td>

                          {/* Fitting Status */}
                          <td className="p-4">{getFittingBadge(o.progress)}</td>

                          {/* Action */}
                          <td className="p-4">
                            {o.progress === "PRODUCTION_COMPLETED" && (
                              <button
                                onClick={() => updateProgress(o._id, "FITTING_IN_PROGRESS")}
                                disabled={processingId === o._id}
                                className="inline-flex items-center gap-1.5 bg-[#c62d23] hover:bg-[#a82419] active:bg-[#8f1e15] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                <Wrench size={14} />
                                {processingId === o._id ? "Processing..." : "Start Fitting"}
                              </button>
                            )}
                            {o.progress === "FITTING_IN_PROGRESS" && (
                              <button
                                onClick={() => updateProgress(o._id, "FITTING_COMPLETED")}
                                disabled={processingId === o._id}
                                className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                              >
                                <CheckCircle size={14} />
                                {processingId === o._id ? "Processing..." : "Mark Complete"}
                              </button>
                            )}
                            {["FITTING_COMPLETED", "DISPATCHED", "DELIVERED"].includes(
                              o.progress
                            ) && (
                              <span className="inline-flex items-center gap-1.5 text-green-600 font-semibold text-sm">
                                <CheckCircle size={15} />
                                Done
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Orders automatically move to dispatch after fitting completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── StatCard ─── */
const StatCard = ({ title, value, icon, danger, active, onClick, filterLabel }) => (
  <div
    onClick={onClick}
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm cursor-pointer select-none flex flex-col justify-between h-full
      ${danger ? "border-amber-300 bg-amber-50" : "border-gray-200"}
      ${active ? "ring-2 ring-[#c62d23] ring-offset-1 shadow-md" : "hover:shadow-md hover:border-gray-300"}
    `}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      <div className="flex items-center gap-2">
        {filterLabel && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-[#c62d23]/10 text-[#c62d23] rounded-full border border-[#c62d23]/20">
            {filterLabel}
          </span>
        )}
        {React.cloneElement(icon, { size: 24 })}
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);