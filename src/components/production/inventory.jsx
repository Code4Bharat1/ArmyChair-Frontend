"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Package, MapPin, Plus, X, Send, Loader2, Box, Clock, CheckCircle2, Menu } from "lucide-react";
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
  // const [sidebarOpen, setSidebarOpen] = useState(false);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

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
      setLoading(true);

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
      setLoading(false);
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

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {/* {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )} */}

      <div className="min-h-screen bg-gray-50">
        {/* Mobile Header Bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-3 xs:px-4 py-3 flex items-center justify-between shadow-sm">
          {/* <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 xs:p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu size={20} className="xs:w-6 xs:h-6 text-gray-700" />
          </button> */}
          <h1 className="text-base xs:text-lg font-bold text-gray-900 truncate px-2">
            Production Stock
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#c62d23] hover:bg-[#a01f17] text-white p-1.5 xs:p-2 rounded-lg transition-colors flex-shrink-0"
          >
            <Plus size={18} className="xs:w-5 xs:h-5" />
          </button>
        </div>

        {/* Main Content */}
        <div className="w-full">
          <div className="p-3 xs:p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            {/* Desktop Page Header */}
            <div className="hidden lg:flex mb-6 lg:mb-8 items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <Package className="text-[#c62d23]" size={24} />
                  <span className="hidden md:inline">Production Stock Management</span>
                  <span className="md:hidden">Production Stock</span>
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">
                  Request materials from warehouse and track stock
                </p>
              </div>

              {/* Desktop Request Button */}
              <button
                onClick={() => setShowModal(true)}
                className="bg-[#c62d23] hover:bg-[#a01f17] text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg flex items-center gap-2 font-semibold transition-colors shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap"
              >
                <Plus size={18} />
                New Request
              </button>
            </div>

            <div className="space-y-3 xs:space-y-4 sm:space-y-6">
              {/* Stock Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4">
                <div className="bg-gradient-to-br from-[#c62d23] to-[#a01f17] text-white p-4 xs:p-5 sm:p-6 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">
                        Total Stock Quantity
                      </p>
                      <p className="text-2xl xs:text-3xl sm:text-4xl font-bold">{totalStock}</p>
                    </div>
                    <Box size={28} className="xs:w-9 xs:h-9 sm:w-12 sm:h-12 text-white/30" />
                  </div>
                </div>

                <div className="bg-white border-2 border-gray-200 p-4 xs:p-5 sm:p-6 rounded-xl shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">
                        Unique Items
                      </p>
                      <p className="text-2xl xs:text-3xl sm:text-4xl font-bold text-gray-900">{totalItems}</p>
                    </div>
                    <Package size={28} className="xs:w-9 xs:h-9 sm:w-12 sm:h-12 text-gray-300" />
                  </div>
                </div>
              </div>

              {/* ================= STOCK DETAILS ================= */}
              <div className="bg-white p-3 xs:p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-base xs:text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <Box size={16} className="xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5 text-[#c62d23]" />
                  Current Stock Levels
                </h2>

                {loading ? (
                  <div className="text-center py-8 sm:py-12">
                    <Loader2 size={32} className="xs:w-10 xs:h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 animate-spin" />
                    <p className="text-sm sm:text-base text-gray-500">Loading stock...</p>
                  </div>
                ) : grouped.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Box size={32} className="xs:w-10 xs:h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm sm:text-base text-gray-500">No stock items found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 xs:gap-2.5 sm:gap-3">
                    {grouped.map((item, index) => (
                      <div
                        key={index}
                        className="border border-gray-200 rounded-lg p-2.5 xs:p-3 sm:p-4 hover:border-[#c62d23] hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 flex-1 text-xs xs:text-sm leading-tight break-words pr-1">
                            {item.part}
                          </h3>
                          <span className="text-lg xs:text-xl sm:text-2xl font-bold text-[#c62d23] ml-1 flex-shrink-0">
                            {item.quantity}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] xs:text-xs text-gray-500 mb-1">
                          <Box size={10} className="xs:w-3 xs:h-3 flex-shrink-0" />
                          <span>units available</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] xs:text-xs text-gray-500">
                          <MapPin size={10} className="xs:w-3 xs:h-3 flex-shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ================= REQUEST HISTORY ================= */}
              <div className="bg-white p-3 xs:p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-base xs:text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                  <Clock size={16} className="xs:w-[18px] xs:h-[18px] sm:w-5 sm:h-5 text-[#c62d23]" />
                  Request History
                </h2>

                {requests.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <Clock size={32} className="xs:w-10 xs:h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm sm:text-base text-gray-500">No requests yet</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden sm:block overflow-x-auto">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b-2 border-gray-200">
                              <th className="text-left py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                                Product
                              </th>
                              <th className="text-left py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                                Quantity
                              </th>
                              <th className="text-left py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                                Status
                              </th>
                              <th className="text-left py-3 px-2 sm:px-3 text-xs sm:text-sm font-semibold text-gray-700 whitespace-nowrap">
                                Date
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {requests.map((r) => (
                              <tr
                                key={r._id}
                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                              >
                                <td className="py-3 px-2 sm:px-3 font-medium text-gray-900 text-xs sm:text-sm">
                                  {r.partName}
                                </td>
                                <td className="py-3 px-2 sm:px-3 text-gray-700 text-xs sm:text-sm">
                                  <span className="font-semibold">{r.quantity}</span>
                                </td>
                                <td className="py-3 px-2 sm:px-3">
                                  {r.status === "PENDING" ? (
                                    <span className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1 rounded-full text-[10px] xs:text-xs font-semibold bg-yellow-100 text-yellow-800 whitespace-nowrap">
                                      <Clock size={10} className="xs:w-3 xs:h-3" />
                                      Pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-3 py-1 rounded-full text-[10px] xs:text-xs font-semibold bg-green-100 text-green-800 whitespace-nowrap">
                                      <CheckCircle2 size={10} className="xs:w-3 xs:h-3" />
                                      {r.status}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 sm:px-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">
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
                    </div>

                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-2.5 xs:space-y-3">
                      {requests.map((r) => (
                        <div
                          key={r._id}
                          className="border border-gray-200 rounded-lg p-2.5 xs:p-3 hover:border-[#c62d23] transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-gray-900 text-xs xs:text-sm flex-1 break-words pr-2">
                              {r.partName}
                            </h3>
                            <span className="text-base xs:text-lg font-bold text-[#c62d23] ml-1 flex-shrink-0">
                              {r.quantity}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-shrink-0">
                              {r.status === "PENDING" ? (
                                <span className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 py-0.5 xs:py-1 rounded-full text-[10px] xs:text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  <Clock size={10} />
                                  Pending
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 xs:gap-1.5 px-2 xs:px-2.5 py-0.5 xs:py-1 rounded-full text-[10px] xs:text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle2 size={10} />
                                  {r.status}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] xs:text-xs text-gray-500 flex-shrink-0">
                              {new Date(r.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= REQUEST MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 xs:p-4">
          <div className="bg-white rounded-xl xs:rounded-2xl shadow-2xl w-full max-w-md relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-2.5 top-2.5 xs:right-3 xs:top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-1"
            >
              <X size={18} className="xs:w-5 xs:h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Modal Header */}
            <div className="p-3.5 xs:p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 xs:gap-2.5 sm:gap-3 pr-8">
                <Send className="text-[#c62d23]" size={20} />
                <span className="leading-tight">New Inventory Request</span>
              </h2>
              <p className="text-[10px] xs:text-xs sm:text-sm text-gray-600 mt-1">
                Request materials from the warehouse
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 xs:p-4 sm:p-6 space-y-3.5 xs:space-y-4">
              <div>
                <label className="block text-xs xs:text-sm font-semibold text-gray-700 mb-1.5 xs:mb-2">
                  Product / Part Name
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Enter part name"
                  className="w-full border border-gray-300 rounded-lg px-3 xs:px-3.5 sm:px-4 py-2 xs:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs xs:text-sm font-semibold text-gray-700 mb-1.5 xs:mb-2">
                  Quantity Required
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 xs:px-3.5 sm:px-4 py-2 xs:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent transition-shadow"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 xs:p-4 sm:p-6 border-t border-gray-200 flex gap-2 xs:gap-2.5 sm:gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-3 xs:px-3.5 sm:px-4 py-2 xs:py-2.5 border border-gray-300 text-gray-700 rounded-lg text-xs xs:text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#c62d23] hover:bg-[#a01f17] text-white px-3 xs:px-3.5 sm:px-4 py-2 xs:py-2.5 rounded-lg flex items-center justify-center gap-1.5 xs:gap-2 text-xs xs:text-sm sm:text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={14} />
                    <span className="hidden xs:inline">Sending...</span>
                    <span className="xs:hidden">...</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span className="hidden xs:inline">Send Request</span>
                    <span className="xs:hidden">Send</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add animation styles */}
      <style jsx>{`
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
        
        /* Custom breakpoint for extra small devices (475px) */
        @media (min-width: 475px) {
          .xs\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .xs\\:inline {
            display: inline;
          }
          .xs\\:hidden {
            display: none;
          }
          .xs\\:w-3 {
            width: 0.75rem;
          }
          .xs\\:h-3 {
            height: 0.75rem;
          }
          .xs\\:w-5 {
            width: 1.25rem;
          }
          .xs\\:h-5 {
            height: 1.25rem;
          }
          .xs\\:w-6 {
            width: 1.5rem;
          }
          .xs\\:h-6 {
            height: 1.5rem;
          }
          .xs\\:w-9 {
            width: 2.25rem;
          }
          .xs\\:h-9 {
            height: 2.25rem;
          }
          .xs\\:w-10 {
            width: 2.5rem;
          }
          .xs\\:h-10 {
            height: 2.5rem;
          }
          .xs\\:w-\\[18px\\] {
            width: 18px;
          }
          .xs\\:h-\\[18px\\] {
            height: 18px;
          }
          .xs\\:text-xs {
            font-size: 0.75rem;
            line-height: 1rem;
          }
          .xs\\:text-sm {
            font-size: 0.875rem;
            line-height: 1.25rem;
          }
          .xs\\:text-lg {
            font-size: 1.125rem;
            line-height: 1.75rem;
          }
          .xs\\:text-xl {
            font-size: 1.25rem;
            line-height: 1.75rem;
          }
          .xs\\:text-3xl {
            font-size: 1.875rem;
            line-height: 2.25rem;
          }
          .xs\\:p-2 {
            padding: 0.5rem;
          }
          .xs\\:p-3 {
            padding: 0.75rem;
          }
          .xs\\:p-4 {
            padding: 1rem;
          }
          .xs\\:p-5 {
            padding: 1.25rem;
          }
          .xs\\:px-2.5 {
            padding-left: 0.625rem;
            padding-right: 0.625rem;
          }
          .xs\\:px-3 {
            padding-left: 0.75rem;
            padding-right: 0.75rem;
          }
          .xs\\:px-3.5 {
            padding-left: 0.875rem;
            padding-right: 0.875rem;
          }
          .xs\\:px-4 {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          .xs\\:py-1 {
            padding-top: 0.25rem;
            padding-bottom: 0.25rem;
          }
          .xs\\:py-2.5 {
            padding-top: 0.625rem;
            padding-bottom: 0.625rem;
          }
          .xs\\:gap-1.5 {
            gap: 0.375rem;
          }
          .xs\\:gap-2 {
            gap: 0.5rem;
          }
          .xs\\:gap-2.5 {
            gap: 0.625rem;
          }
          .xs\\:gap-3 {
            gap: 0.75rem;
          }
          .xs\\:gap-4 {
            gap: 1rem;
          }
          .xs\\:space-y-3 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 0.75rem;
          }
          .xs\\:space-y-4 > :not([hidden]) ~ :not([hidden]) {
            margin-top: 1rem;
          }
          .xs\\:mb-2 {
            margin-bottom: 0.5rem;
          }
          .xs\\:right-3 {
            right: 0.75rem;
          }
          .xs\\:top-3 {
            top: 0.75rem;
          }
        }
      `}</style>
    </>
  );
}