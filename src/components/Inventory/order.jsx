"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, PackageCheck, CheckCircle, Plus } from "lucide-react";
import axios from "axios";
import Sidebar from "@/components/Sidebar/sidebar"; // ✅ adjust path if needed
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

      // ✅ show both ORDER_PLACED and WAREHOUSE_COLLECTED
      const warehouseOrders = (res.data.orders || res.data).filter((o) =>
        ["ORDER_PLACED", "WAREHOUSE_COLLECTED"].includes(o.progress)
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

      fetchOrders(); // refresh list but keep order
    } catch (err) {
      alert("Failed to update order status");
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

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      {/* ✅ SIDEBAR */}
      <InventorySidebar />

      <div className="flex-1 overflow-auto ">
        {/* HEADER */}

        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Inventory Management</h1>
            <p className="text-sm text-neutral-400">
              Track stock, vendors and availability
            </p>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          >
            <Plus size={16} /> Add Inventory
          </button>
        </div>

        {/* TABLE */}
        {loading ? (
          <p>Loading...</p>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center text-neutral-400 py-10">
            No warehouse orders
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
              {filteredOrders.map((o) => {
                const isCollected = o.progress === "WAREHOUSE_COLLECTED";

                return (
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

                    {/* STATUS */}
                    <td className="p-3">
                      {isCollected ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 text-sm">
                          <CheckCircle size={14} />
                          Collected
                        </span>
                      ) : (
                        <span className="text-amber-400 text-sm">
                          Pending Collection
                        </span>
                      )}
                    </td>

                    {/* ACTION */}
                    <td className="p-3">
                      <button
                        disabled={isCollected || processingId === o._id}
                        onClick={() => handleCollectParts(o._id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
                          isCollected
                            ? "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                            : "bg-emerald-600 hover:bg-emerald-700 text-black"
                        }`}
                      >
                        <PackageCheck size={16} />
                        {processingId === o._id
                          ? "Processing..."
                          : isCollected
                          ? "Completed"
                          : "Collect Parts"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
