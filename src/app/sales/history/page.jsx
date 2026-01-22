"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { CalendarDays, Download, History } from "lucide-react";
import * as XLSX from "xlsx";


export default function OrderHistory() {
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

 const exportToExcel = () => {
  if (!orders.length) return;

  const data = orders.map((o) => ({
    "Order ID": o.orderId,
    "Dispatched To":
      typeof o.dispatchedTo === "object" && o.dispatchedTo?.name
        ? o.dispatchedTo.name
        : o.dispatchedTo,
    Chair: o.chairModel,
    "Order Date": new Date(o.orderDate).toLocaleDateString(),
    "Delivery Date": o.deliveryDate
      ? new Date(o.deliveryDate).toLocaleDateString()
      : "",
    Quantity: o.quantity,
    Status: o.progress?.replaceAll("_", " "),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");

  XLSX.writeFile(
    workbook,
    `orders_${range}_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
};


  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <History size={32} className="text-[#c62d23]" />
                <span>Order History</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                View and search your past orders
              </p>
            </div>

            <button
            onClick={exportToExcel}

              disabled={loading || orders.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* FILTERS */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Time Range</h3>
            <div className="flex flex-wrap gap-3">
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
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${range === btn.value
                    ? "bg-[#c62d23] text-white shadow-md"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200"
                    }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#c62d23]"></div>
                <p className="mt-2 text-gray-500">Loading history...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center text-gray-500 py-16">
                <CalendarDays size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No orders found</p>
                <p className="text-sm">No orders found for selected period</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
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
                          className="p-4 text-left font-semibold text-gray-700"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {orders.map((o, index) => (
                      <tr
                        key={o._id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                      >
                        <td className="p-4 font-semibold text-gray-900">{o.orderId}</td>
                        <td className="p-4 text-gray-700">
                          {typeof o.dispatchedTo === 'object' && o.dispatchedTo?.name
                            ? o.dispatchedTo.name
                            : o.dispatchedTo}
                        </td>
                        <td className="p-4 font-medium text-gray-900">{o.chairModel}</td>
                        <td className="p-4 text-gray-700">
                          {new Date(o.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-gray-700">
                          {o.deliveryDate
                            ? new Date(o.deliveryDate).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="p-4 font-semibold text-gray-900">{o.quantity}</td>
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                            {o.progress.replaceAll("_", " ")}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
