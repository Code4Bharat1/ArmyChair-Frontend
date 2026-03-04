"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Download, Plus, X, TrendingUp, Menu, ChevronDown, ChevronUp } from "lucide-react";
import InventorySidebar from "./sidebar";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const resolveReturnedFrom = (value, vendorMap = {}) => {
  if (!value) return "—";
  if (typeof value === "object" && value.name) return value.name;
  if (typeof value === "string") {
    if (vendorMap[value]) return vendorMap[value];
    return value;
  }
  return String(value);
};

/* ─── STATUS BADGE ─────────────────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const cfg = {
    Pending:      "bg-amber-100 text-amber-800",
    "In-Fitting": "bg-blue-100 text-blue-800",
    Accepted:     "bg-green-100 text-green-800",
    Rejected:     "bg-red-100 text-red-800",
    Completed:    "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${cfg[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
};

/* ─── DERIVE GROUP STATUS ───────────────────────────────────────── */
const deriveGroupStatus = (returns) => {
  const statuses = returns.map((r) => r.status);
  if (statuses.includes("In-Fitting")) return "In-Fitting";
  if (statuses.includes("Pending"))    return "Pending";
  if (statuses.includes("Accepted"))   return "Accepted";
  if (statuses.includes("Rejected"))   return "Rejected";
  return "Completed";
};

