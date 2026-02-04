"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Package, Send, Loader2, Box, Clock, CheckCircle2, Plus, X } from "lucide-react";
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
      <FittingSidebar />

      <div className="flex-1 p-8">
        {/* Page Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Package className="text-[#c62d23]" size={36} />
              Fitting Section - Inventory Management
            </h1>
            <p className="text-gray-600 mt-2">
              Request materials from warehouse and track your stock levels
            </p>
          </div>

          {/* Request Button */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-[#c62d23] hover:bg-[#a01f17] text-white px-6 py-3 rounded-lg flex items-center gap-2 font-semibold transition-colors shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            New Request
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Stock Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-[#c62d23] to-[#a01f17] text-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium mb-1">
                    Total Stock Quantity
                  </p>
                  <p className="text-4xl font-bold">{totalStock}</p>
                </div>
                <Box size={48} className="text-white/30" />
              </div>
            </div>

            <div className="bg-white border-2 border-gray-200 p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">
                    Unique Items
                  </p>
                  <p className="text-4xl font-bold text-gray-900">{totalItems}</p>
                </div>
                <Package size={48} className="text-gray-300" />
              </div>
            </div>
          </div>

          {/* ================= STOCK DETAILS ================= */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Box size={20} className="text-[#c62d23]" />
              Current Stock Levels
            </h2>

            {stock.length === 0 ? (
              <div className="text-center py-12">
                <Box size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No stock items found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {stock.map((item) => (
                  <div
                    key={item._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-[#c62d23] hover:shadow-md transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 flex-1 text-sm">
                        {item.partName}
                      </h3>
                      <span className="text-2xl font-bold text-[#c62d23] ml-2">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Box size={12} />
                      <span>units available</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ================= REQUEST HISTORY ================= */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock size={20} className="text-[#c62d23]" />
              Request History
            </h2>

            {requests.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={48} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No requests yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
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
            )}
          </div>

        </div>
      </div>

      {/* ================= REQUEST MODAL ================= */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative animate-scale-in">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>

            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Send className="text-[#c62d23]" size={28} />
                New Inventory Request
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Request materials from the warehouse
              </p>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Product / Part Name
                </label>
                <input
                  type="text"
                  value={partName}
                  onChange={(e) => setPartName(e.target.value)}
                  placeholder="Enter part name"
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-[#c62d23] hover:bg-[#a01f17] text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} />
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
      `}</style>
    </div>
  );
}