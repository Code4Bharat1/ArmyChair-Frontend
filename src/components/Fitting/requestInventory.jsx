"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Package, Send, Loader2, Box, Clock, CheckCircle2,
  Plus, X, Menu, AlertTriangle, AlertCircle,
} from "lucide-react";
import FittingSidebar from "./sidebar";

const LOW_STOCK_THRESHOLD = 10;
const OVERSTOCK_THRESHOLD = 100;

export default function FittingInventoryRequest() {
  const API = process.env.NEXT_PUBLIC_API_URL;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [partName, setPartName]                 = useState("");
  const [quantity, setQuantity]                 = useState("");
  const [remark, setRemark]                     = useState("");
  const [loading, setLoading]                   = useState(false);
  const [showModal, setShowModal]               = useState(false);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [submitting, setSubmitting]             = useState(false);
  const [stockFilter, setStockFilter]           = useState("all");
  const [requests, setRequests]                 = useState([]);
  const [stock, setStock]                       = useState([]);
  const [spareParts, setSpareParts]             = useState([]);
  const [showPartDropdown, setShowPartDropdown] = useState(false);

  /* ── fetchers ── */
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/production/inward`, { headers });
      setRequests(res.data.data || []);
    } catch (err) { console.error("Fetch requests error", err); }
  };

  const fetchStock = async () => {
    try {
      const res = await axios.get(`${API}/production/stock?location=FITTING_SECTION`, { headers });
      setStock(res.data.data || []);
    } catch (err) { console.error("Fetch stock error", err); }
  };

  const fetchSpareParts = async () => {
    try {
      const [spareRes, invRes] = await Promise.all([
        axios.get(`${API}/inventory/spare-parts`, { headers }),
        axios.get(`${API}/inventory`, { headers }),
      ]);
      const qtyMap = {};
      [...(spareRes.data.inventory || [])].forEach((item) => {
        const name = item.partName?.trim();
        if (name) qtyMap[name] = (qtyMap[name] || 0) + (item.quantity || 0);
      });
      [...(invRes.data.inventory || [])].forEach((item) => {
        const name = (item.partName || item.chairType)?.trim();
        if (name) qtyMap[name] = (qtyMap[name] || 0) + (item.quantity || 0);
      });
      setSpareParts(
        Object.entries(qtyMap)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([name, qty]) => ({ name, qty }))
      );
    } catch (err) { console.error("Fetch spare parts failed", err); }
  };

  useEffect(() => {
    fetchRequests();
    fetchStock();
    fetchSpareParts();
  }, []);

  /* ── submit: request from warehouse ── */
  const handleSubmit = async () => {
    if (!partName || !quantity || quantity <= 0)
      return alert("Please enter valid product and quantity");
    try {
      setLoading(true);
      await axios.post(
        `${API}/production/inward`,
        { partName, quantity: Number(quantity), location: "FITTING_SECTION", remark: remark.trim() || "" },
        { headers }
      );
      alert("Inventory request sent to Warehouse successfully");
      setPartName(""); setQuantity(""); setRemark("");
      setShowModal(false);
      fetchRequests();
    } catch (err) { alert(err.response?.data?.message || "Request failed"); }
    finally { setLoading(false); }
  };

  /* ── submit: add existing inventory ── */
  const handleAddInventorySubmit = async () => {
    if (!partName || !quantity || quantity <= 0)
      return alert("Please enter valid part name and quantity");
    try {
      setSubmitting(true);
      await axios.post(
        `${API}/inventory/spare-parts`,
        { partName: partName.trim(), quantity: Number(quantity), location: "FITTING_SECTION", remark: remark.trim() || "", minQuantity: 0 },
        { headers }
      );
      alert("Inventory added successfully");
      setShowAddModal(false); setPartName(""); setQuantity(""); setRemark("");
      fetchStock(); fetchSpareParts();
    } catch (err) { alert(err.response?.data?.message || "Failed to add inventory"); }
    finally { setSubmitting(false); }
  };

  /* ── derived ── */
  const totalStock = stock.reduce((s, i) => s + i.quantity, 0);
  const totalItems = stock.length;

  const getStockStatus = (qty) => {
    if (qty <= LOW_STOCK_THRESHOLD) return "low";
    if (qty >= OVERSTOCK_THRESHOLD) return "overstock";
    return "normal";
  };

  const lowStockItems  = useMemo(() => stock.filter((i) => i.quantity > 0 && i.quantity <= LOW_STOCK_THRESHOLD), [stock]);
  const overstockItems = useMemo(() => stock.filter((i) => i.quantity >= OVERSTOCK_THRESHOLD), [stock]);
  const normalItems    = useMemo(() => stock.filter((i) => i.quantity > LOW_STOCK_THRESHOLD && i.quantity < OVERSTOCK_THRESHOLD), [stock]);

  const filteredStock = useMemo(() => {
    if (stockFilter === "low")       return lowStockItems;
    if (stockFilter === "overstock") return overstockItems;
    if (stockFilter === "normal")    return normalItems;
    return stock;
  }, [stock, stockFilter, lowStockItems, overstockItems, normalItems]);

  const resetModal = () => { setPartName(""); setQuantity(""); setRemark(""); setShowPartDropdown(false); };

  /* ── shared part dropdown ── */
  const renderDropdown = () => (
    <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg max-h-48 overflow-auto shadow-xl">
      {spareParts
        .filter((p) => p.name.toLowerCase().includes(partName.toLowerCase()))
        .map((p) => (
          <div
            key={p.name}
            onMouseDown={() => { setPartName(p.name); setShowPartDropdown(false); }}
            className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
          >
            <span className="text-sm text-gray-800">{p.name}</span>
            <span className="text-xs text-gray-400">{p.qty} units</span>
          </div>
        ))}
      {spareParts.filter((p) => p.name.toLowerCase().includes(partName.toLowerCase())).length === 0 && partName && (
        <div className="px-4 py-2.5 text-xs text-gray-400">No matching parts</div>
      )}
      {partName && !spareParts.some((p) => p.name.toLowerCase() === partName.toLowerCase()) && (
        <div
          onMouseDown={() => { setPartName(partName.trim()); setShowPartDropdown(false); }}
          className="px-4 py-2.5 bg-gray-50 hover:bg-green-50 cursor-pointer text-green-700 font-semibold text-sm border-t border-gray-100"
        >
          ➕ Add "{partName}"
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
        <FittingSidebar />
      </div>

      <div className="flex-1 overflow-auto">
        {/* ── Mobile top bar ── */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Inventory</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => { resetModal(); setShowModal(true); }} className="bg-[#c62d23] hover:bg-[#a01f17] text-white p-2 rounded-lg transition-colors" title="Request Stock">
              <Send size={18} />
            </button>
            <button onClick={() => { resetModal(); setShowAddModal(true); }} className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg transition-colors" title="Add Inventory">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ── Desktop header ── */}
          <div className="hidden lg:flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={32} className="text-[#c62d23]" />
                Fitting Section — Inventory Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">Request materials from warehouse and track stock</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { resetModal(); setShowModal(true); }}
                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <Send size={18} /> Request Stock
              </button>
              <button
                onClick={() => { resetModal(); setShowAddModal(true); }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
              >
                <Plus size={18} /> Add Inventory
              </button>
            </div>
          </div>

          {/* ── Mobile stats ── */}
          <div className="grid grid-cols-2 gap-2 md:hidden">
            <div className="bg-gradient-to-br from-[#c62d23] to-[#a01f17] text-white p-3 rounded-xl">
              <div className="text-xs opacity-80 mb-1">Total Stock</div>
              <div className="text-2xl font-bold">{totalStock}</div>
            </div>
            <div className="bg-white border-2 border-gray-200 p-3 rounded-xl">
              <div className="text-xs text-gray-600 mb-1">Items</div>
              <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
            </div>
          </div>

          {/* ── Desktop stat cards ── */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Stock Quantity" value={totalStock} icon={<Box className="text-[#c62d23]" />} subtitle="units in fitting" onClick={() => setStockFilter("all")} active={stockFilter === "all"} />
            <StatCard title="Unique Items" value={totalItems} icon={<Package className="text-[#c62d23]" />} subtitle="different parts" onClick={() => setStockFilter("normal")} active={stockFilter === "normal"} />
            <StatCard title="Low Stock Alert" value={lowStockItems.length} icon={<AlertTriangle className="text-[#c62d23]" />} subtitle="needs restocking" alert={lowStockItems.length > 0 ? "warning" : null} onClick={() => setStockFilter("low")} active={stockFilter === "low"} />
            <StatCard title="Overstock Alert" value={overstockItems.length} icon={<AlertCircle className="text-[#c62d23]" />} subtitle="excess inventory" alert={overstockItems.length > 0 ? "info" : null} onClick={() => setStockFilter("overstock")} active={stockFilter === "overstock"} />
          </div>

          {/* ── Mobile filter chips ── */}
          <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
            <button onClick={() => setStockFilter("all")} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${stockFilter === "all" ? "bg-[#c62d23] text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"}`}>
              All ({stock.length})
            </button>
            <button onClick={() => setStockFilter("normal")} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${stockFilter === "normal" ? "bg-[#c62d23] text-white shadow-sm" : "bg-white text-gray-600 border border-gray-200"}`}>
              Normal ({normalItems.length})
            </button>
            {lowStockItems.length > 0 && (
              <button onClick={() => setStockFilter("low")} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1 ${stockFilter === "low" ? "bg-yellow-500 text-white shadow-sm" : "bg-yellow-50 text-yellow-700 border border-yellow-200"}`}>
                <AlertTriangle size={14} /> Low ({lowStockItems.length})
              </button>
            )}
            {overstockItems.length > 0 && (
              <button onClick={() => setStockFilter("overstock")} className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1 ${stockFilter === "overstock" ? "bg-blue-500 text-white shadow-sm" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                <AlertCircle size={14} /> Overstock ({overstockItems.length})
              </button>
            )}
          </div>

          {/* ── Alert banners ── */}
          {stockFilter === "all" && lowStockItems.length > 0 && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl">
              <div className="flex items-start">
                <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-yellow-800 mb-1">Low Stock Alert — Immediate Restocking Required</h3>
                  <p className="text-xs text-yellow-700 mb-2">{lowStockItems.length} item{lowStockItems.length !== 1 ? "s" : ""} running critically low (≤{LOW_STOCK_THRESHOLD} units)</p>
                  <div className="flex flex-wrap gap-2">
                    {lowStockItems.slice(0, 5).map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300">
                        {item.partName}: {item.quantity}
                      </span>
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
                  <h3 className="text-sm font-semibold text-blue-800 mb-1">Overstock Alert — Excess Inventory Detected</h3>
                  <p className="text-xs text-blue-700 mb-2">{overstockItems.length} item{overstockItems.length !== 1 ? "s" : ""} with high stock levels (≥{OVERSTOCK_THRESHOLD} units)</p>
                  <div className="flex flex-wrap gap-2">
                    {overstockItems.slice(0, 5).map((item, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                        {item.partName}: {item.quantity}
                      </span>
                    ))}
                    {overstockItems.length > 5 && <span className="text-xs text-blue-700 py-1">+{overstockItems.length - 5} more</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Active filter indicator ── */}
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

          {/* ── Stock grid ── */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Box size={20} className="text-[#c62d23]" />
                Current Stock Levels
              </h2>
            </div>
            {filteredStock.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <Box size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No stock items found</p>
                <p className="text-sm text-gray-400 mt-1">{stockFilter !== "all" ? "Try changing the filter" : "Stock items will appear here"}</p>
              </div>
            ) : (
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                  {filteredStock.map((item, index) => {
                    const stockStatus = getStockStatus(item.quantity);
                    return (
                      <div
                        key={item._id || index}
                        className={`border rounded-xl p-3 md:p-4 transition-all ${
                          stockStatus === "low"
                            ? "border-yellow-300 bg-yellow-50 hover:border-yellow-400 hover:shadow-lg"
                            : stockStatus === "overstock"
                            ? "border-blue-300 bg-blue-50 hover:border-blue-400 hover:shadow-lg"
                            : "border-gray-200 hover:border-[#c62d23] hover:shadow-md"
                        }`}
                      >
                        {stockStatus !== "normal" && (
                          <div className="mb-2">
                            {stockStatus === "low" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-200 text-yellow-800 border border-yellow-400">
                                <AlertTriangle size={10} /> LOW
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800 border border-blue-400">
                                <AlertCircle size={10} /> HIGH
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2 md:mb-3">
                          <h3 className="font-semibold text-gray-900 text-xs md:text-sm capitalize flex-1 pr-2 leading-tight">{item.partName}</h3>
                          <span className={`text-xl md:text-2xl font-bold ml-1 flex-shrink-0 ${
                            stockStatus === "low" ? "text-yellow-600" : stockStatus === "overstock" ? "text-blue-600" : "text-[#c62d23]"
                          }`}>{item.quantity}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500">
                          <Box size={10} className="md:w-3 md:h-3 flex-shrink-0" />
                          <span>units available</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Request history — desktop ── */}
          <div className="hidden md:block bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Clock size={20} className="text-[#c62d23]" />
                Request History
              </h2>
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
                          {r.status === "PENDING" ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 inline-flex items-center gap-1">
                              <Clock size={12} /> Pending
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                              <CheckCircle2 size={12} /> {r.status}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-gray-600">
                          {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Request history — mobile ── */}
          <div className="md:hidden bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-[#c62d23]" />
                Request History
              </h2>
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
                      {r.status === "PENDING" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                          <Clock size={10} /> Pending
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle2 size={10} /> {r.status}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ REQUEST FROM WAREHOUSE MODAL ══ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Request Stock</h2>
                <p className="text-xs text-gray-500 mt-1">Send a material request to warehouse</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Product / Part Name</label>
                <div className="relative">
                  <input
                    type="text" value={partName} placeholder="Search or add part name"
                    onFocus={() => setShowPartDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPartDropdown(false), 150)}
                    onChange={(e) => { setPartName(e.target.value); setShowPartDropdown(true); }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#c62d23]"
                  />
                  {showPartDropdown && renderDropdown()}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Quantity Required</label>
                <input
                  type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0" min="1"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Remark <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
                  placeholder="e.g. Urgent, needed for fitting today"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200">
              <button onClick={() => setShowModal(false)} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={loading} className="bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2">
                {loading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : <><Send size={16} /> Send Request</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ ADD INVENTORY MODAL ══ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md flex flex-col border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Add Inventory</h2>
                <p className="text-xs text-gray-500 mt-1">Record stock already at fitting section</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Part Name</label>
                <div className="relative">
                  <input
                    type="text" value={partName} placeholder="Search or enter part name"
                    onFocus={() => setShowPartDropdown(true)}
                    onBlur={() => setTimeout(() => setShowPartDropdown(false), 150)}
                    onChange={(e) => { setPartName(e.target.value); setShowPartDropdown(true); }}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  {showPartDropdown && renderDropdown()}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">Quantity</label>
                <input
                  type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0" min="1"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-gray-900"
                />
              </div>
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Remark <span className="text-gray-400 font-normal text-xs">(optional)</span>
                </label>
                <input
                  type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
                  placeholder="e.g. Leftover from last batch"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-gray-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200">
              <button onClick={() => setShowAddModal(false)} className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200">
                Cancel
              </button>
              <button onClick={handleAddInventorySubmit} disabled={submitting} className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2">
                {submitting ? <><Loader2 size={16} className="animate-spin" /> Adding...</> : <><Plus size={16} /> Add to Inventory</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══ STAT CARD ══ */
const StatCard = ({ title, value, icon, subtitle, alert, onClick, active }) => {
  const getAlertStyles = () => {
    if (alert === "warning") return { border: "border-yellow-300 bg-yellow-50", borderLeft: "4px solid #fbbf24", valueColor: "text-yellow-700", hover: "hover:border-yellow-400" };
    if (alert === "info")    return { border: "border-blue-300 bg-blue-50",   borderLeft: "4px solid #3b82f6", valueColor: "text-blue-700",   hover: "hover:border-blue-400"   };
    return { border: "border-gray-200", borderLeft: "4px solid #c62d23", valueColor: "text-gray-900", hover: "hover:border-[#c62d23]" };
  };
  const styles = getAlertStyles();
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${styles.border} ${styles.hover} ${active ? "ring-2 ring-[#c62d23] ring-offset-2" : ""}`}
      style={{ borderLeft: styles.borderLeft }}
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-600 font-medium">{title}</p>
        {React.cloneElement(icon, { size: 24 })}
      </div>
      <p className={`text-3xl font-bold mb-1 ${styles.valueColor}`}>{value}</p>
      {subtitle && (
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <span>{subtitle}</span>
          {active && <span className="text-[#c62d23]">→</span>}
        </div>
      )}
    </div>
  );
};