/* ─── MAIN COMPONENT ───────────────────────────────────────────── */
const Return = () => {
  const [search, setSearch]               = useState("");
  const [selectedType, setSelectedType]   = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [returns, setReturns]             = useState([]);
  const [vendors, setVendors]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [openModal, setOpenModal]         = useState(false);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [expandedRows, setExpandedRows]   = useState({});

  // Create return form state
  const [returnItems, setReturnItems]     = useState([]);
  const [orderLoading, setOrderLoading]   = useState(false);
  const [orderPreview, setOrderPreview]   = useState(null);
  const [form, setForm] = useState({
    orderId: "",
    returnDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  /* ── vendor map ── */
  const vendorMap = useMemo(() => {
    const map = {};
    vendors.forEach((v) => { map[v._id] = v.name; });
    return map;
  }, [vendors]);

  const getReturnedFromName = (value) => resolveReturnedFrom(value, vendorMap);

  const toggleRow = (orderId) =>
    setExpandedRows((prev) => ({ ...prev, [orderId]: !prev[orderId] }));

  /* ── fetch helpers ── */
  const fetchVendors = async () => {
    try {
      const res = await axios.get(`${API}/vendors`, { headers: getAuthHeaders() });
      setVendors(res.data.vendors || res.data || []);
    } catch (err) { console.error("Vendors fetch failed", err); }
  };

  const fetchOrderDetails = async (orderId) => {
    if (!orderId) return;
    setOrderLoading(true);
    setOrderPreview(null);
    setReturnItems([]);
    try {
      const res = await axios.get(`${API}/orders/by-order-id/${orderId}`, { headers: getAuthHeaders() });
      const order = res.data.order;

      const dispatchedName =
        typeof order.dispatchedTo === "object"
          ? order.dispatchedTo?.name
          : vendorMap[order.dispatchedTo] || order.dispatchedTo;

      setOrderPreview({
        chairModel:   order.chairModel,
        orderType:    order.orderType,   // ✅ store orderType for display
        dispatchedTo: dispatchedName,
        salesPerson:  order.salesPerson?.name || "—",
        progress:     order.progress,
      });

      const items = order.items?.length
        ? order.items.map((i) => ({ name: i.name, quantity: 0, max: i.quantity, category: "Functional" }))
        : [{ name: order.chairModel, quantity: 0, max: order.quantity, category: "Functional" }];

      setReturnItems(items);
    } catch (err) {
      console.error("[Return] fetchOrderDetails failed:", err);
      setOrderPreview(null);
      setReturnItems([]);
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/returns`, { headers: getAuthHeaders() });
      setReturns(res.data.data || []);
    } catch (error) {
      console.error("Fetch returns failed:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchReturns();
  }, []);

  /* ── GROUP returns by orderId ─────────────────────────────────── */
  const groupedReturns = useMemo(() => {
    const map = {};
    returns.forEach((r) => {
      if (!map[r.orderId]) {
        map[r.orderId] = {
          orderId:      r.orderId,
          returnedFrom: r.returnedFrom,
          returnDate:   r.returnDate,
          returns:      [],
          allItems:     [],
          totalQty:     0,
        };
      }
      const grp = map[r.orderId];
      grp.returns.push(r);

      (r.items || [{ name: r.chairType, quantity: r.quantity, fittingStatus: "PENDING" }]).forEach((item) => {
        grp.allItems.push({ ...item, category: r.category });
        grp.totalQty += item.quantity;
      });

      if (new Date(r.returnDate) < new Date(grp.returnDate)) {
        grp.returnDate = r.returnDate;
      }
    });

    return Object.values(map).map((grp) => ({
      ...grp,
      groupStatus:  deriveGroupStatus(grp.returns),
      hasAccepted:  grp.returns.some((r) => r.status === "Accepted" && !r.movedToInventory),
      categories:   [...new Set(grp.returns.map((r) => r.category))],
      // ✅ derive orderType from the first return doc (all returns for same order share it)
      orderType:    grp.returns[0]?.orderType || "FULL",
    }));
  }, [returns]);

  /* ── stats ── */
  const stats = useMemo(() => {
    const totalReturns       = groupedReturns.length;
    const functionalCount    = groupedReturns.filter((g) => g.categories.includes("Functional")).length;
    const nonFunctionalCount = groupedReturns.filter((g) => g.categories.includes("Non-Functional")).length;
    const pendingCount       = groupedReturns.filter((g) => g.groupStatus === "Pending").length;

    const productCounts = {};
    returns.forEach((r) => {
      (r.items || []).forEach((item) => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
      });
    });
    const mostReturned = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

    return { totalReturns, functionalCount, nonFunctionalCount, pendingCount, mostReturned };
  }, [groupedReturns, returns]);

  /* ── filter ── */
  const filteredGroups = useMemo(() => {
    return groupedReturns.filter((g) => {
      const resolvedName = getReturnedFromName(g.returnedFrom).toLowerCase();
      const skuNames     = g.allItems.map((i) => i.name.toLowerCase()).join(" ");
      const matchSearch  =
        g.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        resolvedName.includes(search.toLowerCase()) ||
        skuNames.includes(search.toLowerCase());
      const matchType   = selectedType === "All" || g.categories.includes(selectedType);
      const matchStatus = selectedStatus === "All" || g.groupStatus === selectedStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [search, selectedType, selectedStatus, groupedReturns, vendorMap]);

  /* ── actions ── */
  const moveGroupToFitting = async (group) => {
    const pendingReturns = group.returns.filter((r) => r.status === "Pending");
    try {
      await Promise.all(
        pendingReturns.map((r) =>
          axios.post(`${API}/returns/${r._id}/move-to-fitting`, {}, { headers: getAuthHeaders() })
        )
      );
      fetchReturns();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to move to fitting");
    }
  };

  // ✅ Updated: handles both SPARE (pending → spare inventory) and FULL (accepted → inventory)
  const moveGroupToInventory = async (group) => {
    const isSpare = group.orderType === "SPARE";

    const targetReturns = isSpare
      ? group.returns.filter((r) => r.status === "Pending" && !r.movedToInventory)
      : group.returns.filter((r) => r.status === "Accepted" && !r.movedToInventory);

    const endpoint = isSpare ? "move-spare-to-inventory" : "move-to-inventory";

    try {
      await Promise.all(
        targetReturns.map((r) =>
          axios.post(`${API}/returns/${r._id}/${endpoint}`, {}, { headers: getAuthHeaders() })
        )
      );
      fetchReturns();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to move to inventory");
    }
  };

  const submitReturn = async () => {
    const selectedItems = returnItems.filter((i) => i.quantity > 0);
    if (!form.orderId || !form.returnDate) {
      return alert("Please fill all required fields");
    }
    if (selectedItems.length === 0) {
      return alert("Enter quantity for at least one item");
    }

    const groups = {};
    selectedItems.forEach((i) => {
      const cat = i.category || "Functional";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push({ name: i.name, quantity: i.quantity });
    });

    try {
      for (const [category, items] of Object.entries(groups)) {
        await axios.post(
          `${API}/returns`,
          { orderId: form.orderId, returnDate: form.returnDate, category, description: form.reason, items },
          { headers: getAuthHeaders() }
        );
      }
      setOpenModal(false);
      resetForm();
      fetchReturns();
    } catch (error) {
      alert(error.response?.data?.message || "Failed to create return");
    }
  };

  const resetForm = () => {
    setForm({ orderId: "", returnDate: new Date().toISOString().split("T")[0], reason: "" });
    setReturnItems([]);
    setOrderPreview(null);
  };

  const exportCSV = () => {
    if (!filteredGroups.length) return;
    const headers = ["Order ID", "Returned From", "SKUs", "Total Qty", "Return Date", "Categories", "Status"].join(",");
    const rows = filteredGroups.map((g) =>
      [
        g.orderId,
        `"${getReturnedFromName(g.returnedFrom)}"`,
        `"${g.allItems.map((i) => `${i.name}(${i.quantity})`).join(", ")}"`,
        g.totalQty,
        new Date(g.returnDate).toLocaleDateString(),
        `"${g.categories.join(", ")}"`,
        g.groupStatus,
      ].join(",")
    ).join("\n");
    const blob = new Blob([headers + "\n" + rows], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "returns-report.csv";
    a.click();
  };

  /* ─── RENDER ─────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <InventorySidebar />
      </div>

      <div className="flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">Returns</h1>
          <button onClick={() => setOpenModal(true)} className="bg-[#c62d23] text-white p-2 rounded-lg">
            <Plus size={20} />
          </button>
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Returns Management</h1>
              <p className="text-gray-600 mt-2">Track returned orders and route items to inventory or defects.</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setOpenModal(true)} className="bg-[#c62d23] text-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:bg-[#a8241c] transition-all flex items-center gap-2 font-medium">
                <Plus size={18} /> Add Return
              </button>
              <button onClick={exportCSV} className="bg-white px-5 py-3 rounded-xl border-2 border-gray-200 shadow-sm hover:border-[#c62d23] transition-all flex items-center gap-2 font-medium">
                <Download size={18} className="text-[#c62d23]" />
                <span className="hidden xl:inline">Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard title="Total Returns"    value={stats.totalReturns}       onClick={() => { setSelectedType("All"); setSelectedStatus("All"); }}           active={selectedType === "All" && selectedStatus === "All"} />
            <StatCard title="Functional"       value={stats.functionalCount}    onClick={() => { setSelectedType("Functional"); setSelectedStatus("All"); }}     active={selectedType === "Functional"} />
            <StatCard title="Non-Functional"   value={stats.nonFunctionalCount} onClick={() => { setSelectedType("Non-Functional"); setSelectedStatus("All"); }} active={selectedType === "Non-Functional"} />
            <StatCard title="Pending"          value={stats.pendingCount}       onClick={() => { setSelectedType("All"); setSelectedStatus("Pending"); }}        active={selectedStatus === "Pending"} />
            {stats.mostReturned && (
              <div className="bg-white border-2 border-gray-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 shadow-sm hover:shadow-md transition-all col-span-2 sm:col-span-1">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-[#c62d23]" />
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">Most Returned</p>
                </div>
                <p className="text-base sm:text-xl font-bold text-gray-900 truncate" title={stats.mostReturned[0]}>
                  {stats.mostReturned[0]}
                </p>
                <p className="text-xs sm:text-sm text-[#c62d23] font-semibold mt-1">
                  {stats.mostReturned[1]} unit{stats.mostReturned[1] !== 1 ? "s" : ""}
                </p>
              </div>
            )}
          </div>

          {/* Filters + Table */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by order ID, SKU, location..."
                    className="w-full p-3 pl-10 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] outline-none transition text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] outline-none transition text-sm min-w-[140px]">
                  <option value="All">All Types</option>
                  <option value="Functional">Functional</option>
                  <option value="Non-Functional">Non-Functional</option>
                </select>
                <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="p-3 bg-white rounded-xl border-2 border-gray-200 focus:border-[#c62d23] outline-none transition text-sm min-w-[140px]">
                  <option value="All">All Status</option>
                  <option value="Pending">Pending</option>
                  <option value="In-Fitting">In-Fitting</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-auto rounded-xl border border-gray-200">
              {loading ? (
                <div className="p-10 text-center">
                  <div className="inline-block animate-spin rounded-full h-7 w-7 border-b-2 border-[#c62d23]" />
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-10 text-center text-gray-500">No returns found</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="w-8 px-3 py-3"></th>
                      {["Order ID", "Returned From", "Items", "Total Qty", "Return Date", "Type", "Status", "Actions"].map((h) => (
                        <th key={h} className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredGroups.map((grp, idx) => (
                      <React.Fragment key={grp.orderId}>
                        {/* ── Main row ── */}
                        <tr
                          className={`border-b border-gray-100 hover:bg-blue-50/30 transition-colors cursor-pointer ${
                            expandedRows[grp.orderId] ? "bg-blue-50/40" : idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                          }`}
                          onClick={() => toggleRow(grp.orderId)}
                        >
                          <td className="px-3 py-3 text-center">
                            <span className="text-gray-400 hover:text-gray-700 transition inline-flex">
                              {expandedRows[grp.orderId] ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                            </span>
                          </td>

                          {/* Order ID */}
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-900">{grp.orderId}</p>
                            {/* ✅ Show order type badge under order ID */}
                            <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                              grp.orderType === "SPARE"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-blue-100 text-blue-700"
                            }`}>
                              {grp.orderType || "FULL"}
                            </span>
                          </td>

                          {/* Returned From */}
                          <td className="px-4 py-3 text-gray-700">{getReturnedFromName(grp.returnedFrom)}</td>

                          {/* Items */}
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                              {grp.allItems.map((item, i) => (
                                <span
                                  key={i}
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                                    item.fittingStatus === "GOOD"
                                      ? "bg-green-50 border-green-200 text-green-800"
                                      : item.fittingStatus === "BAD"
                                      ? "bg-red-50 border-red-200 text-red-800"
                                      : item.category === "Non-Functional"
                                      ? "bg-orange-50 border-orange-200 text-orange-800"
                                      : "bg-gray-50 border-gray-200 text-gray-700"
                                  }`}
                                >
                                  {item.name}
                                  <span className="font-bold">×{item.quantity}</span>
                                  {item.fittingStatus === "GOOD" && <span className="text-green-600">✓</span>}
                                  {item.fittingStatus === "BAD"  && <span className="text-red-600">✗</span>}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Total Qty */}
                          <td className="px-4 py-3 font-semibold text-gray-900">{grp.totalQty}</td>

                          {/* Return Date */}
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            {new Date(grp.returnDate).toLocaleDateString()}
                          </td>

                          {/* Type badges */}
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              {grp.categories.map((cat) => (
                                <span key={cat} className={`px-2.5 py-1 rounded-full text-xs font-medium w-fit ${cat === "Functional" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3"><StatusBadge status={grp.groupStatus} /></td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <GroupActionButtons
                              group={grp}
                              onMoveToFitting={() => moveGroupToFitting(grp)}
                              onMoveToInventory={() => moveGroupToInventory(grp)}
                            />
                          </td>
                        </tr>

                        {/* ── Expanded detail row ── */}
                        {expandedRows[grp.orderId] && (
                          <tr className="border-b-2 border-blue-100">
                            <td colSpan={9} className="p-0 bg-gradient-to-b from-blue-50/60 to-white">
                              <div className="px-6 py-5">
                                <div className="grid grid-cols-3 gap-6">

                                  {/* Col 1: Order info */}
                                  <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Order Info</p>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Order ID</span>
                                        <span className="font-semibold text-gray-900">{grp.orderId}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Order Type</span>
                                        <span className={`font-semibold px-2 py-0.5 rounded text-xs ${grp.orderType === "SPARE" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                          {grp.orderType || "FULL"}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Returned From</span>
                                        <span className="font-semibold text-gray-900">{getReturnedFromName(grp.returnedFrom)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Return Date</span>
                                        <span className="font-semibold text-gray-900">
                                          {new Date(grp.returnDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Status</span>
                                        <StatusBadge status={grp.groupStatus} />
                                      </div>
                                    </div>

                                    {/* Sub-return status breakdown */}
                                    {grp.returns.length > 1 && (
                                      <div className="mt-3 pt-3 border-t border-gray-200">
                                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">Return Breakdown</p>
                                        {grp.returns.map((r) => (
                                          <div key={r._id} className="flex justify-between items-center text-xs py-1">
                                            <span className={`px-2 py-0.5 rounded-full font-medium ${r.category === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                              {r.category}
                                            </span>
                                            <StatusBadge status={r.status} />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Col 2: All items returned */}
                                  <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Items Returned</p>
                                    <div className="space-y-2">
                                      {grp.allItems.map((item, i) => (
                                        <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${
                                          item.fittingStatus === "GOOD" ? "bg-green-50 border-green-200"
                                          : item.fittingStatus === "BAD" ? "bg-red-50 border-red-200"
                                          : item.category === "Non-Functional" ? "bg-orange-50 border-orange-100"
                                          : "bg-white border-gray-200"
                                        }`}>
                                          <div>
                                            <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                                            <p className="text-xs mt-0.5">
                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${item.category === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                                {item.category}
                                              </span>
                                            </p>
                                            {item.fittingRemarks && (
                                              <p className="text-xs text-gray-500 mt-0.5 italic">"{item.fittingRemarks}"</p>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 text-right">
                                            <span className="text-sm font-bold text-gray-700">×{item.quantity}</span>
                                            {/* ✅ Spare parts don't go through fitting, so no fittingStatus display */}
                                            {grp.orderType !== "SPARE" && (
                                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                item.fittingStatus === "GOOD" ? "bg-green-100 text-green-700"
                                                : item.fittingStatus === "BAD" ? "bg-red-100 text-red-700"
                                                : "bg-gray-100 text-gray-500"
                                              }`}>
                                                {item.fittingStatus === "GOOD" ? "✓ Good" : item.fittingStatus === "BAD" ? "✗ Bad" : "Pending"}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Col 3: Notes + actions */}
                                  <div className="space-y-3">
                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Notes & Actions</p>
                                    {grp.returns.some((r) => r.description) ? (
                                      grp.returns.filter((r) => r.description).map((r) => (
                                        <div key={r._id} className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-sm text-amber-800 italic">
                                          "{r.description}"
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-sm text-gray-400 italic">No notes provided</p>
                                    )}
                                    {/* ✅ Info note for spare returns */}
                                    {grp.orderType === "SPARE" && grp.groupStatus === "Pending" && (
                                      <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700">
                                        ℹ Spare part returns go directly to inventory — no fitting inspection required.
                                      </div>
                                    )}
                                    <div className="pt-2" onClick={(e) => e.stopPropagation()}>
                                      <GroupActionButtons
                                        group={grp}
                                        onMoveToFitting={() => moveGroupToFitting(grp)}
                                        onMoveToInventory={() => moveGroupToInventory(grp)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="lg:hidden space-y-3">
              {loading ? (
                <div className="p-8 text-center text-gray-500">Loading...</div>
              ) : filteredGroups.length === 0 ? (
                <div className="p-8 text-center text-gray-500">No returns found</div>
              ) : (
                filteredGroups.map((grp) => (
                  <div key={grp.orderId} className="border border-gray-200 rounded-xl p-4 bg-white hover:border-[#c62d23] transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold text-gray-900">{grp.orderId}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <p className="text-xs text-gray-500">{getReturnedFromName(grp.returnedFrom)}</p>
                          {/* ✅ Order type badge on mobile */}
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${grp.orderType === "SPARE" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                            {grp.orderType || "FULL"}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {grp.categories.map((cat) => (
                          <span key={cat} className={`px-2 py-1 rounded-full text-xs font-medium ${cat === "Functional" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                            {cat}
                          </span>
                        ))}
                        <StatusBadge status={grp.groupStatus} />
                      </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {grp.allItems.map((item, i) => (
                        <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                          item.fittingStatus === "GOOD" ? "bg-green-50 border-green-200 text-green-800"
                          : item.fittingStatus === "BAD" ? "bg-red-50 border-red-200 text-red-800"
                          : item.category === "Non-Functional" ? "bg-orange-50 border-orange-200 text-orange-800"
                          : "bg-gray-50 border-gray-200 text-gray-700"
                        }`}>
                          {item.name} ×{item.quantity}
                          {item.fittingStatus === "GOOD" && " ✓"}
                          {item.fittingStatus === "BAD"  && " ✗"}
                        </span>
                      ))}
                    </div>

                    <div className="flex justify-between text-xs text-gray-600 mb-3">
                      <span>Total: <span className="font-bold text-gray-900">{grp.totalQty}</span></span>
                      <span>{new Date(grp.returnDate).toLocaleDateString()}</span>
                    </div>

                    <div className="flex justify-end">
                      <GroupActionButtons
                        group={grp}
                        onMoveToFitting={() => moveGroupToFitting(grp)}
                        onMoveToInventory={() => moveGroupToInventory(grp)}
                        small
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── CREATE RETURN MODAL ──────────────────────────────────── */}
      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h2 className="text-lg font-bold text-gray-900">Create Return</h2>
              <button onClick={() => { setOpenModal(false); resetForm(); }} className="p-2 hover:bg-gray-100 rounded-xl transition">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Order ID */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Order ID <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    value={form.orderId}
                    onChange={(e) => setForm((p) => ({ ...p, orderId: e.target.value }))}
                    placeholder="e.g. ORD-2024-001"
                    className="flex-1 px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition"
                  />
                  <button
                    onClick={() => fetchOrderDetails(form.orderId)}
                    disabled={!form.orderId || orderLoading}
                    className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition disabled:opacity-50"
                  >
                    {orderLoading ? "..." : "Fetch"}
                  </button>
                </div>
              </div>

              {/* Order Preview */}
              {orderPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm">
                  <p className="font-semibold text-blue-800 mb-1.5">Order Details</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-blue-700">
                    <span className="text-blue-500">Model:</span>          <span className="font-medium">{orderPreview.chairModel}</span>
                    <span className="text-blue-500">Order Type:</span>
                    <span className={`font-bold text-xs px-2 py-0.5 rounded w-fit ${orderPreview.orderType === "SPARE" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-800"}`}>
                      {orderPreview.orderType || "FULL"}
                    </span>
                    <span className="text-blue-500">Dispatched To:</span>  <span className="font-medium">{orderPreview.dispatchedTo || "—"}</span>
                    <span className="text-blue-500">Sales:</span>          <span className="font-medium">{orderPreview.salesPerson}</span>
                    <span className="text-blue-500">Status:</span>         <span className={`font-semibold ${orderPreview.progress === "DISPATCHED" ? "text-green-700" : "text-red-700"}`}>{orderPreview.progress}</span>
                  </div>
                  {/* ✅ Info banner for spare orders */}
                  {orderPreview.orderType === "SPARE" && (
                    <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700">
                      ℹ This is a <strong>spare parts order</strong> — returned items will go directly to inventory without fitting inspection.
                    </div>
                  )}
                </div>
              )}

              {/* SKU Quantities */}
              {returnItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Items Being Returned</label>
                    <span className="text-xs text-gray-400">Leave 0 to skip an item</span>
                  </div>
                  <div className="space-y-2">
                    {returnItems.map((item, idx) => (
                      <div key={idx} className={`border-2 rounded-xl p-3 transition-all ${
                        item.quantity > 0
                          ? item.category === "Functional"
                            ? "border-green-300/60 bg-green-50/30 shadow-sm"
                            : "border-orange-300/60 bg-orange-50/30 shadow-sm"
                          : "border-dashed border-gray-200 bg-gray-50/50 opacity-60"
                      }`}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className={`font-semibold text-sm truncate ${item.quantity > 0 ? "text-gray-900" : "text-gray-400"}`}>
                                {item.name}
                              </p>
                              {item.quantity === 0 && (
                                <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                  not returning
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Ordered: <span className="font-bold text-gray-500">{item.max}</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setReturnItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: Math.max(0, r.quantity - 1) } : r))}
                              disabled={item.quantity === 0}
                              className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 text-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >−</button>
                            <input
                              type="number"
                              min={0}
                              max={item.max}
                              value={item.quantity === 0 ? "" : item.quantity}
                              placeholder="0"
                              onChange={(e) => {
                                let val = e.target.value === "" ? 0 : Number(e.target.value);
                                if (val < 0) val = 0;
                                if (val > item.max) val = item.max;
                                setReturnItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: val } : r));
                              }}
                              className={`w-16 px-2 py-1.5 border-2 rounded-lg text-center font-bold text-sm outline-none transition ${
                                item.quantity > 0
                                  ? "border-gray-300 bg-white focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20"
                                  : "border-gray-200 bg-white text-gray-400 focus:border-gray-400"
                              }`}
                            />
                            <button
                              onClick={() => setReturnItems((prev) => prev.map((r, i) => i === idx ? { ...r, quantity: Math.min(item.max, r.quantity + 1) } : r))}
                              disabled={item.quantity >= item.max}
                              className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 rounded-lg font-bold text-gray-700 text-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >+</button>
                          </div>
                        </div>

                        {/* ✅ Only show condition toggle for FULL orders, not SPARE */}
                        {item.quantity > 0 && orderPreview?.orderType !== "SPARE" && (
                          <div className="mt-2.5 flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Condition:</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setReturnItems((prev) => prev.map((r, i) => i === idx ? { ...r, category: "Functional" } : r))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all ${
                                  item.category === "Functional"
                                    ? "bg-green-600 border-green-600 text-white shadow-sm"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700"
                                }`}
                              >✓ Functional</button>
                              <button
                                onClick={() => setReturnItems((prev) => prev.map((r, i) => i === idx ? { ...r, category: "Non-Functional" } : r))}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border-2 transition-all ${
                                  item.category === "Non-Functional"
                                    ? "bg-orange-500 border-orange-500 text-white shadow-sm"
                                    : "bg-white border-gray-200 text-gray-500 hover:border-orange-400 hover:text-orange-600"
                                }`}
                              >✗ Non-Functional</button>
                            </div>
                          </div>
                        )}

                        {item.quantity > 0 && (
                          <p className={`text-xs font-medium mt-1.5 ${item.quantity === item.max ? "text-green-600" : "text-amber-600"}`}>
                            {item.quantity === item.max
                              ? "✓ Full return"
                              : `⚠ Partial — ${item.max - item.quantity} unit${item.max - item.quantity !== 1 ? "s" : ""} not returning`}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  {returnItems.some((i) => i.quantity > 0) && (
                    <div className="mt-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg space-y-1">
                      {orderPreview?.orderType === "SPARE" ? (
                        // ✅ Simplified summary for spare orders
                        <p className="text-xs font-medium text-blue-700">
                          {returnItems.filter((i) => i.quantity > 0).map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                          <span className="ml-1 text-purple-600 font-semibold">→ Direct to inventory</span>
                        </p>
                      ) : (
                        ["Functional", "Non-Functional"].map((cat) => {
                          const catItems = returnItems.filter((i) => i.quantity > 0 && i.category === cat);
                          if (!catItems.length) return null;
                          return (
                            <p key={cat} className="text-xs font-medium text-blue-700">
                              <span className={`inline-block mr-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${cat === "Functional" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                                {cat}
                              </span>
                              {catItems.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                            </p>
                          );
                        })
                      )}
                      {orderPreview?.orderType !== "SPARE" && new Set(returnItems.filter((i) => i.quantity > 0).map((i) => i.category)).size > 1 && (
                        <p className="text-[10px] text-blue-500 pt-0.5">
                          ℹ Mixed conditions — will be grouped under this order
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Return Date */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Return Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.returnDate}
                  onChange={(e) => setForm((p) => ({ ...p, returnDate: e.target.value }))}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Reason / Notes</label>
                <textarea
                  rows={3}
                  value={form.reason}
                  onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Describe the reason for return..."
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setOpenModal(false); resetForm(); }}
                  className="flex-1 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition"
                >Cancel</button>
                <button
                  onClick={submitReturn}
                  disabled={!form.orderId || !form.returnDate || returnItems.filter((i) => i.quantity > 0).length === 0}
                  className="flex-1 py-3 bg-[#c62d23] text-white rounded-xl font-semibold hover:bg-[#a8241c] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >Create Return</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── GROUP ACTION BUTTONS ──────────────────────────────────────── */
const GroupActionButtons = ({ group, onMoveToFitting, onMoveToInventory, small }) => {
  const btnCls = small
    ? "text-xs font-medium px-3 py-1.5 rounded-lg transition"
    : "text-sm font-medium hover:underline transition";

  const statuses  = group.returns.map((r) => r.status);
  const isSpare   = group.orderType === "SPARE";

  // ✅ SPARE + Pending → show "Add to Inventory" directly (skip fitting)
  if (statuses.includes("Pending")) {
    if (isSpare) {
      return (
        <button
          onClick={onMoveToInventory}
          className={`${btnCls} text-green-600 hover:text-green-800 ${small ? "bg-green-50 hover:bg-green-100" : ""}`}
        >
          Add to Inventory
        </button>
      );
    }

    const pendingCount = statuses.filter((s) => s === "Pending").length;
    return (
      <button
        onClick={onMoveToFitting}
        className={`${btnCls} text-blue-600 hover:text-blue-800 ${small ? "bg-blue-50 hover:bg-blue-100" : ""}`}
      >
        Send to Fitting{pendingCount > 1 ? ` (${pendingCount})` : ""}
      </button>
    );
  }

  if (statuses.every((s) => s === "In-Fitting")) {
    return (
      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
        With Fitting Team
      </span>
    );
  }

  if (group.hasAccepted) {
    return (
      <button
        onClick={onMoveToInventory}
        className={`${btnCls} text-green-600 hover:text-green-800 ${small ? "bg-green-50 hover:bg-green-100" : ""}`}
      >
        Move to Inventory
      </button>
    );
  }

  if (statuses.every((s) => s === "Completed")) {
    return <span className="text-xs text-gray-400 font-medium">Completed</span>;
  }

  if (statuses.every((s) => s === "Rejected")) {
    return <span className="text-xs text-red-400 font-medium">Rejected</span>;
  }

  return (
    <span className="text-xs text-gray-400 font-medium bg-gray-100 px-2.5 py-1 rounded-full">
      In Progress
    </span>
  );
};

/* ─── STAT CARD ─────────────────────────────────────────────────── */
const StatCard = ({ title, value, onClick, active }) => (
  <div
    onClick={onClick}
    className={`cursor-pointer bg-white border-2 rounded-xl sm:rounded-2xl p-3 sm:p-4 lg:p-6 transition-all shadow-sm hover:shadow-md hover:scale-[1.02] ${
      active ? "border-[#c62d23] bg-red-50 ring-2 ring-[#c62d23]" : "border-gray-200 hover:border-gray-300"
    }`}
  >
    <p className="text-xs sm:text-sm text-gray-600 font-medium mb-2">{title}</p>
    <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${active ? "text-[#c62d23]" : "text-gray-900"}`}>
      {value}
    </p>
  </div>
);

export default Return;