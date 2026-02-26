"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Download, Package, CheckCircle, TrendingUp,
  Search, X, ChevronUp, ChevronDown, Clock,
  AlertTriangle, Menu, ChevronRight, Truck
} from "lucide-react";
import InventorySidebar from "./sidebar";

export default function CompletedOrders() {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [dateFilter,   setDateFilter]   = useState("ALL");
  const [activeTab,    setActiveTab]    = useState("FULL");
  const [selectedDate, setSelectedDate] = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res  = await fetch(`${API}/orders`, { headers });
      const data = await res.json();
      const completed = (data.orders || data).filter((o) =>
        ["DISPATCHED", "COMPLETED", "PARTIALLY_DISPATCHED"].includes(o.progress)
      );
      setOrders(completed);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return orders.filter((o) => {
      const q = search.toLowerCase();
      const completedDate = new Date(o.updatedAt || o.createdAt);
      completedDate.setHours(0, 0, 0, 0);

      if (dateFilter === "TODAY" && completedDate.getTime() !== today.getTime()) return false;
      if (dateFilter === "YESTERDAY") {
        const y = new Date(today); y.setDate(today.getDate() - 1);
        if (completedDate.getTime() !== y.getTime()) return false;
      }
      if (dateFilter === "LAST_7_DAYS") {
        const ago = new Date(today); ago.setDate(today.getDate() - 7);
        if (completedDate < ago) return false;
      }
      if (dateFilter === "LAST_30_DAYS") {
        const ago = new Date(today); ago.setDate(today.getDate() - 30);
        if (completedDate < ago) return false;
      }
      if (dateFilter === "CUSTOM" && selectedDate) {
        const picked = new Date(selectedDate); picked.setHours(0, 0, 0, 0);
        if (completedDate.getTime() !== picked.getTime()) return false;
      }

      return (
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.name?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q) ||
        o.items?.some((i) => i.name?.toLowerCase().includes(q))
      );
    });
  }, [orders, search, dateFilter, selectedDate]);

  const fullCompleted  = filteredOrders.filter((o) => o.orderType === "FULL");
  const spareCompleted = filteredOrders.filter((o) => o.orderType === "SPARE");

  /* ================= STATS ================= */
  const totalOrders   = filteredOrders.length;
  const totalQuantity = filteredOrders.reduce((sum, o) => {
    if (o.items?.length) return sum + o.items.reduce((s, i) => s + Number(i.quantity || 0), 0);
    return sum + (o.quantity || 0);
  }, 0);
  const uniqueModels  = new Set(filteredOrders.map((o) => o.chairModel)).size;
  const lateCount     = filteredOrders.filter((o) => {
    if (!o.deliveryDate) return false;
    const d = new Date(o.deliveryDate); d.setHours(0, 0, 0, 0);
    const c = new Date(o.updatedAt || o.createdAt); c.setHours(0, 0, 0, 0);
    return c > d;
  }).length;
  const onTimeRate = totalOrders ? Math.round(((totalOrders - lateCount) / totalOrders) * 100) : 0;

  /* ================= CSV EXPORT ================= */
  const exportCSV = () => {
  const activeOrders = activeTab === "FULL" ? fullCompleted : spareCompleted;
  if (!activeOrders.length) return alert("No orders to export");

  const rows = [];

  // Build per-batch rows
  activeOrders.forEach((o) => {
    const vendorName = o.dispatchedTo?.name || "";
    const orderDate = o.orderDate ? new Date(o.orderDate).toLocaleDateString("en-GB") : "";
    const deliveryDate = o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString("en-GB") : "";
    const completedOn = new Date(o.updatedAt || o.createdAt).toLocaleDateString("en-GB");

    const totalQty = o.items?.length
      ? o.items.reduce((s, i) => s + Number(i.quantity || 0), 0)
      : Number(o.quantity || 0);

    const isLate = (() => {
      if (!o.deliveryDate) return false;
      const d = new Date(o.deliveryDate); d.setHours(0, 0, 0, 0);
      const c = new Date(o.updatedAt || o.createdAt); c.setHours(0, 0, 0, 0);
      return c > d;
    })();

    const itemsSummary = o.items?.length > 1
      ? o.items.map((i) => `${i.name} × ${i.quantity}`).join(" | ")
      : (o.items?.[0]?.name || o.chairModel || "");

    const dispatches = o.dispatches || [];

    if (dispatches.length === 0) {
      // No batch records — single row
      rows.push([
        o.orderId,
        vendorName,
        itemsSummary,
        orderDate,
        deliveryDate,
        completedOn,
        totalQty,
        o.dispatchedQuantity || totalQty,
        1,
        "Batch 1",
        new Date(o.updatedAt || o.createdAt).toLocaleDateString("en-GB"),
        o.dispatchedQuantity || totalQty,
        "",
        isLate ? "Completed Late" : "On Time",
        o.progress,
      ]);
    } else {
      // One row per batch
      dispatches.forEach((d, idx) => {
        const batchDate = d.date ? new Date(d.date).toLocaleDateString("en-GB") : "";
        
        // Per-item breakdown for this batch
        const batchItemsSummary = d.itemQuantities
          ? Object.entries(d.itemQuantities)
              .filter(([, qty]) => Number(qty) > 0)
              .map(([name, qty]) => `${name} × ${qty}`)
              .join(" | ")
          : `${d.quantity} units`;

        rows.push([
          o.orderId,
          vendorName,
          itemsSummary,
          orderDate,
          deliveryDate,
          completedOn,
          totalQty,
          o.dispatchedQuantity || totalQty,
          dispatches.length,
          `Batch ${idx + 1}`,
          batchDate,
          d.quantity,
          batchItemsSummary,
          isLate ? "Completed Late" : "On Time",
          o.progress,
        ]);
      });
    }
  });

  const headers = [
    "Order ID",
    "Client",
    "Items",
    "Order Date",
    "Delivery Date",
    "Completed On",
    "Total Qty Ordered",
    "Total Qty Dispatched",
    "Total Batches",
    "Batch No",
    "Batch Date",
    "Batch Qty",
    "Batch Item Breakdown",
    "Status",
    "Progress",
  ];

  const csvContent =
    [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `completed_orders_${activeTab.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

  const DATE_BTNS = [
    { label: "All",       value: "ALL"          },
    { label: "Today",     value: "TODAY"        },
    { label: "Yesterday", value: "YESTERDAY"    },
    { label: "Last 7d",   value: "LAST_7_DAYS"  },
    { label: "Last 30d",  value: "LAST_30_DAYS" },
  ];

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}>
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <Menu size={24} />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <CheckCircle size={20} className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <span className="truncate">Completed Orders</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
                  Dispatch history & production summary
                </p>
              </div>
            </div>
            <button
              onClick={exportCSV}
              className="bg-[#c62d23] hover:bg-[#a82419] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all text-xs sm:text-sm flex-shrink-0"
            >
              <Download size={16} />
              <span className="hidden sm:inline">Export CSV</span>
              <span className="sm:hidden">Export</span>
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6">

          {/* STATS */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <StatCard title="Total Orders"   value={totalOrders}      icon={<Package    className="text-[#c62d23]" />} />
            <StatCard title="Total Quantity" value={totalQuantity}    icon={<CheckCircle className="text-[#c62d23]" />} />
            <StatCard title="Chair Models"   value={uniqueModels}     icon={<TrendingUp  className="text-[#c62d23]" />} />
            <StatCard title="On-Time Rate"   value={`${onTimeRate}%`} icon={<Clock       className="text-[#c62d23]" />}
              sub={lateCount > 0 ? `${lateCount} late` : "All on time"} />
          </div>

          {/* FILTERS */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {DATE_BTNS.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => { setDateFilter(btn.value); setSelectedDate(""); }}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                      dateFilter === btn.value
                        ? "bg-[#c62d23] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => { setSelectedDate(e.target.value); setDateFilter("CUSTOM"); }}
                className={`w-full sm:w-auto px-3 py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm border transition-all cursor-pointer ${
                  dateFilter === "CUSTOM"
                    ? "border-[#c62d23] ring-2 ring-[#c62d23]/20 bg-white"
                    : "border-gray-200 bg-gray-100 text-gray-700"
                }`}
              />
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by order ID, client, or chair model…"
                className="w-full pl-8 sm:pl-9 pr-8 py-2 sm:py-2.5 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg sm:rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>

            {(search || dateFilter !== "ALL") && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Active:</span>
                {dateFilter !== "ALL" && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    {selectedDate || DATE_BTNS.find(b => b.value === dateFilter)?.label}
                    <button onClick={() => { setDateFilter("ALL"); setSelectedDate(""); }}><X size={10} /></button>
                  </span>
                )}
                {search && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    "{search}" <button onClick={() => setSearch("")}><X size={10} /></button>
                  </span>
                )}
                <button onClick={() => { setSearch(""); setDateFilter("ALL"); setSelectedDate(""); }}
                  className="text-xs text-gray-400 underline hover:text-gray-600">Clear all</button>
              </div>
            )}
          </div>

          {/* TAB TOGGLE */}
          <div className="flex gap-3 sm:gap-6 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
            <button
              onClick={() => setActiveTab("FULL")}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                activeTab === "FULL" ? "bg-[#c62d23] text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="hidden sm:inline">Full Chair Orders ({fullCompleted.length})</span>
              <span className="sm:hidden">Full ({fullCompleted.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("SPARE")}
              className={`flex-1 py-2 sm:py-2.5 rounded-lg font-semibold transition-all text-xs sm:text-sm ${
                activeTab === "SPARE" ? "bg-[#c62d23] text-white shadow-md" : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              <span className="hidden sm:inline">Spare Part Orders ({spareCompleted.length})</span>
              <span className="sm:hidden">Spare ({spareCompleted.length})</span>
            </button>
          </div>

          {/* TABLE */}
          {loading ? (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
              <p className="mt-2 text-gray-500 text-sm">Loading...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 py-16">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No completed orders found</p>
              {(search || dateFilter !== "ALL") && (
                <button onClick={() => { setSearch(""); setDateFilter("ALL"); setSelectedDate(""); }}
                  className="mt-4 text-sm text-[#c62d23] underline">Clear filters</button>
              )}
            </div>
          ) : (
            <CompletedTable orders={activeTab === "FULL" ? fullCompleted : spareCompleted} />
          )}

        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
const StatCard = ({ title, value, icon, sub }) => (
  <div
    className="bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200"
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

/* ================= DISPATCH HISTORY EXPANDED PANEL ================= */
const DispatchHistoryPanel = ({ order: o }) => {
  const dispatches = o.dispatches || [];
  const isMultiPart = o.items?.length > 0;

  const totalQty = isMultiPart
    ? o.items.reduce((s, i) => s + Number(i.quantity || 0), 0)
    : Number(o.quantity || 0);

  const alreadyDispatched = Number(o.dispatchedQuantity) || totalQty;

  const formatDate = (d) => {
    const raw = d?.$date || d;
    if (!raw) return "—";
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  // Per-item dispatched totals across all batches
  const itemDispatchedMap = {};
  dispatches.forEach((d) => {
    if (d.itemQuantities) {
      Object.entries(d.itemQuantities).forEach(([name, qty]) => {
        itemDispatchedMap[name] = (itemDispatchedMap[name] || 0) + Number(qty || 0);
      });
    }
  });

  return (
    <div className="bg-gradient-to-br from-gray-50 to-white border-t border-gray-100 px-4 sm:px-6 md:px-8 py-5">
      <div className="max-w-4xl">

        {/* ── Summary stats + progress bar ── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Total Ordered</p>
              <p className="text-xl font-bold text-gray-900">{totalQty}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Dispatched</p>
              <p className="text-xl font-bold text-blue-600">{alreadyDispatched}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Remaining</p>
              <p className="text-xl font-bold text-[#c62d23]">{Math.max(0, totalQty - alreadyDispatched)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Batches</p>
              <p className="text-xl font-bold text-gray-700">{dispatches.length || 1}</p>
            </div>
          </div>

          {totalQty > 0 && (
            <div className="flex-1 min-w-0">
              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                <span>Dispatch progress</span>
                <span>{Math.min(100, Math.round((alreadyDispatched / totalQty) * 100))}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#c62d23] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (alreadyDispatched / totalQty) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* ── LEFT: Order Items with per-item dispatch progress ── */}
          {isMultiPart && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Items Progress
              </p>
              <div className="space-y-2">
                {o.items.map((item, i) => {
                  const dispatched = itemDispatchedMap[item.name] || 0;
                  const remaining = item.quantity - dispatched;
                  const pct = Math.min(100, Math.round((dispatched / item.quantity) * 100));
                  return (
                    <div key={i} className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-sm text-gray-800 capitalize truncate">{item.name}</span>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          <span className="font-bold text-blue-600">{dispatched}</span>
                          <span className="text-gray-400"> / {item.quantity}</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-green-500' : 'bg-[#c62d23]'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] text-gray-400">{pct}% dispatched</span>
                        {remaining > 0
                          ? <span className="text-[10px] text-amber-600 font-medium">{remaining} remaining</span>
                          : <span className="text-[10px] text-green-600 font-medium">✓ Complete</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── RIGHT: Batch-by-batch dispatch history ── */}
          <div className={isMultiPart ? "" : "lg:col-span-2"}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Dispatch Batches
            </p>

            {dispatches.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-[#c62d23] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Batch 1
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{alreadyDispatched} unit{alreadyDispatched !== 1 ? "s" : ""}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Single dispatch</p>
                  </div>
                </div>
                <span className="text-[11px] text-gray-400">{formatDate(o.updatedAt)}</span>
              </div>
            ) : (
              <div className="space-y-2">
                {dispatches.map((d, i) => (
                  <div key={i} className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <span className="bg-[#c62d23] text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                          Batch {i + 1}
                        </span>
                        <p className="text-sm font-bold text-gray-900">
                          {d.quantity} unit{d.quantity !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{formatDate(d.date)}</span>
                    </div>

                    {/* Per-item breakdown (if itemQuantities exists) */}
                    {d.itemQuantities && Object.keys(d.itemQuantities).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(d.itemQuantities)
                          .filter(([, qty]) => Number(qty) > 0)
                          .map(([name, qty]) => (
                            <div key={name} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs">
                              <span className="text-gray-700 font-medium capitalize truncate">{name}</span>
                              <span className="font-bold text-[#c62d23] shrink-0 ml-2">× {qty}</span>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Notes */}
                    {d.notes && (
                      <p className="text-[11px] text-gray-500 mt-2 flex items-start gap-1.5">
                        <span className="mt-px">📝</span>
                        <span>{d.notes}</span>
                      </p>
                    )}

                    {/* Dispatched by */}
                    {d.dispatchedBy?.name && (
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1.5">
                        <span>👤</span>
                        <span>{d.dispatchedBy.name}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ================= COMPLETED TABLE ================= */
const CompletedTable = ({ orders }) => {
  const [sortField,    setSortField]    = useState("orderDate");
  const [sortDir,      setSortDir]      = useState("desc");
  const [page,         setPage]         = useState(1);
  const [pageSize,     setPageSize]     = useState(10);
  const [expandedId,   setExpandedId]   = useState(null);

  useEffect(() => { setPage(1); setExpandedId(null); }, [orders]);

  const isLateCompleted = (o) => {
    if (!o.deliveryDate) return false;
    const d = new Date(o.deliveryDate); d.setHours(0, 0, 0, 0);
    const c = new Date(o.updatedAt || o.createdAt); c.setHours(0, 0, 0, 0);
    return c > d;
  };

  const sorted = useMemo(() => {
    return [...orders].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (["orderDate","deliveryDate","updatedAt","createdAt"].includes(sortField)) {
        av = new Date(av || 0); bv = new Date(bv || 0);
      }
      if (sortField === "quantity") { av = +av; bv = +bv; }
      if (sortField === "orderId" || sortField === "chairModel") {
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sortDir === "asc"
        ? (av < bv ? -1 : av > bv ? 1 : 0)
        : (av > bv ? -1 : av < bv ? 1 : 0);
    });
  }, [orders, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const toggleExpand = (id) => setExpandedId((prev) => (prev === id ? null : id));

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === "asc"
        ? <ChevronUp   size={12} className="text-[#c62d23]" />
        : <ChevronDown size={12} className="text-[#c62d23]" />
      : <ChevronUp size={12} className="text-gray-300" />;

  const lateCount = sorted.filter(isLateCompleted).length;

  const COLS = [
    { label: "",              field: null,           sortable: false }, // expand toggle
    { label: "Order ID",      field: "orderId",      sortable: true  },
    { label: "Client",        field: null,           sortable: false },
    { label: "Chair / Part",  field: "chairModel",   sortable: true  },
    { label: "Order Date",    field: "orderDate",    sortable: true  },
    { label: "Delivery Date", field: "deliveryDate", sortable: true  },
    { label: "Completed On",  field: "updatedAt",    sortable: true  },
    { label: "Qty",           field: "quantity",     sortable: true  },
    { label: "Batches",       field: null,           sortable: false },
    { label: "Status",        field: null,           sortable: false },
  ];

  if (!orders.length) return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm text-center py-12 text-gray-400">
      <Package size={36} className="mx-auto mb-3 text-gray-200" />
      <p className="font-medium text-gray-500">No orders in this category</p>
    </div>
  );

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* late warning */}
      {lateCount > 0 && (
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 border-b border-red-100">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 font-medium">
            {lateCount} order{lateCount > 1 ? "s were" : " was"} completed after the delivery deadline
          </p>
        </div>
      )}

      {/* hint */}
      <div className="px-4 sm:px-6 py-2 bg-blue-50/60 border-b border-blue-100 flex items-center gap-2">
        <ChevronRight size={13} className="text-blue-400" />
        <p className="text-[11px] text-blue-500 font-medium">Click any row to view dispatch batch history</p>
      </div>

      {/* ── DESKTOP TABLE ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {COLS.map((col, ci) => (
                <th
                  key={ci}
                  onClick={() => col.sortable && toggleSort(col.field)}
                  className={`p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm select-none ${
                    col.sortable ? "cursor-pointer hover:text-gray-900" : ""
                  }`}
                >
                  {col.label && (
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon field={col.field} />}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((o, index) => {
              const late      = isLateCompleted(o);
              const expanded  = expandedId === o._id;
              const batchCount = o.dispatches?.length || 1;
              const totalQty  = o.items?.length
                ? o.items.reduce((s, i) => s + Number(i.quantity || 0), 0)
                : o.quantity;
              const chairLabel = o.items?.length > 1
                ? `${o.items.length} items`
                : (o.items?.[0]?.name || o.chairModel || "—");

              return (
                <React.Fragment key={o._id}>
                  <tr
                    onClick={() => toggleExpand(o._id)}
                    className={`border-b border-gray-100 transition-colors cursor-pointer ${
                      expanded
                        ? "bg-[#c62d23]/5 border-b-0"
                        : late
                        ? "bg-red-50 hover:bg-red-100"
                        : index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    {/* expand icon */}
                    <td className="p-3 lg:p-4 w-8">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full transition-all ${
                        expanded ? "bg-[#c62d23] text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {expanded
                          ? <ChevronDown size={11} />
                          : <ChevronRight size={11} />}
                      </span>
                    </td>
                    <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{o.orderId}</td>
                    <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{o.dispatchedTo?.name || "—"}</td>
                    <td className="p-3 lg:p-4 text-gray-900 text-xs lg:text-sm">
                      {o.items?.length > 1 ? (
                        <details className="cursor-pointer" onClick={(e) => e.stopPropagation()}>
                          <summary className="text-[#c62d23] font-semibold text-xs">{o.items.length} items</summary>
                          <ul className="mt-1 text-xs text-gray-700 list-disc ml-4">
                            {o.items.map((i, idx) => <li key={idx}>{i.name} × {i.quantity}</li>)}
                          </ul>
                        </details>
                      ) : chairLabel}
                    </td>
                    <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{new Date(o.orderDate).toLocaleDateString()}</td>
                    <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                      {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                      {new Date(o.updatedAt || o.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{totalQty}</td>
                    {/* batch count badge */}
                    <td className="p-3 lg:p-4">
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200">
                        <Truck size={9} />
                        {batchCount} batch{batchCount !== 1 ? "es" : ""}
                      </span>
                    </td>
                    <td className="p-3 lg:p-4">
                      <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border whitespace-nowrap ${
                        late ? "bg-red-100 text-red-700 border-red-300" : "bg-green-50 text-green-700 border-green-200"
                      }`}>
                        {late ? "Completed Late" : "On Time"}
                      </span>
                    </td>
                  </tr>

                  {/* ── EXPANDED HISTORY ROW ── */}
                  {expanded && (
                    <tr className="border-b border-[#c62d23]/10">
                      <td colSpan={COLS.length} className="p-0">
                        <DispatchHistoryPanel order={o} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="md:hidden space-y-0 divide-y divide-gray-100">
        {paginated.map((o) => {
          const late      = isLateCompleted(o);
          const expanded  = expandedId === o._id;
          const batchCount = o.dispatches?.length || 1;
          const totalQty  = o.items?.length
            ? o.items.reduce((s, i) => s + Number(i.quantity || 0), 0)
            : o.quantity;

          return (
            <div key={o._id} className={late ? "bg-red-50/50" : ""}>
              {/* card header — tap to expand */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => toggleExpand(o._id)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 ${
                        expanded ? "bg-[#c62d23] text-white" : "bg-gray-100 text-gray-400"
                      }`}>
                        {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                      </span>
                      <h3 className="font-bold text-gray-900 text-sm truncate">{o.orderId}</h3>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate pl-7">{o.dispatchedTo?.name || "—"}</p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                    late ? "bg-red-100 text-red-700 border-red-300" : "bg-green-50 text-green-700 border-green-200"
                  }`}>
                    {late ? "Late" : "On Time"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2 text-xs pl-7">
                  <div>
                    <p className="text-gray-500 mb-0.5">Chair / Part</p>
                    <p className="font-medium text-gray-900 truncate">
                      {o.items?.length > 1 ? `${o.items.length} items` : (o.items?.[0]?.name || o.chairModel)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Quantity</p>
                    <p className="font-bold text-gray-900">{totalQty}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Order Date</p>
                    <p className="text-gray-700">{new Date(o.orderDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 mb-0.5">Completed On</p>
                    <p className="text-gray-700">{new Date(o.updatedAt || o.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="pl-7 flex items-center justify-between">
                  {o.deliveryDate && (
                    <p className="text-xs text-gray-400">Due: {new Date(o.deliveryDate).toLocaleDateString()}</p>
                  )}
                  <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-gray-200 ml-auto">
                    <Truck size={9} />
                    {batchCount} batch{batchCount !== 1 ? "es" : ""}
                  </span>
                </div>
              </div>

              {/* expanded history */}
              {expanded && (
                <div className="border-t border-[#c62d23]/10">
                  <DispatchHistoryPanel order={o} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── PAGINATION ── */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>
            <span className="font-semibold text-gray-600">
              {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}
            </span>{" "}of{" "}
            <span className="font-semibold text-gray-600">{sorted.length}</span> orders
          </span>
          <span className="hidden sm:inline text-gray-300">|</span>
          <label className="hidden sm:flex items-center gap-1.5">
            Rows:
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none cursor-pointer"
            >
              {[5, 10, 20, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm font-medium text-xs sm:text-sm"
          >
            <span className="hidden sm:inline">Previous</span>
            <span className="sm:hidden">Prev</span>
          </button>
          <span className="text-xs sm:text-sm text-gray-700 font-medium px-2 sm:px-3">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg bg-white border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-all shadow-sm font-medium text-xs sm:text-sm"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};