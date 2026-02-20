"use client";
import { formatDate } from "@/utils/formatDate";
import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Package,
  User,
  Clock,
  MapPin,
  ArrowRightLeft,
  TrendingUp,
  X,
  AlertCircle,
  Menu,
  UserCircle,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import InventorySidebar from "./sidebar";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 10;

export default function StockMovementsPage() {
  const router = useRouter();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inventoryList, setInventoryList] = useState([]);
  const [selectedItems, setSelectedItems] = useState([{ sourceId: "", quantity: "" }]);
  const [toLocation, setToLocation] = useState("");
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  /* FILTERS */
  const [search, setSearch] = useState("");
  const [partFilter, setPartFilter] = useState("All");
  const [fromFilter, setFromFilter] = useState("All");
  const [toFilter, setToFilter] = useState("All");
  const [activeStatFilter, setActiveStatFilter] = useState("ALL");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const fetchMovements = async () => {
    try {
      const res = await axios.get(`${API}/transfer/stock-movement`, { headers });
      setMovements(res.data.movements || []);
    } catch (err) {
      console.error("Fetch movements failed", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory`, { headers });
      setInventoryList(res.data.inventory || []);
    } catch (err) {
      console.error("Inventory fetch failed");
    }
  };

  useEffect(() => {
    fetchMovements();
    fetchInventory();
  }, []);

  // Reset page on filter changes
  useEffect(() => { setCurrentPage(1); }, [search, partFilter, fromFilter, toFilter, activeStatFilter]);

  const addRow = () => {
    const lastRow = selectedItems[selectedItems.length - 1];
    if (!lastRow.sourceId || !lastRow.quantity) {
      alert("Please fill current product before adding another.");
      return;
    }
    const duplicate = selectedItems.filter((item) => item.sourceId === lastRow.sourceId);
    if (duplicate.length > 1) {
      alert("This product is already added.");
      return;
    }
    setSelectedItems((prev) => [...prev, { sourceId: "", quantity: "" }]);
  };

  const removeRow = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    setSelectedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleTransfer = async () => {
    if (!toLocation) return alert("Select destination");
    if (selectedItems.length === 0) return alert("Add at least one item");
    try {
      setTransferLoading(true);
      for (const item of selectedItems) {
        if (!item.sourceId || !item.quantity) return alert("All rows must be filled");
        const sourceItem = inventoryList.find((i) => i._id === item.sourceId);
        if (!sourceItem) return alert("Invalid source selected");
        if (Number(item.quantity) > sourceItem.quantity)
          return alert(`Quantity exceeds stock for ${sourceItem.partName || sourceItem.chairType}`);
        if (sourceItem.location === toLocation)
          return alert("Source and destination cannot be same");
        await axios.post(`${API}/transfer`, { sourceId: item.sourceId, toLocation, quantity: item.quantity }, { headers });
      }
      alert("Transfer successful");
      setSelectedItems([{ sourceId: "", quantity: "" }]);
      setToLocation("");
      setTransferModalOpen(false);
      fetchInventory();
      fetchMovements();
    } catch (err) {
      alert(err.response?.data?.message || "Transfer failed");
    } finally {
      setTransferLoading(false);
    }
  };

  /* ── NORMALIZE ── */
  const normalized = useMemo(() => {
    return movements.map((m) => ({
      id: m._id,
      part: m.partName || m.chairType,
      from: m.fromLocation,
      to: m.toLocation,
      qty: m.quantity || 0,
      user: m.movedBy?.name || "Unknown",
      time: m.createdAt,
    }));
  }, [movements]);

  /* ── LOCATIONS ── */
  const locations = useMemo(() => {
    const set = new Set();
    normalized.forEach((m) => { set.add(m.from); set.add(m.to); });
    return Array.from(set).filter(Boolean).sort();
  }, [normalized]);

  /* ── UNIQUE PARTS ── */
  const partNames = useMemo(() => {
    const set = new Set();
    normalized.forEach((m) => { if (m.part) set.add(m.part); });
    return Array.from(set).sort();
  }, [normalized]);

  /* ── FILTER ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let data = normalized.filter((m) => {
      const matchSearch =
        (m.part ?? "").toLowerCase().includes(q) ||
        (m.from ?? "").toLowerCase().includes(q) ||
        (m.to ?? "").toLowerCase().includes(q) ||
        (m.user ?? "").toLowerCase().includes(q);
      const matchPart = partFilter === "All" || m.part === partFilter;
      const matchFrom = fromFilter === "All" || m.from === fromFilter;
      const matchTo = toFilter === "All" || m.to === toFilter;
      return matchSearch && matchPart && matchFrom && matchTo;
    });
    if (activeStatFilter === "TODAY") {
      data = data.filter((m) => {
        const d = new Date(m.time);
        const today = new Date();
        return d.toDateString() === today.toDateString();
      });
    }
    return data;
  }, [normalized, search, partFilter, fromFilter, toFilter, activeStatFilter]);

  /* ── STATS ── */
  const totalMovements = normalized.length;
  const totalQty = normalized.reduce((s, m) => s + m.qty, 0);
  const todayCount = normalized.filter((m) => {
    const d = new Date(m.time);
    return d.toDateString() === new Date().toDateString();
  }).length;

  /* ── PAGINATION ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const hasActiveFilters = search || partFilter !== "All" || fromFilter !== "All" || toFilter !== "All" || activeStatFilter !== "ALL";

  return (
    <div className="flex h-screen bg-[#f8f7f5] text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">

        {/* ── MOBILE HEADER ── */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#c62d23]/10 rounded-lg">
              <ArrowRightLeft size={16} className="text-[#c62d23]" />
            </div>
            <h1 className="text-base font-bold text-gray-900">Stock Movements</h1>
          </div>
          <button
            onClick={() => setTransferModalOpen(true)}
            className="bg-[#c62d23] hover:bg-[#a8241c] text-white p-2 rounded-lg transition-colors active:scale-95"
          >
            <ArrowRightLeft size={18} />
          </button>
        </div>

        {/* ── DESKTOP HEADER ── */}
        <header className="hidden lg:block sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="px-6 xl:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#c62d23]/10 rounded-xl">
                  <ArrowRightLeft size={22} className="text-[#c62d23]" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 leading-tight">Stock Movement History</h1>
                  <p className="text-xs text-gray-500">Track all inventory transfers between locations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTransferModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 xl:px-4 py-2 rounded-xl text-sm font-semibold bg-[#c62d23] hover:bg-[#b02620] text-white shadow-sm transition-all active:scale-95"
                >
                  <ArrowRightLeft size={15} />
                  <span>Add Transfer</span>
                </button>
                <button onClick={() => router.push("/profile")} title="My Profile" className="ml-1 text-gray-400 hover:text-[#c62d23] transition-colors">
                  <UserCircle size={32} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <div className="px-4 sm:px-6 lg:px-8 py-5 space-y-5">

          {/* ── STAT CARDS ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              title="Total Movements"
              value={totalMovements}
              icon={<ArrowRightLeft />}
              accentColor="#c62d23"
              clickable
              active={activeStatFilter === "ALL"}
              onClick={() => setActiveStatFilter("ALL")}
            />
            <StatCard
              title="Total Qty Moved"
              value={totalQty}
              icon={<TrendingUp />}
              accentColor="#3b82f6"
              clickable={false}
            />
            <StatCard
              title="Today's Movements"
              value={todayCount}
              icon={<Clock />}
              accentColor="#f59e0b"
              clickable
              active={activeStatFilter === "TODAY"}
              onClick={() => setActiveStatFilter("TODAY")}
            />
          </div>

          {/* ── TODAY FILTER BADGE ── */}
          {activeStatFilter === "TODAY" && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2.5">
              <AlertCircle className="text-amber-600 shrink-0" size={18} />
              <span className="text-amber-800 font-medium text-sm">Showing only today's movements</span>
              <button
                onClick={() => setActiveStatFilter("ALL")}
                className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline underline-offset-2"
              >
                Show all
              </button>
            </div>
          )}

          {/* ── FILTERS ── */}
          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search part, location or user…"
                className="w-full bg-white border border-gray-200 pl-10 pr-4 py-2.5 rounded-xl text-sm outline-none text-gray-900 placeholder-gray-400 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm"
              />
            </div>

            {/* Part Name filter */}
            <select
              value={partFilter}
              onChange={(e) => setPartFilter(e.target.value)}
              className="bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-sm outline-none text-gray-700 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm min-w-[150px]"
            >
              <option value="All">Part (All)</option>
              {partNames.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* From filter */}
            <select
              value={fromFilter}
              onChange={(e) => setFromFilter(e.target.value)}
              className="bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-sm outline-none text-gray-700 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm min-w-[140px]"
            >
              <option value="All">From (All)</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            {/* To filter */}
            <select
              value={toFilter}
              onChange={(e) => setToFilter(e.target.value)}
              className="bg-white border border-gray-200 px-3 py-2.5 rounded-xl text-sm outline-none text-gray-700 focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all shadow-sm min-w-[140px]"
            >
              <option value="All">To (All)</option>
              {locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>

            {/* Reset */}
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(""); setPartFilter("All"); setFromFilter("All"); setToFilter("All"); setActiveStatFilter("ALL"); }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-[#c62d23] hover:text-[#c62d23] transition-all shadow-sm shrink-0"
              >
                <X size={14} />
                Reset
              </button>
            )}
          </div>

          {/* ── TABLE ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-gray-100 border-t-[#c62d23] animate-spin" />
                <p className="text-sm text-gray-400">Loading movements…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                <ArrowRightLeft size={44} className="text-gray-200" />
                <p className="text-base font-medium">No stock movements found</p>
                <p className="text-sm">Try adjusting your search or filter</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {["Part / Item", "From", "To", "Qty", "Moved By", "Time"].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedRows.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50/80 transition-colors group">
                          {/* Part */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-[#c62d23]/10 transition-colors">
                                <Package size={13} className="text-gray-500 group-hover:text-[#c62d23]" />
                              </div>
                              <span className="font-semibold text-gray-900 text-sm">{m.part}</span>
                            </div>
                          </td>

                          {/* From */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-700 font-medium">{m.from}</span>
                            </div>
                          </td>

                          {/* To */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <MapPin size={13} className="text-[#c62d23] shrink-0" />
                              <span className="text-sm text-gray-900 font-semibold">{m.to}</span>
                            </div>
                          </td>

                          {/* Qty */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#c62d23]/10 text-[#c62d23] border border-[#c62d23]/20">
                              {m.qty}
                            </span>
                          </td>

                          {/* Moved By */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {m.user.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-700">{m.user}</span>
                            </div>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Clock size={13} className="text-gray-400 shrink-0" />
                              <span className="text-sm text-gray-600">{formatDate(m.time)}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-100">
                  {paginatedRows.map((m) => (
                    <div key={m.id} className="p-4 bg-white">
                      {/* Top row */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="p-1.5 bg-[#c62d23]/10 rounded-lg shrink-0">
                            <Package size={14} className="text-[#c62d23]" />
                          </div>
                          <p className="font-semibold text-gray-900 text-sm truncate">{m.part}</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#c62d23]/10 text-[#c62d23] border border-[#c62d23]/20 shrink-0">
                          {m.qty}
                        </span>
                      </div>

                      {/* Route */}
                      <div className="flex items-center gap-2 mb-3 text-sm">
                        <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                          <MapPin size={12} className="text-gray-400" />
                          <span className="font-medium text-gray-700 text-xs">{m.from}</span>
                        </div>
                        <ArrowRightLeft size={14} className="text-[#c62d23] shrink-0" />
                        <div className="flex items-center gap-1 bg-[#c62d23]/5 px-2.5 py-1 rounded-lg border border-[#c62d23]/20">
                          <MapPin size={12} className="text-[#c62d23]" />
                          <span className="font-semibold text-[#c62d23] text-xs">{m.to}</span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold text-gray-600">
                            {m.user.charAt(0).toUpperCase()}
                          </div>
                          <span>{m.user}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={11} className="text-gray-400" />
                          <span>{formatDate(m.time)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ── PAGINATION ── */}
                <div className="px-4 py-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-gray-400 order-2 sm:order-1">
                    Showing{" "}
                    <span className="font-semibold text-gray-600">
                      {Math.min((currentPage - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(currentPage * PAGE_SIZE, filtered.length)}
                    </span>{" "}
                    of <span className="font-semibold text-gray-600">{filtered.length}</span> movements
                  </p>
                  <div className="flex items-center gap-1 order-1 sm:order-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23]"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .reduce((acc, p, idx, arr) => {
                        if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, idx) =>
                        p === "..." ? (
                          <span key={`e-${idx}`} className="px-2 text-xs text-gray-400">…</span>
                        ) : (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-8 h-8 text-xs rounded-lg border font-semibold transition-colors ${
                              currentPage === p
                                ? "bg-[#c62d23] text-white border-[#c62d23]"
                                : "border-gray-200 text-gray-600 hover:border-[#c62d23] hover:text-[#c62d23]"
                            }`}
                          >
                            {p}
                          </button>
                        )
                      )}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 text-xs rounded-lg border border-gray-200 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:border-[#c62d23] hover:text-[#c62d23]"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── TRANSFER MODAL ── */}
      {transferModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#c62d23]/10 rounded-lg">
                  <ArrowRightLeft size={18} className="text-[#c62d23]" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">Transfer Stock</h2>
              </div>
              <button
                onClick={() => setTransferModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
              {/* Products list — card-per-row to avoid overflow clipping */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Products
                  </label>
                  <span className="text-xs text-gray-400">{selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Column headers */}
                <div className="grid grid-cols-[1fr_80px_80px_60px] gap-2 px-1 mb-1">
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Product</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Available</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center">Qty</span>
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide text-center"></span>
                </div>

                <div className="space-y-2">
                  {selectedItems.map((row, index) => {
                    const item = inventoryList.find((i) => i._id === row.sourceId);
                    return (
                      <div key={index} className="grid grid-cols-[1fr_80px_80px_60px] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-200">
                        {/* Product select — sits in normal flow, no overflow clip */}
                        <select
                          value={row.sourceId}
                          onChange={(e) => updateItem(index, "sourceId", e.target.value)}
                          className="w-full bg-white border border-gray-200 px-2 py-2 rounded-lg text-sm focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 outline-none"
                        >
                          <option value="">Select Product…</option>
                          {inventoryList
                            .filter((item) => item.quantity > 0 && !item.location.startsWith("PROD_"))
                            .map((item) => (
                              <option key={item._id} value={item._id}>
                                {item.partName || item.chairType} — {item.location}
                              </option>
                            ))}
                        </select>

                        {/* Available */}
                        <div className="text-center">
                          <span className={`text-sm font-bold ${item ? "text-gray-900" : "text-gray-300"}`}>
                            {item?.quantity ?? "—"}
                          </span>
                        </div>

                        {/* Qty input */}
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => updateItem(index, "quantity", e.target.value)}
                          placeholder="0"
                          className="w-full bg-white border border-gray-200 px-2 py-2 rounded-lg text-sm text-center focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 outline-none"
                        />

                        {/* Remove */}
                        <div className="flex justify-center">
                          {selectedItems.length > 1 ? (
                            <button
                              onClick={() => removeRow(index)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove"
                            >
                              <X size={14} />
                            </button>
                          ) : <div className="w-7" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={addRow}
                  disabled={!selectedItems[selectedItems.length - 1].sourceId || !selectedItems[selectedItems.length - 1].quantity}
                  className={`mt-3 text-sm font-medium transition-colors flex items-center gap-1 ${
                    !selectedItems[selectedItems.length - 1].sourceId || !selectedItems[selectedItems.length - 1].quantity
                      ? "text-gray-300 cursor-not-allowed"
                      : "text-[#c62d23] hover:text-[#a82419]"
                  }`}
                >
                  + Add Product
                </button>
              </div>

              {/* Destination */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Destination
                </label>
                <select
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                  className="w-full border border-gray-200 px-4 py-2.5 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/15 transition-all"
                >
                  <option value="">Select Destination…</option>
                  {Array.from(new Set([
                    ...inventoryList.map((item) => item.location),
                    "PROD_Mintoo", "PROD_Sajid", "PROD_Jamshed", "PROD_Ehtram",
                  ])).map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setTransferModalOpen(false)}
                className="px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={transferLoading}
                className="bg-[#c62d23] hover:bg-[#b02620] disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-sm transition-all font-semibold shadow-sm active:scale-95"
              >
                {transferLoading ? "Transferring…" : "Confirm Transfer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════ */

function StatCard({ title, value, icon, accentColor, clickable, active, onClick }) {
  return (
    <div
      onClick={clickable ? onClick : undefined}
      className={`bg-white border rounded-xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md group ${
        clickable ? "cursor-pointer" : ""
      } ${active ? "ring-2 ring-offset-1" : "hover:border-gray-200 border-gray-100"}`}
      style={{
        borderLeftWidth: "3px",
        borderLeftColor: accentColor,
        ...(active ? { "--tw-ring-color": accentColor } : {}),
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${accentColor}15`, color: accentColor }}>
          {React.cloneElement(icon, { size: 14 })}
        </div>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
      {clickable && (
        <p className="text-[10px] text-gray-400 mt-1.5 group-hover:text-gray-500 transition-colors">
          {active ? "Showing filtered" : "Click to filter"}
        </p>
      )}
    </div>
  );
}