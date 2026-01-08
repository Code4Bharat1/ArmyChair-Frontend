"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, User, Wrench, CheckCircle } from "lucide-react";
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

  /* ================= STATUS UI ================= */
  const getWarehouseBadge = (progress) => {
    if (progress === "WAREHOUSE_COLLECTED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-emerald-600/20 text-emerald-400">
          Collected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-neutral-700 text-neutral-300">
        Processing
      </span>
    );
  };

  const getFittingBadge = (progress) => {
    if (progress === "FITTING_COMPLETED") {
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-emerald-600/20 text-emerald-400">
          Completed
        </span>
      );
    }
    if (progress === "FITTING_IN_PROGRESS") {
      return (
        <span className="px-3 py-1 rounded-full text-xs bg-amber-600/20 text-amber-400">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs bg-neutral-700 text-neutral-300">
        Pending
      </span>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">


      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search fitting orders..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-3 ml-4">
            <div className="w-9 h-9 bg-neutral-700 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-neutral-300" />
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-1">Fitting / Assembly</h1>
          <p className="text-sm text-neutral-400 mb-6">
            Assemble products after warehouse material collection
          </p>

          {/* TABLE */}
          {loading ? (
            <p>Loading...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="p-10 text-center text-neutral-400">
              No fitting orders available
            </div>
          ) : (
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-700">
                    <th className="p-4 text-xs text-neutral-400">Order ID</th>
                    <th className="p-4 text-xs text-neutral-400">Dispatch</th>
                    <th className="p-4 text-xs text-neutral-400">Chair</th>
                    <th className="p-4 text-xs text-neutral-400">Order Date</th>
                    <th className="p-4 text-xs text-neutral-400">Quantity</th>
                    <th className="p-4 text-xs text-neutral-400">Warehouse</th>
                    <th className="p-4 text-xs text-neutral-400">Assembly</th>
                    <th className="p-4 text-xs text-neutral-400">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((order) => {
                    const isProcessing = processingId === order._id;

                    return (
                      <tr
                        key={order._id}
                        className="border-b border-neutral-700 hover:bg-neutral-800/40"
                      >
                        <td className="p-4">{order.orderId}</td>
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
                              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-xs text-white"
                            >
                              <Wrench size={14} />
                              Start Fitting
                            </button>
                          )}

                          {order.progress === "FITTING_IN_PROGRESS" && (
                            <button
                              disabled={isProcessing}
                              onClick={() =>
                                updateProgress(order._id, "FITTING_COMPLETED")
                              }
                              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded-lg text-xs text-black"
                            >
                              <CheckCircle size={14} />
                              Mark Completed
                            </button>
                          )}

                          {order.progress === "FITTING_COMPLETED" && (
                            <span className="text-xs text-neutral-500">
                              Completed
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* FOOT NOTE */}
          <div className="mt-4 text-xs text-neutral-500">
            * Orders move to dispatch after fitting completion.
          </div>
        </div>
      </div>
    </div>
  );
}
