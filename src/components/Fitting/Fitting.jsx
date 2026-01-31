"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Wrench,
  CheckCircle,
  Package,
  Clock,
  TrendingUp,
  Search,
} from "lucide-react";
import axios from "axios";
import useAuthGuard from "@/hooks/useAuthGuard";
import FittingSidebar from "@/components/Fitting/sidebar";

export default function Fitting() {
  useAuthGuard(["fitting"]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      const fittingOrders = (res.data.orders || res.data).filter((o) =>
        [
          "WAREHOUSE_COLLECTED",
          "FITTING_IN_PROGRESS",
          "FITTING_COMPLETED",
        ].includes(o.progress),
      );
      setOrders(fittingOrders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= UPDATE ================= */
  const updateProgress = async (id, progress) => {
    try {
      setProcessingId(id);
      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress },
        { headers },
      );
      fetchOrders();
    } catch {
      alert("Failed to update fitting status");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter(
      (o) =>
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q),
    );
  }, [orders, search]);

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const inProgress = filteredOrders.filter(
    (o) => o.progress === "FITTING_IN_PROGRESS",
  ).length;
  const completed = filteredOrders.filter(
    (o) => o.progress === "FITTING_COMPLETED",
  ).length;

  /* ================= BADGES ================= */
  const getWarehouseBadge = (progress) => {
    if (progress === "WAREHOUSE_COLLECTED") {
      return (
        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
          Collected
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
        Processing
      </span>
    );
  };

  const getFittingBadge = (progress) => {
    if (progress === "FITTING_COMPLETED") {
      return (
        <span className="px-2 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
          Completed
        </span>
      );
    }
    if (progress === "FITTING_IN_PROGRESS") {
      return (
        <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
        Pending
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      <FittingSidebar />

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between pr-5">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench size={32} className="text-[#c62d23]" />
                <span>Fitting / Assembly</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Assemble products after warehouse material collection
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Orders"
              value={totalOrders}
              icon={<Package className="text-[#c62d23]" />}
            />
            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock className="text-[#c62d23]" />}
              danger={inProgress > 0}
            />
            <StatCard
              title="Completed"
              value={completed}
              icon={<TrendingUp className="text-[#c62d23]" />}
            />
          </div>

          {/* SEARCH */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fitting orders by Order ID, Client, or Chair Model..."
              className="w-full bg-white border border-gray-200 pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#c62d23] focus:border-transparent shadow-sm"
            />
          </div>

          {/* TABLE */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2">Loading...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Order ID",
                        "Client",
                        "Chair Model",
                        "Quantity",
                        "Warehouse Status",
                        "Fitting Status",
                        "Action",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-4 text-left font-semibold text-gray-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-8 text-center text-gray-500"
                        >
                          No fitting orders found
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((o, index) => (
                        <tr
                          key={o._id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4 font-medium text-gray-900">
                            {o.orderId}
                          </td>
                          <td className="p-4 text-gray-700">
                            {o.dispatchedTo?.name || "—"}
                          </td>
                          <td className="p-4 text-gray-900">{o.chairModel}</td>
                          <td className="p-4 font-semibold text-gray-900">
                            {o.quantity}
                          </td>
                          <td className="p-4">
                            {getWarehouseBadge(o.progress)}
                          </td>
                          <td className="p-4">{getFittingBadge(o.progress)}</td>
                          <td className="p-4">
                            {o.progress === "WAREHOUSE_COLLECTED" && (
                              <button
                                onClick={() =>
                                  updateProgress(o._id, "FITTING_IN_PROGRESS")
                                }
                                disabled={processingId === o._id}
                                className="bg-[#c62d23] hover:bg-[#a82419] text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingId === o._id
                                  ? "Processing..."
                                  : "Start Fitting"}
                              </button>
                            )}
                            {o.progress === "FITTING_IN_PROGRESS" && (
                              <button
                                onClick={() =>
                                  updateProgress(o._id, "FITTING_COMPLETED")
                                }
                                disabled={processingId === o._id}
                                className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {processingId === o._id
                                  ? "Processing..."
                                  : "Mark Complete"}
                              </button>
                            )}
                            {o.progress === "FITTING_COMPLETED" && (
                              <span className="flex items-center gap-1 text-green-600 font-medium">
                                <CheckCircle size={16} />
                                Done
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Orders automatically move to dispatch after
              fitting completion.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

const StatCard = ({ title, value, icon, danger }) => (
  <div
    className={`bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full ${
      danger ? "border-amber-300 bg-amber-50" : "border-gray-200"
    }`}
    style={{
      borderLeft: "4px solid #c62d23",
    }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);
