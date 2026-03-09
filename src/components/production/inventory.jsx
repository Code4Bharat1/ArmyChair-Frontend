"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Package, MapPin, Plus, X, Send, Loader2, Box, Clock, CheckCircle2,
  UserCircle, AlertTriangle, AlertCircle, Pencil, ChevronDown, ChevronRight, Search,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionStockPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [addRemark, setAddRemark] = useState("");
  const [requests, setRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [stockFilter, setStockFilter] = useState("all");
  const [expandedParts, setExpandedParts] = useState(new Set());

  // Search & filter state
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [spareParts, setSpareParts] = useState([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/production/inward`, { headers });
      setRequests(res.data.data || []);
    } catch (err) {
      console.error("Fetch requests error", err);
    }
  };

  const handleSubmit = async () => {
    if (!partName || !quantity || quantity <= 0)
      return alert("Please enter valid product and quantity");
    try {
      setSubmitting(true);
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.post(
        `${API}/production/inward`,
        { partName, quantity: Number(quantity), location: `PROD_${user.name}`, remark: addRemark.trim() || "" },
        { headers }
      );
      alert("Inventory request sent to Warehouse successfully");
      setPartName(""); setQuantity(""); setShowModal(false);
      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddInventorySubmit = async () => {
    if (!partName || !quantity || quantity <= 0)
      return alert("Please enter valid part name and quantity");
    try {
      setSubmitting(true);
      const user = JSON.parse(localStorage.getItem("user"));
      await axios.post(
        `${API}/inventory/spare-parts`,
        { partName: partName.trim(), quantity: Number(quantity), location: `PROD_${user.name}`, remark: addRemark.trim() || "", minQuantity: 0 },
        { headers }
      );
      alert("Inventory added successfully");
      setShowAddModal(false); setPartName(""); setQuantity(""); setAddRemark("");
      fetchInventory(); fetchSpareParts();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add inventory");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (item) => {
    setEditItem(item);
    setEditQuantity(String(item.quantity));
    setEditRemark(item.remark || "");
    setShowEditModal(true);
  };

  const handleEditSubmit = async () => {
    if (editQuantity === "" || Number(editQuantity) < 0)
      return alert("Please enter a valid quantity");
    try {
      setEditLoading(true);
      const isSpare = editItem.type === "SPARE";
      const endpoint = isSpare
        ? `${API}/inventory/spare-parts/update/${editItem._id}`
        : `${API}/inventory/update/${editItem._id}`;
      const payload = isSpare
        ? { partName: editItem.part, location: editItem.location, quantity: Number(editQuantity), remark: editRemark.trim() }
        : { quantity: Number(editQuantity), remark: editRemark.trim() };
      await axios.patch(endpoint, payload, { headers });
      alert("Inventory updated successfully");
      setShowEditModal(false); setEditItem(null);
      fetchInventory();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update inventory");
    } finally {
      setEditLoading(false);
    }
  };

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "production") router.push("/login");
  }, [router]);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API}/inventory/production-stock`, { headers });
      setInventory(res.data.inventory || []);
    } catch (err) {
      console.error("Fetch inventory failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInventory(); fetchRequests(); fetchSpareParts(); }, []);

  const fetchSpareParts = async () => {
    try {
      const res = await axios.get(`${API}/inventory/spare-parts`, { headers });
      const spareItems = res.data.inventory || [];
      const qtyMap = {};
      spareItems.forEach((item) => {
        const name = item.partName?.trim();
        if (name) qtyMap[name] = (qtyMap[name] || 0) + (item.quantity || 0);
      });
      const parts = Object.entries(qtyMap).sort(([a], [b]) => a.localeCompare(b)).map(([name, qty]) => ({ name, qty }));
      setSpareParts(parts);
    } catch (err) {
      console.error("Fetch spare parts failed", err);
    }
  };

  const productionStock = useMemo(() => inventory.filter((item) => item.location?.startsWith("PROD_")), [inventory]);

  const grouped = useMemo(() => productionStock.map((item) => ({
    _id: item._id, type: item.type,
    part: item.partName || item.chairType,
    location: item.location,
    quantity: item.quantity,
    remark: item.remark || "",
  })), [productionStock]);

  const totalStock = grouped.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = grouped.length;

  const LOW_STOCK_THRESHOLD = 10;
  const OVERSTOCK_THRESHOLD = 100;

  const getStockStatus = (qty) => {
    if (qty <= LOW_STOCK_THRESHOLD) return "low";
    if (qty >= OVERSTOCK_THRESHOLD) return "overstock";
    return "normal";
  };

  const lowStockItems = useMemo(() => grouped.filter((i) => i.quantity > 0 && i.quantity <= LOW_STOCK_THRESHOLD), [grouped]);
  const overstockItems = useMemo(() => grouped.filter((i) => i.quantity >= OVERSTOCK_THRESHOLD), [grouped]);

  const uniqueLocations = useMemo(() => [...new Set(grouped.map((i) => i.location).filter(Boolean))].sort(), [grouped]);

  const filteredStock = useMemo(() => {
    let items = grouped;
    if (stockFilter === "low") items = lowStockItems;
    else if (stockFilter === "overstock") items = overstockItems;
    else if (stockFilter === "normal") items = grouped.filter((i) => i.quantity > LOW_STOCK_THRESHOLD && i.quantity < OVERSTOCK_THRESHOLD);

    if (search.trim()) {
      const s = search.toLowerCase().trim();
      items = items.filter((i) => i.part?.toLowerCase().includes(s));
    }
    if (filterLocation !== "ALL") items = items.filter((i) => i.location === filterLocation);
    if (filterStatus !== "ALL") items = items.filter((i) => getStockStatus(i.quantity) === filterStatus);
    return items;
  }, [grouped, stockFilter, lowStockItems, overstockItems, search, filterLocation, filterStatus]);

  const filteredGroupedByPart = useMemo(() => {
    const map = new Map();
    filteredStock.forEach((item) => {
      const key = item.part?.trim().toLowerCase();
      if (!map.has(key)) map.set(key, { partName: item.part, rows: [], totalQuantity: 0, worstStatus: "normal" });
      const g = map.get(key);
      g.rows.push(item);
      g.totalQuantity += item.quantity;
      const s = getStockStatus(item.quantity);
      if (s === "low") g.worstStatus = "low";
      else if (s === "overstock" && g.worstStatus !== "low") g.worstStatus = "overstock";
    });
    return Array.from(map.values());
  }, [filteredStock]);

  const toggleExpand = (name) => {
    const s = new Set(expandedParts);
    s.has(name) ? s.delete(name) : s.add(name);
    setExpandedParts(s);
  };

  const activeFilterCount = [filterLocation, filterStatus].filter((f) => f !== "ALL").length;
  const clearFilters = () => { setFilterLocation("ALL"); setFilterStatus("ALL"); setSearch(""); };

  const renderDropdown = () => (
    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg max-h-48 overflow-auto shadow-xl">
      {spareParts.filter((p) => p.name.toLowerCase().includes(partName.toLowerCase())).map((p) => (
        <div key={p.name} onMouseDown={() => { setPartName(p.name); setShowPartDropdown(false); }}
          className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0">
          <span className="text-sm text-gray-800">{p.name}</span>
        </div>
      ))}
      {spareParts.filter((p) => p.name.toLowerCase().includes(partName.toLowerCase())).length === 0 && partName && (
        <div className="px-4 py-2.5 text-xs text-gray-400">No matching parts</div>
      )}
      {partName && !spareParts.some((p) => p.name.toLowerCase() === partName.toLowerCase()) && (
        <div onMouseDown={() => { setPartName(partName.trim()); setShowPartDropdown(false); }}
          className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-semibold text-sm border-t border-gray-100">
          ➕ Add "{partName}"
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-auto">

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          {/* Desktop */}
          <div className="hidden md:block p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Package size={32} className="text-[#c62d23]" /><span>Production Stock</span>
                </h1>
                <p className="text-sm text-gray-600 mt-1">Manage inventory and request materials</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => { setPartName(""); setQuantity(""); setShowModal(true); }}
                  className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all">
                  <Send size={18} /> Request Stock
                </button>
                <button onClick={() => { setPartName(""); setQuantity(""); setAddRemark(""); setShowAddModal(true); }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all">
                  <Plus size={18} /> Add Inventory
                </button>
                <button onClick={() => router.push("/profile")} title="My Profile" className="text-gray-600 hover:text-[#c62d23] transition">
                  <UserCircle size={34} />
                </button>
              </div>
            </div>
          </div>
          {/* Mobile */}
          <div className="md:hidden p-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={24} className="text-[#c62d23]" /><span>Stock</span>
              </h1>
              <div className="flex items-center gap-2">
                <button onClick={() => { setPartName(""); setQuantity(""); setShowModal(true); }}
                  className="bg-[#c62d23] text-white p-2 rounded-lg shadow-sm" title="Request Stock"><Send size={18} /></button>
                <button onClick={() => { setPartName(""); setQuantity(""); setAddRemark(""); setShowAddModal(true); }}
                  className="bg-green-600 text-white p-2 rounded-lg shadow-sm" title="Add Inventory"><Plus size={20} /></button>
                <button onClick={() => router.push("/profile")} className="text-gray-600 p-2"><UserCircle size={28} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gradient-to-br from-[#c62d23] to-[#a01f17] text-white p-3 rounded-xl">
                <div className="text-xs opacity-80 mb-1">Total Stock</div>
                <div className="text-2xl font-bold">{totalStock}</div>
              </div>
              <div className="bg-white border-2 border-gray-200 p-3 rounded-xl">
                <div className="text-xs text-gray-600 mb-1">Items</div>
                <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="p-4 md:p-8 space-y-6 md:space-y-8">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
              <p className="mt-2 text-gray-500">Loading stock...</p>
            </div>
          ) : (
            <>
              {/* STATS — Desktop */}
              <div className="hidden md:grid grid-cols-4 gap-6">
                <StatCard title="Total Stock Quantity" value={totalStock} icon={<Box className="text-[#c62d23]" />} subtitle="units in production" onClick={() => setStockFilter("all")} active={stockFilter === "all"} />
                <StatCard title="Unique Items" value={totalItems} icon={<Package className="text-[#c62d23]" />} subtitle="different parts" onClick={() => setStockFilter("normal")} active={stockFilter === "normal"} />
                <StatCard title="Low Stock Alert" value={lowStockItems.length} icon={<AlertTriangle className="text-[#c62d23]" />} subtitle="needs restocking" alert={lowStockItems.length > 0 ? "warning" : null} onClick={() => setStockFilter("low")} active={stockFilter === "low"} />
                <StatCard title="Overstock Alert" value={overstockItems.length} icon={<AlertCircle className="text-[#c62d23]" />} subtitle="excess inventory" alert={overstockItems.length > 0 ? "info" : null} onClick={() => setStockFilter("overstock")} active={stockFilter === "overstock"} />
              </div>

              {/* Mobile Filter Chips */}
              <div className="md:hidden flex gap-2 overflow-x-auto pb-1">
                {[
                  { key: "all", label: `All (${totalItems})` },
                  { key: "normal", label: `Normal (${grouped.filter(i => i.quantity > LOW_STOCK_THRESHOLD && i.quantity < OVERSTOCK_THRESHOLD).length})` },
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setStockFilter(key)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${stockFilter === key ? "bg-[#c62d23] text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"}`}>
                    {label}
                  </button>
                ))}
                {lowStockItems.length > 0 && (
                  <button onClick={() => setStockFilter("low")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1 transition-all ${stockFilter === "low" ? "bg-yellow-500 text-white shadow-sm" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                    <AlertTriangle size={14} />Low ({lowStockItems.length})
                  </button>
                )}
                {overstockItems.length > 0 && (
                  <button onClick={() => setStockFilter("overstock")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap inline-flex items-center gap-1 transition-all ${stockFilter === "overstock" ? "bg-blue-500 text-white shadow-sm" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                    <AlertCircle size={14} />Overstock ({overstockItems.length})
                  </button>
                )}
              </div>

              {/* Alert banners */}
              {stockFilter === "all" && lowStockItems.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl">
                  <div className="flex items-start">
                    <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 mb-1">Low Stock Alert - Immediate Restocking Required</h3>
                      <p className="text-xs text-yellow-700 mb-2">{lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} running critically low (≤{LOW_STOCK_THRESHOLD} units)</p>
                      <div className="flex flex-wrap gap-2">
                        {lowStockItems.slice(0, 5).map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">{item.part}: {item.quantity}</span>
                        ))}
                        {lowStockItems.length > 5 && <span className="text-xs text-yellow-700 py-1">+{lowStockItems.length - 5} more</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {stockFilter === "all" && overstockItems.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-xl">
                  <div className="flex items-start">
                    <AlertCircle className="text-blue-600 mr-3 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-blue-800 mb-1">Overstock Alert - Excess Inventory Detected</h3>
                      <p className="text-xs text-blue-700 mb-2">{overstockItems.length} item{overstockItems.length !== 1 ? "s" : ""} with high stock levels (≥{OVERSTOCK_THRESHOLD} units)</p>
                      <div className="flex flex-wrap gap-2">
                        {overstockItems.slice(0, 5).map((item, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">{item.part}: {item.quantity}</span>
                        ))}
                        {overstockItems.length > 5 && <span className="text-xs text-blue-700 py-1">+{overstockItems.length - 5} more</span>}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {stockFilter !== "all" && (
                <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Showing: <span className="font-semibold">
                      {stockFilter === "low" && "Low Stock Items"}
                      {stockFilter === "overstock" && "Overstocked Items"}
                      {stockFilter === "normal" && "Normal Stock Items"}
                    </span> ({filteredStock.length})
                  </span>
                  <button onClick={() => setStockFilter("all")} className="text-xs text-[#c62d23] hover:underline font-semibold">Clear Filter</button>
                </div>
              )}

              {/* ── CURRENT STOCK LEVELS ── */}
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="p-4 md:p-6 border-b border-gray-200">
                  <h2 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Box size={20} className="text-[#c62d23]" />Current Stock Levels
                  </h2>
                </div>

                {/* SEARCH + FILTER TOOLBAR (shared for both desktop & mobile) */}
                <div className="px-4 md:px-5 py-3 border-b border-gray-100 bg-gray-50/50 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={15} />
                      <input type="text" placeholder="Search part name..."
                        value={search} onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#c62d23]/20 focus:border-[#c62d23] outline-none bg-white" />
                      {search && (
                        <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <div className="ml-auto text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{filteredGroupedByPart.length}</span> of{" "}
                      <span className="font-semibold text-gray-700">{grouped.length}</span> parts
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={13} className="text-gray-400 flex-shrink-0" />
                      <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}
                        className={`py-1.5 px-2 border rounded-lg text-xs outline-none cursor-pointer transition ${filterLocation !== "ALL" ? "border-[#c62d23] text-[#c62d23] bg-red-50 font-medium" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}>
                        <option value="ALL">All Locations</option>
                        {uniqueLocations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <AlertCircle size={13} className="text-gray-400 flex-shrink-0" />
                      <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                        className={`py-1.5 px-2 border rounded-lg text-xs outline-none cursor-pointer transition ${filterStatus !== "ALL" ? "border-[#c62d23] text-[#c62d23] bg-red-50 font-medium" : "border-gray-200 text-gray-600 bg-white hover:border-gray-300"}`}>
                        <option value="ALL">All Statuses</option>
                        <option value="normal">Healthy</option>
                        <option value="low">Low Stock</option>
                        <option value="overstock">Overstocked</option>
                      </select>
                    </div>

                    {(activeFilterCount > 0 || search) && (
                      <button onClick={clearFilters}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-red-50 hover:text-[#c62d23] text-gray-500 text-xs font-medium transition border border-gray-200 hover:border-[#c62d23]/30">
                        <X size={12} /> Clear filters
                        {activeFilterCount > 0 && (
                          <span className="ml-0.5 bg-[#c62d23] text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{activeFilterCount}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {filteredGroupedByPart.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <Box size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No stock items found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : (
                  <>
                    {/* ── DESKTOP TABLE ── */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="bg-gray-50 border-b border-gray-200">
                            <th className="w-10 px-4 py-3"></th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Part Name</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Location</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Type</th>
                            <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">Total Qty</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {filteredGroupedByPart.map((group) => (
                            <React.Fragment key={group.partName}>
                              <tr className="hover:bg-blue-50/30 cursor-pointer transition-colors group" onClick={() => toggleExpand(group.partName)}>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-gray-400 group-hover:text-gray-600 transition-colors">
                                    {expandedParts.has(group.partName) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-semibold text-gray-900 capitalize whitespace-nowrap">{group.partName}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-sm font-medium">
                                    <MapPin size={11} className="text-[#c62d23]" />{group.rows.length} location{group.rows.length !== 1 ? "s" : ""}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400 text-sm italic">—</td>
                                <td className="px-4 py-3 text-right font-bold text-gray-900 tabular-nums">{group.totalQuantity}</td>
                                <td className="px-4 py-3"><StockStatusBadge status={group.worstStatus} /></td>
                                <td className="px-4 py-3"></td>
                              </tr>
                              {expandedParts.has(group.partName) && group.rows.map((item, idx) => (
                                <tr key={item._id || idx}
                                  className={`bg-slate-50/70 hover:bg-slate-100/60 transition-colors ${idx === group.rows.length - 1 ? "border-b-2 border-gray-200" : ""}`}>
                                  <td className="px-4 py-2.5"></td>
                                  <td className="px-4 py-2.5 text-sm text-gray-400 italic">{item.remark || "—"}</td>
                                  <td className="px-4 py-2.5">
                                    <span className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
                                      <MapPin size={12} className="text-[#c62d23]" />{item.location}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-sm text-gray-500">{item.type === "SPARE" ? "Spare Part" : "Full Chair"}</td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums text-sm">{item.quantity}</td>
                                  <td className="px-4 py-2.5"><StockStatusBadge status={getStockStatus(item.quantity)} /></td>
                                  <td className="px-4 py-2.5">
                                    <button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="p-1.5 hover:bg-blue-100 rounded-md transition" title="Edit">
                                      <Pencil size={13} className="text-gray-400 hover:text-blue-600" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ── MOBILE EXPANDABLE CARDS ── */}
                    <div className="md:hidden divide-y divide-gray-100">
                      {filteredGroupedByPart.map((group) => (
                        <div key={group.partName} className="bg-white">
                          <div className="p-4 cursor-pointer" onClick={() => toggleExpand(group.partName)}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {expandedParts.has(group.partName)
                                  ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" />
                                  : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
                                <h3 className="font-semibold text-gray-900 text-sm truncate capitalize">{group.partName}</h3>
                              </div>
                              <StockStatusBadge status={group.worstStatus} />
                            </div>
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-3 pl-5">
                              <MapPin size={11} className="text-gray-400" />
                              <span>{group.rows.length} location{group.rows.length !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs pl-5">
                              <div>
                                <p className="text-gray-400 mb-0.5">Total Stock</p>
                                <p className="font-bold text-gray-900 text-lg leading-none">{group.totalQuantity}</p>
                              </div>
                              <div>
                                <p className="text-gray-400 mb-0.5">Entries</p>
                                <p className="font-semibold text-gray-900">{group.rows.length}</p>
                              </div>
                            </div>
                          </div>

                          {expandedParts.has(group.partName) && (
                            <div className="border-t border-gray-200 divide-y divide-gray-100 bg-gray-50/50">
                              {group.rows.map((item) => (
                                <div key={item._id} className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-1.5">
                                      <MapPin size={13} className="text-[#c62d23]" />
                                      <span className="font-medium text-sm">{item.location}</span>
                                    </div>
                                    <StockStatusBadge status={getStockStatus(item.quantity)} />
                                  </div>
                                  <div className="grid grid-cols-2 gap-3 mb-2 text-xs">
                                    <div>
                                      <p className="text-gray-400 mb-0.5">Quantity</p>
                                      <p className="font-bold text-gray-900 text-base">{item.quantity}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-400 mb-0.5">Type</p>
                                      <p className="font-semibold text-gray-700">{item.type === "SPARE" ? "Spare Part" : "Full Chair"}</p>
                                    </div>
                                  </div>
                                  {item.remark && <p className="text-xs text-gray-400 italic mb-2">{item.remark}</p>}
                                  <button onClick={() => openEditModal(item)}
                                    className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 text-xs font-medium mt-2">
                                    <Pencil size={13} /> Edit
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* REQUEST HISTORY — Desktop */}
              <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Clock size={20} className="text-[#c62d23]" />Request History</h2>
                </div>
                {requests.length === 0 ? (
                  <div className="text-center text-gray-500 py-16">
                    <Clock size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">No requests yet</p>
                    <p className="text-sm text-gray-400 mt-1">Your material requests will appear here</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          {["Product / Part", "Quantity", "Status", "Request Date"].map((h) => (
                            <th key={h} className="p-4 text-left font-semibold text-gray-700">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((r, index) => (
                          <tr key={r._id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                            <td className="p-4 font-semibold text-gray-900 capitalize">{r.partName}</td>
                            <td className="p-4 font-bold text-[#c62d23]">{r.quantity}</td>
                            <td className="p-4">
                              {r.status === "PENDING"
                                ? <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 inline-flex items-center gap-1"><Clock size={12} />Pending</span>
                                : <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1"><CheckCircle2 size={12} />{r.status}</span>}
                            </td>
                            <td className="p-4 text-gray-600">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* REQUEST HISTORY — Mobile */}
              <div className="md:hidden bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><Clock size={18} className="text-[#c62d23]" />Request History</h2>
                </div>
                {requests.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <Clock size={40} className="mx-auto mb-3 text-gray-300" />
                    <p className="text-base font-medium">No requests yet</p>
                  </div>
                ) : (
                  <div className="p-4 space-y-3">
                    {requests.map((r) => (
                      <div key={r._id} className="border border-gray-200 rounded-xl p-3 hover:border-[#c62d23] transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm capitalize flex-1 pr-2">{r.partName}</h3>
                          <span className="text-xl font-bold text-[#c62d23] ml-1 flex-shrink-0">{r.quantity}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-shrink-0">
                            {r.status === "PENDING"
                              ? <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200"><Clock size={10} />Pending</span>
                              : <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200"><CheckCircle2 size={10} />{r.status}</span>}
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">{new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* REQUEST MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">
              <div><h2 className="text-2xl font-bold text-gray-900">Request Stock</h2><p className="text-xs text-gray-500 mt-1">Send a material request to warehouse</p></div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 flex-1 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Product / Part Name</label>
                <div className="relative">
                  <input type="text" value={partName} placeholder="Search or add part name"
                    onFocus={() => setShowPartDropdown(true)} onBlur={() => setTimeout(() => setShowPartDropdown(false), 150)}
                    onChange={(e) => { setPartName(e.target.value); setShowPartDropdown(true); }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c62d23]" />
                  {showPartDropdown && renderDropdown()}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Quantity Required</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" min="1"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900" />
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Remark <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                <input type="text" value={addRemark} onChange={(e) => setAddRemark(e.target.value)} placeholder="e.g. Urgent, needed for production today"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200 bg-white">
              <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200">Cancel</button>
              <button onClick={handleSubmit} disabled={submitting} className="bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" />Sending...</> : <><Send size={16} />Send Request</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD INVENTORY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">
              <div><h2 className="text-2xl font-bold text-gray-900">Add Inventory</h2><p className="text-xs text-gray-500 mt-1">Record stock already at production</p></div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 flex-1 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Part Name</label>
                <div className="relative">
                  <input type="text" value={partName} placeholder="Search or enter part name"
                    onFocus={() => setShowPartDropdown(true)} onBlur={() => setTimeout(() => setShowPartDropdown(false), 150)}
                    onChange={(e) => { setPartName(e.target.value); setShowPartDropdown(true); }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  {showPartDropdown && renderDropdown()}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Quantity</label>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="0" min="1"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-gray-900" />
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Remark <span className="text-gray-400 font-normal text-xs">(optional)</span></label>
                <input type="text" value={addRemark} onChange={(e) => setAddRemark(e.target.value)} placeholder="e.g. Leftover from last batch"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-gray-900" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200 bg-white">
              <button type="button" onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200">Cancel</button>
              <button onClick={handleAddInventorySubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" />Adding...</> : <><Plus size={16} />Add to Inventory</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && editItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">
              <div><h2 className="text-2xl font-bold text-gray-900">Edit Inventory</h2><p className="text-xs text-gray-500 mt-1">Changes will be logged and notified to admin</p></div>
              <button onClick={() => { setShowEditModal(false); setEditItem(null); }} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Part / Item</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 text-sm font-medium capitalize">
                  {editItem.part}<span className="ml-2 text-xs text-gray-400 font-normal">({editItem.type === "SPARE" ? "Spare Part" : "Full Chair"})</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Location</label>
                <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm flex items-center gap-2">
                  <MapPin size={14} className="text-[#c62d23]" />{editItem.location}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Quantity <span className="ml-2 text-xs font-normal text-gray-400">Current: <span className="font-semibold text-[#c62d23]">{editItem.quantity}</span></span>
                </label>
                <input type="number" value={editQuantity} onChange={(e) => setEditQuantity(e.target.value)} min="0"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900" />
                {editQuantity !== "" && Number(editQuantity) !== editItem.quantity && (
                  <p className="text-xs mt-1.5 font-medium">
                    {Number(editQuantity) > editItem.quantity
                      ? <span className="text-green-600">▲ +{Number(editQuantity) - editItem.quantity} units</span>
                      : <span className="text-red-500">▼ -{editItem.quantity - Number(editQuantity)} units</span>}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Reason for Edit <span className="text-gray-400 font-normal text-xs">(recommended)</span></label>
                <input type="text" value={editRemark} onChange={(e) => setEditRemark(e.target.value)}
                  placeholder="e.g. Physical count correction, damaged stock removed"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900" />
              </div>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">This edit will be recorded in the activity log and visible to the admin.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200">
              <button onClick={() => { setShowEditModal(false); setEditItem(null); }} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200">Cancel</button>
              <button onClick={handleEditSubmit} disabled={editLoading} className="bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2">
                {editLoading ? <><Loader2 size={16} className="animate-spin" />Saving...</> : <><Pencil size={16} />Save Changes</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StockStatusBadge = ({ status }) => {
  const map = { low: "bg-yellow-100 text-yellow-800", overstock: "bg-blue-100 text-blue-800", normal: "bg-green-100 text-green-800" };
  const labels = { low: "Low Stock", overstock: "Overstocked", normal: "Healthy" };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${map[status] || "bg-gray-100 text-gray-700"}`}>
      {labels[status] || status}
    </span>
  );
};

const StatCard = ({ title, value, icon, subtitle, alert, onClick, active }) => {
  const getAlertStyles = () => {
    if (alert === "warning") return { border: "border-yellow-300 bg-yellow-50", borderLeft: "4px solid #fbbf24", valueColor: "text-yellow-700", hover: "hover:border-yellow-400" };
    if (alert === "info") return { border: "border-blue-300 bg-blue-50", borderLeft: "4px solid #3b82f6", valueColor: "text-blue-700", hover: "hover:border-blue-400" };
    return { border: "border-gray-200", borderLeft: "4px solid #c62d23", valueColor: "text-gray-900", hover: "hover:border-[#c62d23]" };
  };
  const styles = getAlertStyles();
  return (
    <div onClick={onClick} className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${styles.border} ${styles.hover} ${active ? "ring-2 ring-[#c62d23] ring-offset-2" : ""}`}
      style={{ borderLeft: styles.borderLeft }}>
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <p className={`text-3xl font-bold mb-1 ${styles.valueColor}`}>{value}</p>
      {subtitle && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span>{subtitle}</span>{active && <span className="text-[#c62d23]">→</span>}
        </div>
      )}
    </div>
  );
};