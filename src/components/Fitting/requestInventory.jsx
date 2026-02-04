"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Package, Send, Loader2, Box, Clock, CheckCircle2, Plus, X, Menu } from "lucide-react";
import FittingSidebar from "./sidebar";

export default function FittingInventoryRequest() {
  const API = process.env.NEXT_PUBLIC_API_URL;

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const [partName, setPartName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [requests, setRequests] = useState([]);
  const [stock, setStock] = useState([]);

  /* ================= FETCH REQUEST HISTORY ================= */
  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/production/inward`, { headers });
      setRequests(res.data.data || []);
    } catch (err) {
      console.error("Fetch requests error", err);
    }
  };

  /* ================= FETCH FITTING STOCK ================= */
  const fetchStock = async () => {
    try {
      const res = await axios.get(
        `${API}/production/stock?location=FITTING_SECTION`,
        { headers }
      );
      setStock(res.data.data || []);
    } catch (err) {
      console.error("Fetch stock error", err);
    }
  };

  useEffect(() => {
    fetchRequests();
    fetchStock();
  }, []);

  /* ================= SEND REQUEST ================= */
  const handleSubmit = async () => {
    if (!partName || !quantity || quantity <= 0) {
      return alert("Please enter valid product and quantity");
    }

    try {
      setLoading(true);

      await axios.post(
        `${API}/production/inward`,
        {
          partName,
          quantity: Number(quantity),
          location: "FITTING_SECTION",
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

  const totalStock = stock.reduce((sum, item) => sum + item.quantity, 0);
  const totalItems = stock.length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, visible on desktop */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <FittingSidebar />
      </div>

      <div className="flex-1 w-full lg:w-auto">
        {/* Mobile Header Bar */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900 truncate">
            Inventory
          </h1>
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#c62d23] hover:bg-[#a01f17] text-white p-2 rounded-lg transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Main Content */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Desktop Page Header */}
          <div className="hidden lg:flex mb-6 lg:mb-8 items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <Package className="text-[#c62d23]" size={28} />
                <span className="hidden sm:inline">Fitting Section - Inventory Management</span>
                <span className="sm:hidden">Inventory</span>
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

          <div className="space-y-4 sm:space-y-6">
            {/* Stock Overview Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-[#c62d23] to-[#a01f17] text-white p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white/80 text-xs sm:text-sm font-medium mb-1">
                      Total Stock Quantity
                    </p>
                    <p className="text-3xl sm:text-4xl font-bold">{totalStock}</p>
                  </div>
                  <Box size={36} className="text-white/30 sm:w-12 sm:h-12" />
                </div>
              </div>

              <div className="bg-white border-2 border-gray-200 p-4 sm:p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-xs sm:text-sm font-medium mb-1">
                      Unique Items
                    </p>
                    <p className="text-3xl sm:text-4xl font-bold text-gray-900">{totalItems}</p>
                  </div>
                  <Package size={36} className="text-gray-300 sm:w-12 sm:h-12" />
                </div>
              </div>
            </div>

            {/* ================= STOCK DETAILS ================= */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Box size={18} className="text-[#c62d23] sm:w-5 sm:h-5" />
                Current Stock Levels
              </h2>

              {stock.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Box size={40} className="text-gray-300 mx-auto mb-3 sm:w-12 sm:h-12" />
                  <p className="text-sm sm:text-base text-gray-500">No stock items found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-3">
                  {stock.map((item) => (
                    <div
                      key={item._id}
                      className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:border-[#c62d23] hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-gray-900 flex-1 text-xs sm:text-sm leading-tight">
                          {item.partName}
                        </h3>
                        <span className="text-xl sm:text-2xl font-bold text-[#c62d23] ml-2">
                          {item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Box size={10} className="sm:w-3 sm:h-3" />
                        <span>units available</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ================= REQUEST HISTORY ================= */}
            <div className="bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 flex items-center gap-2">
                <Clock size={18} className="text-[#c62d23] sm:w-5 sm:h-5" />
                Request History
              </h2>

              {requests.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <Clock size={40} className="text-gray-300 mx-auto mb-3 sm:w-12 sm:h-12" />
                  <p className="text-sm sm:text-base text-gray-500">No requests yet</p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-gray-200">
                          <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">
                            Product
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">
                            Quantity
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">
                            Status
                          </th>
                          <th className="text-left py-3 px-2 text-sm font-semibold text-gray-700">
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
                            <td className="py-3 px-2 font-medium text-gray-900">
                              {r.partName}
                            </td>
                            <td className="py-3 px-2 text-gray-700">
                              <span className="font-semibold">{r.quantity}</span>
                            </td>
                            <td className="py-3 px-2">
                              {r.status === "PENDING" ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  <Clock size={12} />
                                  Pending
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  <CheckCircle2 size={12} />
                                  {r.status}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-sm text-gray-600">
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

                  {/* Mobile Card View */}
                  <div className="sm:hidden space-y-3">
                    {requests.map((r) => (
                      <div
                        key={r._id}
                        className="border border-gray-200 rounded-lg p-3 hover:border-[#c62d23] transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-gray-900 text-sm flex-1">
                            {r.partName}
                          </h3>
                          <span className="text-lg font-bold text-[#c62d23] ml-2">
                            {r.quantity}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            {r.status === "PENDING" ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                <Clock size={10} />
                                Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                <CheckCircle2 size={10} />
                                {r.status}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
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

      {/* ================= REQUEST MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
            </button>

            {/* Modal Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 pr-8">
                <Send className="text-[#c62d23]" size={24} />
                New Inventory Request
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Request materials from the warehouse
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product / Part Name
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Enter part name"
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Quantity Required
                </label>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                  min="1"
                  className="w-full border border-gray-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-6 border-t border-gray-200 flex gap-2 sm:gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#c62d23] hover:bg-[#a01f17] text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={16} />
                    <span className="hidden xs:inline">Sending...</span>
                    <span className="xs:hidden">...</span>
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
        
        /* Custom breakpoint for extra small devices */
        @media (min-width: 475px) {
          .xs\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .xs\:inline {
            display: inline;
          }
          .xs\:hidden {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}