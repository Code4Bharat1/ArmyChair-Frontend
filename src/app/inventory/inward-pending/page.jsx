"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FileCheck, Package, Clock, AlertCircle, Menu, UserCircle } from "lucide-react";
import InventorySidebar from "@/components/Inventory/sidebar";

export default function WarehousePendingInwardPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ================= MOUNT ================= */
  useEffect(() => {
    setMounted(true);
  }, []);

  /* ================= AUTH CHECK ================= */
  useEffect(() => {
    if (!mounted) return;

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role !== "warehouse") {
      router.push("/login");
    }
  }, [mounted, router]);

  /* ================= FETCH PENDING ================= */
  const fetchPending = async () => {
    try {
      const token = localStorage.getItem("token");

      if (!API) throw new Error("API URL missing");
      if (!token) throw new Error("Token missing");

      const res = await axios.get(
        `${API}/warehouse/production/inward/pending`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setData(res.data?.data || []);
    } catch (err) {
      console.error("Fetch pending failed:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  /* ================= FETCH ONCE AFTER MOUNT ================= */
  useEffect(() => {
    if (!mounted) return;
    fetchPending();
  }, [mounted]);

  /* ================= ACCEPT ================= */
  const acceptInward = async (id) => {
    if (!confirm("Accept this inward stock?")) return;

    try {
      setProcessingId(id);

      await axios.put(
        `${API}/warehouse/production/inward/${id}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      alert("Stock accepted and inventory updated");
      fetchPending();
    } catch (err) {
      alert(err.response?.data?.message || "Accept failed");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= DATE FORMAT ================= */
  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-GB");
  };

  /* ================= STATS ================= */
  const totalPending = data.length;
  const totalQuantity = data.reduce((sum, i) => sum + (i.quantity || 0), 0);

  /* ================= UI ================= */
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <InventorySidebar />
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto w-full">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-3 sm:p-4 md:p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden text-gray-600 hover:text-[#c62d23] transition p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              >
                <Menu size={24} />
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 truncate">
                  <FileCheck size={20} className="text-[#c62d23] sm:w-6 sm:h-6 md:w-8 md:h-8 flex-shrink-0" />
                  <span className="truncate">Pending Production Inward</span>
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 hidden sm:block">
                  Review and accept incoming stock from production
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push("/profile")}
              title="My Profile"
              className="text-gray-600 hover:text-[#c62d23] transition p-1 sm:p-0 flex-shrink-0"
            >
              <UserCircle size={28} className="sm:w-8 sm:h-8 md:w-9 md:h-9" />
            </button>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-6 md:space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            <StatCard
              title="Pending Approvals"
              value={totalPending}
              icon={<Clock className="text-[#c62d23]" />}
            />
            <StatCard
              title="Total Quantity"
              value={totalQuantity}
              icon={<Package className="text-[#c62d23]" />}
            />
          </div>

          {/* ALERT */}
          {totalPending > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 sm:p-4 flex gap-2 sm:gap-3 rounded-lg sm:rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
              <div className="flex-1">
                <span className="text-xs sm:text-sm text-amber-800 font-medium">
                  You have {totalPending} pending inward approval{totalPending !== 1 ? 's' : ''} waiting for review
                </span>
              </div>
            </div>
          )}

          {/* TABLE - Desktop */}
          <div className="hidden md:block bg-white rounded-xl lg:rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-6 sm:p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm sm:text-base">Loading...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center text-gray-500 py-12 sm:py-16">
                <FileCheck size={40} className="mx-auto mb-3 sm:mb-4 text-gray-300 sm:w-12 sm:h-12" />
                <p className="text-base sm:text-lg font-medium">No pending inward approvals</p>
                <p className="text-sm text-gray-400 mt-1">All caught up!</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["Date", "Material", "Quantity", "Created By", "Action"].map(
                        (h) => (
                          <th
                            key={h}
                            className="p-3 lg:p-4 text-left font-semibold text-gray-700 text-xs lg:text-sm"
                          >
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {data.map((i, index) => (
                      <tr
                        key={i._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                      >
                        <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">
                          <div className="flex items-center gap-2">
                            <Clock size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                            {formatDate(i.createdAt)}
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 font-medium text-gray-900 text-xs lg:text-sm">
                          <div className="flex items-center gap-2">
                            <Package size={14} className="text-gray-400 lg:w-4 lg:h-4" />
                            {i.partName}
                          </div>
                        </td>
                        <td className="p-3 lg:p-4 font-semibold text-gray-900 text-xs lg:text-sm">{i.quantity}</td>
                        <td className="p-3 lg:p-4 text-gray-700 text-xs lg:text-sm">{i.createdBy?.name || "-"}</td>
                        <td className="p-3 lg:p-4">
                          <button
                            disabled={processingId === i._id}
                            onClick={() => acceptInward(i._id)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all shadow-sm ${
                              processingId === i._id
                                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                : "bg-green-600 hover:bg-green-700 text-white hover:shadow-md"
                            }`}
                          >
                            {processingId === i._id ? "Processing..." : "Accept"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARDS - Mobile/Tablet */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500 text-sm">Loading...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center text-gray-500 border border-gray-200">
                <FileCheck size={40} className="mx-auto mb-3 text-gray-300" />
                <p className="text-base font-medium">No pending inward approvals</p>
                <p className="text-sm text-gray-400 mt-1">All caught up!</p>
              </div>
            ) : (
              data.map((i) => (
                <div key={i._id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Package size={14} className="text-gray-400 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                          {i.partName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                        <Clock size={12} className="text-gray-400 flex-shrink-0" />
                        {formatDate(i.createdAt)}
                      </div>
                      <div className="text-xs text-gray-600">
                        By: {i.createdBy?.name || "-"}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      <div className="bg-[#c62d23] text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        Qty: {i.quantity}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100">
                    <button
                      disabled={processingId === i._id}
                      onClick={() => acceptInward(i._id)}
                      className={`w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm ${
                        processingId === i._id
                          ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700 text-white hover:shadow-md"
                      }`}
                    >
                      {processingId === i._id ? "Processing..." : "Accept Inward Stock"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
const StatCard = ({ title, value, icon }) => (
  <div
    className="bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200"
    style={{
      borderLeft: '4px solid #c62d23'
    }}
  >
    <div className="flex justify-between items-start mb-3 sm:mb-4">
      <p className="text-xs sm:text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 20, className: `sm:w-6 sm:h-6 ${icon.props.className}` })}
    </div>
    <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</p>
  </div>
);