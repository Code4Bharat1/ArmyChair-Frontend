"use client";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  CalendarDays, Download, History, Search, Filter,
  Package, Clock, CheckCircle2, RefreshCw, Eye,
  X, ChevronUp, ChevronDown, ShoppingCart, Truck
} from "lucide-react";
import * as XLSX from "xlsx";

/* ── status badge colours (kept subtle, matching original blue style) ── */
const STATUS_STYLES = {
  delivered:   "bg-green-50 text-green-700 border-green-200",
  pending:     "bg-yellow-50 text-yellow-700 border-yellow-200",
  in_transit:  "bg-blue-50 text-blue-700 border-blue-200",
  processing:  "bg-purple-50 text-purple-700 border-purple-200",
  cancelled:   "bg-red-50 text-red-700 border-red-200",
};
const getStatusStyle = (s = "") =>
  STATUS_STYLES[s.toLowerCase().replace(/ /g, "_")] ??
  "bg-blue-50 text-blue-700 border-blue-200";   // original fallback

/* ── tiny stat card ── */
const StatCard = ({ icon: Icon, label, value, iconClass }) => (
  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
    <div className={`p-2 rounded-xl ${iconClass}`}>
      <Icon size={18} />
    </div>
    <div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

/* ── order detail bottom-sheet / modal ── */
const OrderModal = ({ order, onClose }) => {
  if (!order) return null;
  const name =
    typeof order.dispatchedTo === "object" && order.dispatchedTo?.name
      ? order.dispatchedTo.name
      : order.dispatchedTo;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md sm:mx-4 sm:rounded-2xl rounded-t-2xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-gray-900">Order Details</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
        <div className="space-y-1">
          {[
            ["Order ID",      order.orderId],
            ["Dispatched To", name],
            ["Chair Model",   order.chairModel],
            ["Quantity",      order.quantity],
            ["Order Date",    new Date(order.orderDate).toLocaleDateString()],
            ["Delivery Date", order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"],
            ["Status",        order.progress?.replaceAll("_", " ")],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-500">{k}</span>
              <span className="text-sm font-semibold text-gray-900 text-right max-w-[60%]">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function OrderHistory() {
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [range,         setRange]         = useState("thisMonth");
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("all");
  const [sortField,     setSortField]     = useState("orderDate");
  const [sortDir,       setSortDir]       = useState("desc");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const API    = process.env.NEXT_PUBLIC_API_URL;
  const token  = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ── fetch ── */
  const fetchHistory = async (r, isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      const res = await axios.get(`${API}/orders?range=${r}`, { headers });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error("Fetch history failed", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(range); }, [range]);

  /* ── derived data ── */
  const statuses = useMemo(
    () => ["all", ...new Set(orders.map((o) => o.progress).filter(Boolean))],
    [orders]
  );

  const stats = useMemo(() => ({
    total:     orders.length,
    totalQty:  orders.reduce((s, o) => s + (o.quantity || 0), 0),
    delivered: orders.filter((o) => o.progress?.toLowerCase() === "delivered").length,
    pending:   orders.filter((o) =>
      ["pending", "processing"].includes(o.progress?.toLowerCase())).length,
  }), [orders]);

  const filtered = useMemo(() => {
    let r = [...orders];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((o) =>
        o.orderId?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q) ||
        (typeof o.dispatchedTo === "object"
          ? o.dispatchedTo?.name
          : o.dispatchedTo)?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") r = r.filter((o) => o.progress === statusFilter);
    r.sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (sortField.includes("Date")) { av = new Date(av || 0); bv = new Date(bv || 0); }
      if (sortField === "quantity")   { av = +av; bv = +bv; }
      return sortDir === "asc"
        ? av < bv ? -1 : av > bv ? 1 : 0
        : av > bv ? -1 : av < bv ? 1 : 0;
    });
    return r;
  }, [orders, search, statusFilter, sortField, sortDir]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
  };

  /* ── export (exports currently filtered rows) ── */
  const exportToExcel = () => {
    if (!filtered.length) return;
    const data = filtered.map((o) => ({
      "Order ID":      o.orderId,
      "Dispatched To": typeof o.dispatchedTo === "object" && o.dispatchedTo?.name
                         ? o.dispatchedTo.name : o.dispatchedTo,
      "Chair Model":   o.chairModel,
      "Order Date":    new Date(o.orderDate).toLocaleDateString(),
      "Delivery Date": o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "",
      Quantity:        o.quantity,
      Status:          o.progress?.replaceAll("_", " "),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = Object.keys(data[0]).map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `orders_${range}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  /* ── sort icon ── */
  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === "asc"
        ? <ChevronUp   size={13} className="text-[#c62d23] shrink-0" />
        : <ChevronDown size={13} className="text-[#c62d23] shrink-0" />
      : <ChevronUp size={13} className="text-gray-300 shrink-0" />;

  const COLS = [
    { label: "Order ID",      field: "orderId",      sortable: true  },
    { label: "Dispatched To", field: "dispatchedTo", sortable: false },
    { label: "Chair",         field: "chairModel",   sortable: true  },
    { label: "Order Date",    field: "orderDate",    sortable: true  },
    { label: "Delivery Date", field: "deliveryDate", sortable: true  },
    { label: "Qty",           field: "quantity",     sortable: true  },
    { label: "Status",        field: "progress",     sortable: true  },
    { label: "",              field: "actions",      sortable: false },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {selectedOrder && (
        <OrderModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      <div className="flex-1 overflow-auto">

        {/* ══ HEADER ══ */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <History size={28} className="text-[#c62d23] shrink-0" />
                <span>Order History</span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                View and search your past orders
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Refresh */}
              <button
                onClick={() => fetchHistory(range, true)}
                disabled={refreshing}
                title="Refresh"
                className="p-2 sm:px-4 sm:py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2 text-sm font-medium shadow-sm"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Export */}
              <button
                onClick={exportToExcel}
                disabled={loading || filtered.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download size={16} />
                <span className="hidden sm:inline">Export Excel</span>
                <span className="sm:hidden">Export</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">

          {/* ══ STAT CARDS ══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={ShoppingCart} label="Total Orders"  value={stats.total}     iconClass="bg-blue-50 text-blue-600"    />
            <StatCard icon={Package}      label="Total Qty"      value={stats.totalQty}  iconClass="bg-violet-50 text-violet-600" />
            <StatCard icon={CheckCircle2} label="Delivered"      value={stats.delivered} iconClass="bg-green-50 text-green-600"   />
            <StatCard icon={Clock}        label="In Progress"    value={stats.pending}   iconClass="bg-yellow-50 text-yellow-600" />
          </div>

          {/* ══ FILTERS ══ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">

            {/* Time range */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Range</h3>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {[
                  { label: "Today",       value: "today"     },
                  { label: "Yesterday",   value: "yesterday" },
                  { label: "Last 7 Days", value: "last7days" },
                  { label: "This Month",  value: "thisMonth" },
                  { label: "Last Month",  value: "lastMonth" },
                ].map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setRange(btn.value)}
                    className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all ${
                      range === btn.value
                        ? "bg-[#c62d23] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + status filter */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by order ID, chair, or customer…"
                  className="w-full pl-9 pr-8 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="relative">
                <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full sm:w-auto pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] appearance-none cursor-pointer transition-all"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s === "all" ? "All Statuses" : s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {(search || statusFilter !== "all") && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Active filters:</span>
                {search && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    "{search}"
                    <button onClick={() => setSearch("")}><X size={11} /></button>
                  </span>
                )}
                {statusFilter !== "all" && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    {statusFilter.replaceAll("_", " ")}
                    <button onClick={() => setStatusFilter("all")}><X size={11} /></button>
                  </span>
                )}
                <button
                  onClick={() => { setSearch(""); setStatusFilter("all"); }}
                  className="text-xs text-gray-400 underline hover:text-gray-600"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ══ TABLE + MOBILE CARDS ══ */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
                <p className="mt-3 text-gray-500">Loading history…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-16 px-4">
                <CalendarDays size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm">No orders found for the selected period</p>
                {(search || statusFilter !== "all") && (
                  <button
                    onClick={() => { setSearch(""); setStatusFilter("all"); }}
                    className="mt-4 text-sm text-[#c62d23] underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* ─── Desktop table (md+) ─── */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {COLS.map((col) => (
                          <th
                            key={col.field}
                            onClick={() => col.sortable && toggleSort(col.field)}
                            className={`p-4 text-left font-semibold text-gray-700 select-none ${
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
                      {filtered.map((o, index) => {
                        const name =
                          typeof o.dispatchedTo === "object" && o.dispatchedTo?.name
                            ? o.dispatchedTo.name
                            : o.dispatchedTo;
                        return (
                          <tr
                            key={o._id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors group ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="p-4 font-semibold text-gray-900">{o.orderId}</td>
                            <td className="p-4 text-gray-700">{name}</td>
                            <td className="p-4 font-medium text-gray-900">{o.chairModel}</td>
                            <td className="p-4 text-gray-700">
                              {new Date(o.orderDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-gray-700">
                              {o.deliveryDate
                                ? new Date(o.deliveryDate).toLocaleDateString()
                                : "—"}
                            </td>
                            <td className="p-4 font-semibold text-gray-900">{o.quantity}</td>
                            <td className="p-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(o.progress)}`}>
                                {o.progress?.replaceAll("_", " ")}
                              </span>
                            </td>
                            <td className="p-4">
                              <button
                                onClick={() => setSelectedOrder(o)}
                                className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-[#c62d23] font-medium hover:underline transition-opacity whitespace-nowrap"
                              >
                                <Eye size={13} /> View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ─── Mobile cards (< md) ─── */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filtered.map((o) => {
                    const name =
                      typeof o.dispatchedTo === "object" && o.dispatchedTo?.name
                        ? o.dispatchedTo.name
                        : o.dispatchedTo;
                    return (
                      <button
                        key={o._id}
                        onClick={() => setSelectedOrder(o)}
                        className="w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors active:bg-gray-100"
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <p className="font-bold text-gray-900 text-sm">{o.orderId}</p>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${getStatusStyle(o.progress)}`}>
                            {o.progress?.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-800 flex items-center gap-1 mb-0.5">
                          <Truck size={12} className="text-gray-400 shrink-0" />
                          {o.chairModel}
                        </p>
                        <p className="text-xs text-gray-500 mb-2">{name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">
                            {new Date(o.orderDate).toLocaleDateString()}
                          </span>
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-lg">
                            Qty: {o.quantity}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                  <p className="text-xs text-gray-400">
                    Showing{" "}
                    <span className="font-semibold text-gray-600">{filtered.length}</span> of{" "}
                    <span className="font-semibold text-gray-600">{orders.length}</span> orders
                  </p>
                  <p className="text-xs text-gray-400">
                    Filtered qty:{" "}
                    <span className="font-semibold text-gray-600">
                      {filtered.reduce((s, o) => s + (o.quantity || 0), 0)}
                    </span>{" "}
                    units
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}