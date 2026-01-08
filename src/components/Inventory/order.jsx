"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  PackageCheck,
  CheckCircle,
  Truck,
  Package,
  Clock,
  TrendingUp,
} from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";

export default function WarehouseOrders() {
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

      const warehouseOrders = (res.data.orders || res.data).filter((o) =>
        [
          "ORDER_PLACED",
          "WAREHOUSE_COLLECTED",
          "FITTING_IN_PROGRESS",
          "FITTING_COMPLETED",
          "READY_FOR_DISPATCH",
          "COMPLETED",
        ].includes(o.progress)
      );

      setOrders(warehouseOrders);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= COLLECT PARTS ================= */
  const handleCollectParts = async (id) => {
    if (!window.confirm("Confirm all parts collected from inventory?")) return;

    try {
      setProcessingId(id);

      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "WAREHOUSE_COLLECTED" },
        { headers }
      );

      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to collect parts");
    } finally {
      setProcessingId(null);
    }
  };
  /* ================= COLLECT PARTS ================= */
  const fittingStarted = async (id) => {
    if (!window.confirm("Confirm all parts collected from inventory?")) return;

    try {
      setProcessingId(id);

      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "FITTING_IN_PROGRESS" },
        { headers }
      );

      fetchOrders();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to collect parts");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= MARK READY ================= */
  const handleMarkReady = async (id) => {
    try {
      setProcessingId(id);

      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "READY_FOR_DISPATCH" },
        { headers }
      );

      fetchOrders();
    } catch (err) {
      alert("Failed to mark ready");
    } finally {
      setProcessingId(null);
    }
  };

  /* ================= DISPATCH ================= */
  const handleDispatch = async (id) => {
    if (!window.confirm("Confirm dispatch of this order?")) return;

    try {
      setProcessingId(id);

      await axios.patch(
        `${API}/orders/${id}/progress`,
        { progress: "DISPATCHED" },
        { headers }
      );

      fetchOrders();
    } catch (err) {
      alert("Failed to dispatch order");
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
  const pendingCollection = filteredOrders.filter(o => o.progress === "ORDER_PLACED").length;
  const readyForDispatch = filteredOrders.filter(o => o.progress === "READY_FOR_DISPATCH").length;

  /* ================= STATUS BADGE ================= */
  const getStatusBadge = (progress) => {
    const statusMap = {
      ORDER_PLACED: { label: "Pending Collection", color: "bg-amber-900 text-amber-300" },
      WAREHOUSE_COLLECTED: { label: "Sent to Fitting", color: "bg-blue-900 text-blue-300" },
      FITTING_IN_PROGRESS: { label: "Fitting Started", color: "bg-blue-900 text-blue-300" },

      FITTING_COMPLETED: { label: "Returned from Fitting", color: "bg-emerald-900 text-emerald-300" },
      READY_FOR_DISPATCH: { label: "Ready for Dispatch", color: "bg-green-900 text-green-300" },
      COMPLETED: { label: "Completed", color: "bg-green-900 text-green-300" },
    };

    const status = statusMap[progress] || { label: "Processing", color: "bg-neutral-700 text-neutral-300" };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${status.color}`}>
        {status.label}
      </span>
    );
  };

  /* ================= ACTION BUTTON ================= */
  const renderAction = (o) => {
    const isLoading = processingId === o._id;

    if (o.progress === "ORDER_PLACED") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleCollectParts(o._id)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-black text-sm disabled:opacity-50"
        >
          <PackageCheck size={16} />
          {isLoading ? "Processing..." : "Collect Parts"}
        </button>
      );
    }

    if (o.progress === "FITTING_IN_PROGRESS") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleMarkReady(o._id)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Mark Ready"}
        </button>
      );
    }
    if (o.progress === "FITTING_COMPLETED") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleMarkReady(o._id)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {isLoading ? "Processing..." : "Mark Ready"}
        </button>
      );
    }

    if (o.progress === "READY_FOR_DISPATCH") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleDispatch(o._id)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-black text-sm disabled:opacity-50"
        >
          <Truck size={16} />
          {isLoading ? "Processing..." : "Dispatch"}
        </button>
      );
    }

    if (o.progress === "COMPLETED") {
      return (
        <span className="inline-flex items-center gap-1 text-green-400 text-sm">
          <CheckCircle size={14} />
          Completed
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-neutral-400 text-sm">
        <CheckCircle size={14} />
        In Progress
      </span>
    );
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <InventorySidebar />

      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Warehouse Orders</h1>
            <p className="text-sm mb-5 text-neutral-400">
              Incoming sales & returned fitting orders
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
              title="Pending Collection"
              value={pendingCollection}
              icon={<Clock />}
              danger={pendingCollection > 0}
            />
            <StatCard
              title="Ready for Dispatch"
              value={readyForDispatch}
              icon={<TrendingUp />}
            />
          </div>

          {/* SEARCH */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders..."
              className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
            />
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-neutral-400 py-10">
                No warehouse orders available
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-neutral-850 border-b border-neutral-700">
                  <tr>
                    {[
                      "Order ID",
                      "Dispatched To",
                      "Chair",
                      "Order Date",
                      "Qty",
                      "Status",
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
                  {filteredOrders.map((o) => (
                    <tr
                      key={o._id}
                      className="border-b border-neutral-700 hover:bg-neutral-850 transition"
                    >
                      <td className="p-4 font-medium">{o.orderId}</td>
                      <td className="p-4">{o.dispatchedTo}</td>
                      <td className="p-4">{o.chairModel}</td>
                      <td className="p-4">
                        {new Date(o.orderDate).toLocaleDateString()}
                      </td>
                      <td className="p-4">{o.quantity}</td>
                      <td className="p-4">{getStatusBadge(o.progress)}</td>
                      <td className="p-4">{renderAction(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
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