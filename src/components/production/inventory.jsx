"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Package, MapPin, Plus, X, Send, Loader2, Box, Clock, CheckCircle2, UserCircle, AlertTriangle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionStockPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [requests, setRequests] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [stockFilter, setStockFilter] = useState("all"); // all, low, overstock, normal

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = {
    Authorization: `Bearer ${token}`,
  };

  /* ================= FETCH REQUEST HISTORY ================= */
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/production/inward`, { headers });
      setRequests(res.data.data || []);
    } catch (err) {
      console.error("Fetch requests error", err);
    }
  };

  const handleSubmit = async () => {
    if (!partName || !quantity || quantity <= 0) {
      return alert("Please enter valid product and quantity");
    }

    try {
      setSubmitting(true);

      const user = JSON.parse(localStorage.getItem("user"));

      await axios.post(
        `${API}/production/inward`,
        {
          partName,
          quantity: Number(quantity),
          location: `PROD_${user.name}`,
        },
        { headers }
      );

      alert("Inventory request sent to Warehouse successfully");

      setPartName("");
      setQuantity("");
      setShowModal(false);

      fetchRequests();
    } catch (err) {
      alert(err.response?.data?.message || "Request failed");
    } finally {
      setSubmitting(false);
    }
  };

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "production") {
      router.push("/login");
    }
  }, [router]);

  /* ================= FETCH INVENTORY ================= */
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const res = await axios.get(`${API}/inventory`, { headers });
        setInventory(res.data.inventory || []);
      } catch (err) {
        console.error("Fetch inventory failed", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
    fetchRequests();
  }, []);

  /* ================= FILTER ONLY PROD LOCATIONS ================= */
  const productionStock = useMemo(() => {
    return inventory.filter((item) => item.location?.startsWith("PROD_"));
  }, [inventory]);

  /* ================= GROUP BY LOCATION + PART ================= */
  const grouped = useMemo(() => {
    const result = {};

    productionStock.forEach((item) => {
      const key = `${item.location}_${item.partName || item.chairType}`;

      if (!result[key]) {
        result[key] = {
          part: item.partName || item.chairType,
          location: item.location,
          quantity: 0,
        };
      }

      result[key].quantity += item.quantity;
    });

    return Object.values(result);
  }, [productionStock]);

  const totalStock = grouped.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = grouped.length;

  /* ================= STOCK LEVEL ALERTS ================= */
  const LOW_STOCK_THRESHOLD = 10;
  const OVERSTOCK_THRESHOLD = 100;

  const lowStockItems = useMemo(() => {
    return grouped.filter((item) => item.quantity > 0 && item.quantity <= LOW_STOCK_THRESHOLD);
  }, [grouped]);

  const overstockItems = useMemo(() => {
    return grouped.filter((item) => item.quantity >= OVERSTOCK_THRESHOLD);
  }, [grouped]);

  const getStockStatus = (quantity) => {
    if (quantity <= LOW_STOCK_THRESHOLD) return "low";
    if (quantity >= OVERSTOCK_THRESHOLD) return "overstock";
    return "normal";
  };

  /* ================= FILTERED STOCK ================= */
  const filteredStock = useMemo(() => {
    if (stockFilter === "all") return grouped;
    if (stockFilter === "low") return lowStockItems;
    if (stockFilter === "overstock") return overstockItems;
    if (stockFilter === "normal") {
      return grouped.filter(
        (item) => item.quantity > LOW_STOCK_THRESHOLD && item.quantity < OVERSTOCK_THRESHOLD
      );
    }
    return grouped;
  }, [grouped, stockFilter, lowStockItems, overstockItems]);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm">
          {/* Desktop Header */}
          <div className="hidden md:block p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  <Package size={32} className="text-[#c62d23]" />
                  <span>Production Stock</span>
                </h1>
                <p className="text-sm text-gray-600 mt-1">Manage inventory and request materials</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all"
                >
                  <Plus size={18} />
                  New Request
                </button>

                <button
                  onClick={() => router.push("/profile")}
                  title="My Profile"
                  className="text-gray-600 hover:text-[#c62d23] transition"
                >
                  <UserCircle size={34} />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden p-4">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package size={24} className="text-[#c62d23]" />
                <span>Stock</span>
              </h1>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-[#c62d23] hover:bg-[#a82419] text-white p-2 rounded-lg shadow-sm transition-all"
                >
                  <Plus size={20} />
                </button>
                <button
                  onClick={() => router.push("/profile")}
                  className="text-gray-600 hover:text-[#c62d23] transition p-2"
                >
                  <UserCircle size={28} />
                </button>
              </div>
            </div>
            
            {/* Mobile Stats Row */}
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

        {/* BODY */}
        <div className="p-8 space-y-8">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
              <p className="mt-2 text-gray-500">Loading stock...</p>
            </div>
          ) : (
            <>
              {/* STATS - Desktop Only */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard
                  title="Total Stock Quantity"
                  value={totalStock}
                  icon={<Box className="text-[#c62d23]" />}
                  subtitle="units in production"
                  onClick={() => setStockFilter("all")}
                  active={stockFilter === "all"}
                />

                <StatCard
                  title="Unique Items"
                  value={totalItems}
                  icon={<Package className="text-[#c62d23]" />}
                  subtitle="different parts"
                  onClick={() => setStockFilter("normal")}
                  active={stockFilter === "normal"}
                />

                <StatCard
                  title="Low Stock Alert"
                  value={lowStockItems.length}
                  icon={<AlertTriangle className="text-[#c62d23]" />}
                  subtitle="needs restocking"
                  alert={lowStockItems.length > 0 ? "warning" : null}
                  onClick={() => setStockFilter("low")}
                  active={stockFilter === "low"}
                />

                <StatCard
                  title="Overstock Alert"
                  value={overstockItems.length}
                  icon={<AlertCircle className="text-[#c62d23]" />}
                  subtitle="excess inventory"
                  alert={overstockItems.length > 0 ? "info" : null}
                  onClick={() => setStockFilter("overstock")}
                  active={stockFilter === "overstock"}
                />
              </div>

              {/* Mobile Filter Chips */}
              <div className="md:hidden flex gap-2 overflow-x-auto pb-2">
                <button
                  onClick={() => setStockFilter("all")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    stockFilter === "all"
                      ? "bg-[#c62d23] text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  All ({totalItems})
                </button>
                <button
                  onClick={() => setStockFilter("normal")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                    stockFilter === "normal"
                      ? "bg-[#c62d23] text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200"
                  }`}
                >
                  Normal ({grouped.filter((item) => item.quantity > LOW_STOCK_THRESHOLD && item.quantity < OVERSTOCK_THRESHOLD).length})
                </button>
                {lowStockItems.length > 0 && (
                  <button
                    onClick={() => setStockFilter("low")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1 ${
                      stockFilter === "low"
                        ? "bg-yellow-500 text-white shadow-sm"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}
                  >
                    <AlertTriangle size={14} />
                    Low ({lowStockItems.length})
                  </button>
                )}
                {overstockItems.length > 0 && (
                  <button
                    onClick={() => setStockFilter("overstock")}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all inline-flex items-center gap-1 ${
                      stockFilter === "overstock"
                        ? "bg-blue-500 text-white shadow-sm"
                        : "bg-blue-50 text-blue-700 border border-blue-200"
                    }`}
                  >
                    <AlertCircle size={14} />
                    Overstock ({overstockItems.length})
                  </button>
                )}
              </div>

              {/* ALERT BANNERS */}
              {stockFilter === "all" && lowStockItems.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-xl">
                  <div className="flex items-start">
                    <AlertTriangle className="text-yellow-600 mr-3 flex-shrink-0" size={20} />
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-yellow-800 mb-1">
                        Low Stock Alert - Immediate Restocking Required
                      </h3>
                      <p className="text-xs text-yellow-700 mb-2">
                        {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} running critically low (≤{LOW_STOCK_THRESHOLD} units)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {lowStockItems.slice(0, 5).map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300"
                          >
                            {item.part}: {item.quantity}
                          </span>
                        ))}
                        {lowStockItems.length > 5 && (
                          <span className="text-xs text-yellow-700 py-1">
                            +{lowStockItems.length - 5} more
                          </span>
                        )}
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
                      <h3 className="text-sm font-semibold text-blue-800 mb-1">
                        Overstock Alert - Excess Inventory Detected
                      </h3>
                      <p className="text-xs text-blue-700 mb-2">
                        {overstockItems.length} item{overstockItems.length !== 1 ? 's' : ''} with high stock levels (≥{OVERSTOCK_THRESHOLD} units)
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {overstockItems.slice(0, 5).map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300"
                          >
                            {item.part}: {item.quantity}
                          </span>
                        ))}
                        {overstockItems.length > 5 && (
                          <span className="text-xs text-blue-700 py-1">
                            +{overstockItems.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Active Filter Indicator */}
              {stockFilter !== "all" && (
                <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-gray-700">
                    Showing:{" "}
                    <span className="font-semibold">
                      {stockFilter === "low" && "Low Stock Items"}
                      {stockFilter === "overstock" && "Overstocked Items"}
                      {stockFilter === "normal" && "Normal Stock Items"}
                    </span>
                    {" "}({filteredStock.length})
                  </span>
                  <button
                    onClick={() => setStockFilter("all")}
                    className="text-xs text-[#c62d23] hover:underline font-semibold"
                  >
                    Clear Filter
                  </button>
                </div>
              )}

              {/* CURRENT STOCK LEVELS */}
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
                    <p className="text-sm text-gray-400 mt-1">
                      {stockFilter !== "all" ? "Try changing the filter" : "Stock items will appear here"}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 md:p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
                      {filteredStock.map((item, index) => {
                        const stockStatus = getStockStatus(item.quantity);
                        return (
                          <div
                            key={index}
                            className={`border rounded-xl p-3 md:p-4 transition-all ${
                              stockStatus === "low"
                                ? "border-yellow-300 bg-yellow-50 hover:border-yellow-400 hover:shadow-lg"
                                : stockStatus === "overstock"
                                ? "border-blue-300 bg-blue-50 hover:border-blue-400 hover:shadow-lg"
                                : "border-gray-200 hover:border-[#c62d23] hover:shadow-md"
                            }`}
                          >
                            {/* Alert Badge */}
                            {stockStatus !== "normal" && (
                              <div className="mb-2">
                                {stockStatus === "low" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-200 text-yellow-800 border border-yellow-400">
                                    <AlertTriangle size={10} />
                                    LOW
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-800 border border-blue-400">
                                    <AlertCircle size={10} />
                                    HIGH
                                  </span>
                                )}
                              </div>
                            )}

                            <div className="flex justify-between items-start mb-2 md:mb-3">
                              <h3 className="font-semibold text-gray-900 text-xs md:text-sm capitalize flex-1 pr-2 leading-tight">
                                {item.part}
                              </h3>
                              <span
                                className={`text-xl md:text-2xl font-bold ml-1 flex-shrink-0 ${
                                  stockStatus === "low"
                                    ? "text-yellow-600"
                                    : stockStatus === "overstock"
                                    ? "text-blue-600"
                                    : "text-[#c62d23]"
                                }`}
                              >
                                {item.quantity}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500 mb-1.5 md:mb-2">
                              <Box size={10} className="md:w-3 md:h-3 flex-shrink-0" />
                              <span>units</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-gray-500">
                              <MapPin size={10} className="md:w-3 md:h-3 flex-shrink-0 text-[#c62d23]" />
                              <span className="truncate font-medium">{item.location}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* REQUEST HISTORY - DESKTOP TABLE */}
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
                            <th key={h} className="p-4 text-left font-semibold text-gray-700">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>

                      <tbody>
                        {requests.map((r, index) => (
                          <tr
                            key={r._id}
                            className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-gray-50"
                            }`}
                          >
                            {/* Product Name */}
                            <td className="p-4 font-semibold text-gray-900 capitalize">{r.partName}</td>

                            {/* Quantity */}
                            <td className="p-4 font-bold text-[#c62d23]">{r.quantity}</td>

                            {/* Status */}
                            <td className="p-4">
                              {r.status === "PENDING" ? (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200 inline-flex items-center gap-1">
                                  <Clock size={12} />
                                  Pending
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200 inline-flex items-center gap-1">
                                  <CheckCircle2 size={12} />
                                  {r.status}
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="p-4 text-gray-600">
                              {new Date(r.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* REQUEST HISTORY - MOBILE CARDS */}
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
                      <div
                        key={r._id}
                        className="border border-gray-200 rounded-xl p-3 hover:border-[#c62d23] transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm capitalize flex-1 pr-2">
                            {r.partName}
                          </h3>
                          <span className="text-xl font-bold text-[#c62d23] ml-1 flex-shrink-0">
                            {r.quantity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-shrink-0">
                            {r.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                                <Clock size={10} />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                                <CheckCircle2 size={10} />
                                {r.status}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(r.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
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

      {/* ================= REQUEST MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between px-8 pt-8 pb-4 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">New Request</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 space-y-4">
              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Product / Part Name
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Enter part name"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
                />
              </div>

              <div>
                <label className="text-sm text-gray-700 font-semibold block mb-2">
                  Quantity Required
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-[#c62d23] focus:ring-2 focus:ring-[#c62d23]/20 transition-all text-gray-900"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200 bg-white">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl transition-all font-medium border border-gray-200"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="bg-[#c62d23] hover:bg-[#a82419] disabled:bg-gray-300 text-white px-6 py-2.5 rounded-xl transition-all font-semibold shadow-sm disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Send Request
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
const StatCard = ({ title, value, icon, subtitle, alert, onClick, active }) => {
  const getAlertStyles = () => {
    if (alert === "warning") {
      return {
        border: "border-yellow-300 bg-yellow-50",
        borderLeft: "4px solid #fbbf24",
        iconBg: "bg-yellow-100",
        valueColor: "text-yellow-700",
        hover: "hover:border-yellow-400"
      };
    }
    if (alert === "info") {
      return {
        border: "border-blue-300 bg-blue-50",
        borderLeft: "4px solid #3b82f6",
        iconBg: "bg-blue-100",
        valueColor: "text-blue-700",
        hover: "hover:border-blue-400"
      };
    }
    return {
      border: "border-gray-200",
      borderLeft: "4px solid #c62d23",
      iconBg: "",
      valueColor: "text-gray-900",
      hover: "hover:border-[#c62d23]"
    };
  };

  const styles = getAlertStyles();

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full cursor-pointer ${styles.border} ${styles.hover} ${
        active ? "ring-2 ring-[#c62d23] ring-offset-2" : ""
      }`}
      style={{
        borderLeft: styles.borderLeft,
      }}
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