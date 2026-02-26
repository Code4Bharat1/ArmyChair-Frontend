//sales spare parts inventory page - view only with export csv
"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  Boxes,
  TrendingDown,
  Warehouse,
  MapPin,
  Building2,
  Menu,
  X,
  UserCircle,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  Package,
  Search,
  Download,
} from "lucide-react";
import axios from "axios";


const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/* ================= ANIMATIONS ================= */
const animStyles = `
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .anim-fadeIn { animation: fadeIn 0.2s ease-in-out; }
`;

/* ================= CSV EXPORT ================= */
const exportToCSV = (filteredGroupedParts) => {
  const rows = [
    ["Part Name", "Vendor", "Location", "Available", "Max Quantity", "Min Quantity", "Status", "Remark", "Created At"],
  ];
  filteredGroupedParts.forEach((part) => {
    part.locations.forEach((loc) => {
      rows.push([
        part.partName,
        loc.vendorName,
        loc.location,
        loc.quantity,
        loc.maxQuantity ?? "",
        loc.minQuantity ?? "",
        loc.status,
        loc.remark || "",
        loc.createdAt ? new Date(loc.createdAt).toLocaleDateString() : "",
      ]);
    });
  });
  const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `spare-parts-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

/* ================= PAGE ================= */
export default function SalesSparePartsInventory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("highlight");

  const [items,           setItems]           = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [sidebarOpen,     setSidebarOpen]     = useState(false);
  const [search,          setSearch]          = useState("");
  const [statusFilter,    setStatusFilter]    = useState("ALL");
  const [expandedParts,   setExpandedParts]   = useState(new Set());
  const [activeHighlight, setActiveHighlight] = useState(null);
  const rowRefs = useRef({});

  // Server-side pagination
  const [serverPage,       setServerPage]       = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const SERVER_LIMIT = 100;

  // Client-side pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(25);

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchParts = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/inventory/spare-parts`, {
        params: { page: serverPage, limit: SERVER_LIMIT, status: statusFilter === "ALL" ? undefined : statusFilter },
        headers,
      });
      setItems(res.data.inventory || []);
      setServerTotalPages(res.data.totalPages || 1);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParts(); }, [serverPage, statusFilter]);
  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, pageSize]);

  /* Highlight scroll */
  useEffect(() => {
    if (!highlightId || !items.length) return;
    const exists = items.find((i) => i._id === highlightId);
    if (!exists) return;
    const timer = setTimeout(() => {
      const row = rowRefs.current[highlightId];
      if (row) {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
        setActiveHighlight(highlightId);
        setTimeout(() => setActiveHighlight(null), 5000);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [highlightId, items]);

  /* ================= GROUP DATA ================= */
  const groupedParts = useMemo(() => {
    const grouped = new Map();
    items.forEach((item) => {
      const key = item.partName.trim().toLowerCase();
      if (!grouped.has(key)) {
        grouped.set(key, { partName: item.partName, locations: [], totalQuantity: 0, totalMinQuantity: 0, totalMaxQuantity: 0, worstStatus: "Healthy", locationCount: 0 });
      }
      const g = grouped.get(key);
      g.locations.push({
        id: item._id, location: item.location, quantity: item.quantity,
        minQuantity: item.minQuantity || 0, maxQuantity: item.maxQuantity,
        status: item.status, remark: item.remark || "",
        vendorName: item.vendor?.name || "—", createdAt: item.createdAt || null,
      });
      g.totalQuantity    += item.quantity;
      g.totalMinQuantity += item.minQuantity || 0;
      g.totalMaxQuantity += item.maxQuantity || 0;
      g.locationCount     = g.locations.length;
      const priority = { Critical: 4, "Low Stock": 3, Overstocked: 2, Healthy: 1 };
      if ((priority[item.status] || 0) > (priority[g.worstStatus] || 0)) g.worstStatus = item.status;
    });
    return Array.from(grouped.values()).sort((a, b) =>
      a.partName.localeCompare(b.partName, undefined, { sensitivity: "base" })
    );
  }, [items]);

  /* ================= FILTER ================= */
  const filteredGroupedParts = useMemo(() => {
    let filtered = groupedParts;
    if (search.trim()) {
      const s = search.toLowerCase().trim();
      filtered = filtered.filter((p) => p.partName.toLowerCase().includes(s));
    }
    if (statusFilter === "LOW")            filtered = filtered.filter((p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical");
    else if (statusFilter === "OVERSTOCK") filtered = filtered.filter((p) => p.worstStatus === "Overstocked");
    return filtered;
  }, [groupedParts, statusFilter, search]);

  /* ================= CLIENT PAGINATION ================= */
  const totalItems = filteredGroupedParts.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage   = Math.min(currentPage, totalPages);
  const startIdx   = (safePage - 1) * pageSize;
  const endIdx     = Math.min(startIdx + pageSize, totalItems);
  const paginatedParts = filteredGroupedParts.slice(startIdx, endIdx);

  const goToPage = (p) => setCurrentPage(Math.max(1, Math.min(p, totalPages)));

  const pageNumbers = useMemo(() => {
    const pages = [], delta = 2;
    const left = Math.max(1, safePage - delta), right = Math.min(totalPages, safePage + delta);
    for (let i = left; i <= right; i++) pages.push(i);
    return pages;
  }, [safePage, totalPages]);

  const toggleExpand = (partName) => {
    const next = new Set(expandedParts);
    next.has(partName) ? next.delete(partName) : next.add(partName);
    setExpandedParts(next);
  };

  /* ================= STATS ================= */
  const totalParts = groupedParts.length;
  const totalQty   = groupedParts.reduce((s, p) => s + p.totalQuantity, 0);
  const lowStock   = groupedParts.filter((p) => p.worstStatus === "Low Stock" || p.worstStatus === "Critical").length;
  const overStock  = groupedParts.filter((p) => p.worstStatus === "Overstocked").length;

  /* ================= UI ================= */
  return (
    <>
      <style>{animStyles}</style>
      <div className="flex h-screen bg-gray-50 text-gray-900">

        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        

        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">

          {/* HEADER */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-gray-200 px-4 py-3 sm:px-6 sm:py-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden text-gray-900 hover:text-[#c62d23] p-2 hover:bg-red-50 rounded-lg transition flex-shrink-0">
                  <Menu size={22} />
                </button>
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate leading-tight">
                    Spare Parts Inventory
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 hidden sm:block font-medium">
                    View spare parts stock levels and availability
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => exportToCSV(filteredGroupedParts)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl font-medium flex items-center gap-1.5 transition shadow-sm text-xs sm:text-sm"
                  title="Export to CSV"
                >
                  <Download size={15} />
                  <span className="hidden sm:inline">Export CSV</span>
                  <span className="sm:hidden">CSV</span>
                </button>
                <button onClick={() => router.push("/profile")} title="My Profile" className="text-gray-900 hover:text-[#c62d23] transition p-1">
                  <UserCircle size={30} className="sm:w-8 sm:h-8" />
                </button>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="p-3 sm:p-5 md:p-6 lg:p-8 space-y-5 md:space-y-6">

            {/* STATS */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard title="Unique Parts"   value={totalParts} icon={<Package className="text-[#c62d23]" />}     active={statusFilter === "ALL"}       onClick={() => setStatusFilter("ALL")} />
              <KpiCard title="Total Stock"    value={totalQty}   icon={<Warehouse className="text-[#c62d23]" />} />
              <KpiCard title="Low / Critical" value={lowStock}   icon={<TrendingDown className="text-[#c62d23]" />} danger active={statusFilter === "LOW"}       onClick={() => setStatusFilter("LOW")} />
              <KpiCard title="Overstocked"    value={overStock}  icon={<Boxes className="text-blue-600" />}         info   active={statusFilter === "OVERSTOCK"} onClick={() => setStatusFilter("OVERSTOCK")} />
            </div>

            {/* ALERT */}
            {lowStock > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4 flex gap-2 sm:gap-3 items-center">
                <AlertCircle className="text-red-500 flex-shrink-0" size={18} />
                <span className="text-red-700 font-semibold text-sm sm:text-base">
                  {lowStock} part{lowStock !== 1 ? "s" : ""} need restocking
                </span>
              </div>
            )}

            {/* ===== DESKTOP TABLE ===== */}
            <div className="hidden md:block bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="flex justify-between items-center px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                  <input
                    type="text" placeholder="Search part name..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-64 pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-white"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"><X size={14} /></button>
                  )}
                </div>
                <div className="text-sm text-gray-900 font-semibold">
                  {filteredGroupedParts.length} part{filteredGroupedParts.length !== 1 ? "s" : ""} &bull; {items.length} location entries
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse" style={{ fontSize: "14px" }}>
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-10 px-4 py-3.5"></th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 tracking-wide text-sm">Part Name</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Vendor</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Remark</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Locations</th>
                      <th className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Total Min</th>
                      <th className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Available Qty</th>
                      <th className="px-4 py-3.5 text-right font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Total Max</th>
                      <th className="px-4 py-3.5 text-left font-bold text-gray-900 whitespace-nowrap tracking-wide text-sm">Status</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr><td colSpan="9" className="py-16 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                        <p className="mt-3 text-gray-700 text-sm font-medium">Loading inventory...</p>
                      </td></tr>
                    ) : paginatedParts.length === 0 ? (
                      <tr><td colSpan="9" className="py-16 text-center text-gray-700 text-sm font-medium">No parts found</td></tr>
                    ) : (
                      paginatedParts.map((part) => (
                        <React.Fragment key={part.partName}>
                          {/* MASTER ROW */}
                          <tr className="hover:bg-gray-50/80 cursor-pointer transition-colors group" onClick={() => toggleExpand(part.partName)}>
                            <td className="px-4 py-4 text-center text-gray-900 group-hover:text-gray-600 transition-colors">
                              {expandedParts.has(part.partName) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </td>
                            <td className="px-4 py-4 font-bold text-gray-900 whitespace-nowrap text-[15px]">{part.partName}</td>
                            <td className="px-4 py-4 text-gray-900 font-medium text-sm">
                              {[...new Set(part.locations.map((l) => l.vendorName))].join(", ") || "—"}
                            </td>
                            <td className="px-4 py-4 text-gray-700 text-sm">—</td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-gray-900 rounded-md font-semibold text-sm">
                                <MapPin size={11} className="text-[#c62d23]" />{part.locationCount}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-semibold text-gray-900 tabular-nums text-sm">{part.totalMinQuantity || "—"}</td>
                            <td className="px-4 py-4 text-right font-bold text-gray-900 tabular-nums text-[15px]">{part.totalQuantity}</td>
                            <td className="px-4 py-4 text-right font-semibold text-gray-900 tabular-nums text-sm">{part.totalMaxQuantity || "—"}</td>
                            <td className="px-4 py-4"><StatusBadge status={part.worstStatus} /></td>
                          </tr>

                          {/* LOCATION DETAIL ROWS */}
                          {expandedParts.has(part.partName) && part.locations.map((loc, idx) => (
                            <tr
                              key={loc.id}
                              ref={(el) => (rowRefs.current[loc.id] = el)}
                              className={`bg-slate-50/60 hover:bg-slate-100/50 transition-colors ${
                                idx === part.locations.length - 1 ? "border-b-2 border-gray-200" : ""
                              } ${activeHighlight === loc.id ? "ring-2 ring-inset ring-[#c62d23] bg-red-50" : ""}`}
                            >
                              <td className="px-4 py-3"></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5 text-gray-900 pl-4 font-medium text-sm">
                                  <Building2 size={12} className="text-gray-500" />
                                  <span>{loc.vendorName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-900 font-medium text-sm">{loc.vendorName}</td>
                              <td className="px-4 py-3 text-gray-800 max-w-[160px] truncate text-sm font-medium" title={loc.remark}>
                                {loc.remark || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center gap-1 font-semibold text-gray-900 text-sm">
                                  <MapPin size={12} className="text-[#c62d23]" />{loc.location}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums text-sm">{loc.minQuantity || "—"}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums text-[15px]">{loc.quantity}</td>
                              <td className="px-4 py-3 text-right font-semibold text-gray-900 tabular-nums text-sm">{loc.maxQuantity ?? "—"}</td>
                              <td className="px-4 py-3"><StatusBadge status={loc.status} size="sm" /></td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION BAR */}
              {totalItems > 0 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>Rows per page:</span>
                      <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className="border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#c62d23] cursor-pointer"
                      >
                        {PAGE_SIZE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <span className="text-xs text-gray-400">{startIdx + 1}–{endIdx} of {totalItems}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <PagBtn onClick={() => goToPage(1)} disabled={safePage === 1} title="First page"><ChevronsLeft size={14} /></PagBtn>
                    <PagBtn onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} title="Previous page"><ChevronLeft size={14} /></PagBtn>
                    {pageNumbers[0] > 1 && (
                      <><PagBtn onClick={() => goToPage(1)}>1</PagBtn>
                      {pageNumbers[0] > 2 && <span className="px-1 text-gray-400 text-xs">…</span>}</>
                    )}
                    {pageNumbers.map((p) => <PagBtn key={p} onClick={() => goToPage(p)} active={p === safePage}>{p}</PagBtn>)}
                    {pageNumbers[pageNumbers.length - 1] < totalPages && (
                      <>{pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400 text-xs">…</span>}
                      <PagBtn onClick={() => goToPage(totalPages)}>{totalPages}</PagBtn></>
                    )}
                    <PagBtn onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} title="Next page"><ChevronRight size={14} /></PagBtn>
                    <PagBtn onClick={() => goToPage(totalPages)} disabled={safePage === totalPages} title="Last page"><ChevronsRight size={14} /></PagBtn>
                  </div>
                </div>
              )}
            </div>

            {/* ===== MOBILE CARDS ===== */}
            <div className="md:hidden space-y-3">
              <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={15} />
                  <input
                    type="text" placeholder="Search part name..." value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none text-sm font-medium text-gray-900 bg-white"
                  />
                  {search && (
                    <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"><X size={13} /></button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                  <p className="mt-2 text-gray-900 text-sm font-medium">Loading...</p>
                </div>
              ) : paginatedParts.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-700 border border-gray-200 text-sm font-medium">No spare parts found</div>
              ) : (
                <>
                  {paginatedParts.map((part) => (
                    <div key={part.partName} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 cursor-pointer" onClick={() => toggleExpand(part.partName)}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {expandedParts.has(part.partName)
                              ? <ChevronDown size={16} className="text-gray-700 flex-shrink-0" />
                              : <ChevronRight size={16} className="text-gray-700 flex-shrink-0" />}
                            <h3 className="font-bold text-gray-900 text-base truncate">{part.partName}</h3>
                          </div>
                          <StatusBadge status={part.worstStatus} />
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700 text-sm mb-3 pl-6 font-medium">
                          <MapPin size={12} className="text-gray-500" />
                          <span>{part.locationCount} location{part.locationCount !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm pl-6">
                          <div>
                            <p className="text-gray-600 mb-0.5 font-medium">Total Stock</p>
                            <p className="font-bold text-gray-900 text-xl leading-none">{part.totalQuantity}</p>
                          </div>
                          <div>
                            <p className="text-gray-600 mb-0.5 font-medium">Total Max</p>
                            <p className="font-bold text-gray-900 text-base">{part.totalMaxQuantity || "—"}</p>
                          </div>
                        </div>
                      </div>

                      {expandedParts.has(part.partName) && (
                        <div className="border-t border-gray-200 divide-y divide-gray-100 bg-gray-50/50">
                          {part.locations.map((loc) => (
                            <div key={loc.id} ref={(el) => (rowRefs.current[loc.id] = el)} className={`p-4 ${activeHighlight === loc.id ? "bg-red-50 ring-2 ring-inset ring-[#c62d23]" : ""}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                  <MapPin size={14} className="text-[#c62d23]" />
                                  <span className="font-bold text-gray-900 text-base">{loc.location}</span>
                                </div>
                                <StatusBadge status={loc.status} size="sm" />
                              </div>
                              <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
                                <div><p className="text-gray-600 mb-0.5 font-medium">Quantity</p><p className="font-bold text-gray-900 text-lg">{loc.quantity}</p></div>
                                <div><p className="text-gray-600 mb-0.5 font-medium">Max Qty</p><p className="font-bold text-gray-900 text-base">{loc.maxQuantity ?? "—"}</p></div>
                              </div>
                              <div className="flex items-center gap-1.5 text-sm text-gray-900 font-medium mb-1">
                                <Building2 size={13} className="text-gray-600" /><span>{loc.vendorName}</span>
                              </div>
                              {loc.remark && <p className="text-sm text-gray-700 italic mb-1 font-medium">{loc.remark}</p>}
                              {loc.createdAt && (
                                <p className="text-[10px] text-gray-400">Added: {new Date(loc.createdAt).toLocaleDateString()}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Mobile Pagination */}
                  {totalItems > 0 && (
                    <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center justify-between shadow-sm">
                      <span className="text-xs text-gray-500">{startIdx + 1}–{endIdx} of {totalItems}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                          <ChevronLeft size={15} />
                        </button>
                        <span className="text-xs text-gray-700 font-medium px-1">Page {safePage} / {totalPages}</span>
                        <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition">
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================= PAGINATION BUTTON ================= */
const PagBtn = ({ children, onClick, disabled, active, title }) => (
  <button
    onClick={onClick} disabled={disabled} title={title}
    className={`min-w-[28px] h-7 px-1.5 rounded-md text-xs font-medium transition-all flex items-center justify-center
      ${active ? "bg-[#c62d23] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 border border-transparent hover:border-gray-200"}
      ${disabled ? "opacity-35 cursor-not-allowed pointer-events-none" : "cursor-pointer"}`}
  >
    {children}
  </button>
);

/* ================= KPI CARD ================= */
const KpiCard = ({ title, value, icon, danger = false, info = false, active = false, onClick }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full
      ${active ? "ring-2 ring-[#c62d23] border-[#c62d23]/30" : "border-gray-200"}`}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      {React.cloneElement(icon, { size: 20 })}
    </div>
    <p className={`text-3xl sm:text-4xl font-bold ${danger ? "text-red-600" : info ? "text-blue-600" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);

/* ================= STATUS BADGE ================= */
const StatusBadge = ({ status, size = "default" }) => {
  const map = {
    Healthy:     "bg-green-50 text-green-800 border border-green-200 font-semibold",
    "Low Stock": "bg-amber-50 text-amber-800 border border-amber-200 font-semibold",
    Critical:    "bg-red-50 text-red-800 border border-red-200 font-semibold",
    Overstocked: "bg-blue-50 text-blue-800 border border-blue-200 font-semibold",
  };
  const sizeClasses = size === "sm" ? "px-2.5 py-0.5 text-xs" : "px-3 py-1 text-xs";
  return (
    <span className={`${sizeClasses} rounded-full whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-900 border border-gray-200 font-semibold"}`}>
      {status}
    </span>
  );
};