"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Users, Package, Search, TrendingUp,
  ChevronDown, ChevronUp, Calendar, ShoppingCart, X
} from "lucide-react";
import Sidebar from "./sidebar";

/* ══════════════════════════════════════════
   Helpers
══════════════════════════════════════════ */
const normalise = (s = "") => s.trim().toLowerCase();

export default function ClientsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("ALL");
  const [expandedClient, setExpandedClient] = useState(null);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [showTop10, setShowTop10] = useState(false);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ─── fetch ─── */
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

  /* ─── aggregate clients ─── */
  const clients = useMemo(() => {
    const map = {};

    orders.forEach((o) => {
      const isObject = o.dispatchedTo && typeof o.dispatchedTo === "object";
      const clientId = isObject ? o.dispatchedTo._id : o.dispatchedTo;
      const clientName = isObject ? o.dispatchedTo.name : o.dispatchedTo;
      if (!clientName) return;

      if (!map[clientId]) {
        map[clientId] = {
          id: clientId,
          name: clientName,
          productMap: {},
          totalOrders: 0,
          totalQty: 0,
          lastOrderDate: null,
          orderHistory: [],
        };
      }

      // products
      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          const key = normalise(item.name || "");
          if (key && !map[clientId].productMap[key]) {
            map[clientId].productMap[key] = item.name?.trim() || item.name;
          }
        });
      } else {
        const key = normalise(o.chairModel || "");
        if (key && !map[clientId].productMap[key]) {
          map[clientId].productMap[key] = o.chairModel?.trim() || o.chairModel;
        }
      }

      map[clientId].totalOrders += 1;

      // qty: sum items or fallback to quantity field
      const orderQty =
        o.items && o.items.length > 0
          ? o.items.reduce((s, i) => s + Number(i.quantity || 0), 0)
          : Number(o.quantity || 0);
      map[clientId].totalQty += orderQty;

      // order history — use orderId (human-readable) not _id
      if (o.items && o.items.length > 0) {
        o.items.forEach((item) => {
          map[clientId].orderHistory.push({
            orderId: o.orderId || o._id || "—",   // ✅ use orderId field
            product: item.name || "—",
            quantity: Number(item.quantity || 0),
            orderDate: new Date(o.orderDate),
            deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : null,
            status: o.progress || o.status || "N/A",
            remark: o.remark || "",
          });
        });
      } else {
        map[clientId].orderHistory.push({
          orderId: o.orderId || o._id || "—",     // ✅ use orderId field
          product: o.chairModel || "—",
          quantity: orderQty,
          orderDate: new Date(o.orderDate),
          deliveryDate: o.deliveryDate ? new Date(o.deliveryDate) : null,
          status: o.progress || o.status || "N/A",
          remark: o.remark || "",
        });
      }

      const orderDate = new Date(o.orderDate);
      if (!map[clientId].lastOrderDate || orderDate > map[clientId].lastOrderDate) {
        map[clientId].lastOrderDate = orderDate;
      }
    });

    return Object.values(map).map((c) => ({
      ...c,
      products: Object.values(c.productMap).sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase())
      ),
      orderHistory: c.orderHistory.sort((a, b) => b.orderDate - a.orderDate),
    }));
  }, [orders]);

  /* ─── top 10 by totalQty ─── */
  const top10Ids = useMemo(() =>
    [...clients]
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 10)
      .map((c) => c.id),
  [clients]);

  const top10TotalQty = useMemo(() =>
    clients
      .filter((c) => top10Ids.includes(c.id))
      .reduce((s, c) => s + c.totalQty, 0),
  [clients, top10Ids]);

  /* ─── all products for filter ─── */
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

  /* ─── most purchased across all clients ─── */
  const mostPurchasedProduct = useMemo(() => {
    const productCount = {};
    clients.forEach((c) =>
      c.orderHistory.forEach((order) => {
        if (!productCount[order.product]) productCount[order.product] = 0;
        productCount[order.product] += order.quantity;
      })
    );
    let maxProduct = null, maxQty = 0;
    Object.entries(productCount).forEach(([product, qty]) => {
      if (qty > maxQty) { maxQty = qty; maxProduct = product; }
    });
    return { product: maxProduct || "N/A", quantity: maxQty };
  }, [clients]);

  /* ─── filter + sort ─── */
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase().trim();
    let r = clients.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.products.some((p) => normalise(p).includes(q));
      const matchProduct =
        selectedProduct === "ALL" ||
        c.products.some((p) => normalise(p) === normalise(selectedProduct));
      const matchTop10 = !showTop10 || top10Ids.includes(c.id);
      return matchSearch && matchProduct && matchTop10;
    });

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
          return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
        return sortDir === "asc" ? av - bv : bv - av;
      });
    }
    return r;
  }, [clients, search, selectedProduct, sortField, sortDir, showTop10, top10Ids]);

  /* ─── reset page on filter change ─── */
  useEffect(() => { setPage(1); }, [search, selectedProduct, sortField, sortDir, showTop10]);

  /* ─── pagination ─── */
  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const paginated = filteredClients.slice((page - 1) * pageSize, page * pageSize);

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

  /* ─── sort helpers ─── */
  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const SortIcon = ({ field }) =>
    sortField === field
      ? sortDir === "asc"
        ? <ChevronUp size={13} className="text-[#c62d23] shrink-0" />
        : <ChevronDown size={13} className="text-[#c62d23] shrink-0" />
      : <ChevronUp size={13} className="text-gray-300 shrink-0" />;

  const toggleExpand = (clientId) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  /* ─── summary stats ─── */
  const totalQtyAll = filteredClients.reduce((s, c) => s + c.totalQty, 0);
  const totalUniqueProducts = new Set(filteredClients.flatMap((c) => c.products.map(normalise))).size;

  const COLS = [
    { label: "Client",       field: "name",          sortable: true  },
    { label: "Products",     field: null,            sortable: false },
    { label: "Total Orders", field: "totalOrders",   sortable: true  },
    { label: "Total Qty",    field: "totalQty",      sortable: true  },
    { label: "Last Order",   field: "lastOrderDate", sortable: true  },
    { label: "Actions",      field: null,            sortable: false },
  ];

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* SIDEBAR */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Users size={28} className="text-[#c62d23] shrink-0" />
              Client Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Track and analyze all your clients and their purchase history
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6">

          {/* STAT CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              title="Total Clients"
              value={filteredClients.length}
              icon={<Users size={20} className="text-[#c62d23]" />}
              onClick={() => { setSearch(""); setSelectedProduct("ALL"); setShowTop10(false); }}
              active={!search && selectedProduct === "ALL" && !showTop10}
            />
            <StatCard
              title="Unique Products"
              value={totalUniqueProducts}
              icon={<Package size={20} className="text-[#c62d23]" />}
            />
            <StatCard
              title="Total Qty"
              value={totalQtyAll}
              sub="units across all clients"
              icon={<ShoppingCart size={20} className="text-[#c62d23]" />}
            />
            <StatCard
              title="Most Active (Top 10)"
              value={showTop10 ? `${filteredClients.length} shown` : top10TotalQty}
              sub={showTop10 ? "Filtered to top 10 clients" : "Total qty by top 10 clients"}
              icon={<TrendingUp size={20} className="text-[#c62d23]" />}
              onClick={() => setShowTop10((prev) => !prev)}
              active={showTop10}
            />
          </div>

          {/* FILTERS */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 sm:p-6 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Filters</h3>

            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients or products..."
                className="w-full pl-10 pr-9 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] transition-all"
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
              <label className="text-sm font-semibold text-gray-700 mb-2 block">
                Filter by Product
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({allProducts.length} unique)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <FilterButton
                  active={selectedProduct === "ALL"}
                  onClick={() => setSelectedProduct("ALL")}
                  label="All Products"
                />
                {allProducts.map((product) => (
                  <FilterButton
                    key={normalise(product)}
                    active={normalise(selectedProduct) === normalise(product)}
                    onClick={() => setSelectedProduct(product)}
                    label={product}
                  />
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

          {/* TABLE */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-16 text-center">
                <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-gray-200 border-t-[#c62d23]" />
                <p className="mt-4 text-gray-500 font-medium">Loading clients...</p>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Users size={56} className="mx-auto mb-4 text-gray-200" />
                <p className="text-lg font-semibold text-gray-900">No clients found</p>
                <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
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
                {/* ─── Desktop table ─── */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {showTop10 && (
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">
                            Rank
                          </th>
                        )}
                        {COLS.map((col) => (
                          <th
                            key={col.label}
                            onClick={() => col.sortable && toggleSort(col.field)}
                            className={`px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide select-none whitespace-nowrap ${
                              col.sortable ? "cursor-pointer hover:text-gray-800" : ""
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
                    <tbody className="divide-y divide-gray-100">
                      {paginated.map((client, index) => {
                        const isExpanded = expandedClient === client.id;
                        const globalRank = showTop10 ? top10Ids.indexOf(client.id) + 1 : null;

                        return (
                          <React.Fragment key={client.id}>
                            <tr className="hover:bg-gray-50 transition-colors">
                              {/* Rank badge */}
                              {showTop10 && (
                                <td className="px-4 py-3.5">
                                  <RankBadge rank={globalRank} />
                                </td>
                              )}

                              {/* Client name */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-[#c62d23]/10 text-[#c62d23] flex items-center justify-center text-xs font-bold shrink-0">
                                    {client.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-gray-900">{client.name}</span>
                                </div>
                              </td>

                              {/* Products */}
                              <td className="px-4 py-3.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {client.products.map((p) => (
                                    <span
                                      key={normalise(p)}
                                      className="px-2.5 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-semibold text-gray-900">{client.totalOrders}</td>
                              <td className="px-4 py-3.5 font-semibold text-gray-900">{client.totalQty}</td>
                              <td className="px-4 py-3.5 text-gray-600">
                                {client.lastOrderDate
                                  ? client.lastOrderDate.toLocaleDateString("en-IN", {
                                      day: "numeric", month: "short", year: "numeric",
                                    })
                                  : "—"}
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3.5">
                                <button
                                  onClick={() => toggleExpand(client.id)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#c62d23] text-white rounded-lg hover:bg-[#a8241c] transition-colors font-medium text-xs"
                                >
                                  {isExpanded ? (
                                    <><ChevronUp size={14} /> Hide</>
                                  ) : (
                                    <><ChevronDown size={14} /> History</>
                                  )}
                                </button>
                              </td>
                            </tr>

                            {/* Expanded order history */}
                            {isExpanded && (
                              <tr>
                                <td colSpan={showTop10 ? 7 : 6} className="bg-gray-50 px-4 sm:px-6 py-5">
                                  <OrderHistoryPanel client={client} />
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ─── Mobile cards ─── */}
                <div className="lg:hidden divide-y divide-gray-100">
                  {paginated.map((client) => {
                    const isExpanded = expandedClient === client.id;
                    const globalRank = showTop10 ? top10Ids.indexOf(client.id) + 1 : null;
                    return (
                      <div key={client.id} className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            {showTop10 && <RankBadge rank={globalRank} />}
                            <div className="w-9 h-9 rounded-full bg-[#c62d23]/10 text-[#c62d23] flex items-center justify-center text-sm font-bold shrink-0">
                              {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{client.name}</p>
                              <p className="text-xs text-gray-400">
                                {client.lastOrderDate
                                  ? client.lastOrderDate.toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleExpand(client.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#c62d23] text-white rounded-lg text-xs font-medium shrink-0"
                          >
                            {isExpanded ? <><ChevronUp size={12} /> Hide</> : <><ChevronDown size={12} /> History</>}
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {client.products.map((p) => (
                            <span key={normalise(p)} className="px-2 py-0.5 text-xs rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                              {p}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>Orders: <span className="font-semibold text-gray-800">{client.totalOrders}</span></span>
                          <span className="text-gray-200">|</span>
                          <span>Qty: <span className="font-semibold text-gray-800">{client.totalQty}</span></span>
                          <span className="text-gray-200">|</span>
                          <span>Products: <span className="font-semibold text-gray-800">{client.products.length}</span></span>
                        </div>

                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <OrderHistoryPanel client={client} mobile />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ─── Pagination footer ─── */}
                <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      <span className="font-semibold text-gray-600">
                        {filteredClients.length === 0
                          ? 0
                          : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredClients.length)}
                      </span>{" "}
                      of{" "}
                      <span className="font-semibold text-gray-600">{filteredClients.length}</span> clients
                      {showTop10 && <span className="ml-1 text-[#c62d23] font-semibold">(Top 10)</span>}
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
                        <span key={`e-${i}`} className="px-2 text-gray-400 text-xs">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          className={`w-8 h-8 rounded-xl text-xs font-semibold border transition-colors ${
                            page === p
                              ? "bg-[#c62d23] text-white border-[#c62d23]"
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

/* ══════════════════════════════════════════
   ORDER HISTORY PANEL (expanded row)
══════════════════════════════════════════ */
function OrderHistoryPanel({ client, mobile = false }) {
  /* most purchased for this client */
  const mostPurchased = useMemo(() => {
    const productCount = {};
    client.orderHistory.forEach((o) => {
      if (!productCount[o.product]) productCount[o.product] = 0;
      productCount[o.product] += o.quantity;
    });
    return Object.entries(productCount).sort((a, b) => b[1] - a[1])[0];
  }, [client.orderHistory]);

  return (
    <div className="border-l-4 border-[#c62d23] pl-4 sm:pl-6">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-1">
          <ShoppingCart size={18} className="text-[#c62d23]" />
          Purchase History — {client.name}
        </h3>
        {mostPurchased && (
          <div className="flex items-center gap-2 mt-1">
            <TrendingUp size={14} className="text-[#c62d23]" />
            <span className="text-xs text-gray-500">Most Purchased:</span>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-[#c62d23] text-white">
              {mostPurchased[0]} ({mostPurchased[1]} units)
            </span>
          </div>
        )}
      </div>

      {client.orderHistory.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No order history available</p>
      ) : mobile ? (
        /* Mobile history list */
        <div className="space-y-3">
          {client.orderHistory.map((order, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-gray-100 p-3 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                  {order.orderId}
                </span>
                <StatusBadge status={order.status} />
              </div>
              <p className="font-medium text-gray-800 mb-1">{order.product}</p>
              <div className="flex gap-3 text-gray-500">
                <span>Qty: <span className="font-semibold text-gray-800">{order.quantity}</span></span>
                <span>•</span>
                <span>{order.orderDate.toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Desktop history table */
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {["Order ID", "Product", "Quantity", "Order Date", "Delivery Date", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {client.orderHistory.map((order, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-xs bg-transparent">
                    <span className="bg-gray-100 px-2 py-1 rounded-md">{order.orderId}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{order.product}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{order.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-gray-400" />
                      {order.orderDate.toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.deliveryDate ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-gray-400" />
                        {order.deliveryDate.toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                        })}
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   SUB-COMPONENTS
══════════════════════════════════════════ */

const StatCard = ({ title, value, sub, icon, onClick, active }) => (
  <div
    onClick={onClick}
    className={`bg-white border rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between border-gray-200 ${
      onClick ? "cursor-pointer hover:border-[#c62d23]" : ""
    } ${active ? "ring-2 ring-[#c62d23] ring-offset-1" : ""}`}
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
      {icon}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1 truncate">{sub}</p>}
    {onClick && (
      <p className="text-[10px] text-gray-400 mt-2">
        {active ? "Click to clear" : "Click to filter"}
      </p>
    )}
  </div>
);

const FilterButton = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`px-3 sm:px-4 py-2 rounded-xl font-medium text-sm transition-all duration-200 ${
      active
        ? "bg-[#c62d23] text-white shadow-md"
        : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
    }`}
  >
    {label}
  </button>
);

const RankBadge = ({ rank }) => (
  <span
    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
      rank === 1
        ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
        : rank === 2
        ? "bg-gray-100 text-gray-600 border border-gray-300"
        : rank === 3
        ? "bg-orange-100 text-orange-600 border border-orange-300"
        : "bg-gray-50 text-gray-500 border border-gray-200"
    }`}
  >
    {rank}
  </span>
);

const StatusBadge = ({ status }) => {
  const getColor = (s = "") => {
    const lower = s.toLowerCase();
    if (lower.includes("dispatched") || lower.includes("delivered"))
      return "bg-green-50 text-green-700 border-green-200";
    if (lower.includes("partial"))
      return "bg-amber-50 text-amber-700 border-amber-200";
    if (lower.includes("ready"))
      return "bg-violet-50 text-violet-700 border-violet-200";
    if (lower.includes("progress") || lower.includes("production") || lower.includes("fitting") || lower.includes("warehouse"))
      return "bg-blue-50 text-blue-700 border-blue-200";
    if (lower.includes("delayed"))
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${getColor(status)}`}>
      {status}
    </span>
  );
};