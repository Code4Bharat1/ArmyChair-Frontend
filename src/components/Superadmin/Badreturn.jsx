"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Download, Package, Search, X, ChevronUp, ChevronDown,
  AlertTriangle, Menu, ChevronRight, RotateCcw, XCircle
} from "lucide-react";
import InventorySidebar from "./sidebar";

export default function BadReturns() {
  const [badReturns,   setBadReturns]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [dateFilter,   setDateFilter]   = useState("ALL");
  const [selectedDate, setSelectedDate] = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchBadReturns = async () => {
    try {
      const res  = await fetch(`${API}/returns/bad-returns`, { headers });
      const data = await res.json();
      setBadReturns(data.data || []);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBadReturns(); }, []);

  /* ================= FILTER ================= */
  const filteredReturns = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return badReturns.filter((r) => {
      const q = search.toLowerCase();
      const createdDate = new Date(r.createdAt);
      createdDate.setHours(0, 0, 0, 0);

      if (dateFilter === "TODAY" && createdDate.getTime() !== today.getTime()) return false;
      if (dateFilter === "YESTERDAY") {
        const y = new Date(today); y.setDate(today.getDate() - 1);
        if (createdDate.getTime() !== y.getTime()) return false;
      }
      if (dateFilter === "LAST_7_DAYS") {
        const ago = new Date(today); ago.setDate(today.getDate() - 7);
        if (createdDate < ago) return false;
      }
      if (dateFilter === "LAST_30_DAYS") {
        const ago = new Date(today); ago.setDate(today.getDate() - 30);
        if (createdDate < ago) return false;
      }
      if (dateFilter === "CUSTOM" && selectedDate) {
        const picked = new Date(selectedDate); picked.setHours(0, 0, 0, 0);
        if (createdDate.getTime() !== picked.getTime()) return false;
      }

      return (
        r.orderId?.toLowerCase().includes(q) ||
        r.chairType?.toLowerCase().includes(q) ||
        r.returnedFrom?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q)
      );
    });
  }, [badReturns, search, dateFilter, selectedDate]);

  /* ================= STATS ================= */
  const totalBadReturns = filteredReturns.length;
  const totalQuantity   = filteredReturns.reduce((s, r) => s + Number(r.quantity || 0), 0);
  const uniqueOrders    = new Set(filteredReturns.map((r) => r.orderId)).size;
  const uniqueChairs    = new Set(filteredReturns.map((r) => r.chairType)).size;

  /* ================= CSV EXPORT ================= */
  const exportCSV = () => {
    if (!filteredReturns.length) return alert("No data to export");

    const cols = ["Order ID", "Chair Type", "Quantity", "Reason", "Returned From", "Logged By", "Date"];
    const rows = filteredReturns.map((r) => [
      r.orderId,
      r.chairType,
      r.quantity,
      r.reason || "",
      r.returnedFrom || "",
      r.createdBy?.name || "",
      new Date(r.createdAt).toLocaleDateString("en-GB"),
    ]);

    const csv = [cols, ...rows]
      .map((row) => row.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href     = url;
    link.download = `bad_returns_${new Date().toISOString().slice(0, 10)}.csv`;
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
                  <XCircle size={20} className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <span className="truncate">Bad Returns</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block">
                  Items rejected during fitting inspection
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
            <StatCard title="Total Bad Returns" value={totalBadReturns} icon={<XCircle    className="text-[#c62d23]" />} />
            <StatCard title="Total Quantity"    value={totalQuantity}   icon={<Package    className="text-[#c62d23]" />} />
            <StatCard title="Unique Orders"     value={uniqueOrders}    icon={<RotateCcw  className="text-[#c62d23]" />} />
            <StatCard title="Chair Types"       value={uniqueChairs}    icon={<AlertTriangle className="text-[#c62d23]" />} />
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
                placeholder="Search by order ID, chair type, reason…"
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

          {/* TABLE */}
          {loading ? (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]" />
              <p className="mt-2 text-gray-500 text-sm">Loading...</p>
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 py-16">
              <Package size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No bad returns found</p>
              {(search || dateFilter !== "ALL") && (
                <button onClick={() => { setSearch(""); setDateFilter("ALL"); setSelectedDate(""); }}
                  className="mt-4 text-sm text-[#c62d23] underline">Clear filters</button>
              )}
            </div>
          ) : (
            <BadReturnsTable returns={filteredReturns} />
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

/* ================= BAD RETURNS TABLE ================= */
const BadReturnsTable = ({ returns }) => {
  const [sortField, setSortField] = useState("createdAt");
  const [sortDir,   setSortDir]   = useState("desc");
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);

  useEffect(() => { setPage(1); }, [returns]);

  const sorted = useMemo(() => {
    return [...returns].sort((a, b) => {
      let av = a[sortField], bv = b[sortField];
      if (["createdAt"].includes(sortField)) { av = new Date(av || 0); bv = new Date(bv || 0); }
      if (sortField === "quantity") { av = +av; bv = +bv; }
      if (sortField === "orderId" || sortField === "chairType") {
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      }
      return sortDir === "asc"
        ? (av < bv ? -1 : av > bv ? 1 : 0)
        : (av > bv ? -1 : av < bv ? 1 : 0);
    });
  }, [returns, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paginated  = sorted.slice((page - 1) * pageSize, page * pageSize);

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

  const COLS = [
    { label: "Order ID",      field: "orderId",    sortable: true  },
    { label: "Chair Type",    field: "chairType",  sortable: true  },
    { label: "Quantity",      field: "quantity",   sortable: true  },
    { label: "Reason",        field: null,         sortable: false },
    { label: "Returned From", field: null,         sortable: false },
    { label: "Logged By",     field: null,         sortable: false },
    { label: "Date",          field: "createdAt",  sortable: true  },
  ];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* warning banner */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-red-50 border-b border-red-100">
        <AlertTriangle size={14} className="text-red-500 shrink-0" />
        <p className="text-xs text-red-600 font-medium">
          {sorted.length} item{sorted.length !== 1 ? "s" : ""} flagged as bad during fitting inspection
        </p>
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
                  <span className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && <SortIcon field={col.field} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((r, index) => (
              <tr
                key={r._id}
                className={`border-b border-gray-100 transition-colors ${
                  index % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{r.orderId}</td>
                <td className="p-3 lg:p-4 text-gray-800 text-xs lg:text-sm font-medium">{r.chairType}</td>
                <td className="p-3 lg:p-4">
                  <span className="inline-flex items-center justify-center bg-red-100 text-red-700 font-bold text-xs px-2.5 py-1 rounded-full border border-red-200">
                    {r.quantity}
                  </span>
                </td>
                <td className="p-3 lg:p-4 text-gray-600 text-xs lg:text-sm max-w-xs">
                  {r.reason ? (
                    <span className="line-clamp-2">{r.reason}</span>
                  ) : (
                    <span className="text-gray-300 italic">No reason provided</span>
                  )}
                </td>
                <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{r.returnedFrom || "—"}</td>
                <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{r.createdBy?.name || "—"}</td>
                <td className="p-3 lg:p-4 text-gray-500 text-xs lg:text-sm whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── MOBILE CARDS ── */}
      <div className="md:hidden divide-y divide-gray-100">
        {paginated.map((r) => (
          <div key={r._id} className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{r.orderId}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{r.chairType}</p>
              </div>
              <span className="inline-flex items-center justify-center bg-red-100 text-red-700 font-bold text-xs px-2.5 py-1 rounded-full border border-red-200 shrink-0">
                Qty: {r.quantity}
              </span>
            </div>

            {r.reason && (
              <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                📝 {r.reason}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <p className="text-gray-400 mb-0.5">Returned From</p>
                <p className="font-medium text-gray-700">{r.returnedFrom || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Logged By</p>
                <p className="font-medium text-gray-700">{r.createdBy?.name || "—"}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-0.5">Date</p>
                <p className="font-medium text-gray-700">
                  {new Date(r.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── PAGINATION ── */}
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span>
            <span className="font-semibold text-gray-600">
              {sorted.length === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)}
            </span>{" "}of{" "}
            <span className="font-semibold text-gray-600">{sorted.length}</span> records
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