"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { 
  ArrowRightLeft, 
  Clock, 
  MapPin, 
  User, 
  Loader2, 
  UserCircle, 
  Package,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X
} from "lucide-react";
import { useRouter } from "next/navigation";

/* ============ HELPERS ============ */
const API = process.env.NEXT_PUBLIC_API_URL;
const token = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);
const hdrs = () => ({ Authorization: `Bearer ${token()}` });

const ITEMS_PER_PAGE = 10;

/* ============ MAIN PAGE ============ */
export default function ProductionTransfersPage() {
  const router = useRouter();

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWorker, setSelectedWorker] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  /* ─── auth ─── */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!user || user.role !== "production") router.push("/login");
  }, [router]);

  /* ─── fetch ─── */
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await axios.get(`${API}/transfer/stock-movement`, { headers: hdrs() });
        setMovements(res.data.movements || []);
      } catch (e) {
        console.error("Fetch transfers failed", e);
        toast.error("Failed to load transfer records");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  /* ─── filter to production only ─── */
  const productionTransfers = useMemo(() => 
    movements.filter((m) => m.toLocation?.startsWith("PROD_")), 
    [movements]
  );

  /* ─── get unique values for filters ─── */
  const uniqueWorkers = useMemo(() => {
    const workers = new Set();
    productionTransfers.forEach(m => {
      if (m.movedBy?.name) workers.add(m.movedBy.name);
    });
    return Array.from(workers).sort();
  }, [productionTransfers]);

  const uniqueLocations = useMemo(() => {
    const locations = new Set();
    productionTransfers.forEach(m => {
      if (m.toLocation) locations.add(m.toLocation);
    });
    return Array.from(locations).sort();
  }, [productionTransfers]);

  /* ─── apply filters and search ─── */
  const filteredTransfers = useMemo(() => {
    let result = [...productionTransfers];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(m => 
        (m.partName?.toLowerCase().includes(term)) ||
        (m.chairType?.toLowerCase().includes(term)) ||
        (m.fromLocation?.toLowerCase().includes(term)) ||
        (m.toLocation?.toLowerCase().includes(term))
      );
    }

    // Worker filter
    if (selectedWorker) {
      result = result.filter(m => m.movedBy?.name === selectedWorker);
    }

    // Location filter
    if (selectedLocation) {
      result = result.filter(m => m.toLocation === selectedLocation);
    }

    // Date range filter
    if (dateRange.start) {
      result = result.filter(m => new Date(m.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      result = result.filter(m => new Date(m.createdAt) <= new Date(dateRange.end));
    }

    // Sort by date (newest first)
    return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [productionTransfers, searchTerm, selectedWorker, selectedLocation, dateRange]);

  /* ─── pagination ─── */
  const totalPages = Math.ceil(filteredTransfers.length / ITEMS_PER_PAGE);
  const paginatedTransfers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransfers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransfers, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedWorker, selectedLocation, dateRange]);

  /* ─── derived stats ─── */
  const totalQty = useMemo(() => 
    filteredTransfers.reduce((s, m) => s + (m.quantity || 0), 0), 
    [filteredTransfers]
  );

  const uniqueParts = useMemo(() => {
    const set = new Set();
    filteredTransfers.forEach((m) => {
      if (m.partName) set.add(m.partName);
    });
    return set.size;
  }, [filteredTransfers]);

  /* ─── clear all filters ─── */
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedWorker("");
    setSelectedLocation("");
    setDateRange({ start: "", end: "" });
    toast.success("Filters cleared");
  };

  const activeFiltersCount = [
    searchTerm,
    selectedWorker,
    selectedLocation,
    dateRange.start,
    dateRange.end
  ].filter(Boolean).length;

  /* ─── export to CSV ─── */
  const exportToCSV = () => {
    const headers = ["Part Name", "Quantity", "From", "To", "Moved By", "Date"];
    const rows = filteredTransfers.map(m => [
      m.partName || m.chairType || "",
      m.quantity || 0,
      m.fromLocation || "",
      m.toLocation || "",
      m.movedBy?.name || "Unknown",
      new Date(m.createdAt).toLocaleString("en-IN")
    ]);

    const csv = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transfer-records-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success("Export successful");
  };

  /* ─── format helpers ─── */
  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return (
      d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
    );
  };

  const fmtDateShort = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  /* ═══════ RENDER ═══════ */
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Toast Notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#fff',
            color: '#1f2937',
            border: '1px solid #e5e7eb',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          {/* Desktop Header */}
          <div className="hidden md:block p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <ArrowRightLeft size={32} className="text-[#c62d23]" />
                  <span>Transfer Records</span>
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  View all inventory transfers to production
                </p>
              </div>

              <button
                onClick={() => router.push("/profile")}
                title="My Profile"
                className="text-gray-600 hover:text-[#c62d23] transition"
              >
                <UserCircle size={34} />
              </button>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <ArrowRightLeft size={24} className="text-[#c62d23]" />
                <span>Transfers</span>
              </h1>
              <button
                onClick={() => router.push("/profile")}
                className="text-gray-600 hover:text-[#c62d23] transition p-2"
              >
                <UserCircle size={28} />
              </button>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="p-4 md:p-8 space-y-4 md:space-y-8">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
              <p className="mt-2 text-gray-500">Loading transfers...</p>
            </div>
          ) : (
            <>
              {/* STATS */}
              <div className="grid grid-cols-3 gap-3 md:gap-6">
                <StatCard
                  title="Total"
                  value={filteredTransfers.length}
                  icon={<ArrowRightLeft className="text-[#c62d23]" />}
                  subtitle="transfers"
                />

                <StatCard
                  title="Quantity"
                  value={totalQty}
                  icon={<Package className="text-[#c62d23]" />}
                  subtitle="units"
                />

                <StatCard
                  title="Parts"
                  value={uniqueParts}
                  icon={<Package className="text-[#c62d23]" />}
                  subtitle="unique"
                />
              </div>

              {/* SEARCH & FILTERS BAR */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by part name, location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg bg-white text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                    />
                  </div>

                  {/* Filter Toggle Button */}
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all inline-flex items-center gap-2 whitespace-nowrap ${
                      showFilters || activeFiltersCount > 0
                        ? "bg-[#c62d23] text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    <Filter size={16} />
                    <span className="hidden sm:inline">Filters</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-white text-[#c62d23] px-2 py-0.5 rounded-full text-xs font-bold">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>

                  {/* Export Button */}
                  <button
                    onClick={exportToCSV}
                    disabled={filteredTransfers.length === 0}
                    className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-all inline-flex items-center gap-2 whitespace-nowrap disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Worker Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Worker</label>
                      <select
                        value={selectedWorker}
                        onChange={(e) => setSelectedWorker(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                      >
                        <option value="">All Workers</option>
                        {uniqueWorkers.map(w => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>

                    {/* Location Filter */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                      <select
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                      >
                        <option value="">All Locations</option>
                        {uniqueLocations.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                    {/* Date From */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">From Date</label>
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                      />
                    </div>

                    {/* Date To */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">To Date</label>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all outline-none"
                      />
                    </div>

                    {/* Clear Filters */}
                    {activeFiltersCount > 0 && (
                      <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                        <button
                          onClick={clearFilters}
                          className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-all inline-flex items-center gap-2"
                        >
                          <X size={14} />
                          Clear All Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Results Count */}
              {activeFiltersCount > 0 && (
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold text-gray-900">{filteredTransfers.length}</span> of{" "}
                  <span className="font-semibold text-gray-900">{productionTransfers.length}</span> transfers
                </div>
              )}

              {/* TABLE - DESKTOP */}
              <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                {paginatedTransfers.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <ArrowRightLeft size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {filteredTransfers.length === 0 && productionTransfers.length > 0
                        ? "No transfers match your filters"
                        : "No transfers found"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {filteredTransfers.length === 0 && productionTransfers.length > 0
                        ? "Try adjusting your search or filters"
                        : "Transfer records will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {["Part Name", "Quantity", "From Location", "To Location", "Moved By", "Date & Time"].map(
                            (h) => (
                              <th key={h} className="p-4 text-left font-semibold text-gray-700">
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>

                      <tbody>
                        {paginatedTransfers.map((m, index) => (
                          <tr
                            key={m._id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            <td className="p-4 font-semibold text-gray-900 capitalize">
                              {m.partName || m.chairType || "—"}
                            </td>

                            <td className="p-4">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                                {m.quantity}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-2 text-gray-700">
                                <MapPin size={14} className="text-gray-400" />
                                <span>{m.fromLocation || "—"}</span>
                              </div>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-2 text-gray-900 font-medium">
                                <MapPin size={14} className="text-[#c62d23]" />
                                <span>{m.toLocation || "—"}</span>
                              </div>
                            </td>

                            <td className="p-4">
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                                <User size={12} className="text-[#c62d23]" />
                                {m.movedBy?.name || "Unknown"}
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex items-center gap-2 text-gray-600 text-xs">
                                <Clock size={14} className="text-gray-400" />
                                <span>{fmtDate(m.createdAt)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* MOBILE CARDS */}
              <div className="md:hidden space-y-4">
                {paginatedTransfers.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 py-16">
                    <ArrowRightLeft size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">
                      {filteredTransfers.length === 0 && productionTransfers.length > 0
                        ? "No matches found"
                        : "No transfers found"}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {filteredTransfers.length === 0 && productionTransfers.length > 0
                        ? "Try different filters"
                        : "Records will appear here"}
                    </p>
                  </div>
                ) : (
                  paginatedTransfers.map((m) => (
                    <div
                      key={m._id}
                      className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-100">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 capitalize text-base mb-1">
                              {m.partName || m.chairType || "—"}
                            </h3>
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 inline-block">
                              Qty: {m.quantity}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                            <span className="text-gray-500 font-medium min-w-[50px]">From:</span>
                            <span className="text-gray-700">{m.fromLocation || "—"}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin size={14} className="text-[#c62d23] flex-shrink-0" />
                            <span className="text-gray-500 font-medium min-w-[50px]">To:</span>
                            <span className="text-gray-900 font-semibold">{m.toLocation || "—"}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className="px-3 py-1 rounded-full font-medium bg-gray-100 text-gray-700 inline-flex items-center gap-1">
                            <User size={11} className="text-[#c62d23]" />
                            {m.movedBy?.name || "Unknown"}
                          </span>
                          <div className="flex items-center gap-1 text-gray-500">
                            <Clock size={12} className="text-gray-400" />
                            <span>{fmtDateShort(m.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                  {/* Mobile Pagination */}
                  <div className="flex md:hidden flex-col gap-3">
                    <div className="text-sm text-gray-600 text-center">
                      Page <span className="font-semibold text-gray-900">{currentPage}</span> of{" "}
                      <span className="font-semibold text-gray-900">{totalPages}</span>
                    </div>

                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                      >
                        Previous
                      </button>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
                      >
                        Next
                      </button>
                    </div>
                  </div>

                  {/* Desktop Pagination */}
                  <div className="hidden md:flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Page <span className="font-semibold text-gray-900">{currentPage}</span> of{" "}
                      <span className="font-semibold text-gray-900">{totalPages}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft size={16} />
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                                currentPage === pageNum
                                  ? "bg-[#c62d23] text-white"
                                  : "hover:bg-gray-100 text-gray-700"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>

                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
const StatCard = ({ title, value, icon, subtitle }) => (
  <div
    className="bg-white border rounded-2xl p-4 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200 hover:border-[#c62d23]"
    style={{
      borderLeft: "4px solid #c62d23",
    }}
  >
    <div className="flex justify-between items-start mb-2 md:mb-4">
      <p className="text-xs md:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: window.innerWidth < 768 ? 20 : 24 })}
    </div>
    <p className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {subtitle && (
      <div className="mt-1 md:mt-2 text-xs text-gray-500">
        {subtitle}
      </div>
    )}
  </div>
);