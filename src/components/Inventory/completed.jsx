"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Download, Package, CheckCircle, TrendingUp } from "lucide-react";
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
      const res = await fetch(`${API}/orders`, { headers });
      const data = await res.json();

      const completed = (data.orders || data).filter(
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
        o.dispatchedTo?.name?.toLowerCase().includes(q) ||
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
      o.dispatchedTo?.name,
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
    <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
      {/* SIDEBAR */}
      <InventorySidebar />

      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-4 sm:py-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle size={32} className="text-red-700" />
                <span>Completed Orders</span>
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Dispatch history & production summary
              </p>
            </div>

            <button
              onClick={exportCSV}
              className="bg-[#c62d23] hover:bg-[#a82419] text-white px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/20 font-medium transition-all w-full sm:w-auto justify-center"
            >
              <Download size={18} />
              Export CSV
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            {/* STATS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Orders"
                value={totalOrders}
                icon={<Package className="text-red-600" />}
              />
              <StatCard
                title="Total Quantity"
                value={totalQuantity}
                icon={<CheckCircle className="text-red-600" />}
              />
              <StatCard
                title="Chair Models"
                value={uniqueModels}
                icon={<TrendingUp className="text-red-600" />}
              />
            </div>

            {/* SEARCH */}
            <div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search completed orders..."
                className="w-full bg-white border border-gray-200 px-4 py-3 rounded-xl outline-none text-gray-900 placeholder-gray-400 focus:border-green-600 focus:ring-2 focus:ring-green-600/20 transition-all shadow-sm"
              />
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  <p className="mt-2 text-gray-500">Loading...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="text-center text-gray-500 py-16">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No completed orders found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[900px] w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
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
                            className="p-4 text-left font-semibold text-gray-700 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map((o, index) => (
                        <tr
                          key={o._id}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4 font-semibold text-gray-900 whitespace-nowrap">
                            {o.orderId}
                          </td>
                          <td className="p-4 text-gray-700 whitespace-nowrap">
                            {o.dispatchedTo?.name || "-"}
                          </td>
                          <td className="p-4 font-medium text-gray-900 whitespace-nowrap">
                            {o.chairModel}
                          </td>
                          <td className="p-4 text-gray-700 whitespace-nowrap">
                            {new Date(o.orderDate).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-gray-700 whitespace-nowrap">
                            {o.deliveryDate
                              ? new Date(o.deliveryDate).toLocaleDateString()
                              : "-"}
                          </td>
                          <td className="p-4 font-semibold text-gray-900 whitespace-nowrap">
                            {o.quantity}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-red-700 border border-red-200">
                              {new Date(
                                o.updatedAt || o.createdAt
                              ).toLocaleDateString()}
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
    </div>
  );
}

/* ================= SMALL COMPONENTS ================= */

const StatCard = ({ title, value, icon }) => (
  <div
    className="bg-white border rounded-2xl p-6 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between h-full border-gray-200"
    style={{ borderLeft: "4px solid #c62d23" }}
  >
    <div className="flex justify-between items-start mb-4">
      <p className="text-sm text-gray-600 font-medium">{title}</p>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
  </div>
);
