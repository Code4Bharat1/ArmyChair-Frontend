"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Search, User, ChevronDown } from "lucide-react";
import axios from "axios";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedOrders, setSelectedOrders] = useState([]);
  const [search, setSearch] = useState("");

  const API = process.env.NEXT_PUBLIC_API_URL;
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("accessToken")
      : null;

  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  /* ================= FETCH ================= */
  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`, { headers });
      setOrders(res.data.orders || res.data);
    } catch (err) {
      console.error("Fetch orders failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ================= SELECT ================= */
  const handleSelectOrder = (orderId) => {
    setSelectedOrders((prev) =>
      prev.includes(orderId)
        ? prev.filter((id) => id !== orderId)
        : [...prev, orderId]
    );
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
  const totalDispatches = orders.length;

  const onTimeCount = orders.filter((o) => o.onTime === true).length;
  const onTimePercent =
    totalDispatches === 0
      ? 0
      : Math.round((onTimeCount / totalDispatches) * 100);

  const delayedCount = orders.filter((o) => o.onTime === false).length;

  /* ================= STYLES ================= */
  const getDeliveryStyle = (onTime) =>
    onTime
      ? "bg-green-900 text-green-300"
      : "bg-red-900 text-red-300";

  const getAssemblyStyle = (assembly) =>
    assembly === "Assembled"
      ? "bg-amber-900 text-amber-300"
      : "bg-neutral-700 text-neutral-300";

  /* ================= UI ================= */
  return (
    <div className="flex h-screen bg-neutral-900 text-neutral-100">
      
      <div className="flex-1 overflow-auto">
        {/* HEADER */}
        <div className="bg-neutral-800 border-b border-neutral-700 p-4 flex items-center justify-between">
          <div className="flex-1 max-w-2xl relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search orders or dispatch location..."
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-amber-600"
            />
          </div>
 
        </div>

        {/* CONTENT */}
        <div className="p-6">
          {/* TITLE */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Sales Dispatch Orders
              </h1>
              <p className="text-sm text-neutral-400">
                Track dispatch, delivery timeliness, and assembly status.
              </p>
            </div>
            <button className="bg-amber-600 hover:bg-amber-700 px-4 py-2 rounded-lg text-sm font-medium">
              Export CSV
            </button>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                TOTAL DISPATCHES
              </div>
              <div className="text-3xl font-bold text-white">
                {totalDispatches}
              </div>
              <div className="text-xs text-neutral-400">All time</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                ON-TIME DELIVERIES
              </div>
              <div className="text-3xl font-bold text-green-400">
                {onTimePercent}%
              </div>
              <div className="text-xs text-neutral-400">Based on records</div>
            </div>

            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-5">
              <div className="text-xs text-neutral-500 uppercase mb-2">
                DELAYED
              </div>
              <div className="text-3xl font-bold text-red-500">
                {delayedCount}
              </div>
              <div className="text-xs text-red-400">Needs attention</div>
            </div>
          </div>

          {/* TABLE */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg overflow-hidden">
            <div className="p-5 border-b border-neutral-700 flex justify-between">
              <h2 className="text-lg font-semibold text-white">
                Dispatch Orders
              </h2>
              <button className="text-sm text-amber-500">View Filters</button>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-6 text-center">Loading...</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-700 bg-neutral-850">
                      {[
                        "Order ID",
                        "Dispatched To",
                        "Chair",
                        "Order Date",
                        "Delivery Date",
                        "On Time",
                        "Assembly",
                        "Amount",
                        "Select",
                      ].map((h) => (
                        <th
                          key={h}
                          className="p-4 text-xs text-neutral-400 uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order._id}
                        className="border-b border-neutral-700 hover:bg-neutral-750"
                      >
                        <td className="p-4 text-sm text-neutral-300">
                          {order.orderId}
                        </td>
                        <td className="p-4 text-sm text-neutral-300">
                          {order.dispatchedTo}
                        </td>
                        <td className="p-4">
                          <div className="text-white">
                            {order.chairModel}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {order.chairDetail}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-neutral-300">
                          {new Date(order.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-sm text-neutral-300">
                          {new Date(order.deliveryDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDeliveryStyle(
                              order.onTime
                            )}`}
                          >
                            {order.onTime ? "On Time" : "Late"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-medium ${getAssemblyStyle(
                              order.assembly
                            )}`}
                          >
                            {order.assembly}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-neutral-300">
                          ₹{order.amount}
                        </td>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            checked={selectedOrders.includes(order._id)}
                            onChange={() =>
                              handleSelectOrder(order._id)
                            }
                            className="w-4 h-4 accent-amber-600"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* FOOTER ACTION */}
          <div className="mt-4 flex justify-end">
            <button className="text-sm text-amber-500">Sort by Date</button>
          </div>
        </div>
      </div>

      {/* FLOATING BUTTON */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-neutral-950 border border-neutral-700 rounded-full text-2xl text-white">
        +
      </button>
    </div>
  );
}
