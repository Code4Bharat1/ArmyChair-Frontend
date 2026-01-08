"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import axios from "axios";
import InventorySidebar from "./sidebar";


export default function CompletedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  /* ================= API ================= */
  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });

      const completed = (res.data.orders || res.data).filter(
        (o) => o.progress === "DISPATCHED"
      );

      setOrders(completed);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

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

  /* ================= CSV EXPORT ================= */
  const exportCSV = () => {
    if (!filteredOrders.length) return;

    const headers = [
      "Order ID",
      "Dispatched To",
      "Chair Model",
      "Order Date",
      "Quantity",
      "Completed At",
    ];

    const rows = filteredOrders.map((o) => [
      o.orderId,
      o.dispatchedTo,
      o.chairModel,
      new Date(o.orderDate).toLocaleDateString(),
      o.quantity,
      new Date(o.updatedAt || o.createdAt).toLocaleDateString(),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers, ...rows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "completed_orders.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
        <InventorySidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Completed Orders</h1>
            <p className="text-sm text-neutral-400">
              Dispatch history & production summary
            </p>
          </div>

          <div className="flex gap-3 items-center">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search completed orders..."
              className="bg-neutral-900 border border-neutral-700 px-4 py-2 rounded-lg"
            />

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 cursor-pointer px-4 py-2 rounded-lg text-black text-sm"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="p-6">
          {loading ? (
            <p>Loading...</p>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center text-neutral-400 py-10">
              No completed orders found
            </div>
          ) : (
            <table className="w-full bg-neutral-900 border shadow-sm rounded-md border-neutral-700">
              <thead>
                <tr className="bg-neutral-800">
                  <th className="p-3 text-left">Order ID</th>
                  <th className="p-3 text-left">Dispatched To</th>
                  <th className="p-3 text-left">Chair</th>
                  <th className="p-3 text-left">Order Date</th>
                  <th className="p-3 text-left">Qty</th>
                  <th className="p-3 text-left">Completed On</th>
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
                    <td className="p-3 text-emerald-400">
                      {new Date(o.updatedAt || o.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
