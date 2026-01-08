"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Wrench, CheckCircle, Package, Clock, TrendingUp } from "lucide-react";
import axios from "axios";


export default function Fitting() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState(null);

  /* ================= API ================= */
  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });

      // show only fitting stage orders
      const fittingOrders = (res.data.orders || res.data).filter((o) =>
        ["WAREHOUSE_COLLECTED", "FITTING_IN_PROGRESS", "FITTING_COMPLETED"].includes(
          o.progress
        )
      );

      setOrders(fittingOrders);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= UPDATE STATUS ================= */
  const updateProgress = async (id, progress) => {
    try {
      setProcessingId(id);

      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress },
        { headers }
      );

      fetchOrders();
    } catch (err) {
      alert("Failed to update fitting status");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= FILTER ================= */
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = search.toLowerCase();
      return (
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q)
      );
    });
  }, [orders, search]);

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const inProgress = filteredOrders.filter(o => o.progress === "FITTING_IN_PROGRESS").length;
  const completed = filteredOrders.filter(o => o.progress === "FITTING_COMPLETED").length;

  /* ================= STATUS BADGES ================= */
  const getWarehouseBadge = (progress) => {
    if (progress === "WAREHOUSE_COLLECTED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-900 text-emerald-300">
          Collected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-700 text-neutral-300">
        Processing
      </span>
    );
  };

  const getFittingBadge = (progress) => {
    if (progress === "FITTING_COMPLETED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
          Completed
        </span>
      );
    }
    if (progress === "FITTING_IN_PROGRESS") {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-900 text-amber-300">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-medium bg-neutral-700 text-neutral-300">
        Pending
      </span>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
     

      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Fitting / Assembly</h1>
            <p className="text-sm mb-5 text-neutral-400">
              Assemble products after warehouse material collection
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard 
              title="Total Orders" 
              value={totalOrders} 
              icon={<Package />} 
            />
            <StatCard
              title="In Progress"
              value={inProgress}
              icon={<Clock />}
              danger={inProgress > 0}
            />
            <StatCard
              title="Completed"
              value={completed}
              icon={<TrendingUp />}
            />
          </div>

          {/* SEARCH */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fitting orders..."
              className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
            />
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-neutral-400 py-10">
                No fitting orders available
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Order ID",
                      "Dispatch",
                      "Chair",
                      "Order Date",
                      "Quantity",
                      "Warehouse",
                      "Assembly",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-4 text-left text-xs text-neutral-400 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const isProcessing = processingId === order._id;

                    return (
                      <tr
                        key={order._id}
                        className="border-b border-neutral-700 hover:bg-neutral-850 transition"
                      >
                        <td className="p-4 font-medium">{order.orderId}</td>
                        <td className="p-4">{order.dispatchedTo}</td>
                        <td className="p-4">{order.chairModel}</td>
                        <td className="p-4">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">{order.quantity}</td>

                        {/* WAREHOUSE */}
                        <td className="p-4">
                          {getWarehouseBadge(order.progress)}
                        </td>

                        {/* FITTING */}
                        <td className="p-4">
                          {getFittingBadge(order.progress)}
                        </td>

                        {/* ACTION */}
                        <td className="p-4">
                          {order.progress === "WAREHOUSE_COLLECTED" && (
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                updateProgress(order._id, "FITTING_IN_PROGRESS")
                              }
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                            >
                              <Wrench size={16} />
                              {isProcessing ? "Processing..." : "Start Fitting"}
                            </button>
                          )}

                          {order.progress === "FITTING_IN_PROGRESS" && (
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                updateProgress(order._id, "FITTING_COMPLETED")
                              }
                              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-black text-sm disabled:opacity-50"
                            >
                              <CheckCircle size={16} />
                              {isProcessing ? "Processing..." : "Mark Completed"}
                            </button>
                          )}

                          {order.progress === "FITTING_COMPLETED" && (
                            <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                              <CheckCircle size={14} />
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* FOOT NOTE */}
          <div className="mt-4 text-xs text-neutral-500">
            * Orders move to dispatch after fitting completion.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon, danger }) => (
  <div
    className={`p-5 rounded-xl border ${
      danger
        ? "bg-amber-950/40 border-amber-800"
        : "bg-neutral-800 border-neutral-700"
    }`}
  >
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);