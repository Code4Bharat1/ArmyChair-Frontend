"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench, CheckCircle, Package, Clock, TrendingUp,
  Search, X, Download,
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
  "READY_FOR_DISPATCH",
  "DISPATCHED",
  "DELIVERED",
];

const COMPLETED_STATUSES = ["FITTING_COMPLETED", "DISPATCHED", "DELIVERED"];

const isCompleted = (o) => COMPLETED_STATUSES.includes(o.progress);

/* ─── CSV export ─── */
const exportCSV = (orders, filename) => {
  const rows = [
    ["Order ID", "Client", "Items", "Total Qty", "Fitting Status", "Order Date"],
    ...orders.map((o) => [
      o.orderId || o._id,
      o.dispatchedTo?.name || o.dispatchedTo || "—",
      o.items && o.items.length > 0
        ? o.items.map((i) => `${i.name} x${i.quantity}`).join(" | ")
        : o.chairModel || "—",
      getOrderTotalQty(o),
      o.progress,
      o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-IN") : "—",
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export default function Fitting() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [processingId, setProcessingId] = useState(null);
  const [activeFilter, setActiveFilter] = useState(null); // null | "total" | "inProgress" | "completed"

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ── fetch ── */
  const fetchOrders = async () => {
  try {
    const res = await axios.get(`${API}/orders`, { headers });
    const fittingOrders = (res.data.orders || res.data).filter((o) =>
      FITTING_STATUSES.includes(o.progress) && o.orderType !== "SPARE" // ✅ exclude spare
    );
    setOrders(fittingOrders);
  } catch (err) { console.error(err); }
  finally { setLoading(false); }
};

  useEffect(() => { fetchOrders(); }, []);

  /* ── update overall progress ── */
  const updateProgress = async (id, progress) => {
    try {
      setProcessingId(id);
      await axios.patch(`${API}/orders/${id}/progress`, { progress }, { headers });
      fetchOrders();
    } catch { alert("Failed to update fitting status"); }
    finally { setProcessingId(null); }
  };

  /* ── update per-item fitting ── */
  const updateItemFitting = async (orderId, itemIndex, fittingStatus) => {
    try {
      setProcessingId(`${orderId}-${itemIndex}`);
      await axios.patch(`${API}/orders/${orderId}/item-fitting`, { itemIndex, fittingStatus }, { headers });
      fetchOrders();
    } catch { alert("Failed to update item fitting status"); }
    finally { setProcessingId(null); }
  };

  /* ── stats ── */
  const totalOrders  = orders.length;
  const inProgress   = orders.filter((o) => o.progress === "FITTING_IN_PROGRESS").length;
  const completedOrders = orders.filter(isCompleted);
  const completedCount  = completedOrders.length;

  /* ── derived lists ── */
  const activeOrders    = useMemo(() => orders.filter((o) => !isCompleted(o)), [orders]);
  const allOrders       = orders;

  /* ── filtered view ── */
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();

    // which base list to use
    let base;
    if (activeFilter === "completed") base = completedOrders;
    else if (activeFilter === "inProgress") base = orders.filter((o) => o.progress === "FITTING_IN_PROGRESS");
    else base = activeOrders; // default: hide completed

    if (!q) return base;
    return base.filter((o) => {
      const itemNames = (o.items || []).map((i) => i.name?.toLowerCase()).join(" ");
      return (
        o.orderId?.toLowerCase().includes(q) ||
        (typeof o.dispatchedTo === "string" ? o.dispatchedTo : o.dispatchedTo?.name || "").toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q) ||
        itemNames.includes(q)
      );
    });
  }, [orders, activeOrders, completedOrders, search, activeFilter]);

  /* ── badge helpers ── */
  const getWarehouseBadge = (progress) =>
    FITTING_STATUSES.includes(progress) ? (
      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-medium">Collected</span>
    ) : (
      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 border border-gray-200 rounded-full text-xs font-medium">Processing</span>
    );

  const getFittingBadge = (progress) => {
    if (COMPLETED_STATUSES.includes(progress))
      return <span className="px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-medium">Completed</span>;
    if (progress === "FITTING_IN_PROGRESS")
      return <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">In Progress</span>;
    return <span className="px-2.5 py-1 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs font-medium">Pending</span>;
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
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
              active={activeFilter === "total" || activeFilter === null}
              onClick={() => handleStatClick("total")}
              filterLabel={activeFilter === "total" ? "Showing all" : null}
              onExport={() => exportCSV(allOrders, "all_fitting_orders.csv")}
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
              value={completedCount}
              icon={<TrendingUp className="text-[#c62d23]" />}
              active={activeFilter === "completed"}
              onClick={() => handleStatClick("completed")}
              filterLabel={activeFilter === "completed" ? "Filtered" : null}
              onExport={() => exportCSV(completedOrders, "completed_fitting_orders.csv")}
              exportLabel="Export"
            />
          </div>

          {/* Active filter badge */}
          {activeFilter && activeFilter !== "total" && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filtering by:</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#c62d23]/10 text-[#c62d23] rounded-full text-sm font-medium border border-[#c62d23]/20">
                {activeFilter === "inProgress" ? "In Progress" : "Completed"}
                <button onClick={() => setActiveFilter(null)} className="hover:bg-[#c62d23]/20 rounded-full p-0.5 transition-colors">
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          {/* Info strip when showing completed */}
          {activeFilter === "completed" && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
              <p className="text-sm text-green-800">
                <strong>Showing completed orders.</strong> These are hidden from the main view.
              </p>
              <button
                onClick={() => exportCSV(completedOrders, "completed_fitting_orders.csv")}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:text-green-900 border border-green-300 bg-white px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          )}

          {/* SEARCH */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
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
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
                <p className="mt-2">Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Order ID", "Client", "SKUs & Fitting", "Total Qty", "Warehouse Status", "Fitting Status"].map((h) => (
                        <th key={h} className="p-4 text-left font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-gray-500">
                          {activeFilter === "completed"
                            ? "No completed orders yet"
                            : "No fitting orders found"}
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o, index) => (
                        <tr
                          key={o._id}
                          className={`border-b border-gray-100 hover:bg-gray-50/80 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50/40"
                          } ${isCompleted(o) ? "opacity-75" : ""}`}
                        >
                          {/* Order ID */}
                          <td className="p-4 font-medium text-gray-900 whitespace-nowrap align-top">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-md">{o.orderId}</span>
                          </td>

                          {/* Client */}
                          <td className="p-4 text-gray-700 whitespace-nowrap align-top">
                            {o.dispatchedTo?.name || o.dispatchedTo || "—"}
                          </td>

                          {/* SKUs with per-item fitting controls */}
                          <td className="p-4 align-top min-w-[380px]">
                            {o.items && o.items.length > 0 ? (
                              <div className="flex flex-col gap-2">
                                {o.items.map((item, idx) => {
                                  const status = item.fittingStatus || "PENDING";
                                  const isProcessing = processingId === `${o._id}-${idx}`;
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 border transition-colors ${
                                        status === "COMPLETED" ? "bg-green-50 border-green-200"
                                        : status === "IN_PROGRESS" ? "bg-amber-50 border-amber-200"
                                        : "bg-gray-50 border-gray-200"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-medium text-gray-900 text-sm truncate">{item.name}</span>
                                        <span className="px-2 py-0.5 bg-white border border-gray-200 text-gray-600 rounded text-xs font-semibold shrink-0">×{item.quantity}</span>
                                      </div>
                                      <div className="shrink-0">
                                        {status === "COMPLETED" ? (
                                          <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                                            <CheckCircle size={13} /> Done
                                          </span>
                                        ) : status === "IN_PROGRESS" ? (
                                          <button
                                            onClick={() => updateItemFitting(o._id, idx, "COMPLETED")}
                                            disabled={isProcessing}
                                            className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                                          >
                                            <CheckCircle size={11} />
                                            {isProcessing ? "..." : "Mark Complete"}
                                          </button>
                                        ) : ["PRODUCTION_COMPLETED", "FITTING_IN_PROGRESS"].includes(o.progress) ? (
                                          <button
                                            onClick={() => updateItemFitting(o._id, idx, "IN_PROGRESS")}
                                            disabled={isProcessing}
                                            className="inline-flex items-center gap-1.5 bg-[#c62d23] hover:bg-[#a82419] text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm disabled:opacity-50 whitespace-nowrap"
                                          >
                                            <Wrench size={11} />
                                            {isProcessing ? "..." : "Start Fitting"}
                                          </button>
                                        ) : (
                                          <span className="text-xs text-gray-400 italic">Waiting...</span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              /* Legacy single-item fallback */
                              <div className="flex items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                <span className="font-medium text-gray-900 text-sm">{o.chairModel}</span>
                                <div>
                                  {o.progress === "PRODUCTION_COMPLETED" && (
                                    <button onClick={() => updateProgress(o._id, "FITTING_IN_PROGRESS")} disabled={processingId === o._id}
                                      className="inline-flex items-center gap-1.5 bg-[#c62d23] hover:bg-[#a82419] text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">
                                      <Wrench size={12} /> {processingId === o._id ? "..." : "Start Fitting"}
                                    </button>
                                  )}
                                  {o.progress === "FITTING_IN_PROGRESS" && (
                                    <button onClick={() => updateProgress(o._id, "FITTING_COMPLETED")} disabled={processingId === o._id}
                                      className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50">
                                      <CheckCircle size={12} /> {processingId === o._id ? "..." : "Mark Complete"}
                                    </button>
                                  )}
                                  {COMPLETED_STATUSES.includes(o.progress) && (
                                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-semibold">
                                      <CheckCircle size={13} /> Done
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Total Qty */}
                          <td className="p-4 font-semibold text-gray-900 align-top">{getOrderTotalQty(o)}</td>

                          {/* Warehouse Status */}
                          <td className="p-4 align-top">{getWarehouseBadge(o.progress)}</td>

                          {/* Fitting Status */}
                          <td className="p-4 align-top">
                            <div className="flex flex-col gap-1.5">
                              {getFittingBadge(o.progress)}
                              {o.items && o.items.length > 1 && (
                                <span className="text-[11px] text-gray-400">
                                  {o.items.filter((i) => i.fittingStatus === "COMPLETED").length}/{o.items.length} SKUs done
                                </span>
                              )}
                            </div>
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
              <strong>Note:</strong> Completed orders are hidden from the main view. Click the <strong>Completed</strong> stat card to view and export them.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── StatCard ─── */
const StatCard = ({ title, value, icon, danger, active, onClick, filterLabel, onExport, exportLabel }) => (
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
    {onExport && (
      <button
        onClick={(e) => { e.stopPropagation(); onExport(); }}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#c62d23] hover:text-[#a82419] border border-[#c62d23]/30 hover:border-[#c62d23] bg-[#c62d23]/5 hover:bg-[#c62d23]/10 px-3 py-1.5 rounded-lg transition-all w-fit"
      >
        <Download size={12} /> {exportLabel || "Export CSV"}
      </button>
    )}
  </div>
);