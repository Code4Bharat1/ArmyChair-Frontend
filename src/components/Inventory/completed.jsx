"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Download, Package, CheckCircle, TrendingUp } from "lucide-react";
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

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const totalQuantity = filteredOrders.reduce(
    (sum, o) => sum + (o.quantity || 0),
    0
  );
  const uniqueModels = new Set(filteredOrders.map((o) => o.chairModel)).size;

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
      {/* MAIN */}
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Completed Orders</h1>
            <p className="text-sm mb-5 text-neutral-400">
              Dispatch history & production summary
            </p>
          </div>

          <button
            onClick={exportCSV}
            className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg flex items-center gap-2 shadow"
          >
            <Download size={16} />
            Export CSV
          </button>
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
              title="Total Quantity"
              value={totalQuantity}
              icon={<CheckCircle />}
            />
            <StatCard
              title="Chair Models"
              value={uniqueModels}
              icon={<TrendingUp />}
            />
          </div>

          {/* SEARCH */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search completed orders..."
              className="w-full bg-neutral-800 border border-neutral-700 px-4 py-2 rounded-lg outline-none focus:border-amber-600"
            />
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 rounded-xl overflow-hidden border border-neutral-700">
            {loading ? (
              <div className="p-6 text-center">Loading...</div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center text-neutral-400 py-10">
                No completed orders found
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
                      "Delivery Date",
                      "Qty",
                      "Completed On",
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
                      <td className="p-4">
                        {o.deliveryDate
                          ? new Date(o.deliveryDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="p-4">{o.quantity}</td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
                          {new Date(
                            o.updatedAt || o.createdAt
                          ).toLocaleDateString()}
                        </span>
                      </td>
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

const StatCard = ({ title, value, icon }) => (
  <div className="p-5 rounded-xl border bg-neutral-800 border-neutral-700">
    <div className="flex items-center justify-between mb-3">
      <p className="text-sm text-neutral-400">{title}</p>
      <span className="text-neutral-400">{icon}</span>
    </div>
    <p className="text-3xl font-bold">{value}</p>
  </div>
);
