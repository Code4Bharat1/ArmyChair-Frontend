"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FileCheck, Package, Clock, AlertCircle } from "lucide-react";
import InventorySidebar from "@/components/Inventory/sidebar";

export default function WarehousePendingInwardPage() {
  const router = useRouter();
  const API = process.env.NEXT_PUBLIC_API_URL;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [mounted, setMounted] = useState(false);

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
      {/* SIDEBAR */}
      <InventorySidebar />

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <FileCheck size={32} className="text-[#c62d23]" />
              <span>Pending Production Inward</span>
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Review and accept incoming stock from production
            </p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            <div className="bg-amber-50 border border-amber-200 p-4 flex gap-3 rounded-xl">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={20} />
              <div className="flex-1">
                <span className="text-sm text-amber-800 font-medium">
                  You have {totalPending} pending inward approval{totalPending !== 1 ? 's' : ''} waiting for review
                </span>
              </div>
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading...</p>
              </div>
            ) : data.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <FileCheck size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No pending inward approvals</p>
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
                            className="p-4 text-left font-semibold text-gray-700"
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
                        <td className="p-4 text-gray-700">
                          <div className="flex items-center gap-2">
                            <Clock size={16} className="text-gray-400" />
                            {formatDate(i.createdAt)}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            <Package size={16} className="text-gray-400" />
                            {i.partName}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-gray-900">{i.quantity}</td>
                        <td className="p-4 text-gray-700">{i.createdBy?.name || "-"}</td>
                        <td className="p-4">
                          <button
                            disabled={processingId === i._id}
                            onClick={() => acceptInward(i._id)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
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
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD COMPONENT ================= */
const StatCard = ({ title, value, icon }) => (
  <div
    className="bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200"
    style={{
      borderLeft: '4px solid #c62d23'
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);