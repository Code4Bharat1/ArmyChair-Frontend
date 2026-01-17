"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Wrench, CheckCircle, Package, Clock, TrendingUp } from "lucide-react";
import axios from "axios";
import FittingSidebar from "@/components/Fitting/sidebar";

export default function Fitting() {
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
        ["WAREHOUSE_COLLECTED", "FITTING_IN_PROGRESS", "FITTING_COMPLETED"].includes(
          o.progress
        )
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
      await axios.patch(`${API}/orders/${id}/progress`, { progress }, { headers });
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
        o.chairModel?.toLowerCase().includes(q)
    );
  }, [orders, search]);

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const inProgress = filteredOrders.filter(
    (o) => o.progress === "FITTING_IN_PROGRESS"
  ).length;
  const completed = filteredOrders.filter(
    (o) => o.progress === "FITTING_COMPLETED"
  ).length;

  /* ================= BADGES ================= */
  const getWarehouseBadge = (progress) => {
    if (progress === "WAREHOUSE_COLLECTED") {
      return (
        <span className="px-3 py-1 bg-emerald-900 text-emerald-300 rounded-full text-xs">
          Collected
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-neutral-700 text-neutral-300 rounded-full text-xs">
        Processing
      </span>
    );
  };

  const getFittingBadge = (progress) => {
    if (progress === "FITTING_COMPLETED") {
      return (
        <span className="px-3 py-1 bg-green-900 text-green-300 rounded-full text-xs">
          Completed
        </span>
      );
    }
    if (progress === "FITTING_IN_PROGRESS") {
      return (
        <span className="px-3 py-1 bg-amber-900 text-amber-300 rounded-full text-xs">
          In Progress
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-neutral-700 text-neutral-300 rounded-full text-xs">
        Pending
      </span>
    );
  };

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">


      <FittingSidebar />

      <div className="flex-1 overflow-auto">
        <div className="bg-neutral-800 border-b border-neutral-700 p-4">
          <h1 className="text-2xl font-bold">Fitting / Assembly</h1>
          <p className="text-sm text-neutral-400">
            Assemble products after warehouse material collection
          </p>
        </div>

        <div className="p-6">
          {/* STATS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard title="Total Orders" value={totalOrders} icon={<Package />} />
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
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search fitting orders..."
            className="w-full mb-4 bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg"
          />

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-x-auto">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : (
              <table className="w-full min-w-[900px]">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Order",
                      "Dispatch",
                      "Chair",
                      "Qty",
                      "Warehouse",
                      "Fitting",
                      "Action",
                    ].map((h) => (
                      <th key={h} className="p-4 text-xs text-neutral-400 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o._id} className="border-b border-neutral-700">
                      <td className="p-4">{o.orderId}</td>
                      <td className="p-4">{o.dispatchedTo?.name}</td>
                      <td className="p-4">{o.chairModel}</td>
                      <td className="p-4">{o.quantity}</td>
                      <td className="p-4">{getWarehouseBadge(o.progress)}</td>
                      <td className="p-4">{getFittingBadge(o.progress)}</td>
                      <td className="p-4">
                        {o.progress === "WAREHOUSE_COLLECTED" && (
                          <button
                            onClick={() =>
                              updateProgress(o._id, "FITTING_IN_PROGRESS")
                            }
                            className="bg-blue-600 px-3 py-2 rounded"
                          >
                            Start
                          </button>
                        )}
                        {o.progress === "FITTING_IN_PROGRESS" && (
                          <button
                            onClick={() =>
                              updateProgress(o._id, "FITTING_COMPLETED")
                            }
                            className="bg-amber-600 px-3 py-2 rounded"
                          >
                            Complete
                          </button>
                        )}
                        {o.progress === "FITTING_COMPLETED" && (
                          <span className="text-green-400">✔ Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 text-xs text-neutral-500">
            * Orders move to dispatch after fitting completion.
          </div>
        </div>
      </div>
    </div>
  );
}

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
      {icon}
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);
