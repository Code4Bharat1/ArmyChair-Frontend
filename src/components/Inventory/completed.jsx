"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Download, Package, CheckCircle, TrendingUp,
  Search, X, ChevronUp, ChevronDown, Clock,
  AlertTriangle, Menu
} from "lucide-react";
import InventorySidebar from "./sidebar";

export default function CompletedOrders() {
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [dateFilter,   setDateFilter]   = useState("ALL");
  const [activeTab,    setActiveTab]    = useState("FULL");
  const [selectedDate, setSelectedDate] = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false); // ← same as WarehouseOrders

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res  = await fetch(`${API}/orders`, { headers });
      const data = await res.json();
      const completed = (data.orders || data).filter((o) =>
        ["DISPATCHED", "COMPLETED"].includes(o.progress)
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
        o.chairModel?.toLowerCase().includes(q)
      );
    });
  }, [orders, search, dateFilter, selectedDate]);

  const fullCompleted  = filteredOrders.filter((o) => o.orderType === "FULL");
  const spareCompleted = filteredOrders.filter((o) => o.orderType === "SPARE");

  /* ================= STATS ================= */
  const totalOrders   = filteredOrders.length;
  const totalQuantity = filteredOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
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
    if (!activeOrders.length) return;

    const hdrs = ["Order ID", "Dispatched To", "Chair Model", "Order Date", "Quantity", "Completed At", "Status"];
    const rows = activeOrders.map((o) => {
      const late = (() => {
        if (!o.deliveryDate) return false;
        const d = new Date(o.deliveryDate); d.setHours(0, 0, 0, 0);
        const c = new Date(o.updatedAt || o.createdAt); c.setHours(0, 0, 0, 0);
        return c > d;
      })();
      return [o.orderId, o.dispatchedTo?.name, o.chairModel,
        new Date(o.orderDate).toLocaleDateString(), o.quantity,
        new Date(o.updatedAt || o.createdAt).toLocaleDateString(),
        late ? "Completed Late" : "On Time"];
    });

    const csvContent = "data:text/csv;charset=utf-8," +
      [hdrs, ...rows].map((e) => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `completed_orders_${activeTab.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    // ← exact same shell as WarehouseOrders
    <div className="flex h-screen bg-gray-50 text-gray-900">

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed on mobile (slide in/out), static on lg+ */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <InventorySidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">

        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">

              {/* Hamburger — same as WarehouseOrders */}
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

          {/* STATS — 2 col mobile, 4 col desktop */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <StatCard title="Total Orders"   value={totalOrders}      icon={<Package    className="text-[#c62d23]" />} />
            <StatCard title="Total Quantity" value={totalQuantity}    icon={<CheckCircle className="text-[#c62d23]" />} />
            <StatCard title="Chair Models"   value={uniqueModels}     icon={<TrendingUp  className="text-[#c62d23]" />} />
            <StatCard title="On-Time Rate"   value={`${onTimeRate}%`} icon={<Clock       className="text-[#c62d23]" />}
              sub={lateCount > 0 ? `${lateCount} late` : "All on time"} />
          </div>

          {/* FILTERS */}
          <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-6 shadow-sm space-y-3 sm:space-y-4">

            {/* Date pills */}
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

            {/* Search */}
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

            {/* Active filter chips */}
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

          {/* FULL / SPARE TOGGLE — same style as WarehouseOrders */}
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

          {/* TABLE / LOADING / EMPTY */}
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

/* ================= STAT CARD (same as WarehouseOrders) ================= */
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

/* ================= COMPLETED TABLE ================= */
const CompletedTable = ({ orders }) => {
  const [sortField, setSortField] = useState("orderDate");
  const [sortDir,   setSortDir]   = useState("desc");
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  useEffect(() => { setPage(1); }, [orders]);

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

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === "asc"
        ? <ChevronUp   size={12} className="text-[#c62d23]" />
        : <ChevronDown size={12} className="text-[#c62d23]" />
      : <ChevronUp size={12} className="text-gray-300" />;

  const lateCount = sorted.filter(isLateCompleted).length;

  const COLS = [
    { label: "Order ID",      field: "orderId",      sortable: true  },
    { label: "Client",        field: null,           sortable: false },
    { label: "Chair",         field: "chairModel",   sortable: true  },
    { label: "Order Date",    field: "orderDate",    sortable: true  },
    { label: "Delivery Date", field: "deliveryDate", sortable: true  },
    { label: "Completed On",  field: "updatedAt",    sortable: true  },
    { label: "Qty",           field: "quantity",     sortable: true  },
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

      {/* Late warning */}
      {lateCount > 0 && (
        <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 border-b border-red-100">
          <AlertTriangle size={14} className="text-red-500 shrink-0" />
          <p className="text-xs text-red-600 font-medium">
            {lateCount} order{lateCount > 1 ? "s were" : " was"} completed after the delivery deadline
          </p>
        </div>
      )}

      {/* ── Desktop table (same hidden md:block pattern as WarehouseOrders) ── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {COLS.map((col) => (
                <th
                  key={col.label}
                  onClick={() => col.sortable && toggleSort(col.field)}
                  className={`p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm select-none ${
                    col.sortable ? "cursor-pointer hover:text-gray-900" : ""
                  }`}
                >
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.field} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((o, index) => {
              const late = isLateCompleted(o);
              return (
                <tr
                  key={o._id}
                  className={`border-b border-gray-100 transition-colors ${
                    late
                      ? "bg-red-50 hover:bg-red-100"
                      : index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{o.orderId}</td>
                  <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{o.dispatchedTo?.name || "—"}</td>
                  <td className="p-3 lg:p-4 text-gray-900 text-xs lg:text-sm">{o.chairModel}</td>
                  <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{new Date(o.orderDate).toLocaleDateString()}</td>
                  <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                    {o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                    {new Date(o.updatedAt || o.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{o.quantity}</td>
                  <td className="p-3 lg:p-4">
                    <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium border whitespace-nowrap ${
                      late ? "bg-red-100 text-red-700 border-red-300" : "bg-green-50 text-green-700 border-green-200"
                    }`}>
                      {late ? "Completed Late" : "Completed On Time"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Mobile cards (same md:hidden pattern as WarehouseOrders) ── */}
      <div className="md:hidden space-y-0 divide-y divide-gray-100">
        {paginated.map((o) => {
          const late = isLateCompleted(o);
          return (
            <div key={o._id} className={`p-4 ${late ? "bg-red-50/50" : ""}`}>
              {/* Row 1: order ID + status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{o.orderId}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{o.dispatchedTo?.name || "—"}</p>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${
                  late ? "bg-red-100 text-red-700 border-red-300" : "bg-green-50 text-green-700 border-green-200"
                }`}>
                  {late ? "Late" : "On Time"}
                </span>
              </div>

              {/* Row 2: 2x2 grid of details */}
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <div>
                  <p className="text-gray-500 mb-0.5">Chair</p>
                  <p className="font-medium text-gray-900 truncate">{o.chairModel}</p>
                </div>
                <div>
                  <p className="text-gray-500 mb-0.5">Quantity</p>
                  <p className="font-bold text-gray-900">{o.quantity}</p>
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

              {o.deliveryDate && (
                <p className="text-xs text-gray-400">
                  Due: {new Date(o.deliveryDate).toLocaleDateString()}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Pagination footer (same style as WarehouseOrders) ── */}
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