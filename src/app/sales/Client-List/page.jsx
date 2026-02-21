"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Users, Package, Search, X,
  ChevronUp, ChevronDown, TrendingUp, ShoppingCart
} from "lucide-react";

/* ══════════════════════════════════════════
   Helpers
══════════════════════════════════════════ */
const normalise = (s = "") => s.trim().toLowerCase();

/* ══════════════════════════════════════════
   STAT CARD
══════════════════════════════════════════ */
const StatCard = ({ title, value, icon, sub, onClick, active }) => (
  <div
    onClick={onClick}
    className={`bg-white border rounded-2xl p-5 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200 hover:border-[#c62d23] ${
      onClick ? "cursor-pointer" : ""
    } ${active ? "ring-2 ring-[#c62d23] ring-offset-1" : ""}`}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 22 })}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
    {onClick && (
      <p className="text-[12px] text-gray-400 mt-2">
        {active ? "Showing top 10 — click to clear" : "Click to show all orders"}
      </p>
    )}
  </div>
);

/* ══════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════ */
export default function ClientsPage() {
  const [orders,          setOrders]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [sortField,       setSortField]       = useState("totalOrders");
  const [sortDir,         setSortDir]         = useState("desc");
  const [page,            setPage]            = useState(1);
  const [pageSize,        setPageSize]        = useState(10);
  const [showTop10,       setShowTop10]       = useState(false); // ✅ NEW

  const API     = process.env.NEXT_PUBLIC_API_URL;
  const token   = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ── fetch ── */
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await axios.get(`${API}/orders`, { headers });
        setOrders(res.data.orders || res.data);
      } catch (err) {
        console.error("Fetch orders failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  /* ── aggregate clients ── */
  const clients = useMemo(() => {
    const map = {};
    orders.forEach((o) => {
      const isObj      = o.dispatchedTo && typeof o.dispatchedTo === "object";
      const clientId   = isObj ? o.dispatchedTo._id  : o.dispatchedTo;
      const clientName = isObj ? o.dispatchedTo.name : o.dispatchedTo;
      if (!clientName) return;

      if (!map[clientId]) {
        map[clientId] = {
          id: clientId,
          name: clientName,
          productMap: {},
          totalOrders: 0,
          totalQty: 0,
          lastOrderDate: null,
        };
      }

      const key = normalise(o.chairModel);
      if (key && !map[clientId].productMap[key]) {
        map[clientId].productMap[key] = o.chairModel?.trim() || o.chairModel;
      }

      map[clientId].totalOrders += 1;
      map[clientId].totalQty   += Number(o.quantity || 0);
      const d = new Date(o.orderDate);
      if (!map[clientId].lastOrderDate || d > map[clientId].lastOrderDate)
        map[clientId].lastOrderDate = d;
    });

    return Object.values(map).map((c) => ({
      ...c,
      products: Object.values(c.productMap).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      ),
    }));
  }, [orders]);

  /* ── top 10 client IDs by totalQty ── */
  const top10Ids = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10)
      .map((c) => c.id);
  }, [clients]);

  /* ── top client stats for stat card ── */
  const topClient = useMemo(() =>
    [...clients].sort((a, b) => b.totalOrders - a.totalOrders)[0],
  [clients]);

  /* ── top 10 total qty for stat card ── */
  const top10TotalQty = useMemo(() =>
    clients
      .filter((c) => top10Ids.includes(c.id))
      .reduce((s, c) => s + c.totalQty, 0),
  [clients, top10Ids]);

  /* ── deduplicated product list for filter pills ── */
  const allProducts = useMemo(() => {
    const seen = {};
    clients.forEach((c) =>
      c.products.forEach((p) => {
        const k = normalise(p);
        if (!seen[k]) seen[k] = p;
      })
    );
    return Object.values(seen).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }, [clients]);

  /* ── filter + sort ── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let r = clients.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.products.some((p) => normalise(p).includes(q));
      const matchProduct =
        selectedProduct === "ALL" ||
        c.products.some((p) => normalise(p) === normalise(selectedProduct));
      const matchTop10 = !showTop10 || top10Ids.includes(c.id); // ✅ NEW
      return matchSearch && matchProduct && matchTop10;
    });

    // When Top 10 is active, always sort by totalQty desc so ranks match row order
if (showTop10) {
  r.sort((a, b) => b.totalQty - a.totalQty);
} else {
  r.sort((a, b) => {
    let av = a[sortField], bv = b[sortField];
    if (sortField === "lastOrderDate") {
      av = av ? av.getTime() : 0;
      bv = bv ? bv.getTime() : 0;
    }
    if (sortField === "name")
      return sortDir === "asc"
        ? av.localeCompare(bv)
        : bv.localeCompare(av);
    return sortDir === "asc" ? av - bv : bv - av;
  });
}
    return r;
  }, [clients, search, selectedProduct, sortField, sortDir, showTop10, top10Ids]);

  /* ── reset page whenever filters change ── */
  useEffect(() => { setPage(1); }, [search, selectedProduct, sortField, sortDir, showTop10]);

  /* ── pagination ── */
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paginated  = filtered.slice((page - 1) * pageSize, page * pageSize);

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++)
        pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  /* ── sort ── */
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === "asc"
        ? <ChevronUp   size={13} className="text-[#c62d23] shrink-0" />
        : <ChevronDown size={13} className="text-[#c62d23] shrink-0" />
      : <ChevronUp size={13} className="text-gray-300 shrink-0" />;

  /* ── summary stats ── */
  const totalQtyAll        = filtered.reduce((s, c) => s + c.totalQty, 0);
  const totalUniqueProducts = new Set(filtered.flatMap((c) => c.products.map(normalise))).size;

  const COLS = [
    { label: "Client",       field: "name",          sortable: true  },
    { label: "Products",     field: null,            sortable: false },
    { label: "Total Orders", field: "totalOrders",   sortable: true  },
    { label: "Total Qty",    field: "totalQty",      sortable: true  },
    { label: "Last Order",   field: "lastOrderDate", sortable: true  },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-auto">

        {/* ══ HEADER ══ */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={28} className="text-[#c62d23] shrink-0" />
            <span>Client List</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            All clients and the products they purchase
          </p>
        </div>

        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">

          {/* ══ STAT CARDS ══ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6">
            <StatCard
  title="Total Clients"
  value={filtered.length}
  icon={<Users className="text-[#c62d23]" />}
  onClick={() => {
    setSearch("");
    setSelectedProduct("ALL");
    setShowTop10(false);
  }}
  active={!search && selectedProduct === "ALL" && !showTop10}
/>
            <StatCard
              title="Unique Products"
              value={totalUniqueProducts}
              icon={<Package className="text-[#c62d23]" />}
            />
            <StatCard
              title="Total Qty"
              value={totalQtyAll}
              icon={<ShoppingCart className="text-[#c62d23]" />}
              sub="units across all clients"
            />
            {/* ✅ UPDATED Most Active card — clickable, shows top 10 */}
            <StatCard
              title="Most Active (Top 10)"
              value={showTop10 ? `${filtered.length} shown` : top10TotalQty}
              icon={<TrendingUp className="text-[#c62d23]" />}
              sub={
                showTop10
                  ? "Filtered to top 10 clients"
                  : `Total qty by top 10 clients`
              }
              onClick={() => setShowTop10((prev) => !prev)}
              active={showTop10}
            />
          </div>

          {/* ══ FILTERS ══ */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients or products..."
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

            {/* Product filter pills */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-3 block">
                Filter by Product
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({allProducts.length} unique)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedProduct("ALL")}
                  className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    selectedProduct === "ALL"
                      ? "bg-[#c62d23] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  All Products
                </button>
                {allProducts.map((product) => (
                  <button
                    key={normalise(product)}
                    onClick={() => setSelectedProduct(product)}
                    className={`px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      normalise(selectedProduct) === normalise(product)
                        ? "bg-[#c62d23] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                  >
                    {product}
                  </button>
                ))}
              </div>
            </div>

            {/* Active filter chips */}
            {(search || selectedProduct !== "ALL" || showTop10) && (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-gray-400 font-medium">Active filters:</span>
                {search && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    "{search}"
                    <button onClick={() => setSearch("")}><X size={11} /></button>
                  </span>
                )}
                {selectedProduct !== "ALL" && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    {selectedProduct}
                    <button onClick={() => setSelectedProduct("ALL")}><X size={11} /></button>
                  </span>
                )}
                {/* ✅ Top 10 active chip */}
                {showTop10 && (
                  <span className="flex items-center gap-1 bg-[#c62d23]/10 text-[#c62d23] text-xs font-medium px-2.5 py-1 rounded-full">
                    Top 10 Clients
                    <button onClick={() => setShowTop10(false)}><X size={11} /></button>
                  </span>
                )}
                <button
                  onClick={() => { setSearch(""); setSelectedProduct("ALL"); setShowTop10(false); }}
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
                <p className="mt-3 text-gray-500">Loading clients…</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-gray-500 py-16 px-4">
                <Users size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No clients found</p>
                {(search || selectedProduct !== "ALL" || showTop10) && (
                  <button
                    onClick={() => { setSearch(""); setSelectedProduct("ALL"); setShowTop10(false); }}
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
                        {/* ✅ Rank column when top10 is active */}
                        {showTop10 && (
                          <th className="p-4 text-left font-semibold text-gray-700 w-12">
                            Rank
                          </th>
                        )}
                        {COLS.map((col) => (
                          <th
                            key={col.label}
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
                      {paginated.map((c, index) => {
                        const globalRank = showTop10
                          ? top10Ids.indexOf(c.id) + 1
                          : null;
                        return (
                          <tr
                            key={c.id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            {/* ✅ Rank badge */}
                            {showTop10 && (
                              <td className="p-4">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                                    globalRank === 1
                                      ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                      : globalRank === 2
                                      ? "bg-gray-100 text-gray-600 border border-gray-300"
                                      : globalRank === 3
                                      ? "bg-orange-100 text-orange-600 border border-orange-300"
                                      : "bg-gray-50 text-gray-500 border border-gray-200"
                                  }`}
                                >
                                  {globalRank}
                                </span>
                              </td>
                            )}

                            {/* Client name + avatar */}
                            <td className="p-4">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-[#c62d23]/10 text-[#c62d23] flex items-center justify-center text-xs font-bold shrink-0">
                                  {c.name[0]?.toUpperCase()}
                                </div>
                                <span className="font-semibold text-gray-900">{c.name}</span>
                              </div>
                            </td>

                            {/* Products */}
                            <td className="p-4">
                              <div className="flex flex-wrap gap-1.5">
                                {c.products.map((p) => (
                                  <span
                                    key={normalise(p)}
                                    className="px-2.5 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="p-4 font-semibold text-gray-900">{c.totalOrders}</td>
                            <td className="p-4 font-semibold text-gray-900">{c.totalQty}</td>
                            <td className="p-4 text-gray-700">
                              {c.lastOrderDate
                                ? c.lastOrderDate.toLocaleDateString()
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ─── Mobile cards (< md) ─── */}
                <div className="md:hidden divide-y divide-gray-100">
                  {paginated.map((c, index) => {
                    const globalRank = showTop10
                      ? top10Ids.indexOf(c.id) + 1
                      : null;
                    return (
                      <div key={c.id} className="px-4 py-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            {/* ✅ Rank badge on mobile */}
                            {showTop10 && (
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold shrink-0 ${
                                  globalRank === 1
                                    ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                    : globalRank === 2
                                    ? "bg-gray-100 text-gray-600 border border-gray-300"
                                    : globalRank === 3
                                    ? "bg-orange-100 text-orange-600 border border-orange-300"
                                    : "bg-gray-50 text-gray-500 border border-gray-200"
                                }`}
                              >
                                {globalRank}
                              </span>
                            )}
                            <div className="w-8 h-8 rounded-full bg-[#c62d23]/10 text-[#c62d23] flex items-center justify-center text-xs font-bold shrink-0">
                              {c.name[0]?.toUpperCase()}
                            </div>
                            <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                          </div>
                          <span className="text-xs text-gray-400 shrink-0">
                            {c.lastOrderDate ? c.lastOrderDate.toLocaleDateString() : "—"}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {c.products.map((p) => (
                            <span
                              key={normalise(p)}
                              className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                            >
                              {p}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-gray-500">
                            Orders: <span className="font-semibold text-gray-800">{c.totalOrders}</span>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-500">
                            Qty: <span className="font-semibold text-gray-800">{c.totalQty}</span>
                          </span>
                          <span className="text-gray-300">|</span>
                          <span className="text-gray-500">
                            Products: <span className="font-semibold text-gray-800">{c.products.length}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ─── Pagination footer ─── */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      <span className="font-semibold text-gray-600">
                        {filtered.length === 0
                          ? 0
                          : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-gray-600">{filtered.length}</span> clients
                      {showTop10 && (
                        <span className="ml-1 text-[#c62d23] font-semibold">(Top 10)</span>
                      )}
                    </span>
                    <span className="hidden sm:inline text-gray-300">|</span>
                    <label className="hidden sm:flex items-center gap-1.5">
                      Rows:
                      <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#c62d23]/20 cursor-pointer"
                      >
                        {[5, 10, 20, 50].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Prev
                    </button>
                    {getPageNumbers().map((p, i) =>
                      p === "..." ? (
                        <span key={`e-${i}`} className="px-2 text-gray-400 text-xs select-none">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-medium transition-colors border ${
                            page === p
                              ? "bg-[#c62d23] text-white border-[#c62d23] shadow-sm"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 rounded-xl text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    </div>
  );
}