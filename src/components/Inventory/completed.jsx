"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Download, Package, CheckCircle, TrendingUp } from "lucide-react";
import InventorySidebar from "./sidebar";

export default function CompletedOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("FULL");
  const [selectedDate, setSelectedDate] = useState("");

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
      const completed = (data.orders || data).filter((o) =>
        ["DISPATCHED", "COMPLETED"].includes(o.progress),
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(today);
    startOfLastWeek.setDate(today.getDate() - today.getDay() - 7);

    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);

    return orders.filter((o) => {
      const q = search.toLowerCase();
      const completedDate = new Date(o.updatedAt || o.createdAt);
      completedDate.setHours(0, 0, 0, 0);

      // ===== DATE FILTERS =====

      if (dateFilter === "TODAY") {
        if (completedDate.getTime() !== today.getTime()) return false;
      }

      if (dateFilter === "YESTERDAY") {
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (completedDate.getTime() !== yesterday.getTime()) return false;
      }

      if (dateFilter === "LAST_7_DAYS") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        if (completedDate < sevenDaysAgo) return false;
      }

      if (dateFilter === "LAST_30_DAYS") {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        if (completedDate < thirtyDaysAgo) return false;
      }
      if (dateFilter === "CUSTOM" && selectedDate) {
        const pickedDate = new Date(selectedDate);
        pickedDate.setHours(0, 0, 0, 0);

        if (completedDate.getTime() !== pickedDate.getTime()) return false;
      }

      // ===== SEARCH =====
      return (
        o.orderId?.toLowerCase().includes(q) ||
        o.dispatchedTo?.name?.toLowerCase().includes(q) ||
        o.chairModel?.toLowerCase().includes(q)
      );
    });
  }, [orders, search, dateFilter, selectedDate]);

  const fullCompleted = filteredOrders.filter((o) => o.orderType === "FULL");

  const spareCompleted = filteredOrders.filter((o) => o.orderType === "SPARE");

  /* ================= STATS ================= */
  const totalOrders = filteredOrders.length;
  const totalQuantity = filteredOrders.reduce(
    (sum, o) => sum + (o.quantity || 0),
    0,
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
            <div className="flex flex-wrap items-center gap-3 mb-6">
              {[
                "ALL",
                "TODAY",
                "YESTERDAY",
                "LAST_7_DAYS",
                "LAST_30_DAYS",
              ].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setDateFilter(type);
                    setSelectedDate("");
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    dateFilter === type
                      ? "bg-[#c62d23] text-white"
                      : "bg-white border border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {type.replaceAll("_", " ")}
                </button>
              ))}

              {/* Calendar as Filter Chip */}
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setDateFilter("CUSTOM");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                  dateFilter === "CUSTOM"
                    ? "bg-white text-black border-[#c62d23]"
                    : "bg-white border-gray-200"
                }`}
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
            {/* FULL / SPARE TOGGLE */}
            <div className="flex gap-4 mb-6 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
              <button
                onClick={() => setActiveTab("FULL")}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  activeTab === "FULL"
                    ? "bg-[#c62d23] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Full Chair Orders ({fullCompleted.length})
              </button>

              <button
                onClick={() => setActiveTab("SPARE")}
                className={`flex-1 py-2 rounded-lg font-semibold transition ${
                  activeTab === "SPARE"
                    ? "bg-[#c62d23] text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Spare Part Orders ({spareCompleted.length})
              </button>
            </div>

            {loading ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                <p className="mt-2 text-gray-500">Loading...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm text-center text-gray-500 py-16">
                <Package size={48} className="mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No completed orders found</p>
              </div>
            ) : (
              <CompletedTable
                title={
                  activeTab === "FULL"
                    ? "Full Chair Orders"
                    : "Spare Part Orders"
                }
                orders={activeTab === "FULL" ? fullCompleted : spareCompleted}
              />
            )}
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

const CompletedTable = ({ title, orders }) => {
  if (!orders.length) return null;

  const isLateCompleted = (o) => {
    if (!o.deliveryDate) return false;

    const delivery = new Date(o.deliveryDate);
    const completedDate = new Date(o.updatedAt || o.createdAt);

    delivery.setHours(0, 0, 0, 0);
    completedDate.setHours(0, 0, 0, 0);

    return completedDate > delivery;
  };

  return (
    <div className="mb-10">
      <h2 className="text-xl font-bold mb-4">
        {title} ({orders.length})
      </h2>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  "Order ID",
                  "Client",
                  "Chair",
                  "Order Date",
                  "Delivery Date",
                  "Completed On",
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
                  className={`border-b ${
                    isLateCompleted(o)
                      ? "bg-red-50 hover:bg-red-100"
                      : index % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50"
                  }`}
                >
                  <td className="p-4 font-semibold">{o.orderId}</td>
                  <td className="p-4">{o.dispatchedTo?.name || "-"}</td>
                  <td className="p-4">{o.chairModel}</td>
                  <td className="p-4">
                    {new Date(o.orderDate).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    {o.deliveryDate
                      ? new Date(o.deliveryDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-4">
                    {new Date(o.updatedAt || o.createdAt).toLocaleDateString()}
                  </td>

                  <td className="p-4 font-semibold">{o.quantity}</td>

                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        isLateCompleted(o)
                          ? "bg-red-100 text-red-700 border-red-300"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}
                    >
                      {isLateCompleted(o)
                        ? "Completed Late"
                        : "Completed On Time"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
