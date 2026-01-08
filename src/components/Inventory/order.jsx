"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  PackageCheck,
  CheckCircle,
  Truck,
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

      // 🔥 Warehouse handles both incoming & dispatch
      const warehouseOrders = (res.data.orders || res.data).filter((o) =>
        [
          "ORDER_PLACED",
          "WAREHOUSE_COLLECTED",
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

  /* ================= STATUS LABEL ================= */
  const getStatusLabel = (progress) => {
    switch (progress) {
      case "ORDER_PLACED":
        return <span className="text-amber-400">Pending Collection</span>;
      case "WAREHOUSE_COLLECTED":
        return <span className="text-blue-400">Sent to Fitting</span>;
      case "FITTING_COMPLETED":
        return <span className="text-emerald-400">Returned from Fitting</span>;
      case "READY_FOR_DISPATCH":
        return <span className="text-emerald-500">Ready for Dispatch</span>;
        case "COMPLETED":
        return <span className="text-emerald-500">Completed</span>;
      default:
        return <span className="text-neutral-400">Processing</span>;
    }
  };

  /* ================= ACTION BUTTON ================= */
  const renderAction = (o) => {
    const isLoading = processingId === o._id;

    if (o.progress === "ORDER_PLACED") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleCollectParts(o._id)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-black text-sm"
        >
          <PackageCheck size={16} />
          {isLoading ? "Processing..." : "Collect Parts"}
        </button>
      );
    }

    if (o.progress === "FITTING_COMPLETED") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleMarkReady(o._id)}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs"
        >
          Mark Ready
        </button>
      );
    }

    if (o.progress === "READY_FOR_DISPATCH") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleDispatch(o._id)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-black text-sm"
        >
          <Truck size={16} />
          Dispatch
        </button>
      );
    }
        if (o.progress === "COMPLETED") {
      return (
        <button
          disabled={isLoading}
          onClick={() => handleDispatch(o._id)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-black text-sm"
        >
          <Truck size={16} />
          COMPLETED
        </button>
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
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      <InventorySidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex justify-between">
          <div>
            <h1 className="text-2xl font-bold">Warehouse Orders</h1>
            <p className="text-sm text-neutral-400">
              Incoming sales & returned fitting orders
            </p>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg"
          />
        </div>

        {/* TABLE */}
        {loading ? (
          <p className="p-6">Loading...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center text-neutral-400 py-10">
            No warehouse orders available
          </div>
        ) : (
          <table className="w-full border border-neutral-700">
            <thead>
              <tr className="bg-neutral-800">
                <th className="p-3 text-left">Order ID</th>
                <th className="p-3 text-left">Dispatched To</th>
                <th className="p-3 text-left">Chair</th>
                <th className="p-3 text-left">Order Date</th>
                <th className="p-3 text-left">Qty</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((o) => (
                <tr
                  key={o._id}
                  className="border-t border-neutral-700 hover:bg-neutral-800/40"
                >
                  <td className="p-3">{o.orderId}</td>
                  <td className="p-3">{o.dispatchedTo}</td>
                  <td className="p-3">{o.chairModel}</td>
                  <td className="p-3">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </td>
                  <td className="p-3">{o.quantity}</td>
                  <td className="p-3">{getStatusLabel(o.progress)}</td>
                  <td className="p-3">{renderAction(o)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
