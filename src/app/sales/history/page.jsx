"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { CalendarDays, Download } from "lucide-react";
import SalesSidebar from "@/components/Sales/sidebar";

export default function History() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("thisMonth");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH HISTORY ================= */
  const fetchHistory = async (selectedRange) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/orders?range=${selectedRange}`, {
        headers,
      });
      setOrders(res.data.orders || []);
    } catch (err) {
      console.error("Fetch history failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(range);
  }, [range]);

  const exportToCSV = () => {
  if (!orders.length) return;

  const headers = [
    "Order ID",
    "Dispatched To",
    "Chair Model",
    "Order Date",
    "Delivery Date",
    "Quantity",
    "Status",
  ];

  const rows = orders.map((o) => [
    o.orderId,
    o.dispatchedTo,
    o.chairModel,
    new Date(o.orderDate).toLocaleDateString(),
    o.deliveryDate ? new Date(o.deliveryDate).toLocaleDateString() : "",
    o.quantity,
    o.progress.replaceAll("_", " "),
  ]);

  const csvContent =
    [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `orders_${range}_${new Date()
    .toISOString()
    .slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
};

  return (
    <div className="flex h-screen bg-gradient-to-b from-amber-900 via-black to-neutral-900 text-neutral-100">
      <SalesSidebar />

      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        {/* HEADER */}
<div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
  <div>
    <h1 className="text-2xl font-bold flex items-center gap-2">
      <CalendarDays />
      Order History
    </h1>
    <p className="text-sm text-neutral-400">
      View and search your past orders
    </p>
  </div>

  <button
    onClick={exportToCSV}
    disabled={loading || orders.length === 0}
    className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border border-amber-500 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
  >
    <Download className="w-4 h-4" />
    Export CSV
  </button>
</div>


        {/* FILTERS */}
        <div className="p-6 flex flex-wrap gap-3">
          {[
            { label: "Today", value: "today" },
            { label: "Yesterday", value: "yesterday" },
            { label: "Last 7 Days", value: "last7days" },
            { label: "This Month", value: "thisMonth" },
            { label: "Last Month", value: "lastMonth" },
          ].map((btn) => (
            <button
              key={btn.value}
              onClick={() => setRange(btn.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition ${
                range === btn.value
                  ? "bg-amber-600 border-amber-500"
                  : "bg-neutral-800 border-neutral-700 hover:border-amber-600"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="px-6 pb-6">
          <div className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">Loading history...</div>
            ) : orders.length === 0 ? (
              <div className="p-6 text-center text-neutral-400">
                No orders found for selected period
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
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        className="p-4 text-left text-xs text-neutral-400 uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {orders.map((o) => (
                    <tr
                      key={o._id}
                      className="border-b border-neutral-700 hover:bg-neutral-850"
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
                        <span className="text-sm text-amber-400">
                          {o.progress.replaceAll("_", " ")}
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
